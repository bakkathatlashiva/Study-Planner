import React from 'react';

export default function Sidebar({ currentScreen, setCurrentScreen, currentUser, handleLogout }) {
  const menuItems = [
    { id: 'dashboard', label: 'Tasks', icon: '📋' },
    { id: 'ai-screen', label: 'AI Assistant', icon: '🤖' },
    { id: 'test-screen', label: 'Mock Test', icon: '🧪' },
    { id: 'plan-screen', label: 'Study Plan', icon: '📅' },
    { id: 'career-screen', label: 'Career Hub', icon: '💼' },
    { id: 'notes-screen', label: 'Notes', icon: '📝' },
    { id: 'stats-screen', label: 'Stats', icon: '📈' }
  ];

  // We consider sub-screens of Career as having "Career Hub" active
  const careerSubScreens = ['roadmap-screen', 'placement-screen', 'resume-screen'];

  const isActive = (itemVal) => {
    if (itemVal === 'career-screen' && careerSubScreens.includes(currentScreen)) {
      return true;
    }
    return currentScreen === itemVal;
  };

  const getInitials = (name) => {
    if (!name) return 'S';
    return name.charAt(0).toUpperCase();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-logo">
          <svg viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="110" height="110" rx="24" fill="#0d1640" />
            <path d="M52 25C38 25 28 35 28 47c0 5 2 10 6 13-4 2-6 6-6 10 0 8 7 14 16 14 3 0 6-1 8-3V25z" fill="#e8eaf6" stroke="#080e2b" strokeWidth="2" />
            <path d="M35 45Q40 42 45 46M33 57Q39 54 44 58M36 68Q41 65 46 69" stroke="#080e2b" strokeWidth="2" strokeLinecap="round" fill="none" />
            <line x1="52" y1="20" x2="52" y2="90" stroke="white" strokeWidth="2" />
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
          <span className="sidebar-logo-text">Study Planner Pro</span>
        </div>

        <nav className="sidebar-menu">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`sidebar-item ${isActive(item.id) ? 'active' : ''}`}
              onClick={() => setCurrentScreen(item.id)}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              <span className="sidebar-item-text">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="sidebar-user">
        <div className="sidebar-user-info">
          <div className="sidebar-user-avatar">{getInitials(currentUser)}</div>
          <span className="sidebar-user-name" title={currentUser || 'Student'}>
            {currentUser || 'Student'}
          </span>
        </div>
        <button
          className="sidebar-logout-btn"
          onClick={handleLogout}
          title="Log Out"
        >
          Log Out
        </button>
      </div>
    </aside>
  );
}
