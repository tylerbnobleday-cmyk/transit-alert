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

const NSW_TRAINS_VEHICLE_POSITIONS_URL = "https://api.transport.nsw.gov.au/v2/gtfs/vehiclepos/nswtrains";
const NSW_SOUTHEASTERN_BOUNDS = {
  minLat: -39.8,
  maxLat: -32.0,
  minLng: 140.0,
  maxLng: 152.5,
};

const NSW_TRAINLINK_KEYWORDS = [
  "xpt",
  "xplorer",
  "trainlink",
  "southern cross",
  "sydney central",
  "albury",
  "melbourne",
  "brisbane",
  "casino",
  "dubbo",
  "armidale",
  "moree",
  "griffith",
  "canberra",
  "goulburn",
];

function readBoundsFilter(query = {}) {
  const minLat = Number(query.minLat);
  const maxLat = Number(query.maxLat);
  const minLng = Number(query.minLng);
  const maxLng = Number(query.maxLng);

  if ([minLat, maxLat, minLng, maxLng].some((value) => Number.isNaN(value))) {
    return null;
  }

  return { minLat, maxLat, minLng, maxLng };
}

function withinBounds(item, bounds) {
  if (!bounds) return true;
  return (
    item.lat >= bounds.minLat &&
    item.lat <= bounds.maxLat &&
    item.lng >= bounds.minLng &&
    item.lng <= bounds.maxLng
  );
}

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

function buildFeedError(sourceKey, status) {
  if (status === 429) {
    return new Error(`${sourceKey}:rate-limited`);
  }

  return new Error(`${sourceKey}:unavailable:${status}`);
}

function sanitiseFeedFailure(message) {
  if (/rate-limited|:429\b/i.test(message)) {
    return "Live train feed is rate limited. Showing cached/fallback data where available.";
  }

  if (/nswtrains/i.test(message)) {
    return "NSW TrainLink live feed is unavailable right now.";
  }

  if (/metro|vline/i.test(message)) {
    return "PTV live train feed is unavailable right now.";
  }

  return "Live train feed is unavailable right now.";
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

function isWithinNswSoutheasternBounds(latitude, longitude) {
  return (
    latitude >= NSW_SOUTHEASTERN_BOUNDS.minLat &&
    latitude <= NSW_SOUTHEASTERN_BOUNDS.maxLat &&
    longitude >= NSW_SOUTHEASTERN_BOUNDS.minLng &&
    longitude <= NSW_SOUTHEASTERN_BOUNDS.maxLng
  );
}

function getFirstMeaningfulText(...values) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    return trimmed;
  }

  return "";
}

function inferNswTrainLinkServiceLabel(...values) {
  const joined = values
    .filter((value) => typeof value === "string" && value.trim())
    .join(" ")
    .toLowerCase();

  if (joined.includes("xpt")) return "NSW TrainLink XPT";
  if (joined.includes("xplorer")) return "NSW TrainLink Xplorer";
  return "NSW TrainLink";
}

function inferNswTrainLinkDestination(...values) {
  const joined = values
    .filter((value) => typeof value === "string" && value.trim())
    .join(" ")
    .toLowerCase();

  const destinationMap = [
    ["southern cross", "Southern Cross"],
    ["sydney central", "Sydney Central"],
    ["albury", "Albury"],
    ["melbourne", "Melbourne"],
    ["brisbane", "Brisbane"],
    ["casino", "Casino"],
    ["dubbo", "Dubbo"],
    ["armidale", "Armidale"],
    ["moree", "Moree"],
    ["griffith", "Griffith"],
    ["canberra", "Canberra"],
    ["goulburn", "Goulburn"],
  ];

  for (const [needle, label] of destinationMap) {
    if (joined.includes(needle)) {
      return label;
    }
  }

  return inferNswTrainLinkServiceLabel(...values);
}

function buildNswLiveTrains(feed) {
  return (feed.entity ?? [])
    .map((entity) => {
      const vehicle = entity.vehicle;
      const position = vehicle?.position;
      if (!vehicle || !position) return null;

      const latitude = position.latitude;
      const longitude = position.longitude;
      if (typeof latitude !== "number" || typeof longitude !== "number") return null;
      if (!isWithinNswSoutheasternBounds(latitude, longitude)) return null;

      const routeId = vehicle.trip?.routeId;
      const tripId = vehicle.trip?.tripId;
      const tripStartDate = vehicle.trip?.startDate;
      const vehicleLabel = vehicle.vehicle?.label;
      const vehicleId = vehicle.vehicle?.id;
      const entityId = entity.id;
      const serviceLabel = inferNswTrainLinkServiceLabel(routeId, tripId, vehicleLabel, vehicleId, entityId);
      const destination = inferNswTrainLinkDestination(routeId, tripId, vehicleLabel, vehicleId, entityId);
      const timestamp = toNumber(vehicle.timestamp);
      const directionId = toNumber(vehicle.trip?.directionId);
      const tdn = getFirstMeaningfulText(vehicleLabel, tripId, vehicleId, entityId, routeId, "XPT");
      const consist = normaliseConsistLabel(vehicleLabel, vehicleId, tdn);

      const descriptiveText = [routeId, tripId, vehicleLabel, vehicleId, entityId]
        .filter((value) => typeof value === "string" && value.trim())
        .join(" ");

      const looksLikeTrainLink =
        NSW_TRAINLINK_KEYWORDS.some((keyword) => descriptiveText.toLowerCase().includes(keyword)) ||
        serviceLabel !== "NSW TrainLink";

      if (!looksLikeTrainLink) {
        return null;
      }

      return {
        tdn,
        lat: latitude,
        lng: longitude,
        line: serviceLabel,
        destination,
        status: "on_time",
        timestamp: timestamp ? new Date(timestamp * 1000).toISOString() : undefined,
        direction: directionId === 0 ? "up" : directionId === 1 ? "down" : destination === "Southern Cross" ? "city-bound" : "outbound",
        heading: typeof position.bearing === "number" ? position.bearing : undefined,
        trainType: serviceLabel.includes("Xplorer") ? "NSW TrainLink Xplorer" : "NSW TrainLink XPT",
        consist,
        serviceDescription: [serviceLabel, destination, tripStartDate].filter(Boolean).join(" · "),
      };
    })
    .filter(Boolean);
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
  const nswTransportApiKey =
    process.env.NSW_TRANSPORT_API_KEY ||
    process.env.TRANSPORT_NSW_API_KEY ||
    process.env.TFNSW_API_KEY ||
    process.env.NSW_OPENDATA_API_KEY;

  if (!ptvSubscriptionKey && !nswTransportApiKey) {
    res.status(200).json({ trains: [] });
    return;
  }

  try {
    const bounds = readBoundsFilter(req.query ?? {});
    const feedRequests = [
      ...(ptvSubscriptionKey
        ? PTV_FEEDS.map(async (source) => {
            const response = await fetch(`${source.baseUrl}/vehicle-positions`, {
              headers: {
                KeyID: ptvSubscriptionKey,
                "Ocp-Apim-Subscription-Key": ptvSubscriptionKey,
              },
            });

            if (!response.ok) {
              throw buildFeedError(source.key, response.status);
            }

            const buffer = await response.arrayBuffer();
            const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
            return buildPtvLiveTrains(feed, source);
          })
        : []),
      ...(nswTransportApiKey
        ? [
            (async () => {
              const response = await fetch(NSW_TRAINS_VEHICLE_POSITIONS_URL, {
                headers: {
                  Authorization: `apikey ${nswTransportApiKey}`,
                  Accept: "application/x-google-protobuf",
                },
              });

              if (!response.ok) {
                throw buildFeedError("nswtrains", response.status);
              }

              const buffer = await response.arrayBuffer();
              const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
              return buildNswLiveTrains(feed);
            })(),
          ]
        : []),
    ];

    const responses = await Promise.allSettled(feedRequests);

    const fulfilled = responses
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value)
      .filter((train) => withinBounds(train, bounds));

    if (fulfilled.length > 0) {
      res.status(200).json({ trains: fulfilled });
      return;
    }

    const failureMessage = responses
      .filter((result) => result.status === "rejected")
      .map((result) => sanitiseFeedFailure(result.reason instanceof Error ? result.reason.message : "Unknown feed error"))
      .filter((message, index, messages) => messages.indexOf(message) === index)
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
