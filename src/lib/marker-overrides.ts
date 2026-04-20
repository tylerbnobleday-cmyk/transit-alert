export type MarkerOverride = {
  markerName: string;
  markerType?: string;
  lat: number;
  lng: number;
  metadata?: Record<string, unknown>;
};

export async function fetchMarkerOverrides() {
  const response = await fetch("/api/admin/markers");
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ error: "Failed to load marker overrides" }))) as { error?: string };
    throw new Error(payload.error || "Failed to load marker overrides");
  }
  const payload = (await response.json()) as { overrides?: MarkerOverride[] };
  return payload.overrides ?? [];
}

export async function saveMarkerOverrides(overrides: MarkerOverride[]) {
  const response = await fetch("/api/admin/markers", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ overrides }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ error: "Failed to save marker overrides" }))) as { error?: string };
    throw new Error(payload.error || "Failed to save marker overrides");
  }
  const payload = (await response.json()) as { overrides?: MarkerOverride[] };
  return payload.overrides ?? [];
}
