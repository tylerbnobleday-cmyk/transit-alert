export type AuthUser = {
  id?: string;
  username: string;
  email: string;
  role: string;
  isAdmin: boolean;
};

export type AuthSession = {
  authenticated: boolean;
  user: AuthUser | null;
  roles?: string[];
  databaseConfigured?: boolean;
  accountStorage?: "database" | "fallback";
};

export type RolesPayload = {
  roles: string[];
  publicRoles?: string[];
  registrationPhase?: string;
  databaseConfigured?: boolean;
};

export const GUEST_SESSION_INTENT_KEY = "transitalert-guest-intent";

async function readAuthPayload(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as AuthSession & { error?: string };
  }

  const text = await response.text();
  const compact = text.replace(/\s+/g, " ").trim();
  throw new Error(
    compact.startsWith("<!DOCTYPE") || compact.startsWith("<html")
      ? "Auth endpoint returned HTML instead of JSON. Restart the dev server so the new auth routes load."
      : compact || "Auth endpoint returned an unexpected response.",
  );
}

export async function fetchAuthSession(): Promise<AuthSession> {
  const response = await fetch("/api/auth/session");
  if (!response.ok) {
    throw new Error(`Failed to load auth session (${response.status})`);
  }
  return (await response.json()) as AuthSession;
}

export async function loginWithPassword(username: string, password: string): Promise<AuthSession> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const payload = await readAuthPayload(response);
  if (!response.ok) {
    throw new Error(payload.error || "Login failed");
  }

  return payload;
}

export async function registerAccount(
  username: string,
  email: string,
  password: string,
  role: string,
): Promise<AuthSession> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password, role }),
  });

  const payload = await readAuthPayload(response);
  if (!response.ok) {
    throw new Error(payload.error || "Registration failed");
  }

  return payload;
}

export async function continueAsGuest(): Promise<AuthSession> {
  const response = await fetch("/api/auth/guest", {
    method: "POST",
  });

  const payload = await readAuthPayload(response);
  if (!response.ok) {
    throw new Error(payload.error || "Guest access failed");
  }

  return payload;
}

export function markGuestIntent() {
  try {
    window.localStorage.setItem(GUEST_SESSION_INTENT_KEY, "1");
  } catch {
    // Ignore local storage failures.
  }
}

export function clearGuestIntent() {
  try {
    window.localStorage.removeItem(GUEST_SESSION_INTENT_KEY);
  } catch {
    // Ignore local storage failures.
  }
}

export function hasGuestIntent() {
  try {
    return window.localStorage.getItem(GUEST_SESSION_INTENT_KEY) === "1";
  } catch {
    return false;
  }
}

export async function fetchRoles(): Promise<RolesPayload> {
  const response = await fetch("/api/auth/roles");
  if (!response.ok) {
    throw new Error(`Failed to load roles (${response.status})`);
  }

  const payload = (await response.json()) as Partial<RolesPayload>;
  return {
    roles: Array.isArray(payload.roles) ? payload.roles : [],
    publicRoles: Array.isArray(payload.publicRoles) ? payload.publicRoles : ["Traveller"],
    registrationPhase: typeof payload.registrationPhase === "string" ? payload.registrationPhase : "debug-testers",
    databaseConfigured: payload.databaseConfigured === true,
  };
}

export async function logoutSession(): Promise<void> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to sign out (${response.status})`);
  }
}
