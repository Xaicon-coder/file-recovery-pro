import React, { useEffect, useRef, useMemo } from 'react';

// ─── Oscilloscopio — il colore si aggiorna senza reinizializzare il canvas ────
function LiveSignal({ phase }) {
  const canvasRef = useRef(null);
  const phaseRef  = useRef(phase);  // ref per leggere il colore corrente nel draw loop
  phaseRef.current = phase;

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d');
    const dpr = devicePixelRatio || 1;

    const resize = () => {
      c.width  = c.offsetWidth  * dpr;
      c.height = c.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Mappa fase → colore RGB (precalcolato per performance)
    const COL_MAP = {
      recycle:   [0,  255, 65],
      vss:       [0,  255, 238],
      user:      [255,204, 0  ],
      filesystem:[0,  255, 65],
      usn:       [255, 34, 68],
      starting:  [42, 80,  60],
    };

    let t = 0, raf;
    const draw = () => {
      const W = c.offsetWidth, H = c.offsetHeight;
      const [R, G, B] = COL_MAP[phaseRef.current] || COL_MAP.starting;

      // Fade background (trail effect)
      ctx.fillStyle = 'rgba(0,8,2,.14)';
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = 'rgba(0,255,65,.04)'; ctx.lineWidth = .5;
      for (let y = 0; y <= H; y += H/4) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
      for (let x = 0; x <= W; x += W/8) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }

      const cy = H / 2;
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, `rgba(${R},${G},${B},.12)`);
      grad.addColorStop(1, `rgba(${R},${G},${B},0)`);

      // 3 onde sovrapposte con ampiezza e frequenza diverse
      for (let wave = 0; wave < 3; wave++) {
        const amp   = (cy * .55) / (wave + 1);
        const freq  = .014 + wave * .007;
        const speed = .038 + wave * .018;
        const phi   = wave * Math.PI * .66;
        ctx.beginPath();
        for (let x = 0; x < W; x++) {
          const noise = (Math.random() - .5) * (wave === 0 ? 5 : 1.5);
          const y     = cy + Math.sin(x * freq + t * speed + phi) * amp + noise;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${R},${G},${B},${wave === 0 ? .88 : .28})`;
        ctx.lineWidth   = wave === 0 ? 1.4 : .6;
        ctx.stroke();
        // Area riempita sotto la curva principale
        if (wave === 0) { ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fillStyle = grad; ctx.fill(); }
      }

      // Spike casuali (attività I/O)
      if (Math.random() > .88) {
        const sx = Math.random() * W, sh = Math.random() * cy * .65 + 8;
        ctx.beginPath(); ctx.moveTo(sx, cy - sh); ctx.lineTo(sx, cy + sh);
        ctx.strokeStyle = `rgba(${R},${G},${B},.55)`; ctx.lineWidth = .9; ctx.stroke();
      }

      t += 1;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []); // ← avvia UNA sola volta — il colore viene letto dal ref

  return <canvas ref={canvasRef} style={{ width:'100%', height:'100%', display:'block' }}/>;
}

const PHASE_META = {
  starting:  { label:'INIZIALIZZAZIONE', col:'var(--t2)'  },
  recycle:   { label:'$RECYCLE.BIN',     col:'var(--p0)'  },
  vss:       { label:'SHADOW COPY',      col:'#00ffee'    },
  user:      { label:'CARTELLE UTENTE',  col:'var(--a0)'  },
  filesystem:{ label:'FILESYSTEM',       col:'var(--p0)'  },
  usn:       { label:'USN JOURNAL',      col:'var(--r0)'  },
};
const PHASE_ORDER = ['recycle', 'vss', 'user', 'filesystem', 'usn'];

const fmtSize = b => !b ? '0 B' : b >= 1e9 ? (b/1e9).toFixed(1)+' GB' : b >= 1e6 ? (b/1e6).toFixed(0)+' MB' : b >= 1e3 ? (b/1e3).toFixed(0)+' KB' : b + ' B';

export default function Scanning({ scan, onStop }) {
  const { phase, pct, msg, files, done } = scan;
  const pm = PHASE_META[phase] || PHASE_META.starting;

  const totalSize = useMemo(
    () => files.reduce((a, f) => a + (f.size || 0), 0),
    [files]
  );

  // Limita il feed visuale a 300 righe per non rallentare il DOM
  const feed = useMemo(() => files.slice(-300), [files]);

  const phaseIdx = PHASE_ORDER.indexOf(phase);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', animation:'fadeIn .3s ease' }}>

      {/* Oscilloscopio */}
      <div style={{ height:88, flexShrink:0, borderBottom:'1px solid var(--b0)', position:'relative', overflow:'hidden', background:'var(--bg0)' }}>
        <LiveSignal phase={phase}/>
        <div style={{ position:'absolute', top:7, left:12, fontFamily:'var(--mono)', fontSize:7, color:'rgba(0,255,65,.3)', letterSpacing:'.14em', pointerEvents:'none' }}>LIVE I/O</div>
        <div style={{ position:'absolute', top:7, right:12, fontFamily:'var(--mono)', fontSize:8, color:pm.col, letterSpacing:'.14em', textShadow:`0 0 7px ${pm.col}`, pointerEvents:'none' }}>{pm.label}</div>
      </div>

      {/* Header con progresso */}
      <div style={{ flexShrink:0, padding:'10px 18px 0', background:'var(--bg0)', borderBottom:'1px solid var(--b0)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
          <span style={{ fontFamily:'var(--mono)', fontSize:8, color:pm.col, letterSpacing:'.14em' }}>{pm.label}</span>
          <span style={{ fontFamily:'var(--display)', fontSize:22, fontWeight:700, color:'var(--t0)', lineHeight:1 }}>
            {pct}<span style={{ fontSize:11, fontWeight:400, color:'var(--t2)' }}>%</span>
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ height:3, background:'var(--b0)', borderRadius:2, overflow:'hidden', marginBottom:7 }}>
          <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,var(--p2),${pm.col})`, borderRadius:2, transition:'width .22s', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent)', animation:'shimmer 1s linear infinite' }}/>
          </div>
        </div>

        {/* Pipeline fasi */}
        <div style={{ display:'flex', alignItems:'center', marginBottom:8, overflowX:'auto' }}>
          {PHASE_ORDER.map((p, i) => {
            const pm2      = PHASE_META[p];
            const isDone   = phaseIdx > i || done;
            const isCurrent= phase === p;
            return (
              <React.Fragment key={p}>
                <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                  <div style={{ width:13, height:13, borderRadius:'50%', border:`1.5px solid ${isCurrent ? pm2.col : isDone ? 'var(--p0)' : 'var(--b1)'}`, background:isCurrent ? `${pm2.col}20` : isDone ? 'rgba(0,255,65,.06)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s' }}>
                    {isDone && <svg width="6" height="6" viewBox="0 0 6 6" fill="none"><path d="M.8 3l1.5 1.5L5.2.8" stroke="var(--p0)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    {isCurrent && <div style={{ width:4, height:4, borderRadius:'50%', background:pm2.col, animation:'pulse 1.2s ease infinite' }}/>}
                  </div>
                  <span style={{ fontFamily:'var(--mono)', fontSize:7, color:isCurrent ? pm2.col : isDone ? 'var(--t1)' : 'var(--t2)', letterSpacing:'.05em', whiteSpace:'nowrap' }}>{pm2.label}</span>
                </div>
                {i < PHASE_ORDER.length-1 && <div style={{ flex:1, height:1, minWidth:12, background:isDone?'rgba(0,255,65,.18)':'var(--b0)', margin:'0 5px' }}/>}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Statistiche */}
      <div style={{ flexShrink:0, display:'grid', gridTemplateColumns:'repeat(4,1fr)', borderBottom:'1px solid var(--b0)', background:'rgba(1,10,4,.6)' }}>
        {[
          { l:'FILE TROVATI', v:files.length,    col:'var(--p0)' },
          { l:'DIMENSIONE',   v:fmtSize(totalSize), col:'var(--t1)' },
          { l:'AVANZAMENTO',  v:`${pct}%`,        col:'var(--a0)' },
          { l:'STATO',        v:done?'COMPLETATO':'IN CORSO', col:done?'var(--p0)':'var(--a0)' },
        ].map(({ l, v, col }) => (
          <div key={l} style={{ padding:'7px 14px', borderRight:'1px solid var(--b0)' }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t2)', letterSpacing:'.12em', marginBottom:2 }}>{l}</div>
            <div style={{ fontFamily:'var(--display)', fontSize:13, fontWeight:700, color:col }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Feed file */}
      <div style={{ flex:1, overflowY:'auto', padding:'4px 0' }}>
        {feed.length === 0 && (
          <div style={{ padding:'20px 18px', fontFamily:'var(--mono)', fontSize:9, color:'var(--t2)', letterSpacing:'.1em' }}>
            {msg || 'Avvio scansione…'}
          </div>
        )}
        {feed.map((f, i) => {
          const srcCol = { 'Cestino':'var(--p0)', 'Shadow Copy':'#00ffee', 'USN Journal':'var(--r0)' }[f.source] || 'var(--a0)';
          return (
            <div key={f.id || i} style={{ display:'flex', alignItems:'center', gap:10, padding:'3px 14px', borderBottom:'1px solid rgba(0,255,65,.022)', animation:'rowSlide .12s ease' }}>
              <div style={{ width:5, height:5, borderRadius:'50%', flexShrink:0, background:srcCol, opacity:.75 }}/>
              <span style={{ fontFamily:'var(--mono)', fontSize:8.5, color:'var(--t1)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</span>
              <span style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--t2)', flexShrink:0 }}>{fmtSize(f.size)}</span>
              <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t2)', flexShrink:0, minWidth:72, textAlign:'right' }}>{f.source}</span>
            </div>
          );
        })}
      </div>

      {/* Status bar + STOP */}
      {!done && (
        <div style={{ flexShrink:0, padding:'6px 14px', borderTop:'1px solid var(--b0)', display:'flex', alignItems:'center', gap:8, background:'rgba(0,5,2,.95)' }}>
          <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--p0)', animation:'pulse 1.2s ease infinite', flexShrink:0 }}/>
          <span style={{ fontFamily:'var(--mono)', fontSize:8.5, color:'var(--t1)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{msg}</span>
          <button onClick={onStop}
            style={{ padding:'4px 12px', border:'1px solid var(--r0)', borderRadius:4, fontFamily:'var(--mono)', fontSize:8, color:'var(--r0)', background:'rgba(255,34,68,.04)', cursor:'pointer', letterSpacing:'.1em', flexShrink:0 }}>
            STOP
          </button>
        </div>
      )}
    </div>
  );
}
