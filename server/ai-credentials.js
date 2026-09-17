const crypto = require("crypto");
const { query } = require("./db");

const CREDENTIAL_KEY_ENV = "AI_CREDENTIAL_ENCRYPTION_KEY";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

class CredentialEncryptionError extends Error {
  constructor(message) {
    super(message);
    this.name = "CredentialEncryptionError";
  }
}

const getEncryptionKey = () => {
  const configuredKey = process.env[CREDENTIAL_KEY_ENV];
  if (!configuredKey) {
    throw new CredentialEncryptionError(
      `${CREDENTIAL_KEY_ENV} is not configured`,
    );
  }
  if (/^[0-9a-fA-F]{64}$/.test(configuredKey))
    return Buffer.from(configuredKey, "hex");
  try {
    const key = Buffer.from(configuredKey, "base64");
    if (key.length === 32) return key;
  } catch {
    // Fall through to the configuration error below.
  }
  throw new CredentialEncryptionError(
    `${CREDENTIAL_KEY_ENV} must be a 32-byte base64 or 64-character hex value`,
  );
};

const encryptApiKey = (apiKey) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(apiKey, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
};

const decryptApiKey = (encryptedValue) => {
  const [version, ivValue, authTagValue, ciphertextValue] =
    String(encryptedValue).split(":");
  if (version !== "v1" || !ivValue || !authTagValue || !ciphertextValue)
    throw new CredentialEncryptionError("Invalid encrypted credential format");
  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      getEncryptionKey(),
      Buffer.from(ivValue, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new CredentialEncryptionError("Unable to decrypt credential");
  }
};

const maskApiKey = (apiKey) => `••••••••${apiKey.slice(-4)}`;

const getGeminiCredential = async (userId) => {
  const result = await query(
    `SELECT encrypted_api_key, updated_at
     FROM user_ai_credentials
     WHERE user_id = $1 AND provider = 'gemini'
     LIMIT 1`,
    [userId],
  );
  const row = result.rows[0];
  if (!row) return null;
  const apiKey = decryptApiKey(row.encrypted_api_key);
  return {
    apiKey,
    maskedApiKey: maskApiKey(apiKey),
    updatedAt: row.updated_at,
  };
};

const saveGeminiCredential = async (userId, apiKey) => {
  const encryptedApiKey = encryptApiKey(apiKey);
  const result = await query(
    `INSERT INTO user_ai_credentials (user_id, provider, encrypted_api_key)
     VALUES ($1, 'gemini', $2)
     ON CONFLICT (user_id, provider)
     DO UPDATE SET encrypted_api_key = EXCLUDED.encrypted_api_key, updated_at = NOW()
     RETURNING updated_at`,
    [userId, encryptedApiKey],
  );
  return {
    maskedApiKey: maskApiKey(apiKey),
    updatedAt: result.rows[0].updated_at,
  };
};

const removeGeminiCredential = async (userId) => {
  await query(
    "DELETE FROM user_ai_credentials WHERE user_id = $1 AND provider = 'gemini'",
    [userId],
  );
};

module.exports = {
  CredentialEncryptionError,
  decryptApiKey,
  encryptApiKey,
  getGeminiCredential,
  maskApiKey,
  removeGeminiCredential,
  saveGeminiCredential,
};
