import { getApiUrl } from "@/lib/api-config";
import { readJsonErrorMessage } from "@/lib/http-json";

export type VerifiedDeparture = {
  tripId: string;
  route: string;
  destination: string;
  platform?: string;
  scheduledAt: string;
  expectedAt: string;
  status: "scheduled" | "live" | "cancelled" | "skipped";
  delaySeconds?: number;
  serviceDate: string;
};

export type StationDeparturesPayload = {
  stationName: string;
  departures: VerifiedDeparture[];
  generatedAt?: string;
  realtimeFeedAt?: string;
  scheduleUpdatedAt?: string;
  source?: string;
  error?: string;
};

export type VerifiedBusStop = {
  stopId: string;
  stopSequence: number;
  name: string;
  stopCode?: string;
  lat?: number;
  lng?: number;
  expectedAt?: string;
  status: "passed" | "upcoming" | "skipped";
};

export type BusTripPayload = {
  tripId: string;
  route?: string;
  destination?: string;
  stops: VerifiedBusStop[];
  generatedAt?: string;
  realtimeFeedAt?: string;
  scheduleUpdatedAt?: string;
  source?: string;
};

async function readTimetableResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(await readJsonErrorMessage(response, "Verified timetable data is unavailable."));
  }
  return response.json() as Promise<T>;
}

export async function fetchStationDepartures(stationName: string): Promise<StationDeparturesPayload> {
  const search = new URLSearchParams({ type: "station", station: stationName });
  return readTimetableResponse(
    await fetch(getApiUrl(`/api/ptv/timetable?${search.toString()}`), { credentials: "include" }),
  );
}

export async function fetchBusTrip(tripId: string): Promise<BusTripPayload> {
  const search = new URLSearchParams({ type: "bus-trip", tripId });
  return readTimetableResponse(
    await fetch(getApiUrl(`/api/ptv/timetable?${search.toString()}`), { credentials: "include" }),
  );
}
