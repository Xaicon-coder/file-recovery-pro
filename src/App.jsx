import React, { useState, useEffect, useCallback, useRef } from 'react';
import TitleBar from './components/TitleBar';
import Sidebar  from './components/Sidebar';
import Setup    from './components/Setup';
import Scanning from './components/Scanning';
import Results  from './components/Results';
import Recovery from './components/Recovery';

const IS_EL = typeof window !== 'undefined' && !!window?.api;

// ─── Mock realistico — rispecchia esattamente output del recovery engine ──────
const MOCK = (() => {
  const FILES = [
    // Cestino — file fisicamente intatti, path originale da $I
    { id:'1',  name:'Relazione_Q3_2024.pdf',      ext:'.pdf',  type:'document',    size:3145728,    source:'Cestino',     intact:true,  confidence:100, originalPath:'C:\\Users\\Marco\\Documents\\Lavoro\\Relazione_Q3_2024.pdf',       originalDir:'C:\\Users\\Marco\\Documents\\Lavoro',        path:'C:\\$Recycle.Bin\\S-1-5-21-3456\\$R2A1F8.pdf',  deletedAt:new Date(Date.now()-2*864e5),  modified:new Date(Date.now()-30*864e5)  },
    { id:'2',  name:'Foto_Matrimonio_Luglio.jpg',  ext:'.jpg',  type:'image',       size:5242880,    source:'Cestino',     intact:true,  confidence:100, originalPath:'C:\\Users\\Marco\\Pictures\\2024\\Foto_Matrimonio_Luglio.jpg',      originalDir:'C:\\Users\\Marco\\Pictures\\2024',           path:'C:\\$Recycle.Bin\\S-1-5-21-3456\\$R4C9E1.jpg',  deletedAt:new Date(Date.now()-1*864e5),  modified:new Date(Date.now()-60*864e5)  },
    { id:'3',  name:'Budget_Familiare_2024.xlsx',  ext:'.xlsx', type:'spreadsheet', size:786432,     source:'Cestino',     intact:true,  confidence:100, originalPath:'C:\\Users\\Marco\\Documents\\Budget_Familiare_2024.xlsx',          originalDir:'C:\\Users\\Marco\\Documents',                path:'C:\\$Recycle.Bin\\S-1-5-21-3456\\$R7B3D2.xlsx', deletedAt:new Date(Date.now()-3*864e5),  modified:new Date(Date.now()-45*864e5)  },
    { id:'4',  name:'Video_Compleanno_Papa.mp4',   ext:'.mp4',  type:'video',       size:892928000,  source:'Cestino',     intact:true,  confidence:100, originalPath:'C:\\Users\\Marco\\Videos\\Famiglia\\Video_Compleanno_Papa.mp4',    originalDir:'C:\\Users\\Marco\\Videos\\Famiglia',         path:'C:\\$Recycle.Bin\\S-1-5-21-3456\\$R1D5F9.mp4', deletedAt:new Date(Date.now()-5*864e5),  modified:new Date(Date.now()-365*864e5) },
    { id:'5',  name:'Contratto_Affitto.docx',      ext:'.docx', type:'document',    size:94208,      source:'Cestino',     intact:true,  confidence:100, originalPath:'C:\\Users\\Marco\\Documents\\Personale\\Contratto_Affitto.docx',   originalDir:'C:\\Users\\Marco\\Documents\\Personale',     path:'C:\\$Recycle.Bin\\S-1-5-21-3456\\$R8E4A3.docx',deletedAt:new Date(Date.now()-7*864e5),  modified:new Date(Date.now()-90*864e5)  },
    { id:'6',  name:'Backup_Foto_2023.zip',        ext:'.zip',  type:'archive',     size:1073741824, source:'Cestino',     intact:true,  confidence:100, originalPath:'C:\\Users\\Marco\\Desktop\\Backup_Foto_2023.zip',                  originalDir:'C:\\Users\\Marco\\Desktop',                  path:'C:\\$Recycle.Bin\\S-1-5-21-3456\\$R3F2B7.zip', deletedAt:new Date(Date.now()-1*864e5),  modified:new Date(Date.now()-10*864e5)  },
    // Shadow Copy — versioni precedenti da snapshot VSS
    { id:'7',  name:'Progetto_Web_v2.zip',         ext:'.zip',  type:'archive',     size:52428800,   source:'Shadow Copy', intact:true,  confidence:95,  originalPath:'\\\\?\\GLOBALROOT\\Device\\HarddiskVolumeShadowCopy3\\Users\\Marco\\Desktop\\Progetto_Web_v2.zip', originalDir:'C:\\Users\\Marco\\Desktop', path:'\\\\?\\GLOBALROOT\\Device\\HarddiskVolumeShadowCopy3\\Users\\Marco\\Desktop\\Progetto_Web_v2.zip', deletedAt:null, modified:new Date(Date.now()-14*864e5) },
    { id:'8',  name:'database_backup.sql',         ext:'.sql',  type:'code',        size:10485760,   source:'Shadow Copy', intact:true,  confidence:95,  originalPath:'\\\\?\\GLOBALROOT\\Device\\HarddiskVolumeShadowCopy3\\Users\\Marco\\Documents\\database_backup.sql', originalDir:'C:\\Users\\Marco\\Documents', path:'\\\\?\\GLOBALROOT\\Device\\HarddiskVolumeShadowCopy3\\Users\\Marco\\Documents\\database_backup.sql', deletedAt:null, modified:new Date(Date.now()-20*864e5) },
    // Temp — file nelle cartelle utente ancora su disco
    { id:'9',  name:'Setup_VLC_3.0.21.exe',        ext:'.exe',  type:'other',       size:40894464,   source:'Temp',        intact:false, confidence:80,  originalPath:'C:\\Users\\Marco\\Downloads\\Setup_VLC_3.0.21.exe',               originalDir:'C:\\Users\\Marco\\Downloads',                path:'C:\\Users\\Marco\\Downloads\\Setup_VLC_3.0.21.exe',              deletedAt:null, modified:new Date(Date.now()-20*864e5) },
    { id:'10', name:'Screenshot_riunione.png',      ext:'.png',  type:'image',       size:1310720,    source:'Temp',        intact:false, confidence:80,  originalPath:'C:\\Users\\Marco\\AppData\\Local\\Temp\\Screenshot_riunione.png',   originalDir:'C:\\Users\\Marco\\AppData\\Local\\Temp',     path:'C:\\Users\\Marco\\AppData\\Local\\Temp\\Screenshot_riunione.png',  deletedAt:null, modified:new Date(Date.now()-8*864e5)  },
    { id:'11', name:'note_riunione_15gen.txt',      ext:'.txt',  type:'text',        size:8192,       source:'Temp',        intact:false, confidence:80,  originalPath:'C:\\Users\\Marco\\Documents\\note_riunione_15gen.txt',             originalDir:'C:\\Users\\Marco\\Documents',                path:'C:\\Users\\Marco\\Documents\\note_riunione_15gen.txt',             deletedAt:null, modified:new Date(Date.now()-3*864e5)  },
    // Filesystem — scan ricorsivo C:\Users
    { id:'12', name:'analisi_dati_v3.py',           ext:'.py',   type:'code',        size:12288,      source:'Filesystem',  intact:false, confidence:75,  originalPath:'C:\\Users\\Marco\\Documents\\Scripts\\analisi_dati_v3.py',         originalDir:'C:\\Users\\Marco\\Documents\\Scripts',       path:'C:\\Users\\Marco\\Documents\\Scripts\\analisi_dati_v3.py',         deletedAt:null, modified:new Date(Date.now()-100*864e5) },
    { id:'13', name:'Registrazione_011.m4a',        ext:'.m4a',  type:'audio',       size:8388608,    source:'Filesystem',  intact:false, confidence:75,  originalPath:'C:\\Users\\Marco\\Music\\Registrazioni\\Registrazione_011.m4a',   originalDir:'C:\\Users\\Marco\\Music\\Registrazioni',    path:'C:\\Users\\Marco\\Music\\Registrazioni\\Registrazione_011.m4a',   deletedAt:null, modified:new Date(Date.now()-50*864e5)  },
    // USN Journal — tracce di eliminazioni NTFS (solo riferimento, non recuperabili)
    { id:'14', name:'vecchio_cv_2022.docx',         ext:'.docx', type:'document',    size:0,          source:'USN Journal', intact:false, confidence:55,  originalPath:'C:\\?\\vecchio_cv_2022.docx',                                     originalDir:'C:\\?',                                      path:'C:\\[Journal#1]\\vecchio_cv_2022.docx',                           deletedAt:new Date(Date.now()-15*864e5), modified:null },
    { id:'15', name:'fattura_marzo_2024.pdf',       ext:'.pdf',  type:'document',    size:0,          source:'USN Journal', intact:false, confidence:55,  originalPath:'C:\\?\\fattura_marzo_2024.pdf',                                   originalDir:'C:\\?',                                      path:'C:\\[Journal#2]\\fattura_marzo_2024.pdf',                         deletedAt:new Date(Date.now()-25*864e5), modified:null },
  ];

  const DRIVES = [
    { id:'C:', label:'C: — Sistema (Windows)', path:'C:\\', fs:'NTFS', total:512*1e9,  free:178*1e9, type:'fixed' },
    { id:'D:', label:'D: — Dati e Backup',     path:'D:\\', fs:'NTFS', total:2048*1e9, free:912*1e9, type:'fixed' },
  ];

  return {
    win:   { min:()=>{}, max:()=>{}, close:()=>{} },
    sys:   { info: async () => ({ platform:'win32', hostname:'WORKSTATION-MARCO', ram:{total:16e9,free:9.2e9}, isAdmin:true, version:'2.0.0' }) },
    drive: { list: async () => DRIVES },

    scan: {
      start: async () => {},
      stop:  async () => {},
      onEvent: (cb) => {
        let stopped = false;
        const phases = [
          { id:'recycle',    items:FILES.filter(f=>f.source==='Cestino'),     msgs:['Accesso C:\\$Recycle.Bin...','Lettura metadati $I (UTF-16LE)...','Decodifica percorsi originali...'] },
          { id:'vss',        items:FILES.filter(f=>f.source==='Shadow Copy'), msgs:['vssadmin list shadows for=C:...','Analisi snapshot 1/3...','Scansione \\\\?\\GLOBALROOT\\...\\Users...'] },
          { id:'user',       items:FILES.filter(f=>f.source==='Temp'),        msgs:['Scansione Downloads...','Scansione AppData\\Local\\Temp...','Scansione INetCache...'] },
          { id:'filesystem', items:FILES.filter(f=>f.source==='Filesystem'),  msgs:['Analisi C:\\Users...','Scansione sottocartelle profonde...'] },
          { id:'usn',        items:FILES.filter(f=>f.source==='USN Journal'), msgs:['fsutil usn readjournal C: csv...','Parsing flag FILE_DELETE (0x200)...'] },
        ];
        let pi=0, fi=0, pct=0, total=0;
        const t = setInterval(() => {
          if (stopped) { clearInterval(t); return; }
          const ph = phases[pi];
          pct = Math.min(pct + 5 + Math.random()*9, 100);
          const mi = pct > 66 ? 2 : pct > 33 ? 1 : 0;
          cb({ type:'progress', phase:ph.id, pct:Math.round(pct), msg:ph.msgs[Math.min(mi,ph.msgs.length-1)], total });
          if (fi < ph.items.length && Math.random() > .38)
            cb({ type:'file', file:ph.items[fi++], total:++total });
          if (pct >= 100) {
            while (fi < ph.items.length) cb({ type:'file', file:ph.items[fi++], total:++total });
            pi++; pct=0; fi=0;
            if (pi >= phases.length) { clearInterval(t); cb({ type:'done', total }); }
          }
        }, 150);
        return () => { stopped=true; clearInterval(t); };
      },
    },

    recover: {
      files:   async () => {},
      pickDir: async () => 'C:\\FileRecuperati',
      onTick:  () => () => {},
      onDone:  () => () => {},
      open:    async () => {},
      openDir: async () => {},
    },

    updater: {
      install: () => {},
      onEvent: (cb) => {
        // Simula download automatico: trovato dopo 8s, scaricato in ~15s, pronto
        const t1 = setTimeout(() => cb({ event:'downloading', version:'2.1.0' }), 8000);
        let p2 = 0;
        const t2 = setInterval(() => {
          p2 = Math.min(p2 + Math.random()*14 + 4, 100);
          cb({ event:'progress', pct:Math.round(p2), version:'2.1.0' });
          if (p2 >= 100) { clearInterval(t2); setTimeout(() => cb({ event:'ready', version:'2.1.0' }), 300); }
        }, 700);
        return () => { clearTimeout(t1); clearInterval(t2); };
      },
    },
  };
})();

const API = IS_EL ? window.api : MOCK;

// ─── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view,    setView]   = useState('setup');
  const [sysInfo, setSys]    = useState(null);
  const [drives,  setDrives] = useState([]);
  const [opts,    setOpts]   = useState({ drive:null, mode:'standard', types:[] });
  const [scan,    setScan]   = useState({ phase:'idle', pct:0, msg:'', files:[], done:false });
  const [sel,     setSel]    = useState([]);
  const [dest,    setDest]   = useState('original');
  const [rec,     setRec]    = useState({ status:'idle', ok:0, fail:0, total:0, dest:'', log:[] });
  const [update,  setUpdate] = useState(null);
  const cleanRef = useRef(null);

  useEffect(() => {
    API.sys.info().then(setSys);
    API.drive.list().then(ds => {
      setDrives(ds);
      if (ds.length) setOpts(o => ({ ...o, drive:ds[0].id }));
    });
    const unsub = API.updater.onEvent(ev => setUpdate(ev));
    return () => unsub?.();
  }, []);

  const startScan = useCallback(async () => {
    cleanRef.current?.();
    setScan({ phase:'starting', pct:0, msg:'Inizializzazione...', files:[], done:false });
    setSel([]);
    setView('scanning');
    const cleanup = API.scan.onEvent(ev => {
      if (ev.type === 'progress') {
        setScan(s => ({ ...s, phase:ev.phase, pct:ev.pct, msg:ev.msg }));
      } else if (ev.type === 'file') {
        setScan(s => ({ ...s, files:[...s.files, ev.file] }));
      } else if (ev.type === 'done') {
        setScan(s => ({ ...s, done:true, pct:100, msg:`${s.files.length} file trovati` }));
        setTimeout(() => setView('results'), 500);
      } else if (ev.type === 'error') {
        setScan(s => ({ ...s, done:true, msg:'Errore: '+ev.message }));
      }
    });
    cleanRef.current = cleanup;
    await API.scan.start({ ...opts, isAdmin:sysInfo?.isAdmin });
  }, [opts, sysInfo]);

  const stopScan = useCallback(async () => {
    await API.scan.stop();
    cleanRef.current?.();
    setScan(s => ({ ...s, done:true }));
    if (scan.files.length > 0) setView('results');
  }, [scan.files.length]);

  const startRecovery = useCallback(async () => {
    const files = scan.files.filter(f => sel.includes(f.id));
    if (!files.length) return;
    let destination = '__original__';
    if (dest === 'choose') {
      destination = await API.recover.pickDir();
      if (!destination) return;
    }
    setRec({ status:'recovering', ok:0, fail:0, total:files.length, dest:destination, log:[] });
    setView('recovery');

    if (IS_EL) {
      const unTick = API.recover.onTick(({ id, ok, target, error }) => {
        setRec(r => ({ ...r, ok:r.ok+(ok?1:0), fail:r.fail+(ok?0:1), log:[...r.log,{id,ok,info:ok?target:error}] }));
      });
      const unDone = API.recover.onDone(({ ok, fail }) => {
        unTick(); unDone();
        setRec(r => ({ ...r, status:'done', ok, fail }));
      });
      await API.recover.files({ files, dest:destination });
    } else {
      // Mock: tick file per file con delay realistico, replica comportamento reale
      for (const f of files) {
        await new Promise(r => setTimeout(r, 70 + Math.random()*130));
        // File USN Journal: solo riferimento, non hanno dati fisici
        const ok   = f.source !== 'USN Journal' && f.size > 0;
        const info = ok
          ? (destination === '__original__' ? f.originalPath : `${destination}\\${f.name}`)
          : (f.source === 'USN Journal'
              ? 'Solo riferimento journal — dati non recuperabili senza strumenti specializzati'
              : 'Errore accesso file');
        setRec(r => ({ ...r, ok:r.ok+(ok?1:0), fail:r.fail+(ok?0:1), log:[...r.log,{id:f.id,ok,info}] }));
      }
      setRec(r => ({ ...r, status:'done' }));
    }
  }, [scan.files, sel, dest]);

  const reset = useCallback(() => {
    cleanRef.current?.();
    setScan({ phase:'idle', pct:0, msg:'', files:[], done:false });
    setSel([]);
    setRec({ status:'idle', ok:0, fail:0, total:0, dest:'', log:[] });
    setView('setup');
  }, []);

  return (
    <div style={{ display:'flex', flexDirection:'column', width:'100vw', height:'100vh', overflow:'hidden' }}>
      <TitleBar api={API.win} version={sysInfo?.version} update={update} onInstall={() => API.updater.install()} />
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        <Sidebar view={view} setView={setView} hasResults={scan.files.length > 0} />
        <main style={{ flex:1, overflow:'hidden' }}>
          {view === 'setup'    && <Setup    info={sysInfo} drives={drives} opts={opts} setOpts={setOpts} onStart={startScan} />}
          {view === 'scanning' && <Scanning scan={scan} onStop={stopScan} />}
          {view === 'results'  && <Results  files={scan.files} sel={sel} setSel={setSel} dest={dest} setDest={setDest} onRecover={startRecovery} onReset={reset} />}
          {view === 'recovery' && <Recovery rec={rec} files={scan.files.filter(f => sel.includes(f.id))} onOpen={() => API.recover.openDir(rec.dest)} onReset={reset} api={API} />}
        </main>
      </div>
    </div>
  );
}
