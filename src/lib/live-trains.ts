import { findStationCoordinate } from "@/lib/station-coordinates";
import { fetchConsistSnapshot } from "@/lib/transportvic-bot";

export type LiveTrain = {
  tdn: string;
  lat: number;
  lng: number;
  line: string;
  destination: string;
  status?: "on_time" | "delayed" | "early";
  timestamp?: string;
  direction: "up" | "down" | "city-bound" | "outbound";
  heading?: number;
  trainType: string;
  consist: string;
  serviceDescription?: string;
};

type LiveTrainResponse =
  | LiveTrain[]
  | {
      trains?: LiveTrain[];
    };

function normaliseConsistLabel(value: unknown) {
  if (typeof value !== "string") {
    return "Unknown";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "Unknown";
  }

  if (/^aus:vic:vic-02-[A-Z0-9]+:/i.test(trimmed) || /^vic-02-[A-Z0-9]+:/i.test(trimmed)) {
    return "Unknown";
  }

  return trimmed;
}

function normaliseLiveTrain(raw: Partial<LiveTrain> & Record<string, unknown>, index: number): LiveTrain | null {
  if (typeof raw.lat !== "number" || typeof raw.lng !== "number") {
    return null;
  }

  const rawLine = typeof raw.line === "string" && raw.line.trim() ? raw.line : "";
  const destination = typeof raw.destination === "string" && raw.destination.trim() ? raw.destination : "Unknown";
  const serviceDescription = typeof raw.serviceDescription === "string" ? raw.serviceDescription : undefined;
  const inferredLine =
    !rawLine || /^metro$/i.test(rawLine) || /^unknown$/i.test(rawLine)
      ? inferLineFromText(destination, serviceDescription, typeof raw.tdn === "string" ? raw.tdn : undefined)
      : rawLine;

  return {
    tdn: typeof raw.tdn === "string" && raw.tdn.trim() ? raw.tdn : `train-${index}`,
    lat: raw.lat,
    lng: raw.lng,
    line: inferredLine,
    destination,
    status:
      raw.status === "on_time" || raw.status === "delayed" || raw.status === "early"
        ? raw.status
        : "on_time",
    timestamp: typeof raw.timestamp === "string" ? raw.timestamp : undefined,
    direction:
      raw.direction === "up" ||
      raw.direction === "down" ||
      raw.direction === "city-bound" ||
      raw.direction === "outbound"
        ? raw.direction
        : "down",
    heading: typeof raw.heading === "number" ? raw.heading : undefined,
    trainType: typeof raw.trainType === "string" && raw.trainType.trim() ? raw.trainType : "Metro Train",
    consist: normaliseConsistLabel(raw.consist),
    serviceDescription,
  };
}

function inferDirection(destination?: string | null): LiveTrain["direction"] {
  const normalised = destination?.trim().toLowerCase() ?? "";

  if (!normalised) {
    return "down";
  }

  if (
    normalised.includes("flinders street") ||
    normalised.includes("southern cross") ||
    normalised.includes("city")
  ) {
    return "city-bound";
  }

  return "outbound";
}

function inferLine(origin?: string | null, destination?: string | null) {
  const joined = `${origin ?? ""} ${destination ?? ""}`.toLowerCase();

  if (joined.includes("williamstown") || joined.includes("newport") || joined.includes("werribee")) {
    return "Williamstown";
  }

  if (joined.includes("sandringham")) {
    return "Sandringham";
  }

  if (joined.includes("frankston") || joined.includes("stony point")) {
    return "Frankston";
  }

  return "Metro";
}

function inferLineFromText(...values: Array<string | null | undefined>) {
  const joined = values
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  if (!joined) return "Metro";
  if (/(werribee|williamstown|newport|laverton|altona)/i.test(joined)) return "Williamstown";
  if (/(sandringham)/i.test(joined)) return "Sandringham";
  if (/(frankston|stony point)/i.test(joined)) return "Frankston";
  if (/(mernda)/i.test(joined)) return "Mernda";
  if (/(hurstbridge)/i.test(joined)) return "Hurstbridge";
  if (/(belgrave)/i.test(joined)) return "Belgrave";
  if (/(lilydale)/i.test(joined)) return "Lilydale";
  if (/(glen waverley)/i.test(joined)) return "Glen Waverley";
  if (/(alamein)/i.test(joined)) return "Alamein";
  if (/(upfield)/i.test(joined)) return "Upfield";
  if (/(craigieburn)/i.test(joined)) return "Craigieburn";
  if (/(sunbury)/i.test(joined)) return "Sunbury";
  if (/(cranbourne)/i.test(joined)) return "Cranbourne";
  if (/(pakenham)/i.test(joined)) return "Pakenham";
  if (/(metro tunnel|munnel)/i.test(joined)) return "Metro Tunnel";
  return "Metro";
}

function calculateBearing(from: [number, number], to: [number, number]) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const toDegrees = (value: number) => (value * 180) / Math.PI;
  const [fromLat, fromLng] = from;
  const [toLat, toLng] = to;
  const phi1 = toRadians(fromLat);
  const phi2 = toRadians(toLat);
  const lambda = toRadians(toLng - fromLng);
  const y = Math.sin(lambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(lambda);
  const theta = toDegrees(Math.atan2(y, x));
  return (theta + 360) % 360;
}

async function fetchTrackedConsistFallback(): Promise<LiveTrain[]> {
  const snapshot = await fetchConsistSnapshot("430M");
  const line = inferLine(
    snapshot.current_trip?.origin ?? snapshot.next_trip?.origin,
    snapshot.current_trip?.destination ?? snapshot.next_trip?.destination,
  );
  const destination = snapshot.current_trip?.destination ?? snapshot.next_trip?.destination ?? "Awaiting next trip";
  const coordinate =
    (typeof snapshot.position?.lat === "number" && typeof snapshot.position?.lng === "number"
      ? [snapshot.position.lat, snapshot.position.lng]
      : null) ??
    findStationCoordinate(snapshot.position?.current_stop) ??
    findStationCoordinate(snapshot.position?.next_stop) ??
    findStationCoordinate(snapshot.current_trip?.origin) ??
    findStationCoordinate(snapshot.next_trip?.origin) ??
    findStationCoordinate(snapshot.current_trip?.destination) ??
    findStationCoordinate(snapshot.next_trip?.destination);

  if (!coordinate) {
    return [];
  }

  const currentStopCoordinate = findStationCoordinate(snapshot.position?.current_stop);
  const nextStopCoordinate = findStationCoordinate(snapshot.position?.next_stop);
  const destinationCoordinate =
    findStationCoordinate(snapshot.current_trip?.destination) ??
    findStationCoordinate(snapshot.next_trip?.destination);
  const inferredHeading =
    currentStopCoordinate && nextStopCoordinate
      ? calculateBearing(currentStopCoordinate, nextStopCoordinate)
      : currentStopCoordinate && destinationCoordinate
        ? calculateBearing(currentStopCoordinate, destinationCoordinate)
        : undefined;

  const serviceDescription = snapshot.current_trip
    ? `${snapshot.current_trip.origin} to ${snapshot.current_trip.destination}`
    : snapshot.next_trip
      ? `Waiting at ${snapshot.next_trip.origin} for ${snapshot.next_trip.destination}`
      : "Waiting for next trip";

  return [
    {
      tdn: snapshot.current_trip?.id ?? snapshot.consist,
      lat: coordinate[0],
      lng: coordinate[1],
      line,
      destination,
      status: "on_time",
      timestamp: snapshot.as_of,
      direction: inferDirection(destination),
      heading: inferredHeading,
      trainType: "TransportVic tracked consist",
      consist: snapshot.consist,
      serviceDescription,
    },
  ];
}

export async function fetchLiveTrains(): Promise<LiveTrain[]> {
  let response: Response;
  try {
    response = await fetch("/api/ptv/live-trains");
  } catch (error) {
    if (error instanceof TypeError) {
      return [];
    }
    throw error;
  }

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    let message = `Failed to load live trains (${response.status})`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload?.error) {
        message = payload.error;
      }
    } catch {
      // Keep the generic message if the endpoint did not return JSON.
    }
    throw new Error(message);
  }

  const payload = (await response.json()) as LiveTrainResponse;
  const trains = Array.isArray(payload) ? payload : payload.trains ?? [];
  const normalisedTrains = trains
    .map((train, index) => normaliseLiveTrain(train, index))
    .filter((train): train is LiveTrain => train !== null);

  if (normalisedTrains.some((train) => train.consist === "430M")) {
    return normalisedTrains;
  }

  try {
    const consistFallback = await fetchTrackedConsistFallback();
    return [...normalisedTrains, ...consistFallback];
  } catch {
    return normalisedTrains;
  }
}
