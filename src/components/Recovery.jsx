import React, { useEffect, useRef } from 'react';

const fmtSize = b => !b?'0 B':b>=1e9?(b/1e9).toFixed(1)+' GB':b>=1e6?(b/1e6).toFixed(0)+' MB':b>=1e3?(b/1e3).toFixed(0)+' KB':b+' B';

// Particle explosion on success
function Celebration({ active }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!active) return;
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d');
    const dpr = devicePixelRatio || 1;
    c.width = c.offsetWidth * dpr; c.height = c.offsetHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = c.offsetWidth, H = c.offsetHeight;
    const COLS = ['#00ff41','#00cc34','#00ffee','#ffcc00','#ffffff'];
    const pts = Array.from({length:80}, () => ({
      x: W*.5 + (Math.random()-.5)*80, y: H*.4 + (Math.random()-.5)*80,
      vx: (Math.random()-.5)*5, vy: -Math.random()*6-2,
      r: Math.random()*3+1, col: COLS[Math.floor(Math.random()*COLS.length)],
      life: 1, decay: .012+Math.random()*.018,
    }));
    let raf;
    const draw = () => {
      ctx.fillStyle='rgba(0,8,2,.08)'; ctx.fillRect(0,0,W,H);
      let alive = false;
      pts.forEach(p => {
        if (p.life <= 0) return; alive=true;
        p.x+=p.vx; p.y+=p.vy; p.vy+=.12; p.life-=p.decay;
        ctx.globalAlpha=Math.max(0,p.life);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle=p.col; ctx.fill();
      });
      ctx.globalAlpha=1;
      if (alive) raf=requestAnimationFrame(draw);
      else { ctx.clearRect(0,0,W,H); }
    };
    draw(); return () => cancelAnimationFrame(raf);
  }, [active]);
  return <canvas ref={ref} style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0}}/>;
}

// Mini radar in corner
function RadarMini() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d');
    const dpr = devicePixelRatio || 1;
    c.width=80*dpr; c.height=80*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
    let angle=0, raf;
    const draw = () => {
      ctx.clearRect(0,0,80,80);
      for(let i=1;i<=3;i++){ctx.beginPath();ctx.arc(40,40,i*12,0,Math.PI*2);ctx.strokeStyle=`rgba(0,255,65,${.06+i*.04})`;ctx.lineWidth=.6;ctx.stroke();}
      for(let i=0;i<60;i++){const a=angle-(i/60)*1.6;ctx.beginPath();ctx.moveTo(40,40);ctx.arc(40,40,36,a,a+.03);ctx.closePath();ctx.fillStyle=`rgba(0,255,65,${(1-i/60)*.15})`;ctx.fill();}
      ctx.beginPath();ctx.moveTo(40,40);ctx.lineTo(40+Math.cos(angle)*36,40+Math.sin(angle)*36);ctx.strokeStyle='rgba(0,255,65,.7)';ctx.lineWidth=1;ctx.stroke();
      ctx.beginPath();ctx.arc(40,40,2,0,Math.PI*2);ctx.fillStyle='#00ff41';ctx.fill();
      angle+=.025; raf=requestAnimationFrame(draw);
    };
    draw(); return ()=>cancelAnimationFrame(raf);
  },[]);
  return <canvas ref={ref} width={80} height={80} style={{position:'absolute',bottom:10,right:10,width:80,height:80,opacity:.3,pointerEvents:'none'}}/>;
}

export default function Recovery({ rec, files, onOpen, onReset }) {
  const { status, ok, fail, total, log } = rec;
  const done    = status === 'done';
  const pct     = total > 0 ? Math.round(log.length / total * 100) : 0;
  const success = done && fail === 0;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', position:'relative', animation:'fadeIn .3s ease' }}>
      <Celebration active={success}/>

      {/* Header panel */}
      <div style={{ flexShrink:0, padding:'20px 22px 14px', borderBottom:'1px solid var(--b0)', position:'relative', zIndex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
          <div style={{ position:'relative' }}>
            <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform:'rotate(-90deg)' }}>
              <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(0,255,65,.07)" strokeWidth="4"/>
              <circle cx="22" cy="22" r="18" fill="none" stroke={done?(success?'var(--p0)':'var(--r0)'):'var(--p0)'} strokeWidth="4"
                strokeLinecap="round" strokeDasharray={`${2*Math.PI*18*(pct/100)} ${2*Math.PI*18}`}
                style={{ transition:'stroke-dasharray .4s', filter:`drop-shadow(0 0 4px var(--p0))` }}/>
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--display)', fontSize:12, fontWeight:700, color:'var(--t0)' }}>
              {pct}%
            </div>
          </div>
          <div>
            <div style={{ fontFamily:'var(--mono)', fontSize:7.5, letterSpacing:'.2em', color:done?'var(--p0)':'var(--a0)', marginBottom:4 }}>
              {done ? '// COMPLETATO' : '// RIPRISTINO IN CORSO'}
            </div>
            <h2 style={{ fontFamily:'var(--display)', fontSize:18, fontWeight:700, color:'var(--t0)', lineHeight:1.2 }}>
              {done
                ? success
                  ? `${ok} file recuperati con successo`
                  : `${ok} recuperati · ${fail} errori`
                : `Recupero ${log.length} / ${total}…`
              }
            </h2>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height:3, background:'var(--b0)', borderRadius:2, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${pct}%`, background:done?(success?'var(--p0)':'var(--r0)'):'linear-gradient(90deg,var(--p2),var(--p0))', borderRadius:2, transition:'width .3s', position:'relative', overflow:'hidden' }}>
            {!done && <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent)', animation:'shimmer 1s linear infinite' }}/>}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:12 }}>
          {[
            {l:'TOTALE',      v:total,       col:'var(--t0)' },
            {l:'OK',          v:ok,          col:'var(--p0)' },
            {l:'ERRORI',      v:fail,        col:fail>0?'var(--r0)':'var(--t2)' },
            {l:'IN ATTESA',   v:Math.max(0,total-log.length), col:'var(--a0)' },
          ].map(({l,v,col}) => (
            <div key={l} style={{ padding:'7px 10px', background:'rgba(0,0,0,.18)', border:'1px solid var(--b0)', borderRadius:6 }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t2)', letterSpacing:'.12em', marginBottom:3 }}>{l}</div>
              <div style={{ fontFamily:'var(--display)', fontSize:16, fontWeight:700, color:col }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Log - max 100 righe per evitare freeze */}
      <div style={{ flex:1, overflowY:'auto', position:'relative', zIndex:1 }}>
        {log.length > 100 && (
          <div style={{ 
            padding:'8px 16px', 
            background:'rgba(255,204,0,.08)', 
            borderBottom:'1px solid rgba(255,204,0,.2)',
            display:'flex',
            alignItems:'center',
            gap:8
          }}>
            <span style={{ fontSize:11 }}>⚠️</span>
            <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--a0)', letterSpacing:'.06em' }}>
              Mostrando ultimi 100 di {log.length} file (per performance)
            </span>
          </div>
        )}
        
        {log.slice(-100).map(entry => {
          const f = files.find(f => f.id === entry.id);
          const name = f?.name || entry.id;
          return (
            <div key={entry.id}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'5px 16px', borderBottom:'1px solid rgba(0,255,65,.025)', animation:'rowSlide .15s ease' }}>
              {entry.ok
                ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 6l3 3 6-6" stroke="var(--p0)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{filter:'drop-shadow(0 0 3px var(--p0))'}}/></svg>
                : entry.skip
                  ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="var(--a0)" strokeWidth="1.2"/><line x1="4" y1="6" x2="8" y2="6" stroke="var(--a0)" strokeWidth="1.2" strokeLinecap="round"/></svg>
                  : <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1L11 10H1z" stroke="var(--r0)" strokeWidth="1.3" strokeLinejoin="round"/><line x1="6" y1="5" x2="6" y2="7.5" stroke="var(--r0)" strokeWidth="1.3" strokeLinecap="round"/></svg>
              }
              <span style={{ fontSize:11, color:entry.ok?'var(--t0)':'var(--t2)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
              {entry.ok && <span style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--t2)', flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:220 }}>{entry.info}</span>}
              {!entry.ok && <span style={{ fontFamily:'var(--mono)', fontSize:7.5, color:entry.skip?'var(--a0)':'var(--r0)', flexShrink:0 }}>{entry.info}</span>}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      {done && (
        <div style={{ flexShrink:0, padding:'12px 18px', borderTop:'1px solid var(--b0)', display:'flex', gap:10, background:'rgba(0,5,2,.95)', backdropFilter:'blur(12px)', position:'relative', zIndex:1 }}>
          {success && (
            <button onClick={onOpen}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 20px', background:'var(--p0)', color:'#000', borderRadius:5, fontFamily:'var(--display)', fontWeight:700, fontSize:12, letterSpacing:'.1em', cursor:'pointer', boxShadow:'0 0 18px var(--p-glow)', border:'none' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 2h4v4H2zM6 6h4v4H6z"/></svg>
              APRI CARTELLA
            </button>
          )}
          <button onClick={onReset}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', background:'transparent', border:'1px solid var(--b1)', borderRadius:5, fontFamily:'var(--display)', fontWeight:600, fontSize:11, letterSpacing:'.1em', color:'var(--t1)', cursor:'pointer', transition:'all .12s' }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 5.5A4.5 4.5 0 115.5 10"/><path d="M1 2.5v3h3"/></svg>
            NUOVA SCANSIONE
          </button>
        </div>
      )}

      {!done && <RadarMini/>}
    </div>
  );
}
