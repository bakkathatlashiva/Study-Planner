const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const callClaude = async (system, text, maxTokens = 800) => {
  return await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ system, text, maxTokens }),
  });
};
