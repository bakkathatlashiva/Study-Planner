import React from 'react';

export default function CareerHub({ isActive, setCurrentScreen }) {
  return (
    <div id="career-screen" className={`screen ${isActive ? 'active' : ''}`}>
      <div style={{ padding: '44px 22px 14px' }}>
        <div className="ai-title">💼 Career Hub</div>
        <div className="ai-sub">Roadmap, Placement & Resume — all in one</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px 20px' }}>
        <div onClick={() => setCurrentScreen('roadmap-screen')} style={{ background: 'rgba(91,141,238,0.1)', border: '1px solid rgba(91,141,238,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '12px', cursor: 'pointer' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🗺</div>
          <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: '1rem', fontWeight: 800, color: '#5b8dee', marginBottom: '4px' }}>Career Roadmap</div>
          <div style={{ fontSize: '0.78rem', color: '#aaa' }}>Enter your goal → AI creates step-by-step career path with skills, timeline & resources</div>
        </div>
        <div onClick={() => setCurrentScreen('placement-screen')} style={{ background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '12px', cursor: 'pointer' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>💼</div>
          <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: '1rem', fontWeight: 800, color: '#4caf50', marginBottom: '4px' }}>Placement Prep</div>
          <div style={{ fontSize: '0.78rem', color: '#aaa' }}>DSA practice, aptitude, technical & HR interview preparation for top companies</div>
        </div>
        <div onClick={() => setCurrentScreen('resume-screen')} style={{ background: 'rgba(224,107,139,0.1)', border: '1px solid rgba(224,107,139,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '12px', cursor: 'pointer' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📄</div>
          <div style={{ fontFamily: 'Nunito,sans-serif', fontSize: '1rem', fontWeight: 800, color: '#e06b8b', marginBottom: '4px' }}>Resume Builder</div>
          <div style={{ fontSize: '0.78rem', color: '#aaa' }}>Enter your details → AI creates ATS-friendly resume content with tips</div>
        </div>
      </div>
    </div>
  );
}
