import React, { useState } from 'react';

export default function Notes({
  isActive,
  setCurrentScreen,
  addXP,
  showToast,
  notes,
  setNotes
}) {
  const [noteSubj, setNoteSubj] = useState('');
  const [noteBody, setNoteBody] = useState('');

  const handleSaveNote = () => {
    const subj = noteSubj.trim();
    const body = noteBody.trim();
    if (!subj || !body) {
      showToast('❌ Enter subject and notes!', '#ff4757');
      return;
    }
    const updated = [...notes, { id: Date.now(), subject: subj, text: body }];
    setNotes(updated);
    localStorage.setItem('sp_notes', JSON.stringify(updated));
    setNoteSubj('');
    setNoteBody('');
    showToast('✅ Note saved! +3 XP', '#4caf50');
    addXP(3);
  };

  const deleteNote = (id) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    localStorage.setItem('sp_notes', JSON.stringify(updated));
  };

  return (
    <div id="notes-screen" className={`screen ${isActive ? 'active' : ''}`}>
      <div className="notes-top">
        <div className="ai-title">📝 My Notes</div>
        <div className="ai-sub">Write and organize your study notes</div>
      </div>
      <div className="notes-scroll">
        <div className="note-add">
          <input className="n-inp" placeholder="Subject" value={noteSubj} onChange={(e) => setNoteSubj(e.target.value)} />
          <textarea className="n-ta" placeholder="Write your notes here..." value={noteBody} onChange={(e) => setNoteBody(e.target.value)}></textarea>
          <button className="n-btn" onClick={handleSaveNote}>💾 Save Note</button>
        </div>
        <div id="notes-list">
          {notes.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6b7799', padding: '16px', fontSize: '0.8rem' }}>
              No notes yet. Add your first note above!
            </div>
          ) : (
            notes.map(n => (
              <div key={n.id} className="note-card">
                <div className="note-subj">
                  <span>📚 {n.subject}</span>
                  <button className="ndel" onClick={() => deleteNote(n.id)}>🗑</button>
                </div>
                <div className="note-body">{n.text}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
