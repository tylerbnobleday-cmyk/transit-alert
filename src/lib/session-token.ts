const SESSION_TOKEN_STORAGE_KEY = "transitalert-session-token";

export function readSessionToken() {
  try {
    const value = window.localStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
    return typeof value === "string" && value.trim() ? value.trim() : "";
  } catch {
    return "";
  }
}

export function writeSessionToken(token: string) {
  try {
    if (token && token.trim()) {
      window.localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token.trim());
    }
  } catch {
    // Ignore local storage failures.
  }
}

export function clearSessionToken() {
  try {
    window.localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
  } catch {
    // Ignore local storage failures.
  }
}

export function buildSessionHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers ?? {});
  const token = readSessionToken();
  if (token) {
    nextHeaders.set("Authorization", `Bearer ${token}`);
  }
  return nextHeaders;
}
