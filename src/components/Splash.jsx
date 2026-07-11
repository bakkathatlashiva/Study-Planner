import React from 'react';

export default function Splash({ isActive }) {
  return (
    <div id="splash" className={`screen ${isActive ? 'active' : ''}`}>
      <svg className="splash-logo" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="110" height="110" rx="24" fill="#0d1640" />
        <path d="M52 25C38 25 28 35 28 47c0 5 2 10 6 13-4 2-6 6-6 10 0 8 7 14 16 14 3 0 6-1 8-3V25z" fill="#e8eaf6" stroke="#080e2b" strokeWidth="2" />
        <path d="M35 45Q40 42 45 46M33 57Q39 54 44 58M36 68Q41 65 46 69" stroke="#080e2b" strokeWidth="2" strokeLinecap="round" fill="none" />
        <line x1="52" y1="20" x2="52" y2="90" stroke="white" stroke-width="2" />
        <line x1="52" y1="35" x2="62" y2="35" stroke="white" stroke-width="2" />
        <line x1="62" y1="35" x2="68" y2="28" stroke="white" stroke-width="2" />
        <circle cx="72" cy="26" r="4" fill="white" />
        <line x1="52" y1="47" x2="70" y2="47" stroke="white" stroke-width="2" />
        <circle cx="75" cy="47" r="4" fill="white" />
        <line x1="52" y1="58" x2="62" y2="58" stroke="white" stroke-width="2" />
        <line x1="62" y1="58" x2="70" y2="65" stroke="white" stroke-width="2" />
        <circle cx="74" cy="67" r="4" fill="white" />
        <line x1="52" y1="72" x2="65" y2="72" stroke="white" stroke-width="2" />
        <line x1="65" y1="72" x2="65" y2="80" stroke="white" stroke-width="2" />
        <circle cx="65" cy="84" r="4" fill="white" />
      </svg>
      <div className="splash-title">Study Planner Pro</div>
      <div className="splash-sub">Your AI Study & Career Assistant</div>
      <div className="splash-loader"></div>
    </div>
  );
}
