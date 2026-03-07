import React, { useState, useMemo, useCallback, useEffect } from 'react';
import ExportPanel from './ExportPanel';

const fmtSize = b => !b ? '0 B' : b>=1e9 ? (b/1e9).toFixed(1)+' GB' : b>=1e6 ? (b/1e6).toFixed(0)+' MB' : b>=1e3 ? (b/1e3).toFixed(0)+' KB' : b+' B';

const SRC_COL = {
  'Cestino':    'var(--p0)',
  'Shadow Copy':'#00ffee',
  'Temp':       'var(--a0)',
  'Filesystem': 'var(--t1)',
  'USN Journal':'var(--r0)',
};
const SRC_ORDER = ['Cestino','Shadow Copy','Temp','Filesystem','USN Journal'];

const TYPE_ICONS = {
  image:       'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  video:       'M15 10l4.55-2.07A1 1 0 0121 8.87V15.13a1 1 0 01-1.45.9L15 14M3 8h12v8H3z',
  audio:       'M9 18V5l12-2v13M9 9l12-2',
  document:    'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6',
  spreadsheet: 'M3 3h18v18H3z M3 9h18 M3 15h18 M9 3v18 M15 3v18',
  archive:     'M21 8l-4-4H5a2 2 0 00-2 2v16a2 2 0 002 2h14a2 2 0 002-2V8z',
  code:        'M16 18l6-6-6-6M8 6l-6 6 6 6',
  other:       'M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z',
};

function ConfBar({ v }) {
  const col = v >= 90 ? 'var(--p0)' : v >= 70 ? 'var(--a0)' : 'var(--r0)';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <div style={{ width:38, height:3, background:'var(--b0)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${v}%`, background:col, borderRadius:2 }}/>
      </div>
      <span style={{ fontFamily:'var(--mono)', fontSize:8, color:col, minWidth:22 }}>{v}%</span>
    </div>
  );
}

const COLS = [
  { l:'NOME',       k:'name'       },
  { l:'SORGENTE',   k:'source'     },
  { l:'TIPO',       k:'type'       },
  { l:'DIMENSIONE', k:'size'       },
  { l:'CONFIDENZA', k:'confidence' },
];

export default function Results({ files, sel, setSel, dest, setDest, onRecover, onReset }) {
  const [search,  setSearch]  = useState('');
  const [srcFilt, setSrcFilt] = useState([]);
  const [typFilt, setTypFilt] = useState([]);
  const [sort,    setSort]    = useState({ k:'source', dir:1 });
  const [showExport, setShowExport] = useState(false);

  // Calcola sorgenti e tipi una sola volta (files è stabile dopo scan)
  const allSrc   = useMemo(() => [...new Set(files.map(f => f.source))].sort((a,b) => SRC_ORDER.indexOf(a)-SRC_ORDER.indexOf(b)), [files]);
  const allTypes = useMemo(() => [...new Set(files.map(f => f.type))].sort(), [files]);

  // Filtra + ordina — dipende solo da primitive/shallow arrays
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = files;
    if (srcFilt.length) out = out.filter(f => srcFilt.includes(f.source));
    if (typFilt.length) out = out.filter(f => typFilt.includes(f.type));
    if (q)              out = out.filter(f => f.name.toLowerCase().includes(q) || (f.originalPath||'').toLowerCase().includes(q));
    return [...out].sort((a, b) => {
      const va = a[sort.k] ?? '', vb = b[sort.k] ?? '';
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
    });
  }, [files, srcFilt, typFilt, search, sort.k, sort.dir]);

  // Contatori — useMemo per non ricalcolare su ogni render
  const selSet  = useMemo(() => new Set(sel), [sel]);
  const recCount = useMemo(
    () => sel.filter(id => { const f = files.find(f => f.id === id); return f && f.source !== 'USN Journal' && f.size > 0; }).length,
    [sel, files]
  );
  const allVisibleSel = visible.length > 0 && visible.every(f => selSet.has(f.id));

  const toggleSort    = useCallback(k => setSort(s => s.k === k ? { k, dir:-s.dir } : { k, dir:1 }), []);
  const toggleSrc     = useCallback(s => setSrcFilt(f => f.includes(s) ? f.filter(x=>x!==s) : [...f, s]), []);
  const toggleTyp     = useCallback(t => setTypFilt(f => f.includes(t) ? f.filter(x=>x!==t) : [...f, t]), []);
  const toggleAll     = useCallback(() => setSel(allVisibleSel ? [] : visible.map(f => f.id)), [allVisibleSel, visible]);
  const toggleRow     = useCallback(id => setSel(s => s.includes(id) ? s.filter(x=>x!==id) : [...s, id]), []);
  const clearFilters  = useCallback(() => { setSrcFilt([]); setTypFilt([]); }, []);

  const SortArrow = ({ k }) => (
    <span style={{ opacity:sort.k===k?.8:.2, fontSize:9, marginLeft:3 }}>
      {sort.k===k ? (sort.dir>0?'↑':'↓') : '↕'}
    </span>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', animation:'fadeIn .3s ease' }}>

      {/* Toolbar */}
      <div style={{ flexShrink:0, padding:'9px 14px', borderBottom:'1px solid var(--b0)', display:'flex', alignItems:'center', gap:10, background:'rgba(1,10,4,.8)', backdropFilter:'blur(8px)' }}>
        {/* Ricerca */}
        <div style={{ flex:1, display:'flex', alignItems:'center', gap:7, padding:'5px 10px', background:'rgba(0,255,65,.03)', border:'1px solid var(--b0)', borderRadius:5 }}>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="var(--t2)" strokeWidth="1.3" strokeLinecap="round">
            <circle cx="4.5" cy="4.5" r="3.5"/><line x1="7.5" y1="7.5" x2="10" y2="10"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per nome o percorso…"
            style={{ flex:1, background:'transparent', border:'none', color:'var(--t0)', fontSize:11, fontFamily:'var(--ui)' }}/>
          {search && <button onClick={() => setSearch('')} style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)', padding:'0 2px' }}>✕</button>}
        </div>

        {/* Destinazione */}
        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          <span style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--t2)', letterSpacing:'.08em' }}>DEST:</span>
          {[{v:'original',l:'ORIGINALE'},{v:'choose',l:'SCEGLI…'}].map(o => (
            <button key={o.v} onClick={() => setDest(o.v)}
              style={{ padding:'4px 9px', borderRadius:3, fontFamily:'var(--mono)', fontSize:8, letterSpacing:'.08em', border:`1px solid ${dest===o.v?'var(--b2)':'var(--b0)'}`, background:dest===o.v?'rgba(0,255,65,.07)':'transparent', color:dest===o.v?'var(--p0)':'var(--t2)', cursor:'pointer', transition:'all .12s' }}>
              {o.l}
            </button>
          ))}
        </div>

        <div style={{ width:1, height:16, background:'var(--b0)', flexShrink:0 }}/>

        {/* Contatore */}
        <span style={{ fontFamily:'var(--mono)', fontSize:8.5, color:'var(--t1)', flexShrink:0 }}>
          <span style={{ color:'var(--p0)' }}>{visible.length}</span> / {files.length}
        </span>

        {/* Recupera */}
        <button onClick={sel.length > 0 ? onRecover : undefined}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 16px', background:sel.length>0?'var(--p0)':'rgba(6,42,17,.9)', color:sel.length>0?'#000':'var(--t2)', borderRadius:5, fontFamily:'var(--display)', fontWeight:700, fontSize:11, letterSpacing:'.1em', cursor:sel.length>0?'pointer':'not-allowed', boxShadow:sel.length>0?'0 0 18px var(--p-glow)':'none', transition:'all .14s', flexShrink:0 }}>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M5.5 1v6.5M2.5 5l3 3 3-3M1 10h9"/>
          </svg>
          {sel.length > 0 ? `RECUPERA ${recCount > 0 ? recCount : sel.length}` : 'SELEZIONA'}
        </button>

        <button onClick={onReset}
          style={{ padding:'7px 10px', border:'1px solid var(--b0)', borderRadius:5, fontFamily:'var(--mono)', fontSize:7.5, color:'var(--t2)', background:'transparent', cursor:'pointer', letterSpacing:'.08em', flexShrink:0 }}>
          RESET
        </button>

        <button onClick={() => setShowExport(true)}
          style={{ padding:'7px 10px', border:'1px solid var(--a0)', borderRadius:5, fontFamily:'var(--mono)', fontSize:7.5, color:'var(--a0)', background:'rgba(255,204,0,.04)', cursor:'pointer', letterSpacing:'.08em', flexShrink:0 }}>
          EXPORT
        </button>
      </div>

      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        {/* Sidebar filtri */}
        <div style={{ width:158, flexShrink:0, borderRight:'1px solid var(--b0)', overflowY:'auto', padding:'10px 0', background:'rgba(1,10,4,.5)' }}>
          <div style={{ padding:'0 12px 5px', fontFamily:'var(--mono)', fontSize:7, color:'var(--t2)', letterSpacing:'.18em' }}>SORGENTE</div>
          {allSrc.map(s => {
            const cnt = files.filter(f => f.source === s).length;
            const on  = srcFilt.includes(s);
            const col = SRC_COL[s] || 'var(--t2)';
            return (
              <button key={s} onClick={() => toggleSrc(s)}
                style={{ width:'100%', padding:'5px 12px', display:'flex', alignItems:'center', gap:7, background:on?'rgba(0,255,65,.05)':'transparent', border:'none', cursor:'pointer', textAlign:'left', transition:'background .1s' }}>
                <div style={{ width:5, height:5, borderRadius:'50%', flexShrink:0, background:on?col:'var(--t3)', boxShadow:on?`0 0 5px ${col}`:'none' }}/>
                <span style={{ fontSize:10, color:on?'var(--t0)':'var(--t1)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s}</span>
                <span style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--t2)' }}>{cnt}</span>
              </button>
            );
          })}

          <div style={{ height:1, background:'var(--b0)', margin:'8px 0' }}/>
          <div style={{ padding:'0 12px 5px', fontFamily:'var(--mono)', fontSize:7, color:'var(--t2)', letterSpacing:'.18em' }}>TIPO</div>
          {allTypes.map(t => {
            const cnt = files.filter(f => f.type === t).length;
            const on  = typFilt.includes(t);
            return (
              <button key={t} onClick={() => toggleTyp(t)}
                style={{ width:'100%', padding:'5px 12px', display:'flex', alignItems:'center', gap:7, background:on?'rgba(0,255,65,.05)':'transparent', border:'none', cursor:'pointer', textAlign:'left', transition:'background .1s' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={on?'var(--p0)':'var(--t2)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={TYPE_ICONS[t] || TYPE_ICONS.other}/>
                </svg>
                <span style={{ fontSize:10, color:on?'var(--t0)':'var(--t1)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textTransform:'capitalize' }}>{t}</span>
                <span style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--t2)' }}>{cnt}</span>
              </button>
            );
          })}

          {(srcFilt.length > 0 || typFilt.length > 0) && (
            <button onClick={clearFilters}
              style={{ width:'100%', marginTop:8, padding:'5px 12px', fontFamily:'var(--mono)', fontSize:7.5, color:'var(--r0)', background:'transparent', border:'none', cursor:'pointer', letterSpacing:'.1em', textAlign:'left' }}>
              ✕ RESET FILTRI
            </button>
          )}
        </div>

        {/* Tabella */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Header tabella */}
          <div style={{ display:'grid', gridTemplateColumns:'32px 1fr 92px 80px 75px 72px', padding:'0 10px', height:30, alignItems:'center', borderBottom:'1px solid var(--b1)', background:'rgba(1,13,5,.9)', flexShrink:0 }}>
            <input type="checkbox" checked={allVisibleSel} onChange={toggleAll}
              style={{ accentColor:'var(--p0)', cursor:'pointer', width:13, height:13 }}/>
            {COLS.map(({ l, k }) => (
              <button key={k} onClick={() => toggleSort(k)}
                style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--t2)', letterSpacing:'.1em', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', padding:0 }}>
                {l}<SortArrow k={k}/>
              </button>
            ))}
          </div>

          {/* Righe - rendering progressivo durante scan */}
          <div style={{ flex:1, overflowY:'auto' }}>
            {visible.length === 0 && (
              <div style={{ padding:'28px 18px', fontFamily:'var(--mono)', fontSize:9, color:'var(--t2)', letterSpacing:'.12em', textAlign:'center' }}>
                Nessun file corrisponde ai filtri
              </div>
            )}
            {visible.map(f => {
              const isSel  = selSet.has(f.id);
              const isJour = f.source === 'USN Journal';
              const srcCol = SRC_COL[f.source] || 'var(--t2)';
              return (
                <div key={f.id}
                  onClick={() => toggleRow(f.id)}
                  style={{ display:'grid', gridTemplateColumns:'32px 1fr 92px 80px 75px 72px', padding:'0 10px', height:31, alignItems:'center', borderBottom:'1px solid rgba(0,255,65,.03)', background:isSel?'rgba(0,255,65,.04)':'transparent', cursor:'pointer', transition:'background .08s', animation:'rowSlide .12s ease', opacity:isJour?.5:1 }}>
                  <input type="checkbox" checked={isSel} readOnly
                    style={{ accentColor:'var(--p0)', cursor:'pointer', pointerEvents:'none', width:13, height:13 }}/>
                  <div style={{ display:'flex', alignItems:'center', gap:7, overflow:'hidden' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={isJour?'var(--r0)':'var(--t2)'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
                      <path d={TYPE_ICONS[f.type] || TYPE_ICONS.other}/>
                    </svg>
                    <span style={{ fontSize:11, color:isJour?'var(--t2)':'var(--t0)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:5, height:5, borderRadius:'50%', background:srcCol, flexShrink:0 }}/>
                    <span style={{ fontFamily:'var(--mono)', fontSize:7.5, color:srcCol, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.source}</span>
                  </div>
                  <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)', textTransform:'capitalize' }}>{f.type}</span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t1)' }}>{fmtSize(f.size)}</span>
                  <ConfBar v={f.confidence || 0}/>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Export Panel */}
      {showExport && (
        <ExportPanel
          files={visible.length > 0 ? visible : files}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
