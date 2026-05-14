export type RuntimeSourceConfig = {
  environment: "production" | "staging" | "local" | "custom";
  url: string;
};

export type AdminRuntimeConfig = Record<string, RuntimeSourceConfig>;

export type AdminAccountRecord = {
  id: string;
  username: string;
  email: string;
  role: string;
  isAdmin: boolean;
  isPremium: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ApprovedDebugTesterRecord = {
  value: string;
  source: "env" | "built-in" | "built-in-account";
};

export async function fetchAdminConfig() {
  const response = await fetch("/api/admin/settings");
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ error: "Failed to load admin settings" }))) as { error?: string };
    throw new Error(payload.error || "Failed to load admin settings");
  }
  const payload = (await response.json()) as { config?: AdminRuntimeConfig };
  return payload.config ?? {};
}

export async function saveAdminConfig(config: AdminRuntimeConfig) {
  const response = await fetch("/api/admin/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ error: "Failed to save admin settings" }))) as { error?: string };
    throw new Error(payload.error || "Failed to save admin settings");
  }
  const payload = (await response.json()) as { config?: AdminRuntimeConfig };
  return payload.config ?? {};
}

export async function fetchAdminAccounts() {
  const response = await fetch("/api/admin/accounts");
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ error: "Failed to load accounts" }))) as { error?: string };
    throw new Error(payload.error || "Failed to load accounts");
  }
  const payload = (await response.json()) as {
    accounts?: AdminAccountRecord[];
    approvedDebugTesters?: ApprovedDebugTesterRecord[];
  };
  return {
    accounts: payload.accounts ?? [],
    approvedDebugTesters: payload.approvedDebugTesters ?? [],
  };
}

export async function updateAdminAccount(
  accountId: string,
  patch: Pick<AdminAccountRecord, "role" | "isAdmin" | "isPremium">,
) {
  const response = await fetch("/api/admin/accounts", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, patch }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ error: "Failed to update account" }))) as { error?: string };
    throw new Error(payload.error || "Failed to update account");
  }
  const payload = (await response.json()) as { account?: AdminAccountRecord };
  return payload.account;
}
