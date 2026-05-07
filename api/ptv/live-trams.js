import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const GtfsRealtimeBindings = require("../../vendor/ptv/gtfs-realtime.cjs");

const PTV_BASE_URL =
  "https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/tram";

function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (value && typeof value === "object" && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  return undefined;
}

function normaliseRoute(routeId, fallback = "Tram") {
  if (typeof routeId !== "string") {
    return fallback;
  }

  const trimmed = routeId.trim();
  if (!trimmed) {
    return fallback;
  }

  const ptvRouteIdMatch = trimmed.match(/^\d{2}-([A-Z]?\d{1,4}[A-Z]?)(?:-|$)/i);
  if (ptvRouteIdMatch?.[1]) {
    return ptvRouteIdMatch[1].toUpperCase();
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

  return "Tram";
}

function normaliseDestination(...values) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (/^aus:vic:vic-02-[A-Z0-9-]+:?$/i.test(trimmed) || /^vic-02-[A-Z0-9-]+:?$/i.test(trimmed)) {
      continue;
    }
    return trimmed;
  }

  return undefined;
}

function buildPtvLiveTrams(feed) {
  return (feed.entity ?? [])
    .map((entity) => {
      const vehicle = entity.vehicle;
      const position = vehicle?.position;
      if (!vehicle || !position) return null;

      const latitude = position.latitude;
      const longitude = position.longitude;
      if (typeof latitude !== "number" || typeof longitude !== "number") return null;

      const route = normaliseRoute(vehicle.trip?.tripId || entity.id || vehicle.trip?.routeId);
      const timestamp = toNumber(vehicle.timestamp);
      const label = normaliseLabel(vehicle.vehicle?.label, vehicle.vehicle?.licensePlate, route);
      const destination = normaliseDestination(
        vehicle.trip?.tripHeadsign,
        vehicle.trip?.headsign,
        vehicle.trip?.tripShortName,
      );

      return {
        id: entity.id || vehicle.vehicle?.id || `${route}-${latitude}-${longitude}`,
        label,
        lat: latitude,
        lng: longitude,
        route,
        destination,
        status: "live",
        timestamp: timestamp ? new Date(timestamp * 1000).toISOString() : undefined,
        heading: typeof position.bearing === "number" ? position.bearing : undefined,
        operator: "Yarra Trams",
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
    res.status(200).json({ trams: [] });
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
    res.status(200).json({ trams: buildPtvLiveTrams(feed) });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to load live trams",
    });
  }
}
