import {
  googleLoginUrl,
  register,
  resendVerification,
  saveSession,
  verifyGoogleToken,
} from "../utils/api";
import React, { useState } from "react";

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

  // Step 2: waiting for email verification
  const [verifyStep, setVerifyStep] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [checkingVerify, setCheckingVerify] = useState(false);
  const [resending, setResending] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");

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
      const response = await register(nameVal, emailVal, passVal);
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to create account.");
      if (data.requiresVerification) {
        setVerifyEmail(emailVal);
        setVerifyStep(true);
      } else {
        saveSession(data);
        setCurrentUser(data.user.name);
        initApp();
      }
    } catch (err) {
      setError(`❌ ${err.message || "Unable to create account."}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerified = async () => {
    setCheckingVerify(true);
    setVerifyMsg("");
    setError("");
    try {
      setError("❌ Open the verification link from your email, then sign in.");
    } catch (err) {
      setError(`❌ ${err.message || "Unable to verify email."}`);
    } finally {
      setCheckingVerify(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setVerifyMsg("");
    setError("");
    try {
      const response = await resendVerification(verifyEmail);
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to resend verification email.");
      setVerifyMsg("✅ Check your inbox for the verification link.");
    } catch {
      setError("❌ Failed to resend. Try again.");
    } finally {
      setResending(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);

    const clientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      "262381768373-b53deis1h3ji7p60n0cab3hpcgqts5p6.apps.googleusercontent.com";

    if (window.google?.accounts?.oauth2 && clientId) {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "openid email profile",
          callback: async (tokenResponse) => {
            if (tokenResponse.error) {
              setGoogleLoading(false);
              if (tokenResponse.error !== "popup_closed_by_user") {
                setError(`❌ Google sign in: ${tokenResponse.error}`);
              }
              return;
            }
            try {
              const resp = await verifyGoogleToken({
                accessToken: tokenResponse.access_token,
              });
              const data = await resp.json();
              if (!resp.ok)
                throw new Error(data.error || "Unable to sign in with Google.");
              saveSession(data);
              setCurrentUser(data.user.name);
              initApp();
            } catch (err) {
              setError(`❌ ${err.message || "Google authentication failed."}`);
            } finally {
              setGoogleLoading(false);
            }
          },
        });
        tokenClient.requestAccessToken({ prompt: "select_account" });
        return;
      } catch (gisErr) {
        console.warn("GIS token client error:", gisErr);
      }
    }

    window.location.href = googleLoginUrl;
  };


  // ── Verification waiting screen ──────────────────────────────────────────
  if (verifyStep) {
    return (
      <div id="signup" className={`screen ${isActive ? "active" : ""}`}>
        <div className="auth-wrap">
          <div>
            <div className="brand-tag">
              Giggling Platypus Co. 🌲<small>Study Planner Pro</small>
            </div>
            <div className="auth-h" style={{ fontSize: "2rem" }}>
              Check Your
              <br />
              Gmail 📧
            </div>
            <div className="auth-s" style={{ marginBottom: "20px" }}>
              We sent a verification link to
            </div>

            {/* Email pill */}
            <div
              style={{
                background: "rgba(91,141,238,0.08)",
                border: "1px solid rgba(91,141,238,0.2)",
                borderRadius: "10px",
                padding: "10px 16px",
                textAlign: "center",
                color: "#5b8dee",
                fontWeight: 700,
                fontSize: "0.9rem",
                marginBottom: "20px",
                wordBreak: "break-all",
              }}
            >
              {verifyEmail}
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "12px",
                padding: "14px 16px",
                fontSize: "0.82rem",
                color: "#8899cc",
                lineHeight: 1.7,
                marginBottom: "20px",
              }}
            >
              1. Open your Gmail inbox
              <br />
              2. Find the email from{" "}
              <b style={{ color: "#ffd60a" }}>Study Planner Pro</b>
              <br />
              3. Click the <b style={{ color: "#4caf50" }}>verification link</b>
              <br />
              4. Come back here and click{" "}
              <b style={{ color: "#fff" }}>I've Verified</b>
            </div>

            {error && (
              <div
                className="err"
                style={{ display: "block", marginBottom: "12px" }}
              >
                {error}
              </div>
            )}
            {verifyMsg && (
              <div
                className="succ"
                style={{ display: "block", marginBottom: "12px", marginTop: 0 }}
              >
                {verifyMsg}
              </div>
            )}

            <button
              className="abtn abtn-b"
              onClick={handleCheckVerified}
              disabled={checkingVerify}
              style={{ marginBottom: "10px" }}
            >
              {checkingVerify ? "Checking…" : "✅ I've Verified My Email"}
            </button>

            <button
              onClick={handleResend}
              disabled={resending}
              style={{
                width: "100%",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                color: "#7a87b0",
                fontSize: "0.85rem",
                fontWeight: 600,
                padding: "12px",
                cursor: "pointer",
                fontFamily: "Outfit, sans-serif",
              }}
            >
              {resending ? "Sending…" : "🔄 Resend Verification Email"}
            </button>
          </div>

          <div className="blink">
            Wrong email?{" "}
            <span
              onClick={() => {
                setVerifyStep(false);
                setError("");
                setVerifyMsg("");
              }}
            >
              Go Back
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration form ────────────────────────────────────────────────────
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
