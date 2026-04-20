export type UserPreferences = {
  favouriteStops: string[];
  favouriteRoutes: string[];
  selectedMapFilters: Record<string, boolean>;
  transportModes: string[];
  appPreferences: Record<string, unknown>;
};

const LOCAL_STORAGE_KEY = "transitalert-local-preferences";

export const defaultPreferences: UserPreferences = {
  favouriteStops: [],
  favouriteRoutes: [],
  selectedMapFilters: {},
  transportModes: ["train"],
  appPreferences: {},
};

export function readLocalPreferences(): UserPreferences {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return defaultPreferences;
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      favouriteStops: Array.isArray(parsed.favouriteStops) ? parsed.favouriteStops : [],
      favouriteRoutes: Array.isArray(parsed.favouriteRoutes) ? parsed.favouriteRoutes : [],
      selectedMapFilters: parsed.selectedMapFilters && typeof parsed.selectedMapFilters === "object" ? parsed.selectedMapFilters : {},
      transportModes: Array.isArray(parsed.transportModes) && parsed.transportModes.length > 0 ? parsed.transportModes : ["train"],
      appPreferences: parsed.appPreferences && typeof parsed.appPreferences === "object" ? parsed.appPreferences : {},
    };
  } catch {
    return defaultPreferences;
  }
}

export function writeLocalPreferences(preferences: UserPreferences) {
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Ignore local storage failures.
  }
}

export function clearLocalPreferences() {
  try {
    window.localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch {
    // Ignore local storage failures.
  }
}

export async function fetchAccountPreferences() {
  const response = await fetch("/api/preferences");
  if (!response.ok) {
    throw new Error(`Failed to load preferences (${response.status})`);
  }
  const payload = (await response.json()) as { preferences?: Partial<UserPreferences> };
  return {
    ...defaultPreferences,
    ...payload.preferences,
  };
}

export async function saveAccountPreferences(preferences: Partial<UserPreferences>) {
  const response = await fetch("/api/preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preferences),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ error: "Failed to save preferences" }))) as { error?: string };
    throw new Error(payload.error || "Failed to save preferences");
  }
  const payload = (await response.json()) as { preferences?: UserPreferences };
  return payload.preferences ?? defaultPreferences;
}

export async function mergeLocalPreferences(preferences: UserPreferences) {
  const response = await fetch("/api/preferences/merge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preferences),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ error: "Failed to merge preferences" }))) as { error?: string };
    throw new Error(payload.error || "Failed to merge preferences");
  }
  const payload = (await response.json()) as { preferences?: UserPreferences };
  return payload.preferences ?? defaultPreferences;
}
