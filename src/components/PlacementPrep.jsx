import React, { useState } from 'react';
import { callClaude } from '../utils/api';

export default function PlacementPrep({
  isActive,
  setCurrentScreen,
  addXP,
  showToast
}) {
  const [placeTopic, setPlaceTopic] = useState('');
  const [placeCompany, setPlaceCompany] = useState('');
  const [placeType, setPlaceType] = useState('dsa');
  const [placeResultHtml, setPlaceResultHtml] = useState('');
  const [placeLoading, setPlaceLoading] = useState(false);


  const handleGetPlacementHelp = async () => {
    const topic = placeTopic.trim();
    const company = placeCompany.trim();
    const type = placeType;

    if (!topic) {
      showToast('❌ Enter topic!', '#ff4757');
      return;
    }

    setPlaceLoading(true);
    setPlaceResultHtml('');

    const prompts = {
      dsa: `You are a DSA expert for placement prep. For the topic "${topic}", provide:
## 📌 Key Concepts
## 💻 Important Problems (with difficulty)
## 🔄 Common Patterns
## ⚡ Time/Space Complexity Tips
## 🎯 Companies that ask this (${company || 'TCS, Infosys, Wipro, Amazon, Google'})`,
      aptitude: `For aptitude topic "${topic}", provide:
## 📝 Concept Explanation
## 🔢 Formula/Shortcuts  
## 💡 5 Practice Questions with Solutions
## ⚡ Quick Tips for Exam`,
      interview: `For interview topic "${topic}" at ${company || 'top tech companies'}, provide:
## 🎯 Most Asked Questions
## ✅ Model Answers
## 💡 Tips to Impress
## ❌ Common Mistakes to Avoid`,
      hr: `For HR interview topic "${topic}", provide:
## 🎤 Common Questions
## ✅ Model Answers with structure
## 💡 Body Language Tips
## 🌟 What Interviewers Look For`
    };

    try {
      const resp = await callClaude(
        'You are a placement expert for Indian engineering students targeting top IT companies.',
        prompts[type] || prompts.dsa,
        1000
      );
      const data = await resp.json();
      const replyHtml = data.content[0].text
        .replace(/\n/g, '<br>')
        .replace(/## /g, '<br><b style="color:#4caf50;font-size:0.85rem">')
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

      setPlaceResultHtml(replyHtml);
      addXP(10);
      setPlaceLoading(false);
    } catch {
      const fallbackHtml = `<div class="plan-day-title">💼 Placement: ${topic}</div>
        <div class="plan-slot"><span class="plan-topic">• Study the core concept thoroughly</span></div>
        <div class="plan-slot"><span class="plan-topic">• Practice on LeetCode/HackerRank</span></div>
        <div class="plan-slot"><span class="plan-topic">• Review company-specific questions</span></div>
        <div class="plan-slot"><span class="plan-topic">• Do mock interviews with peers</span></div>`;
      setPlaceResultHtml(fallbackHtml);
      setPlaceLoading(false);
    }
  };

  return (
    <div id="placement-screen" className={`screen ${isActive ? 'active' : ''}`}>
      <div style={{ padding: '44px 22px 14px' }}>
        <div className="ai-title">💼 Placement Prep</div>
        <div className="ai-sub">DSA, Aptitude & Interview preparation</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px 20px' }}>
        <div className="plan-box">
          <div className="plan-box-title">🎯 Get Placement Help</div>
          <input className="p-inp" placeholder="Topic (e.g. Binary Search, Permutations, HR questions)" value={placeTopic} onChange={(e) => setPlaceTopic(e.target.value)} />
          <input className="p-inp" placeholder="Target company (e.g. TCS, Amazon, Google)" value={placeCompany} onChange={(e) => setPlaceCompany(e.target.value)} />
          <select className="p-inp" style={{ cursor: 'pointer' }} value={placeType} onChange={(e) => setPlaceType(e.target.value)}>
            <option value="dsa">💻 DSA & Coding</option>
            <option value="aptitude">🔢 Aptitude & Reasoning</option>
            <option value="interview">🎤 Technical Interview</option>
            <option value="hr">👔 HR Interview</option>
          </select>
          <button className="p-btn" onClick={handleGetPlacementHelp}>💼 Get Help</button>
          
          {placeLoading && (
            <div className="ai-load">
              <div className="ai-spin"></div>
              Preparing placement content...
            </div>
          )}
          
          {placeResultHtml && (
            <div style={{ marginTop: '12px' }} dangerouslySetInnerHTML={{ __html: placeResultHtml }}></div>
          )}
        </div>
        
        <div className="plan-box" style={{ marginTop: 0 }}>
          <div className="plan-box-title">🔗 Important Resources</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <a href="https://leetcode.com" target="_blank" rel="noreferrer" style={{ color: '#f0a500', fontSize: '0.8rem', textDecoration: 'none' }}>🔶 LeetCode — DSA Practice →</a>
            <a href="https://www.hackerrank.com" target="_blank" rel="noreferrer" style={{ color: '#4caf50', fontSize: '0.8rem', textDecoration: 'none' }}>🟢 HackerRank — Coding Challenges →</a>
            <a href="https://www.geeksforgeeks.org/company-wise-interview-questions/" target="_blank" rel="noreferrer" style={{ color: '#ff6b6b', fontSize: '0.8rem', textDecoration: 'none' }}>📚 GFG Company Interview Questions →</a>
            <a href="https://www.youtube.com/results?search_query=placement+preparation+2024+India" target="_blank" rel="noreferrer" style={{ color: '#ff4757', fontSize: '0.8rem', textDecoration: 'none' }}>📺 Placement Prep Videos on YouTube →</a>
          </div>
        </div>
      </div>
    </div>
  );
}
