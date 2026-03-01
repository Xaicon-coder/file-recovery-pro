import React, { useState, useMemo } from 'react';

const fmt  = b => !b ? '—' : b >= 1e9 ? (b/1e9).toFixed(1)+' GB' : b >= 1e6 ? (b/1e6).toFixed(1)+' MB' : b >= 1e3 ? (b/1e3).toFixed(0)+' KB' : b+' B';
const fmtD = d => { if (!d) return '—'; const t = new Date(d); return `${String(t.getDate()).padStart(2,'0')}/${String(t.getMonth()+1).padStart(2,'0')}/${t.getFullYear()}`; };

const TYPE_ICON = { image:'🖼', video:'🎬', audio:'🎵', document:'📄', spreadsheet:'📊', presentation:'📑', archive:'📦', code:'💻', text:'📝', design:'🎨', email:'📧', database:'🗄', executable:'⚙', other:'📎' };

// Colori per sorgente — allineati con Scanning.jsx e recovery engine
const SRC = {
  'Cestino':     { color:'var(--green)', bg:'rgba(34,197,94,.1)',   badge:'INTEGRO',   tip:'File intatto nel Cestino — recupero garantito 100%' },
  'Shadow Copy': { color:'#4ade80',      bg:'rgba(74,222,128,.1)',  badge:'SNAPSHOT',  tip:'Versione precedente da Volume Shadow Copy — recupero 95%' },
  'Temp':        { color:'var(--amber)', bg:'rgba(232,160,32,.1)',  badge:'SU DISCO',  tip:'File presente nelle cartelle utente/temp' },
  'Filesystem':  { color:'var(--cyan)',  bg:'rgba(0,200,224,.1)',   badge:'TROVATO',   tip:'File trovato durante scansione filesystem' },
  'USN Journal': { color:'#c084fc',      bg:'rgba(192,132,252,.1)', badge:'SOLO REF.', tip:'Traccia nel journal NTFS — file non più presente su disco. Non recuperabile direttamente.' },
};
const srcStyle = s => SRC[s] || { color:'var(--t2)', bg:'transparent', badge:s, tip:'' };

export default function Results({ files, sel, setSel, dest, setDest, onRecover, onReset }) {
  const [q,     setQ]    = useState('');
  const [fType, setFT]   = useState('all');
  const [fSrc,  setFS]   = useState('all');
  const [sort,  setSort] = useState({ by:'deletedAt', dir:'desc' });
  const [hover, setHov]  = useState(null);
  const [usnWarn, setUsnWarn] = useState(false);

  const typeCnt = useMemo(() => files.reduce((a,f) => ({ ...a, [f.type]:(a[f.type]||0)+1 }), {}), [files]);
  const srcCnt  = useMemo(() => files.reduce((a,f) => ({ ...a, [f.source]:(a[f.source]||0)+1 }), {}), [files]);
  const types   = useMemo(() => [...new Set(files.map(f => f.type))].sort(), [files]);
  const sources = useMemo(() => [...new Set(files.map(f => f.source))], [files]);

  const list = useMemo(() => {
    let l = [...files];
    const ql = q.toLowerCase().trim();
    if (ql)          l = l.filter(f => f.name.toLowerCase().includes(ql) || (f.originalPath||'').toLowerCase().includes(ql));
    if (fType !== 'all') l = l.filter(f => f.type   === fType);
    if (fSrc  !== 'all') l = l.filter(f => f.source === fSrc);
    l.sort((a, b) => {
      const dateA = a.deletedAt || a.modified, dateB = b.deletedAt || b.modified;
      const v = sort.by === 'name'       ? a.name.localeCompare(b.name)
              : sort.by === 'size'       ? (a.size||0) - (b.size||0)
              : sort.by === 'confidence' ? (a.confidence||0) - (b.confidence||0)
              : (dateA ? new Date(dateA) : 0) - (dateB ? new Date(dateB) : 0);
      return sort.dir === 'asc' ? v : -v;
    });
    return l;
  }, [files, q, fType, fSrc, sort]);

  const toggle = id => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const selAll = () => setSel(list.filter(f => f.source !== 'USN Journal').map(f => f.id));
  const clrAll = () => setSel([]);
  const doSort = by => setSort(s => s.by === by ? {...s, dir:s.dir==='asc'?'desc':'asc'} : {by,dir:'desc'});

  const selFiles = files.filter(f => sel.includes(f.id));
  const selSize  = selFiles.reduce((a,f) => a+(f.size||0), 0);
  const selHasUSN = selFiles.some(f => f.source === 'USN Journal');

  const intact = files.filter(f => f.intact).length;
  const usn    = files.filter(f => f.source === 'USN Journal').length;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* Top bar — sommario risultati */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 16px', borderBottom:'1px solid var(--border)', flexShrink:0, background:'var(--bg1)', flexWrap:'wrap', gap:6 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
          <Tag c="var(--amber)">{files.length} file trovati</Tag>
          <Tag c="var(--green)">{intact} integri (Cestino)</Tag>
          {Object.entries(srcCnt).map(([s,n]) => {
            const st = srcStyle(s);
            return <Tag key={s} c={st.color}>{s}: {n}</Tag>;
          })}
          {usn > 0 && (
            <span title="I file USN Journal sono tracce nel log NTFS — non recuperabili direttamente" style={{ fontFamily:'var(--mono)', fontSize:9, color:'#c084fc', cursor:'help', textDecoration:'underline dotted' }}>
              ⚠ {usn} solo ref. journal
            </span>
          )}
        </div>
        <button style={{ fontFamily:'var(--mono)', fontSize:9, padding:'4px 10px', border:'1px solid var(--border)', borderRadius:4, color:'var(--t2)' }} onClick={onReset}>
          + Nuova scansione
        </button>
      </div>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* Sidebar filtri */}
        <div style={{ width:152, flexShrink:0, borderRight:'1px solid var(--border)', background:'var(--bg1)', overflowY:'auto', padding:'8px 5px' }}>
          <FilterSection label="TIPO">
            <FItem active={fType==='all'} onClick={() => setFT('all')}>Tutti <FCount>{files.length}</FCount></FItem>
            {types.map(t => (
              <FItem key={t} active={fType===t} onClick={() => setFT(t)}>
                {TYPE_ICON[t]||'📎'} {t.charAt(0).toUpperCase()+t.slice(1)} <FCount>{typeCnt[t]}</FCount>
              </FItem>
            ))}
          </FilterSection>
          <div style={{ height:1, background:'var(--border)', margin:'5px 4px 6px' }}/>
          <FilterSection label="SORGENTE">
            <FItem active={fSrc==='all'} onClick={() => setFS('all')}>Tutte <FCount>{files.length}</FCount></FItem>
            {sources.map(s => {
              const st = srcStyle(s);
              return (
                <FItem key={s} active={fSrc===s} dot={st.color} onClick={() => setFS(s)}>
                  {s} <FCount>{srcCnt[s]}</FCount>
                </FItem>
              );
            })}
          </FilterSection>
          {usn > 0 && (
            <div style={{ margin:'8px 4px 0', padding:'8px', background:'rgba(192,132,252,.07)', border:'1px solid rgba(192,132,252,.2)', borderRadius:5 }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'#c084fc', fontWeight:600, marginBottom:4 }}>USN JOURNAL</div>
              <p style={{ fontSize:9, color:'var(--t2)', lineHeight:1.5 }}>
                Tracce nel log NTFS. Il file non è più su disco — non recuperabile direttamente senza tool specializzati.
              </p>
            </div>
          )}
        </div>

        {/* Tabella */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Toolbar */}
          <div style={{ display:'flex', gap:6, padding:'6px 12px', borderBottom:'1px solid var(--border)', flexShrink:0, background:'var(--bg1)', alignItems:'center' }}>
            <div style={{ flex:1, position:'relative', display:'flex', alignItems:'center' }}>
              <span style={{ position:'absolute', left:8, fontSize:11, pointerEvents:'none', opacity:.4 }}>🔍</span>
              <input
                style={{ width:'100%', padding:'5px 10px 5px 26px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:5, color:'var(--t0)', fontSize:11 }}
                placeholder="Cerca nome o percorso originale..."
                value={q} onChange={e => setQ(e.target.value)}
              />
              {q && <button style={{ position:'absolute', right:7, color:'var(--t2)', fontSize:10 }} onClick={() => setQ('')}>✕</button>}
            </div>
            <select
              style={{ padding:'5px 8px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:5, color:'var(--t1)', fontSize:10, fontFamily:'var(--mono)' }}
              value={`${sort.by}:${sort.dir}`}
              onChange={e => { const [by,dir]=e.target.value.split(':'); setSort({by,dir}); }}
            >
              <option value="deletedAt:desc">Eliminati recenti</option>
              <option value="confidence:desc">Integrità ↓</option>
              <option value="size:desc">Dimensione ↓</option>
              <option value="name:asc">Nome A–Z</option>
            </select>
            <button
              style={{ padding:'5px 10px', border:'1px solid var(--border)', borderRadius:5, fontSize:10, fontFamily:'var(--mono)', color:'var(--t1)', whiteSpace:'nowrap' }}
              onClick={sel.length === list.filter(f=>f.source!=='USN Journal').length ? clrAll : selAll}
              title="Seleziona solo file recuperabili (esclude USN Journal)"
            >
              {sel.length > 0 ? 'Deseleziona' : `Seleziona recuperabili`}
            </button>
          </div>

          {/* Header colonne */}
          <div style={{ display:'grid', gridTemplateColumns:'22px 1fr 1fr 76px 88px 80px 60px', alignItems:'center', padding:'4px 12px', background:'var(--bg2)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
            {[['',''],['NOME & TIPO','name'],['PERCORSO ORIGINALE',''],['DIM','size'],['DATA ELIM.','deletedAt'],['SORGENTE',''],['INTEG.','confidence']].map(([l,by],i) => (
              <div key={i} onClick={by ? () => doSort(by) : undefined}
                style={{ fontFamily:'var(--mono)', fontSize:7, letterSpacing:'.08em', color:'var(--t2)', cursor:by?'pointer':'default', userSelect:'none' }}>
                {l}{by && sort.by===by && (sort.dir==='asc'?' ↑':' ↓')}
              </div>
            ))}
          </div>

          {/* Righe */}
          <div style={{ flex:1, overflowY:'auto' }}>
            {list.length === 0 && (
              <div style={{ padding:'60px 20px', textAlign:'center', color:'var(--t2)', fontFamily:'var(--mono)', fontSize:11 }}>
                Nessun file corrisponde ai filtri
              </div>
            )}
            {list.map(f => {
              const isUSN  = f.source === 'USN Journal';
              const s      = sel.includes(f.id);
              const h      = hover === f.id;
              const ss     = srcStyle(f.source);
              const confC  = f.confidence===100?'var(--green)':f.confidence>=80?'var(--amber)':'var(--red)';

              return (
                <div key={f.id}
                  onClick={() => !isUSN && toggle(f.id)}
                  onMouseEnter={() => setHov(f.id)}
                  onMouseLeave={() => setHov(null)}
                  title={isUSN ? 'File USN Journal: solo riferimento nel log NTFS, non recuperabile' : undefined}
                  style={{
                    display:'grid', gridTemplateColumns:'22px 1fr 1fr 76px 88px 80px 60px',
                    alignItems:'center', padding:'4px 12px',
                    borderBottom:'1px solid rgba(255,255,255,.022)',
                    cursor: isUSN ? 'not-allowed' : 'pointer',
                    background: s ? 'rgba(232,160,32,.05)' : h && !isUSN ? 'rgba(255,255,255,.02)' : 'transparent',
                    borderLeft:`2px solid ${s ? 'var(--amber)' : 'transparent'}`,
                    opacity: isUSN ? .55 : 1,
                    transition:'background .08s',
                  }}
                >
                  {/* Checkbox */}
                  <div style={{ width:13, height:13, border:`1px solid ${s?'var(--amber)':isUSN?'var(--t2)':'var(--border)'}`, borderRadius:2, background:s?'var(--amber)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:7, color:'#000', fontWeight:700, flexShrink:0 }}>
                    {s && '✓'}{isUSN && !s && <span style={{color:'var(--t2)',fontSize:8}}>⊘</span>}
                  </div>

                  {/* Nome + tipo */}
                  <div style={{ display:'flex', alignItems:'center', gap:7, overflow:'hidden', paddingRight:8 }}>
                    <span style={{ fontSize:14, flexShrink:0 }}>{TYPE_ICON[f.type]||'📎'}</span>
                    <div style={{ overflow:'hidden' }}>
                      <div style={{ fontSize:11, fontWeight:500, color:isUSN?'var(--t2)':'var(--t0)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</div>
                      <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)' }}>{f.ext?.toUpperCase().slice(1)||'?'} · {fmt(f.size)}</div>
                    </div>
                  </div>

                  {/* Percorso originale — info chiave */}
                  <div style={{ overflow:'hidden', paddingRight:8 }} title={f.originalPath}>
                    <div style={{ fontFamily:'var(--mono)', fontSize:9, color: f.intact?'var(--green)':isUSN?'#c084fc':'var(--t2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {isUSN ? '⚠ Posizione non disponibile' : (f.originalPath || '—')}
                    </div>
                    {f.originalDir && !isUSN && (
                      <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.originalDir}</div>
                    )}
                  </div>

                  {/* Dimensione */}
                  <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--t1)', textAlign:'right' }}>{fmt(f.size)}</div>

                  {/* Data eliminazione */}
                  <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t2)', textAlign:'center' }}>
                    {fmtD(f.deletedAt || f.modified)}
                  </div>

                  {/* Badge sorgente */}
                  <div style={{ textAlign:'center' }}>
                    <span title={ss.tip} style={{ fontFamily:'var(--mono)', fontSize:7, color:ss.color, background:ss.bg, borderRadius:3, padding:'2px 5px', cursor:'help' }}>
                      {ss.badge}
                    </span>
                  </div>

                  {/* Integrità */}
                  <div style={{ textAlign:'center' }}>
                    <span style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:700, color:confC }}>{f.confidence}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      {selHasUSN && (
        <div style={{ background:'rgba(192,132,252,.08)', borderTop:'1px solid rgba(192,132,252,.25)', padding:'6px 16px', flexShrink:0 }}>
          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'#c084fc' }}>
            ⚠ {selFiles.filter(f=>f.source==='USN Journal').length} file selezionati sono solo riferimenti journal e verranno saltati durante il recupero
          </span>
        </div>
      )}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 16px', borderTop:'1px solid var(--border)', background:'var(--bg1)', flexShrink:0 }}>
        <div style={{ flex:1 }}>
          {sel.length > 0
            ? <span style={{ fontSize:13, color:'var(--t1)' }}>
                <b style={{ color:'var(--amber)', fontSize:16 }}>{sel.length}</b> selezionati
                {selSize > 0 && <span style={{ color:'var(--t2)', fontSize:11 }}> · {fmt(selSize)}</span>}
              </span>
            : <span style={{ fontSize:11, color:'var(--t2)', fontStyle:'italic' }}>Clicca sulle righe per selezionare · {list.length} file visibili</span>
          }
        </div>

        {/* Destinazione recupero */}
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)' }}>RECUPERA IN:</span>
          {[['original','Posizione originale'], ['choose','Scegli cartella…']].map(([v,l]) => (
            <button key={v}
              style={{ fontSize:10, padding:'4px 9px', border:`1px solid ${dest===v?'var(--amber)':'var(--border)'}`, background:dest===v?'var(--amber-bg)':'transparent', color:dest===v?'var(--amber)':'var(--t2)', borderRadius:4, fontFamily:'var(--mono)', transition:'all .1s' }}
              onClick={() => setDest(v)}
            >{l}</button>
          ))}
        </div>

        <button
          disabled={!sel.length}
          onClick={onRecover}
          style={{ padding:'9px 22px', background:sel.length?'var(--amber)':'var(--bg3)', color:sel.length?'#000':'var(--t2)', borderRadius:6, fontWeight:700, fontSize:12, cursor:sel.length?'pointer':'not-allowed', boxShadow:sel.length?'0 2px 16px rgba(232,160,32,.2)':'none', transition:'all .15s', whiteSpace:'nowrap' }}
        >
          ↑ Recupera {sel.length > 0 ? `${sel.length} file` : ''}
        </button>
      </div>
    </div>
  );
}

function Tag({ c, children }) {
  return <span style={{ fontFamily:'var(--mono)', fontSize:9, color:c, background:c+'18', border:`1px solid ${c}35`, padding:'2px 7px', borderRadius:3 }}>{children}</span>;
}
function FilterSection({ label, children }) {
  return (
    <div style={{ marginBottom:4 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:7, letterSpacing:'.14em', color:'var(--t2)', padding:'0 6px 5px', textTransform:'uppercase' }}>{label}</div>
      {children}
    </div>
  );
}
function FItem({ active, onClick, dot, children }) {
  return (
    <button style={{ display:'flex', alignItems:'center', gap:5, width:'100%', padding:'4px 7px', background:active?'rgba(255,255,255,.06)':'transparent', color:active?'var(--t0)':'var(--t2)', borderRadius:4, fontSize:10, textAlign:'left' }} onClick={onClick}>
      {dot && <span style={{ width:5,height:5,borderRadius:'50%',background:dot,flexShrink:0,display:'inline-block' }}/>}
      <span style={{ flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{children}</span>
    </button>
  );
}
function FCount({ children }) {
  return <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)', marginLeft:'auto', flexShrink:0 }}>{children}</span>;
}
