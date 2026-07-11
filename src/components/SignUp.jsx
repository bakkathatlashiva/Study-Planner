import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";

export default function SignUp({
  isActive,
  setCurrentScreen,
  setCurrentUser,
  initApp,
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSignup = async () => {
    const emailVal = email.trim();
    const nameVal = name.trim();
    const passVal = password;
    const confVal = confirm;

    if (!emailVal || !nameVal || !passVal || !confVal) {
      setError("❌ Please fill all fields!");
      return;
    }
    if (passVal.length < 6 || !/\d/.test(passVal)) {
      setError("❌ Password: min 6 chars with a number!");
      return;
    }
    if (passVal !== confVal) {
      setError("❌ Passwords do not match!");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        emailVal,
        passVal,
      );
      await updateProfile(credential.user, { displayName: nameVal });
      setCurrentUser(nameVal);
      localStorage.setItem("sp_current", nameVal);
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
      if (err.code !== "auth/popup-closed-by-user") {
        setError(`❌ ${firebaseErrorMessage(err.code)}`);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div id="signup" className={`screen ${isActive ? "active" : ""}`}>
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
          <div className="auth-s">Create your account</div>

          {error && (
            <div className="err" style={{ display: "block" }}>
              {error}
            </div>
          )}

          {/* Google Sign-Up */}
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
            {googleLoading ? "Signing up…" : "Continue with Google"}
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
              disabled={loading || googleLoading}
            />
          </div>
          <div className="fld">
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading || googleLoading}
            />
          </div>
          <div className="fld">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || googleLoading}
            />
            <button
              className="eye-btn"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "🙈" : "👁"}
            </button>
            <div className="fld-hint">Min 6 characters with a number</div>
          </div>
          <div className="fld">
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading || googleLoading}
            />
            <button
              className="eye-btn"
              onClick={() => setShowConfirm(!showConfirm)}
            >
              {showConfirm ? "🙈" : "👁"}
            </button>
          </div>
          <button
            className="abtn abtn-b"
            onClick={handleSignup}
            disabled={loading || googleLoading}
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </div>
        <div className="blink">
          Already have an account?{" "}
          <span onClick={() => setCurrentScreen("login")}>Log In</span>
        </div>
      </div>
    </div>
  );
}

function firebaseErrorMessage(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists!";
    case "auth/invalid-email":
      return "Invalid email address!";
    case "auth/weak-password":
      return "Password is too weak!";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    case "auth/popup-blocked":
      return "Popup blocked by browser. Please allow popups.";
    default:
      return "Registration failed. Please try again.";
  }
}
