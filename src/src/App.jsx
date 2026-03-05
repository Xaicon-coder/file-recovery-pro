import React, { useState, useEffect, useCallback, useRef } from 'react';
import TitleBar from './components/TitleBar';
import Sidebar  from './components/Sidebar';
import Setup    from './components/Setup';
import Scanning from './components/Scanning';
import Results  from './components/Results';
import Recovery from './components/Recovery';
import Updates  from './components/Updates';

const IS_EL = typeof window !== 'undefined' && !!window?.api;

// ─── Mock completo (dev/preview) ──────────────────────────────────────────────
const MOCK = (() => {
  const FILES = [
    { id:'1',  name:'Relazione_Q3_2024.pdf',   ext:'.pdf',  type:'document',    size:3145728,   source:'Cestino',     intact:true,  confidence:100, originalPath:'C:\\Users\\Marco\\Documents\\Relazione_Q3_2024.pdf',      originalDir:'C:\\Users\\Marco\\Documents',  path:'C:\\$Recycle.Bin\\S-1-5-21\\$R2A1F8.pdf',  deletedAt:new Date(Date.now()-2*864e5),  modified:new Date(Date.now()-30*864e5) },
    { id:'2',  name:'Foto_Matrimonio.jpg',      ext:'.jpg',  type:'image',       size:5242880,   source:'Cestino',     intact:true,  confidence:100, originalPath:'C:\\Users\\Marco\\Pictures\\Foto_Matrimonio.jpg',         originalDir:'C:\\Users\\Marco\\Pictures',   path:'C:\\$Recycle.Bin\\S-1-5-21\\$R4C9E1.jpg',  deletedAt:new Date(Date.now()-1*864e5),  modified:new Date(Date.now()-60*864e5) },
    { id:'3',  name:'Budget_2024.xlsx',         ext:'.xlsx', type:'spreadsheet', size:786432,    source:'Cestino',     intact:true,  confidence:100, originalPath:'C:\\Users\\Marco\\Documents\\Budget_2024.xlsx',           originalDir:'C:\\Users\\Marco\\Documents',  path:'C:\\$Recycle.Bin\\S-1-5-21\\$R7B3D2.xlsx', deletedAt:new Date(Date.now()-3*864e5),  modified:new Date(Date.now()-45*864e5) },
    { id:'4',  name:'Video_Compleanno.mp4',     ext:'.mp4',  type:'video',       size:892928000, source:'Cestino',     intact:true,  confidence:100, originalPath:'C:\\Users\\Marco\\Videos\\Video_Compleanno.mp4',          originalDir:'C:\\Users\\Marco\\Videos',     path:'C:\\$Recycle.Bin\\S-1-5-21\\$R1D5F9.mp4',  deletedAt:new Date(Date.now()-5*864e5),  modified:new Date(Date.now()-365*864e5) },
    { id:'5',  name:'Contratto_Affitto.docx',   ext:'.docx', type:'document',    size:94208,     source:'Cestino',     intact:true,  confidence:100, originalPath:'C:\\Users\\Marco\\Documents\\Contratto_Affitto.docx',     originalDir:'C:\\Users\\Marco\\Documents',  path:'C:\\$Recycle.Bin\\S-1-5-21\\$R8E4A3.docx', deletedAt:new Date(Date.now()-7*864e5),  modified:new Date(Date.now()-90*864e5) },
    { id:'6',  name:'Progetto_Web_v2.zip',      ext:'.zip',  type:'archive',     size:52428800,  source:'Shadow Copy', intact:true,  confidence:95,  originalPath:'C:\\Users\\Marco\\Desktop\\Progetto_Web_v2.zip',          originalDir:'C:\\Users\\Marco\\Desktop',    path:'\\\\?\\GLOBALROOT\\Device\\HarddiskVolumeShadowCopy3\\Users\\Marco\\Desktop\\Progetto_Web_v2.zip', deletedAt:null, modified:new Date(Date.now()-14*864e5) },
    { id:'7',  name:'database_backup.sql',      ext:'.sql',  type:'code',        size:10485760,  source:'Shadow Copy', intact:true,  confidence:95,  originalPath:'C:\\Users\\Marco\\Documents\\database_backup.sql',        originalDir:'C:\\Users\\Marco\\Documents',  path:'\\\\?\\GLOBALROOT\\Device\\HarddiskVolumeShadowCopy3\\Users\\Marco\\Documents\\database_backup.sql', deletedAt:null, modified:new Date(Date.now()-20*864e5) },
    { id:'8',  name:'Screenshot_riunione.png',  ext:'.png',  type:'image',       size:1310720,   source:'Temp',        intact:false, confidence:80,  originalPath:'C:\\Users\\Marco\\AppData\\Local\\Temp\\Screenshot.png',   originalDir:'C:\\Users\\Marco\\AppData\\Local\\Temp', path:'C:\\Users\\Marco\\AppData\\Local\\Temp\\Screenshot.png', deletedAt:null, modified:new Date(Date.now()-8*864e5) },
    { id:'9',  name:'note_riunione.txt',        ext:'.txt',  type:'text',        size:8192,      source:'Temp',        intact:false, confidence:80,  originalPath:'C:\\Users\\Marco\\Documents\\note_riunione.txt',          originalDir:'C:\\Users\\Marco\\Documents',  path:'C:\\Users\\Marco\\Documents\\note_riunione.txt', deletedAt:null, modified:new Date(Date.now()-3*864e5) },
    { id:'10', name:'analisi_dati.py',          ext:'.py',   type:'code',        size:12288,     source:'Filesystem',  intact:false, confidence:75,  originalPath:'C:\\Users\\Marco\\Scripts\\analisi_dati.py',             originalDir:'C:\\Users\\Marco\\Scripts',    path:'C:\\Users\\Marco\\Scripts\\analisi_dati.py', deletedAt:null, modified:new Date(Date.now()-100*864e5) },
    { id:'11', name:'Registrazione_011.m4a',    ext:'.m4a',  type:'audio',       size:8388608,   source:'Filesystem',  intact:false, confidence:75,  originalPath:'C:\\Users\\Marco\\Music\\Registrazione_011.m4a',         originalDir:'C:\\Users\\Marco\\Music',      path:'C:\\Users\\Marco\\Music\\Registrazione_011.m4a', deletedAt:null, modified:new Date(Date.now()-50*864e5) },
    { id:'12', name:'vecchio_cv_2022.docx',     ext:'.docx', type:'document',    size:0,         source:'USN Journal', intact:false, confidence:55,  originalPath:'C:\\?\\vecchio_cv_2022.docx',   originalDir:'C:\\?', path:'C:\\[Journal#1]\\vecchio_cv_2022.docx', deletedAt:new Date(Date.now()-15*864e5), modified:null },
    { id:'13', name:'fattura_marzo_2024.pdf',   ext:'.pdf',  type:'document',    size:0,         source:'USN Journal', intact:false, confidence:55,  originalPath:'C:\\?\\fattura_marzo_2024.pdf', originalDir:'C:\\?', path:'C:\\[Journal#2]\\fattura_marzo_2024.pdf', deletedAt:new Date(Date.now()-25*864e5), modified:null },
  ];
  const DRIVES = [
    { id:'C:', label:'C: — Sistema (Windows)', path:'C:\\', fs:'NTFS', total:512e9,  free:178e9,  type:'fixed' },
    { id:'D:', label:'D: — Dati e Backup',     path:'D:\\', fs:'NTFS', total:2048e9, free:912e9,  type:'fixed' },
  ];
  return {
    win:   { min:()=>{}, max:()=>{}, close:()=>{} },
    sys:   { info: async () => ({ platform:'win32', hostname:'WORKSTATION-MARCO', ram:{total:16e9,free:9.2e9}, isAdmin:true, version:'2.5.0' }) },
    drive: { list: async () => DRIVES },
    scan: {
      start:   async () => {},
      stop:    async () => {},
      onEvent: cb => {
        let stopped = false;
        const phases = [
          { id:'recycle',    items:FILES.filter(f=>f.source==='Cestino'),     msgs:['Accesso $Recycle.Bin...','Lettura metadati $I...','Decodifica path UTF-16LE...'] },
          { id:'vss',        items:FILES.filter(f=>f.source==='Shadow Copy'), msgs:['vssadmin list shadows...','Scansione snapshot VSS...'] },
          { id:'user',       items:FILES.filter(f=>f.source==='Temp'),        msgs:['Scansione Downloads...','Scansione AppData\\Temp...'] },
          { id:'filesystem', items:FILES.filter(f=>f.source==='Filesystem'),  msgs:['Walk ricorsivo C:\\Users...','Analisi attributi NTFS...'] },
          { id:'usn',        items:FILES.filter(f=>f.source==='USN Journal'), msgs:['fsutil usn readjournal C:...','Parsing FILE_DELETE records...'] },
        ];
        let pi=0, fi=0, pct=0, total=0;
        const t = setInterval(() => {
          if (stopped) { clearInterval(t); return; }
          const ph = phases[pi];
          pct = Math.min(pct + 5 + Math.random()*9, 100);
          cb({ type:'progress', phase:ph.id, pct:Math.round(pct), msg:ph.msgs[pct>66?Math.min(2,ph.msgs.length-1):pct>33?1:0] });
          if (fi < ph.items.length && Math.random()>.38) cb({ type:'file', file:ph.items[fi++], total:++total });
          if (pct >= 100) {
            while (fi < ph.items.length) cb({ type:'file', file:ph.items[fi++], total:++total });
            pi++; pct=0; fi=0;
            if (pi >= phases.length) { clearInterval(t); cb({ type:'done', total }); }
          }
        }, 140);
        return () => { stopped=true; clearInterval(t); };
      },
    },
    recover: {
      files:   async ({ files, dest }) => {},
      pickDir: async () => 'C:\\FileRecuperati',
      onTick:  fn => () => {},
      onDone:  fn => () => {},
      open:    async () => {},
      openDir: async () => {},
    },
    updater: {
      install: () => {},
      check:   async () => {},
      onEvent: cb => {
        const t1 = setTimeout(() => cb({ event:'checking' }), 600);
        const t2 = setTimeout(() => cb({ event:'downloading', version:'2.6.0', notes:'• Migliorata velocità scansione\n• Fix recupero Shadow Copy su Windows 11\n• Nuova UI schermata aggiornamenti\n• Ottimizzazione memoria su scansioni grandi' }), 1800);
        let p = 0;
        const t3 = setInterval(() => {
          p = Math.min(p + Math.random()*12+4, 100);
          cb({ event:'progress', pct:Math.round(p), bps:2400000 });
          if (p>=100) { clearInterval(t3); setTimeout(()=>cb({ event:'ready', version:'2.6.0', notes:'• Migliorata velocità scansione\n• Fix recupero Shadow Copy su Windows 11\n• Nuova UI schermata aggiornamenti\n• Ottimizzazione memoria su scansioni grandi' }),300); }
        }, 600);
        return () => { clearTimeout(t1); clearTimeout(t2); clearInterval(t3); };
      },
    },
  };
})();

const API = IS_EL ? window.api : MOCK;

const SCAN_INIT  = { phase:'idle', pct:0, msg:'', files:[], done:false };
const REC_INIT   = { status:'idle', ok:0, fail:0, total:0, dest:'', log:[] };

// ─── App root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [view,    setView]   = useState('setup');
  const [sysInfo, setSys]    = useState(null);
  const [drives,  setDrives] = useState([]);
  const [opts,    setOpts]   = useState({ drive: null, mode: 'standard', types: [] });
  const [scan,    setScan]   = useState(SCAN_INIT);
  const [sel,     setSel]    = useState([]);
  const [dest,    setDest]   = useState('original');
  const [rec,     setRec]    = useState(REC_INIT);
  const [update,  setUpdate] = useState(null);

  // Refs per evitare stale closures e memory leak
  const cleanScanRef  = useRef(null);
  const fileBufferRef = useRef([]);    // buffer batch per file scan
  const flushTimerRef = useRef(null);

  useEffect(() => {
    API.sys.info().then(s => setSys(s));
    API.drive.list().then(ds => {
      setDrives(ds);
      if (ds.length) setOpts(o => ({ ...o, drive: ds[0].id }));
    });
    const unsub = API.updater.onEvent(ev => setUpdate(ev));
    return () => { unsub?.(); clearInterval(flushTimerRef.current); };
  }, []);

  // Flush file buffer ogni 80ms → max ~12 re-render/sec durante scansione
  const flushFiles = useCallback(() => {
    if (!fileBufferRef.current.length) return;
    const batch = fileBufferRef.current.splice(0);
    setScan(s => ({ ...s, files: [...s.files, ...batch] }));
  }, []);

  const startScan = useCallback(async () => {
    // Pulizia stato precedente
    cleanScanRef.current?.();
    clearInterval(flushTimerRef.current);
    fileBufferRef.current = [];

    setScan({ phase:'starting', pct:0, msg:'Inizializzazione...', files:[], done:false });
    setSel([]);
    setView('scanning');

    // Timer flush batch ogni 80ms
    flushTimerRef.current = setInterval(flushFiles, 80);

    const cleanup = API.scan.onEvent(ev => {
      if      (ev.type === 'progress') setScan(s => ({ ...s, phase:ev.phase, pct:ev.pct, msg:ev.msg }));
      else if (ev.type === 'file')     fileBufferRef.current.push(ev.file);
      else if (ev.type === 'done') {
        // Flush finale garantito
        flushFiles();
        clearInterval(flushTimerRef.current);
        setScan(s => ({ ...s, done:true, pct:100 }));
        setTimeout(() => setView('results'), 500);
      }
    });
    cleanScanRef.current = cleanup;
    await API.scan.start({ ...opts, isAdmin: sysInfo?.isAdmin });
  }, [opts, sysInfo, flushFiles]);

  const stopScan = useCallback(async () => {
    await API.scan.stop();
    cleanScanRef.current?.();
    clearInterval(flushTimerRef.current);
    // Flush i file rimasti nel buffer
    const remaining = fileBufferRef.current.splice(0);
    setScan(s => ({ ...s, done:true, files:[...s.files, ...remaining] }));
    // Vai ai risultati solo se ci sono file
    setScan(s => { if (s.files.length > 0) setView('results'); return s; });
  }, []);

  const startRecovery = useCallback(async () => {
    const files = scan.files.filter(f => sel.includes(f.id));
    if (!files.length) return;

    // Risolvi destinazione
    let destination = '__original__';
    if (dest === 'choose') {
      destination = await API.recover.pickDir();
      if (!destination) return;
    }

    setRec({ status:'recovering', ok:0, fail:0, total:files.length, dest:destination, log:[] });
    setView('recovery');

    if (IS_EL) {
      const unTick = API.recover.onTick(({ id, ok, target, error, skip, size }) =>
        setRec(r => ({
          ...r,
          ok:   r.ok   + (ok ? 1 : 0),
          fail: r.fail + (ok ? 0 : 1),
          log:  [...r.log, { id, ok, skip, info: ok ? target : error, size }],
        }))
      );
      const unDone = API.recover.onDone(({ ok, fail }) => {
        unTick(); unDone();
        setRec(r => ({ ...r, status:'done', ok, fail }));
      });
      await API.recover.files({ files, dest: destination });
    } else {
      // Mock recovery con delay realistico
      for (const f of files) {
        await new Promise(r => setTimeout(r, 50 + Math.random()*100));
        const ok   = f.source !== 'USN Journal' && f.size > 0;
        const skip = f.source === 'USN Journal';
        const info = ok
          ? (destination === '__original__' ? f.originalPath : `${destination}\\${f.name}`)
          : (skip ? 'Solo riferimento journal — dati non recuperabili' : 'Errore accesso file');
        setRec(r => ({
          ...r,
          ok:   r.ok   + (ok   ? 1 : 0),
          fail: r.fail + (!ok && !skip ? 1 : 0),
          log:  [...r.log, { id:f.id, ok, skip, info, size:f.size }],
        }));
      }
      setRec(r => ({ ...r, status:'done' }));
    }
  }, [scan.files, sel, dest]);

  const reset = useCallback(() => {
    cleanScanRef.current?.();
    clearInterval(flushTimerRef.current);
    fileBufferRef.current = [];
    setScan(SCAN_INIT);
    setSel([]);
    setRec(REC_INIT);
    setView('setup');
  }, []);

  // Determina la cartella da aprire dopo recovery
  const handleOpenDir = useCallback(() => {
    const d = rec.dest;
    // Se dest è '__original__' usa la cartella del primo file recuperato con successo
    if (d === '__original__') {
      const firstOk = rec.log.find(e => e.ok);
      if (firstOk?.info) {
        const dir = firstOk.info.includes('\\')
          ? firstOk.info.substring(0, firstOk.info.lastIndexOf('\\'))
          : firstOk.info;
        API.recover.openDir(dir);
      }
    } else {
      API.recover.openDir(d);
    }
  }, [rec]);

  return (
    <div style={{ display:'flex', flexDirection:'column', width:'100vw', height:'100vh', overflow:'hidden', background:'var(--void)' }}>
      <TitleBar
        api={API.win}
        version={sysInfo?.version}
        update={update}
        onInstall={() => API.updater.install()}
        view={view}
        onUpdates={() => setView('updates')}
      />
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        <Sidebar
          view={view}
          setView={setView}
          hasResults={scan.files.length > 0}
          updateReady={update?.event === 'ready'}
        />
        <main style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          {view === 'setup'    && <Setup    info={sysInfo} drives={drives} opts={opts} setOpts={setOpts} onStart={startScan}/>}
          {view === 'scanning' && <Scanning scan={scan} onStop={stopScan}/>}
          {view === 'results'  && <Results  files={scan.files} sel={sel} setSel={setSel} dest={dest} setDest={setDest} onRecover={startRecovery} onReset={reset}/>}
          {view === 'recovery' && <Recovery rec={rec} files={scan.files.filter(f => sel.includes(f.id))} onOpen={handleOpenDir} onReset={reset}/>}
          {view === 'updates'  && <Updates  update={update} api={API} version={sysInfo?.version} onBack={() => setView('setup')}/>}
        </main>
      </div>
    </div>
  );
}
