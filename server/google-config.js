const normalizeUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "");

const configuredRedirect = normalizeUrl(process.env.GOOGLE_REDIRECT_URI);
const googleRedirectUri = configuredRedirect.endsWith(
  "/api/auth/google/callback",
)
  ? configuredRedirect
  : `${normalizeUrl(
      configuredRedirect ||
        process.env.RENDER_EXTERNAL_URL ||
        "http://localhost:5000",
    )}/api/auth/google/callback`;

const missingGoogleConfig = [
  ["GOOGLE_CLIENT_ID", process.env.GOOGLE_CLIENT_ID],
  ["GOOGLE_CLIENT_SECRET", process.env.GOOGLE_CLIENT_SECRET],
]
  .filter(([, value]) => !value)
  .map(([name]) => name);

module.exports = { googleRedirectUri, missingGoogleConfig };
