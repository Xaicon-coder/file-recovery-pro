import React, { useEffect, useRef } from 'react';

const fmt = b => !b ? '—' : b >= 1e9 ? (b/1e9).toFixed(0)+' GB' : b >= 1e6 ? (b/1e6).toFixed(0)+' MB' : (b/1e3).toFixed(0)+' KB';

const MODES = [
  { id:'quick',    label:'Rapida',       desc:'Solo Cestino ($Recycle.Bin)',              time:'< 1 min',   color:'var(--green)',  icon:'M5 9l2.5 2.5L13 6' },
  { id:'standard', label:'Standard',     desc:'Cestino + Shadow Copy + cartelle utente', time:'2–8 min',   color:'var(--amber)',  icon:'M3 5h12M3 9h9M3 13h6' },
  { id:'deep',     label:'Approfondita', desc:'+ Scansione filesystem C:\\Users',          time:'10–30 min', color:'var(--cyan)',   icon:'M2 9a7 7 0 0114 0M9 2v2M9 14v2M2 9H4M14 9h2' },
  { id:'full',     label:'Forense',      desc:'+ USN Journal NTFS (richiede admin)',      time:'30+ min',   color:'var(--purple)', icon:'M9 2L2 7v7l7 3 7-3V7zM9 2v17' },
];

// SVG icons professionali per tipo file
const TYPE_ICONS = {
  image:        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><rect x="1" y="1" width="11" height="11" rx="1.5"/><circle cx="4.5" cy="4.5" r="1.2"/><path d="M1 8.5l3-3 2.5 2.5L9 5.5l3 3"/></svg>,
  video:        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><rect x="1" y="2.5" width="8.5" height="8" rx="1.5"/><path d="M9.5 5l2.5-1.5v6L9.5 8"/></svg>,
  audio:        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><path d="M2 5v3M5 3v7M8 4.5v4M11 3v7"/></svg>,
  document:     <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><path d="M7.5 1H3a1 1 0 00-1 1v9a1 1 0 001 1h7a1 1 0 001-1V4.5z"/><path d="M7.5 1v3.5H11M4 6.5h5M4 9h3"/></svg>,
  spreadsheet:  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><rect x="1" y="1" width="11" height="11" rx="1.5"/><line x1="1" y1="5" x2="12" y2="5"/><line x1="1" y1="9" x2="12" y2="9"/><line x1="5" y1="1" x2="5" y2="12"/></svg>,
  presentation: <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><rect x="1" y="1.5" width="11" height="7.5" rx="1.5"/><line x1="6.5" y1="9" x2="6.5" y2="12"/><line x1="4" y1="12" x2="9" y2="12"/></svg>,
  archive:      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><rect x="1" y="1" width="11" height="3" rx="1"/><path d="M2 4v7a1 1 0 001 1h7a1 1 0 001-1V4"/><line x1="5" y1="7" x2="8" y2="7"/></svg>,
  code:         <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><path d="M4 3L1 6.5 4 10M9 3l3 3.5-3 3.5M7 1.5L6 11.5"/></svg>,
  text:         <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><line x1="2" y1="3.5" x2="11" y2="3.5"/><line x1="2" y1="6.5" x2="11" y2="6.5"/><line x1="2" y1="9.5" x2="7" y2="9.5"/></svg>,
  design:       <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><path d="M2 11L6.5 2 11 11"/><line x1="3.5" y1="8" x2="9.5" y2="8"/></svg>,
};

const TYPES = [
  { id:'image',        label:'Immagini',   ext:'JPG PNG RAW' },
  { id:'video',        label:'Video',      ext:'MP4 MKV AVI' },
  { id:'audio',        label:'Audio',      ext:'MP3 WAV FLAC'},
  { id:'document',     label:'Documenti',  ext:'PDF DOCX RTF'},
  { id:'spreadsheet',  label:'Fogli',      ext:'XLS XLSX CSV'},
  { id:'presentation', label:'Slide',      ext:'PPT PPTX KEY'},
  { id:'archive',      label:'Archivi',    ext:'ZIP RAR 7Z'  },
  { id:'code',         label:'Codice',     ext:'JS PY HTML'  },
  { id:'text',         label:'Testo',      ext:'TXT MD LOG'  },
  { id:'design',       label:'Design',     ext:'PSD AI FIG'  },
];

// Icona disco SVG
const DriveIcon = ({ removable }) => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
    {removable
      ? <><rect x="3" y="1.5" width="9" height="12" rx="1.5"/><line x1="5.5" y1="4" x2="9.5" y2="4"/><circle cx="7.5" cy="9" r="1.5"/></>
      : <><rect x="1" y="3.5" width="13" height="8" rx="1.5"/><circle cx="11.5" cy="7.5" r="1.2" fill="currentColor"/><line x1="3" y1="7.5" x2="7" y2="7.5"/></>
    }
  </svg>
);

export default function Setup({ info, drives, opts, setOpts, onStart }) {
  const bgRef = useRef(null);
  const animRef = useRef(null);

  const set = (k, v) => setOpts(o => ({ ...o, [k]: v }));
  const toggleType = id => set('types', opts.types.includes(id) ? opts.types.filter(t => t !== id) : [...opts.types, id]);
  const allOn = opts.types.length === 0;
  const selectedMode = MODES.find(m => m.id === opts.mode);

  // Canvas background: nodi connessi animati (stile network/scan)
  useEffect(() => {
    const c = bgRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const resize = () => { c.width = c.offsetWidth * devicePixelRatio; c.height = c.offsetHeight * devicePixelRatio; ctx.scale(devicePixelRatio, devicePixelRatio); };
    resize();
    window.addEventListener('resize', resize);

    const W = () => c.offsetWidth, H = () => c.offsetHeight;
    const nodes = Array.from({ length: 32 }, () => ({
      x: Math.random() * W(), y: Math.random() * H(),
      vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25,
      r: Math.random() * 1.5 + .5,
    }));

    let frame;
    const draw = () => {
      ctx.clearRect(0, 0, W(), H());
      // Update positions
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W()) n.vx *= -1;
        if (n.y < 0 || n.y > H()) n.vy *= -1;
      });
      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(240,165,0,${(1 - dist / 120) * .06})`;
            ctx.lineWidth = .5;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }
      // Draw nodes
      nodes.forEach(n => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(240,165,0,.18)';
        ctx.fill();
      });
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', position:'relative' }}>
      {/* Animated background */}
      <canvas ref={bgRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', opacity:.7 }}/>

      {/* Subtle grid overlay */}
      <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.012) 1px,transparent 1px)', backgroundSize:'32px 32px', pointerEvents:'none' }}/>

      {/* Top gradient fade */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:120, background:'linear-gradient(180deg,var(--bg0) 0%,transparent 100%)', pointerEvents:'none', zIndex:1 }}/>

      <div style={{ flex:1, overflowY:'auto', padding:'22px 26px 0', position:'relative', zIndex:2 }}>
        {/* Header */}
        <div style={{ marginBottom:22, animation:'fadeIn .4s ease' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <div style={{ width:3, height:14, background:'var(--amber)', borderRadius:2, boxShadow:'0 0 8px var(--amber-glow)' }}/>
            <span style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:'.2em', color:'var(--amber)', textTransform:'uppercase' }}>Configurazione scansione</span>
          </div>
          <h1 style={{ fontSize:20, fontWeight:700, color:'var(--t0)', marginBottom:5, lineHeight:1.3 }}>
            Recupera i file eliminati
          </h1>
          <p style={{ fontSize:11, color:'var(--t1)', lineHeight:1.65, maxWidth:460 }}>
            Il Cestino viene sempre analizzato per primo — i file sono intatti al 100% con percorso originale esatto letto dai metadati <code style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--amber-dim)', background:'rgba(240,165,0,.07)', padding:'1px 5px', borderRadius:3 }}>$I</code>.
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, animation:'fadeIn .5s ease .05s both' }}>

          {/* ── Colonna sinistra ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

            {/* Drive selector */}
            <section>
              <SectionLabel>Disco da analizzare</SectionLabel>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {drives.map(d => {
                  const sel  = opts.drive === d.id;
                  const used = d.total ? Math.round((1 - d.free / d.total) * 100) : 0;
                  return (
                    <button key={d.id} onClick={() => set('drive', d.id)}
                      style={{ width:'100%', background: sel ? 'rgba(240,165,0,.05)' : 'rgba(19,25,36,.8)', border:`1px solid ${sel ? 'rgba(240,165,0,.35)' : 'var(--border)'}`, borderRadius:8, padding:'10px 12px', cursor:'pointer', textAlign:'left', transition:'all .15s', backdropFilter:'blur(8px)', boxShadow: sel ? '0 0 12px rgba(240,165,0,.06)' : 'none' }}
                    >
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:30, height:30, borderRadius:7, background: sel ? 'rgba(240,165,0,.1)' : 'var(--bg3)', border:`1px solid ${sel ? 'rgba(240,165,0,.25)' : 'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', color: sel ? 'var(--amber)' : 'var(--t1)', flexShrink:0, transition:'all .15s' }}>
                          <DriveIcon removable={d.type === 'removable'}/>
                        </div>
                        <div style={{ flex:1, overflow:'hidden' }}>
                          <div style={{ fontSize:12, fontWeight:600, color: sel ? 'var(--t0)' : 'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.label}</div>
                          <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)', marginTop:1 }}>{d.fs}{d.total ? ` · ${fmt(d.total)}` : ''}</div>
                        </div>
                        {sel && (
                          <div style={{ width:16, height:16, borderRadius:'50%', background:'var(--amber)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2.2 2.2L7 1.5" stroke="#000" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                        )}
                      </div>
                      {d.total > 0 && (
                        <>
                          <div style={{ height:2, background:'var(--bg4)', borderRadius:1, margin:'8px 0 3px', overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${used}%`, background:`linear-gradient(90deg,${sel?'var(--amber)':'var(--cyan)'},${sel?'rgba(240,165,0,.4)':'rgba(0,204,232,.3)'})`, borderRadius:1, transition:'width .4s' }}/>
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

            {/* Scan mode */}
            <section>
              <SectionLabel>Modalità di scansione</SectionLabel>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
                {MODES.map(m => {
                  const on = opts.mode === m.id;
                  return (
                    <button key={m.id} onClick={() => set('mode', m.id)}
                      style={{ padding:'10px 11px', background: on ? 'rgba(255,255,255,.03)' : 'rgba(13,17,23,.8)', border:`1px solid ${on ? m.color.replace('var(--','').replace(')','') === 'amber' ? 'rgba(240,165,0,.4)' : 'rgba(167,139,250,.35)' : 'var(--border)'}`, borderColor: on ? m.color+'55' : 'var(--border)', borderRadius:8, cursor:'pointer', textAlign:'left', transition:'all .14s', backdropFilter:'blur(6px)' }}
                    >
                      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
                        <div style={{ width:18, height:18, borderRadius:5, background: on ? m.color+'18' : 'var(--bg3)', border:`1px solid ${on ? m.color+'44' : 'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .14s' }}>
                          <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke={on ? m.color : 'var(--t2)'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d={m.icon}/>
                          </svg>
                        </div>
                        <span style={{ fontSize:11, fontWeight:600, color: on ? 'var(--t0)' : 'var(--t1)', flex:1 }}>{m.label}</span>
                        <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t2)' }}>{m.time}</span>
                      </div>
                      <p style={{ fontSize:9, color:'var(--t2)', lineHeight:1.5 }}>{m.desc}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* System info */}
            {info && (
              <div style={{ background:'rgba(13,17,23,.85)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px', backdropFilter:'blur(8px)' }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:7, letterSpacing:'.12em', color:'var(--t2)', marginBottom:8, textTransform:'uppercase' }}>Sistema</div>
                {[
                  ['Hostname', info.hostname, null],
                  ['RAM libera', info.ram?.free >= 1e9 ? (info.ram.free/1e9).toFixed(1)+' GB' : '—', null],
                  ['Privilegi', info.isAdmin ? 'Amministratore' : 'Utente standard', info.isAdmin ? 'var(--green)' : 'var(--red)'],
                ].map(([k, v, c]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 0', borderBottom:'1px solid var(--border)' }}>
                    <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)' }}>{k}</span>
                    <span style={{ fontFamily:'var(--mono)', fontSize:8, color: c || 'var(--t1)', fontWeight:500 }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Colonna destra: tipi file ── */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <SectionLabel>Tipi di file</SectionLabel>
              <button
                onClick={() => set('types', allOn ? TYPES.map(t => t.id) : [])}
                style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t2)', border:'1px solid var(--border)', padding:'3px 8px', borderRadius:4, transition:'all .12s' }}
              >
                {allOn ? 'Deseleziona tutti' : 'Seleziona tutti'}
              </button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
              {TYPES.map(t => {
                const on = allOn || opts.types.includes(t.id);
                return (
                  <button key={t.id} onClick={() => toggleType(t.id)}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 9px', border:`1px solid ${on ? 'rgba(255,255,255,.09)' : 'var(--border)'}`, borderRadius:7, background: on ? 'rgba(255,255,255,.025)' : 'transparent', opacity: on ? 1 : .35, cursor:'pointer', textAlign:'left', transition:'all .12s', backdropFilter:'blur(4px)' }}
                  >
                    <div style={{ width:24, height:24, borderRadius:6, background:'var(--bg3)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', color: on ? 'var(--amber)' : 'var(--t2)', flexShrink:0, transition:'color .12s' }}>
                      {TYPE_ICONS[t.id]}
                    </div>
                    <div style={{ flex:1, overflow:'hidden' }}>
                      <div style={{ fontSize:10, fontWeight:500, color: on ? 'var(--t0)' : 'var(--t2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.label}</div>
                      <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--t2)' }}>{t.ext}</div>
                    </div>
                    <div style={{ width:12, height:12, border:`1px solid ${on ? 'var(--amber)' : 'var(--border)'}`, borderRadius:3, background: on ? 'var(--amber)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .12s' }}>
                      {on && <svg width="7" height="7" viewBox="0 0 7 7" fill="none"><path d=".8 3.5l1.8 1.8L6.2.8" stroke="#000" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </button>
                );
              })}
            </div>

            {info && !info.isAdmin && (
              <div style={{ display:'flex', gap:10, padding:'10px 12px', background:'rgba(240,80,80,.04)', border:'1px solid rgba(240,80,80,.18)', borderRadius:8, marginTop:12 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--red)" strokeWidth="1.3" strokeLinecap="round" style={{ flexShrink:0 }}>
                  <path d="M8 2L14.5 13H1.5z"/><line x1="8" y1="6.5" x2="8" y2="9.5"/><circle cx="8" cy="11.5" r=".6" fill="var(--red)"/>
                </svg>
                <p style={{ fontSize:10, color:'var(--t1)', lineHeight:1.55 }}>
                  Avvia come Amministratore per accedere al Cestino di sistema e alla modalità Forense.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CTA footer */}
      <div style={{ flexShrink:0, padding:'11px 26px 13px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', gap:14, background:'rgba(7,9,13,.9)', backdropFilter:'blur(12px)', position:'relative', zIndex:2 }}>
        <button
          onClick={opts.drive ? onStart : undefined}
          style={{ display:'flex', alignItems:'center', gap:9, padding:'10px 26px', background: opts.drive ? 'var(--amber)' : 'var(--bg3)', color: opts.drive ? '#000' : 'var(--t2)', borderRadius:8, fontWeight:700, fontSize:12, cursor: opts.drive ? 'pointer' : 'not-allowed', boxShadow: opts.drive ? '0 0 20px var(--amber-glow), 0 2px 8px rgba(0,0,0,.4)' : 'none', transition:'all .15s', letterSpacing:'.01em' }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="6.5" cy="6.5" r="5.5"/>
            <circle cx="6.5" cy="6.5" r="2"/>
            <line x1="6.5" y1="1" x2="6.5" y2="3"/>
            <line x1="6.5" y1="10" x2="6.5" y2="12"/>
          </svg>
          Avvia scansione{opts.drive ? ` — ${opts.drive}` : ''}
        </button>
        <div style={{ fontSize:10, color:'var(--t2)' }}>
          <span style={{ color:'var(--t1)' }}>{selectedMode?.label}</span>
          {' · '}
          {allOn ? 'Tutti i tipi di file' : `${opts.types.length} tipi selezionati`}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
      <div style={{ width:2, height:10, background:'var(--amber)', borderRadius:1, opacity:.6 }}/>
      <span style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:'.14em', color:'var(--t2)', textTransform:'uppercase' }}>{children}</span>
    </div>
  );
}
