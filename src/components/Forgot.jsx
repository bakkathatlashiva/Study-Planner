import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";

export default function Forgot({ isActive, setCurrentScreen }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    const emailVal = email.trim();
    if (!emailVal) {
      setError("❌ Please enter your email!");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, emailVal);
      setSuccessMsg("✅ Password reset email sent! Check your inbox.");
      setEmail("");
      setTimeout(() => {
        setSuccessMsg("");
        setCurrentScreen("login");
      }, 3000);
    } catch (err) {
      const msg = firebaseErrorMessage(err.code);
      setError(`❌ ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleReset();
  };

  return (
    <div id="forgot" className={`screen ${isActive ? "active" : ""}`}>
      <div className="auth-wrap">
        <div>
          <div className="brand-tag">
            Giggling Platypus Co. 🌲<small>Study Planner Pro</small>
          </div>
          <div className="auth-h">
            Reset
            <br />
            Password
          </div>
          <div className="auth-s" style={{ marginBottom: "12px" }}>
            Enter your email and we'll send you a reset link
          </div>

          {error && (
            <div
              className="err"
              style={{ display: "block", marginBottom: "12px" }}
            >
              {error}
            </div>
          )}
          {successMsg && (
            <div
              className="succ"
              style={{ display: "block", marginBottom: "12px", marginTop: "0" }}
            >
              {successMsg}
            </div>
          )}

          <div className="fld">
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || !!successMsg}
            />
          </div>

          <button
            className="abtn abtn-b"
            onClick={handleReset}
            disabled={loading || !!successMsg}
          >
            {loading ? "Sending…" : "Send Reset Email"}
          </button>
        </div>
        <div className="blink">
          Back to{" "}
          <span
            onClick={() => {
              setError("");
              setSuccessMsg("");
              setCurrentScreen("login");
            }}
          >
            Log In
          </span>
        </div>
      </div>
    </div>
  );
}

function firebaseErrorMessage(code) {
  switch (code) {
    case "auth/user-not-found":
    case "auth/invalid-credential":
      return "No account found with this email.";
    case "auth/invalid-email":
      return "Invalid email address!";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    default:
      return "Failed to send reset email. Please try again.";
  }
}
