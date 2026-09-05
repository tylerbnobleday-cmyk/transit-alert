import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { isPtvV3Configured, ptvV3Fetch } from "../_lib/ptv-v3.js";
import { getVerifiedTrainMarkerDestination } from "../_lib/ptv-timetable.js";

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
let ptvV3Cache = { loadedAt: 0, trains: [] };
// Realtime feeds update in short bursts. Keep this cache just long enough to
// coalesce simultaneous clients, not long enough to make moving trains stale.
const LIVE_TRAIN_CACHE_MS = 4_000;
const LIVE_TRAIN_STALE_MS = 15 * 60_000;
const RATE_LIMIT_COOLDOWN_MS = 5 * 60_000;
let liveTrainCache = { loadedAt: 0, trains: [] };
let liveTrainRefreshPromise = null;
let liveTrainCooldownUntil = 0;
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
  const routeText = String(routeId || "Metro");
  const code = routeText.match(/vic-02-([A-Z0-9]+):/i)?.[1]?.toUpperCase() ?? routeText;
  const routeMap = {
    ALM: "Alamein",
    ARA: "Ararat",
    BEG: "Belgrave",
    BAT: "Ballarat",
    BEN: "Bendigo",
    BNS: "Bairnsdale",
    CBE: "Cranbourne",
    CGB: "Craigieburn",
    ECH: "Echuca",
    FKN: "Frankston",
    GEO: "Geelong",
    GWY: "Glen Waverley",
    HBE: "Hurstbridge",
    LIL: "Lilydale",
    MBR: "Maryborough",
    MDD: "Mernda",
    PKM: "Pakenham",
    SHM: "Sandringham",
    SHL: "Swan Hill",
    SHP: "Shepparton",
    SEY: "Seymour",
    STY: "Stony Point",
    SUY: "Sunbury",
    TRN: "Traralgon",
    UFD: "Upfield",
    WAR: "Warrnambool",
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
  return "NSW TrainLink XPT";
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
        tripId,
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
      const tripId = vehicle.trip?.tripId || undefined;
      const publishedTdn = tripId?.match(/-([A-Z]?\d+)$/i)?.[1];

      return {
        tdn: publishedTdn || label,
        tripId,
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

function buildPtvV3LiveTrains(data) {
  return (data?.runs ?? [])
    .map((run) => {
      const position = run.vehicle_position;
      const latitude = Number(position?.latitude);
      const longitude = Number(position?.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      if (latitude === 0 || longitude === 0) return null;

      const destination = String(run.destination_name || "Metro service");
      const descriptor = run.vehicle_descriptor || {};
      const vehicleLabel = String(descriptor.id || descriptor.description || run.run_id || "Metro train");
      const routeLabel = normalisePtvRouteId(run.route_id || "Metro");

      return {
        tdn: vehicleLabel,
        tripId: run.run_id ? String(run.run_id) : undefined,
        lat: latitude,
        lng: longitude,
        line: routeLabel === run.route_id ? "Metro" : routeLabel,
        destination,
        status: String(run.status || "on_time").toLowerCase(),
        timestamp: new Date().toISOString(),
        direction: Number(run.direction_id) === 0 ? "up" : "down",
        heading: Number.isFinite(Number(position.bearing)) ? Number(position.bearing) : undefined,
        trainType: String(descriptor.description || "Metro Train"),
        consist: normaliseConsistLabel(descriptor.id, descriptor.description),
        serviceDescription: [routeLabel, destination].filter(Boolean).join(" · "),
        source: "PTV Timetable v3",
      };
    })
    .filter(Boolean);
}

async function fetchPtvV3LiveTrains() {
  if (Date.now() - ptvV3Cache.loadedAt < 8_000) return ptvV3Cache.trains;
  const routeData = await ptvV3Fetch("/v3/routes", { route_types: 0 });
  const routes = (routeData?.routes ?? []).filter((route) => route.route_id);
  const results = await Promise.allSettled(
    routes.map(async (route) => {
      const data = await ptvV3Fetch(`/v3/runs/route/${encodeURIComponent(route.route_id)}`, {
        expand: "VehiclePosition",
      });
      return buildPtvV3LiveTrains(data).map((train) => ({
        ...train,
        line: route.route_name || train.line,
        serviceDescription: [route.route_name, train.destination].filter(Boolean).join(" · "),
      }));
    }),
  );
  const routeFailures = results.filter((result) => result.status === "rejected");
  if (routeFailures.length) {
    console.warn(
      `[live-trains] ${routeFailures.length}/${results.length} PTV v3 route requests failed:`,
      [...new Set(routeFailures.map((result) => result.reason instanceof Error ? result.reason.message : String(result.reason)))].join(" | "),
    );
  }
  const trains = results.filter((result) => result.status === "fulfilled").flatMap((result) => result.value);
  ptvV3Cache = { loadedAt: Date.now(), trains };
  return trains;
}

async function refreshLiveTrains({ ptvSubscriptionKey, ptvV3Configured, nswTransportApiKey }) {
  const feedRequests = [
    ...(ptvV3Configured && !ptvSubscriptionKey
      ? [fetchPtvV3LiveTrains()]
      : []),
    ...(ptvSubscriptionKey
      ? PTV_FEEDS.map(async (source) => {
          const response = await fetch(`${source.baseUrl}/vehicle-positions`, {
            headers: {
              KeyID: ptvSubscriptionKey,
              "Ocp-Apim-Subscription-Key": ptvSubscriptionKey,
            },
            signal: AbortSignal.timeout(20_000),
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
              signal: AbortSignal.timeout(20_000),
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
  const failures = responses.filter((result) => result.status === "rejected");
  const rateLimited = failures.some((result) => /rate-limited|:429\b/i.test(
    result.reason instanceof Error ? result.reason.message : String(result.reason),
  ));

  if (rateLimited) {
    liveTrainCooldownUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
  }

  for (const result of failures) {
    console.warn("[live-trains] feed request failed:", result.reason instanceof Error ? result.reason.message : result.reason);
  }

  const rawTrains = responses
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value);
  const trains = await Promise.all(rawTrains.map(async (train) => {
    const verifiedJourney = await getVerifiedTrainMarkerDestination(train.tripId);
    return verifiedJourney
      ? {
          ...train,
          origin: verifiedJourney.origin,
          destination: verifiedJourney.destination,
          serviceDescription: `${train.line} · ${verifiedJourney.origin} → ${verifiedJourney.destination}`,
        }
      : train;
  }));

  if (trains.length > 0) {
    liveTrainCache = { loadedAt: Date.now(), trains };
  }

  return { responses, trains };
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
  const ptvV3Configured = isPtvV3Configured();

  if (!ptvSubscriptionKey && !ptvV3Configured && !nswTransportApiKey) {
    res.status(503).json({
      error: "Live train positions need a Transport Victoria KeyID. The installed GTFS timetable remains available for scheduled departures.",
      code: "PTV_KEY_REQUIRED",
      trains: [],
    });
    return;
  }

  try {
    const bounds = readBoundsFilter(req.query ?? {});
    const cacheAge = Date.now() - liveTrainCache.loadedAt;
    if (liveTrainCache.trains.length > 0 && cacheAge < LIVE_TRAIN_CACHE_MS) {
      res.status(200).json({
        trains: liveTrainCache.trains.filter((train) => withinBounds(train, bounds)),
        cached: true,
      });
      return;
    }

    if (Date.now() < liveTrainCooldownUntil && liveTrainCache.trains.length > 0 && cacheAge < LIVE_TRAIN_STALE_MS) {
      res.status(200).json({
        trains: liveTrainCache.trains.filter((train) => withinBounds(train, bounds)),
        cached: true,
        stale: true,
        warning: "Live train feed is temporarily rate limited; showing the last verified positions.",
      });
      return;
    }

    if (!liveTrainRefreshPromise) {
      liveTrainRefreshPromise = refreshLiveTrains({ ptvSubscriptionKey, ptvV3Configured, nswTransportApiKey })
        .finally(() => {
          liveTrainRefreshPromise = null;
        });
    }

    const { responses, trains } = await liveTrainRefreshPromise;
    const fulfilled = trains.filter((train) => withinBounds(train, bounds));

    if (fulfilled.length > 0) {
      res.status(200).json({ trains: fulfilled, cached: false });
      return;
    }

    if (liveTrainCache.trains.length > 0 && Date.now() - liveTrainCache.loadedAt < LIVE_TRAIN_STALE_MS) {
      res.status(200).json({
        trains: liveTrainCache.trains.filter((train) => withinBounds(train, bounds)),
        cached: true,
        stale: true,
        warning: "Live feeds are unavailable; showing the last verified positions.",
      });
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
