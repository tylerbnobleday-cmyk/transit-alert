import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const GtfsRealtimeBindings = require("../../vendor/ptv/gtfs-realtime.cjs");

const PTV_BASE_URL =
  "https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/bus";

function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (value && typeof value === "object" && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  return undefined;
}

function normaliseBusRoute(routeId, fallback = "Bus") {
  if (typeof routeId !== "string") {
    return fallback;
  }

  const trimmed = routeId.trim();
  if (!trimmed) {
    return fallback;
  }

  const routeMatch = trimmed.match(/\b([A-Z]?\d{1,4}[A-Z]?)\b/i);
  if (routeMatch) {
    return routeMatch[1].toUpperCase();
  }

  return fallback;
}

function normaliseLabel(...values) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    return trimmed;
  }

  return "Bus";
}

function buildPtvLiveBuses(feed) {
  return (feed.entity ?? [])
    .map((entity) => {
      const vehicle = entity.vehicle;
      const position = vehicle?.position;
      if (!vehicle || !position) return null;

      const latitude = position.latitude;
      const longitude = position.longitude;
      if (typeof latitude !== "number" || typeof longitude !== "number") return null;

      const route = normaliseBusRoute(vehicle.trip?.routeId);
      const timestamp = toNumber(vehicle.timestamp);
      const label = normaliseLabel(vehicle.vehicle?.label, vehicle.vehicle?.licensePlate, route);

      return {
        id: entity.id || vehicle.vehicle?.id || `${route}-${latitude}-${longitude}`,
        label,
        lat: latitude,
        lng: longitude,
        route,
        status: "live",
        timestamp: timestamp ? new Date(timestamp * 1000).toISOString() : undefined,
        heading: typeof position.bearing === "number" ? position.bearing : undefined,
        operator: "PTV Bus",
      };
    })
    .filter(Boolean);
}

export default async function handler(req, res) {
  const ptvSubscriptionKey =
    process.env.PTV_SUBSCRIPTION_KEY ||
    process.env.PTV_subscription_key ||
    process.env.OCP_APIM_SUBSCRIPTION_KEY ||
    process.env.PTV_API_KEY;

  if (!ptvSubscriptionKey) {
    res.status(200).json({ buses: [] });
    return;
  }

  try {
    const response = await fetch(`${PTV_BASE_URL}/vehicle-positions`, {
      headers: {
        KeyID: ptvSubscriptionKey,
        "Ocp-Apim-Subscription-Key": ptvSubscriptionKey,
      },
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      res.status(response.status).json({
        error: `PTV request failed (${response.status})`,
        details: details.slice(0, 200),
      });
      return;
    }

    const buffer = await response.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
    res.status(200).json({ buses: buildPtvLiveBuses(feed) });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to load live buses",
    });
  }
}
