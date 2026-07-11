import React, { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

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
  const [googleLoading, setGoogleLoading] = useState(false);

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
      // Block unverified email/password accounts
      if (!user.emailVerified) {
        await auth.signOut();
        setError("❌ Please verify your email first. Check your Gmail inbox.");
        return;
      }
      const displayName = user.displayName || user.email.split("@")[0];
      setCurrentUser(displayName);
      localStorage.setItem("sp_current", displayName);
      initApp();
    } catch (err) {
      setError(`❌ ${firebaseErrorMessage(err.code)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      const user = credential.user;
      const displayName = user.displayName || user.email.split("@")[0];
      setCurrentUser(displayName);
      localStorage.setItem("sp_current", displayName);
      initApp();
    } catch (err) {
      const msg = firebaseErrorMessage(err.code);
      if (msg) setError(`❌ ${msg}`);
    } finally {
      setGoogleLoading(false);
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

          {/* Google Sign-In */}
          <button
            className="google-btn"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"
                fill="#EA4335"
              />
            </svg>
            {googleLoading ? "Signing in…" : "Continue with Google"}
          </button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <div className="fld">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || googleLoading}
            />
          </div>
          <div className="fld">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || googleLoading}
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
            disabled={loading || googleLoading}
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
    case "auth/popup-blocked":
      return "Popup blocked by browser. Please allow popups.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized in Firebase. Add it in Firebase Console → Authentication → Settings → Authorized domains.";
    case "auth/operation-not-allowed":
      return "Google sign-in is not enabled. Enable it in Firebase Console.";
    case "auth/cancelled-popup-request":
    case "auth/popup-closed-by-user":
      return ""; // silent
    default:
      return `Login failed (${code}). Please try again.`;
  }
}
