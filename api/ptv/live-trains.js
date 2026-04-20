import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const GtfsRealtimeBindings = require("../../vendor/ptv/gtfs-realtime.cjs");

const PTV_BASE_URL =
  "https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro";

function normalisePtvRouteId(routeId) {
  const code = routeId?.match(/vic-02-([A-Z0-9]+):/i)?.[1]?.toUpperCase() ?? String(routeId || "Metro");
  const routeMap = {
    ALM: "Alamein",
    BEG: "Belgrave",
    CBE: "Cranbourne",
    CGB: "Craigieburn",
    FKN: "Frankston",
    GWY: "Glen Waverley",
    HBE: "Hurstbridge",
    LIL: "Lilydale",
    MDD: "Mernda",
    PKM: "Pakenham",
    SHM: "Sandringham",
    STY: "Stony Point",
    SUY: "Sunbury",
    UFD: "Upfield",
    WER: "Werribee",
    WIL: "Williamstown",
  };

  return routeMap[code] ?? String(routeId || "Metro");
}

function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (value && typeof value === "object" && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  return undefined;
}

function buildPtvLiveTrains(feed) {
  return (feed.entity ?? [])
    .map((entity) => {
      const vehicle = entity.vehicle;
      const position = vehicle?.position;
      if (!vehicle || !position) return null;

      const latitude = position.latitude;
      const longitude = position.longitude;
      if (typeof latitude !== "number" || typeof longitude !== "number") return null;

      const routeId = vehicle.trip?.routeId || "Metro";
      const lineName = normalisePtvRouteId(routeId);
      const directionId = toNumber(vehicle.trip?.directionId);
      const timestamp = toNumber(vehicle.timestamp);
      const label = vehicle.vehicle?.label || vehicle.vehicle?.id || entity.id || routeId;

      return {
        tdn: label,
        lat: latitude,
        lng: longitude,
        line: lineName,
        destination: lineName,
        status: "on_time",
        timestamp: timestamp ? new Date(timestamp * 1000).toISOString() : undefined,
        direction: directionId === 0 ? "up" : "down",
        heading: typeof position.bearing === "number" ? position.bearing : undefined,
        trainType: "Metro Train",
        consist: vehicle.vehicle?.id || label,
        serviceDescription: lineName,
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
    res.status(200).json({ trains: [] });
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
    res.status(200).json({ trains: buildPtvLiveTrains(feed) });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to load live trains",
    });
  }
}
