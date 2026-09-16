import React, { useState, useEffect } from "react";
import {
  clearSession,
  logout,
  restoreSession,
  saveSession,
  verifyEmail,
} from "./utils/api";
import Splash from "./components/Splash";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import Forgot from "./components/Forgot";
import Dashboard from "./components/Dashboard";
import AIAssistant from "./components/AIAssistant";
import MockTest from "./components/MockTest";
import StudyPlan from "./components/StudyPlan";
import Notes from "./components/Notes";
import Stats from "./components/Stats";
import CareerHub from "./components/CareerHub";
import Roadmap from "./components/Roadmap";
import PlacementPrep from "./components/PlacementPrep";
import ResumeBuilder from "./components/ResumeBuilder";
import Sidebar from "./components/Sidebar";

// LocalStorage helpers
const getScopedKey = (k, user) => (user ? `${k}_${user}` : k);
const SV = (k, v, user) =>
  localStorage.setItem(getScopedKey(k, user), JSON.stringify(v));
const GV = (k, d, user) => {
  try {
    const val = localStorage.getItem(getScopedKey(k, user));
    return val ? JSON.parse(val) : d;
  } catch {
    return d;
  }
};

const SCREEN_PATHS = {
  dashboard: "/dashboard",
  "ai-screen": "/ai-assistant",
  "test-screen": "/mock-test",
  "plan-screen": "/study-plan",
  "notes-screen": "/notes",
  "stats-screen": "/stats",
  "career-screen": "/career",
  "roadmap-screen": "/career/roadmap",
  "placement-screen": "/career/placement",
  "resume-screen": "/career/resume",
  login: "/login",
  signup: "/signup",
  forgot: "/forgot-password",
};

const screenFromPath = (pathname) =>
  Object.entries(SCREEN_PATHS).find(([, path]) => path === pathname)?.[0] ||
  null;

const initialScreenFromLocation = () =>
  screenFromPath(window.location.pathname) || "splash";

export default function App() {
  // --- Navigation & Auth ---
  const [currentScreen, setCurrentScreen] = useState(initialScreenFromLocation);
  const [currentUser, setCurrentUser] = useState(
    localStorage.getItem("sp_current") || null,
  );
  const [authReady, setAuthReady] = useState(false);

  // --- App Core Global State ---
  const [tasks, setTasks] = useState(() =>
    GV(
      "sp_tasks",
      [
        {
          id: 1,
          text: "Mathematics",
          start: "9:00 AM",
          end: "11:00 AM",
          done: false,
        },
        {
          id: 2,
          text: "Chemistry",
          start: "11:15 AM",
          end: "1:00 PM",
          done: false,
        },
        {
          id: 3,
          text: "C Programming",
          start: "2:00 PM",
          end: "4:00 PM",
          done: false,
        },
      ],
      localStorage.getItem("sp_current"),
    ),
  );
  const [notes, setNotes] = useState(() =>
    GV("sp_notes", [], localStorage.getItem("sp_current")),
  );
  const [exams, setExams] = useState(() =>
    GV("sp_exams", [], localStorage.getItem("sp_current")),
  );
  const [subjects, setSubjects] = useState(() =>
    GV("sp_subjects", [], localStorage.getItem("sp_current")),
  );
  const [plans, setPlans] = useState(() =>
    GV("sp_plans", [], localStorage.getItem("sp_current")),
  );
  const [gameData, setGameData] = useState(() =>
    GV(
      "sp_game",
      {
        xp: 0,
        streak: 0,
        badges: 0,
        lastStudy: "",
        testScores: [],
        testsTaken: 0,
      },
      localStorage.getItem("sp_current"),
    ),
  );

  // --- Toast, Alarms ---
  const [toast, setToast] = useState({
    message: "",
    color: "",
    visible: false,
  });
  const [alarmPop, setAlarmPop] = useState(null); // Name of the active alarm to display

  // --- Restore the local JWT session ---
  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      let authenticatedFromCallback = false;
      const authFragment = new URLSearchParams(
        window.location.hash.slice(1),
      ).get("auth");
      if (authFragment) {
        try {
          saveSession(
            JSON.parse(
              atob(
                authFragment.replace(/-/g, "+").replace(/_/g, "/") +
                  "=".repeat((4 - (authFragment.length % 4)) % 4),
              ),
            ),
          );
          authenticatedFromCallback = true;
          window.history.replaceState(null, "", window.location.pathname);
        } catch {
          clearSession();
        }
      }

      const verificationToken = new URLSearchParams(window.location.search).get(
        "token",
      );
      if (verificationToken) {
        try {
          const response = await verifyEmail(verificationToken);
          if (response.ok) {
            saveSession(await response.json());
            authenticatedFromCallback = true;
            window.history.replaceState(null, "", window.location.pathname);
          }
        } catch {
          // The normal login screen remains available when verification fails.
        }
      }

      const session = await restoreSession();
      if (!cancelled && session?.user?.name) {
        setCurrentUser(session.user.name);
        setCurrentScreen((prev) => {
          if (
            authenticatedFromCallback ||
            prev === "login" ||
            prev === "signup"
          ) {
            window.history.replaceState(null, "", SCREEN_PATHS.dashboard);
            return "dashboard";
          }
          if (prev !== "splash") return prev;
          if (window.location.pathname === "/") {
            window.history.replaceState(null, "", SCREEN_PATHS.dashboard);
            return "dashboard";
          }
          return prev;
        });
      }
      if (!cancelled) setAuthReady(true);
    };
    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Splash screen transition (no user case) ---
  useEffect(() => {
    if (!authReady) return;
    askNotif();
    const timer = setTimeout(() => {
      setCurrentScreen((prev) => {
        if (prev === "splash") return "login";
        return prev;
      });
    }, 2200);
    return () => clearTimeout(timer);
  }, [authReady]);

  useEffect(() => {
    const publicScreens = ["splash", "login", "signup", "forgot"];
    if (authReady && !currentUser && !publicScreens.includes(currentScreen)) {
      window.history.replaceState(null, "", SCREEN_PATHS.login);
      setCurrentScreen("login");
    }
  }, [authReady, currentUser, currentScreen]);

  useEffect(() => {
    const handlePopState = () => {
      const screen = screenFromPath(window.location.pathname);
      if (screen) setCurrentScreen(screen);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // --- Periodic Alarm Checker (30 seconds) ---
  useEffect(() => {
    let alarmTimer = null;
    if (currentUser) {
      checkAlarms();
      alarmTimer = setInterval(checkAlarms, 30000);
    }
    return () => {
      if (alarmTimer) clearInterval(alarmTimer);
    };
  }, [currentUser, tasks]);

  // --- Auto-persist State Changes to Scoped LocalStorage ---
  useEffect(() => {
    if (currentUser) {
      SV("sp_tasks", tasks, currentUser);
    }
  }, [tasks, currentUser]);

  useEffect(() => {
    if (currentUser) {
      SV("sp_notes", notes, currentUser);
    }
  }, [notes, currentUser]);

  useEffect(() => {
    if (currentUser) {
      SV("sp_exams", exams, currentUser);
    }
  }, [exams, currentUser]);

  useEffect(() => {
    if (currentUser) {
      SV("sp_subjects", subjects, currentUser);
    }
  }, [subjects, currentUser]);

  useEffect(() => {
    if (currentUser) {
      SV("sp_plans", plans, currentUser);
    }
  }, [plans, currentUser]);

  useEffect(() => {
    if (currentUser) {
      SV("sp_game", gameData, currentUser);
    }
  }, [gameData, currentUser]);

  // --- App Initialization state checks ---
  const initApp = () => {
    checkResetAndStreak();
    window.history.replaceState(null, "", SCREEN_PATHS.dashboard);
    // Reload page to re-initialize all user-scoped states from localStorage
    window.location.reload();
  };

  const checkResetAndStreak = () => {
    const today = new Date().toDateString();
    const storedReset = localStorage.getItem("sp_reset") || "";

    // Check Reset
    if (storedReset !== today) {
      const updatedTasks = tasks.map((t) => ({ ...t, done: false }));
      setTasks(updatedTasks);
      SV("sp_tasks", updatedTasks, currentUser);
      localStorage.setItem("sp_reset", today);

      // Update Streak
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      setGameData((prev) => {
        let updated = { ...prev };
        if (prev.lastStudy === yesterday) {
          updated.streak++;
        } else if (prev.lastStudy !== today) {
          updated.streak = 1;
        }
        updated.lastStudy = today;
        SV("sp_game", updated, currentUser);
        return updated;
      });
    } else {
      // Just make sure streak is updated if last study was yesterday
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      setGameData((prev) => {
        let updated = { ...prev };
        if (prev.lastStudy === yesterday) {
          updated.streak++;
          updated.lastStudy = today;
          SV("sp_game", updated, currentUser);
        } else if (prev.lastStudy === "") {
          updated.streak = 1;
          updated.lastStudy = today;
          SV("sp_game", updated, currentUser);
        }
        return updated;
      });
    }
  };

  // --- Experience Points (XP) ---
  const addXP = (amount) => {
    setGameData((prev) => {
      const updatedXp = prev.xp + amount;
      const level = Math.floor(updatedXp / 500) + 1;
      const prevLevel = Math.floor(prev.xp / 500) + 1;
      if (level > prevLevel) {
        showToast(`🏆 Level Up! You're now Level ${level}!`, "#f0a500");
      }
      const updated = { ...prev, xp: updatedXp };
      SV("sp_game", updated, currentUser);
      return updated;
    });
  };

  // --- Show Toast Notification ---
  const showToast = (msg, color) => {
    setToast({ message: msg, color: color || "#2b4fcc", visible: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 4000);
  };

  // --- Browser Notifications & Audio Beeps ---
  const askNotif = () => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  const sendNotif = (title, body) => {
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, { body, requireInteraction: true });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.5, 1].forEach((d) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.4, ctx.currentTime + d);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d + 0.4);
        o.start(ctx.currentTime + d);
        o.stop(ctx.currentTime + d + 0.4);
      });
    } catch (e) {
      console.error(e);
    }
  };

  // --- Alarm Timers Helper ---
  const parseTime = (str) => {
    if (!str || str === "--") return null;
    const m = str.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!m) return null;
    let h = parseInt(m[1]);
    const min = parseInt(m[2]);
    const ap = m[3].toUpperCase();
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return { h, min };
  };

  const checkAlarms = () => {
    const n = new Date();
    const ch = n.getHours();
    const cm = n.getMinutes();
    tasks.forEach((t) => {
      if (t.done) return;
      const time = parseTime(t.start);
      if (!time) return;
      let rh = time.h;
      let rm = time.min - 5;
      if (rm < 0) {
        rm += 60;
        rh--;
      }
      if (rh === ch && rm === cm) {
        showToast(`⏰ 5 minutes until "${t.text}"!`, "#f0a500");
        sendNotif(
          "⏰ 5 Min Reminder!",
          `${t.text} starts in 5 minutes! Get ready 💪`,
        );
      }
      if (time.h === ch && time.min === cm) {
        playBeep();
        setAlarmPop(t.text);
        sendNotif(
          "🔔 Study Time!",
          `Time to study ${t.text}! Complete the task! 💪`,
        );
      }
    });
  };

  const handleLogout = async () => {
    await logout().catch(() => {});
    setCurrentUser(null);
    clearSession();
    // Clear session-level temporary state by reloading to root
    window.location.href = SCREEN_PATHS.login;
  };

  const navigateToScreen = (screen) => {
    if (screen === "ai-screen" && !currentUser) {
      window.history.pushState(null, "", SCREEN_PATHS.login);
      setCurrentScreen("login");
      return;
    }
    const nextPath = SCREEN_PATHS[screen];
    if (nextPath && window.location.pathname !== nextPath) {
      window.history.pushState(
        null,
        "",
        `${nextPath}${window.location.search}`,
      );
    }
    setCurrentScreen(screen);
  };

  const visibleScreen = authReady ? currentScreen : "splash";
  const isMainScreen = !["splash", "login", "signup", "forgot"].includes(
    visibleScreen,
  );

  return (
    <>
      {/* Toast Notification Container */}
      {toast.visible && (
        <div className="toast" style={{ background: toast.color }}>
          {toast.message}
        </div>
      )}

      {/* Alarm Full-screen Alert Popup */}
      {alarmPop && (
        <div className="alarm-pop">
          <div style={{ fontSize: "3rem" }}>🔔</div>
          <div
            style={{
              fontFamily: "Nunito,sans-serif",
              fontSize: "1.4rem",
              fontWeight: 900,
              color: "#f0a500",
            }}
          >
            Study Time!
          </div>
          <div
            style={{
              fontSize: "0.92rem",
              color: "#fff",
              textAlign: "center",
              padding: "0 28px",
              lineHeight: 1.8,
            }}
          >
            <b style={{ color: "#f0a500" }}>{alarmPop}</b>
            <br />
            It's time to study!
            <br />
            Complete the task! 💪
          </div>
          <button
            onClick={() => setAlarmPop(null)}
            style={{
              background: "#f0a500",
              border: "none",
              borderRadius: "10px",
              color: "#111",
              fontSize: "1rem",
              fontWeight: 800,
              padding: "13px 36px",
              cursor: "pointer",
              fontFamily: "Nunito,sans-serif",
            }}
          >
            OK, Starting! ✅
          </button>
        </div>
      )}

      <div className={isMainScreen ? "app-container" : ""}>
        {isMainScreen && (
          <Sidebar
            currentScreen={visibleScreen}
            setCurrentScreen={navigateToScreen}
            currentUser={currentUser}
            handleLogout={handleLogout}
          />
        )}

        <div className={isMainScreen ? "main-content" : ""}>
          {/* Splash Screen */}
          <Splash isActive={visibleScreen === "splash"} />

          {/* Login Screen */}
          <Login
            isActive={visibleScreen === "login"}
            setCurrentScreen={navigateToScreen}
            setCurrentUser={setCurrentUser}
            initApp={initApp}
          />

          {/* Forgot Password Screen */}
          <Forgot
            isActive={visibleScreen === "forgot"}
            setCurrentScreen={navigateToScreen}
          />

          {/* Signup Screen */}
          <SignUp
            isActive={visibleScreen === "signup"}
            setCurrentScreen={navigateToScreen}
            setCurrentUser={setCurrentUser}
            initApp={initApp}
          />

          {/* Dashboard Screen */}
          <Dashboard
            isActive={visibleScreen === "dashboard"}
            currentUser={currentUser}
            tasks={tasks}
            setTasks={setTasks}
            exams={exams}
            setExams={setExams}
            gameData={gameData}
            setGameData={setGameData}
            addXP={addXP}
            showToast={showToast}
            setCurrentScreen={navigateToScreen}
          />

          {/* AI Assistant Screen */}
          <AIAssistant
            isActive={visibleScreen === "ai-screen" && Boolean(currentUser)}
            setCurrentScreen={navigateToScreen}
            addXP={addXP}
          />

          {/* Mock Test Screen */}
          <MockTest
            isActive={visibleScreen === "test-screen"}
            setCurrentScreen={navigateToScreen}
            addXP={addXP}
            showToast={showToast}
            subjects={subjects}
            setSubjects={setSubjects}
            gameData={gameData}
            setGameData={setGameData}
          />

          {/* Plan Screen */}
          <StudyPlan
            isActive={visibleScreen === "plan-screen"}
            setCurrentScreen={navigateToScreen}
            addXP={addXP}
            showToast={showToast}
            plans={plans}
            setPlans={setPlans}
          />

          {/* Notes Screen */}
          <Notes
            isActive={visibleScreen === "notes-screen"}
            setCurrentScreen={navigateToScreen}
            addXP={addXP}
            showToast={showToast}
            notes={notes}
            setNotes={setNotes}
          />

          {/* Stats Screen */}
          <Stats
            isActive={visibleScreen === "stats-screen"}
            setCurrentScreen={navigateToScreen}
            tasks={tasks}
            gameData={gameData}
          />

          {/* Career Hub Screen */}
          <CareerHub
            isActive={visibleScreen === "career-screen"}
            setCurrentScreen={navigateToScreen}
          />

          {/* Career Roadmap Screen */}
          <Roadmap
            isActive={visibleScreen === "roadmap-screen"}
            setCurrentScreen={navigateToScreen}
            addXP={addXP}
            showToast={showToast}
          />

          {/* Placement Prep Screen */}
          <PlacementPrep
            isActive={visibleScreen === "placement-screen"}
            setCurrentScreen={navigateToScreen}
            addXP={addXP}
            showToast={showToast}
          />

          {/* Resume Builder Screen */}
          <ResumeBuilder
            isActive={visibleScreen === "resume-screen"}
            setCurrentScreen={navigateToScreen}
            addXP={addXP}
            showToast={showToast}
          />
        </div>
      </div>
    </>
  );
}
