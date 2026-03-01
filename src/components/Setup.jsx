import React from 'react';

const fmt = b => b >= 1e9 ? (b/1e9).toFixed(0)+' GB' : b >= 1e6 ? (b/1e6).toFixed(0)+' MB' : (b/1e3).toFixed(0)+' KB';

const MODES = [
  { id:'quick',    label:'Rapida',       desc:'Solo Cestino ($Recycle.Bin)',                            time:'< 1 min',   color:'var(--green)' },
  { id:'standard', label:'Standard',     desc:'Cestino + VSS Snapshot + cartelle utente',              time:'2–8 min',   color:'var(--amber)' },
  { id:'deep',     label:'Approfondita', desc:'+ Scansione ricorsiva C:\\Users completa',              time:'10–30 min', color:'var(--cyan)'  },
  { id:'full',     label:'Forense',      desc:'+ USN Change Journal NTFS (richiede admin)',            time:'30+ min',   color:'var(--red)'   },
];

const TYPES = [
  { id:'image',        label:'Immagini',      icon:'🖼', ext:'JPG PNG RAW' },
  { id:'video',        label:'Video',         icon:'🎬', ext:'MP4 MKV AVI' },
  { id:'audio',        label:'Audio',         icon:'🎵', ext:'MP3 WAV FLAC' },
  { id:'document',     label:'Documenti',     icon:'📄', ext:'PDF DOCX RTF' },
  { id:'spreadsheet',  label:'Fogli',         icon:'📊', ext:'XLS XLSX CSV' },
  { id:'presentation', label:'Presentaz.',    icon:'📑', ext:'PPT PPTX KEY' },
  { id:'archive',      label:'Archivi',       icon:'📦', ext:'ZIP RAR 7Z'   },
  { id:'code',         label:'Codice',        icon:'💻', ext:'JS PY HTML'   },
  { id:'text',         label:'Testo',         icon:'📝', ext:'TXT MD LOG'   },
  { id:'design',       label:'Design',        icon:'🎨', ext:'PSD AI FIG'   },
];

export default function Setup({ info, drives, opts, setOpts, onStart }) {
  const set = (k, v) => setOpts(o => ({ ...o, [k]: v }));

  const toggleType = id => set('types', opts.types.includes(id)
    ? opts.types.filter(t => t !== id)
    : [...opts.types, id]
  );

  const allTypes = TYPES.map(t => t.id);
  const allOn = opts.types.length === 0;

  const selectedDrive = drives.find(d => d.id === opts.drive);
  const selectedMode  = MODES.find(m => m.id === opts.mode);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      <div style={{ flex:1, overflowY:'auto', padding:'24px 28px 0' }}>

        {/* Header */}
        <div style={{ marginBottom:24 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'.18em', color:'var(--amber)', marginBottom:8 }}>CONFIGURAZIONE</div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'var(--t0)', marginBottom:6 }}>Recupera i tuoi file eliminati</h1>
          <p style={{ fontSize:12, color:'var(--t1)', lineHeight:1.6 }}>
            Il Cestino viene sempre analizzato per primo — lì i file sono integri al 100% con il percorso originale esatto.
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
          {/* Colonna sinistra */}
          <div>
            {/* Disco */}
            <Label>DISCO DA ANALIZZARE</Label>
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:20 }}>
              {drives.map(d => {
                const sel = opts.drive === d.id;
                const used = d.total ? Math.round((1 - d.free/d.total) * 100) : 0;
                return (
                  <button key={d.id}
                    style={{ width:'100%', background: sel ? 'rgba(232,160,32,.07)' : 'var(--bg2)', border:`1px solid ${sel ? 'rgba(232,160,32,.45)' : 'var(--border)'}`, borderRadius:8, padding:'10px 14px', cursor:'pointer', textAlign:'left', transition:'all .12s' }}
                    onClick={() => set('drive', d.id)}
                  >
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:20 }}>{d.type === 'removable' ? '💾' : '🖥'}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'var(--t0)' }}>{d.label}</div>
                        <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)' }}>
                          {d.fs}{d.total ? ` · ${fmt(d.total)}` : ''}
                        </div>
                      </div>
                      {sel && <span style={{ color:'var(--amber)', fontWeight:700 }}>✓</span>}
                    </div>
                    {d.total > 0 && (
                      <>
                        <div style={{ height:2, background:'var(--bg3)', borderRadius:1, margin:'8px 0 4px', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${used}%`, background:'linear-gradient(90deg,var(--cyan),var(--amber))', borderRadius:1 }}/>
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)' }}>
                          <span>{fmt(d.total - d.free)} usati</span>
                          <span>{fmt(d.free)} liberi</span>
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Modalità */}
            <Label>MODALITA'</Label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:20 }}>
              {MODES.map(m => {
                const on = opts.mode === m.id;
                return (
                  <button key={m.id}
                    style={{ padding:'10px 12px', background: on ? 'var(--bg3)' : 'var(--bg2)', border:`1px solid ${on ? m.color+'55' : 'var(--border)'}`, borderRadius:7, cursor:'pointer', textAlign:'left', transition:'all .12s' }}
                    onClick={() => set('mode', m.id)}
                  >
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background: on ? m.color : 'var(--t2)', display:'inline-block', flexShrink:0 }}/>
                      <span style={{ fontSize:12, fontWeight:600, color: on ? m.color : 'var(--t1)' }}>{m.label}</span>
                      <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)', marginLeft:'auto' }}>{m.time}</span>
                    </div>
                    <p style={{ fontSize:10, color:'var(--t2)', lineHeight:1.4 }}>{m.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Info sistema */}
            {info && (
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px' }}>
                {[
                  ['Host',  info.hostname],
                  ['RAM',   info.ram?.free >= 1e9 ? (info.ram.free/1e9).toFixed(1)+' GB liberi' : '—'],
                  ['Admin', info.isAdmin ? '✓ Sì (pieno accesso)' : '✗ No (accesso limitato)', info.isAdmin ? 'var(--green)' : 'var(--red)'],
                ].map(([k, v, c]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', borderBottom:'1px solid var(--border)' }}>
                    <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)' }}>{k}</span>
                    <span style={{ fontFamily:'var(--mono)', fontSize:9, color: c || 'var(--t1)', fontWeight:500 }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Colonna destra — tipi file */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <Label>TIPI DI FILE</Label>
              <button
                style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)', border:'1px solid var(--border)', padding:'2px 8px', borderRadius:3 }}
                onClick={() => set('types', allOn ? [...allTypes] : [])}
              >
                {allOn ? 'Deseleziona tutti' : 'Seleziona tutti'}
              </button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
              {TYPES.map(t => {
                const on = allOn || opts.types.includes(t.id);
                return (
                  <button key={t.id}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', border:'1px solid var(--border)', borderRadius:6, background: on ? 'var(--bg2)' : 'transparent', opacity: on ? 1 : .4, cursor:'pointer', textAlign:'left', transition:'all .1s' }}
                    onClick={() => toggleType(t.id)}
                  >
                    <span style={{ fontSize:14, flexShrink:0 }}>{t.icon}</span>
                    <div style={{ flex:1, overflow:'hidden' }}>
                      <div style={{ fontSize:11, fontWeight:500, color:'var(--t0)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.label}</div>
                      <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)' }}>{t.ext}</div>
                    </div>
                    <div style={{ width:14, height:14, border:`1px solid ${on ? 'var(--amber)' : 'var(--border)'}`, borderRadius:2, background: on ? 'var(--amber)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:8, color:'#000', fontWeight:700 }}>
                      {on && '✓'}
                    </div>
                  </button>
                );
              })}
            </div>

            {info && !info.isAdmin && (
              <div style={{ display:'flex', gap:10, padding:'10px 12px', background:'var(--red-bg)', border:'1px solid rgba(239,68,68,.25)', borderRadius:6, marginTop:12 }}>
                <span style={{ color:'var(--red)', fontSize:16, flexShrink:0 }}>⚠</span>
                <p style={{ fontSize:11, color:'var(--t1)', lineHeight:1.5 }}>
                  Per accedere al Cestino di sistema e alla modalità Forense, avvia l'app come Amministratore.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ flexShrink:0, padding:'12px 28px 14px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', gap:14, background:'var(--bg0)' }}>
        <button
          style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 28px', background: opts.drive ? 'var(--amber)' : 'var(--bg3)', color: opts.drive ? '#000' : 'var(--t2)', borderRadius:7, fontWeight:700, fontSize:13, cursor: opts.drive ? 'pointer' : 'not-allowed', boxShadow: opts.drive ? '0 2px 18px rgba(232,160,32,.22)' : 'none', transition:'all .15s' }}
          onClick={opts.drive ? onStart : undefined}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="7" cy="7" r="5.5"/><circle cx="7" cy="7" r="2"/>
            <line x1="7" y1="1.5" x2="7" y2="3.5"/><line x1="7" y1="10.5" x2="7" y2="12.5"/>
          </svg>
          Avvia Scansione{opts.drive ? ` — ${opts.drive}` : ''}
        </button>
        <span style={{ fontSize:11, color:'var(--t2)' }}>
          {selectedMode?.label} · {allOn ? 'Tutti i tipi' : `${opts.types.length} tipi`}
        </span>
      </div>
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'.14em', color:'var(--t2)', marginBottom:8, textTransform:'uppercase' }}>{children}</div>;
}
