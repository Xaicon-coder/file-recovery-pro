import React, { useEffect, useRef } from 'react';

const fmt = b => !b||b<0 ? '—' : b>=1e9?(b/1e9).toFixed(1)+' GB':b>=1e6?(b/1e6).toFixed(1)+' MB':b>=1e3?(b/1e3).toFixed(0)+' KB':b+' B';

const PHASE = {
  recycle:    { label:'Cestino',       color:'#0fd98a', hex:'#0fd98a' },
  vss:        { label:'Shadow Copy',   color:'#4ade80', hex:'#4ade80' },
  user:       { label:'Utente',        color:'#f0a500', hex:'#f0a500' },
  filesystem: { label:'Filesystem',    color:'#00cce8', hex:'#00cce8' },
  usn:        { label:'USN Journal',   color:'#a78bfa', hex:'#a78bfa' },
  done:       { label:'Completato',    color:'#0fd98a', hex:'#0fd98a' },
  starting:   { label:'Avvio',         color:'#384252', hex:'#384252' },
};
const PIPE = ['recycle','vss','user','filesystem','usn'];
const SRC_C = { 'Cestino':'#0fd98a','Shadow Copy':'#4ade80','Temp':'#f0a500','Filesystem':'#00cce8','USN Journal':'#a78bfa' };

// Icone SVG per tipo file (compact)
const EXT_COLOR = { jpg:'#f0a500',jpeg:'#f0a500',png:'#00cce8',gif:'#a78bfa',mp4:'#ef4444',mkv:'#ef4444',avi:'#ef4444',mp3:'#0fd98a',wav:'#0fd98a',flac:'#0fd98a',pdf:'#f05050',doc:'#3b82f6',docx:'#3b82f6',xls:'#0fd98a',xlsx:'#0fd98a',zip:'#f0a500',rar:'#f0a500','7z':'#f0a500',py:'#a78bfa',js:'#f0d500',ts:'#3b82f6',psd:'#00cce8' };
const extColor = ext => EXT_COLOR[ext?.slice(1).toLowerCase()] || 'var(--t2)';

export default function Scanning({ scan, onStop }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const listRef   = useRef(null);
  const phRef     = useRef(scan.phase);

  const ph  = PHASE[scan.phase] || PHASE.starting;
  const idx = PIPE.indexOf(scan.phase);
  phRef.current = scan.phase;

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [scan.files.length]);

  // Waveform avanzata con spettro multicanale
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const setup = () => {
      c.width  = c.offsetWidth * devicePixelRatio;
      c.height = c.offsetHeight * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    setup();
    window.addEventListener('resize', setup);
    let t = 0;

    const draw = () => {
      const W = c.offsetWidth, H = c.offsetHeight;
      ctx.clearRect(0, 0, W, H);

      const curPh = PHASE[phRef.current] || PHASE.starting;
      const col   = curPh.hex;
      const isDone = phRef.current === 'done';
      const baseAmp = isDone ? 1.5 : 9;

      // Griglia di sfondo
      ctx.strokeStyle = 'rgba(255,255,255,.025)'; ctx.lineWidth = .5;
      for (let x = 0; x < W; x += 28) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      for (let y = 0; y < H; y += H/4) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

      // Onda riempita (area sotto)
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, col + '28');
      grad.addColorStop(1, col + '04');
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x++) {
        const amp = baseAmp + Math.sin(t * .12) * 3;
        const y = H/2 + Math.sin(x * .022 + t) * amp + Math.sin(x * .054 + t * 1.6) * (amp * .4) + Math.sin(x * .008 + t * .5) * (amp * .6);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();

      // Onda principale
      ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = 1.5;
      ctx.shadowColor = col; ctx.shadowBlur = isDone ? 0 : 6;
      for (let x = 0; x <= W; x++) {
        const amp = baseAmp + Math.sin(t * .12) * 3;
        const y = H/2 + Math.sin(x * .022 + t) * amp + Math.sin(x * .054 + t * 1.6) * (amp * .4) + Math.sin(x * .008 + t * .5) * (amp * .6);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke(); ctx.shadowBlur = 0;

      // Onda secondaria
      ctx.beginPath(); ctx.strokeStyle = col + '55'; ctx.lineWidth = .8;
      for (let x = 0; x <= W; x++) {
        const y = H/2 + Math.sin(x * .016 + t * .75 + 1.5) * (baseAmp * .55);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Particelle random
      if (!isDone && Math.random() > .7) {
        const px = Math.random() * W, py = Math.random() * H;
        ctx.beginPath();
        ctx.arc(px, py, Math.random() * 1.2 + .3, 0, Math.PI * 2);
        ctx.fillStyle = col + '40'; ctx.fill();
      }

      t += .048;
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', setup); };
  }, []);

  const cestino  = scan.files.filter(f => f.source === 'Cestino').length;
  const integri  = scan.files.filter(f => f.intact).length;
  const shadow   = scan.files.filter(f => f.source === 'Shadow Copy').length;
  const altri    = scan.files.filter(f => !f.intact).length;

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>

      {/* ── Pannello sinistro ── */}
      <div style={{ width:276, flexShrink:0, borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', background:'var(--bg1)', overflow:'hidden' }}>

        {/* Header fase */}
        <div style={{ padding:'14px 16px 12px', borderBottom:'1px solid var(--border)', background:'rgba(0,0,0,.2)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background: ph.color, boxShadow:`0 0 12px ${ph.color}` }}/>
              {!scan.done && <div style={{ position:'absolute', inset:-3, borderRadius:'50%', border:`1.5px solid ${ph.color}55`, animation:'spin 2s linear infinite' }}/>}
            </div>
            <div>
              <div style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:'.16em', color:'var(--t2)', textTransform:'uppercase' }}>Fase attiva</div>
              <div style={{ fontSize:13, fontWeight:600, color: ph.color, lineHeight:1.2 }}>{ph.label}</div>
            </div>
          </div>
          <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t1)', lineHeight:1.5, minHeight:28, overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
            {scan.msg || 'Inizializzazione…'}
          </div>
        </div>

        {/* Waveform */}
        <div style={{ height:64, margin:'10px 12px', borderRadius:8, overflow:'hidden', background:'rgba(0,0,0,.3)', border:'1px solid var(--border)', flexShrink:0 }}>
          <canvas ref={canvasRef} style={{ width:'100%', height:'100%', display:'block' }}/>
        </div>

        {/* Stats */}
        <div style={{ padding:'0 12px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:5, flexShrink:0 }}>
          {[
            { n: scan.files.length, label:'Trovati', color:'#f0a500', big:true },
            { n: integri,           label:'Integri',  color:'#0fd98a' },
            { n: cestino,           label:'Cestino',  color:'#0fd98a' },
            { n: altri,             label:'Altri',    color:'#00cce8' },
          ].map(s => (
            <div key={s.label} style={{ background:'rgba(0,0,0,.25)', border:'1px solid var(--border)', borderRadius:7, padding:'8px 10px' }}>
              <div style={{ fontFamily:'var(--mono)', fontWeight:700, color:s.color, fontSize: s.big ? 22 : 16, lineHeight:1, marginBottom:2, animation: s.big && !scan.done ? 'glow 2s ease infinite' : 'none' }}>
                {s.n.toLocaleString()}
              </div>
              <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t2)', textTransform:'uppercase', letterSpacing:'.09em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Pipeline */}
        <div style={{ padding:'12px 14px 10px', flex:1, overflow:'hidden' }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:7, letterSpacing:'.12em', color:'var(--t2)', textTransform:'uppercase', marginBottom:10 }}>Pipeline</div>
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {PIPE.map((p, i) => {
              const info   = PHASE[p];
              const done   = scan.done ? true : idx > i;
              const active = !scan.done && idx === i;
              const wait   = !scan.done && idx < i;
              return (
                <div key={p} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 6px', borderRadius:6, background: active ? info.hex + '0c' : 'transparent', border:`1px solid ${active ? info.hex + '22' : 'transparent'}`, transition:'all .3s' }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', flexShrink:0, background: done ? '#0fd98a18' : active ? info.hex + '18' : 'var(--bg3)', border:`1px solid ${done ? '#0fd98a55' : active ? info.hex + '55' : 'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .3s' }}>
                    {done
                      ? <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-3.5" stroke="#0fd98a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      : <span style={{ fontFamily:'var(--mono)', fontSize:7, fontWeight:600, color: active ? info.hex : 'var(--t2)' }}>{String(i+1)}</span>
                    }
                  </div>
                  <span style={{ fontSize:10, color: active ? info.hex : done ? 'var(--t1)' : 'var(--t2)', fontWeight: active ? 600 : 400, flex:1, transition:'color .3s' }}>{info.label}</span>
                  {active && <span style={{ fontFamily:'var(--mono)', fontSize:8, color:info.hex }}>{scan.pct}%</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress + Stop */}
        <div style={{ padding:'10px 12px 12px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <div style={{ flex:1, height:3, background:'var(--bg4)', borderRadius:2, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${scan.pct}%`, background:`linear-gradient(90deg,${ph.hex},${ph.hex}88)`, borderRadius:2, transition:'width .4s', position:'relative', overflow:'hidden' }}>
                {!scan.done && <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent)', animation:'shimmer 1.5s linear infinite' }}/>}
              </div>
            </div>
            <span style={{ fontFamily:'var(--mono)', fontSize:9, color:ph.color, minWidth:30, fontWeight:600 }}>{scan.pct}%</span>
          </div>
          <button onClick={onStop} style={{ width:'100%', padding:'7px 0', border:'1px solid rgba(240,80,80,.2)', background:'rgba(240,80,80,.04)', color:'var(--red)', borderRadius:6, fontFamily:'var(--mono)', fontSize:9, letterSpacing:'.06em', transition:'all .12s', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="var(--red)"><rect width="8" height="8" rx="1.5"/></svg>
            Interrompi scansione
          </button>
        </div>
      </div>

      {/* ── Pannello destro: live feed ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 16px', borderBottom:'1px solid var(--border)', flexShrink:0, background:'rgba(0,0,0,.15)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--amber)', animation: scan.done ? 'none' : 'pulse 1.2s infinite' }}/>
            <span style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:'.12em', color:'var(--t2)', textTransform:'uppercase' }}>File rilevati in tempo reale</span>
          </div>
          <span style={{ fontFamily:'var(--mono)', fontSize:13, color:'var(--amber)', fontWeight:700 }}>{scan.files.length.toLocaleString()}</span>
        </div>

        {/* Colonne header */}
        <div style={{ display:'grid', gridTemplateColumns:'42px 1fr 1fr 80px 72px 52px', padding:'4px 16px', background:'rgba(0,0,0,.2)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          {['EXT','NOME','PERCORSO','DIM.','SORGENTE','%'].map(h => (
            <div key={h} style={{ fontFamily:'var(--mono)', fontSize:7, letterSpacing:'.08em', color:'var(--t2)', textTransform:'uppercase' }}>{h}</div>
          ))}
        </div>

        <div ref={listRef} style={{ flex:1, overflowY:'auto' }}>
          {scan.files.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:12, color:'var(--t2)', fontFamily:'var(--mono)', fontSize:11 }}>
              <div style={{ position:'relative', width:40, height:40 }}>
                <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'1.5px solid rgba(240,165,0,.2)', animation:'spin 3s linear infinite' }}/>
                <div style={{ position:'absolute', inset:4, borderRadius:'50%', border:'1px solid rgba(240,165,0,.1)', animation:'spin 2s linear infinite reverse' }}/>
                <div style={{ position:'absolute', inset:9, borderRadius:'50%', background:'rgba(240,165,0,.06)', border:'1px solid rgba(240,165,0,.2)' }}/>
              </div>
              In attesa dei primi risultati…
            </div>
          ) : (
            scan.files.slice(-200).map((f, i, arr) => {
              const isNew = i >= arr.length - 5;
              const srcC  = SRC_C[f.source] || 'var(--t2)';
              const ec    = extColor(f.ext);
              const confC = f.confidence === 100 ? '#0fd98a' : f.confidence >= 80 ? '#f0a500' : '#a78bfa';
              return (
                <div key={f.id} style={{ display:'grid', gridTemplateColumns:'42px 1fr 1fr 80px 72px 52px', alignItems:'center', padding:'3px 16px', borderBottom:'1px solid rgba(255,255,255,.018)', animation: isNew ? 'fadeUp .15s ease' : 'none', background: f.intact ? 'rgba(15,217,138,.012)' : 'transparent', transition:'background .2s' }}>
                  <div style={{ display:'flex', alignItems:'center' }}>
                    <span style={{ fontFamily:'var(--mono)', fontSize:8, fontWeight:700, color:ec, background: ec + '18', padding:'2px 4px', borderRadius:3, textTransform:'uppercase' }}>
                      {(f.ext?.slice(1) || '?').slice(0, 4)}
                    </span>
                  </div>
                  <div style={{ overflow:'hidden', paddingRight:8 }}>
                    <div style={{ fontSize:10, color:'var(--t0)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:450 }}>{f.name}</div>
                  </div>
                  <div style={{ overflow:'hidden', paddingRight:8 }}>
                    <div style={{ fontFamily:'var(--mono)', fontSize:8, color: f.intact ? '#0fd98a88' : 'var(--t2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {f.originalDir || '—'}
                    </div>
                  </div>
                  <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)', textAlign:'right' }}>{fmt(f.size)}</span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:7, color:srcC, textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.source}</span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:9, color:confC, textAlign:'center', fontWeight:600 }}>{f.confidence}%</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse   {0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.15;transform:scale(.6)}}
        @keyframes shimmer {from{transform:translateX(-100%)} to{transform:translateX(300%)}}
        @keyframes fadeUp  {from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)}}
        @keyframes spin    {to{transform:rotate(360deg)}}
        @keyframes glow    {0%,100%{opacity:.8} 50%{opacity:1}}
      `}</style>
    </div>
  );
}
