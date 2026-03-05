import React from 'react';

const STATUS = {
  setup:    { label:'STANDBY',    col:'var(--t2)',  pulse:false },
  scanning: { label:'SCANNING',   col:'var(--p0)',  pulse:true  },
  results:  { label:'ANALISI',    col:'var(--a0)',  pulse:false },
  recovery: { label:'RIPRISTINO', col:'#00ffee',    pulse:true  },
  updates:  { label:'UPDATE',     col:'var(--a0)',  pulse:false },
};

export default function TitleBar({ api, version, update, onInstall, view, onUpdates }) {
  const isDl    = update?.event === 'downloading' || update?.event === 'progress';
  const isReady = update?.event === 'ready';
  const pct     = update?.pct ?? 0;
  const st      = STATUS[view] || STATUS.setup;

  return (
    <div data-drag="true" style={S.bar}>

      {/* Logo */}
      <div style={S.logo}>
        <div style={S.logoIcon}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="var(--p0)" strokeWidth="1.1" fill="rgba(0,255,65,.05)"/>
            <circle cx="7" cy="7" r="3"   stroke="var(--p0)" strokeWidth=".7"  fill="none" opacity=".5"/>
            <circle cx="7" cy="7" r="1.2" fill="var(--p0)" style={{filter:'drop-shadow(0 0 3px var(--p0))'}}/>
            <line x1="7"   y1="1.5" x2="7"    y2="3"    stroke="var(--p0)" strokeWidth=".8" opacity=".6"/>
            <line x1="7"   y1="11"  x2="7"    y2="12.5" stroke="var(--p0)" strokeWidth=".8" opacity=".6"/>
            <line x1="1.5" y1="7"   x2="3"    y2="7"    stroke="var(--p0)" strokeWidth=".8" opacity=".6"/>
            <line x1="11"  y1="7"   x2="12.5" y2="7"    stroke="var(--p0)" strokeWidth=".8" opacity=".6"/>
          </svg>
        </div>
        <span style={{ fontFamily:'var(--display)', fontSize:11.5, fontWeight:700, letterSpacing:'.07em', color:'var(--t0)' }}>
          FILE<span style={{ color:'var(--p0)', textShadow:'0 0 8px var(--p0)' }}>RECOVERY</span>
        </span>
        <span style={S.badge}>PRO{version ? ` v${version}` : ''}</span>
      </div>

      <div style={S.divider}/>

      {/* Status dot + label */}
      <div style={{ display:'flex', alignItems:'center', gap:7, flexShrink:0 }}>
        <span style={{ position:'relative', display:'inline-flex', width:7, height:7 }}>
          <span style={{ position:'absolute', inset:0, borderRadius:'50%', background:st.col, boxShadow:`0 0 7px ${st.col}` }}/>
          {st.pulse && <span style={{ position:'absolute', inset:-3, borderRadius:'50%', border:`1px solid ${st.col}`, animation:'ping 1.5s ease-out infinite' }}/>}
        </span>
        <span style={{ fontFamily:'var(--mono)', fontSize:8.5, color:st.col, letterSpacing:'.16em' }}>{st.label}</span>
      </div>

      {/* Download progress */}
      {isDl && (
        <div data-drag="false" style={S.dlArea}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ animation:'spin .9s linear infinite', flexShrink:0 }}>
            <circle cx="5" cy="5" r="4" stroke="var(--a0)" strokeWidth="1.3" strokeDasharray="14 8" strokeLinecap="round"/>
          </svg>
          <span style={{ fontFamily:'var(--mono)', fontSize:8.5, color:'var(--a0)', whiteSpace:'nowrap' }}>
            v{update.version || '?'} download
          </span>
          <div style={{ width:80, height:2, background:'rgba(255,204,0,.1)', borderRadius:1, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background:'var(--a0)', transition:'width .3s', borderRadius:1 }}/>
          </div>
          <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--a0)', minWidth:24 }}>{pct}%</span>
        </div>
      )}

      {/* Install ready */}
      {isReady && (
        <button data-drag="false" onClick={onInstall} style={S.installBtn}>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M4.5 1v5M2 4.5l2.5 2.5L7 4.5M1 8h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          v{update.version} — installa
        </button>
      )}

      {/* UPD shortcut (idle) */}
      {!isDl && !isReady && (
        <button data-drag="false" onClick={onUpdates} title="Aggiornamenti"
          style={{ display:'flex', alignItems:'center', gap:5, marginLeft:10, padding:'3px 8px', border:'1px solid var(--b0)', borderRadius:3, fontFamily:'var(--mono)', fontSize:7.5, color:'var(--t2)', cursor:'pointer', background:'transparent', letterSpacing:'.1em', transition:'border-color .12s, color .12s' }}>
          <svg width="9" height="9" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <path d="M10 5.5A4.5 4.5 0 115.5 10"/><path d="M10 2.5v3H7"/>
          </svg>
          UPD
        </button>
      )}

      <Clock/>

      {/* Window controls */}
      <div style={{ display:'flex', alignItems:'center', marginLeft:8 }}>
        <WBtn onClick={api.min}><svg width="10" height="1" viewBox="0 0 10 1"><line x1="0" y1=".5" x2="10" y2=".5" stroke="currentColor" strokeWidth="1.2"/></svg></WBtn>
        <WBtn onClick={api.max}><svg width="9" height="9" viewBox="0 0 9 9" fill="none"><rect x=".5" y=".5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg></WBtn>
        <WBtn onClick={api.close} red>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <line x1="1" y1="1" x2="8" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <line x1="8" y1="1" x2="1" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </WBtn>
      </div>

      <style>{`
        [data-drag="true"]{-webkit-app-region:drag}
        [data-drag="false"],button{-webkit-app-region:no-drag!important}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes ping{0%{transform:scale(1);opacity:.8}100%{transform:scale(2.8);opacity:0}}
      `}</style>
    </div>
  );
}

function Clock() {
  const [t, setT] = React.useState(() => new Date());
  React.useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  const p = n => String(n).padStart(2,'0');
  return (
    <div style={{ marginLeft:'auto', fontFamily:'var(--mono)', fontSize:8.5, color:'var(--t2)', letterSpacing:'.1em', flexShrink:0 }}>
      {p(t.getHours())}:{p(t.getMinutes())}:{p(t.getSeconds())}
    </div>
  );
}

function WBtn({ onClick, red, children }) {
  const [h, setH] = React.useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ width:38, height:36, display:'flex', alignItems:'center', justifyContent:'center', border:'none', color:h?(red?'#fff':'var(--p0)'):'var(--t2)', background:h?(red?'rgba(220,38,38,.5)':'rgba(0,255,65,.06)'):'transparent', transition:'all .12s' }}>
      {children}
    </button>
  );
}

const S = {
  bar:        { height:36, flexShrink:0, background:'rgba(0,8,2,.97)', borderBottom:'1px solid var(--b1)', backdropFilter:'blur(20px)', display:'flex', alignItems:'center', paddingLeft:12, paddingRight:0, zIndex:100 },
  logo:       { display:'flex', alignItems:'center', gap:8, flexShrink:0 },
  logoIcon:   { width:24, height:24, borderRadius:5, background:'rgba(0,255,65,.05)', border:'1px solid var(--b1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  badge:      { fontFamily:'var(--mono)', fontSize:7.5, color:'var(--p0)', background:'var(--p-bg)', border:'1px solid var(--b1)', borderRadius:2, padding:'2px 6px', letterSpacing:'.12em' },
  divider:    { width:1, height:14, background:'var(--b1)', margin:'0 12px', flexShrink:0 },
  dlArea:     { display:'flex', alignItems:'center', gap:7, marginLeft:12, padding:'3px 10px', background:'rgba(255,204,0,.04)', border:'1px solid rgba(255,204,0,.18)', borderRadius:4 },
  installBtn: { display:'flex', alignItems:'center', gap:6, marginLeft:12, padding:'5px 12px', background:'var(--p0)', color:'#000', borderRadius:3, fontFamily:'var(--display)', fontSize:9, fontWeight:700, letterSpacing:'.1em', cursor:'pointer', border:'none', boxShadow:'0 0 14px var(--p-glow)' },
};
