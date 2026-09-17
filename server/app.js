const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const Redis = require("ioredis");
const webpush = require("web-push");
const crypto = require("crypto");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
require("dotenv").config();

const { query, initDb } = require("./db");
const { authenticate } = require("./auth");
const authRoutes = require("./routes-auth");
const { googleRedirectUri, missingGoogleConfig } = require("./google-config");
const {
  CredentialEncryptionError,
  getGeminiCredential,
  removeGeminiCredential,
  saveGeminiCredential,
} = require("./ai-credentials");

const app = express();
const PORT = Number(process.env.PORT || 5000);
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const allowedOrigins = (process.env.ALLOWED_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) => {
    try {
      return new URL(origin).origin;
    } catch {
      return origin.replace(/\/$/, "");
    }
  });
const CACHE_TTL = 60 * 60 * 24 * 7;

if (missingGoogleConfig.length) {
  console.error(
    `Google OAuth disabled: missing ${missingGoogleConfig.join(", ")}`,
  );
}
console.log(`Google OAuth redirect URI: ${googleRedirectUri}`);

app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "64kb" }));
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);

let redis = null;
if (process.env.REDIS_URL || process.env.VALKEY_URL) {
  redis = new Redis(process.env.REDIS_URL || process.env.VALKEY_URL, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 5000,
  });
  redis.on("ready", () => console.log("Redis/Valkey connected"));
  redis.on("error", (error) =>
    console.error("Redis/Valkey error:", error.message),
  );
}

const pushReady = Boolean(
  process.env.VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY &&
  process.env.VAPID_SUBJECT,
);
if (pushReady) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

const extractMode = (system = "") => {
  if (system.includes("mock test")) return "mock_test";
  if (system.includes("motivational")) return "daily_coach";
  if (system.includes("flashcard")) return "flashcards";
  if (system.includes("coding expert")) return "debug";
  if (system.includes("career roadmap")) return "roadmap";
  if (system.includes("weak topics")) return "weakness_killer";
  if (system.includes("exam readiness")) return "exam_readiness";
  if (system.includes("placement")) return "placement_mode";
  if (system.includes("summarize")) return "summarize";
  return "explain";
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class GeminiError extends Error {
  constructor(message, { status, kind, retryable = false } = {}) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
    this.kind = kind;
    this.retryable = retryable;
  }
}

const getRetryDelay = (response, attempt) => {
  const retryAfter = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0)
    return Math.min(retryAfter * 1000, 10_000);
  return Math.min(750 * 2 ** attempt + Math.floor(Math.random() * 250), 10_000);
};

const callGemini = async (apiKey, system, text, maxTokens = 800) => {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${system}\n\nUser Input: ${text}` }],
              },
            ],
            generationConfig: {
              maxOutputTokens: maxTokens,
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        },
      );
      if (response.status === 429 || response.status >= 500) {
        const providerError = await response.json().catch(() => ({}));
        const providerMessage = String(
          providerError.error?.message || "",
        ).toLowerCase();
        const quotaExhausted =
          response.status === 429 &&
          /(quota|resource_exhausted|daily limit|limit: 0)/i.test(
            providerMessage,
          );
        lastError = new GeminiError(`Gemini API ${response.status}`, {
          status: response.status,
          kind: quotaExhausted
            ? "quota"
            : response.status === 429
              ? "rate_limit"
              : "server",
          retryable: !quotaExhausted,
        });
        if (!lastError.retryable || attempt === 2) break;
        await sleep(getRetryDelay(response, attempt));
        continue;
      }
      if (!response.ok) {
        const kind =
          response.status === 401 || response.status === 403 ? "auth" : "api";
        throw new GeminiError(`Gemini API ${response.status}`, {
          status: response.status,
          kind,
        });
      }
      const data = await response.json();
      return (
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I could not generate a response."
      );
    } catch (error) {
      lastError =
        error.name === "AbortError"
          ? new GeminiError("Gemini request timed out", {
              kind: "timeout",
              retryable: true,
            })
          : error instanceof GeminiError
            ? error
            : new GeminiError("Gemini network request failed", {
                kind: "network",
                retryable: true,
              });
      if (!(lastError instanceof GeminiError) || lastError.retryable) {
        if (attempt < 2) await sleep(750 * 2 ** attempt);
      } else {
        break;
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || new Error("Gemini request failed");
};

app.get("/health", async (_req, res) => {
  try {
    await query("SELECT 1");
    return res.json({
      ok: true,
      database: "postgresql",
      cache: Boolean(redis),
    });
  } catch (error) {
    return res
      .status(503)
      .json({ ok: false, database: "unavailable", error: error.message });
  }
});

app.use("/api/auth", authRoutes);

app.get("/api/ai/credentials", authenticate, async (req, res, next) => {
  try {
    const credential = await getGeminiCredential(req.user.sub);
    return res.json(
      credential
        ? {
            configured: true,
            provider: "gemini",
            maskedApiKey: credential.maskedApiKey,
            updatedAt: credential.updatedAt,
          }
        : { configured: false, provider: "gemini" },
    );
  } catch (error) {
    return next(error);
  }
});

app.post("/api/ai/credentials", authenticate, async (req, res, next) => {
  const apiKey = String(req.body.apiKey || "").trim();
  if (apiKey.length < 20 || apiKey.length > 200)
    return res.status(400).json({
      success: false,
      message: "Enter a valid Gemini API key.",
    });
  try {
    const credential = await saveGeminiCredential(req.user.sub, apiKey);
    return res.status(201).json({
      success: true,
      configured: true,
      provider: "gemini",
      maskedApiKey: credential.maskedApiKey,
      updatedAt: credential.updatedAt,
    });
  } catch (error) {
    return next(error);
  }
});

app.delete("/api/ai/credentials", authenticate, async (req, res, next) => {
  try {
    await removeGeminiCredential(req.user.sub);
    return res.json({ success: true, configured: false, provider: "gemini" });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/chat", authenticate, async (req, res, next) => {
  const system = String(req.body.system || "").slice(0, 10000);
  const text = String(req.body.text || "")
    .trim()
    .slice(0, 12000);
  const maxTokens = Math.min(
    Math.max(Number(req.body.maxTokens) || 800, 32),
    2000,
  );
  if (!text) return res.status(400).json({ error: "Message is required." });
  const mode = extractMode(system);
  try {
    const credential = await getGeminiCredential(req.user.sub);
    if (!credential)
      return res.status(503).json({
        success: false,
        code: "GEMINI_KEY_NOT_CONFIGURED",
        message: "Connect your Gemini API key to use the AI Assistant.",
      });
    const promptHash = crypto
      .createHash("sha256")
      .update(`${system}\n\n${text}`)
      .digest("hex");
    const cacheKey = `ai:${req.user.sub}:${mode}:${promptHash}`;
    if (redis && redis.status === "ready") {
      try {
        const cached = await redis.get(cacheKey);
        if (cached)
          return res.json({ content: [{ text: cached }], source: "cache" });
      } catch (cacheErr) {
        console.warn("Redis cache get error:", cacheErr.message);
      }
    }
    const answer = await callGemini(credential.apiKey, system, text, maxTokens);
    if (redis && redis.status === "ready") {
      try {
        await redis.set(cacheKey, answer, "EX", CACHE_TTL);
      } catch (cacheErr) {
        console.warn("Redis cache set error:", cacheErr.message);
      }
    }
    if (req.user?.sub) {
      const existing = await query(
        "SELECT id FROM chat_sessions WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1",
        [req.user.sub],
      );
      let sessionId = existing.rows[0]?.id;
      if (!sessionId) {
        const session = await query(
          "INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING id",
          [req.user.sub, text.slice(0, 80)],
        );
        sessionId = session.rows[0]?.id;
      }
      if (sessionId) {
        await query(
          "INSERT INTO chat_messages (session_id, role, content) VALUES ($1, 'user', $2), ($1, 'assistant', $3)",
          [sessionId, text, answer],
        );
        await query(
          "UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1",
          [sessionId],
        );
      }
    }
    return res.json({ content: [{ text: answer }], source: "gemini" });
  } catch (error) {
    return next(error);
  }
});

app.post(
  "/api/notifications/push-subscription",
  authenticate,
  async (req, res, next) => {
    const subscription = req.body.subscription;
    if (!subscription?.endpoint || !subscription?.keys)
      return res.status(400).json({ error: "Invalid push subscription." });
    try {
      await query(
        `INSERT INTO push_subscriptions (user_id, endpoint, subscription)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, subscription = EXCLUDED.subscription`,
        [req.user.sub, subscription.endpoint, JSON.stringify(subscription)],
      );
      return res.status(204).end();
    } catch (error) {
      return next(error);
    }
  },
);

app.get("/api/notifications", authenticate, async (req, res, next) => {
  try {
    const result = await query(
      "SELECT id, type, title, body, data, read_at, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
      [req.user.sub],
    );
    const unread = result.rows.filter(
      (notification) => !notification.read_at,
    ).length;
    return res.json({ notifications: result.rows, unread });
  } catch (error) {
    return next(error);
  }
});

app.patch(
  "/api/notifications/:id/read",
  authenticate,
  async (req, res, next) => {
    try {
      await query(
        "UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2",
        [req.params.id, req.user.sub],
      );
      return res.status(204).end();
    } catch (error) {
      return next(error);
    }
  },
);

app.post(
  "/api/notifications/read-all",
  authenticate,
  async (req, res, next) => {
    try {
      await query(
        "UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL",
        [req.user.sub],
      );
      return res.status(204).end();
    } catch (error) {
      return next(error);
    }
  },
);

app.delete("/api/notifications/:id", authenticate, async (req, res, next) => {
  try {
    await query("DELETE FROM notifications WHERE id = $1 AND user_id = $2", [
      req.params.id,
      req.user.sub,
    ]);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

let lastReminderWorkerError = "";
const sendDueReminders = async () => {
  if (!process.env.DATABASE_URL) return;
  const lockKey = "study-planner:reminders:lock";
  try {
    if (redis && redis.status === "ready") {
      try {
        const acquired = await redis.set(lockKey, process.pid, "EX", 50, "NX");
        if (!acquired) return;
      } catch (redisErr) {
        console.warn(
          "Redis reminder lock error:",
          redisErr.message || redisErr.code,
        );
      }
    }
    const due = await query(
      `SELECT id, user_id, title, starts_at, 'study_session' AS type
       FROM study_sessions
       WHERE completed_at IS NULL AND starts_at BETWEEN NOW() + INTERVAL '9 minutes' AND NOW() + INTERVAL '11 minutes'
       UNION ALL
       SELECT id, user_id, title, starts_at, 'task' AS type
       FROM tasks
       WHERE completed_at IS NULL AND starts_at BETWEEN NOW() + INTERVAL '9 minutes' AND NOW() + INTERVAL '11 minutes'`,
    );
    for (const item of due.rows) {
      const reminderKey = `${item.type}:${item.id}:${new Date(item.starts_at).toISOString().slice(0, 16)}`;
      const created = await query(
        `INSERT INTO notifications (user_id, type, title, body, data)
         SELECT $1, $2, $3, $4, $5::jsonb
         WHERE NOT EXISTS (
           SELECT 1 FROM notifications WHERE user_id = $1 AND data->>'reminderKey' = $5::jsonb->>'reminderKey'
         )
         RETURNING id`,
        [
          item.user_id,
          item.type,
          "Study Assistant reminder",
          `${item.title} starts in 10 minutes.`,
          JSON.stringify({ reminderKey }),
        ],
      );
      if (created.rowCount && pushReady) {
        const subscriptions = await query(
          "SELECT id, endpoint, subscription FROM push_subscriptions WHERE user_id = $1",
          [item.user_id],
        );
        for (const subscription of subscriptions.rows) {
          try {
            await webpush.sendNotification(
              subscription.subscription,
              JSON.stringify({
                title: "Study Assistant",
                body: `${item.title} starts in 10 minutes.`,
              }),
            );
          } catch (error) {
            if (error.statusCode === 404 || error.statusCode === 410)
              await query("DELETE FROM push_subscriptions WHERE id = $1", [
                subscription.id,
              ]);
          }
        }
      }
    }
  } catch (error) {
    const errMsg =
      error.message ||
      error.code ||
      (Array.isArray(error.errors) && error.errors[0]?.message) ||
      String(error);
    if (errMsg !== lastReminderWorkerError) {
      console.error("Reminder worker error:", errMsg);
      lastReminderWorkerError = errMsg;
    }
  }
};

setInterval(sendDueReminders, 60_000).unref();

app.use((error, _req, res, _next) => {
  const errMsg = error.message || error.code || String(error);
  if (error.name === "GeminiError") {
    console.error("Gemini API error:", {
      kind: error.kind,
      status: error.status,
      model: GEMINI_MODEL,
    });
    const response = {
      success: false,
      code: "AI_SERVICE_UNAVAILABLE",
      message:
        "The AI service is temporarily unavailable. Please try again in a few seconds.",
    };
    if (error.kind === "rate_limit" || error.kind === "quota") {
      response.code = "RATE_LIMITED";
      response.message = "Limit reached. Please wait a moment and try again.";
    }
    if (error.kind === "auth")
      response.message =
        "The AI service is not authenticated. Please contact support.";
    if (error.kind === "timeout" || error.kind === "network")
      response.message =
        "The AI service could not be reached. Please try again in a few seconds.";
    const status =
      error.kind === "rate_limit" || error.kind === "quota"
        ? 429
        : error.kind === "auth"
          ? 503
          : 502;
    return res.status(status).json(response);
  }
  if (error instanceof CredentialEncryptionError) {
    console.error("AI credential storage error:", error.message);
    return res.status(503).json({
      success: false,
      code: "AI_CREDENTIAL_STORAGE_UNAVAILABLE",
      message: "AI credential storage is temporarily unavailable.",
    });
  }
  console.error("API error:", errMsg);
  if (
    ["28P01", "3D000", "ECONNREFUSED", "DB_UNCONFIGURED"].includes(
      error.code,
    ) ||
    !process.env.DATABASE_URL
  ) {
    return res.status(503).json({
      success: false,
      message:
        "Database unavailable. Check server/.env DATABASE_URL and PostgreSQL credentials.",
      error:
        "Database unavailable. Check server/.env DATABASE_URL and PostgreSQL credentials.",
    });
  }
  return res.status(500).json({
    success: false,
    message: "Unexpected server error.",
    error: "Unexpected server error.",
  });
});

module.exports = {
  app,
  start: async () => {
    await initDb();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  },
};
