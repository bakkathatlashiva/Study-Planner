import React, { useState } from "react";

const STYLES = {
  mathematics: ["#3b5bdb", "⚛️"],
  chemistry: ["#e06b8b", "🧪"],
  physics: ["#00bcd4", "⚡"],
  "c program": ["#f0a500", "🐍"],
  "c programming": ["#f0a500", "🐍"],
  python: ["#4caf50", "🐍"],
  english: ["#9c27b0", "📖"],
  dbms: ["#ff6b6b", "🗄️"],
  bee: ["#f0a500", "⚡"],
  "data structures": ["#5b8dee", "🌳"],
  algorithms: ["#e06b8b", "🔄"],
  default: ["#5b8dee", "📚"],
};

const getTaskStyle = (name) => {
  const k = name.toLowerCase();
  for (const s in STYLES) {
    if (k.includes(s)) return STYLES[s];
  }
  return STYLES.default;
};

export default function Dashboard({
  isActive,
  currentUser,
  tasks,
  setTasks,
  exams,
  setExams,
  gameData,
  setGameData,
  addXP,
  showToast,
  setCurrentScreen,
}) {
  const [newTaskText, setNewTaskText] = useState("");
  const [sh, setSh] = useState("");
  const [sm, setSm] = useState("");
  const [sa, setSa] = useState("AM");
  const [eh, setEh] = useState("");
  const [em, setEm] = useState("");
  const [ea, setEa] = useState("AM");

  // --- Task Handlers ---
  const handleAddTask = () => {
    const text = newTaskText.trim();
    if (!text) {
      showToast("❌ Enter subject name!", "#ff4757");
      return;
    }
    if (!sh || !sm) {
      showToast("❌ Select start time!", "#ff4757");
      return;
    }
    if (!eh || !em) {
      showToast("❌ Select end time!", "#ff4757");
      return;
    }
    const updated = [
      ...tasks,
      {
        id: Date.now(),
        text,
        done: false,
        start: `${parseInt(sh)}:${sm} ${sa}`,
        end: `${parseInt(eh)}:${em} ${ea}`,
      },
    ];
    setTasks(updated);
    localStorage.setItem("sp_tasks", JSON.stringify(updated));
    setNewTaskText("");
    setSh("");
    setSm("");
    setEh("");
    setEm("");
    showToast("✅ Task added! +5 XP", "#4caf50");
    addXP(5);
  };

  const toggleTask = (id) => {
    const updated = tasks.map((t) => {
      if (t.id === id) {
        const nextDone = !t.done;
        if (nextDone) {
          addXP(10);
          showToast(`✅ "${t.text}" done! +10 XP`, "#4caf50");
        }
        return { ...t, done: nextDone };
      }
      return t;
    });
    setTasks(updated);
    localStorage.setItem("sp_tasks", JSON.stringify(updated));
  };

  const deleteTask = (id) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    localStorage.setItem("sp_tasks", JSON.stringify(updated));
  };

  const resetTasks = () => {
    if (confirm("Reset all tasks for today?")) {
      const updated = tasks.map((t) => ({ ...t, done: false }));
      setTasks(updated);
      localStorage.setItem("sp_tasks", JSON.stringify(updated));
      showToast("🔄 All tasks reset!", "#2b4fcc");
    }
  };

  const [showExamForm, setShowExamForm] = useState(false);
  const [newExamName, setNewExamName] = useState("");
  const [newExamDate, setNewExamDate] = useState("");

  // --- Countdown Exams Handlers ---
  const handleAddExam = () => {
    const name = newExamName.trim();
    const date = newExamDate;
    if (!name || !date) {
      showToast("❌ Enter exam name and date!", "#ff4757");
      return;
    }
    const updated = [...exams, { id: Date.now(), name, date }];
    setExams(updated);
    localStorage.setItem("sp_exams", JSON.stringify(updated));
    showToast("✅ Exam added!", "#4caf50");
    setNewExamName("");
    setNewExamDate("");
    setShowExamForm(false);
  };

  const deleteExam = (id) => {
    const updated = exams.filter((e) => e.id !== id);
    setExams(updated);
    localStorage.setItem("sp_exams", JSON.stringify(updated));
  };

  // --- Sub-Renderers ---
  const renderHoursOptions = () => {
    return [
      <option key="default" value="">
        HH
      </option>,
      ...Array.from({ length: 12 }, (_, i) => {
        const h = i + 1;
        const v = h < 10 ? "0" + h : "" + h;
        return (
          <option key={v} value={v}>
            {v}
          </option>
        );
      }),
    ];
  };

  const renderMinutesOptions = () => {
    return [
      <option key="default" value="">
        MM
      </option>,
      ...[
        "00",
        "05",
        "10",
        "15",
        "20",
        "25",
        "30",
        "35",
        "40",
        "45",
        "50",
        "55",
      ].map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      )),
    ];
  };

  return (
    <div id="dashboard" className={`screen ${isActive ? "active" : ""}`}>
      <div className="dash-top">
        <div className="dash-title">Hi {currentUser || "Student"}! 👋</div>
        <div className="dash-sub">Let's Plan Your Day</div>
        <div className="dash-date" id="date-bar">
          {(() => {
            const n = new Date();
            const days = [
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ];
            const months = [
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
              "Nov",
              "Dec",
            ];
            return `${days[n.getDay()]}, ${n.getDate()} ${months[n.getMonth()]} ${n.getFullYear()}`;
          })()}
        </div>
      </div>
      <div className="dash-scroll">
        {/* XP Bar */}
        <div className="xp-bar-wrap">
          <div className="xp-top">
            <span className="xp-label">⚡ {gameData.xp} XP</span>
            <span className="xp-level">
              Level {Math.floor(gameData.xp / 500) + 1} Student
            </span>
          </div>
          <div className="xp-bar">
            <div
              className="xp-fill"
              style={{ width: `${((gameData.xp % 500) / 500) * 100}%` }}
            ></div>
          </div>
          <div className="streak-row">
            <div className="streak-badge">
              🔥 Streak: <span>{gameData.streak}</span> days
            </div>
            <div className="streak-badge">
              🏆 Badges: <span>{gameData.badges}</span>
            </div>
            <div className="streak-badge">
              ✅ Today: <span>{tasks.filter((t) => t.done).length}</span>/
              <span>{tasks.length}</span>
            </div>
          </div>
        </div>

        {/* Daily Challenge */}
        <div
          className="challenge-box"
          onClick={() => {
            addXP(5);
            showToast("⚡ Challenge accepted! +5 XP", "#5b8dee");
          }}
        >
          <div className="challenge-title">⚡ Daily Challenge</div>
          <div className="challenge-text">
            {(() => {
              const challenges = [
                "Study for 2 hours without phone! 📵",
                "Complete all your tasks before 6 PM! ⏰",
                "Write notes for 1 chapter today! ✍️",
                "Solve 10 practice problems! 🧮",
                "Review yesterday's notes in 15 minutes! 🔄",
                "Take a mock test on your weakest subject! 🧪",
                "Read ahead: study tomorrow's topic today! 📚",
                "Create flashcards for 1 topic! 🗂",
              ];
              const idx = new Date().getDate() % challenges.length;
              return challenges[idx];
            })()}
          </div>
        </div>

        {/* Exam Countdown */}
        <div className="cdown-box">
          <div className="cdown-hdr">
            <span className="cdown-title">⏳ Exam Countdown</span>
            <button
              className="add-exam-btn"
              onClick={() => setShowExamForm((f) => !f)}
            >
              {showExamForm ? "✕ Cancel" : "+ Add Exam"}
            </button>
          </div>

          {showExamForm && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                margin: "8px 0 4px",
              }}
            >
              <input
                type="text"
                placeholder="Exam name (e.g. Mathematics Final)"
                value={newExamName}
                onChange={(e) => setNewExamName(e.target.value)}
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #2a3558",
                  background: "#141a2e",
                  color: "#fff",
                  fontSize: "0.8rem",
                  outline: "none",
                }}
              />
              <input
                type="date"
                value={newExamDate}
                onChange={(e) => setNewExamDate(e.target.value)}
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #2a3558",
                  background: "#141a2e",
                  color: "#fff",
                  fontSize: "0.8rem",
                  outline: "none",
                }}
              />
              <button
                onClick={handleAddExam}
                style={{
                  padding: "8px",
                  borderRadius: "8px",
                  background: "#4caf50",
                  border: "none",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                ✅ Add Exam
              </button>
            </div>
          )}

          <div id="cdown-list">
            {exams.length === 0 ? (
              <div style={{ fontSize: "0.7rem", color: "#6b7799" }}>
                Add your upcoming exams!
              </div>
            ) : (
              exams.map((e) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const d = new Date(e.date);
                d.setHours(0, 0, 0, 0);
                const diff = Math.ceil((d - today) / 86400000);
                const color =
                  diff <= 3 ? "#ff4757" : diff <= 7 ? "#f0a500" : "#4caf50";
                const label =
                  diff < 0
                    ? "Done!"
                    : diff === 0
                      ? "TODAY! 🔥"
                      : diff === 1
                        ? "Tomorrow!"
                        : diff + " days";
                return (
                  <div key={e.id} className="cdown-item">
                    <span className="cdown-name">📝 {e.name}</span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span className="cdown-days" style={{ color: color }}>
                        {label}
                      </span>
                      <button
                        onClick={() => deleteExam(e.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ff6b6b",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Tasks list */}
        <div className="sec-lbl">
          <span>📋 Today's Tasks</span>
          <button className="reset-btn" onClick={resetTasks}>
            🔄 Reset
          </button>
        </div>
        <div className="tasks-wrap">
          {tasks.map((t, idx) => {
            const [color, icon] = getTaskStyle(t.text);
            const elements = [];
            elements.push(
              <div key={t.id} className="task-row">
                <div className="t-icon" style={{ background: `${color}22` }}>
                  {icon}
                </div>
                <div
                  className={`t-card ${t.done ? "done" : ""}`}
                  style={{
                    background: `${color}0d`,
                    borderColor: `${color}22`,
                  }}
                  onClick={() => toggleTask(t.id)}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.83rem" }}>
                      {t.text}
                    </div>
                    <div
                      style={{
                        fontSize: "0.68rem",
                        color: "#aaa",
                        marginTop: "1px",
                      }}
                    >
                      {t.start} – {t.end}
                    </div>
                  </div>
                  <span style={{ fontSize: "1rem" }}>
                    {t.done ? "✅" : "⬜"}
                  </span>
                </div>
                <button className="t-del" onClick={() => deleteTask(t.id)}>
                  🗑
                </button>
              </div>,
            );
            // Insert breaks after second task
            if (idx === 1) {
              elements.push(
                <div key="lunch-break" className="break-row">
                  🍽 Lunch – 1:00 PM – 1:30 PM
                </div>,
              );
              elements.push(
                <div key="tea-break" className="break-row">
                  ☕ Break – 1:30 PM – 2:00 PM
                </div>,
              );
            }
            return elements;
          })}
        </div>

        {/* Add Task panel */}
        <div className="add-wrap">
          <div className="add-row">
            <input
              className="add-inp"
              placeholder="Add subject / task..."
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
            />
            <button className="add-btn" onClick={handleAddTask}>
              +
            </button>
          </div>
          <div className="time-row">
            <div className="t-col">
              <div className="t-lbl">⏰ Start</div>
              <div className="t-sels">
                <select
                  className="t-sel"
                  value={sh}
                  onChange={(e) => setSh(e.target.value)}
                >
                  {renderHoursOptions()}
                </select>
                <select
                  className="t-sel"
                  value={sm}
                  onChange={(e) => setSm(e.target.value)}
                >
                  {renderMinutesOptions()}
                </select>
                <select
                  className="t-ampm"
                  value={sa}
                  onChange={(e) => setSa(e.target.value)}
                >
                  <option>AM</option>
                  <option>PM</option>
                </select>
              </div>
            </div>
            <div
              style={{
                alignSelf: "flex-end",
                paddingBottom: "8px",
                color: "#6b7799",
                fontSize: "0.8rem",
              }}
            >
              →
            </div>
            <div className="t-col">
              <div className="t-lbl">🏁 End</div>
              <div className="t-sels">
                <select
                  className="t-sel"
                  value={eh}
                  onChange={(e) => setEh(e.target.value)}
                >
                  {renderHoursOptions()}
                </select>
                <select
                  className="t-sel"
                  value={em}
                  onChange={(e) => setEm(e.target.value)}
                >
                  {renderMinutesOptions()}
                </select>
                <select
                  className="t-ampm"
                  value={ea}
                  onChange={(e) => setEa(e.target.value)}
                >
                  <option>AM</option>
                  <option>PM</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
