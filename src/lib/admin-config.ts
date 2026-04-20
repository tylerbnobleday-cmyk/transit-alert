export type RuntimeSourceConfig = {
  environment: "production" | "staging" | "local" | "custom";
  url: string;
};

export type AdminRuntimeConfig = Record<string, RuntimeSourceConfig>;

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
