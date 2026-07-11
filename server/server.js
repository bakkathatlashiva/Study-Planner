const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const otpGenerator = require("otp-generator");
const Redis = require("ioredis");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/study-planner";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));
app.use(express.json());

// ─── MongoDB ──────────────────────────────────────────────────────────────────
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const User = mongoose.model("User", userSchema);

// OTP Schema (TTL: 5 min)
const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: { expires: 300 } },
});
const OTP = mongoose.model("OTP", otpSchema);

// ─── Vector Cache Schema ──────────────────────────────────────────────────────
// Stores AI responses alongside their Gemini embeddings for semantic search.
const vectorCacheSchema = new mongoose.Schema({
  promptKey: { type: String, required: true }, // "<mode>:<question>"
  question: { type: String, required: true },
  mode: { type: String, required: true },
  answer: { type: String, required: true },
  embedding: { type: [Number], required: true }, // 768-dim Gemini embedding
  createdAt: {
    type: Date,
    default: Date.now,
    index: { expires: 60 * 60 * 24 * 30 },
  }, // 30-day TTL
});
const VectorCache = mongoose.model("VectorCache", vectorCacheSchema);

// ─── Valkey / Redis ───────────────────────────────────────────────────────────
let valkey = null;

const connectValkey = () => {
  const url = process.env.VALKEY_URL || process.env.REDIS_URL;
  if (!url) {
    console.warn("⚠️  VALKEY_URL not set — exact-match cache disabled.");
    return;
  }

  // Upstash requires TLS — ensure rediss:// protocol
  const tlsUrl = url.replace(/^redis:\/\//, "rediss://");

  try {
    valkey = new Redis(tlsUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 5000,
      tls: { rejectUnauthorized: false }, // required for Upstash self-signed
    });
    valkey.on("ready", () => console.log("✅ Valkey connected"));
    valkey.on("error", (err) => {
      console.error("Valkey error:", err.message);
      // Disable cache on repeated failures to avoid log spam
      if (
        err.message.includes("ECONNREFUSED") ||
        err.message.includes("EINVAL")
      ) {
        valkey = null;
      }
    });
  } catch (err) {
    console.error("Valkey init error:", err.message);
    valkey = null;
  }
};
connectValkey();

const CACHE_TTL = 60 * 60 * 24 * 7; // 7 days in seconds

// ─── Embedding helpers ────────────────────────────────────────────────────────
// Uses Gemini text-embedding-004 (768 dimensions, free tier)
const getEmbedding = async (text) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: { parts: [{ text }] },
      }),
    },
  );
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Embedding API error: ${err}`);
  }
  const data = await response.json();
  return data.embedding.values; // float[]
};

// Cosine similarity between two float arrays
const cosineSim = (a, b) => {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
};

const SIMILARITY_THRESHOLD = 0.92; // tune as needed

// Find the best semantically-matching cached answer
const vectorSearch = async (queryEmbedding, mode) => {
  // Fetch recent entries for this mode (cap at 500 for performance)
  const entries = await VectorCache.find({ mode })
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  let best = null;
  let bestScore = 0;

  for (const entry of entries) {
    const score = cosineSim(queryEmbedding, entry.embedding);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (best && bestScore >= SIMILARITY_THRESHOLD) {
    console.log(
      `🔍 Vector hit (score=${bestScore.toFixed(3)}): "${best.question.slice(0, 60)}"`,
    );
    return best.answer;
  }
  return null;
};

// ─── Gemini text generation ───────────────────────────────────────────────────
const callGemini = async (system, text, maxTokens = 800) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${system}\n\nUser Input: ${text}` }],
          },
        ],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    },
  );
  if (response.status === 429) {
    throw new Error("RATE_LIMITED");
  }
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API ${response.status}: ${errText}`);
  }
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
};

// ─── Auth Endpoints ───────────────────────────────────────────────────────────
app.post("/api/signup", async (req, res) => {
  const { name, email, username, password } = req.body;
  try {
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing)
      return res
        .status(400)
        .json({ error: "Username or email already taken." });
    const hashed = await bcrypt.hash(password, 10);
    const user = await new User({
      name,
      email,
      username,
      password: hashed,
    }).save();
    res.status(201).json({ username: user.username, name: user.name });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Failed to register user." });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({
      $or: [{ username }, { email: username }],
    });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ error: "Invalid username or password." });
    res.json({ username: user.username, name: user.name });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Failed to log in." });
  }
});

app.post("/api/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ error: "Email address not registered." });

    const otp = otpGenerator.generate(6, {
      digits: true,
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    });
    await OTP.findOneAndUpdate(
      { email },
      { otp, createdAt: new Date() },
      { upsert: true, new: true },
    );

    console.log(`\n[OTP] ${email} → ${otp}\n`);

    const transporter = process.env.SMTP_HOST
      ? nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_SECURE === "true",
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        })
      : null;

    if (transporter) {
      await transporter.sendMail({
        from:
          process.env.SMTP_FROM ||
          '"Study Planner Pro" <noreply@studyplanner.pro>',
        to: email,
        subject: "Your Password Reset OTP",
        html: `<h3>Password Reset</h3><p>Your OTP is valid for 5 minutes:</p><h2>${otp}</h2>`,
      });
    }

    res.json({ message: "OTP sent successfully." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Failed to send OTP." });
  }
});

app.post("/api/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  try {
    const record = await OTP.findOne({ email });
    if (!record || record.otp !== otp)
      return res.status(400).json({ error: "Invalid or expired OTP." });
    res.json({ message: "OTP verified successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to verify OTP." });
  }
});

app.post("/api/reset-password", async (req, res) => {
  const { email, otp, password } = req.body;
  try {
    const record = await OTP.findOne({ email });
    if (!record || record.otp !== otp)
      return res.status(400).json({ error: "Invalid or expired OTP." });
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found." });
    user.password = await bcrypt.hash(password, 10);
    await user.save();
    await OTP.deleteOne({ email });
    res.json({ message: "Password updated successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset password." });
  }
});

// ─── AI Chat — Valkey → Vector → Gemini pipeline ─────────────────────────────
//
//  Student
//      │
//      ▼
//  Valkey Cache  ──── Hit ────▶  Return cached answer
//      │
//     Miss
//      │
//      ▼
//  Vector Search  ── Match ───▶  Return similar answer
//      │
//   No Match
//      │
//      ▼
//  Gemini API
//      │
//      ▼
//  Save to Valkey + Vector DB  ──▶  Return answer
//
app.post("/api/chat", async (req, res) => {
  const { system, text, maxTokens } = req.body;

  if (!GEMINI_API_KEY || GEMINI_API_KEY === "PASTE_YOUR_GEMINI_API_KEY_HERE") {
    return res.status(500).json({ error: "Gemini API key not configured." });
  }

  // Extract mode from system prompt for scoped vector search
  const mode = extractMode(system);
  const promptKey = `${mode}:${text.trim().toLowerCase()}`;

  // ── STEP 1: Valkey exact-match cache ─────────────────────────────────────
  if (valkey) {
    try {
      const cached = await valkey.get(promptKey);
      if (cached) {
        console.log(`⚡ Valkey hit: "${text.slice(0, 60)}"`);
        return res.json({ content: [{ text: cached }], source: "cache" });
      }
    } catch (err) {
      console.error("Valkey get error:", err.message);
    }
  }

  // ── STEP 2: Vector semantic search ───────────────────────────────────────
  let queryEmbedding = null;
  try {
    queryEmbedding = await getEmbedding(text);
    const vectorHit = await vectorSearch(queryEmbedding, mode);
    if (vectorHit) {
      // Promote this answer back into Valkey for next time
      if (valkey) {
        valkey.set(promptKey, vectorHit, "EX", CACHE_TTL).catch(() => {});
      }
      return res.json({ content: [{ text: vectorHit }], source: "vector" });
    }
  } catch (err) {
    console.error("Embedding/vector search error:", err.message);
    // Non-fatal — fall through to Gemini
  }

  // ── STEP 3: Gemini API ────────────────────────────────────────────────────
  try {
    console.log(`🤖 Gemini call: "${text.slice(0, 60)}"`);
    const answer = await callGemini(system, text, maxTokens);

    // ── STEP 4: Save to Valkey + Vector DB ───────────────────────────────
    // Fire-and-forget — don't delay the response
    const saveToCache = async () => {
      try {
        // Save to Valkey
        if (valkey) {
          await valkey.set(promptKey, answer, "EX", CACHE_TTL);
        }
        // Save to Vector DB (get embedding if we didn't already have one)
        const embedding = queryEmbedding || (await getEmbedding(text));
        await VectorCache.create({
          promptKey,
          question: text,
          mode,
          answer,
          embedding,
        });
        console.log(`💾 Saved to Valkey + Vector DB`);
      } catch (err) {
        console.error("Cache save error:", err.message);
      }
    };
    saveToCache(); // async, don't await

    return res.json({ content: [{ text: answer }], source: "gemini" });
  } catch (err) {
    console.error("Gemini error:", err.message);
    if (err.message === "RATE_LIMITED") {
      return res
        .status(429)
        .json({
          error:
            "Gemini API rate limit reached. Please wait a moment and try again.",
        });
    }
    return res.status(500).json({ error: "Failed to contact Gemini API." });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Extract a short mode label from the system prompt for scoped vector search
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

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
