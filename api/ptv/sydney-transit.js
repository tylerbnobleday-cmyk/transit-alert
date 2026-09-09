import GtfsRealtimeBindings from "gtfs-realtime-bindings";

// Opt-in Sydney layer (see LayerState.sydneyTransit in Map.tsx) — this is a
// separate NSW Transport Open Data product from the "nswtrains" feed used for
// interstate/regional NSW TrainLink in live-trains.js. Buses alone return
// ~1,700 vehicles across greater Sydney, so this is intentionally its own
// endpoint the client only calls when the layer is switched on, not folded
// into the always-on Melbourne fetch.
const SYDNEY_BUSES_URL = "https://api.transport.nsw.gov.au/v1/gtfs/vehiclepos/buses";
const SYDNEY_LIGHT_RAIL_FEEDS = [
  { key: "cbdandsoutheast", url: "https://api.transport.nsw.gov.au/v1/gtfs/vehiclepos/lightrail/cbdandsoutheast", operator: "Sydney Light Rail (CBD & South East)" },
  { key: "newcastle", url: "https://api.transport.nsw.gov.au/v1/gtfs/vehiclepos/lightrail/newcastle", operator: "Newcastle Light Rail" },
];
const SYDNEY_METRO_URL = "https://api.transport.nsw.gov.au/v1/gtfs/vehiclepos/metro";

// Loosely greater-Sydney/Central Coast/Illawarra — wide enough to keep every
// real Sydney-network vehicle without also pulling in unrelated regional NSW
// buses that might appear at the edges of the statewide "buses" feed.
const SYDNEY_BOUNDS = { minLat: -34.6, maxLat: -32.6, minLng: 150.4, maxLng: 152.2 };

function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (value && typeof value === "object" && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  return undefined;
}

function withinSydneyBounds(lat, lng) {
  return lat >= SYDNEY_BOUNDS.minLat && lat <= SYDNEY_BOUNDS.maxLat && lng >= SYDNEY_BOUNDS.minLng && lng <= SYDNEY_BOUNDS.maxLng;
}

async function fetchGtfsFeed(url, apiKey) {
  const response = await fetch(url, {
    headers: {
      Authorization: `apikey ${apiKey}`,
      Accept: "application/x-google-protobuf",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`${url}:unavailable:${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  return GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
}

function buildSydneyBuses(feed) {
  return (feed.entity ?? [])
    .map((entity) => {
      const vehicle = entity.vehicle;
      const position = vehicle?.position;
      if (!vehicle || !position) return null;
      const lat = position.latitude;
      const lng = position.longitude;
      if (typeof lat !== "number" || typeof lng !== "number" || !withinSydneyBounds(lat, lng)) return null;

      const routeId = vehicle.trip?.routeId;
      const route = typeof routeId === "string" && routeId.trim() ? routeId.trim() : "Bus";
      const timestamp = toNumber(vehicle.timestamp);
      const label = vehicle.vehicle?.label || vehicle.vehicle?.id || route;

      return {
        id: entity.id || vehicle.vehicle?.id || `${route}-${lat}-${lng}`,
        label,
        vehicleId: vehicle.vehicle?.id,
        registration: vehicle.vehicle?.licensePlate,
        tripId: vehicle.trip?.tripId,
        lat,
        lng,
        route,
        status: "live",
        timestamp: timestamp ? new Date(timestamp * 1000).toISOString() : undefined,
        heading: typeof position.bearing === "number" ? position.bearing : undefined,
        operator: "Sydney bus network",
      };
    })
    .filter(Boolean);
}

function buildSydneyLightRail(feed, operator) {
  return (feed.entity ?? [])
    .map((entity) => {
      const vehicle = entity.vehicle;
      const position = vehicle?.position;
      if (!vehicle || !position) return null;
      const lat = position.latitude;
      const lng = position.longitude;
      if (typeof lat !== "number" || typeof lng !== "number") return null;

      const tripId = vehicle.trip?.tripId;
      const routeId = vehicle.trip?.routeId;
      const route = typeof routeId === "string" && routeId.trim() ? routeId.trim() : "Light rail";
      const timestamp = toNumber(vehicle.timestamp);

      return {
        id: entity.id || vehicle.vehicle?.id || `${route}-${lat}-${lng}`,
        tripId: typeof tripId === "string" && tripId.trim() ? tripId.trim() : undefined,
        label: vehicle.vehicle?.label || route,
        lat,
        lng,
        route,
        status: "live",
        timestamp: timestamp ? new Date(timestamp * 1000).toISOString() : undefined,
        heading: typeof position.bearing === "number" ? position.bearing : undefined,
        operator,
      };
    })
    .filter(Boolean);
}

function buildSydneyMetroTrains(feed) {
  return (feed.entity ?? [])
    .map((entity) => {
      const vehicle = entity.vehicle;
      const position = vehicle?.position;
      if (!vehicle || !position) return null;
      const lat = position.latitude;
      const lng = position.longitude;
      if (typeof lat !== "number" || typeof lng !== "number") return null;

      const tripId = vehicle.trip?.tripId;
      const routeId = vehicle.trip?.routeId;
      const label = vehicle.vehicle?.label || vehicle.vehicle?.id;
      const timestamp = toNumber(vehicle.timestamp);
      const directionId = toNumber(vehicle.trip?.directionId);

      // Shaped to fit the LiveTrain type (see src/lib/live-trains.ts) so the
      // existing metro/regional marker + detail-panel rendering can be reused
      // as-is — same pattern as folding NSW TrainLink into that pipeline.
      return {
        tdn: label || routeId || "Sydney Metro",
        tripId,
        lat,
        lng,
        line: "Sydney Metro",
        destination: "Sydney Metro",
        status: "on_time",
        timestamp: timestamp ? new Date(timestamp * 1000).toISOString() : undefined,
        direction: directionId === 0 ? "up" : directionId === 1 ? "down" : "outbound",
        heading: typeof position.bearing === "number" ? position.bearing : undefined,
        trainType: "Sydney Metro",
        consist: label || "Sydney Metro",
        serviceDescription: "Sydney Metro",
      };
    })
    .filter(Boolean);
}

export default async function handler(req, res) {
  const apiKey =
    process.env.NSW_TRANSPORT_API_KEY ||
    process.env.TRANSPORT_NSW_API_KEY ||
    process.env.TFNSW_API_KEY ||
    process.env.NSW_OPENDATA_API_KEY;

  if (!apiKey) {
    res.status(503).json({
      error: "Sydney transit needs an NSW Transport Open Data API key.",
      code: "NSW_KEY_REQUIRED",
      buses: [],
      trams: [],
      trains: [],
    });
    return;
  }

  const [busesResult, lightRailResults, metroResult] = await Promise.allSettled([
    fetchGtfsFeed(SYDNEY_BUSES_URL, apiKey),
    Promise.allSettled(SYDNEY_LIGHT_RAIL_FEEDS.map((feedSource) => fetchGtfsFeed(feedSource.url, apiKey))),
    fetchGtfsFeed(SYDNEY_METRO_URL, apiKey),
  ]);

  const buses = busesResult.status === "fulfilled" ? buildSydneyBuses(busesResult.value) : [];

  const trams =
    lightRailResults.status === "fulfilled"
      ? lightRailResults.value.flatMap((result, index) =>
          result.status === "fulfilled" ? buildSydneyLightRail(result.value, SYDNEY_LIGHT_RAIL_FEEDS[index].operator) : [],
        )
      : [];

  const trains = metroResult.status === "fulfilled" ? buildSydneyMetroTrains(metroResult.value) : [];

  for (const result of [busesResult, metroResult]) {
    if (result.status === "rejected") {
      console.warn("[sydney-transit] feed request failed:", result.reason instanceof Error ? result.reason.message : result.reason);
    }
  }

  res.status(200).json({ buses, trams, trains });
}
