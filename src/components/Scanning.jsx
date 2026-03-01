import React, { useEffect, useRef } from 'react';

const fmt = b => !b||b<0 ? '—' : b>=1e9?(b/1e9).toFixed(1)+' GB':b>=1e6?(b/1e6).toFixed(1)+' MB':b>=1e3?(b/1e3).toFixed(0)+' KB':b+' B';

// Allineate con recovery engine (recovery/index.js runScan)
const PHASE = {
  recycle:    { label:'Cestino',        color:'var(--green)', short:'RBN' },
  vss:        { label:'Shadow Copy',    color:'#4ade80',      short:'VSS' },
  user:       { label:'Utente',         color:'var(--amber)', short:'USR' },
  filesystem: { label:'Filesystem',     color:'var(--cyan)',  short:'FS'  },
  usn:        { label:'USN Journal',    color:'#c084fc',      short:'USN' },
  done:       { label:'Completato',     color:'var(--green)', short:'OK'  },
  starting:   { label:'Avvio',          color:'var(--t2)',    short:'...' },
};
const PIPE = ['recycle','vss','user','filesystem','usn'];

const SRC_C = {
  'Cestino':'var(--green)', 'Shadow Copy':'#4ade80',
  'Temp':'var(--amber)',    'Filesystem':'var(--cyan)', 'USN Journal':'#c084fc',
};

export default function Scanning({ scan, onStop }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const listRef   = useRef(null);

  const ph  = PHASE[scan.phase] || PHASE.starting;
  const idx = PIPE.indexOf(scan.phase);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [scan.files.length]);

  // Waveform canvas — riflette colore fase corrente
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const setup = () => {
      c.width  = c.offsetWidth  * devicePixelRatio;
      c.height = c.offsetHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    setup();
    window.addEventListener('resize', setup);
    let t = 0;
    const w = () => c.offsetWidth, h = () => c.offsetHeight;

    const draw = () => {
      ctx.clearRect(0, 0, w(), h());
      // Griglia
      ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = .5;
      for (let x = 0; x < w(); x += 24) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h()); ctx.stroke(); }
      for (let y = 0; y < h(); y += 12) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w(),y); ctx.stroke(); }

      // Risolvi colore CSS → RGBA per canvas
      const col = ph.color.startsWith('var') ? '#e8a020' : ph.color;
      const amp = scan.done ? 1.5 : 8 + Math.sin(t*.18)*4;

      // Onda principale
      ctx.beginPath();
      ctx.strokeStyle = col; ctx.lineWidth = 1.5;
      ctx.shadowColor = col; ctx.shadowBlur = scan.done ? 0 : 4;
      for (let x = 0; x <= w(); x++) {
        const y = h()/2 + Math.sin(x*.024+t)*amp + Math.sin(x*.057+t*1.7)*(amp*.4);
        x===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Onda secondaria più sottile
      ctx.beginPath();
      ctx.strokeStyle = col+'55'; ctx.lineWidth = .8;
      for (let x = 0; x <= w(); x++) {
        const y = h()/2 + Math.sin(x*.018+t*.8+1.2)*amp*.5;
        x===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      }
      ctx.stroke();

      t += .055;
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', setup); };
  }, [scan.phase, scan.done]);

  const cestino   = scan.files.filter(f => f.source === 'Cestino').length;
  const integri   = scan.files.filter(f => f.intact).length;
  const altriSrc  = scan.files.filter(f => !f.intact).length;

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>

      {/* Pannello sinistro — stato e controlli */}
      <div style={{ width:288, flexShrink:0, borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:12, padding:'18px 14px', overflowY:'auto', background:'var(--bg1)' }}>

        <div style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:'.18em', color:'var(--amber)', textTransform:'uppercase' }}>Scansione attiva</div>

        {/* Fase corrente */}
        <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:ph.color, flexShrink:0, marginTop:5, boxShadow:`0 0 8px ${ph.color}`, animation:scan.done?'none':'pulse 1.4s infinite' }}/>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:ph.color, marginBottom:3 }}>{ph.label}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t2)', lineHeight:1.5, wordBreak:'break-all' }}>{scan.msg || '…'}</div>
          </div>
        </div>

        {/* Waveform */}
        <div style={{ height:52, background:'var(--bg2)', borderRadius:6, border:'1px solid var(--border)', overflow:'hidden' }}>
          <canvas ref={canvasRef} style={{ width:'100%', height:'100%', display:'block' }}/>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
          {[
            { label:'Trovati',   val:scan.files.length, c:'var(--amber)', big:true },
            { label:'Integri',   val:integri,           c:'var(--green)' },
            { label:'Cestino',   val:cestino,           c:'var(--green)' },
            { label:'Altri',     val:altriSrc,          c:'var(--cyan)'  },
          ].map(s => (
            <div key={s.label} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:6, padding:'8px 10px' }}>
              <div style={{ fontFamily:'var(--mono)', fontWeight:700, color:s.c, fontSize:s.big?22:16, lineHeight:1, marginBottom:2 }}>
                {s.val.toLocaleString()}
              </div>
              <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t2)', textTransform:'uppercase', letterSpacing:'.09em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Pipeline fasi */}
        <div>
          <div style={{ fontFamily:'var(--mono)', fontSize:7, letterSpacing:'.1em', color:'var(--t2)', marginBottom:7, textTransform:'uppercase' }}>Pipeline</div>
          <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
            {PIPE.map((p, i) => {
              const phInfo  = PHASE[p];
              const done    = idx > i || (scan.done && i <= idx);
              const active  = idx === i && !scan.done;
              const waiting = idx < i && !scan.done;
              return (
                <div key={p} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{
                    width:22, height:22, borderRadius:'50%', flexShrink:0,
                    border:`1px solid ${active?phInfo.color:done?'var(--green)':'var(--border)'}`,
                    background: active?phInfo.color+'22':done?'var(--green-bg)':'var(--bg2)',
                    color: active?phInfo.color:done?'var(--green)':'var(--t2)',
                    fontFamily:'var(--mono)', fontSize:8, fontWeight:700,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    transition:'all .3s',
                  }}>
                    {done ? '✓' : phInfo.short}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10, color:active?phInfo.color:done?'var(--green)':waiting?'var(--t2)':'var(--t2)', fontWeight:active?600:400, transition:'color .3s' }}>
                      {phInfo.label}
                    </div>
                  </div>
                  {active && (
                    <div style={{ fontFamily:'var(--mono)', fontSize:8, color:phInfo.color }}>{scan.pct}%</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress bar globale */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ flex:1, height:3, background:'var(--bg3)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${scan.pct}%`, background:`linear-gradient(90deg,${ph.color},${ph.color}88)`, borderRadius:2, transition:'width .35s', position:'relative', overflow:'hidden' }}>
              {!scan.done && <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,transparent,rgba(255,255,255,.25),transparent)', animation:'shim 1.6s linear infinite' }}/>}
            </div>
          </div>
          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t1)', minWidth:30 }}>{scan.pct}%</span>
        </div>

        <button
          style={{ padding:'7px 0', border:'1px solid rgba(239,68,68,.3)', background:'rgba(239,68,68,.05)', color:'var(--red)', borderRadius:5, fontFamily:'var(--mono)', fontSize:10, letterSpacing:'.06em' }}
          onClick={onStop}
        >
          ■ Interrompi scansione
        </button>
      </div>

      {/* Pannello destro — live feed file */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Header tabella */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', borderBottom:'1px solid var(--border)', flexShrink:0, background:'var(--bg1)' }}>
          <span style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:'.12em', color:'var(--t2)', textTransform:'uppercase' }}>File rilevati in tempo reale</span>
          <span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--amber)', fontWeight:700 }}>{scan.files.length.toLocaleString()}</span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'46px 1fr 1fr 86px 68px 56px', padding:'4px 14px', background:'var(--bg2)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          {['EXT','NOME','PERCORSO ORIGINALE','DIM','SORGENTE','CONF'].map(h => (
            <div key={h} style={{ fontFamily:'var(--mono)', fontSize:7, letterSpacing:'.07em', color:'var(--t2)' }}>{h}</div>
          ))}
        </div>

        <div ref={listRef} style={{ flex:1, overflowY:'auto' }}>
          {scan.files.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:10, color:'var(--t2)', fontFamily:'var(--mono)', fontSize:11 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--amber)', animation:'pulse 1s infinite' }}/>
              In attesa dei primi risultati…
            </div>
          ) : (
            // Mostra solo gli ultimi 200 (performance)
            scan.files.slice(-200).map((f, i, arr) => {
              const isNew = i >= arr.length - 6;
              const srcC  = SRC_C[f.source] || 'var(--t2)';
              const confC = f.confidence===100?'var(--green)':f.confidence>=80?'var(--amber)':'#c084fc';
              return (
                <div key={f.id} style={{
                  display:'grid', gridTemplateColumns:'46px 1fr 1fr 86px 68px 56px',
                  alignItems:'center', padding:'3px 14px',
                  borderBottom:'1px solid rgba(255,255,255,.018)',
                  animation: isNew ? 'fadeUp .18s ease' : 'none',
                  background: f.intact ? 'rgba(34,197,94,.015)' : 'transparent',
                }}>
                  <span style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:700, color:srcC, textTransform:'uppercase' }}>
                    {(f.ext?.slice(1)||'?').slice(0,4)}
                  </span>
                  <div style={{ overflow:'hidden', paddingRight:6 }}>
                    <div style={{ fontSize:11, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</div>
                  </div>
                  <div style={{ overflow:'hidden', paddingRight:6 }}>
                    <div style={{ fontFamily:'var(--mono)', fontSize:8, color: f.intact?'var(--green)':'var(--t2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {f.originalDir || f.originalPath || '—'}
                    </div>
                  </div>
                  <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t2)', textAlign:'right' }}>{fmt(f.size)}</span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:8, color:srcC, textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.source}</span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:9, color:confC, textAlign:'center', fontWeight:600 }}>{f.confidence}%</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.2;transform:scale(.8)} }
        @keyframes shim    { from{transform:translateX(-100%)} to{transform:translateX(300%)} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}
