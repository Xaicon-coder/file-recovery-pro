import React, { useRef, useEffect } from 'react';

const fmt = b => !b ? '—' : b >= 1e9 ? (b/1e9).toFixed(1)+' GB' : b >= 1e6 ? (b/1e6).toFixed(1)+' MB' : b >= 1e3 ? (b/1e3).toFixed(0)+' KB' : b+' B';

const SRC_C = { 'Cestino':'#0fd98a','Shadow Copy':'#4ade80','Temp':'#f0a500','Filesystem':'#00cce8','USN Journal':'#a78bfa' };

// Icona check, X, clock SVG
const IconOk = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <circle cx="5.5" cy="5.5" r="5" fill="rgba(15,217,138,.15)" stroke="#0fd98a" strokeWidth="1"/>
    <path d="M2.5 5.5l2 2L8.5 3" stroke="#0fd98a" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconErr = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <circle cx="5.5" cy="5.5" r="5" fill="rgba(240,80,80,.12)" stroke="#f05050" strokeWidth="1"/>
    <path d="M3.5 3.5l4 4M7.5 3.5l-4 4" stroke="#f05050" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);
const IconWait = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <circle cx="5.5" cy="5.5" r="5" stroke="var(--border2)" strokeWidth="1"/>
    <circle cx="5.5" cy="5.5" r="2" fill="var(--t3)"/>
  </svg>
);
const IconSkip = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <circle cx="5.5" cy="5.5" r="5" fill="rgba(167,139,250,.1)" stroke="#a78bfa" strokeWidth="1"/>
    <path d="M3.5 5.5h4M6 3.5l2 2-2 2" stroke="#a78bfa" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function Recovery({ rec, files, onOpen, onReset, api }) {
  const done     = rec.status === 'done';
  const pct      = rec.total ? Math.round((rec.ok + rec.fail) / rec.total * 100) : done ? 100 : 0;
  const totalSize = files.reduce((a,f) => a+(f.size||0), 0);
  const listRef  = useRef(null);
  const canvasRef = useRef(null);
  const animRef  = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [rec.log.length]);

  // Canvas particelle di successo quando completato
  useEffect(() => {
    if (!done || !canvasRef.current || rec.ok === 0) return;
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    c.width = c.offsetWidth * devicePixelRatio;
    c.height = c.offsetHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    const W = c.offsetWidth, H = c.offsetHeight;

    const particles = Array.from({ length: 60 }, () => ({
      x: W / 2, y: H / 2,
      vx: (Math.random() - .5) * 5, vy: (Math.random() - .8) * 5,
      r: Math.random() * 3 + 1,
      color: ['#0fd98a','#f0a500','#00cce8','#a78bfa'][Math.floor(Math.random()*4)],
      life: 1, decay: Math.random() * .02 + .01,
    }));

    let frame;
    const draw = () => {
      ctx.clearRect(0,0,W,H);
      let alive = false;
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.vy += .06; p.life -= p.decay;
        if (p.life <= 0) return;
        alive = true;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = p.color + Math.round(p.life * 255).toString(16).padStart(2,'0');
        ctx.fill();
      });
      if (alive) frame = requestAnimationFrame(draw);
    };
    setTimeout(() => { draw(); }, 200);
    return () => cancelAnimationFrame(frame);
  }, [done, rec.ok]);

  const destIsOriginal = rec.dest === '__original__';
  const firstOkPath    = rec.log.find(e => e.ok)?.info;
  const usnCount       = files.filter(f => f.source === 'USN Journal').length;

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', overflow:'auto', padding:'24px 20px', position:'relative' }}>
      {/* Celebration canvas */}
      <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}/>

      {/* Sfondo griglia */}
      <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.012) 1px,transparent 1px)', backgroundSize:'28px 28px', pointerEvents:'none' }}/>

      <div style={{ width:'100%', maxWidth:640, display:'flex', flexDirection:'column', gap:14, animation:'fadeIn .35s ease', position:'relative', zIndex:1 }}>

        {/* ── Header stato ── */}
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:54, height:54, borderRadius:'50%', flexShrink:0, position:'relative', display:'flex', alignItems:'center', justifyContent:'center', background: done?(rec.ok>0?'rgba(15,217,138,.08)':'rgba(240,80,80,.08)'):'rgba(240,165,0,.08)', border:`1.5px solid ${done?(rec.ok>0?'rgba(15,217,138,.3)':'rgba(240,80,80,.3)'):'rgba(240,165,0,.25)'}`, boxShadow: done&&rec.ok>0?'0 0 20px rgba(15,217,138,.15)':'none', transition:'all .4s' }}>
            {done ? (
              rec.ok > 0
                ? <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 11l5.5 5.5L19 6" stroke="#0fd98a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                : <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><line x1="6" y1="6" x2="16" y2="16" stroke="#f05050" strokeWidth="2.2" strokeLinecap="round"/><line x1="16" y1="6" x2="6" y2="16" stroke="#f05050" strokeWidth="2.2" strokeLinecap="round"/></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ animation:'spin 1.4s linear infinite' }}>
                <circle cx="11" cy="11" r="9" stroke="var(--amber)" strokeWidth="2" strokeDasharray="36 16" strokeLinecap="round"/>
              </svg>
            )}
            {!done && <div style={{ position:'absolute', inset:-4, borderRadius:'50%', border:'1px solid rgba(240,165,0,.15)', animation:'spin 3s linear infinite reverse' }}/>}
          </div>

          <div>
            <div style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:'.18em', color: done?(rec.ok>0?'#0fd98a':'var(--red)'):'var(--amber)', textTransform:'uppercase', marginBottom:3 }}>
              {done?(rec.ok>0?'Recupero completato':'Recupero fallito'):'Recupero in corso'}
            </div>
            <h2 style={{ fontSize:18, fontWeight:700, color:'var(--t0)', lineHeight:1.25 }}>
              {done
                ? `${rec.ok} ${rec.ok===1?'file recuperato':'file recuperati'}${rec.fail>0?` · ${rec.fail} errori`:''}`
                : `${rec.ok+rec.fail} / ${rec.total} in corso…`
              }
            </h2>
            {done && destIsOriginal && rec.ok>0 && (
              <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'#0fd98a88', marginTop:3 }}>Ripristinati nelle posizioni originali</div>
            )}
            {done && !destIsOriginal && rec.dest && rec.ok>0 && (
              <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'#00cce888', marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:400 }}>→ {rec.dest}</div>
            )}
          </div>
        </div>

        {/* ── Progress bar ── */}
        {!done && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)', marginBottom:5 }}>
              <span>{rec.ok} ok · {rec.fail} errori · {rec.total-rec.ok-rec.fail} in attesa</span>
              <span style={{ color:'var(--amber)', fontWeight:600 }}>{pct}%</span>
            </div>
            <div style={{ height:4, background:'var(--bg4)', borderRadius:2, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,var(--amber),var(--cyan))', borderRadius:2, transition:'width .25s', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent)', animation:'shimmer 1.2s linear infinite' }}/>
              </div>
            </div>
          </div>
        )}

        {/* ── Stats (dopo completamento) ── */}
        {done && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
            {[
              { label:'Recuperati',  val:rec.ok,     color:'#0fd98a', icon:<svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#0fd98a" strokeWidth="1.4" strokeLinecap="round"><path d="M1 6.5l3.5 3.5L12 2"/></svg> },
              { label:'Errori',      val:rec.fail,   color:rec.fail?'#f05050':'var(--t2)', icon:<svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke={rec.fail?'#f05050':'var(--t2)'} strokeWidth="1.4" strokeLinecap="round"><line x1="2" y1="2" x2="11" y2="11"/><line x1="11" y1="2" x2="2" y2="11"/></svg> },
              { label:'Dimensione',  val:fmt(totalSize), color:'#00cce8', icon:<svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#00cce8" strokeWidth="1.4" strokeLinecap="round"><rect x="2" y="2" width="9" height="9" rx="1.5"/><line x1="2" y1="6.5" x2="11" y2="6.5"/></svg> },
              { label:'Solo journal',val:usnCount,   color:'#a78bfa', icon:<svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#a78bfa" strokeWidth="1.4" strokeLinecap="round"><path d="M6.5 1L12 12H1z"/><line x1="6.5" y1="5" x2="6.5" y2="8"/></svg> },
            ].map(s => (
              <div key={s.label} style={{ background:'var(--bg2)', border:`1px solid ${s.color}18`, borderRadius:8, padding:'10px 12px' }}>
                <div style={{ color:s.color, marginBottom:5 }}>{s.icon}</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:String(s.val).length>5?13:17, fontWeight:700, color:s.color, lineHeight:1, marginBottom:3 }}>{s.val}</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t2)', textTransform:'uppercase', letterSpacing:'.09em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Log file ── */}
        <div style={{ background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:9, overflow:'hidden' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 14px', borderBottom:'1px solid var(--border)', background:'rgba(0,0,0,.2)' }}>
            <span style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:'.12em', color:'var(--t2)', textTransform:'uppercase' }}>Log operazioni</span>
            <span style={{ fontFamily:'var(--mono)', fontSize:8, color:done?(rec.ok>0?'#0fd98a':'var(--red)'):'var(--amber)' }}>
              {done?(rec.ok>0?`✓ Completato`:'✗ Fallito'):`${pct}% completato`}
            </span>
          </div>
          <div ref={listRef} style={{ maxHeight:300, overflowY:'auto' }}>
            {files.map(f => {
              const entry  = rec.log.find(x => x.id === f.id);
              const status = !entry?'wait':entry.ok?'ok':'err';
              const isUSN  = f.source === 'USN Journal';
              if (isUSN && status === 'wait') return null; // mostrano dopo come saltati
              const srcC   = SRC_C[f.source]||'var(--t2)';
              return (
                <div key={f.id} style={{ display:'flex', alignItems:'flex-start', gap:9, padding:'6px 14px', borderBottom:'1px solid rgba(255,255,255,.02)', background:status==='ok'?'rgba(15,217,138,.02)':status==='err'?'rgba(240,80,80,.025)':'transparent' }}>
                  <div style={{ flexShrink:0, marginTop:1 }}>
                    {status==='wait' && <IconWait/>}
                    {status==='ok'   && <IconOk/>}
                    {status==='err'  && (isUSN?<IconSkip/>:<IconErr/>)}
                  </div>
                  <div style={{ flex:1, overflow:'hidden' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontSize:11, fontWeight:450, color:status==='wait'?'var(--t2)':'var(--t0)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{f.name}</span>
                      <span style={{ fontFamily:'var(--mono)', fontSize:6.5, color:srcC, background:srcC+'14', padding:'1px 5px', borderRadius:2, flexShrink:0 }}>{f.source}</span>
                    </div>
                    {status==='ok' && (
                      <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'#0fd98a88', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1 }}>
                        → {entry.info}
                      </div>
                    )}
                    {status==='err' && (
                      <div style={{ fontFamily:'var(--mono)', fontSize:8, color: isUSN?'#a78bfa88':'rgba(240,80,80,.7)', lineHeight:1.45, marginTop:1 }}>
                        {entry.info}
                      </div>
                    )}
                    {status==='wait' && !isUSN && f.originalPath && (
                      <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1 }}>{f.originalPath}</div>
                    )}
                  </div>
                  <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)', flexShrink:0, alignSelf:'flex-start', marginTop:1 }}>{fmt(f.size)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Azioni ── */}
        {done && (
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {!destIsOriginal && rec.dest && rec.ok>0 && (
              <button onClick={onOpen} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 18px', background:'var(--amber)', color:'#000', borderRadius:7, fontWeight:700, fontSize:12, boxShadow:'0 0 16px var(--amber-glow)' }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M1.5 8.5V11a1 1 0 001 1h8a1 1 0 001-1V8.5"/><path d="M4 5L6.5 2.5 9 5"/><line x1="6.5" y1="2.5" x2="6.5" y2="9"/></svg>
                Apri cartella destinazione
              </button>
            )}
            {destIsOriginal && firstOkPath && rec.ok>0 && (
              <button onClick={()=>api?.recover?.open(firstOkPath)} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 18px', background:'rgba(15,217,138,.1)', color:'#0fd98a', border:'1px solid rgba(15,217,138,.25)', borderRadius:7, fontWeight:600, fontSize:12 }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1" y="2" width="11" height="9" rx="1.5"/><path d="M1 5h11"/><path d="M4 2V1M9 2V1"/></svg>
                Mostra nel Explorer
              </button>
            )}
            <button onClick={onReset} style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px', border:'1px solid var(--border)', borderRadius:7, fontSize:12, color:'var(--t1)', transition:'all .12s' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M1 6a5 5 0 105-5H2.5"/><path d="M1 3v3h3"/></svg>
              Nuova scansione
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn  {from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)}}
        @keyframes spin    {to{transform:rotate(360deg)}}
        @keyframes shimmer {from{transform:translateX(-100%)} to{transform:translateX(300%)}}
      `}</style>
    </div>
  );
}
