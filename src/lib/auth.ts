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
};

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

export async function fetchRoles(): Promise<string[]> {
  const response = await fetch("/api/auth/roles");
  if (!response.ok) {
    throw new Error(`Failed to load roles (${response.status})`);
  }

  const payload = (await response.json()) as { roles?: string[] };
  return Array.isArray(payload.roles) ? payload.roles : [];
}

export async function logoutSession(): Promise<void> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to sign out (${response.status})`);
  }
}
