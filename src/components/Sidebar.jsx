import React from 'react';

const ICONS = {
  setup: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="7"/>
      <circle cx="9" cy="9" r="2.5"/>
      <line x1="9" y1="1.5" x2="9" y2="4"/>
      <line x1="9" y1="14" x2="9" y2="16.5"/>
      <line x1="1.5" y1="9" x2="4" y2="9"/>
      <line x1="14" y1="9" x2="16.5" y2="9"/>
    </svg>
  ),
  results: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="14" height="14" rx="2"/>
      <line x1="5" y1="6" x2="13" y2="6"/>
      <line x1="5" y1="9" x2="11" y2="9"/>
      <line x1="5" y1="12" x2="8" y2="12"/>
    </svg>
  ),
  recovery: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14V5"/>
      <path d="M5.5 9L9 5l3.5 4"/>
      <path d="M3 16h12"/>
    </svg>
  ),
};

const NAV = [
  { id:'setup',    label:'Scansione' },
  { id:'results',  label:'Risultati' },
  { id:'recovery', label:'Recupero'  },
];

export default function Sidebar({ view, setView, hasResults }) {
  return (
    <aside style={S.aside}>
      {/* Top glow line */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(240,165,0,.3),transparent)' }}/>

      {NAV.map(({ id, label }) => {
        const active  = view === id || (view === 'scanning' && id === 'setup');
        const locked  = (id === 'results' || id === 'recovery') && !hasResults;
        return (
          <button key={id}
            title={locked ? 'Completa prima una scansione' : label}
            onClick={() => !locked && setView(id)}
            style={{
              ...S.btn,
              color:      active ? 'var(--amber)' : locked ? 'var(--t3)' : 'var(--t2)',
              background: active ? 'rgba(240,165,0,.06)' : 'transparent',
              cursor:     locked ? 'not-allowed' : 'pointer',
            }}
          >
            {/* Active indicator */}
            {active && (
              <div style={{ position:'absolute', left:0, top:'18%', bottom:'18%', width:2, background:'var(--amber)', borderRadius:'0 2px 2px 0', boxShadow:'0 0 8px var(--amber-glow)' }}/>
            )}

            {/* Icon with glow */}
            <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {active && (
                <div style={{ position:'absolute', inset:-6, borderRadius:'50%', background:'radial-gradient(circle, rgba(240,165,0,.12) 0%, transparent 70%)' }}/>
              )}
              {ICONS[id]}
            </div>

            <span style={{ fontFamily:'var(--mono)', fontSize:7, letterSpacing:'.06em', textTransform:'uppercase', marginTop:1 }}>{label}</span>

            {/* Dot indicator for results */}
            {id === 'results' && hasResults && !active && (
              <div style={{ width:4, height:4, borderRadius:'50%', background:'var(--amber)', position:'absolute', top:8, right:10, boxShadow:'0 0 6px var(--amber-glow)' }}/>
            )}
          </button>
        );
      })}

      {/* Bottom decoration */}
      <div style={{ marginTop:'auto', padding:'16px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
        <div style={{ width:2, height:2, borderRadius:'50%', background:'var(--t3)' }}/>
        <div style={{ width:2, height:2, borderRadius:'50%', background:'var(--t3)' }}/>
        <div style={{ width:2, height:2, borderRadius:'50%', background:'var(--t3)' }}/>
      </div>
    </aside>
  );
}

const S = {
  aside: { width:68, flexShrink:0, background:'var(--bg1)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', alignItems:'center', paddingTop:8, position:'relative', overflow:'hidden' },
  btn:   { width:'100%', height:62, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:5, position:'relative', transition:'background .15s, color .15s', border:'none' },
};
