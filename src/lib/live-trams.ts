import { readJsonErrorMessage, readJsonResponse, responseIsJson } from "@/lib/http-json";

export type LiveTram = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  route: string;
  destination?: string;
  status?: "live";
  timestamp?: string;
  heading?: number;
  operator?: string;
};

type LiveTramResponse =
  | LiveTram[]
  | {
      trams?: LiveTram[];
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
    return "Tram";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "Tram";
  }

  const ptvRouteIdMatch = trimmed.match(/^\d{2}-([A-Z]?\d{1,4}[A-Z]?)(?:-|$)/i);
  if (ptvRouteIdMatch?.[1]) {
    return ptvRouteIdMatch[1].toUpperCase();
  }

  const plainRouteMatch = trimmed.match(/\b([A-Z]?\d{1,4}[A-Z]?)\b/i);
  if (plainRouteMatch) {
    return plainRouteMatch[1].toUpperCase();
  }

  if (isRawFeedIdentifier(trimmed)) {
    return "Tram";
  }

  const compact = stripFeedPrefix(trimmed);
  if (compact.length <= 12) {
    return compact.toUpperCase();
  }

  return "Tram";
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

function normaliseLiveTram(raw: Partial<LiveTram> & Record<string, unknown>, index: number): LiveTram | null {
  if (typeof raw.lat !== "number" || typeof raw.lng !== "number") {
    return null;
  }

  const route = normaliseRouteLabel(
    typeof raw.route === "string" && raw.route.trim() && raw.route.trim() !== "03"
      ? raw.route
      : typeof raw.id === "string"
        ? raw.id
        : raw.route,
  );
  const cleanLabel = normaliseLabel(raw.label);
  const label =
    cleanLabel
      ? cleanLabel
      : route === "Tram"
        ? `tram-${index + 1}`
        : `Route ${route}`;

  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : `tram-${index}`,
    label,
    lat: raw.lat,
    lng: raw.lng,
    route,
    destination: normaliseDestination(raw.destination),
    status: "live",
    timestamp: typeof raw.timestamp === "string" ? raw.timestamp : undefined,
    heading: typeof raw.heading === "number" ? raw.heading : undefined,
    operator: typeof raw.operator === "string" && raw.operator.trim() ? raw.operator : "Yarra Trams",
  };
}

export type LiveViewportBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export async function fetchLiveTrams(bounds?: LiveViewportBounds): Promise<LiveTram[]> {
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
    response = await fetch(`/api/ptv/live-trams${search}`);
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
    const message = await readJsonErrorMessage(response, `Failed to load live trams (${response.status})`);
    throw new Error(message);
  }

  if (!responseIsJson(response)) {
    return [];
  }

  const payload = await readJsonResponse<LiveTramResponse>(response, "Live trams API");
  const trams = Array.isArray(payload) ? payload : payload.trams ?? [];

  return trams
    .map((tram, index) => normaliseLiveTram(tram, index))
    .filter((tram): tram is LiveTram => tram !== null);
}
