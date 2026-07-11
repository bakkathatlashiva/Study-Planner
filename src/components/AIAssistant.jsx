import React, { useState } from 'react';
import { callClaude } from '../utils/api';

export default function AIAssistant({ isActive, setCurrentScreen, addXP }) {
  const [aiMode, setAiMode] = useState('explain');
  const [aiInput, setAiInput] = useState('');
  const [aiChat, setAiChat] = useState([
    {
      role: 'bot',
      text: "👋 Hello! I'm your AI Study Assistant. I can help you with:\n\n• 📚 Explain any topic\n• 🧪 Mock tests & quizzes\n• 📅 Study plans\n• 💪 Motivation & tips\n• 🐛 Debug code\n• 🎯 Career guidance\n\nSelect a mode below or just type your question!",
      loading: false
    }
  ]);


  const handleSendAIChat = async () => {
    const text = aiInput.trim();
    if (!text) return;
    setAiChat(prev => [...prev, { role: 'user', text }]);
    setAiInput('');

    // Append thinking indicator
    setAiChat(prev => [...prev, { role: 'bot', text: 'Thinking...', loading: true }]);

    const systemPrompts = {
      explain: `You are an AI study assistant for Indian B.Tech students. Explain the given topic simply with examples and 3 practice questions. Use clear headings and bullet points. Keep it concise.`,
      mock_test: `You are creating a mock test for Indian B.Tech students. Generate 3 MCQ questions from the given topic. Format: Q) question\nA) option\nB) option\nC) option\nD) option\nAnswer: X\nExplanation: ...`,
      daily_coach: `You are a motivational study coach for Indian students. Give personalized motivation, study tips, and an action plan based on what the student says. Keep it energetic and friendly.`,
      flashcards: `Create 5 flashcards in Q&A format for the given topic. Format: Q: question\nA: answer\n---`,
      debug: `You are a coding expert. Explain the error/code issue and provide the corrected code with explanation.`,
      roadmap: `Create a step-by-step career roadmap for an Indian engineering student. Include skills to learn, resources, and timeline.`,
      weakness_killer: `Analyze the weak topics and create a focused improvement plan with specific daily tasks and resources.`,
      exam_readiness: `Analyze exam readiness for the given subject. Provide preparation percentage estimate, key topics to focus on, and last-minute tips.`,
      placement_mode: `You are a placement preparation expert. Help with DSA, aptitude, and interview preparation for Indian tech companies.`,
      summarize: `Summarize the given content into clear, concise bullet points that a student can quickly review.`
    };

    try {
      const resp = await callClaude(systemPrompts[aiMode] || systemPrompts.explain, text, 800);
      const data = await resp.json();
      const reply = data.content[0].text;
      setAiChat(prev => {
        const withoutLoader = prev.filter(m => !m.loading);
        return [...withoutLoader, { role: 'bot', text: reply }];
      });
      addXP(5);
    } catch {
      setAiChat(prev => {
        const withoutLoader = prev.filter(m => !m.loading);
        return [...withoutLoader, { role: 'bot', text: '⚠️ Connection error. Please check your internet and try again.' }];
      });
    }
  };

  return (
    <div id="ai-screen" className={`screen ${isActive ? 'active' : ''}`}>
      <div className="ai-top">
        <div className="ai-title">🤖 AI Assistant</div>
        <div className="ai-sub">Your personal study mentor & coach</div>
      </div>
      <div className="ai-chat">
        {aiChat.map((m, idx) => (
          <div key={idx} className={`ai-msg ${m.role} ${m.loading ? 'loading' : ''}`}>
            {m.loading ? (
              <>
                <div className="ai-spin"></div>
                Thinking...
              </>
            ) : (
              m.text.split('\n').map((line, lIdx) => <React.Fragment key={lIdx}>{line}<br /></React.Fragment>)
            )}
          </div>
        ))}
      </div>
      <div className="ai-input-wrap">
        <div className="mode-chips">
          {[
            { id: 'explain', label: '💡 Explain' },
            { id: 'mock_test', label: '🧪 Test Me' },
            { id: 'daily_coach', label: '💪 Motivate' },
            { id: 'flashcards', label: '🗂 Flashcards' },
            { id: 'debug', label: '🐛 Debug' },
            { id: 'roadmap', label: '🗺 Roadmap' },
            { id: 'weakness_killer', label: '🎯 Weakness' },
            { id: 'exam_readiness', label: '📊 Readiness' },
            { id: 'placement_mode', label: '💼 Placement' },
            { id: 'summarize', label: '📋 Summarize' }
          ].map(chip => (
            <div key={chip.id} className={`chip ${aiMode === chip.id ? 'active' : ''}`} onClick={() => setAiMode(chip.id)}>
              {chip.label}
            </div>
          ))}
        </div>
        <div className="ai-row">
          <input className="ai-inp" 
            placeholder={(() => {
              const hints = { explain: 'Enter topic to explain...', mock_test: 'Enter subject and units...', daily_coach: 'How are you feeling today?', flashcards: 'Enter topic for flashcards...', debug: 'Paste your code/error...', roadmap: 'Enter your career goal...', weakness_killer: 'Enter your weak topics...', exam_readiness: 'Enter your subject...', placement_mode: 'Enter topic (DSA/SQL etc.)...', summarize: 'Paste text to summarize...' };
              return hints[aiMode] || 'Type your question...';
            })()}
            value={aiInput} 
            onChange={(e) => setAiInput(e.target.value)} 
            onKeyDown={(e) => { if (e.key === 'Enter') handleSendAIChat(); }} 
          />
          <button className="ai-send" onClick={handleSendAIChat}>➤</button>
        </div>
      </div>
    </div>
  );
}
