import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

export default function Stats({
  isActive,
  setCurrentScreen,
  tasks,
  gameData
}) {
  const chartRef = useRef(null);
  const chartInstRef = useRef(null);

  useEffect(() => {
    if (isActive && chartRef.current) {
      if (chartInstRef.current) {
        chartInstRef.current.destroy();
      }
      const done = tasks.filter(t => t.done).length;
      const avgScore = gameData.testScores.length 
        ? Math.round(gameData.testScores.reduce((a, b) => a + b, 0) / gameData.testScores.length) 
        : 0;

      chartInstRef.current = new Chart(chartRef.current, {
        type: 'line',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'],
          datasets: [
            {
              label: 'Tasks',
              data: [2, 3, 4, 3, 5, 6, done],
              borderColor: '#5b8dee',
              backgroundColor: 'rgba(91,141,238,0.08)',
              pointBackgroundColor: '#5b8dee',
              tension: 0.4,
              fill: true
            },
            {
              label: 'Score %',
              data: [60, 65, 70, 68, 75, 80, avgScore],
              borderColor: '#f0a500',
              backgroundColor: 'rgba(240,165,0,0.05)',
              pointBackgroundColor: '#f0a500',
              borderDash: [4, 3],
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#aaa', font: { size: 10 } }
            }
          },
          scales: {
            x: {
              ticks: { color: '#6b7799', font: { size: 9 } },
              grid: { color: 'rgba(255,255,255,0.04)' }
            },
            y: {
              ticks: { color: '#6b7799', font: { size: 9 } },
              grid: { color: 'rgba(255,255,255,0.04)' }
            }
          }
        }
      });
    }

    return () => {
      if (chartInstRef.current) {
        chartInstRef.current.destroy();
        chartInstRef.current = null;
      }
    };
  }, [isActive, tasks, gameData]);

  const doneTasks = tasks.filter(t => t.done).length;
  const totalTasks = tasks.length;
  const avgScore = gameData.testScores.length 
    ? Math.round(gameData.testScores.reduce((a, b) => a + b, 0) / gameData.testScores.length) 
    : 0;
  const readPct = Math.min(100, Math.round((doneTasks / Math.max(totalTasks, 1) * 40) + (avgScore * 0.4) + (gameData.streak * 2)));
  const readColor = readPct >= 70 ? '#4caf50' : readPct >= 40 ? '#f0a500' : '#ff4757';

  return (
    <div id="stats-screen" className={`screen ${isActive ? 'active' : ''}`}>
      <div className="stats-top">
        <div className="ai-title">📈 My Stats</div>
        <div className="ai-sub">Track your study performance</div>
      </div>
      <div className="stats-scroll">
        <div className="chart-box">
          <canvas ref={chartRef}></canvas>
        </div>
        <div className="stat-card" id="perf-card">
          <div className="stat-card-title">📊 Performance Overview</div>
          <div className="stat-row">
            <span className="stat-label">Tasks Completed Today</span>
            <span className="stat-val">{doneTasks}/{totalTasks}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Study Streak</span>
            <span className="stat-val">{gameData.streak} days 🔥</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Total XP Earned</span>
            <span className="stat-val">{gameData.xp} XP ⚡</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Tests Taken</span>
            <span className="stat-val">{gameData.testsTaken}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Avg Test Score</span>
            <span className="stat-val">{avgScore}%</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-card-title">🎯 Exam Readiness</div>
          <div id="readiness-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
              <span style={{ color: '#aaa' }}>Preparation Level</span>
              <span style={{ color: readColor, fontWeight: 700 }}>{readPct}%</span>
            </div>
            <div className="readiness-bar">
              <div className="readiness-fill" style={{ width: `${readPct}%`, background: readColor }}></div>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6b7799', marginTop: '6px' }}>
              {readPct >= 70 ? 'Great! You are well prepared.' : readPct >= 40 ? 'Good progress! Keep studying.' : 'Need more study time!'}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-title">📅 Weekly Activity</div>
          <div className="week-bars">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => {
              const val = [40, 60, 75, 55, 80, 90, totalTasks > 0 ? Math.round(doneTasks / totalTasks * 100) : 0][i];
              return (
                <div key={i} className="wday">
                  <div className="wbar-wrap">
                    <div className="wbar" style={{ height: `${val}%` }}></div>
                  </div>
                  <div className="wday-lbl">{d}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
