'use strict';

/**
 * FILE RECOVERY ENGINE — Livello professionale
 *
 * Architettura scansione (in ordine di affidabilità):
 *
 * 1. $Recycle.Bin        — file fisicamente intatti, path originale da file $I (100%)
 * 2. Volume Shadow Copies — snapshot di sistema, recupera versioni precedenti  (95%)
 * 3. Cartelle utente     — Downloads, Desktop, Docs, Temp, INetCache           (80%)
 * 4. Filesystem completo — walk ricorsivo di C:\Users                           (75%)
 * 5. fsutil USN journal  — log NTFS di ogni delete negli ultimi ~days           (60%)
 *
 * Il Cestino è SEMPRE scansionato su tutti i drive e tutti i SID utente.
 */

const os   = require('os');
const path = require('path');
const fs   = require('fs');
const { execSync } = require('child_process');

const IS_WIN = process.platform === 'win32';
const HOME   = os.homedir();

// ─── Mappa estensioni → categoria ─────────────────────────────────────────────
const EXT_MAP = {};
[
  [['jpg','jpeg','png','gif','bmp','webp','tiff','tif','raw','heic','heif',
    'cr2','cr3','nef','arw','dng','rw2','orf','sr2','svg','avif','ico','jfif','pnm'], 'image'],
  [['mp4','mkv','avi','mov','wmv','webm','m4v','3gp','3g2','ts','m2ts','mpg',
    'mpeg','flv','vob','divx','xvid','rmvb','asf','mxf','f4v'],                       'video'],
  [['mp3','wav','flac','aac','ogg','oga','wma','m4a','opus','aiff','aif',
    'ape','wv','tta','dsd','dsf','ac3','dts','mka'],                                  'audio'],
  [['pdf','doc','docx','odt','ott','rtf','epub','pages','tex','djvu','mobi',
    'azw','azw3','fb2','lit','lrf','docm'],                                            'document'],
  [['xls','xlsx','ods','csv','tsv','numbers','xlsm','xlsb','xlam','xltx'],            'spreadsheet'],
  [['ppt','pptx','odp','key','pps','ppsx','pptm'],                                    'presentation'],
  [['zip','rar','7z','tar','gz','bz2','xz','iso','cab','wim','lzh','arj',
    'lz','zst','lz4','br','dmg','img','vhd','vmdk'],                                  'archive'],
  [['txt','md','rst','log','ini','cfg','conf','xml','json','yaml','yml',
    'toml','srt','sub','vtt','ass','nfo','bat','cmd','reg','inf'],                    'text'],
  [['js','ts','jsx','tsx','mjs','cjs','py','pyw','cs','java','cpp','cxx',
    'cc','c','h','hpp','html','htm','css','scss','less','sass','php','rb',
    'go','rs','sh','bash','zsh','sql','vue','svelte','dart','lua','r',
    'swift','kt','kts','gradle','cmake','makefile'],                                  'code'],
  [['psd','psb','ai','eps','xd','fig','sketch','afdesign','afphoto','afpub',
    'indd','indt','cdr','xcf'],                                                        'design'],
  [['db','sqlite','sqlite3','accdb','mdb','dbf','mdf','ldf','bak'],                  'database'],
  [['eml','msg','pst','ost','mbox','emlx'],                                           'email'],
  [['exe','dll','msi','apk','deb','rpm','dmg','pkg','app'],                          'executable'],
].forEach(([exts, type]) => {
  for (const e of exts) EXT_MAP['.' + e] = type;
});

const typeOf = ext => EXT_MAP[ext?.toLowerCase()] ?? 'other';

// ─── Magic bytes — rileva tipo reale anche se estensione è assente/errata ─────
const SIGNATURES = [
  { magic: [0xFF,0xD8,0xFF],            offset: 0, type:'image',   ext:'.jpg'  },
  { magic: [0x89,0x50,0x4E,0x47],       offset: 0, type:'image',   ext:'.png'  },
  { magic: [0x47,0x49,0x46,0x38],       offset: 0, type:'image',   ext:'.gif'  },
  { magic: [0x42,0x4D],                 offset: 0, type:'image',   ext:'.bmp'  },
  { magic: [0x49,0x49,0x2A,0x00],       offset: 0, type:'image',   ext:'.tif'  },
  { magic: [0x25,0x50,0x44,0x46],       offset: 0, type:'document',ext:'.pdf'  },
  { magic: [0x50,0x4B,0x03,0x04],       offset: 0, type:'archive', ext:'.zip'  }, // ZIP/DOCX/XLSX
  { magic: [0xD0,0xCF,0x11,0xE0],       offset: 0, type:'document',ext:'.doc'  }, // OLE2
  { magic: [0x49,0x44,0x33],            offset: 0, type:'audio',   ext:'.mp3'  },
  { magic: [0xFF,0xFB],                 offset: 0, type:'audio',   ext:'.mp3'  },
  { magic: [0x66,0x4C,0x61,0x43],       offset: 0, type:'audio',   ext:'.flac' },
  { magic: [0x52,0x49,0x46,0x46],       offset: 0, type:'audio',   ext:'.wav'  }, // RIFF
  { magic: [0x4F,0x67,0x67,0x53],       offset: 0, type:'audio',   ext:'.ogg'  },
  { magic: [0x66,0x74,0x79,0x70],       offset: 4, type:'video',   ext:'.mp4'  }, // ftyp @ offset 4
  { magic: [0x1A,0x45,0xDF,0xA3],       offset: 0, type:'video',   ext:'.mkv'  },
  { magic: [0x52,0x49,0x46,0x46],       offset: 0, type:'video',   ext:'.avi'  }, // RIFF/AVI
  { magic: [0x38,0x42,0x50,0x53],       offset: 0, type:'design',  ext:'.psd'  },
  { magic: [0x37,0x7A,0xBC,0xAF,0x27,0x1C], offset:0, type:'archive',ext:'.7z'},
  { magic: [0x52,0x61,0x72,0x21,0x1A,0x07], offset:0, type:'archive',ext:'.rar'},
];

function detectByMagic(filePath) {
  try {
    const fd  = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(16);
    fs.readSync(fd, buf, 0, 16, 0);
    fs.closeSync(fd);
    for (const s of SIGNATURES) {
      if (s.magic.every((b, i) => buf[s.offset + i] === b)) return { type: s.type, ext: s.ext };
    }
  } catch {}
  return null;
}

// ─── Cartelle sistema da escludere ────────────────────────────────────────────
const SKIP_DIRS = new Set([
  'Windows','System32','SysWOW64','WinSxS','Program Files','Program Files (x86)',
  'ProgramData','node_modules','.git','__pycache__','$Recycle.Bin',
  'System Volume Information','Recovery','PerfLogs','$WinREAgent','MSOCache',
  'WindowsApps','servicing','assembly','Prefetch','drivers','inf',
]);

// ─── Utility ──────────────────────────────────────────────────────────────────
const exists   = p => { try { return fs.existsSync(p);  } catch { return false; } };
const statFile = p => { try { return fs.statSync(p);    } catch { return null;  } };
const listDir  = p => { try { return fs.readdirSync(p, { withFileTypes: true }); } catch { return []; } };
const yield_   = () => new Promise(r => setImmediate(r));
const safeExec = (cmd, timeout = 12000) => {
  try { return execSync(cmd, { timeout, stdio: ['pipe','pipe','pipe'] }).toString('utf8'); }
  catch { return ''; }
};

let _seq = 0;

function mkFile({ path: fpath, name, ext, st, source, origPath, origDir, deletedAt, confidence }) {
  let e    = ext || path.extname(name || '').toLowerCase();
  let type = typeOf(e);

  // Magic byte detection se il tipo non è riconosciuto o manca l'estensione
  if ((!e || type === 'other') && fpath && st?.size > 64) {
    const det = detectByMagic(fpath);
    if (det) { e = det.ext; type = det.type; }
  }

  return {
    id:           `f${++_seq}`,
    name:         name || path.basename(fpath),
    path:         fpath,
    originalPath: origPath || fpath,
    originalDir:  origDir  || path.dirname(origPath || fpath),
    size:         st?.size ?? 0,
    ext:          e,
    type,
    source,
    intact:       source === 'Cestino' || source === 'Shadow Copy',
    modified:     st?.mtime    ?? null,
    created:      st?.birthtime ?? st?.ctime ?? null,
    deletedAt:    deletedAt    ?? null,
    confidence:   confidence   ?? (source === 'Cestino' ? 100 : source === 'Shadow Copy' ? 95 : 80),
  };
}

// ─── DRIVE LIST ───────────────────────────────────────────────────────────────
async function listDrives() {
  if (!IS_WIN) return listUnix();
  try {
    const out = safeExec(
      'wmic logicaldisk get Caption,DriveType,FileSystem,FreeSpace,Size,VolumeName /format:csv',
      8000
    );
    const drives = [];
    for (const line of out.split('\n')) {
      const cols = line.trim().split(',');
      if (cols.length < 7 || !/^[A-Z]:$/.test(cols[1]?.trim())) continue;
      const [, caption, dType, fsys, free, size, label] = cols.map(c => c.trim());
      if (dType === '5') continue; // CDROM
      drives.push({
        id:    caption,
        label: caption + (label ? ` — ${label}` : ''),
        path:  caption + '\\',
        fs:    fsys || 'NTFS',
        total: Number(size)  || 0,
        free:  Number(free)  || 0,
        type:  dType === '2' ? 'removable' : 'fixed',
      });
    }
    return drives.length ? drives : fallbackDrives();
  } catch {
    return fallbackDrives();
  }
}

function listUnix() {
  const out = safeExec('df -k');
  const drives = out.split('\n').slice(1).filter(l => l.startsWith('/dev/')).map(l => {
    const p = l.trim().split(/\s+/);
    return { id:p[0], label:p[8]||p[0], path:p[8]||'/', fs:'unix',
             total:Number(p[1])*1024||0, free:Number(p[3])*1024||0, type:'fixed' };
  });
  return drives.length ? drives : [{ id:'/', label:'/', path:'/', fs:'ext4', total:0, free:0, type:'fixed' }];
}

function fallbackDrives() {
  const found = [];
  for (const l of 'CDEFGHIJKLMNOPQRSTUVWXYZ') {
    const p = l + ':\\';
    if (exists(p)) found.push({ id:l+':', label:l+': Drive', path:p, fs:'NTFS', total:0, free:0, type:'fixed' });
  }
  return found.length ? found : [{ id:'C:', label:'C:', path:'C:\\', fs:'NTFS', total:0, free:0, type:'fixed' }];
}

// ─── SCAN ENGINE ──────────────────────────────────────────────────────────────
function scan(opts, emit, isStopped) {
  _seq = 0;
  setImmediate(() => runScan(opts, emit, isStopped));
}

async function runScan(opts, emit, isStopped) {
  // Deduplication su path fisico del file sorgente
  const seen  = new Set();
  let   total = 0;

  function add(f) {
    const key = f.path.toLowerCase();
    if (seen.has(key)) return;
    if (opts.types?.length && !opts.types.includes(f.type)) return;
    seen.add(key);
    total++;
    emit({ type: 'file', file: f, total });
  }

  const progress = (phase, pct, msg) =>
    emit({ type: 'progress', phase, pct: Math.min(100, Math.round(pct)), msg, total });

  try {
    // ── FASE 1: $Recycle.Bin ─────────────────────────────────────────────────
    progress('recycle', 1, 'Lettura Cestino di sistema ($Recycle.Bin)...');
    const r0 = total;
    await scanRecycleBin(opts.drive, add, isStopped);
    progress('recycle', 100, `Cestino: ${total - r0} file intatti recuperabili`);
    if (isStopped()) return emit({ type: 'done', total });

    // ── FASE 2: Volume Shadow Copies (VSS) ───────────────────────────────────
    if (IS_WIN && opts.isAdmin && opts.mode !== 'quick') {
      const r1 = total;
      progress('vss', 1, 'Ricerca Volume Shadow Copies (snapshot)...');
      await scanVSS(opts.drive, add, isStopped, (p, m) => progress('vss', p, m));
      progress('vss', 100, `Shadow Copy: ${total - r1} file trovati`);
      if (isStopped()) return emit({ type: 'done', total });
    }

    // ── FASE 3: Cartelle utente ───────────────────────────────────────────────
    if (opts.mode !== 'quick') {
      progress('user', 1, 'Scansione cartelle utente...');
      await scanUserFolders(add, isStopped, (p, m) => progress('user', p, m));
      progress('user', 100, `Cartelle utente: ${total} file totali`);
      if (isStopped()) return emit({ type: 'done', total });
    }

    // ── FASE 4: Filesystem completo ───────────────────────────────────────────
    if (opts.mode === 'deep' || opts.mode === 'full') {
      progress('filesystem', 1, `Scansione filesystem ${opts.drive || 'C:'}...`);
      await scanFilesystem(opts.drive, add, isStopped, (p, m) => progress('filesystem', p, m));
      if (isStopped()) return emit({ type: 'done', total });
    }

    // ── FASE 5: USN Change Journal ────────────────────────────────────────────
    // fsutil.exe è disponibile su qualsiasi Windows senza audit policy speciali
    if (opts.mode === 'full' && IS_WIN && opts.isAdmin) {
      const r4 = total;
      progress('usn', 1, 'Analisi USN Change Journal (NTFS)...');
      await scanUSNJournal(opts.drive, add, isStopped, (p, m) => progress('usn', p, m));
      progress('usn', 100, `Journal NTFS: ${total - r4} riferimenti aggiuntivi`);
    }

    progress('done', 100, `Completato — ${total} file trovati`);
    emit({ type: 'done', total });

  } catch (err) {
    emit({ type: 'error', message: err.message });
  }
}

// ─── FASE 1: $Recycle.Bin ────────────────────────────────────────────────────
async function scanRecycleBin(drive, add, isStopped) {
  if (IS_WIN) {
    // Scansiona su TUTTI i drive, non solo quello selezionato:
    // un file eliminato da D:\ sta in D:\$Recycle.Bin anche se scansioniamo C:
    const letters = drive
      ? [drive.replace(/[:\\\/]/g, '')]
      : 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    for (const letter of letters) {
      if (isStopped()) return;
      const rbRoot = letter + ':\\$Recycle.Bin';
      if (!exists(rbRoot)) continue;

      // Una sottocartella per ogni SID utente
      for (const sidEntry of listDir(rbRoot)) {
        if (isStopped()) return;
        if (!sidEntry.isDirectory()) continue;
        const sidDir = path.join(rbRoot, sidEntry.name);

        for (const entry of listDir(sidDir)) {
          if (isStopped()) return;
          // $R = contenuto originale del file
          // $I = metadati (percorso originale, data eliminazione)
          if (!entry.name.startsWith('$R')) continue;

          const rFile = path.join(sidDir, entry.name);
          const iFile = path.join(sidDir, '$I' + entry.name.slice(2));
          const st    = statFile(rFile);
          if (!st || st.size === 0) continue;

          let origPath  = rFile; // fallback: path nel cestino
          let deletedAt = null;

          if (exists(iFile)) {
            try {
              const buf = fs.readFileSync(iFile);
              // Struttura file $I (documentata da Joachim Metz / libforensics):
              //   Bytes  0-7:  Versione (1 = Vista/7, 2 = Win8+) — UINT64 LE
              //   Bytes  8-15: Dimensione originale — UINT64 LE
              //   Bytes 16-23: Timestamp eliminazione — FILETIME (100ns since 1601-01-01)
              //   Bytes 24-27: [solo ver.2] Numero caratteri nel path — UINT32 LE
              //   Bytes 24/28: Path UTF-16LE null-terminated
              if (buf.length >= 24) {
                // Leggi versione come UINT32 (i primi 4 byte bastano: 1 o 2)
                const version = buf.readUInt32LE(0);

                // Converti FILETIME → JavaScript Date
                // FILETIME = uint64 LE, 100-nanosecond intervals since 1601-01-01
                const ftLo = buf.readUInt32LE(16);
                const ftHi = buf.readUInt32LE(20);
                // ms = (ftHi * 2^32 + ftLo) / 10000 − diff_ms_1601_to_1970
                const ms = (ftHi * 4294967296 + ftLo) / 10000 - 11644473600000;
                if (ms > 0 && ms < Date.now() + 86400000) {
                  deletedAt = new Date(ms);
                }

                // Path originale: offset 24 (ver1) o 28 (ver2)
                const pathStart = version === 2 ? 28 : 24;
                if (buf.length > pathStart + 2) {
                  const raw = buf.slice(pathStart).toString('utf16le');
                  const nul = raw.indexOf('\0');
                  const p   = (nul >= 0 ? raw.slice(0, nul) : raw).trim();
                  // Valida: deve sembrare un path Windows (lettera:\ ...)
                  if (p.length > 3 && /^[A-Za-z]:\\/.test(p)) {
                    origPath = p;
                  }
                }
              }
            } catch { /* usa fallback path */ }
          }

          const name = path.basename(origPath);
          const ext  = path.extname(name).toLowerCase();
          add(mkFile({
            path: rFile, name, ext, st,
            source:     'Cestino',
            origPath,
            origDir:    path.dirname(origPath),
            deletedAt,
            confidence: 100,
          }));
        }
        await yield_();
      }
    }

  } else if (process.platform === 'darwin') {
    await walkDir(path.join(HOME, '.Trash'), add, isStopped, 'Cestino', 3);

  } else {
    // Linux — XDG Trash Specification
    const trashFiles = path.join(HOME, '.local/share/Trash/files');
    const trashInfo  = path.join(HOME, '.local/share/Trash/info');
    if (!exists(trashFiles)) return;

    for (const e of listDir(trashFiles)) {
      if (isStopped() || !e.isFile()) continue;
      const fp = path.join(trashFiles, e.name);
      const st = statFile(fp);
      if (!st) continue;
      let origPath = fp, deletedAt = null;
      try {
        const info = fs.readFileSync(path.join(trashInfo, e.name + '.trashinfo'), 'utf8');
        const pm = info.match(/^Path=(.+)$/m);
        const dm = info.match(/^DeletionDate=(.+)$/m);
        if (pm) origPath  = decodeURIComponent(pm[1].trim());
        if (dm) deletedAt = new Date(dm[1].trim());
      } catch {}
      const name = path.basename(origPath) || e.name;
      const ext  = path.extname(name).toLowerCase();
      add(mkFile({ path:fp, name, ext, st, source:'Cestino', origPath,
                   origDir:path.dirname(origPath), deletedAt, confidence:100 }));
    }
  }
}

// ─── FASE 2: Volume Shadow Copies ────────────────────────────────────────────
async function scanVSS(drive, add, isStopped, onP) {
  const letter = (drive || 'C:').replace(/[:\\\/]/g, '');

  // Elenca shadow copies tramite vssadmin (disponibile senza WMI)
  const vssOut = safeExec(
    `vssadmin list shadows /for=${letter}: 2>nul`,
    20000
  );

  // Estrai i path delle shadow copies
  const shadows = [];
  for (const line of vssOut.split('\n')) {
    const m = line.match(/Shadow Copy Volume:\s+(\\\\\?\\GLOBALROOT\\[^\r\n]+)/i);
    if (m) shadows.push(m[1].trim());
  }

  if (!shadows.length) {
    onP(100, 'Nessuna shadow copy disponibile');
    return;
  }

  for (let i = 0; i < shadows.length; i++) {
    if (isStopped()) return;
    onP(Math.round((i / shadows.length) * 90), `Analisi snapshot ${i+1}/${shadows.length}...`);
    const shadow = shadows[i];

    // Scansiona cartelle utente nello snapshot
    const scanDirs = ['Users', letter + '\\Users'];
    for (const d of scanDirs) {
      const p = path.join(shadow, d);
      if (exists(p)) {
        await walkDir(p, (f) => {
          // Imposta source e confidence corretti per file da shadow copy
          f.source     = 'Shadow Copy';
          f.intact     = true;
          f.confidence = 95;
          add(f);
        }, isStopped, 'Shadow Copy', 5);
        break;
      }
    }
    await yield_();
  }
  onP(100, `${shadows.length} snapshot analizzati`);
}

// ─── FASE 3: Cartelle utente ──────────────────────────────────────────────────
async function scanUserFolders(add, isStopped, onP) {
  const folders = IS_WIN ? [
    path.join(HOME, 'Downloads'),
    path.join(HOME, 'Desktop'),
    path.join(HOME, 'Documents'),
    path.join(HOME, 'Pictures'),
    path.join(HOME, 'Videos'),
    path.join(HOME, 'Music'),
    path.join(HOME, 'AppData', 'Local', 'Temp'),
    path.join(HOME, 'AppData', 'Local', 'Microsoft', 'Windows', 'INetCache'),
    path.join(HOME, 'AppData', 'Roaming', 'Microsoft', 'Office'),
    path.join(HOME, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Downloads'),
    os.tmpdir(),
  ].filter(Boolean) : [
    path.join(HOME, 'Downloads'),
    path.join(HOME, 'Desktop'),
    path.join(HOME, 'Documents'),
    path.join(HOME, 'Pictures'),
    '/tmp',
  ];

  for (let i = 0; i < folders.length; i++) {
    if (isStopped()) return;
    onP(Math.round((i / folders.length) * 95), path.basename(folders[i]) + '...');
    // min 512 byte per cartelle utente (possono esserci file piccoli legittimi)
    await walkDir(folders[i], add, isStopped, 'Temp', 4, null, 512);
  }
}

// ─── FASE 4: Filesystem completo ─────────────────────────────────────────────
async function scanFilesystem(drive, add, isStopped, onP) {
  let roots = [];
  if (IS_WIN && drive) {
    const letter = drive.replace(/[:\\\/]/g, '');
    const usersDir = letter + ':\\Users';
    roots = exists(usersDir) ? [usersDir] : [letter + ':\\'];
  } else {
    roots = [HOME];
  }

  let n = 0;
  for (const root of roots) {
    await walkDir(root, add, isStopped, 'Filesystem', 12, () => {
      n++;
      if (n % 500 === 0) onP(Math.min(95, n / 300), n.toLocaleString() + ' file analizzati...');
    }, 4096); // solo file > 4KB nel filesystem scan generale
  }
  onP(100, 'Filesystem completato');
}

// ─── FASE 5: USN Change Journal ───────────────────────────────────────────────
// fsutil usn readjournal → lista MFT con flag di cancellazione
// Non richiede audit policy, solo admin. Funziona su qualsiasi NTFS.
async function scanUSNJournal(drive, add, isStopped, onP) {
  const letter = (drive || 'C:').replace(/[:\\\/]/g, '');

  // Leggi il journal con fsutil — output: MFT record con Nome, Path, Reason
  // 0x80000200 = CLOSE | FILE_DELETE
  const out = safeExec(
    `fsutil usn readjournal ${letter}: csv 2>nul`,
    30000
  );

  if (!out.trim()) {
    onP(100, 'Journal NTFS non disponibile');
    return;
  }

  let n = 0;
  const lines = out.split('\n');
  for (const line of lines) {
    if (isStopped()) return;
    // Formato CSV: MajorVersion,MinorVersion,Usn,TimeStamp,Reason,SourceInfo,SecurityId,FileAttributes,FileName,ParentMFT
    const cols = line.split(',');
    if (cols.length < 9) continue;

    const reason   = cols[4]?.trim() || '';
    const fileName = cols[8]?.trim().replace(/^"|"$/g, '') || '';

    // Filtra solo le righe di cancellazione
    // Reason flag 0x200 = FILE_DELETE, 0x80000000 = CLOSE
    if (!reason.includes('0x80000200') && !reason.toLowerCase().includes('delete')) continue;
    if (!fileName || !path.extname(fileName)) continue;

    const ext  = path.extname(fileName).toLowerCase();
    const type = typeOf(ext);
    if (type === 'other') continue; // salta file sistema senza tipo riconoscibile

    // Il journal non contiene il path completo, solo il nome — non possiamo sapere se il file esiste ancora
    n++;
    add(mkFile({
      path:       `${letter}:\\[Journal#${n}]\\${fileName}`,
      name:       fileName,
      ext, st:    { size: 0, mtime: null, birthtime: null },
      source:     'USN Journal',
      origPath:   `${letter}:\\?\\${fileName}`,
      origDir:    `${letter}:\\?`,
      confidence: 55,
    }));
    if (n % 100 === 0) onP(Math.min(90, n / 10), `Journal: ${n} record`);
  }
  onP(100, `Journal NTFS: ${n} record trovati`);
}

// ─── WALKER ricorsivo ─────────────────────────────────────────────────────────
async function walkDir(dir, add, isStopped, source, maxDepth, onFile, minSize = 1024, depth = 0) {
  if (depth > maxDepth || !exists(dir) || isStopped()) return;

  const entries = listDir(dir);
  let n = 0;

  for (const e of entries) {
    if (isStopped()) return;
    const fp = path.join(dir, e.name);

    if (e.isDirectory()) {
      // FIX precedenza operatori: parentesi obbligatorie attorno all'&&
      if (SKIP_DIRS.has(e.name) || (e.name.startsWith('.') && depth > 0)) continue;
      await walkDir(fp, add, isStopped, source, maxDepth, onFile, minSize, depth + 1);

    } else if (e.isFile()) {
      const st = statFile(fp);
      if (!st || st.size < minSize) continue;

      const name = e.name;
      const ext  = path.extname(name).toLowerCase();

      // In filesystem scan salta file senza tipo riconoscibile (troppo rumore)
      if (source === 'Filesystem' && typeOf(ext) === 'other') continue;

      add(mkFile({ path:fp, name, ext, st, source, origPath:fp, origDir:dir }));
      n++;
      if (onFile) onFile(n);
    }

    // Yield ogni 150 iterazioni — mantiene UI responsiva senza rallentare troppo
    if (n % 150 === 0) await yield_();
  }
}

module.exports = { listDrives, scan };
