import React, { useState } from 'react';
import { callClaude } from '../utils/api';

export default function Roadmap({
  isActive,
  setCurrentScreen,
  addXP,
  showToast
}) {
  const [roadGoal, setRoadGoal] = useState('');
  const [roadBranch, setRoadBranch] = useState('');
  const [roadYear, setRoadYear] = useState('');
  const [roadInterest, setRoadInterest] = useState('');
  const [roadResultHtml, setRoadResultHtml] = useState('');
  const [roadLoading, setRoadLoading] = useState(false);


  const handleGenerateRoadmap = async () => {
    const goal = roadGoal.trim();
    const branch = roadBranch.trim();
    const year = roadYear.trim();
    const interest = roadInterest.trim();

    if (!goal || !branch) {
      showToast('❌ Fill goal and branch!', '#ff4757');
      return;
    }

    setRoadLoading(true);
    setRoadResultHtml('');

    try {
      const resp = await callClaude(
        'You are a career counselor for Indian engineering students. Create practical, actionable roadmaps.',
        `Create a career roadmap for:
Goal: ${goal}
Branch: ${branch}
Current Year: ${year || '2nd year'}
Interests: ${interest || 'software development'}

Format the response with clear sections:
## 🎯 Career Path: [Goal]
## 📚 Skills to Learn (Phase-wise)
## 🛠 Projects to Build
## 📜 Certifications Recommended  
## 💼 Internship Strategy
## 🏆 Placement Preparation
## 📅 Timeline (Semester-wise)
## 🔗 Best Resources

Keep it practical for Indian engineering students targeting top companies.`,
        1200
      );
      const data = await resp.json();
      const replyHtml = data.content[0].text
        .replace(/\n/g, '<br>')
        .replace(/## /g, '<br><b style="color:#5b8dee">')
        .replace(/<b style="color:#5b8dee">/g, '<br><b style="color:#5b8dee;font-size:0.85rem">')
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

      setRoadResultHtml(replyHtml);
      addXP(20);
      showToast('✅ Roadmap created! +20 XP', '#4caf50');
      setRoadLoading(false);
    } catch {
      const fallbackHtml = `<div class="plan-day-title">🗺 Career Roadmap for ${goal}</div>
        <div class="plan-slot"><span class="plan-time">Year 1-2</span><span class="plan-topic">Master core subjects, learn programming basics (C, Python, Java)</span></div>
        <div class="plan-slot"><span class="plan-time">Year 2-3</span><span class="plan-topic">DSA, DBMS, OS, CN — build 2-3 projects, internships</span></div>
        <div class="plan-slot"><span class="plan-time">Year 3-4</span><span class="plan-topic">Specialization, competitive coding, company preparation</span></div>
        <div class="plan-slot"><span class="plan-time">Placements</span><span class="plan-topic">LeetCode 200+ problems, mock interviews, resume optimization</span></div>`;
      setRoadResultHtml(fallbackHtml);
      setRoadLoading(false);
    }
  };

  return (
    <div id="roadmap-screen" className={`screen ${isActive ? 'active' : ''}`}>
      <div style={{ padding: '44px 22px 14px' }}>
        <div className="ai-title">🗺 Career Roadmap</div>
        <div className="ai-sub">AI creates your personalized career path</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px 20px' }}>
        <div className="plan-box">
          <div className="plan-box-title">✏️ Tell us about yourself</div>
          <input className="p-inp" placeholder="Career goal (e.g. Software Engineer at Google)" value={roadGoal} onChange={(e) => setRoadGoal(e.target.value)} />
          <input className="p-inp" placeholder="Your branch (e.g. CSE, ECE, EEE)" value={roadBranch} onChange={(e) => setRoadBranch(e.target.value)} />
          <input className="p-inp" placeholder="Current year (e.g. 2nd year)" value={roadYear} onChange={(e) => setRoadYear(e.target.value)} />
          <input className="p-inp" placeholder="Interests (e.g. Web Dev, AI, Data Science)" value={roadInterest} onChange={(e) => setRoadInterest(e.target.value)} />
          <button className="p-btn" onClick={handleGenerateRoadmap}>🗺 Generate My Roadmap</button>
          
          {roadLoading && (
            <div className="ai-load">
              <div className="ai-spin"></div>
              Creating your personalized career roadmap...
            </div>
          )}
          
          {roadResultHtml && (
            <div style={{ marginTop: '12px' }} dangerouslySetInnerHTML={{ __html: roadResultHtml }}></div>
          )}
        </div>
      </div>
    </div>
  );
}
