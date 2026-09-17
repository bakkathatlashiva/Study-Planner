const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const googleLoginUrl = `${API_URL}/api/auth/google`;

const getAccessToken = () => localStorage.getItem("sp_access_token");
let refreshPromise = null;

const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem("sp_refresh_token");
  if (!refreshToken) return false;
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) return false;
        saveSession(await response.json());
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

const request = async (path, options = {}) => {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  const accessToken = getAccessToken();
  const refreshToken = localStorage.getItem("sp_refresh_token");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  let response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const canRefresh =
    response.status === 401 &&
    refreshToken &&
    !path.includes("/auth/login") &&
    !path.includes("/auth/refresh");
  if (canRefresh && (await refreshAccessToken())) {
    const retryHeaders = new Headers(options.headers || {});
    retryHeaders.set("Content-Type", "application/json");
    retryHeaders.set("Authorization", `Bearer ${getAccessToken()}`);
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: retryHeaders,
    });
  }
  if (response.status === 401 && (accessToken || refreshToken)) {
    localStorage.removeItem("sp_access_token");
    localStorage.removeItem("sp_refresh_token");
    localStorage.removeItem("sp_current");
  }
  return response;
};

export const callClaude = async (system, text, maxTokens = 800) => {
  return request("/api/chat", {
    method: "POST",
    body: JSON.stringify({ system, text, maxTokens }),
  });
};

export const getGeminiCredential = () => request("/api/ai/credentials");

export const saveGeminiCredential = (apiKey) =>
  request("/api/ai/credentials", {
    method: "POST",
    body: JSON.stringify({ apiKey }),
  });

export const removeGeminiCredential = () =>
  request("/api/ai/credentials", { method: "DELETE" });

export const restoreSession = async () => {
  const accessToken = localStorage.getItem("sp_access_token");
  const displayName = localStorage.getItem("sp_current");
  if (accessToken && displayName) {
    return { user: { name: displayName } };
  }
  if (await refreshAccessToken()) {
    return { user: { name: localStorage.getItem("sp_current") } };
  }
  return null;
};

export const login = (email, password) =>
  request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const register = (name, email, password) =>
  request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });

export const forgotPassword = (email) =>
  request("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const resendVerification = (email) =>
  request("/api/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const verifyEmail = (token) =>
  request("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });

export const logout = () =>
  request("/api/auth/logout", {
    method: "POST",
    body: JSON.stringify({
      refreshToken: localStorage.getItem("sp_refresh_token"),
    }),
  });

export const saveSession = (data) => {
  localStorage.setItem("sp_access_token", data.accessToken);
  localStorage.setItem("sp_refresh_token", data.refreshToken);
  localStorage.setItem("sp_current", data.user.name);
};

export const clearSession = () => {
  localStorage.removeItem("sp_access_token");
  localStorage.removeItem("sp_refresh_token");
  localStorage.removeItem("sp_current");
};

export const getNotifications = () => request("/api/notifications");

export const markNotificationRead = (id) =>
  request(`/api/notifications/${id}/read`, {
    method: "PATCH",
  });

export const markAllNotificationsRead = () =>
  request("/api/notifications/read-all", {
    method: "POST",
  });

export const deleteNotification = (id) =>
  request(`/api/notifications/${id}`, {
    method: "DELETE",
  });

export const savePushSubscription = (subscription) =>
  request("/api/notifications/push-subscription", {
    method: "POST",
    body: JSON.stringify({ subscription }),
  });

export const verifyGoogleToken = ({ idToken, accessToken }) =>
  request("/api/auth/google/verify", {
    method: "POST",
    body: JSON.stringify({ idToken, accessToken }),
  });
