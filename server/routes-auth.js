const express = require("express");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("./email");
const {
  authenticate,
  bcrypt,
  consumeOneTimeToken,
  createOneTimeToken,
  hashToken,
  issueSession,
  query,
} = require("./auth");

const router = express.Router();
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "";
const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
});

const validateCredentials = (email, password) => {
  if (!/^\S+@\S+\.\S+$/.test(email || ""))
    return "Enter a valid email address.";
  if (typeof password !== "string" || password.length < 6)
    return "Password must be at least 6 characters.";
  return null;
};

const googleClient = () =>
  new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
  );

const googleConfigError = () => {
  const missing = [
    ["GOOGLE_CLIENT_ID", process.env.GOOGLE_CLIENT_ID],
    ["GOOGLE_CLIENT_SECRET", process.env.GOOGLE_CLIENT_SECRET],
    ["GOOGLE_REDIRECT_URI", GOOGLE_REDIRECT_URI],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
  return missing.length
    ? `Google OAuth is missing: ${missing.join(", ")}`
    : null;
};

router.post("/register", async (req, res, next) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();
  const password = String(req.body.password || "");
  const validationError = validateCredentials(email, password);
  if (!name || validationError)
    return res
      .status(400)
      .json({ error: validationError || "Name is required." });

  try {
    const existing = await query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);
    if (existing.rowCount)
      return res
        .status(409)
        .json({ error: "An account with this email already exists." });
    const passwordHash = await bcrypt.hash(password, 12);
    const verified = !process.env.SMTP_HOST;
    const result = await query(
      `INSERT INTO users (name, email, password_hash, email_verified_at)
       VALUES ($1, $2, $3, CASE WHEN $4 THEN NOW() ELSE NULL END)
       RETURNING id, name, email`,
      [name, email, passwordHash, verified],
    );
    const user = result.rows[0];

    if (!verified) {
      const token = await createOneTimeToken(user.id, "verify_email", 24);
      await sendEmail({
        to: email,
        subject: "Verify your Study Planner account",
        text: `Open ${process.env.APP_URL || "http://localhost:5173"}/verify-email?token=${token} to verify your email.`,
      });
      return res
        .status(201)
        .json({ requiresVerification: true, user: publicUser(user) });
    }

    return res.status(201).json(await issueSession(user));
  } catch (error) {
    return next(error);
  }
});

router.post("/verify-email", async (req, res, next) => {
  try {
    const tokenUser = await consumeOneTimeToken(
      String(req.body.token || ""),
      "verify_email",
    );
    if (!tokenUser)
      return res
        .status(400)
        .json({ error: "Verification link is invalid or expired." });
    const result = await query(
      "UPDATE users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING id, name, email",
      [tokenUser.user_id],
    );
    return res.json(await issueSession(result.rows[0]));
  } catch (error) {
    return next(error);
  }
});

router.post("/resend-verification", async (req, res, next) => {
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();
  try {
    const result = await query(
      "SELECT id FROM users WHERE email = $1 AND email_verified_at IS NULL",
      [email],
    );
    if (result.rowCount && process.env.SMTP_HOST) {
      const token = await createOneTimeToken(
        result.rows[0].id,
        "verify_email",
        24,
      );
      await sendEmail({
        to: email,
        subject: "Verify your Study Planner account",
        text: `Open ${process.env.APP_URL || "http://localhost:5173"}/verify-email?token=${token} to verify your email.`,
      });
    }
    return res.json({
      message: "If verification is required, a new email has been sent.",
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();
  const password = String(req.body.password || "");
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required." });
  try {
    const result = await query(
      "SELECT id, name, email, password_hash, email_verified_at FROM users WHERE email = $1",
      [email],
    );
    const user = result.rows[0];
    if (
      !user ||
      !user.password_hash ||
      !(await bcrypt.compare(password, user.password_hash))
    )
      return res.status(401).json({ error: "Wrong email or password." });
    if (!user.email_verified_at)
      return res
        .status(403)
        .json({ error: "Please verify your email before signing in." });
    return res.json(await issueSession(user));
  } catch (error) {
    return next(error);
  }
});

router.get("/google", (_req, res) => {
  const configError = googleConfigError();
  if (configError) return res.status(503).send(configError);
  const url = googleClient().generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    prompt: "select_account",
    redirect_uri: GOOGLE_REDIRECT_URI,
    state: jwt.sign(
      { nonce: require("crypto").randomBytes(16).toString("hex") },
      process.env.JWT_SECRET,
      { expiresIn: "10m" },
    ),
  });
  return res.redirect(url);
});

router.get("/google/callback", async (req, res, next) => {
  try {
    const configError = googleConfigError();
    if (configError) return res.status(503).send(configError);
    jwt.verify(String(req.query.state || ""), process.env.JWT_SECRET);
    const client = googleClient();
    const { tokens } = await client.getToken({
      code: String(req.query.code || ""),
      redirect_uri: GOOGLE_REDIRECT_URI,
    });
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const profile = ticket.getPayload();
    if (!profile?.email || !profile.email_verified)
      return res.status(403).send("Google account email is not verified.");
    const existing = await query(
      "SELECT id, name, email FROM users WHERE email = $1",
      [profile.email.toLowerCase()],
    );
    let user = existing.rows[0];
    if (!user) {
      const created = await query(
        `INSERT INTO users (name, email, email_verified_at, provider)
         VALUES ($1, $2, NOW(), 'google') RETURNING id, name, email`,
        [
          profile.name || profile.email.split("@")[0],
          profile.email.toLowerCase(),
        ],
      );
      user = created.rows[0];
    }
    const session = await issueSession(user);
    const fragment = Buffer.from(JSON.stringify(session)).toString("base64url");
    return res.redirect(
      `${process.env.APP_URL || "http://localhost:5173"}/#auth=${fragment}`,
    );
  } catch (error) {
    return next(error);
  }
});

router.post("/refresh", async (req, res, next) => {
  const refreshToken = String(req.body.refreshToken || "");
  if (!refreshToken)
    return res.status(401).json({ error: "Refresh token required." });
  try {
    const result = await query(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()
       RETURNING user_id`,
      [hashToken(refreshToken)],
    );
    if (!result.rowCount)
      return res
        .status(401)
        .json({ error: "Invalid or expired refresh token." });
    const userResult = await query(
      "SELECT id, name, email FROM users WHERE id = $1",
      [result.rows[0].user_id],
    );
    if (!userResult.rowCount)
      return res.status(401).json({ error: "User not found." });
    return res.json(await issueSession(userResult.rows[0]));
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    const refreshToken = String(req.body.refreshToken || "");
    if (refreshToken)
      await query(
        "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1",
        [hashToken(refreshToken)],
      );
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.post("/forgot-password", async (req, res, next) => {
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();
  try {
    const result = await query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);
    if (result.rowCount && process.env.SMTP_HOST) {
      const token = await createOneTimeToken(
        result.rows[0].id,
        "reset_password",
        1,
      );
      await sendEmail({
        to: email,
        subject: "Reset your Study Planner password",
        text: `Use this reset token in the app: ${token}`,
      });
    }
    return res.json({
      message: "If that email exists, reset instructions have been sent.",
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/reset-password", async (req, res, next) => {
  const token = String(req.body.token || "");
  const password = String(req.body.password || "");
  if (password.length < 6)
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters." });
  try {
    const tokenUser = await consumeOneTimeToken(token, "reset_password");
    if (!tokenUser)
      return res
        .status(400)
        .json({ error: "Reset token is invalid or expired." });
    const passwordHash = await bcrypt.hash(password, 12);
    await query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
      [passwordHash, tokenUser.user_id],
    );
    await query(
      "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1",
      [tokenUser.user_id],
    );
    return res.json({ message: "Password updated successfully." });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", authenticate, async (req, res, next) => {
  try {
    const result = await query(
      "SELECT id, name, email FROM users WHERE id = $1",
      [req.user.sub],
    );
    if (!result.rowCount)
      return res.status(404).json({ error: "User not found." });
    return res.json({ user: publicUser(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
