import React, { useState, useMemo } from 'react';

const fmt  = b => !b ? '—' : b >= 1e9 ? (b/1e9).toFixed(1)+' GB' : b >= 1e6 ? (b/1e6).toFixed(1)+' MB' : b >= 1e3 ? (b/1e3).toFixed(0)+' KB' : b+' B';
const fmtD = d => { if (!d) return '—'; const t = new Date(d); return `${String(t.getDate()).padStart(2,'0')}/${String(t.getMonth()+1).padStart(2,'0')}/${t.getFullYear()}`; };

// SVG icons per tipo file
const TypeIcon = ({ type, size=12 }) => {
  const icons = {
    image:        <><rect x="1" y="1" width="14" height="14" rx="2"/><circle cx="5.5" cy="5.5" r="1.5"/><path d="M1 10l4-4 3 3 2.5-2.5L15 10"/></>,
    video:        <><rect x="1" y="2.5" width="10" height="11" rx="2"/><path d="M11 6.5l4-2v7l-4-2"/></>,
    audio:        <><path d="M2 5.5v5M5.5 3v10M9 4.5v7M12.5 2.5v11"/></>,
    document:     <><path d="M9 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V6z"/><path d="M9 1v5h5M4 8h8M4 11h5"/></>,
    spreadsheet:  <><rect x="1" y="1" width="14" height="14" rx="2"/><line x1="1" y1="6" x2="15" y2="6"/><line x1="1" y1="10" x2="15" y2="10"/><line x1="6" y1="1" x2="6" y2="15"/></>,
    presentation: <><rect x="1" y="2" width="14" height="9" rx="2"/><line x1="8" y1="11" x2="8" y2="14.5"/><line x1="5" y1="14.5" x2="11" y2="14.5"/></>,
    archive:      <><rect x="1" y="1" width="14" height="4" rx="1.5"/><path d="M2 5v9a1 1 0 001 1h10a1 1 0 001-1V5"/><line x1="6" y1="8.5" x2="10" y2="8.5"/></>,
    code:         <><path d="M4.5 3L1 8l3.5 5M11.5 3L15 8l-3.5 5M9 1.5L7 14.5"/></>,
    text:         <><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="9" y2="12"/></>,
    design:       <><circle cx="8" cy="8" r="7"/><circle cx="8" cy="8" r="2.5"/><line x1="8" y1="1" x2="8" y2="3.5"/><line x1="8" y1="12.5" x2="8" y2="15"/></>,
    email:        <><rect x="1" y="3" width="14" height="10" rx="2"/><path d="M1 5l7 5 7-5"/></>,
    database:     <><ellipse cx="8" cy="5" rx="6" ry="2.5"/><path d="M2 5v6c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V5"/><path d="M2 8c0 1.4 2.7 2.5 6 2.5S14 9.4 14 8"/></>,
    other:        <><circle cx="8" cy="8" r="7"/><path d="M8 5v4M8 12v.5"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      {icons[type] || icons.other}
    </svg>
  );
};

const SRC = {
  'Cestino':     { color:'#0fd98a', bg:'rgba(15,217,138,.08)',   badge:'INTEGRO',   tip:'File intatto nel Cestino — 100% recuperabile' },
  'Shadow Copy': { color:'#4ade80', bg:'rgba(74,222,128,.08)',   badge:'SNAPSHOT',  tip:'Da Volume Shadow Copy — recupero 95%' },
  'Temp':        { color:'#f0a500', bg:'rgba(240,165,0,.08)',    badge:'SU DISCO',  tip:'File presente in cartelle utente/temp' },
  'Filesystem':  { color:'#00cce8', bg:'rgba(0,204,232,.08)',    badge:'TROVATO',   tip:'Trovato in scansione filesystem' },
  'USN Journal': { color:'#a78bfa', bg:'rgba(167,139,250,.08)',  badge:'SOLO REF.', tip:'Traccia nel journal NTFS — non presente su disco' },
};
const ss = s => SRC[s] || { color:'var(--t2)', bg:'transparent', badge:s, tip:'' };

export default function Results({ files, sel, setSel, dest, setDest, onRecover, onReset }) {
  const [q,     setQ]    = useState('');
  const [fType, setFT]   = useState('all');
  const [fSrc,  setFS]   = useState('all');
  const [sort,  setSort] = useState({ by:'deletedAt', dir:'desc' });
  const [hover, setHov]  = useState(null);

  const typeCnt = useMemo(() => files.reduce((a,f) => ({...a,[f.type]:(a[f.type]||0)+1}), {}), [files]);
  const srcCnt  = useMemo(() => files.reduce((a,f) => ({...a,[f.source]:(a[f.source]||0)+1}), {}), [files]);
  const types   = useMemo(() => [...new Set(files.map(f => f.type))].sort(), [files]);
  const sources = useMemo(() => [...new Set(files.map(f => f.source))], [files]);

  const list = useMemo(() => {
    let l = [...files];
    const ql = q.toLowerCase().trim();
    if (ql) l = l.filter(f => f.name.toLowerCase().includes(ql) || (f.originalPath||'').toLowerCase().includes(ql));
    if (fType !== 'all') l = l.filter(f => f.type   === fType);
    if (fSrc  !== 'all') l = l.filter(f => f.source === fSrc);
    l.sort((a,b) => {
      const dA = a.deletedAt||a.modified, dB = b.deletedAt||b.modified;
      const v = sort.by==='name' ? a.name.localeCompare(b.name) : sort.by==='size' ? (a.size||0)-(b.size||0) : sort.by==='confidence' ? (a.confidence||0)-(b.confidence||0) : (dA?new Date(dA):0)-(dB?new Date(dB):0);
      return sort.dir==='asc' ? v : -v;
    });
    return l;
  }, [files, q, fType, fSrc, sort]);

  const toggle  = id => setSel(s => s.includes(id) ? s.filter(x=>x!==id) : [...s, id]);
  const selAll  = () => setSel(list.filter(f => f.source !== 'USN Journal').map(f => f.id));
  const clrAll  = () => setSel([]);
  const doSort  = by => setSort(s => s.by===by ? {...s,dir:s.dir==='asc'?'desc':'asc'} : {by,dir:'desc'});

  const selFiles  = files.filter(f => sel.includes(f.id));
  const selSize   = selFiles.reduce((a,f)=>a+(f.size||0),0);
  const selHasUSN = selFiles.some(f => f.source === 'USN Journal');
  const intact    = files.filter(f => f.intact).length;
  const usn       = files.filter(f => f.source === 'USN Journal').length;
  const allSel    = list.filter(f=>f.source!=='USN Journal').every(f=>sel.includes(f.id));

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* Top stats bar */}
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 16px', borderBottom:'1px solid var(--border)', flexShrink:0, background:'rgba(0,0,0,.18)', flexWrap:'wrap' }}>
        <StatBadge color="#f0a500">{files.length} trovati</StatBadge>
        <StatBadge color="#0fd98a">{intact} integri</StatBadge>
        {Object.entries(srcCnt).map(([s,n]) => <StatBadge key={s} color={ss(s).color}>{s}: {n}</StatBadge>)}
        {usn > 0 && (
          <span title="File solo nel journal NTFS — non recuperabili direttamente" style={{ fontFamily:'var(--mono)', fontSize:8, color:'#a78bfa', cursor:'help', display:'flex', alignItems:'center', gap:4 }}>
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="#a78bfa" strokeWidth="1.2"><path d="M4.5 1L8 8H1z"/><line x1="4.5" y1="4" x2="4.5" y2="6"/></svg>
            {usn} solo riferimento
          </span>
        )}
        <button style={{ marginLeft:'auto', fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)', border:'1px solid var(--border)', padding:'3px 9px', borderRadius:4, transition:'all .12s' }} onClick={onReset}>
          Nuova scansione
        </button>
      </div>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        {/* Sidebar filtri */}
        <div style={{ width:148, flexShrink:0, borderRight:'1px solid var(--border)', background:'var(--bg1)', overflowY:'auto', padding:'8px 6px' }}>
          <FSection label="Tipo">
            <FBtn active={fType==='all'} onClick={()=>setFT('all')} icon={<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="1" y="1" width="6" height="6" rx="1.2"/><rect x="9" y="1" width="6" height="6" rx="1.2"/><rect x="1" y="9" width="6" height="6" rx="1.2"/><rect x="9" y="9" width="6" height="6" rx="1.2"/></svg>}>
              Tutti <Cnt>{files.length}</Cnt>
            </FBtn>
            {types.map(t => <FBtn key={t} active={fType===t} onClick={()=>setFT(t)} icon={<TypeIcon type={t} size={10}/>}>{t.charAt(0).toUpperCase()+t.slice(1)} <Cnt>{typeCnt[t]}</Cnt></FBtn>)}
          </FSection>
          <div style={{ height:1, background:'var(--border)', margin:'5px 2px 6px' }}/>
          <FSection label="Sorgente">
            <FBtn active={fSrc==='all'} onClick={()=>setFS('all')} dot={null}>Tutte <Cnt>{files.length}</Cnt></FBtn>
            {sources.map(s => <FBtn key={s} active={fSrc===s} onClick={()=>setFS(s)} dot={ss(s).color}>{s} <Cnt>{srcCnt[s]}</Cnt></FBtn>)}
          </FSection>
          {usn > 0 && (
            <div style={{ margin:'6px 2px 0', padding:'8px 7px', background:'rgba(167,139,250,.05)', border:'1px solid rgba(167,139,250,.18)', borderRadius:6 }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'#a78bfa', fontWeight:600, marginBottom:4 }}>USN JOURNAL</div>
              <p style={{ fontSize:8.5, color:'var(--t2)', lineHeight:1.55 }}>Solo tracce nel log NTFS. File non presente su disco — non recuperabile direttamente.</p>
            </div>
          )}
        </div>

        {/* Tabella principale */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Toolbar */}
          <div style={{ display:'flex', gap:6, padding:'6px 12px', borderBottom:'1px solid var(--border)', flexShrink:0, background:'rgba(0,0,0,.1)', alignItems:'center' }}>
            <div style={{ flex:1, position:'relative', display:'flex', alignItems:'center' }}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="var(--t2)" strokeWidth="1.3" style={{ position:'absolute', left:8, pointerEvents:'none' }}><circle cx="6" cy="6" r="4.5"/><line x1="9.5" y1="9.5" x2="13" y2="13"/></svg>
              <input
                style={{ width:'100%', padding:'5px 10px 5px 26px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:6, color:'var(--t0)', fontSize:11 }}
                placeholder="Cerca nome o percorso originale…"
                value={q} onChange={e=>setQ(e.target.value)}
              />
              {q && <button style={{ position:'absolute', right:7, color:'var(--t2)', fontSize:11, lineHeight:1 }} onClick={()=>setQ('')}>✕</button>}
            </div>
            <select
              style={{ padding:'5px 8px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:6, color:'var(--t1)', fontSize:10, fontFamily:'var(--mono)' }}
              value={`${sort.by}:${sort.dir}`}
              onChange={e=>{const[by,dir]=e.target.value.split(':');setSort({by,dir});}}
            >
              <option value="deletedAt:desc">Eliminati recenti</option>
              <option value="confidence:desc">Integrità alta</option>
              <option value="size:desc">Dimensione grande</option>
              <option value="name:asc">Nome A→Z</option>
            </select>
            <button
              onClick={allSel ? clrAll : selAll}
              style={{ padding:'5px 10px', border:'1px solid var(--border)', borderRadius:5, fontSize:9, fontFamily:'var(--mono)', color:'var(--t1)', whiteSpace:'nowrap', transition:'all .1s' }}
            >
              {allSel ? 'Deseleziona' : 'Seleziona recuperabili'}
            </button>
          </div>

          {/* Header colonne */}
          <div style={{ display:'grid', gridTemplateColumns:'20px 18px 1fr 1fr 74px 86px 78px 58px', alignItems:'center', padding:'4px 12px', background:'var(--bg2)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
            {[['',''],['',''],['NOME','name'],['PERCORSO ORIGINALE',''],['DIM.','size'],['ELIMINATO','deletedAt'],['SORGENTE',''],['%','confidence']].map(([l,by],i) => (
              <div key={i} onClick={by?()=>doSort(by):undefined} style={{ fontFamily:'var(--mono)', fontSize:7, letterSpacing:'.07em', color:'var(--t2)', cursor:by?'pointer':'default', userSelect:'none', display:'flex', alignItems:'center', gap:2 }}>
                {l}{by&&sort.by===by&&<span style={{ opacity:.6 }}>{sort.dir==='asc'?'↑':'↓'}</span>}
              </div>
            ))}
          </div>

          {/* Righe */}
          <div style={{ flex:1, overflowY:'auto' }}>
            {list.length === 0 && (
              <div style={{ padding:'50px 20px', textAlign:'center', color:'var(--t2)', fontFamily:'var(--mono)', fontSize:10 }}>Nessun file corrisponde ai filtri</div>
            )}
            {list.map(f => {
              const isUSN = f.source === 'USN Journal';
              const isSel = sel.includes(f.id);
              const isHov = hover === f.id;
              const sInfo = ss(f.source);
              const confC = f.confidence===100?'#0fd98a':f.confidence>=80?'#f0a500':'#a78bfa';
              return (
                <div key={f.id}
                  onClick={() => !isUSN && toggle(f.id)}
                  onMouseEnter={() => setHov(f.id)}
                  onMouseLeave={() => setHov(null)}
                  title={isUSN ? 'Solo riferimento journal — non recuperabile direttamente' : undefined}
                  style={{ display:'grid', gridTemplateColumns:'20px 18px 1fr 1fr 74px 86px 78px 58px', alignItems:'center', padding:'4px 12px', borderBottom:'1px solid rgba(255,255,255,.018)', cursor:isUSN?'not-allowed':'pointer', background:isSel?'rgba(240,165,0,.04)':isHov&&!isUSN?'rgba(255,255,255,.015)':'transparent', borderLeft:`2px solid ${isSel?'var(--amber)':'transparent'}`, opacity:isUSN?.55:1, transition:'background .08s' }}
                >
                  {/* Checkbox */}
                  <div style={{ width:12, height:12, border:`1px solid ${isSel?'var(--amber)':isUSN?'var(--t3)':'var(--border)'}`, borderRadius:3, background:isSel?'var(--amber)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .1s' }}>
                    {isSel && <svg width="7" height="7" viewBox="0 0 7 7" fill="none"><path d=".8 3.5l1.8 1.8L6.2.8" stroke="#000" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    {isUSN && !isSel && <svg width="7" height="7" viewBox="0 0 7 7" fill="none"><line x1="1" y1="1" x2="6" y2="6" stroke="var(--t2)" strokeWidth="1.2"/><line x1="6" y1="1" x2="1" y2="6" stroke="var(--t2)" strokeWidth="1.2"/></svg>}
                  </div>

                  {/* Type icon */}
                  <div style={{ color: isSel?'var(--amber)':isUSN?'var(--t3)':'var(--t2)', transition:'color .1s' }}>
                    <TypeIcon type={f.type} size={12}/>
                  </div>

                  {/* Nome */}
                  <div style={{ overflow:'hidden', paddingRight:8 }}>
                    <div style={{ fontSize:11, fontWeight:450, color:isUSN?'var(--t2)':'var(--t0)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t2)', marginTop:1 }}>{f.ext?.toUpperCase().slice(1)||'?'}</div>
                  </div>

                  {/* Percorso originale */}
                  <div style={{ overflow:'hidden', paddingRight:8 }} title={f.originalPath}>
                    {isUSN
                      ? <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'#a78bfa', display:'flex', alignItems:'center', gap:4 }}><svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="#a78bfa" strokeWidth="1.2"><path d="M4 1L7 7H1z"/></svg>Non disponibile</span>
                      : <>
                          <div style={{ fontFamily:'var(--mono)', fontSize:8, color:f.intact?'#0fd98a88':'var(--t2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.originalPath||'—'}</div>
                          {f.originalDir && <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1 }}>{f.originalDir}</div>}
                        </>
                    }
                  </div>

                  <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t1)', textAlign:'right' }}>{fmt(f.size)}</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)', textAlign:'center' }}>{fmtD(f.deletedAt||f.modified)}</div>

                  {/* Badge sorgente */}
                  <div style={{ textAlign:'center' }}>
                    <span title={sInfo.tip} style={{ fontFamily:'var(--mono)', fontSize:6.5, color:sInfo.color, background:sInfo.bg, padding:'2px 5px', borderRadius:3, cursor:'help', letterSpacing:'.05em' }}>{sInfo.badge}</span>
                  </div>

                  <div style={{ textAlign:'center' }}>
                    <span style={{ fontFamily:'var(--mono)', fontSize:10, fontWeight:600, color:confC }}>{f.confidence}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Warning USN */}
      {selHasUSN && (
        <div style={{ background:'rgba(167,139,250,.06)', borderTop:'1px solid rgba(167,139,250,.2)', padding:'5px 16px', flexShrink:0 }}>
          <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'#a78bfa', display:'flex', alignItems:'center', gap:6 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#a78bfa" strokeWidth="1.2"><path d="M5 1L9.5 9H.5z"/><line x1="5" y1="4.5" x2="5" y2="6.5"/></svg>
            {selFiles.filter(f=>f.source==='USN Journal').length} file selezionati sono solo riferimenti journal e verranno saltati
          </span>
        </div>
      )}

      {/* Bottom action bar */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 16px', borderTop:'1px solid var(--border)', background:'rgba(7,9,13,.95)', backdropFilter:'blur(12px)', flexShrink:0 }}>
        <div style={{ flex:1, fontSize:12 }}>
          {sel.length > 0
            ? <><span style={{ color:'var(--amber)', fontWeight:700, fontSize:15 }}>{sel.length}</span><span style={{ color:'var(--t1)' }}> selezionati{selSize>0?` · ${fmt(selSize)}`:''}</span></>
            : <span style={{ fontSize:10, color:'var(--t2)', fontStyle:'italic' }}>{list.length} file visibili — clicca per selezionare</span>
          }
        </div>

        {/* Destinazione */}
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t2)', letterSpacing:'.1em', textTransform:'uppercase' }}>Recupera in:</span>
          {[['original','Posizione originale'],['choose','Scegli cartella']].map(([v,l]) => (
            <button key={v} onClick={()=>setDest(v)}
              style={{ fontSize:9, padding:'4px 10px', border:`1px solid ${dest===v?'var(--amber)':'var(--border)'}`, background:dest===v?'rgba(240,165,0,.08)':'transparent', color:dest===v?'var(--amber)':'var(--t2)', borderRadius:5, fontFamily:'var(--mono)', transition:'all .12s' }}
            >{l}</button>
          ))}
        </div>

        <button
          disabled={!sel.length}
          onClick={onRecover}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 20px', background:sel.length?'var(--amber)':'var(--bg3)', color:sel.length?'#000':'var(--t2)', borderRadius:7, fontWeight:700, fontSize:12, cursor:sel.length?'pointer':'not-allowed', boxShadow:sel.length?'0 0 18px var(--amber-glow)':'none', transition:'all .14s', whiteSpace:'nowrap' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M6 9V2M3 5l3-3 3 3M1 10.5h10"/>
          </svg>
          Recupera{sel.length>0?` ${sel.length} file`:''}
        </button>
      </div>
    </div>
  );
}

function StatBadge({ color, children }) {
  return <span style={{ fontFamily:'var(--mono)', fontSize:8, color, background:color+'14', border:`1px solid ${color}30`, padding:'2px 7px', borderRadius:3 }}>{children}</span>;
}
function FSection({ label, children }) {
  return <div style={{ marginBottom:4 }}><div style={{ fontFamily:'var(--mono)', fontSize:7, letterSpacing:'.14em', color:'var(--t2)', padding:'0 5px 5px', textTransform:'uppercase' }}>{label}</div>{children}</div>;
}
function FBtn({ active, onClick, dot, icon, children }) {
  return (
    <button onClick={onClick} style={{ display:'flex', alignItems:'center', gap:5, width:'100%', padding:'4px 6px', background:active?'rgba(255,255,255,.05)':'transparent', color:active?'var(--t0)':'var(--t2)', borderRadius:4, fontSize:9.5, textAlign:'left', transition:'all .1s' }}>
      {dot !== undefined && dot !== null && <span style={{ width:5, height:5, borderRadius:'50%', background:dot, flexShrink:0, display:'inline-block' }}/>}
      {icon && <span style={{ color:active?'var(--amber)':'var(--t2)', flexShrink:0, display:'flex' }}>{icon}</span>}
      <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{children}</span>
    </button>
  );
}
function Cnt({ children }) {
  return <span style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--t2)', marginLeft:'auto', flexShrink:0 }}>{children}</span>;
}
