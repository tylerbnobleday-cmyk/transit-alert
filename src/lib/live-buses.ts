export type LiveBus = {
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
    lat: raw.lat,
    lng: raw.lng,
    route,
    destination: normaliseDestination(raw.destination),
    status: "live",
    timestamp: typeof raw.timestamp === "string" ? raw.timestamp : undefined,
    heading: typeof raw.heading === "number" ? raw.heading : undefined,
    operator: typeof raw.operator === "string" && raw.operator.trim() ? raw.operator : "PTV Bus",
  };
}

export async function fetchLiveBuses(): Promise<LiveBus[]> {
  let response: Response;
  try {
    response = await fetch("/api/ptv/live-buses");
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
    let message = `Failed to load live buses (${response.status})`;
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

  const payload = (await response.json()) as LiveBusResponse;
  const buses = Array.isArray(payload) ? payload : payload.buses ?? [];

  return buses
    .map((bus, index) => normaliseLiveBus(bus, index))
    .filter((bus): bus is LiveBus => bus !== null);
}
