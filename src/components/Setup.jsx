import React, { useEffect, useRef } from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = b => !b ? '—' : b>=1e12 ? (b/1e12).toFixed(1)+' TB' : b>=1e9 ? (b/1e9).toFixed(0)+' GB' : b>=1e6 ? (b/1e6).toFixed(0)+' MB' : '<1 MB';

const MODES = [
  { id:'quick',    label:'RAPIDA',       desc:'Solo Cestino ($Recycle.Bin)',             time:'<1 min',   col:'#00ff41' },
  { id:'standard', label:'STANDARD',     desc:'Cestino + Shadow Copy + Cartelle utente', time:'2–8 min',  col:'#ffcc00' },
  { id:'deep',     label:'APPROFONDITA', desc:'+ Scansione completa di C:\\Users',        time:'10–30 m',  col:'#00ffee' },
  { id:'full',     label:'FORENSE',      desc:'+ USN Journal NTFS (admin richiesto)',     time:'30+ min',  col:'#ff2244' },
];

const TYPES = [
  { id:'image',       label:'Immagini',   ext:'JPG PNG RAW',  d:'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
  { id:'video',       label:'Video',      ext:'MP4 MKV AVI',  d:'M15 10l4.553-2.069A1 1 0 0121 8.87V15.13a1 1 0 01-1.447.9L15 14M3 8h12v8H3z' },
  { id:'audio',       label:'Audio',      ext:'MP3 FLAC WAV', d:'M9 18V5l12-2v13M9 9l12-2' },
  { id:'document',    label:'Documenti',  ext:'PDF DOCX RTF', d:'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6' },
  { id:'spreadsheet', label:'Fogli',      ext:'XLS XLSX CSV', d:'M3 3h18v18H3z M3 9h18 M3 15h18 M9 3v18 M15 3v18' },
  { id:'archive',     label:'Archivi',    ext:'ZIP RAR 7Z',   d:'M21 8l-4-4H5a2 2 0 00-2 2v16a2 2 0 002 2h14a2 2 0 002-2V8z' },
  { id:'code',        label:'Codice',     ext:'JS PY SQL',    d:'M16 18l6-6-6-6M8 6l-6 6 6 6' },
  { id:'design',      label:'Design',     ext:'PSD AI FIG',   d:'M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4z' },
];

// ─── Canvas: radar sweep + floating particles ─────────────────────────────────
function Background() {
  const radarRef    = useRef(null);
  const particleRef = useRef(null);

  // Radar sweep
  useEffect(() => {
    const c = radarRef.current; if (!c) return;
    const ctx = c.getContext('2d');
    const dpr = devicePixelRatio || 1;
    const resize = () => {
      c.width  = c.offsetWidth  * dpr;
      c.height = c.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize(); window.addEventListener('resize', resize);
    const W = () => c.offsetWidth, H = () => c.offsetHeight;
    let angle = 0, raf;
    const blips = Array.from({ length: 20 }, () => ({
      r: .08 + Math.random() * .38, a: Math.random() * Math.PI * 2,
      life: 0, max: 140 + Math.random() * 100,
      spawnA: Math.random() * Math.PI * 2, spawned: false,
    }));
    const draw = () => {
      const w = W(), h = H(), cx = w / 2, cy = h / 2, R = Math.min(w, h) * .42;
      ctx.clearRect(0, 0, w, h);
      // Rings
      for (let i = 1; i <= 5; i++) {
        ctx.beginPath(); ctx.arc(cx, cy, R * i / 5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,255,65,${.04 + i * .01})`; ctx.lineWidth = .7; ctx.stroke();
      }
      // Cross
      ctx.strokeStyle = 'rgba(0,255,65,.04)'; ctx.lineWidth = .5;
      [[cx - R, cy, cx + R, cy], [cx, cy - R, cx, cy + R],
       [cx - R*.7, cy - R*.7, cx + R*.7, cy + R*.7],
       [cx + R*.7, cy - R*.7, cx - R*.7, cy + R*.7]]
      .forEach(([x1,y1,x2,y2]) => { ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); });
      // Trail
      for (let i = 0; i < 70; i++) {
        const a = angle - (i / 70) * 1.8;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a, a + .03); ctx.closePath();
        ctx.fillStyle = `rgba(0,255,65,${(1 - i / 70) * .15})`; ctx.fill();
      }
      // Line
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(angle) * R, cy + Math.sin(angle) * R);
      ctx.strokeStyle = 'rgba(0,255,65,.7)'; ctx.lineWidth = 1.5;
      ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0;
      // Blips
      blips.forEach(b => {
        const d = ((angle - b.spawnA) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        if (!b.spawned && d < .07) { b.spawned = true; b.life = b.max; }
        if (b.life > 0) {
          b.life--;
          const bx = cx + Math.cos(b.a) * R * b.r * 2.2, by = cy + Math.sin(b.a) * R * b.r * 2.2;
          const al = Math.min(1, b.life / 25) * .85;
          ctx.beginPath(); ctx.arc(bx, by, 2, 0, Math.PI * 2); ctx.fillStyle = `rgba(0,255,65,${al})`; ctx.fill();
          ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI * 2); ctx.strokeStyle = `rgba(0,255,65,${al * .3})`; ctx.lineWidth = .7; ctx.stroke();
        }
      });
      // Center
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#00ff41'; ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
      angle += .019; raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  // Particles network
  useEffect(() => {
    const c = particleRef.current; if (!c) return;
    const ctx = c.getContext('2d');
    const dpr = devicePixelRatio || 1;
    const resize = () => {
      c.width = c.offsetWidth * dpr; c.height = c.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize(); window.addEventListener('resize', resize);
    const pts = Array.from({ length: 38 }, () => ({
      x: Math.random() * (c.offsetWidth / dpr),
      y: Math.random() * (c.offsetHeight / dpr),
      vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22,
    }));
    let raf;
    const draw = () => {
      const W = c.offsetWidth / dpr, H = c.offsetHeight / dpr;
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, .9, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,255,65,.35)'; ctx.fill();
      });
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.sqrt(dx*dx+dy*dy);
        if (d < 88) { ctx.beginPath(); ctx.strokeStyle = `rgba(0,255,65,${(1-d/88)*.055})`; ctx.lineWidth = .4; ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke(); }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <>
      <canvas ref={radarRef}    style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', opacity:.3 }}/>
      <canvas ref={particleRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', opacity:.6 }}/>
      <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(0,255,65,.012) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,65,.012) 1px,transparent 1px)', backgroundSize:'38px 38px', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:70, background:'linear-gradient(180deg,var(--void),transparent)', pointerEvents:'none' }}/>
    </>
  );
}

function Lbl({ children, right }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:9 }}>
      <div style={{ width:2, height:11, background:'var(--p0)', borderRadius:1, boxShadow:'0 0 6px var(--p0)', flexShrink:0 }}/>
      <span style={{ fontFamily:'var(--mono)', fontSize:7.5, letterSpacing:'.2em', color:'var(--t1)', flex:1 }}>{children}</span>
      {right}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Setup({ info, drives, opts, setOpts, onStart }) {
  const set = (k, v) => setOpts(o => ({ ...o, [k]: v }));
  const toggleType = id => set('types', opts.types.includes(id) ? opts.types.filter(t => t !== id) : [...opts.types, id]);
  const allOn = opts.types.length === 0;
  const selMode = MODES.find(m => m.id === opts.mode);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', position:'relative' }}>
      <Background/>

      <div style={{ flex:1, overflowY:'auto', padding:'20px 22px 0', position:'relative', zIndex:1, animation:'fadeIn .4s ease' }}>
        {/* Header */}
        <div style={{ marginBottom:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--p0)', animation:'pulse 2s ease infinite', boxShadow:'0 0 8px var(--p0)' }}/>
            <span style={{ fontFamily:'var(--mono)', fontSize:7.5, letterSpacing:'.2em', color:'var(--p2)' }}>SYS.RECOVERY.INIT</span>
          </div>
          <h1 style={{ fontFamily:'var(--display)', fontSize:22, fontWeight:700, letterSpacing:'.06em', color:'var(--t0)', textShadow:'0 0 28px rgba(0,255,65,.15)', marginBottom:5 }}>
            RECUPERO FILE
          </h1>
          <p style={{ fontSize:12, color:'var(--t1)', lineHeight:1.7, maxWidth:480 }}>
            Il Cestino è scansionato per primo — file intatti al 100% con percorso originale dai metadati{' '}
            <code style={{ fontFamily:'var(--mono)', color:'var(--a0)', fontSize:10, background:'var(--a-bg)', padding:'1px 5px', borderRadius:2 }}>$I</code>.
            Shadow Copy, filesystem e USN Journal in ordine di affidabilità.
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          {/* ── Colonna sinistra ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:14, paddingBottom:16 }}>

            {/* Drive */}
            <section>
              <Lbl>Disco da analizzare</Lbl>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {drives.map(d => {
                  const sel = opts.drive === d.id;
                  const pct = d.total ? Math.round((1 - d.free / d.total) * 100) : 0;
                  return (
                    <button key={d.id} onClick={() => set('drive', d.id)}
                      style={{ textAlign:'left', padding:'10px 13px', background:sel ? 'rgba(0,255,65,.04)' : 'rgba(2,21,8,.85)', border:`1px solid ${sel ? 'var(--b2)' : 'var(--b0)'}`, borderRadius:8, cursor:'pointer', transition:'all .14s', backdropFilter:'blur(8px)', boxShadow:sel ? '0 0 16px rgba(0,255,65,.07)' : 'none' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:32, height:32, borderRadius:7, background:sel ? 'rgba(0,255,65,.08)' : 'rgba(4,31,13,.9)', border:`1px solid ${sel ? 'var(--b2)' : 'var(--b0)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={sel ? 'var(--p0)' : 'var(--t2)'} strokeWidth="1.3" strokeLinecap="round" style={{ filter:sel ? 'drop-shadow(0 0 3px var(--p0))' : 'none' }}>
                            <rect x="1" y="4" width="14" height="8" rx="2"/><circle cx="12" cy="8" r="1.2" fill={sel ? 'var(--p0)' : 'var(--t2)'}/><line x1="3" y1="8" x2="7" y2="8"/>
                          </svg>
                        </div>
                        <div style={{ flex:1, overflow:'hidden' }}>
                          <div style={{ fontSize:12, fontWeight:600, color:sel ? 'var(--t0)' : 'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.label}</div>
                          <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)', marginTop:1 }}>{d.fs || 'NTFS'}{d.total ? ` · ${fmt(d.total)}` : ''}</div>
                        </div>
                        {sel && (
                          <div style={{ width:16, height:16, borderRadius:'50%', background:'var(--p0)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 0 10px var(--p-glow)' }}>
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l1.8 1.8L6.5 1.5" stroke="#000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                        )}
                      </div>
                      {d.total > 0 && (
                        <>
                          <div style={{ height:2, background:'rgba(0,255,65,.06)', borderRadius:1, margin:'8px 0 3px', overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${pct}%`, background:sel ? 'linear-gradient(90deg,var(--p2),var(--p0))' : 'linear-gradient(90deg,var(--t3),var(--t2))', borderRadius:1, transition:'width .4s' }}/>
                          </div>
                          <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'var(--mono)', fontSize:7, color:'var(--t2)' }}>
                            <span>{fmt(d.total - d.free)} usati</span><span>{fmt(d.free)} liberi</span>
                          </div>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Mode */}
            <section>
              <Lbl>Modalità di scansione</Lbl>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
                {MODES.map(m => {
                  const on = opts.mode === m.id;
                  return (
                    <button key={m.id} onClick={() => set('mode', m.id)}
                      style={{ padding:'10px 11px', background:on ? `${m.col}08` : 'rgba(2,21,8,.85)', border:`1px solid ${on ? m.col + '44' : 'var(--b0)'}`, borderRadius:7, cursor:'pointer', textAlign:'left', transition:'all .13s', backdropFilter:'blur(6px)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4 }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background:on ? m.col : 'var(--t3)', boxShadow:on ? `0 0 8px ${m.col}` : 'none', flexShrink:0, transition:'all .13s' }}/>
                        <span style={{ fontFamily:'var(--display)', fontSize:9, fontWeight:700, color:on ? m.col : 'var(--t2)', letterSpacing:'.08em', flex:1 }}>{m.label}</span>
                        <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t3)' }}>{m.time}</span>
                      </div>
                      <p style={{ fontSize:9, color:'var(--t2)', lineHeight:1.5 }}>{m.desc}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* System info */}
            {info && (
              <div style={{ background:'rgba(2,21,8,.88)', border:'1px solid var(--b0)', borderRadius:7, padding:'10px 13px', backdropFilter:'blur(8px)' }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:7, letterSpacing:'.2em', color:'var(--t2)', marginBottom:8 }}>// SYSTEM</div>
                {[
                  ['HOSTNAME',  info.hostname,   null],
                  ['RAM FREE',  info.ram?.free >= 1e9 ? (info.ram.free/1e9).toFixed(1)+' GB' : '—', null],
                  ['PRIVILEGE', info.isAdmin ? 'ADMINISTRATOR' : 'STANDARD USER', info.isAdmin ? 'var(--p0)' : 'var(--a0)'],
                ].map(([k, v, col], i, arr) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:i < arr.length-1 ? '1px solid var(--b0)' : 'none' }}>
                    <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)' }}>{k}</span>
                    <span style={{ fontFamily:'var(--mono)', fontSize:8, color:col || 'var(--t1)', fontWeight:500, textShadow:col ? `0 0 5px ${col}` : 'none' }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            {info && !info.isAdmin && (
              <div style={{ display:'flex', gap:9, padding:'9px 12px', background:'var(--a-bg)', border:'1px solid rgba(255,204,0,.2)', borderRadius:7 }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="var(--a0)" strokeWidth="1.2" strokeLinecap="round" style={{ flexShrink:0, marginTop:1 }}>
                  <path d="M6.5 1L12 11H1z"/><line x1="6.5" y1="5" x2="6.5" y2="7.5"/><circle cx="6.5" cy="9.5" r=".6" fill="var(--a0)"/>
                </svg>
                <p style={{ fontSize:10, color:'var(--t1)', lineHeight:1.55 }}>Avvia come Amministratore per la modalità Forense e l'accesso a USN Journal.</p>
              </div>
            )}
          </div>

          {/* ── Colonna destra: tipi ── */}
          <div style={{ paddingBottom:16 }}>
            <Lbl right={
              <button onClick={() => set('types', allOn ? TYPES.map(t => t.id) : [])}
                style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t2)', border:'1px solid var(--b0)', background:'transparent', padding:'3px 8px', borderRadius:3, cursor:'pointer', letterSpacing:'.1em' }}>
                {allOn ? 'DESEL ALL' : 'SEL ALL'}
              </button>
            }>Tipi di file</Lbl>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
              {TYPES.map(ft => {
                const on = allOn || opts.types.includes(ft.id);
                return (
                  <button key={ft.id} onClick={() => toggleType(ft.id)}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', border:`1px solid ${on ? 'var(--b1)' : 'var(--b0)'}`, borderRadius:7, background:on ? 'rgba(2,21,8,.9)' : 'transparent', opacity:on ? 1 : .3, cursor:'pointer', transition:'all .12s', backdropFilter:'blur(4px)', textAlign:'left' }}>
                    <div style={{ width:26, height:26, borderRadius:6, background:on ? 'rgba(0,255,65,.06)' : 'var(--bg3)', border:`1px solid ${on ? 'var(--b1)' : 'var(--b0)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={on ? 'var(--p1)' : 'var(--t2)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d={ft.d}/>
                      </svg>
                    </div>
                    <div style={{ flex:1, overflow:'hidden' }}>
                      <div style={{ fontSize:10, fontWeight:600, color:on ? 'var(--t0)' : 'var(--t2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ft.label}</div>
                      <div style={{ fontFamily:'var(--mono)', fontSize:6.5, color:'var(--t2)', marginTop:1 }}>{ft.ext}</div>
                    </div>
                    <div style={{ width:12, height:12, border:`1px solid ${on ? 'var(--p0)' : 'var(--b0)'}`, borderRadius:2, background:on ? 'var(--p0)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .12s' }}>
                      {on && <svg width="7" height="7" viewBox="0 0 7 7" fill="none"><path d="M1 3.5l1.8 1.8L6 1" stroke="#000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ flexShrink:0, padding:'11px 22px 13px', borderTop:'1px solid var(--b0)', display:'flex', alignItems:'center', gap:14, background:'rgba(0,5,2,.96)', backdropFilter:'blur(18px)', position:'relative', zIndex:2 }}>
        <button onClick={opts.drive ? onStart : undefined}
          style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 26px', background:opts.drive ? 'var(--p0)' : 'rgba(6,42,17,.9)', color:opts.drive ? '#000' : 'var(--t2)', borderRadius:6, fontFamily:'var(--display)', fontWeight:700, fontSize:12, letterSpacing:'.1em', cursor:opts.drive ? 'pointer' : 'not-allowed', boxShadow:opts.drive ? '0 0 22px var(--p-glow)' : 'none', transition:'all .14s' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="6" cy="6" r="5"/><circle cx="6" cy="6" r="2"/>
            <line x1="6" y1="1" x2="6" y2="2.8"/><line x1="6" y1="9.2" x2="6" y2="11"/>
            <line x1="1" y1="6" x2="2.8" y2="6"/><line x1="9.2" y1="6" x2="11" y2="6"/>
          </svg>
          {opts.drive ? `AVVIA SCANSIONE — ${opts.drive}` : 'SELEZIONA DISCO'}
        </button>
        <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t2)', letterSpacing:'.08em' }}>
          <span style={{ color:'var(--t1)' }}>{selMode?.label}</span>
          {' · '}
          {allOn ? 'TUTTI I TIPI' : `${opts.types.length} TIPI`}
        </div>
      </div>
    </div>
  );
}
