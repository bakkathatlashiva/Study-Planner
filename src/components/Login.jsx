import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

export default function Login({
  isActive,
  setCurrentScreen,
  setCurrentUser,
  initApp,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const e = email.trim();
    const p = password;
    if (!e || !p) {
      setError("❌ Please fill all fields!");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, e, p);
      const user = credential.user;
      const displayName = user.displayName || user.email.split("@")[0];
      setCurrentUser(displayName);
      localStorage.setItem("sp_current", displayName);
      initApp();
    } catch (err) {
      const msg = firebaseErrorMessage(err.code);
      setError(`❌ ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div id="login" className={`screen ${isActive ? "active" : ""}`}>
      <div className="auth-wrap">
        <div>
          <div className="brand-tag">
            Giggling Platypus Co. 🌲<small>Study Planner Pro</small>
          </div>
          <div className="auth-h">
            Hi!
            <br />
            Welcome
          </div>
          <div className="auth-s">Please enter your details to continue</div>
          {error && (
            <div className="err" style={{ display: "block" }}>
              {error}
            </div>
          )}
          <div className="fld">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
          </div>
          <div className="fld">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              className="eye-btn"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>
          <div className="auth-row">
            <label className="chk-lbl">
              <input type="checkbox" /> Remember Me
            </label>
            <span className="fgt" onClick={() => setCurrentScreen("forgot")}>
              Forgot Password?
            </span>
          </div>
          <button
            className="abtn abtn-w"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "Logging in…" : "Log In"}
          </button>
        </div>
        <div className="blink">
          Don't have an account?{" "}
          <span onClick={() => setCurrentScreen("signup")}>Sign Up</span>
        </div>
      </div>
    </div>
  );
}

function firebaseErrorMessage(code) {
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Wrong email or password!";
    case "auth/invalid-email":
      return "Invalid email address!";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    default:
      return "Login failed. Please try again.";
  }
}
