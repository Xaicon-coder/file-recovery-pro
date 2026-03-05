import React from 'react';

const NAV = [
  { id:'setup',    label:'SCAN',   d:'M12 2a10 10 0 100 20A10 10 0 0012 2zm0 4a6 6 0 010 12A6 6 0 0112 6zm0 3a3 3 0 000 6 3 3 0 000-6z' },
  { id:'results',  label:'FILES',  d:'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8' },
  { id:'recovery', label:'RIPRIST',d:'M12 2v8h8M12 2L5 2a2 2 0 00-2 2v16a2 2 0 002 2h14a2 2 0 002-2V10l-6-8zM8 18l4-4 4 4M12 14v6' },
  { id:'updates',  label:'UPDATE', d:'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12' },
];

export default function Sidebar({ view, setView, hasResults, updateReady }) {
  return (
    <aside style={{ width:62, flexShrink:0, background:'rgba(1,12,4,.95)', borderRight:'1px solid var(--b0)', display:'flex', flexDirection:'column', alignItems:'center', paddingTop:4, position:'relative', overflow:'hidden', zIndex:10 }}>

      {/* Scan beam */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'var(--b1)' }}/>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,transparent,var(--p0),transparent)', animation:'scanH 5s ease-in-out infinite', zIndex:2, pointerEvents:'none' }}/>

      {NAV.map(n => {
        const active = view === n.id || (view === 'scanning' && n.id === 'setup');
        const locked = (n.id === 'results' || n.id === 'recovery') && !hasResults;
        return (
          <button key={n.id}
            title={locked ? 'Completa prima una scansione' : n.label}
            onClick={() => !locked && setView(n.id)}
            disabled={locked}
            style={{ width:'100%', height:60, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:5, background:active ? 'rgba(0,255,65,.06)' : 'transparent', border:'none', cursor:locked ? 'not-allowed' : 'pointer', position:'relative', transition:'background .14s', opacity:locked ? .2 : 1 }}>

            {active && <>
              <div style={{ position:'absolute', left:0, top:'14%', bottom:'14%', width:2, background:'var(--p0)', borderRadius:'0 2px 2px 0', boxShadow:'0 0 12px var(--p0), 0 0 22px var(--p-glow)' }}/>
              <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 0 50%, rgba(0,255,65,.1) 0%, transparent 62%)' }}/>
            </>}

            <div style={{ position:'relative' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                stroke={active ? 'var(--p0)' : locked ? 'var(--t3)' : 'var(--t2)'}
                strokeWidth={active ? '1.7' : '1.4'}
                strokeLinecap="round" strokeLinejoin="round"
                style={{ filter:active ? 'drop-shadow(0 0 5px var(--p0))' : 'none', transition:'all .14s' }}>
                <path d={n.d}/>
              </svg>
              {n.id === 'updates' && updateReady && !active && (
                <div style={{ position:'absolute', top:-3, right:-3, width:7, height:7, borderRadius:'50%', background:'var(--a0)', boxShadow:'0 0 10px var(--a-glow)', animation:'glowP 1.8s ease infinite' }}/>
              )}
              {n.id === 'results' && hasResults && !active && (
                <div style={{ position:'absolute', top:-3, right:-3, width:6, height:6, borderRadius:'50%', background:'var(--a0)', boxShadow:'0 0 7px var(--a-glow)' }}/>
              )}
            </div>

            <span style={{ fontFamily:'var(--mono)', fontSize:6.5, color:active ? 'var(--p0)' : locked ? 'var(--t3)' : 'var(--t2)', letterSpacing:'.08em', transition:'color .14s' }}>
              {n.label}
            </span>
          </button>
        );
      })}

      <div style={{ marginTop:'auto', marginBottom:10, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
        {[0,1,2].map(i => <div key={i} style={{ width:2, height:2, borderRadius:'50%', background:'var(--t3)' }}/>)}
      </div>
    </aside>
  );
}
