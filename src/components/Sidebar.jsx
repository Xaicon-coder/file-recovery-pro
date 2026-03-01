import React from 'react';

const NAV = [
  { id:'setup',    label:'Scan',      icon:'M9 2a7 7 0 100 14A7 7 0 009 2zM9 6v3l2 2' },
  { id:'results',  label:'Risultati', icon:'M3 4h12M3 8h10M3 12h7' },
  { id:'recovery', label:'Recupero',  icon:'M9 13V5m-3.5 4L9 5l3.5 4M3 15h12' },
];

export default function Sidebar({ view, setView, hasResults }) {
  return (
    <aside style={{ width:64, flexShrink:0, background:'var(--bg1)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', paddingTop:4 }}>
      {NAV.map(({ id, label, icon }) => {
        const active = view === id || (view === 'scanning' && id === 'setup');
        const locked = (id === 'results' || id === 'recovery') && !hasResults;
        return (
          <button key={id}
            style={{ width:'100%', height:58, background: active ? 'rgba(232,160,32,.07)' : 'transparent', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, position:'relative', color: active ? 'var(--amber)' : 'var(--t2)', opacity: locked ? .3 : 1, cursor: locked ? 'not-allowed' : 'pointer', transition:'background .12s' }}
            onClick={() => !locked && setView(id)}
            title={locked ? 'Completa prima una scansione' : label}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d={icon}/>
            </svg>
            <span style={{ fontSize:8, fontFamily:'var(--mono)', letterSpacing:'.06em' }}>{label}</span>
            {active && <div style={{ position:'absolute', right:0, top:'20%', bottom:'20%', width:2, background:'var(--amber)', borderRadius:'2px 0 0 2px' }}/>}
          </button>
        );
      })}
    </aside>
  );
}
