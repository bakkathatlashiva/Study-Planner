const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const otpGenerator = require("otp-generator");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/study-planner";

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "*",
  }),
);
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
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

// OTP Schema with TTL (expires after 5 minutes / 300 seconds)
const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: { expires: 300 } },
});

const OTP = mongoose.model("OTP", otpSchema);

// Nodemailer Transporter Setup
const createTransporter = () => {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return null;
};

// --- Auth Endpoints ---

app.post("/api/signup", async (req, res) => {
  const { name, email, username, password } = req.body;
  try {
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Username or email already taken." });
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      username,
      password: hashedPassword,
    });
    await newUser.save();

    res.status(201).json({ username: newUser.username, name: newUser.name });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Failed to register user." });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({
      $or: [{ username: username }, { email: username }],
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid username or password." });
    }

    // Verify Password Hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid username or password." });
    }

    res.json({ username: user.username, name: user.name });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to log in." });
  }
});

// --- OTP Forgot Password Endpoints ---

app.post("/api/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Email address not registered." });
    }

    // Generate 6-digit OTP
    const otp = otpGenerator.generate(6, {
      digits: true,
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    });

    // Save/Update OTP in DB
    await OTP.findOneAndUpdate(
      { email },
      { otp, createdAt: new Date() },
      { upsert: true, new: true },
    );

    // Development Console Log (Extremely useful for local testing without SMTP)
    console.log(`\n==================================================`);
    console.log(`[OTP DEVELOPMENT LOG]`);
    console.log(`Email: ${email}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`==================================================\n`);

    // Write OTP to a file so that browser subagents can read and verify it
    try {
      // Local dev only — skipped in production
      if (process.env.NODE_ENV !== "production") {
        const fs = require("fs");
        const otpPath = process.env.OTP_DEBUG_PATH;
        if (otpPath) fs.writeFileSync(otpPath, otp);
      }
    } catch (e) {
      // Non-critical, ignore
    }

    // Send Email
    const transporter = createTransporter();
    if (transporter) {
      const mailOptions = {
        from:
          process.env.SMTP_FROM ||
          '"Study Planner Pro" <noreply@studyplanner.pro>',
        to: email,
        subject: "Your Password Reset OTP",
        html: `<h3>Password Reset Requested</h3><p>Use the following 6-digit OTP to reset your password. This OTP is valid for 5 minutes:</p><h2>${otp}</h2>`,
      };
      await transporter.sendMail(mailOptions);
    }

    res.json({
      message: "OTP sent successfully. Check your email or server logs.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Failed to send OTP." });
  }
});

app.post("/api/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  try {
    const record = await OTP.findOne({ email });
    if (!record || record.otp !== otp) {
      return res.status(400).json({ error: "Invalid or expired OTP." });
    }
    res.json({ message: "OTP verified successfully." });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ error: "Failed to verify OTP." });
  }
});

app.post("/api/reset-password", async (req, res) => {
  const { email, otp, password } = req.body;
  try {
    const record = await OTP.findOne({ email });
    if (!record || record.otp !== otp) {
      return res.status(400).json({ error: "Invalid or expired OTP." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "User not found." });
    }

    // Hash the new password and update
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    // Delete the OTP record after successful reset
    await OTP.deleteOne({ email });

    res.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Failed to reset password." });
  }
});

// --- Gemini Proxy Endpoint ---

app.post("/api/chat", async (req, res) => {
  const { system, text, maxTokens } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "PASTE_YOUR_GEMINI_API_KEY_HERE") {
    return res
      .status(500)
      .json({ error: "Gemini API key is not configured on the server." });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${system}\n\nUser Input: ${text}` }],
            },
          ],
          generationConfig: {
            maxOutputTokens: maxTokens || 800,
          },
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(
        `Gemini API returned error status ${response.status}:`,
        errText,
      );
      return res
        .status(response.status)
        .json({ error: `Gemini API error: ${errText}` });
    }

    const data = await response.json();
    const geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    res.json({ content: [{ text: geminiText }] });
  } catch (error) {
    console.error("Error contacting Gemini:", error);
    res.status(500).json({ error: "Failed to contact Gemini API." });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
