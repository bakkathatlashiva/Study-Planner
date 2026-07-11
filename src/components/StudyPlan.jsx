import React, { useState } from 'react';
import { callClaude } from '../utils/api';

export default function StudyPlan({
  isActive,
  setCurrentScreen,
  addXP,
  showToast,
  plans,
  setPlans
}) {
  const [planSubject, setPlanSubject] = useState('');
  const [planUnits, setPlanUnits] = useState('');
  const [planLevel, setPlanLevel] = useState('intermediate');
  const [planHours, setPlanHours] = useState('4');
  const [planDate, setPlanDate] = useState('');
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planResultHtml, setPlanResultHtml] = useState('');


  const handleGeneratePlan = async () => {
    const subject = planSubject.trim();
    const units = planUnits.trim();
    const level = planLevel;
    const hours = planHours;
    const dateVal = planDate;

    if (!subject || !units || !dateVal) {
      showToast('❌ Fill all fields!', '#ff4757');
      return;
    }

    const examDate = new Date(dateVal);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((examDate - today) / 86400000);

    if (daysLeft <= 0) {
      showToast('❌ Select a future date!', '#ff4757');
      return;
    }

    setGeneratingPlan(true);
    setPlanResultHtml('');

    try {
      const resp = await callClaude(
        'You create detailed, practical study timetables for Indian B.Tech students. Return ONLY valid JSON.',
        `Create a study plan for:
Subject: ${subject}
Topics: ${units}
Level: ${level}
Daily hours: ${hours}
Days until exam: ${daysLeft}
Exam date: ${dateVal}

Return ONLY this JSON:
{"plan":[{"day":"Day 1","date":"Mon 24 Mar","slots":[{"time":"9:00 AM – 10:30 AM","topic":"Unit 1: Topic — specific activity"},{"time":"10:30 AM – 10:45 AM","topic":"☕ Short Break"},{"time":"10:45 AM – 12:15 PM","topic":"Unit 1: Practice problems"},{"time":"12:15 PM – 1:15 PM","topic":"🍽 Lunch Break"},{"time":"1:15 PM – 3:00 PM","topic":"Unit 2: Topic — specific activity"}]}],"tips":["tip1","tip2"],"youtube":["${subject} ${units.split(',')[0]} lecture","${subject} important questions"]}`,
        1500
      );
      const data = await resp.json();
      const clean = data.content[0].text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);

      // Build JSX template string
      let html = '';
      parsed.plan.forEach(d => {
        html += `<div class="plan-day"><div class="plan-day-title">📅 ${d.day} — ${d.date}</div>`;
        d.slots.forEach(s => {
          const isBreak = s.topic.includes('Break') || s.topic.includes('Lunch');
          html += `<div class="plan-slot"><span class="plan-time">${s.time}</span><span class="plan-topic" style="${isBreak ? 'color:#6b7799' : ''}">${s.topic}</span></div>`;
        });
        html += `</div>`;
      });
      if (parsed.tips) {
        html += `<div class="plan-day" style="border-color:rgba(240,165,0,0.2)"><div class="plan-day-title" style="color:#f0a500">💡 Study Tips</div>`;
        parsed.tips.forEach(t => html += `<div class="plan-slot"><span class="plan-topic">• ${t}</span></div>`);
        html += `</div>`;
      }
      if (parsed.youtube) {
        html += `<div class="plan-day" style="border-color:rgba(255,71,87,0.2)"><div class="plan-day-title" style="color:#ff4757">📺 Watch on YouTube</div>`;
        parsed.youtube.forEach(q => {
          const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
          html += `<div class="plan-slot"><a href="${url}" target="_blank" style="color:#ff4757;text-decoration:none;font-size:0.74rem">🔍 ${q} →</a></div>`;
        });
        html += `</div>`;
      }

      setPlanResultHtml(html);
      const updatedPlans = [...plans, { id: Date.now(), subject, date: dateVal, html }];
      setPlans(updatedPlans);
      localStorage.setItem('sp_plans', JSON.stringify(updatedPlans));
      addXP(15);
      showToast('✅ Plan created! +15 XP', '#4caf50');
      setGeneratingPlan(false);
    } catch {
      // Fallback
      const unitList = units.split(',').map(u => u.trim());
      const dpu = Math.max(2, Math.floor((daysLeft - 2) / unitList.length));
      const slots = [
        { time: '9:00 AM – 10:30 AM', act: 'Read textbook & understand concepts' },
        { time: '10:30 AM – 10:45 AM', act: '☕ Short Break', br: true },
        { time: '10:45 AM – 12:15 PM', act: 'Practice problems & exercises' },
        { time: '12:15 PM – 1:15 PM', act: '🍽 Lunch Break', br: true },
        { time: '1:15 PM – 3:00 PM', act: 'Write notes & key formulas' },
        { time: '3:00 PM – 3:15 PM', act: '☕ Short Break', br: true },
        { time: `3:15 PM – ${3 + parseInt(hours) - 2}:00 PM`, act: 'Revision & previous year questions' },
      ];
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      let html = '';
      let dc = 1;

      unitList.forEach(unit => {
        for (let d = 0; d < dpu && dc <= daysLeft - 2; d++, dc++) {
          const dt = new Date(today);
          dt.setDate(dt.getDate() + dc - 1);
          const ds = `${days[dt.getDay()]} ${dt.getDate()} ${months[dt.getMonth()]}`;
          html += `<div class="plan-day"><div class="plan-day-title">📅 Day ${dc} — ${ds}</div>`;
          slots.forEach(s => {
            html += `<div class="plan-slot"><span class="plan-time">${s.time}</span><span class="plan-topic" style="${s.br ? 'color:#6b7799' : ''}">${s.br ? s.act : `${unit}: ${s.act}`}</span></div>`;
          });
          html += `</div>`;
        }
      });
      // Revision
      for (let r = 0; r < 2 && dc <= daysLeft; r++, dc++) {
        const dt = new Date(today);
        dt.setDate(dt.getDate() + dc - 1);
        const ds = `${days[dt.getDay()]} ${dt.getDate()} ${months[dt.getMonth()]}`;
        html += `<div class="plan-day" style="border-color:rgba(240,165,0,0.25)"><div class="plan-day-title" style="color:#f0a500">📅 Day ${dc} — ${ds} (Final Revision)</div>
          <div class="plan-slot"><span class="plan-time">9:00 AM – 11:00 AM</span><span class="plan-topic">All units: Quick revision</span></div>
          <div class="plan-slot"><span class="plan-time">11:00 AM – 1:00 PM</span><span class="plan-topic">Important formulas & definitions</span></div>
          <div class="plan-slot"><span class="plan-time">1:00 PM – 2:00 PM</span><span class="plan-topic" style="color:#6b7799">🍽 Lunch Break</span></div>
          <div class="plan-slot"><span class="plan-time">2:00 PM – 4:00 PM</span><span class="plan-topic">Previous year questions</span></div>
          <div class="plan-slot"><span class="plan-time">4:00 PM – 5:00 PM</span><span class="plan-topic">Mock test + weak areas review</span></div>
          <div class="plan-slot"><span class="plan-time">Evening</span><span class="plan-topic">Rest & light revision only 🌙</span></div>
        </div>`;
      }
      // Youtube
      html += `<div class="plan-day" style="border-color:rgba(255,71,87,0.2)"><div class="plan-day-title" style="color:#ff4757">📺 Watch on YouTube</div>`;
      unitList.forEach(u => {
        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(subject + ' ' + u + ' lecture explanation')}`;
        html += `<div class="plan-slot"><a href="${url}" target="_blank" style="color:#ff4757;text-decoration:none;font-size:0.74rem">🔍 ${subject} — ${u} →</a></div>`;
      });
      html += `</div>`;

      setPlanResultHtml(html);
      const updatedPlans = [...plans, { id: Date.now(), subject, date: dateVal, html }];
      setPlans(updatedPlans);
      localStorage.setItem('sp_plans', JSON.stringify(updatedPlans));
      setGeneratingPlan(false);
    }
  };

  const deletePlan = (id) => {
    const updated = plans.filter(p => p.id !== id);
    setPlans(updated);
    localStorage.setItem('sp_plans', JSON.stringify(updated));
  };

  return (
    <div id="plan-screen" className={`screen ${isActive ? 'active' : ''}`}>
      <div className="plan-top">
        <div className="ai-title">📅 Study Plan</div>
        <div className="ai-sub">AI generates your personalized timetable</div>
      </div>
      <div className="plan-scroll">
        <div className="plan-box">
          <div className="plan-box-title">✏️ Generate AI Study Plan</div>
          <input className="p-inp" placeholder="Subject (e.g. Chemistry)" value={planSubject} onChange={(e) => setPlanSubject(e.target.value)} />
          <input className="p-inp" placeholder="Units (e.g. Unit 1: Atomic Structure, Unit 2: Bonding)" value={planUnits} onChange={(e) => setPlanUnits(e.target.value)} />
          <input className="p-inp" placeholder="Your level: beginner / intermediate / advanced" value={planLevel} onChange={(e) => setPlanLevel(e.target.value)} />
          <input className="p-inp" placeholder="Daily study hours (e.g. 4)" value={planHours} onChange={(e) => setPlanHours(e.target.value)} />
          <input className="p-inp" type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} />
          <button className="p-btn" onClick={handleGeneratePlan}>🤖 Generate Plan</button>
          
          {generatingPlan && (
            <div className="ai-load">
              <div className="ai-spin"></div>
              Creating your personalized study plan...
            </div>
          )}
          
          {planResultHtml && (
            <div id="plan-result" style={{ marginTop: '12px' }} dangerouslySetInnerHTML={{ __html: planResultHtml }}></div>
          )}
        </div>

        <div id="saved-plans">
          {plans.slice(-2).reverse().map(p => (
            <div key={p.id} className="plan-box">
              <div className="plan-box-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>📋 {p.subject} — {p.date}</span>
                <button onClick={() => deletePlan(p.id)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer' }}>🗑</button>
              </div>
              <div dangerouslySetInnerHTML={{ __html: p.html }}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
