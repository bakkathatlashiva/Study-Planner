const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
require("dotenv").config();
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

const requiresSsl =
  process.env.DATABASE_SSL === "true" ||
  Boolean(
    connectionString &&
      (connectionString.includes("sslmode=require") ||
        connectionString.includes("render.com") ||
        connectionString.includes("supabase.co") ||
        connectionString.includes("neon.tech") ||
        (process.env.NODE_ENV === "production" &&
          !connectionString.includes("localhost") &&
          !connectionString.includes("127.0.0.1"))),
  );

let pool = null;

if (connectionString) {
  pool = new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX || 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
  });

  pool.on("error", (error) => {
    console.error("PostgreSQL pool error:", error.message || error.code || error);
  });
} else {
  console.warn("⚠️ DATABASE_URL is not set. Database queries will return an error.");
}

const query = async (text, values) => {
  if (!pool) {
    const err = new Error("Database not configured. DATABASE_URL is missing.");
    err.code = "DB_UNCONFIGURED";
    throw err;
  }
  return pool.query(text, values);
};

const initDb = async () => {
  if (!pool) return;
  try {
    const schemaPath = path.resolve(__dirname, "schema.sql");
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, "utf-8");
      await pool.query(sql);
      console.log("PostgreSQL database tables initialized/verified.");
    }
  } catch (error) {
    console.warn("PostgreSQL init warning:", error.message || error.code || error);
  }
};

module.exports = { pool, query, initDb };
