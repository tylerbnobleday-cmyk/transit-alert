import { readJsonErrorMessage, readJsonResponse, responseIsJson } from "@/lib/http-json";
import { getApiUrl } from "@/lib/api-config";

export type LiveBus = {
  id: string;
  label: string;
  vehicleId?: string;
  fleetNumber?: string;
  registration?: string;
  tripId?: string;
  lat: number;
  lng: number;
  route: string;
  destination?: string;
  stopId?: string;
  stopStatus?: "incoming" | "stopped" | "in_transit";
  stopSequence?: number;
  status?: "live";
  timestamp?: string;
  heading?: number;
  operator?: string;
};

type LiveBusResponse =
  | LiveBus[]
  | {
      buses?: LiveBus[];
    };

function isRawFeedIdentifier(value: string) {
  return /^aus:vic:vic-02-[A-Z0-9-]+:?$/i.test(value) || /^vic-02-[A-Z0-9-]+:?$/i.test(value);
}

function stripFeedPrefix(value: string) {
  return value
    .replace(/^aus:vic:/i, "")
    .replace(/^vic:/i, "")
    .replace(/:$/g, "");
}

function normaliseRouteLabel(value: unknown) {
  if (typeof value !== "string") {
    return "Bus";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "Bus";
  }

  const ptvRouteMatch = trimmed.match(/vic-02-([A-Z]?\d{1,4}[A-Z]?)(?::|-|$)/i);
  if (ptvRouteMatch) {
    return ptvRouteMatch[1].toUpperCase();
  }

  const plainRouteMatch = trimmed.match(/\b([A-Z]?\d{1,4}[A-Z]?)\b/i);
  if (plainRouteMatch) {
    return plainRouteMatch[1].toUpperCase();
  }

  if (isRawFeedIdentifier(trimmed)) {
    return "Bus";
  }

  const compact = stripFeedPrefix(trimmed);
  if (compact.length <= 12) {
    return compact.toUpperCase();
  }

  return "Bus";
}

function normaliseDestination(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed || isRawFeedIdentifier(trimmed)) {
    return undefined;
  }

  const cleaned = stripFeedPrefix(trimmed).trim();
  if (!cleaned || isRawFeedIdentifier(cleaned)) {
    return undefined;
  }

  return cleaned;
}

function normaliseLabel(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed || isRawFeedIdentifier(trimmed)) {
    return undefined;
  }

  const cleaned = stripFeedPrefix(trimmed).trim();
  return cleaned || undefined;
}

function normaliseLiveBus(raw: Partial<LiveBus> & Record<string, unknown>, index: number): LiveBus | null {
  if (typeof raw.lat !== "number" || typeof raw.lng !== "number") {
    return null;
  }

  const route = normaliseRouteLabel(raw.route);
  const cleanLabel = normaliseLabel(raw.label);
  const label =
    cleanLabel
      ? cleanLabel
      : route === "Bus"
        ? `bus-${index + 1}`
        : `Route ${route}`;

  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : `bus-${index}`,
    label,
    vehicleId: normaliseLabel(raw.vehicleId),
    fleetNumber: normaliseLabel(raw.fleetNumber),
    registration: normaliseLabel(raw.registration),
    tripId: normaliseLabel(raw.tripId),
    lat: raw.lat,
    lng: raw.lng,
    route,
    destination: normaliseDestination(raw.destination),
    stopId: normaliseLabel(raw.stopId),
    stopStatus:
      raw.stopStatus === "incoming" || raw.stopStatus === "stopped" || raw.stopStatus === "in_transit"
        ? raw.stopStatus
        : undefined,
    stopSequence: typeof raw.stopSequence === "number" ? raw.stopSequence : undefined,
    status: "live",
    timestamp: typeof raw.timestamp === "string" ? raw.timestamp : undefined,
    heading: typeof raw.heading === "number" ? raw.heading : undefined,
    operator: typeof raw.operator === "string" && raw.operator.trim() ? raw.operator : "PTV Bus",
  };
}

export type LiveViewportBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export async function fetchLiveBuses(bounds?: LiveViewportBounds): Promise<LiveBus[]> {
  let response: Response;
  try {
    const search = bounds
      ? `?${new URLSearchParams({
          minLat: String(bounds.minLat),
          maxLat: String(bounds.maxLat),
          minLng: String(bounds.minLng),
          maxLng: String(bounds.maxLng),
        }).toString()}`
      : "";
    response = await fetch(getApiUrl(`/api/ptv/live-buses${search}`));
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
    const message = await readJsonErrorMessage(response, `Failed to load live buses (${response.status})`);
    throw new Error(message);
  }

  if (!responseIsJson(response)) {
    return [];
  }

  const payload = await readJsonResponse<LiveBusResponse>(response, "Live buses API");
  const buses = Array.isArray(payload) ? payload : payload.buses ?? [];

  return buses
    .map((bus, index) => normaliseLiveBus(bus, index))
    .filter((bus): bus is LiveBus => bus !== null);
}
