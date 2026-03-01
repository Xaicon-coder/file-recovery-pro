import React, { useState } from 'react';

export default function TitleBar({ api, version, update, onInstall }) {
  const isDl    = update?.event === 'downloading' || update?.event === 'progress';
  const isReady = update?.event === 'ready';
  const pct     = update?.pct ?? 0;

  return (
    <div style={S.bar} data-drag="true">
      {/* Logo */}
      <div style={S.logo}>
        <div style={S.logoIcon}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L13 3.8V8C13 11 10.8 13.8 8 14.6C5.2 13.8 3 11 3 8V3.8z" stroke="var(--amber)" strokeWidth="1.2" fill="rgba(240,165,0,.08)"/>
            <path d="M5.5 8l2 2L11 6" stroke="var(--amber)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--t1)', letterSpacing:'.04em', fontWeight:400 }}>
          File<span style={{ color:'var(--t0)', fontWeight:600 }}>Recovery</span>
        </span>
        <div style={S.badge}>
          PRO{version ? ` · v${version}` : ''}
        </div>
      </div>

      {/* Separator */}
      <div style={{ width:1, height:16, background:'var(--border2)', margin:'0 12px', flexShrink:0 }}/>

      {/* Update area */}
      {isDl && (
        <div style={S.updateArea} data-drag="false">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ animation:'spin .9s linear infinite', flexShrink:0 }}>
            <circle cx="5.5" cy="5.5" r="4" stroke="var(--amber)" strokeWidth="1.3" strokeDasharray="14 8" strokeLinecap="round"/>
          </svg>
          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--amber)' }}>
            Aggiornamento{update.version ? ` v${update.version}` : ''} in download
          </span>
          <div style={{ display:'flex', alignItems:'center', gap:5, marginLeft:6 }}>
            <div style={{ width:100, height:2, background:'rgba(255,255,255,.06)', borderRadius:1, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:'var(--amber)', transition:'width .4s', borderRadius:1 }}/>
            </div>
            <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t1)', minWidth:26 }}>{pct}%</span>
          </div>
        </div>
      )}

      {isReady && (
        <button style={S.readyBtn} onClick={onInstall} data-drag="false">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 1v6M2 5l3 3 3-3M1 9h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          v{update.version} pronto — installa e riavvia
        </button>
      )}

      {/* Window controls */}
      <div style={{ display:'flex', alignItems:'center', marginLeft:'auto', gap:0 }}>
        <WinBtn onClick={api.min} title="Minimizza">
          <svg width="10" height="1" viewBox="0 0 10 1"><line x1="0" y1=".5" x2="10" y2=".5" stroke="currentColor" strokeWidth="1.2"/></svg>
        </WinBtn>
        <WinBtn onClick={api.max} title="Massimizza">
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><rect x=".5" y=".5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>
        </WinBtn>
        <WinBtn onClick={api.close} danger title="Chiudi">
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <line x1="1" y1="1" x2="8" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <line x1="8" y1="1" x2="1" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </WinBtn>
      </div>

      <style>{`
        [data-drag="true"]{-webkit-app-region:drag}
        [data-drag="false"],button{-webkit-app-region:no-drag!important}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}

function WinBtn({ onClick, danger, title, children }) {
  const [h, setH] = useState(false);
  return (
    <button
      title={title}
      style={{ width:40, height:36, display:'flex', alignItems:'center', justifyContent:'center', color: h ? (danger ? '#fff' : 'var(--t0)') : 'var(--t2)', background: h ? (danger ? '#c0392b' : 'rgba(255,255,255,.06)') : 'transparent', transition:'background .12s, color .12s' }}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onClick={onClick}
    >{children}</button>
  );
}

const S = {
  bar: { height:36, flexShrink:0, background:'rgba(12,16,24,.96)', borderBottom:'1px solid var(--border)', backdropFilter:'blur(20px)', display:'flex', alignItems:'center', paddingLeft:12, WebkitAppRegion:'drag', position:'relative', zIndex:100 },
  logo: { display:'flex', alignItems:'center', gap:7, flexShrink:0 },
  logoIcon: { width:26, height:26, borderRadius:6, background:'rgba(240,165,0,.06)', border:'1px solid rgba(240,165,0,.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  badge: { fontFamily:'var(--mono)', fontSize:7, background:'rgba(240,165,0,.1)', color:'var(--amber)', border:'1px solid rgba(240,165,0,.2)', padding:'2px 6px', borderRadius:3, letterSpacing:'.1em', fontWeight:600 },
  updateArea: { display:'flex', alignItems:'center', gap:7, padding:'4px 10px', background:'rgba(240,165,0,.05)', border:'1px solid rgba(240,165,0,.15)', borderRadius:5 },
  readyBtn: { display:'flex', alignItems:'center', gap:6, fontFamily:'var(--mono)', fontSize:8, color:'#000', background:'var(--amber)', border:'none', borderRadius:4, padding:'5px 12px', cursor:'pointer', fontWeight:700, letterSpacing:'.04em', animation:'glow 2s ease infinite', boxShadow:'0 0 12px var(--amber-glow)' },
};
