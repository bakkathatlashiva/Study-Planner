const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { query } = require("./db");

const ACCESS_TTL = process.env.JWT_ACCESS_TTL || "15m";
const REFRESH_DAYS = Number(process.env.JWT_REFRESH_DAYS || 30);

const requiredSecret = () => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");
  return process.env.JWT_SECRET;
};

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const createAccessToken = (user) =>
  jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    requiredSecret(),
    { expiresIn: ACCESS_TTL },
  );

const issueRefreshToken = async (userId) => {
  const token = crypto.randomBytes(48).toString("base64url");
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + ($3 || ' days')::interval)`,
    [userId, hashToken(token), REFRESH_DAYS],
  );
  return token;
};

const issueSession = async (user) => ({
  accessToken: createAccessToken(user),
  refreshToken: await issueRefreshToken(user.id),
  user: { id: user.id, name: user.name, email: user.email },
});

const authenticate = (req, res, next) => {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token)
    return res.status(401).json({ error: "Authentication required." });
  try {
    req.user = jwt.verify(token, requiredSecret());
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired access token." });
  }
};

const createOneTimeToken = async (userId, purpose, ttlHours) => {
  const raw = crypto.randomBytes(32).toString("base64url");
  await query(
    `INSERT INTO email_tokens (user_id, token_hash, purpose, expires_at)
     VALUES ($1, $2, $3, NOW() + ($4 || ' hours')::interval)`,
    [userId, hashToken(raw), purpose, ttlHours],
  );
  return raw;
};

const consumeOneTimeToken = async (raw, purpose) => {
  const result = await query(
    `UPDATE email_tokens
     SET consumed_at = NOW()
     WHERE token_hash = $1 AND purpose = $2 AND consumed_at IS NULL AND expires_at > NOW()
     RETURNING user_id`,
    [hashToken(raw), purpose],
  );
  return result.rows[0] || null;
};

module.exports = {
  authenticate,
  bcrypt,
  consumeOneTimeToken,
  createAccessToken,
  createOneTimeToken,
  hashToken,
  issueRefreshToken,
  issueSession,
  query,
};
