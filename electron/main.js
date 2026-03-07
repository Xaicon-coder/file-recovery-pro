'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell, Menu, Notification } = require('electron');
const path   = require('path');
const fs     = require('fs');
const os     = require('os');
const crypto = require('crypto');
const { autoUpdater } = require('electron-updater');
const Recovery = require('./recovery');
const { exportCSV, exportJSON, exportStats } = require('./export');
const { getLogger } = require('./logger');

Menu.setApplicationMenu(null);
const IS_DEV = process.env.NODE_ENV === 'development';

// Inizializza logger
const logger = getLogger({
  level: IS_DEV ? 'DEBUG' : 'INFO',
  logToFile: true,
  logToConsole: IS_DEV
});

// Cleanup logs vecchi all'avvio
logger.cleanupOldLogs(30);

let win;

// ─── Finestra principale ───────────────────────────────────────────────────────
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 820,
    minWidth: 960, minHeight: 620,
    frame: false,
    show: false,
    backgroundColor: '#000a03',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.once('ready-to-show', () => {
    win.show();
    // Auto-updater DISABILITATO - causava errori 404 GitHub
    // if (!IS_DEV) setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 6000);
  });

  IS_DEV
    ? win.loadURL(process.env.VITE_DEV_URL || 'http://localhost:5173')
    : win.loadFile(path.join(__dirname, '../dist/index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ─── Cleanup automatico prima di chiudere ─────────────────────────────────────
app.on('before-quit', (event) => {
  try {
    logger.info('Application shutting down, performing cleanup...');
    
    // Force chiusura eventuali processi child
    if (process.platform === 'win32') {
      try {
        const { execSync } = require('child_process');
        // Killa eventuali processi node/electron figli
        execSync('taskkill /F /FI "WINDOWTITLE eq File Recovery Pro*" 2>nul', { timeout: 2000 });
      } catch {}
    }
    
    logger.info('Cleanup completed');
  } catch (err) {
    logger.error('Cleanup error', { error: err.message });
  }
});

// Helper sicuro per inviare eventi al renderer
const send = (channel, data) => {
  try { if (win && !win.isDestroyed()) win.webContents.send(channel, data); }
  catch { /* finestra già distrutta */ }
};

// ─── Auto-updater ─────────────────────────────────────────────────────────────
autoUpdater.autoDownload        = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('checking-for-update',  ()   => send('updater', { event:'checking' }));
autoUpdater.on('update-available',     info => send('updater', { event:'downloading', version:info.version, notes:info.releaseNotes||'' }));
autoUpdater.on('update-not-available', info => send('updater', { event:'none',        version:info.version }));
autoUpdater.on('download-progress',    p    => {
  send('updater', { event:'progress', pct:Math.round(p.percent), bps:p.bytesPerSecond });
  win?.setProgressBar(p.percent / 100);
});
autoUpdater.on('update-downloaded', info => {
  win?.setProgressBar(-1);
  send('updater', { event:'ready', version:info.version, notes:info.releaseNotes||'' });
});
autoUpdater.on('error', err => send('updater', { event:'error', message:err.message }));

ipcMain.handle('updater:install', () => autoUpdater.quitAndInstall(false, true));
ipcMain.handle('updater:check',   () => autoUpdater.checkForUpdates().catch(e => ({ error:e.message })));

// ─── Controlli finestra ────────────────────────────────────────────────────────
ipcMain.handle('win:min',   () => win?.minimize());
ipcMain.handle('win:max',   () => win?.isMaximized() ? win.unmaximize() : win.maximize());
ipcMain.handle('win:close', () => win?.close());

// ─── Info sistema ─────────────────────────────────────────────────────────────
ipcMain.handle('sys:info', async () => {
  let isAdmin = false;
  try {
    if (process.platform === 'win32') {
      require('child_process').execSync('net session', { stdio:'pipe', timeout:3000 });
      isAdmin = true;
    } else {
      isAdmin = process.getuid?.() === 0;
    }
  } catch {}
  return {
    platform: process.platform,
    hostname: os.hostname(),
    ram:      { total: os.totalmem(), free: os.freemem() },
    isAdmin,
    version:  app.getVersion(),
  };
});

// ─── Lista dischi ─────────────────────────────────────────────────────────────
ipcMain.handle('drive:list', () => Recovery.listDrives());

// ─── Scan ─────────────────────────────────────────────────────────────────────
let _scanStop = false;
ipcMain.handle('scan:start', (_, opts) => {
  _scanStop = false;
  Recovery.scan(opts, ev => send('scan:event', ev), () => _scanStop);
  return { ok: true };
});
ipcMain.handle('scan:stop', () => { _scanStop = true; });

// ─── Recovery — stream copy + SHA-256 + retry ─────────────────────────────────
async function sha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    fs.createReadStream(filePath)
      .on('data', chunk => hash.update(chunk))
      .on('end',  ()    => resolve(hash.digest('hex')))
      .on('error', reject);
  });
}

async function streamCopy(src, dst) {
  return new Promise((resolve, reject) => {
    const reader = fs.createReadStream(src);
    const writer = fs.createWriteStream(dst);
    reader.on('error', e => { writer.destroy(); reject(e); });
    writer.on('error', e => { reader.destroy(); reject(e); });
    writer.on('finish', resolve);
    reader.pipe(writer);
  });
}

ipcMain.handle('recover:files', async (_, { files, dest }) => {
  let ok = 0, fail = 0;

  for (const f of files) {
    // USN Journal = solo traccia NTFS, nessun dato fisico recuperabile
    if (f.source === 'USN Journal' || f.path?.includes('[Journal#')) {
      fail++;
      send('recover:tick', { id:f.id, ok:false, skip:true, error:'Solo riferimento USN — dati non recuperabili' });
      continue;
    }

    let target = null;
    let attempt = 0;

    while (attempt <= 2) {
      try {
        if (!fs.existsSync(f.path)) throw new Error(`Sorgente non trovata: ${f.path}`);
        const srcStat = fs.statSync(f.path);
        if (srcStat.size === 0) throw new Error('File sorgente vuoto (0 byte)');

        // Scegli directory di destinazione
        let dir;
        if (dest === '__original__') {
          dir = path.dirname(f.originalPath || f.path);
          // Fallback se il disco originale non è accessibile
          try { fs.accessSync(path.parse(dir).root); }
          catch { dir = path.join(os.homedir(), 'FileRecuperati'); }
        } else {
          dir = dest;
        }
        fs.mkdirSync(dir, { recursive: true });

        // Evita sovrascrittura: aggiunge _rec_YYYY-MM-DD-HH-mm
        const { name, ext } = path.parse(f.name);
        target = path.join(dir, f.name);
        if (fs.existsSync(target)) {
          const ts = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
          target = path.join(dir, `${name}_rec_${ts}${ext}`);
        }

        await streamCopy(f.path, target);

        // Verifica dimensione byte per byte
        const dstStat = fs.statSync(target);
        if (dstStat.size !== srcStat.size) {
          fs.rmSync(target, { force: true });
          throw new Error(`Dimensione errata: ${srcStat.size}B sorgente → ${dstStat.size}B destinazione`);
        }

        // SHA-256 integrità (skip per file > 512 MB per non bloccare)
        if (srcStat.size <= 512 * 1024 * 1024) {
          const [h1, h2] = await Promise.all([sha256(f.path), sha256(target)]);
          if (h1 !== h2) {
            fs.rmSync(target, { force: true });
            throw new Error(`Verifica integrità SHA-256 fallita`);
          }
        }

        // Preserva timestamp originale
        try {
          const mt = f.modified ? new Date(f.modified) : new Date(srcStat.mtime);
          fs.utimesSync(target, mt, mt);
        } catch {}

        ok++;
        send('recover:tick', { id:f.id, ok:true, target, size:dstStat.size });
        break; // successo — esci dal retry loop

      } catch (err) {
        attempt++;
        if (target && fs.existsSync(target)) fs.rmSync(target, { force: true });
        target = null;
        if (attempt > 2) {
          fail++;
          send('recover:tick', { id:f.id, ok:false, skip:false, error:err.message });
        } else {
          // Backoff esponenziale: 300ms, 600ms
          await new Promise(r => setTimeout(r, 300 * attempt));
        }
      }
    }
  }

  send('recover:done', { ok, fail });
  return { ok, fail };
});

// ─── Helpers shell ────────────────────────────────────────────────────────────
ipcMain.handle('recover:pickdir', async () => {
  const result = await dialog.showOpenDialog(win, {
    title: 'Scegli cartella di destinazione',
    properties: ['openDirectory', 'createDirectory'],
  });
  return result.filePaths[0] ?? null;
});

ipcMain.handle('shell:open', (_, p) => {
  if (!p || typeof p !== 'string') return;
  try {
    if (fs.existsSync(p)) {
      fs.statSync(p).isDirectory() ? shell.openPath(p) : shell.showItemInFolder(p);
    }
  } catch {}
});

ipcMain.handle('shell:opendir', (_, p) => {
  if (!p || typeof p !== 'string') return;
  try {
    const dir = (fs.existsSync(p) && fs.statSync(p).isDirectory())
      ? p
      : path.dirname(p);
    if (fs.existsSync(dir)) shell.openPath(dir);
  } catch {}
});

// ─── Export risultati ─────────────────────────────────────────────────────────
ipcMain.handle('export:csv', async (_, { files, outputPath }) => {
  try {
    logger.info('Exporting to CSV', { count: files.length, path: outputPath });
    const result = exportCSV(files, outputPath);
    logger.info('CSV export completed', result);
    return result;
  } catch (err) {
    logger.error('CSV export failed', { error: err.message });
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('export:json', async (_, { files, outputPath }) => {
  try {
    logger.info('Exporting to JSON', { count: files.length, path: outputPath });
    const result = exportJSON(files, outputPath);
    logger.info('JSON export completed', result);
    return result;
  } catch (err) {
    logger.error('JSON export failed', { error: err.message });
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('export:stats', async (_, { files, outputPath }) => {
  try {
    logger.info('Exporting statistics', { count: files.length, path: outputPath });
    const result = exportStats(files, outputPath);
    logger.info('Stats export completed', result);
    return result;
  } catch (err) {
    logger.error('Stats export failed', { error: err.message });
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('export:pickfile', async (_, defaultName) => {
  const result = await dialog.showSaveDialog(win, {
    title: 'Salva risultati scansione',
    defaultPath: path.join(os.homedir(), 'Desktop', defaultName),
    filters: [
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result.filePath ?? null;
});

// ─── Notifiche desktop ────────────────────────────────────────────────────────
ipcMain.handle('notification:show', (_, { title, body }) => {
  if (Notification.isSupported()) {
    try {
      const notification = new Notification({ title, body });
      notification.show();
      logger.debug('Notification shown', { title, body });
    } catch (err) {
      logger.warn('Failed to show notification', { error: err.message });
    }
  }
});

// ─── Logging eventi scan/recovery ─────────────────────────────────────────────
ipcMain.handle('log:scan-start', (_, opts) => {
  logger.logScanStart(opts);
});

ipcMain.handle('log:scan-complete', (_, { total, duration }) => {
  logger.logScanComplete(total, duration);
});

ipcMain.handle('log:recovery-start', (_, { count, dest }) => {
  logger.logRecoveryStart(count, dest);
});

ipcMain.handle('log:recovery-complete', (_, { ok, fail }) => {
  logger.logRecoveryComplete(ok, fail);
});
