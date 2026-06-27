import { getApiUrl } from "@/lib/api-config";

export type ConsistSnapshot = {
  consist: string;
  as_of: string;
  status: "active" | "idle" | "finished";
  current_trip: {
    id: string;
    origin: string;
    destination: string;
    departs: string;
    arrives: string;
    date: string;
    consist_label: string;
    url: string;
  } | null;
  position: {
    vehicle_stop_status: "IN_TRANSIT_TO" | "STOPPED_AT";
    current_stop: string;
    current_stop_time: string;
    next_stop: string | null;
    next_stop_time: string | null;
    lat: number | null;
    lng: number | null;
    progress_pct: number | null;
  } | null;
  next_trip: {
    id: string;
    origin: string;
    destination: string;
    departs: string;
    arrives: string;
    url: string;
  } | null;
  network_alerts: string[];
  _meta?: {
    source?: string;
    note?: string;
  };
};

export async function fetchConsistSnapshot(consist = "430M"): Promise<ConsistSnapshot> {
  const response = await fetch(getApiUrl(`/api/consist/${encodeURIComponent(consist)}`));

  if (!response.ok) {
    let message = `Failed to load consist ${consist} (${response.status})`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload?.error) {
        message = payload.error;
      }
    } catch {
      // Keep the default message when the response body is not JSON.
    }
    throw new Error(message);
  }

  return (await response.json()) as ConsistSnapshot;
}
