import { readJsonErrorMessage, readJsonResponse, responseIsJson } from "@/lib/http-json";
import { getApiUrl } from "@/lib/api-config";
import type { LiveBus } from "@/lib/live-buses";
import type { LiveTram } from "@/lib/live-trams";
import type { LiveTrain } from "@/lib/live-trains";

export type SydneyTransit = {
  buses: LiveBus[];
  trams: LiveTram[];
  trains: LiveTrain[];
};

type SydneyTransitResponse = Partial<SydneyTransit>;

export async function fetchSydneyTransit(): Promise<SydneyTransit> {
  let response: Response;
  try {
    response = await fetch(getApiUrl("/api/ptv/sydney-transit"));
  } catch (error) {
    if (error instanceof TypeError) {
      return { buses: [], trams: [], trains: [] };
    }
    throw error;
  }

  if (response.status === 404 || response.status === 503) {
    return { buses: [], trams: [], trains: [] };
  }

  if (!response.ok) {
    const message = await readJsonErrorMessage(response, `Failed to load Sydney transit (${response.status})`);
    throw new Error(message);
  }

  if (!responseIsJson(response)) {
    return { buses: [], trams: [], trains: [] };
  }

  const payload = await readJsonResponse<SydneyTransitResponse>(response, "Sydney transit API");
  return {
    buses: payload.buses ?? [],
    trams: payload.trams ?? [],
    trains: payload.trains ?? [],
  };
}
