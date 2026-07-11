import React, { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase";

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
      const msg = firebaseErrorMessage(err.code);
      setError(`❌ ${msg}`);
    } finally {
      setLoading(false);
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
          <div className="fld">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="fld">
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="fld">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
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
              disabled={loading}
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
            disabled={loading}
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
    default:
      return "Registration failed. Please try again.";
  }
}
