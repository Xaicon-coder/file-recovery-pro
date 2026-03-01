'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path    = require('path');
const fs      = require('fs');
const os      = require('os');
const { autoUpdater } = require('electron-updater');
const Recovery = require('./recovery');

const IS_DEV = process.env.NODE_ENV === 'development';
const DEV_URL = process.env.VITE_DEV_URL || 'http://localhost:5173';

Menu.setApplicationMenu(null);

let win;

// ─── Finestra ─────────────────────────────────────────────────────────────────
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 820,
    minWidth: 980, minHeight: 640,
    frame: false,
    show: false,
    backgroundColor: '#0d0f12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // richiesto da electron-updater
    },
  });

  win.once('ready-to-show', () => {
    win.show();
    if (!IS_DEV) {
      // Controlla aggiornamenti 5 secondi dopo l'avvio, scarica automaticamente
      setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 5000);
      // Poi ricontrolla ogni 6 ore
      setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 6 * 60 * 60 * 1000);
    }
  });

  if (IS_DEV) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });

// ─── Auto-Updater — scarica automaticamente, installa alla chiusura ───────────
// autoDownload = true: appena trova aggiornamento inizia download silenzioso
autoUpdater.autoDownload         = true;
autoUpdater.autoInstallOnAppQuit = true;  // installa quando l'utente chiude l'app

const send = (ch, data) => { if (win && !win.isDestroyed()) win.webContents.send(ch, data); };

autoUpdater.on('checking-for-update', () =>
  send('updater', { event: 'checking' })
);
autoUpdater.on('update-available', info => {
  // Download parte automaticamente (autoDownload=true)
  send('updater', { event: 'downloading', version: info.version });
});
autoUpdater.on('update-not-available', () =>
  send('updater', { event: 'none' })
);
autoUpdater.on('download-progress', p => {
  send('updater', {
    event:       'progress',
    pct:         Math.round(p.percent),
    bytesPerSec: p.bytesPerSecond,
    transferred: p.transferred,
    total:       p.total,
  });
  // Mostra avanzamento nella barra delle applicazioni Windows
  if (win && !win.isDestroyed()) win.setProgressBar(p.percent / 100);
});
autoUpdater.on('update-downloaded', info => {
  if (win && !win.isDestroyed()) win.setProgressBar(-1); // rimuove progress taskbar
  send('updater', { event: 'ready', version: info.version });
});
autoUpdater.on('error', err =>
  send('updater', { event: 'error', message: err.message })
);

// L'utente può installare subito invece di aspettare la chiusura
ipcMain.handle('updater:install', () => autoUpdater.quitAndInstall(false, true));

// ─── Window controls ──────────────────────────────────────────────────────────
ipcMain.handle('win:min',   () => win?.minimize());
ipcMain.handle('win:max',   () => win?.isMaximized() ? win.unmaximize() : win.maximize());
ipcMain.handle('win:close', () => win?.close());

// ─── System info ──────────────────────────────────────────────────────────────
ipcMain.handle('sys:info', async () => {
  let isAdmin = false;
  try {
    if (process.platform === 'win32') {
      require('child_process').execSync('net session', { stdio: 'pipe' });
      isAdmin = true;
    } else {
      isAdmin = process.getuid?.() === 0;
    }
  } catch {}
  return {
    platform: process.platform,
    hostname: os.hostname(),
    ram: { total: os.totalmem(), free: os.freemem() },
    isAdmin,
    version: app.getVersion(),
  };
});

// ─── Drive list ───────────────────────────────────────────────────────────────
ipcMain.handle('drive:list', () => Recovery.listDrives());

// ─── Scan ─────────────────────────────────────────────────────────────────────
let _stop = false;

ipcMain.handle('scan:start', (_, opts) => {
  _stop = false;
  Recovery.scan(opts, ev => send('scan:event', ev), () => _stop);
  return { ok: true };
});

ipcMain.handle('scan:stop', () => { _stop = true; });

// ─── Recupero file — professionale con verifica integrità ────────────────────
ipcMain.handle('recover:files', async (_, { files, dest }) => {
  let ok = 0, fail = 0;

  for (const f of files) {
    let target = null;
    try {
      // 0. File USN Journal: sono solo riferimenti nel log NTFS, non hanno dati fisici.
      //    Path contiene '[Journal#' — non tentare accesso filesystem.
      if (f.source === 'USN Journal' || f.path.includes('[Journal#')) {
        throw new Error('Solo riferimento journal NTFS — file non più presente su disco. Usa strumenti specializzati (Recuva, PhotoRec) per recupero deep.');
      }

      // 1. Verifica che il file sorgente esista e sia leggibile
      if (!fs.existsSync(f.path)) {
        throw new Error(`File sorgente non trovato: ${f.path}`);
      }
      const srcStat = fs.statSync(f.path);
      if (srcStat.size === 0) {
        throw new Error('File sorgente vuoto o corrotto');
      }

      // 2. Determina cartella di destinazione
      let targetDir;
      if (dest === '__original__') {
        targetDir = path.dirname(f.originalPath);
      } else {
        targetDir = dest;
      }
      fs.mkdirSync(targetDir, { recursive: true });

      // 3. Risolve conflitti — non sovrascrive mai file esistenti
      target = path.join(targetDir, f.name);
      if (fs.existsSync(target)) {
        const { name, ext } = path.parse(f.name);
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
        target = path.join(targetDir, `${name}_recuperato_${ts}${ext}`);
      }

      // 4. Copia con flag COPYFILE_EXCL (fallisce se destinazione esiste — sicurezza extra)
      fs.copyFileSync(f.path, target, fs.constants.COPYFILE_EXCL);

      // 5. Verifica integrità post-copia: dimensione deve corrispondere
      const dstStat = fs.statSync(target);
      if (dstStat.size !== srcStat.size) {
        try { fs.unlinkSync(target); } catch {}
        throw new Error(`Copia incompleta: attesi ${srcStat.size} byte, scritti ${dstStat.size} byte`);
      }

      ok++;
      send('recover:tick', { id: f.id, ok: true, target, size: dstStat.size });

    } catch (err) {
      fail++;
      if (target) { try { if (fs.existsSync(target)) fs.unlinkSync(target); } catch {} }
      send('recover:tick', { id: f.id, ok: false, error: err.message });
    }
  }

  send('recover:done', { ok, fail });
  return { ok, fail };
});

ipcMain.handle('recover:pickdir', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Scegli cartella di destinazione',
    properties: ['openDirectory', 'createDirectory'],
  });
  return r.filePaths[0] ?? null;
});

ipcMain.handle('shell:open', (_, p) => {
  if (!p) return;
  if (fs.existsSync(p)) {
    // Se è un file, mostralo evidenziato nel explorer; se è cartella aprila
    const st = fs.statSync(p);
    if (st.isDirectory()) shell.openPath(p);
    else shell.showItemInFolder(p);
  }
});

ipcMain.handle('shell:opendir', (_, p) => {
  if (!p) return;
  const dir = fs.existsSync(p) && fs.statSync(p).isDirectory() ? p : path.dirname(p);
  if (fs.existsSync(dir)) shell.openPath(dir);
});
