export type AuthUser = {
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

  const payload = (await response.json()) as AuthSession & { error?: string };
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

  const payload = (await response.json()) as AuthSession & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "Registration failed");
  }

  return payload;
}

export async function continueAsGuest(): Promise<AuthSession> {
  const response = await fetch("/api/auth/guest", {
    method: "POST",
  });

  const payload = (await response.json()) as AuthSession & { error?: string };
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
