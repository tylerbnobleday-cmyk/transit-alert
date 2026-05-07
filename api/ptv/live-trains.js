import GtfsRealtimeBindings from "gtfs-realtime-bindings";

const PTV_FEEDS = [
  {
    key: "metro",
    baseUrl: "https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro",
    defaultLine: "Metro",
    trainType: "Metro Train",
  },
  {
    key: "vline",
    baseUrl: "https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/vline",
    defaultLine: "V/Line",
    trainType: "V/Line Train",
  },
];

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

function normaliseConsistLabel(...values) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (/^aus:vic:vic-02-[A-Z0-9]+:/i.test(trimmed)) continue;
    if (/^vic-02-[A-Z0-9]+:/i.test(trimmed)) continue;
    return trimmed;
  }

  return "Unknown";
}

function buildPtvLiveTrains(feed, source) {
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
      const resolvedLine =
        lineName && !/^vic-02-/i.test(lineName) && lineName !== routeId
          ? lineName
          : source.defaultLine;
      const directionId = toNumber(vehicle.trip?.directionId);
      const timestamp = toNumber(vehicle.timestamp);
      const label = vehicle.vehicle?.label || vehicle.vehicle?.id || entity.id || routeId;
      const consist = normaliseConsistLabel(vehicle.vehicle?.label, vehicle.vehicle?.id);

      return {
        tdn: label,
        lat: latitude,
        lng: longitude,
        line: resolvedLine,
        destination: resolvedLine,
        status: "on_time",
        timestamp: timestamp ? new Date(timestamp * 1000).toISOString() : undefined,
        direction: directionId === 0 ? "up" : "down",
        heading: typeof position.bearing === "number" ? position.bearing : undefined,
        trainType: source.trainType,
        consist,
        serviceDescription: resolvedLine,
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
    const responses = await Promise.allSettled(
      PTV_FEEDS.map(async (source) => {
        const response = await fetch(`${source.baseUrl}/vehicle-positions`, {
          headers: {
            KeyID: ptvSubscriptionKey,
            "Ocp-Apim-Subscription-Key": ptvSubscriptionKey,
          },
        });

        if (!response.ok) {
          const details = await response.text().catch(() => "");
          throw new Error(`${source.key}:${response.status}:${details.slice(0, 120)}`);
        }

        const buffer = await response.arrayBuffer();
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
        return buildPtvLiveTrains(feed, source);
      }),
    );

    const fulfilled = responses
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value);

    if (fulfilled.length > 0) {
      res.status(200).json({ trains: fulfilled });
      return;
    }

    const failureMessage = responses
      .filter((result) => result.status === "rejected")
      .map((result) => (result.reason instanceof Error ? result.reason.message : "Unknown feed error"))
      .join(" | ");

    res.status(502).json({
      error: failureMessage || "Failed to load live trains",
    });
    return;
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to load live trains",
    });
  }
}
