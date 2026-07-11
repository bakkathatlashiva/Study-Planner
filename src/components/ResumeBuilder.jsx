import React, { useState } from 'react';
import { callClaude } from '../utils/api';

export default function ResumeBuilder({
  isActive,
  setCurrentScreen,
  addXP,
  showToast
}) {
  const [resName, setResName] = useState('');
  const [resBranch, setResBranch] = useState('');
  const [resSkills, setResSkills] = useState('');
  const [resProjects, setResProjects] = useState('');
  const [resTarget, setResTarget] = useState('');
  const [resResultHtml, setResResultHtml] = useState('');
  const [resLoading, setResLoading] = useState(false);


  const handleBuildResume = async () => {
    const name = resName.trim();
    const branch = resBranch.trim();
    const skills = resSkills.trim();
    const projects = resProjects.trim();
    const target = resTarget.trim();

    if (!name || !branch || !skills) {
      showToast('❌ Fill name, branch and skills!', '#ff4757');
      return;
    }

    setResLoading(true);
    setResResultHtml('');

    try {
      const resp = await callClaude(
        'You are a professional resume builder for Indian engineering students. Create ATS-friendly resume content.',
        `Create resume content for:
Name: ${name}
Branch: ${branch}
Skills: ${skills}
Projects: ${projects || 'Not specified'}
Target Companies: ${target || 'TCS, Infosys, Wipro, Accenture'}

Provide:
## 📄 Professional Summary (3 lines)
## 🛠 Skills Section (formatted for ATS)
## 💻 Projects Section (with bullet points showing impact)
## 🎓 Education Section Format
## 📜 Certifications to Add
## 💡 Resume Tips for ${target || 'product & service companies'}
## ❌ Common Resume Mistakes to Avoid

Make it ATS-friendly and professional.`,
        1200
      );
      const data = await resp.json();
      const replyHtml = data.content[0].text
        .replace(/\n/g, '<br>')
        .replace(/## /g, '<br><b style="color:#e06b8b;font-size:0.85rem">')
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

      setResResultHtml(replyHtml);
      addXP(25);
      showToast('✅ Resume built! +25 XP', '#4caf50');
      setResLoading(false);
    } catch {
      const fallbackHtml = `<div class="plan-day-title">📄 Resume Tips for ${name}</div>
        <div class="plan-slot"><span class="plan-topic">• Keep resume to 1 page for fresher</span></div>
        <div class="plan-slot"><span class="plan-topic">• Add GitHub, LinkedIn, portfolio links</span></div>
        <div class="plan-slot"><span class="plan-topic">• Use action verbs: Built, Developed, Implemented</span></div>
        <div class="plan-slot"><span class="plan-topic">• Quantify achievements: "Improved speed by 30%"</span></div>
        <div class="plan-slot"><span class="plan-topic">• ATS keywords: mention tech stack clearly</span></div>`;
      setResResultHtml(fallbackHtml);
      setResLoading(false);
    }
  };

  return (
    <div id="resume-screen" className={`screen ${isActive ? 'active' : ''}`}>
      <div style={{ padding: '44px 22px 14px' }}>
        <div className="ai-title">📄 Resume Builder</div>
        <div className="ai-sub">AI builds ATS-friendly resume content</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px 20px' }}>
        <div className="plan-box">
          <div className="plan-box-title">✏️ Your Details</div>
          <input className="p-inp" placeholder="Your name" value={resName} onChange={(e) => setResName(e.target.value)} />
          <input className="p-inp" placeholder="Branch & College (e.g. CSE, JNTU)" value={resBranch} onChange={(e) => setResBranch(e.target.value)} />
          <input className="p-inp" placeholder="Skills (e.g. Python, Java, React, SQL)" value={resSkills} onChange={(e) => setResSkills(e.target.value)} />
          <input className="p-inp" placeholder="Projects (e.g. E-commerce website, Chat app)" value={resProjects} onChange={(e) => setResProjects(e.target.value)} />
          <input className="p-inp" placeholder="Target companies (e.g. TCS, Infosys, Amazon)" value={resTarget} onChange={(e) => setResTarget(e.target.value)} />
          <button className="p-btn" onClick={handleBuildResume}>📄 Build My Resume</button>
          
          {resLoading && (
            <div className="ai-load">
              <div className="ai-spin"></div>
              Building your resume content...
            </div>
          )}
          
          {resResultHtml && (
            <div style={{ marginTop: '12px' }} dangerouslySetInnerHTML={{ __html: resResultHtml }}></div>
          )}
        </div>
      </div>
    </div>
  );
}
