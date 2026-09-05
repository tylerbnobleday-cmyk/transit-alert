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
  formationSegments?: BusFormationSegment[];
  generatedAt?: string;
  realtimeFeedAt?: string;
  scheduleUpdatedAt?: string;
  source?: string;
};

export type TramTripPayload = BusTripPayload;

export type SurfaceStopDeparturesPayload = {
  stopId: string;
  stopName: string;
  route: string;
  departures: Array<{
    route: string;
    destination: string;
    scheduledAt: string;
    expectedAt: string;
    status: "scheduled" | "live" | "cancelled";
    platform?: string;
    runId?: string;
  }>;
  generatedAt?: string;
  source?: string;
};

export type BusFormationSegment = {
  tripId: string;
  route?: string;
  origin?: string;
  destination?: string;
  departsAt?: string;
  arrivesAt?: string;
};

export type VerifiedTrainStop = {
  stopId: string;
  stopSequence: number;
  name: string;
  platform?: string;
  lat?: number;
  lng?: number;
  scheduledArrivalAt: string;
  scheduledDepartureAt: string;
  expectedArrivalAt: string;
  expectedDepartureAt: string;
  delaySeconds: number;
  dwellSeconds: number;
  status: "passed" | "upcoming" | "skipped";
};

export type TrainFormationSegment = {
  tripId: string;
  tdn: string;
  route?: string;
  direction: "UP" | "DOWN";
  origin?: string;
  destination?: string;
  departsAt?: string;
  arrivesAt?: string;
};

export type TrainTripPayload = {
  tripId: string;
  route?: string;
  destination?: string;
  serviceDate?: string;
  stops: VerifiedTrainStop[];
  segmentTripIds?: string[];
  segments?: TrainFormationSegment[];
  formationSegments?: TrainFormationSegment[];
  handover?: {
    station: string;
    fromTripId: string;
    toTripId: string;
  };
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

export async function fetchTramTrip(tripId: string): Promise<TramTripPayload> {
  const search = new URLSearchParams({ type: "tram-trip", tripId });
  return readTimetableResponse(
    await fetch(getApiUrl(`/api/ptv/timetable?${search.toString()}`), { credentials: "include" }),
  );
}

export async function fetchSurfaceStopDepartures(stop: { mode: "bus" | "tram"; route: string; lat: number; lng: number }): Promise<SurfaceStopDeparturesPayload> {
  const search = new URLSearchParams({ type: "surface-stop", mode: stop.mode, route: stop.route, lat: String(stop.lat), lng: String(stop.lng) });
  return readTimetableResponse(
    await fetch(getApiUrl(`/api/ptv/timetable?${search.toString()}`), { credentials: "include" }),
  );
}

export async function fetchTrainTrip(tripId: string): Promise<TrainTripPayload> {
  const search = new URLSearchParams({ type: "train-trip", tripId });
  return readTimetableResponse(
    await fetch(getApiUrl(`/api/ptv/timetable?${search.toString()}`), { credentials: "include" }),
  );
}
