import React, { useState } from 'react';
import { callClaude } from '../utils/api';

export default function MockTest({
  isActive,
  setCurrentScreen,
  addXP,
  showToast,
  subjects,
  setSubjects,
  gameData,
  setGameData
}) {
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectUnits, setNewSubjectUnits] = useState('');
  const [newSubjectYt, setNewSubjectYt] = useState('');

  // --- Mock Test Modal State ---
  const [testActive, setTestActive] = useState(false);
  const [curTest, setCurTest] = useState({
    questions: [],
    current: 0,
    score: 0,
    subjectId: null,
    ytUrl: '',
    subjectName: '',
    selectedAnswer: null,
    answered: false,
    doubtInput: '',
    doubtAnswer: '',
    doubtLoading: false,
    loading: false
  });


  const handleAddSubject = () => {
    const name = newSubjectName.trim();
    const units = newSubjectUnits.trim();
    const yt = newSubjectYt.trim();
    if (!name || !units) {
      showToast('❌ Enter subject and units!', '#ff4757');
      return;
    }
    const updated = [...subjects, { id: Date.now(), name, units, yt }];
    setSubjects(updated);
    localStorage.setItem('sp_subjects', JSON.stringify(updated));
    setNewSubjectName('');
    setNewSubjectUnits('');
    setNewSubjectYt('');
    showToast('✅ Subject added!', '#4caf50');
  };

  const deleteSubject = (id) => {
    const updated = subjects.filter(s => s.id !== id);
    setSubjects(updated);
    localStorage.setItem('sp_subjects', JSON.stringify(updated));
  };

  const startTest = async (subjectId) => {
    const s = subjects.find(x => x.id === subjectId);
    if (!s) return;
    const ytUrl = s.yt || `https://www.youtube.com/results?search_query=${encodeURIComponent(s.name + ' ' + s.units + ' important questions')}`;
    
    setCurTest({
      questions: [],
      current: 0,
      score: 0,
      subjectId,
      ytUrl,
      subjectName: s.name,
      selectedAnswer: null,
      answered: false,
      doubtInput: '',
      doubtAnswer: '',
      doubtLoading: false,
      loading: true
    });
    setTestActive(true);

    try {
      const resp = await callClaude(
        'You create precise MCQ questions for Indian B.Tech engineering exams. All options must be complete meaningful sentences. Return ONLY valid JSON.',
        `Create 5 MCQ questions for B.Tech exam.
Subject: ${s.name}
Topics: ${s.units}

Each question must have 4 complete sentence options (not "Option A" placeholders).
Return ONLY this JSON:
{"questions":[{"q":"Complete question?","options":["A) Full sentence answer one","B) Full sentence answer two","C) Full sentence answer three","D) Full sentence answer four"],"answer":"A","explanation":"Detailed explanation of why A is correct and others are wrong."}]}`,
        2000
      );
      const data = await resp.json();
      const clean = data.content[0].text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      setCurTest(prev => ({
        ...prev,
        questions: parsed.questions,
        loading: false
      }));
    } catch {
      // Fallback questions if API fails
      const u = s.units.split(',')[0].trim();
      const fallbackQuestions = [
        {
          q: `What is the fundamental principle of ${u} in ${s.name}?`,
          options: [
            `A) It deals with the basic study and analysis of ${u} properties and behavior`,
            `B) It only involves mathematical calculations without any physical significance`,
            `C) It is applicable only in theoretical scenarios and not in practical engineering`,
            `D) It focuses solely on historical development without modern applications`
          ],
          answer: 'A',
          explanation: `The fundamental principle of ${u} involves understanding its core properties, behavior, and practical applications in ${s.name}. This is the basis for all further study in this area.`
        },
        {
          q: `Which of the following best describes the application of ${u}?`,
          options: [
            `A) ${u} has no real-world applications in modern engineering`,
            `B) ${u} is applied extensively in designing and solving engineering problems`,
            `C) ${u} is only used in laboratory experiments, not in industry`,
            `D) ${u} applies only to electrical engineering and no other branches`
          ],
          answer: 'B',
          explanation: `${u} is extensively applied in solving real engineering problems. Engineers use concepts from ${u} to design systems, analyze behavior, and develop solutions across multiple engineering domains.`
        },
        {
          q: `What happens when the principles of ${u} are correctly applied in ${s.name}?`,
          options: [
            `A) The system becomes unstable and unpredictable in all conditions`,
            `B) Results become more accurate, reliable, and practically useful`,
            `C) The complexity increases without any benefit to the engineering design`,
            `D) Only theoretical answers are obtained with no practical value`
          ],
          answer: 'B',
          explanation: `Correctly applying ${u} principles leads to accurate and reliable results that are practically useful. This is why engineers study and master these concepts for real-world problem solving.`
        }
      ];
      setCurTest(prev => ({
        ...prev,
        questions: fallbackQuestions,
        loading: false
      }));
    }
  };

  const handleSelectAnswer = (optLetter) => {
    if (curTest.answered) return;
    const q = curTest.questions[curTest.current];
    const isCorrect = optLetter === q.answer.trim();
    setCurTest(prev => ({
      ...prev,
      selectedAnswer: optLetter,
      answered: true,
      score: isCorrect ? prev.score + 1 : prev.score
    }));
  };

  const handleAskDoubt = async () => {
    const doubt = curTest.doubtInput.trim();
    if (!doubt) return;
    setCurTest(prev => ({ ...prev, doubtLoading: true, doubtAnswer: '' }));

    try {
      const q = curTest.questions[curTest.current];
      const resp = await callClaude(
        'You are an AI assistant helping a student understand a B.Tech exam question.',
        `Question: ${q.q}\nStudent doubt: ${doubt}\nSubject: ${curTest.subjectName}\nExplain clearly and simply for a B.Tech student.`,
        4000
      );
      const data = await resp.json();
      setCurTest(prev => ({
        ...prev,
        doubtAnswer: data.content[0].text,
        doubtLoading: false
      }));
    } catch {
      setCurTest(prev => ({
        ...prev,
        doubtAnswer: '⚠️ Connection error. Could not reach AI helper.',
        doubtLoading: false
      }));
    }
  };

  const handleNextQuestion = () => {
    const nextIdx = curTest.current + 1;
    if (nextIdx >= curTest.questions.length) {
      // Test complete
      const total = curTest.questions.length;
      const pct = Math.round(curTest.score / total * 100);
      const xpEarned = pct >= 80 ? 50 : pct >= 60 ? 30 : pct >= 40 ? 15 : 5;

      setGameData(prev => {
        const updated = {
          ...prev,
          testsTaken: prev.testsTaken + 1,
          testScores: [...prev.testScores, pct]
        };
        localStorage.setItem('sp_game', JSON.stringify(updated));
        return updated;
      });
      addXP(xpEarned);

      setCurTest(prev => ({
        ...prev,
        current: nextIdx // Out of bounds triggers score rendering
      }));
    } else {
      setCurTest(prev => ({
        ...prev,
        current: nextIdx,
        selectedAnswer: null,
        answered: false,
        doubtInput: '',
        doubtAnswer: ''
      }));
    }
  };

  return (
    <>
      <div id="test-screen" className={`screen ${isActive ? 'active' : ''}`}>
        <div className="test-top">
          <div className="ai-title">🧪 Mock Test</div>
          <div className="ai-sub">AI-powered tests from your syllabus</div>
        </div>
        <div className="test-scroll">
          <div id="subj-list">
            {subjects.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6b7799', padding: '16px', fontSize: '0.8rem' }}>
                Add a subject below to start your AI mock test!
              </div>
            ) : (
              subjects.map(s => {
                const tags = s.units.split(',').map((u, uIdx) => (
                  <span key={uIdx} className="unit-tag">{u.trim()}</span>
                ));
                const ytUrl = s.yt || `https://www.youtube.com/results?search_query=${encodeURIComponent(s.name + ' ' + s.units.split(',')[0] + ' lecture')}`;
                return (
                  <div key={s.id} className="subj-card">
                    <div className="subj-name">
                      <span>{s.name}</span>
                      <button onClick={() => deleteSubject(s.id)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer' }}>🗑</button>
                    </div>
                    <div style={{ margin: '5px 0' }}>{tags}</div>
                    <a className="yt-lnk" href={ytUrl} target="_blank" rel="noreferrer">📺 Watch {s.name} on YouTube →</a>
                    <button className="start-btn" onClick={() => startTest(s.id)}>🚀 Start Mock Test</button>
                  </div>
                );
              })
            )}
          </div>
          <div className="add-subj-box">
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f0a500', marginBottom: '10px' }}>➕ Add Subject</div>
            <input className="s-inp" placeholder="Subject (e.g. Physics)" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} />
            <input className="s-inp" placeholder="Units (e.g. Unit 1: Mechanics, Unit 2: Optics)" value={newSubjectUnits} onChange={(e) => setNewSubjectUnits(e.target.value)} />
            <input className="s-inp" placeholder="YouTube link (optional)" value={newSubjectYt} onChange={(e) => setNewSubjectYt(e.target.value)} />
            <button className="s-btn" onClick={handleAddSubject}>Add Subject</button>
          </div>
        </div>
      </div>

      {/* Quiz Modal Panel */}
      {testActive && (
        <div className="t-modal" id="t-modal">
          {curTest.loading ? (
            <div className="ai-load">
              <div className="ai-spin"></div>
              Creating questions from your syllabus...
              <br />
              <small style={{ color: '#6b7799', marginTop: '6px', display: 'block' }}>
                AI is compiling syllabus questions
              </small>
            </div>
          ) : curTest.current >= curTest.questions.length ? (
            // Quiz Score Card Screen
            <div className="score-wrap">
              <div className="score-emoji">
                {(() => {
                  const pct = Math.round(curTest.score / curTest.questions.length * 100);
                  return pct >= 80 ? '🏆' : pct >= 60 ? '😊' : pct >= 40 ? '😐' : '😢';
                })()}
              </div>
              <div className="score-title">Test Complete!</div>
              <div className="score-num">{curTest.score}/{curTest.questions.length}</div>
              <div className="score-pct">
                {Math.round(curTest.score / curTest.questions.length * 100)}% &nbsp;|&nbsp; +
                {(() => {
                  const pct = Math.round(curTest.score / curTest.questions.length * 100);
                  return pct >= 80 ? 50 : pct >= 60 ? 30 : pct >= 40 ? 15 : 5;
                })()} XP ⚡
              </div>
              <div className="score-msg">
                {(() => {
                  const pct = Math.round(curTest.score / curTest.questions.length * 100);
                  return pct >= 80 ? 'Outstanding! You are exam ready!' : pct >= 60 ? 'Good work! Keep practicing!' : pct >= 40 ? 'Keep going! Review your notes!' : "Don't give up! Study more!";
                })()}
              </div>
              <div style={{ marginBottom: '18px' }}>
                <a href={curTest.ytUrl} target="_blank" rel="noreferrer" style={{ display: 'block', background: 'rgba(255,71,87,0.12)', border: '1px solid rgba(255,71,87,0.25)', borderRadius: '8px', color: '#ff4757', textDecoration: 'none', padding: '10px', fontSize: '0.8rem', textAlign: 'center' }}>
                  📺 Watch {curTest.subjectName} on YouTube →
                </a>
              </div>
              <div className="score-btns">
                <button className="s-retry" onClick={() => startTest(curTest.subjectId)}>🔄 Retry</button>
                <button className="s-close" onClick={() => setTestActive(false)}>✕ Close</button>
              </div>
            </div>
          ) : (
            // Quiz Questions Screen
            (() => {
              const q = curTest.questions[curTest.current];
              const total = curTest.questions.length;
              const progressPct = (curTest.current / total * 100);
              return (
                <>
                  <div className="t-prog-wrap">
                    <div className="t-prog-bar" style={{ width: `${progressPct}%` }}></div>
                  </div>
                  <div className="t-qnum">
                    Question {curTest.current + 1} of {total} &nbsp;|&nbsp; Score: {curTest.score}/{curTest.current}
                  </div>
                  <div className="t-question">{q.q}</div>
                  <div className="t-opts">
                    {q.options.map((o, oIdx) => {
                      const letter = o.trim()[0];
                      let classNames = 't-opt';
                      if (curTest.answered) {
                        if (letter === q.answer.trim()) {
                          classNames += ' correct';
                        } else if (curTest.selectedAnswer === letter) {
                          classNames += ' wrong';
                        }
                      }
                      return (
                        <button key={oIdx} className={classNames} style={{ pointerEvents: curTest.answered ? 'none' : 'auto' }} onClick={() => handleSelectAnswer(letter)}>
                          {o}
                        </button>
                      );
                    })}
                  </div>
                  
                  {curTest.answered && (
                    <>
                      <div className="t-exp" style={{ display: 'block' }}>
                        <div style={{ fontWeight: 700, color: '#f0a500', marginBottom: '5px' }}>💡 Explanation</div>
                        {q.explanation}
                      </div>
                      <div className="t-doubt" style={{ display: 'block' }}>
                        <div className="t-doubt-label">Still have a doubt? Ask AI 👇</div>
                        <div className="t-doubt-row">
                          <input className="t-doubt-inp" placeholder="Type your doubt here..." value={curTest.doubtInput} onChange={(e) => setCurTest(prev => ({ ...prev, doubtInput: e.target.value }))} />
                          <button className="t-doubt-btn" onClick={handleAskDoubt}>Ask</button>
                        </div>
                        {curTest.doubtLoading && (
                          <div className="t-doubt-ans" style={{ display: 'block', textAlign: 'center' }}>
                            <div className="ai-spin" style={{ width: '18px', height: '18px', margin: '0 auto' }}></div>
                          </div>
                        )}
                        {curTest.doubtAnswer && (
                          <div className="t-doubt-ans" style={{ display: 'block' }}>
                            <div style={{ background: 'rgba(59,91,219,0.1)', border: '1px solid rgba(59,91,219,0.2)', borderRadius: '8px', padding: '9px', fontSize: '0.76rem', lineHeight: '1.6' }}>
                              {curTest.doubtAnswer.split('\n').map((line, lIdx) => <React.Fragment key={lIdx}>{line}<br /></React.Fragment>)}
                            </div>
                          </div>
                        )}
                      </div>
                      <button className="t-next" style={{ display: 'block' }} onClick={handleNextQuestion}>
                        {curTest.current + 1 === total ? 'View Results 🏆' : 'Next Question →'}
                      </button>
                    </>
                  )}
                </>
              );
            })()
          )}
        </div>
      )}
    </>
  );
}
