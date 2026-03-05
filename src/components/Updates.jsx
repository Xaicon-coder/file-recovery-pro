import React, { useState, useRef, useEffect } from 'react';

const fmtSpeed = b => !b ? '' : b >= 1e6 ? (b/1e6).toFixed(1)+' MB/s' : (b/1e3).toFixed(0)+' KB/s';

// Matrix rain canvas background
function MatrixRain() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d');
    const dpr = devicePixelRatio || 1;
    const resize = () => { c.width=c.offsetWidth*dpr; c.height=c.offsetHeight*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); };
    resize(); window.addEventListener('resize', resize);
    const CHARS = '01アイウエカキク█▓▒░▀▄';
    let cols = Math.floor(c.offsetWidth / 16);
    let drops = Array.from({length: cols}, () => Math.random() * -60);
    let raf;
    const draw = () => {
      const W = c.offsetWidth, H = c.offsetHeight;
      if (Math.floor(W/16) !== cols) { cols=Math.floor(W/16); drops=Array.from({length:cols},()=>Math.random()*-60); }
      ctx.fillStyle = 'rgba(0,8,2,.16)'; ctx.fillRect(0,0,W,H);
      ctx.font = '10px "Share Tech Mono",monospace';
      drops.forEach((y,i) => {
        const x = i * 16;
        ctx.fillStyle = `rgba(0,255,65,${.5+Math.random()*.4})`; ctx.fillText(CHARS[Math.floor(Math.random()*CHARS.length)], x, y*16);
        for (let t=1;t<5;t++) { if((y-t)*16<0) continue; ctx.fillStyle=`rgba(0,255,65,${Math.max(0,.3-t*.07)})`; ctx.fillText(CHARS[Math.floor(Math.random()*CHARS.length)],x,(y-t)*16); }
        if (y*16 > H && Math.random() > .975) drops[i]=0; else drops[i]+=.38;
      });
      raf = requestAnimationFrame(draw);
    };
    draw(); return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',opacity:.12}}/>;
}

// SVG progress ring
function Ring({ pct, size=108, col='var(--a0)' }) {
  const r = size/2-5, circ = 2*Math.PI*r, dash = circ*(pct/100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{transform:'rotate(-90deg)'}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,255,65,.06)" strokeWidth={5.5}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={5.5}
        strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
        style={{transition:'stroke-dasharray .4s ease', filter:`drop-shadow(0 0 5px ${col})`}}/>
    </svg>
  );
}

// Changelog bullet list
function Changelog({ notes }) {
  const lines = (typeof notes==='string'?notes:String(notes)).split('\n').map(l=>l.trim()).filter(Boolean);
  return (
    <div style={{display:'flex',flexDirection:'column',gap:5}}>
      {lines.map((l,i) => (
        <div key={i} style={{display:'flex',alignItems:'flex-start',gap:8}}>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" style={{flexShrink:0,marginTop:2}}>
            <path d="M1 4.5l2.2 2.2L8 1.5" stroke="var(--p0)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{fontSize:11,color:'var(--t1)',lineHeight:1.55}}>{l.replace(/^[•\-*]\s*/,'')}</span>
        </div>
      ))}
    </div>
  );
}

export default function Updates({ update, api, version, onBack }) {
  const [busy, setBusy] = useState(false);
  const ev = update?.event;
  const isDl    = ev==='downloading'||ev==='progress';
  const isReady = ev==='ready';
  const isErr   = ev==='error';
  const isNone  = ev==='none';
  const pct     = update?.pct ?? 0;

  const check = async () => {
    setBusy(true);
    try { await api?.updater?.check?.(); }
    finally { setTimeout(() => setBusy(false), 3000); }
  };

  const stKey = busy||ev==='checking' ? 'check' : isDl ? 'dl' : isReady ? 'ready' : isErr ? 'err' : isNone ? 'ok' : 'idle';
  const ST = {
    idle:  { col:'var(--t2)',  title:'In attesa',                          sub:'Nessun controllo in corso. Usa il bottone per verificare manualmente.' },
    check: { col:'var(--p0)',  title:'Verifica in corso…',                 sub:'Connessione ai server GitHub Releases.' },
    dl:    { col:'var(--a0)',  title:`Download v${update?.version||''}…`,  sub:'Aggiornamento scaricato automaticamente in background.' },
    ready: { col:'var(--p0)',  title:`v${update?.version||''} pronto!`,    sub:'Scaricato e verificato. Installa subito o alla prossima chiusura.' },
    ok:    { col:'var(--p0)',  title:'Sei aggiornato!',                    sub:`Versione corrente v${version||'—'} — nessun aggiornamento disponibile.` },
    err:   { col:'var(--r0)',  title:'Errore di connessione',              sub:update?.message||'Controlla la connessione a internet e riprova.' },
  };
  const st = ST[stKey];

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',position:'relative',overflow:'hidden'}}>
      <MatrixRain/>
      <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(0,255,65,.012) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,65,.012) 1px,transparent 1px)',backgroundSize:'36px 36px',pointerEvents:'none'}}/>

      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'28px 24px',position:'relative',zIndex:1,overflowY:'auto'}}>

        {/* Header */}
        <div style={{width:'100%',maxWidth:620,marginBottom:22}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
            <button onClick={onBack}
              style={{display:'flex',alignItems:'center',gap:6,fontFamily:'var(--mono)',fontSize:8,color:'var(--t2)',background:'transparent',border:'1px solid var(--b0)',padding:'4px 10px',borderRadius:4,cursor:'pointer',letterSpacing:'.1em',transition:'all .12s'}}>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 1L2 4l3 3"/></svg>
              TORNA
            </button>
            <div style={{flex:1,height:1,background:'linear-gradient(90deg,var(--b1),transparent)'}}/>
            <span style={{fontFamily:'var(--mono)',fontSize:7,color:'var(--t2)',letterSpacing:'.22em'}}>// SYSTEM.UPDATE</span>
          </div>
          <h1 style={{fontFamily:'var(--display)',fontSize:22,fontWeight:700,letterSpacing:'.06em',color:'var(--t0)',textShadow:'0 0 22px rgba(0,255,65,.14)'}}>
            AGGIORNAMENTI
          </h1>
        </div>

        {/* Card */}
        <div style={{width:'100%',maxWidth:620,background:'rgba(1,13,5,.9)',border:`1px solid ${st.col}22`,borderRadius:12,overflow:'hidden',backdropFilter:'blur(14px)'}}>
          <div style={{height:2,background:`linear-gradient(90deg,transparent,${st.col}bb,transparent)`}}/>
          <div style={{padding:'24px 24px 22px'}}>

            {/* Status row */}
            <div style={{display:'flex',alignItems:'center',gap:22,marginBottom:22}}>
              <div style={{flexShrink:0,position:'relative',width:108,height:108}}>
                {isDl ? (
                  <>
                    <Ring pct={pct}/>
                    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                      <span style={{fontFamily:'var(--display)',fontSize:22,fontWeight:700,color:'var(--a0)',lineHeight:1}}>{pct}%</span>
                      {update?.bps>0 && <span style={{fontFamily:'var(--mono)',fontSize:7,color:'var(--t2)',marginTop:3}}>{fmtSpeed(update.bps)}</span>}
                    </div>
                  </>
                ) : (
                  <div style={{width:108,height:108,borderRadius:'50%',border:`2px solid ${st.col}28`,background:`${st.col}07`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {stKey==='check' && <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={{animation:'spin 1.1s linear infinite'}}><circle cx="18" cy="18" r="15" stroke="var(--p0)" strokeWidth="3" strokeDasharray="52 22" strokeLinecap="round"/></svg>}
                    {(stKey==='ready'||stKey==='ok') && <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M5 18l8.5 8.5L31 8" stroke="var(--p0)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{filter:'drop-shadow(0 0 7px var(--p0))'}}/></svg>}
                    {stKey==='err' && <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M18 4L33 32H3z" stroke="var(--r0)" strokeWidth="2.5" strokeLinejoin="round"/><line x1="18" y1="14" x2="18" y2="22" stroke="var(--r0)" strokeWidth="2.5" strokeLinecap="round"/><circle cx="18" cy="27" r="2" fill="var(--r0)"/></svg>}
                    {stKey==='idle' && <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="14" stroke="var(--t2)" strokeWidth="2"/><path d="M18 10v9l5.5 3" stroke="var(--t2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                )}
              </div>

              <div style={{flex:1}}>
                <div style={{fontFamily:'var(--mono)',fontSize:7.5,letterSpacing:'.2em',color:st.col,marginBottom:5,textShadow:`0 0 6px ${st.col}`}}>{stKey.toUpperCase()}</div>
                <h2 style={{fontFamily:'var(--display)',fontSize:17,fontWeight:700,color:'var(--t0)',marginBottom:6,lineHeight:1.25}}>{st.title}</h2>
                <p style={{fontSize:11.5,color:'var(--t1)',lineHeight:1.65}}>{st.sub}</p>
                {isDl && (
                  <div style={{marginTop:10}}>
                    <div style={{height:2.5,background:'rgba(255,204,0,.07)',borderRadius:2,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,var(--a1),var(--a0))',borderRadius:2,transition:'width .3s',position:'relative',overflow:'hidden'}}>
                        <div style={{position:'absolute',inset:0,background:'linear-gradient(90deg,transparent,rgba(255,255,255,.25),transparent)',animation:'shimmer 1.2s linear infinite'}}/>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Changelog */}
            {(isReady||isDl) && update?.notes && (
              <div style={{background:'rgba(0,0,0,.2)',border:'1px solid var(--b0)',borderRadius:8,padding:'12px 15px',marginBottom:18}}>
                <div style={{fontFamily:'var(--mono)',fontSize:7.5,letterSpacing:'.18em',color:'var(--t2)',marginBottom:8}}>// CHANGELOG v{update.version}</div>
                <Changelog notes={update.notes}/>
              </div>
            )}

            {/* Version grid */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7,marginBottom:18}}>
              {[
                {l:'CORRENTE',   v: version ? `v${version}` : '—'},
                {l:'DISPONIBILE',v: update?.version ? `v${update.version}` : isNone ? `v${version}` : '—'},
                {l:'CANALE',     v: 'STABLE/GITHUB'},
              ].map(({l,v}) => (
                <div key={l} style={{background:'rgba(0,0,0,.18)',border:'1px solid var(--b0)',borderRadius:7,padding:'9px 11px'}}>
                  <div style={{fontFamily:'var(--mono)',fontSize:7,color:'var(--t2)',letterSpacing:'.1em',marginBottom:3}}>{l}</div>
                  <div style={{fontFamily:'var(--display)',fontSize:13,fontWeight:700,color:'var(--t0)'}}>{v}</div>
                </div>
              ))}
            </div>

            {/* Info note */}
            <div style={{display:'flex',gap:9,padding:'9px 12px',background:'rgba(0,255,65,.025)',border:'1px solid var(--b0)',borderRadius:7,marginBottom:18}}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--p2)" strokeWidth="1.2" strokeLinecap="round" style={{flexShrink:0,marginTop:1}}>
                <circle cx="6" cy="6" r="5"/><line x1="6" y1="3.5" x2="6" y2="6.5"/><circle cx="6" cy="8.5" r=".6" fill="var(--p2)"/>
              </svg>
              <p style={{fontSize:10.5,color:'var(--t2)',lineHeight:1.6}}>
                Gli aggiornamenti vengono scaricati <strong style={{color:'var(--t1)'}}>automaticamente in background</strong> e installati alla chiusura. Puoi forzare l'installazione subito.
              </p>
            </div>

            {/* Actions */}
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {!isReady && !isDl && (
                <button onClick={check} disabled={busy}
                  style={{display:'flex',alignItems:'center',gap:8,padding:'10px 20px',background:'rgba(0,255,65,.06)',border:'1px solid var(--b1)',borderRadius:6,color:'var(--p0)',fontFamily:'var(--display)',fontWeight:600,fontSize:12,letterSpacing:'.08em',cursor:busy?'not-allowed':'pointer',opacity:busy?.55:1,transition:'all .13s'}}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" style={{animation:busy?'spin 1s linear infinite':'none'}}>
                    <path d="M11.5 6.5A5 5 0 106.5 11.5"/><path d="M11.5 3v3.5H8"/>
                  </svg>
                  {busy ? 'VERIFICA…' : 'CONTROLLA AGGIORNAMENTI'}
                </button>
              )}
              {isReady && (
                <button onClick={() => api?.updater?.install?.()}
                  style={{display:'flex',alignItems:'center',gap:8,padding:'10px 22px',background:'var(--p0)',color:'#000',borderRadius:6,fontFamily:'var(--display)',fontWeight:700,fontSize:12,letterSpacing:'.1em',cursor:'pointer',boxShadow:'0 0 20px var(--p-glow)',border:'none'}}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M6 1v7M3 5.5l3 3 3-3M1 11h10"/>
                  </svg>
                  INSTALLA E RIAVVIA
                </button>
              )}
              {isDl && (
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 16px',background:'rgba(255,204,0,.06)',border:'1px solid rgba(255,204,0,.2)',borderRadius:6}}>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{animation:'spin .9s linear infinite'}}>
                    <circle cx="5.5" cy="5.5" r="4.5" stroke="var(--a0)" strokeWidth="1.5" strokeDasharray="16 8" strokeLinecap="round"/>
                  </svg>
                  <span style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--a0)',letterSpacing:'.1em'}}>DOWNLOAD {pct}%</span>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}} @keyframes shimmer{from{transform:translateX(-100%)}to{transform:translateX(300%)}}"}</style>
    </div>
  );
}
