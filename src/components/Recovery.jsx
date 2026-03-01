import React, { useRef, useEffect } from 'react';

const fmt = b => !b ? '—' : b >= 1e9 ? (b/1e9).toFixed(1)+' GB' : b >= 1e6 ? (b/1e6).toFixed(1)+' MB' : b >= 1e3 ? (b/1e3).toFixed(0)+' KB' : b+' B';

const SRC_C = {
  'Cestino':'var(--green)', 'Shadow Copy':'#4ade80',
  'Temp':'var(--amber)', 'Filesystem':'var(--cyan)', 'USN Journal':'#c084fc',
};

export default function Recovery({ rec, files, onOpen, onReset, api }) {
  const done     = rec.status === 'done';
  const pct      = rec.total ? Math.round((rec.ok + rec.fail) / rec.total * 100) : done ? 100 : 0;
  const totalSize = files.reduce((a,f) => a+(f.size||0), 0);
  const listRef  = useRef(null);

  // Auto-scroll log mentre arrivano i tick
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [rec.log.length]);

  const okCount   = rec.ok;
  const failCount = rec.fail;
  const usnCount  = files.filter(f => f.source === 'USN Journal').length;

  // Determina destinazione da mostrare nel pulsante "Apri"
  const destIsOriginal = rec.dest === '__original__';
  // Per recupero in posizione originale, mostriamo il path del primo file recuperato
  const firstOkEntry = rec.log.find(e => e.ok);
  const firstOkPath  = firstOkEntry?.info;

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', overflow:'auto', padding:'28px 20px' }}>
      <div style={{ width:'100%', maxWidth:660, display:'flex', flexDirection:'column', gap:16, animation:'fadeUp .3s ease' }}>

        {/* Header stato */}
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{
            width:58, height:58, borderRadius:'50%', flexShrink:0,
            background: done ? (failCount===files.length?'var(--red-bg)':'var(--green-bg)') : 'var(--amber-bg)',
            border:`1.5px solid ${done?(failCount===files.length?'var(--red)':'var(--green)'):'var(--amber)'}`,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            {done
              ? <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 11l5 5L19 6" stroke={failCount===files.length?'var(--red)':'var(--green)'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              : <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ animation:'spin 1.4s linear infinite' }}><circle cx="11" cy="11" r="8.5" stroke="var(--amber)" strokeWidth="2" strokeDasharray="38 13" strokeLinecap="round"/></svg>
            }
          </div>
          <div>
            <div style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:'.18em', color:'var(--amber)', marginBottom:3, textTransform:'uppercase' }}>
              {done ? (failCount===files.length?'RECUPERO FALLITO':'RECUPERO COMPLETATO') : 'RECUPERO IN CORSO'}
            </div>
            <h2 style={{ fontSize:19, fontWeight:700, color:'var(--t0)', lineHeight:1.2 }}>
              {done
                ? `${okCount} ${okCount===1?'file recuperato':'file recuperati'}${failCount>0?` · ${failCount} errori`:''}`
                : `${rec.ok+rec.fail} / ${rec.total} in corso…`
              }
            </h2>
            {done && destIsOriginal && okCount > 0 && (
              <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--green)', marginTop:3 }}>
                → Ripristinati nelle posizioni originali
              </div>
            )}
            {done && !destIsOriginal && rec.dest && okCount > 0 && (
              <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--cyan)', marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:440 }}>
                → {rec.dest}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar (solo durante recupero) */}
        {!done && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'var(--mono)', fontSize:9, color:'var(--t2)', marginBottom:5 }}>
              <span>{rec.ok} ok · {rec.fail} errori · {rec.total - rec.ok - rec.fail} in attesa</span>
              <span style={{ color:'var(--amber)', fontWeight:700 }}>{pct}%</span>
            </div>
            <div style={{ height:5, background:'var(--bg3)', borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,var(--amber),var(--cyan))', borderRadius:3, transition:'width .2s', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent)', animation:'shim 1.2s linear infinite' }}/>
              </div>
            </div>
          </div>
        )}

        {/* Stats box (solo completato) */}
        {done && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:7 }}>
            {[
              { icon:'✓', label:'Recuperati',   val:okCount,   c:'var(--green)' },
              { icon:'✗', label:'Errori',        val:failCount, c:failCount?'var(--red)':'var(--t2)' },
              { icon:'≈', label:'Dimensione',    val:fmt(totalSize), c:'var(--cyan)' },
              { icon:'⊟', label:'Solo journal',  val:usnCount,  c:'#c084fc' },
            ].map(({ icon, label, val, c }) => (
              <div key={label} style={{ background:'var(--bg2)', border:`1px solid ${c}22`, borderRadius:7, padding:'10px 11px' }}>
                <span style={{ fontSize:14, color:c, display:'block', marginBottom:4 }}>{icon}</span>
                <span style={{ fontFamily:'var(--mono)', fontSize:val.toString().length>5?12:16, fontWeight:700, color:c, display:'block', marginBottom:3, lineHeight:1 }}>{val}</span>
                <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t2)', textTransform:'uppercase', letterSpacing:'.09em' }}>{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Log file per file */}
        <div style={{ background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 14px', borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'.1em', color:'var(--t2)', textTransform:'uppercase' }}>Dettaglio file</span>
            <span style={{ fontFamily:'var(--mono)', fontSize:9, color: done?(okCount>0?'var(--green)':'var(--red)'):'var(--amber)' }}>
              {done ? (okCount>0?'✓ Completato':'✗ Tutti falliti') : `${pct}% completato`}
            </span>
          </div>
          <div ref={listRef} style={{ maxHeight:280, overflowY:'auto' }}>
            {files.map(f => {
              const entry  = rec.log.find(x => x.id === f.id);
              const status = !entry ? 'wait' : entry.ok ? 'ok' : 'err';
              const isUSN  = f.source === 'USN Journal';
              const srcC   = SRC_C[f.source] || 'var(--t2)';

              return (
                <div key={f.id} style={{
                  display:'flex', alignItems:'flex-start', gap:9, padding:'6px 14px',
                  borderBottom:'1px solid rgba(255,255,255,.02)',
                  background: status==='ok'?'rgba(34,197,94,.03)':status==='err'?'rgba(239,68,68,.03)':'transparent',
                }}>
                  {/* Icona stato */}
                  <div style={{ width:16, height:16, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', marginTop:1 }}>
                    {status === 'wait' && (
                      isUSN
                        ? <span style={{ color:'#c084fc', fontSize:12 }}>⊘</span>
                        : <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--t2)' }}/>
                    )}
                    {status === 'ok'  && <span style={{ color:'var(--green)', fontSize:13 }}>✓</span>}
                    {status === 'err' && <span style={{ color:'var(--red)',   fontSize:13 }}>✗</span>}
                  </div>

                  <div style={{ flex:1, overflow:'hidden' }}>
                    {/* Nome file con badge sorgente */}
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontSize:11, fontWeight:500, color:status==='wait'?'var(--t2)':'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
                        {f.name}
                      </span>
                      <span style={{ fontFamily:'var(--mono)', fontSize:7, color:srcC, background:srcC+'18', padding:'1px 5px', borderRadius:2, flexShrink:0 }}>{f.source}</span>
                    </div>

                    {/* Path destinazione (dopo ok) o errore */}
                    {status === 'ok' && (
                      <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--green)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1 }}>
                        ↳ {entry.info}
                      </div>
                    )}
                    {status === 'err' && (
                      <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--red)', lineHeight:1.4, marginTop:1 }}>
                        {entry.info}
                      </div>
                    )}
                    {status === 'wait' && f.originalPath && !isUSN && (
                      <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1 }}>
                        da: {f.originalPath}
                      </div>
                    )}
                    {isUSN && status === 'wait' && (
                      <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'#c084fc', marginTop:1 }}>Solo riferimento journal — verrà saltato</div>
                    )}
                  </div>

                  <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t2)', flexShrink:0, alignSelf:'flex-start', marginTop:1 }}>
                    {fmt(f.size)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Azioni post-completamento */}
        {done && (
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {/* Apri cartella — per recupero in cartella scelta */}
            {!destIsOriginal && rec.dest && okCount > 0 && (
              <button
                style={{ padding:'9px 18px', background:'var(--amber)', color:'#000', borderRadius:6, fontWeight:700, fontSize:12 }}
                onClick={onOpen}
              >
                📂 Apri cartella destinazione
              </button>
            )}
            {/* Mostra nel Explorer — per recupero in posizione originale */}
            {destIsOriginal && firstOkPath && okCount > 0 && (
              <button
                style={{ padding:'9px 18px', background:'var(--green-bg)', color:'var(--green)', border:'1px solid rgba(34,197,94,.3)', borderRadius:6, fontWeight:700, fontSize:12 }}
                onClick={() => api?.recover?.open(firstOkPath)}
              >
                📂 Mostra nel Explorer
              </button>
            )}
            <button
              style={{ padding:'9px 18px', border:'1px solid var(--border)', borderRadius:6, fontSize:12, color:'var(--t1)' }}
              onClick={onReset}
            >
              + Nuova scansione
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes shim   { from{transform:translateX(-100%)} to{transform:translateX(300%)} }
      `}</style>
    </div>
  );
}
