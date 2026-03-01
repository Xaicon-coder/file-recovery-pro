import React, { useState } from 'react';

export default function TitleBar({ api, version, update, onInstall }) {
  const isDownloading = update?.event === 'downloading' || update?.event === 'progress';
  const isReady       = update?.event === 'ready';
  const pct           = update?.pct ?? 0;

  return (
    <div style={S.bar}>
      <div style={S.logo}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 1.5L15 5V10C15 13.2 12.3 16 9 17C5.7 16 3 13.2 3 10V5z" stroke="#e8a020" strokeWidth="1.3" fill="none"/>
          <path d="M6.5 9.5l2 2L12 7" stroke="#e8a020" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--t1)', letterSpacing:'.05em' }}>
          File<b style={{ color:'var(--t0)' }}>Recovery</b>
        </span>
        <span style={{ fontFamily:'var(--mono)', fontSize:8, background:'var(--amber-bg)', color:'var(--amber)', padding:'2px 7px', borderRadius:2, letterSpacing:'.1em' }}>
          PRO{version ? ` v${version}` : ''}
        </span>
      </div>

      {isDownloading && (
        <div style={S.center}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ animation:'spin .9s linear infinite' }}>
              <circle cx="5" cy="5" r="4" stroke="var(--amber)" strokeWidth="1.3" strokeDasharray="16 8" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--amber)' }}>
              Aggiornamento{update.version ? ` v${update.version}` : ''} in download...
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
            <div style={{ width:160, height:2, background:'rgba(255,255,255,.07)', borderRadius:1, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:'var(--amber)', transition:'width .3s' }}/>
            </div>
            <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--t2)', minWidth:28 }}>{pct}%</span>
          </div>
        </div>
      )}

      {isReady && (
        <button style={S.readyBtn} onClick={onInstall}>
          ↑ v{update.version} pronto — clicca per installare e riavviare
        </button>
      )}

      <div style={{ display:'flex', alignItems:'center', marginLeft:'auto' }}>
        {['─','□','✕'].map((s, i) => (
          <WinBtn key={s} sym={s} fn={[api.min, api.max, api.close][i]} danger={i===2} />
        ))}
      </div>

      <style>{`
        [data-drag]{-webkit-app-region:drag}
        button{-webkit-app-region:no-drag!important}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}

function WinBtn({ sym, fn, danger }) {
  const [h, setH] = useState(false);
  return (
    <button
      style={{ width:44, height:40, background:h?(danger?'#c0392b':'rgba(255,255,255,.07)'):'transparent', color:h?'#fff':'var(--t2)', fontSize:13, transition:'background .1s', display:'flex', alignItems:'center', justifyContent:'center' }}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onClick={fn}
    >{sym}</button>
  );
}

const S = {
  bar:      { height:40, flexShrink:0, background:'var(--bg1)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', paddingLeft:14, WebkitAppRegion:'drag', position:'relative' },
  logo:     { display:'flex', alignItems:'center', gap:8, flexShrink:0 },
  center:   { position:'absolute', left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:0 },
  readyBtn: { position:'absolute', left:'50%', transform:'translateX(-50%)', fontFamily:'var(--mono)', fontSize:9, color:'#000', background:'var(--amber)', border:'none', borderRadius:3, padding:'6px 16px', cursor:'pointer', fontWeight:700, whiteSpace:'nowrap', letterSpacing:'.04em' },
};
