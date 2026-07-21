import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_GTFS_PATH = path.join(REPO_ROOT, ".local-host", "gtfs.zip");
const METRO_REALTIME_URL =
  "https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro";
const BUS_REALTIME_URL =
  "https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/bus";
const TIME_ZONE = "Australia/Melbourne";
const realtimeCache = new Map();
let timetablePromise;

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
}

function forEachCsvRow(text, callback) {
  let headers;
  let start = 0;
  let rowIndex = 0;
  for (let index = 0; index <= text.length; index += 1) {
    if (index !== text.length && text.charCodeAt(index) !== 10) continue;
    const rawLine = text.slice(start, index).replace(/\r$/, "");
    start = index + 1;
    if (!rawLine) continue;
    const values = parseCsvLine(rawLine);
    if (rowIndex === 0) {
      headers = values.map((header) => header.replace(/^\uFEFF/, ""));
    } else {
      const row = {};
      headers.forEach((header, headerIndex) => {
        row[header] = values[headerIndex] ?? "";
      });
      callback(row);
    }
    rowIndex += 1;
  }
}

function readNestedText(outerZip, folder, filename) {
  const nestedEntry = outerZip.getEntry(`${folder}/google_transit.zip`);
  if (!nestedEntry) throw new Error(`Official GTFS folder ${folder} is missing.`);
  const nestedZip = new AdmZip(nestedEntry.getData());
  const entry = nestedZip.getEntry(filename);
  if (!entry) throw new Error(`Official GTFS file ${folder}/${filename} is missing.`);
  return entry.getData().toString("utf8");
}

function normaliseStationName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\brailway station\b|\bstation\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildModeIndex(outerZip, folder, includeStopTimes) {
  const stops = new Map();
  const stopIdsByName = new Map();
  const routes = new Map();
  const trips = new Map();
  const calendar = new Map();
  const exceptions = new Map();
  const stopTimesByStop = new Map();

  forEachCsvRow(readNestedText(outerZip, folder, "stops.txt"), (row) => {
    const stop = {
      id: row.stop_id,
      name: row.stop_name,
      code: row.stop_code || undefined,
      platform: row.platform_code || undefined,
      parentStation: row.parent_station || undefined,
      lat: Number(row.stop_lat),
      lng: Number(row.stop_lon),
    };
    stops.set(stop.id, stop);
    const key = normaliseStationName(stop.name);
    if (!stopIdsByName.has(key)) stopIdsByName.set(key, []);
    stopIdsByName.get(key).push(stop.id);
  });

  forEachCsvRow(readNestedText(outerZip, folder, "routes.txt"), (row) => {
    routes.set(row.route_id, {
      shortName: row.route_short_name,
      longName: row.route_long_name,
      type: row.route_type,
      color: row.route_color,
    });
  });

  forEachCsvRow(readNestedText(outerZip, folder, "trips.txt"), (row) => {
    trips.set(row.trip_id, {
      id: row.trip_id,
      routeId: row.route_id,
      serviceId: row.service_id,
      destination: row.trip_headsign,
      directionId: row.direction_id,
    });
  });

  forEachCsvRow(readNestedText(outerZip, folder, "calendar.txt"), (row) => {
    calendar.set(row.service_id, row);
  });

  forEachCsvRow(readNestedText(outerZip, folder, "calendar_dates.txt"), (row) => {
    const key = `${row.date}:${row.service_id}`;
    exceptions.set(key, Number(row.exception_type));
  });

  if (includeStopTimes) {
    forEachCsvRow(readNestedText(outerZip, folder, "stop_times.txt"), (row) => {
      if (!stopTimesByStop.has(row.stop_id)) stopTimesByStop.set(row.stop_id, []);
      stopTimesByStop.get(row.stop_id).push({
        tripId: row.trip_id,
        arrivalTime: row.arrival_time,
        departureTime: row.departure_time,
        stopSequence: Number(row.stop_sequence),
        stopHeadsign: row.stop_headsign || undefined,
        pickupType: row.pickup_type,
      });
    });
  }

  return { stops, stopIdsByName, routes, trips, calendar, exceptions, stopTimesByStop };
}

async function loadTimetable() {
  if (!timetablePromise) {
    timetablePromise = Promise.resolve().then(() => {
      const gtfsPath = process.env.GTFS_SCHEDULE_PATH || DEFAULT_GTFS_PATH;
      if (!fs.existsSync(gtfsPath)) {
        throw new Error("Official GTFS schedule archive is not installed on this host.");
      }
      const stats = fs.statSync(gtfsPath);
      const outerZip = new AdmZip(gtfsPath);
      return {
        train: buildModeIndex(outerZip, "2", true),
        bus: buildModeIndex(outerZip, "4", false),
        scheduleUpdatedAt: stats.mtime.toISOString(),
      };
    }).catch((error) => {
      timetablePromise = undefined;
      throw error;
    });
  }
  return timetablePromise;
}

function getMelbourneDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function getServiceDate(date = new Date()) {
  const parts = getMelbourneDateParts(date);
  return `${parts.year}${parts.month}${parts.day}`;
}

function getPreviousServiceDate() {
  return getServiceDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
}

function getOffsetMinutes(year, month, day) {
  const zoneName = new Intl.DateTimeFormat("en-AU", {
    timeZone: TIME_ZONE,
    timeZoneName: "longOffset",
  })
    .formatToParts(new Date(Date.UTC(year, month - 1, day, 12)))
    .find((part) => part.type === "timeZoneName")?.value;
  const match = zoneName?.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 600;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === "-" ? -minutes : minutes;
}

function gtfsTimeToDate(serviceDate, gtfsTime) {
  const year = Number(serviceDate.slice(0, 4));
  const month = Number(serviceDate.slice(4, 6));
  const day = Number(serviceDate.slice(6, 8));
  const [hours, minutes, seconds] = gtfsTime.split(":").map(Number);
  const offsetMinutes = getOffsetMinutes(year, month, day);
  return new Date(
    Date.UTC(year, month - 1, day, hours, minutes, seconds || 0) - offsetMinutes * 60_000,
  );
}

function isServiceActive(mode, serviceId, serviceDate) {
  const exception = mode.exceptions.get(`${serviceDate}:${serviceId}`);
  if (exception === 1) return true;
  if (exception === 2) return false;
  const entry = mode.calendar.get(serviceId);
  if (!entry || serviceDate < entry.start_date || serviceDate > entry.end_date) return false;
  const date = new Date(
    Date.UTC(Number(serviceDate.slice(0, 4)), Number(serviceDate.slice(4, 6)) - 1, Number(serviceDate.slice(6, 8))),
  );
  const weekday = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][date.getUTCDay()];
  return entry[weekday] === "1";
}

function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (value && typeof value.toNumber === "function") return value.toNumber();
  return 0;
}

async function fetchRealtimeFeed(baseUrl, pathName) {
  const key =
    process.env.PTV_SUBSCRIPTION_KEY ||
    process.env.PTV_subscription_key ||
    process.env.OCP_APIM_SUBSCRIPTION_KEY ||
    process.env.PTV_API_KEY;
  if (!key) throw new Error("PTV subscription key is not configured.");
  const cacheKey = `${baseUrl}${pathName}`;
  const cached = realtimeCache.get(cacheKey);
  if (cached && Date.now() - cached.loadedAt < 25_000) return cached.feed;
  const response = await fetch(cacheKey, {
    headers: { KeyID: key, "Ocp-Apim-Subscription-Key": key },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Official PTV realtime feed failed (${response.status}).`);
  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
    new Uint8Array(await response.arrayBuffer()),
  );
  realtimeCache.set(cacheKey, { loadedAt: Date.now(), feed });
  return feed;
}

function buildRealtimeTripMap(feed) {
  return new Map(
    (feed.entity || [])
      .filter((entity) => entity.tripUpdate?.trip?.tripId)
      .map((entity) => [entity.tripUpdate.trip.tripId, entity.tripUpdate]),
  );
}

export async function getVerifiedStationDepartures(stationName) {
  const timetable = await loadTimetable();
  const stationKey = normaliseStationName(stationName);
  const stopIds = timetable.train.stopIdsByName.get(stationKey) || [];
  if (stopIds.length === 0) {
    return { stationName, departures: [], error: "Station not found in the official GTFS schedule." };
  }

  const realtimeFeed = await fetchRealtimeFeed(METRO_REALTIME_URL, "/trip-updates");
  const realtimeTrips = buildRealtimeTripMap(realtimeFeed);
  const now = Date.now();
  const windowEnd = now + 3 * 60 * 60 * 1000;
  const departures = [];
  const seenTrips = new Set();

  for (const serviceDate of [getPreviousServiceDate(), getServiceDate()]) {
    for (const stopId of stopIds) {
      const stop = timetable.train.stops.get(stopId);
      for (const stopTime of timetable.train.stopTimesByStop.get(stopId) || []) {
        const trip = timetable.train.trips.get(stopTime.tripId);
        if (!trip || seenTrips.has(trip.id) || !isServiceActive(timetable.train, trip.serviceId, serviceDate)) continue;
        const scheduledDate = gtfsTimeToDate(serviceDate, stopTime.departureTime || stopTime.arrivalTime);
        const realtimeTrip = realtimeTrips.get(trip.id);
        const realtimeStop = realtimeTrip?.stopTimeUpdate?.find(
          (update) => update.stopId === stopId || toNumber(update.stopSequence) === stopTime.stopSequence,
        );
        const realtimeSeconds = toNumber(realtimeStop?.departure?.time || realtimeStop?.arrival?.time);
        const expectedDate = realtimeSeconds ? new Date(realtimeSeconds * 1000) : scheduledDate;
        if (expectedDate.getTime() < now - 60_000 || expectedDate.getTime() > windowEnd) continue;
        seenTrips.add(trip.id);
        const route = timetable.train.routes.get(trip.routeId);
        const tripRelationship = toNumber(realtimeTrip?.trip?.scheduleRelationship);
        const stopRelationship = toNumber(realtimeStop?.scheduleRelationship);
        departures.push({
          tripId: trip.id,
          route: route?.shortName || route?.longName || "Metro",
          destination: stopTime.stopHeadsign || trip.destination || "Destination unavailable",
          platform: stop?.platform,
          scheduledAt: scheduledDate.toISOString(),
          expectedAt: expectedDate.toISOString(),
          status: tripRelationship === 3 ? "cancelled" : stopRelationship === 1 ? "skipped" : realtimeSeconds ? "live" : "scheduled",
          delaySeconds: realtimeSeconds ? Math.round((expectedDate.getTime() - scheduledDate.getTime()) / 1000) : undefined,
          serviceDate,
        });
      }
    }
  }

  departures.sort((left, right) => Date.parse(left.expectedAt) - Date.parse(right.expectedAt));
  return {
    stationName,
    departures: departures.slice(0, 12),
    generatedAt: new Date().toISOString(),
    realtimeFeedAt: toNumber(realtimeFeed.header?.timestamp)
      ? new Date(toNumber(realtimeFeed.header.timestamp) * 1000).toISOString()
      : undefined,
    scheduleUpdatedAt: timetable.scheduleUpdatedAt,
    source: "Transport Victoria GTFS Schedule + GTFS-Realtime",
  };
}

export async function getVerifiedBusTrip(tripId) {
  if (!tripId || tripId.length > 160) throw new Error("A valid PTV trip ID is required.");
  const timetable = await loadTimetable();
  const feed = await fetchRealtimeFeed(BUS_REALTIME_URL, "/trip-updates");
  const update = buildRealtimeTripMap(feed).get(tripId);
  const trip = timetable.bus.trips.get(tripId);
  const route = trip ? timetable.bus.routes.get(trip.routeId) : undefined;
  if (!update) {
    return {
      tripId,
      route: route?.shortName,
      destination: trip?.destination,
      stops: [],
      generatedAt: new Date().toISOString(),
      source: "Transport Victoria GTFS-Realtime",
    };
  }

  const now = Date.now();
  const stops = (update.stopTimeUpdate || [])
    .map((stopUpdate) => {
      const stop = timetable.bus.stops.get(stopUpdate.stopId);
      const eventSeconds = toNumber(stopUpdate.departure?.time || stopUpdate.arrival?.time);
      return {
        stopId: stopUpdate.stopId,
        stopSequence: toNumber(stopUpdate.stopSequence),
        name: stop?.name || `PTV stop ${stopUpdate.stopId}`,
        stopCode: stop?.code,
        lat: Number.isFinite(stop?.lat) ? stop.lat : undefined,
        lng: Number.isFinite(stop?.lng) ? stop.lng : undefined,
        expectedAt: eventSeconds ? new Date(eventSeconds * 1000).toISOString() : undefined,
        status: toNumber(stopUpdate.scheduleRelationship) === 1 ? "skipped" : eventSeconds * 1000 < now ? "passed" : "upcoming",
      };
    })
    .filter((stop) => stop.status !== "passed" || (stop.expectedAt && now - Date.parse(stop.expectedAt) < 10 * 60_000));

  return {
    tripId,
    route: route?.shortName || update.trip?.routeId,
    destination: trip?.destination,
    scheduleRelationship: toNumber(update.trip?.scheduleRelationship),
    stops: stops.slice(0, 16),
    generatedAt: new Date().toISOString(),
    realtimeFeedAt: toNumber(feed.header?.timestamp)
      ? new Date(toNumber(feed.header.timestamp) * 1000).toISOString()
      : undefined,
    scheduleUpdatedAt: timetable.scheduleUpdatedAt,
    source: "Transport Victoria GTFS Schedule + GTFS-Realtime",
  };
}
