import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { isPtvV3Configured, ptvV3Fetch } from "./ptv-v3.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_GTFS_PATH = path.join(REPO_ROOT, ".local-host", "gtfs.zip");
const BUS_STOP_TIMES_PATH = path.join(REPO_ROOT, ".local-host", "gtfs-bus", "stop_times.txt");
const BUS_STOP_INDEX_PATH = path.join(REPO_ROOT, ".local-host", "gtfs-bus", "stop-times-index.json");
const METRO_REALTIME_URL =
  "https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro";
const BUS_REALTIME_URL =
  "https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/bus";
const TRAM_REALTIME_URL =
  "https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/tram";
const TIME_ZONE = "Australia/Melbourne";
const realtimeCache = new Map();
let timetablePromise;
let busStopIndex;
let trainMarkerDestinationsPromise;

function readIndexedBusStopTimes(tripId) {
  if (!fs.existsSync(BUS_STOP_TIMES_PATH) || !fs.existsSync(BUS_STOP_INDEX_PATH)) return [];
  busStopIndex ||= JSON.parse(fs.readFileSync(BUS_STOP_INDEX_PATH, "utf8"));
  const range = busStopIndex[tripId];
  if (!range) return [];
  const [start, end] = range;
  const buffer = Buffer.allocUnsafe(end - start);
  const descriptor = fs.openSync(BUS_STOP_TIMES_PATH, "r");
  try {
    fs.readSync(descriptor, buffer, 0, buffer.length, start);
  } finally {
    fs.closeSync(descriptor);
  }
  const rows = [];
  forEachCsvRow(`trip_id,arrival_time,departure_time,stop_id,stop_sequence,stop_headsign,pickup_type,drop_off_type,shape_dist_traveled\n${buffer.toString("utf8")}`, (row) => {
    rows.push({
      tripId: row.trip_id,
      stopId: row.stop_id,
      arrivalTime: row.arrival_time,
      departureTime: row.departure_time,
      stopSequence: Number(row.stop_sequence),
      stopHeadsign: row.stop_headsign || undefined,
      pickupType: row.pickup_type,
    });
  });
  return rows.sort((left, right) => left.stopSequence - right.stopSequence);
}

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
  const stopTimesByTrip = new Map();

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
      blockId: row.block_id || undefined,
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
      const stopTime = {
        tripId: row.trip_id,
        stopId: row.stop_id,
        arrivalTime: row.arrival_time,
        departureTime: row.departure_time,
        stopSequence: Number(row.stop_sequence),
        stopHeadsign: row.stop_headsign || undefined,
        pickupType: row.pickup_type,
      };
      stopTimesByStop.get(row.stop_id).push(stopTime);
      if (!stopTimesByTrip.has(row.trip_id)) stopTimesByTrip.set(row.trip_id, []);
      stopTimesByTrip.get(row.trip_id).push(stopTime);
    });
  }

  return { stops, stopIdsByName, routes, trips, calendar, exceptions, stopTimesByStop, stopTimesByTrip };
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
        tram: buildModeIndex(outerZip, "3", true),
        // Bus stop_times.txt is too large to materialise as one JS string.
        // Bus trip stops are supplied by the official realtime trip-update feed.
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

  let realtimeFeed = null;
  try {
    realtimeFeed = await fetchRealtimeFeed(METRO_REALTIME_URL, "/trip-updates");
  } catch {
    // Static GTFS departures remain useful when a realtime KeyID has not been configured.
  }
  const realtimeTrips = realtimeFeed ? buildRealtimeTripMap(realtimeFeed) : new Map();
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
    realtimeFeedAt: toNumber(realtimeFeed?.header?.timestamp)
      ? new Date(toNumber(realtimeFeed.header.timestamp) * 1000).toISOString()
      : undefined,
    scheduleUpdatedAt: timetable.scheduleUpdatedAt,
    source: realtimeFeed
      ? "Transport Victoria GTFS Schedule + GTFS-Realtime"
      : "Transport Victoria GTFS Schedule",
  };
}

export async function getVerifiedTrainTrip(tripId) {
  if (!tripId || tripId.length > 200) throw new Error("A valid train trip ID is required.");
  const timetable = await loadTimetable();
  const trip = timetable.train.trips.get(tripId);

  let realtimeFeed = null;
  try {
    realtimeFeed = await fetchRealtimeFeed(METRO_REALTIME_URL, "/trip-updates");
  } catch {
    // The static dated schedule still provides verified times and platforms.
  }
  const realtimeTrip = realtimeFeed ? buildRealtimeTripMap(realtimeFeed).get(tripId) : undefined;
  const serviceDate = realtimeTrip?.trip?.startDate || getServiceDate();
  const route = trip ? timetable.train.routes.get(trip.routeId) : undefined;
  const now = Date.now();

  const realtimeTrips = realtimeFeed ? buildRealtimeTripMap(realtimeFeed) : new Map();
  const buildStops = (targetTripId) => {
    const targetRealtimeTrip = realtimeTrips.get(targetTripId);
    return (timetable.train.stopTimesByTrip.get(targetTripId) || [])
    .sort((left, right) => left.stopSequence - right.stopSequence)
    .map((stopTime) => {
      const stop = timetable.train.stops.get(stopTime.stopId);
      const realtimeStop = targetRealtimeTrip?.stopTimeUpdate?.find(
        (update) => update.stopId === stopTime.stopId || toNumber(update.stopSequence) === stopTime.stopSequence,
      );
      const scheduledArrival = gtfsTimeToDate(serviceDate, stopTime.arrivalTime || stopTime.departureTime);
      const scheduledDeparture = gtfsTimeToDate(serviceDate, stopTime.departureTime || stopTime.arrivalTime);
      const realtimeArrivalSeconds = toNumber(realtimeStop?.arrival?.time);
      const realtimeDepartureSeconds = toNumber(realtimeStop?.departure?.time);
      const expectedArrival = realtimeArrivalSeconds ? new Date(realtimeArrivalSeconds * 1000) : scheduledArrival;
      const expectedDeparture = realtimeDepartureSeconds ? new Date(realtimeDepartureSeconds * 1000) : scheduledDeparture;
      const delaySeconds = Math.round((expectedDeparture.getTime() - scheduledDeparture.getTime()) / 1000);
      const dwellSeconds = Math.max(0, Math.round((expectedDeparture.getTime() - expectedArrival.getTime()) / 1000));
      const relationship = toNumber(realtimeStop?.scheduleRelationship);

      return {
        stopId: stopTime.stopId,
        stopSequence: stopTime.stopSequence,
        name: stop?.name || `PTV stop ${stopTime.stopId}`,
        platform: stop?.platform,
        lat: Number.isFinite(stop?.lat) ? stop.lat : undefined,
        lng: Number.isFinite(stop?.lng) ? stop.lng : undefined,
        scheduledArrivalAt: scheduledArrival.toISOString(),
        scheduledDepartureAt: scheduledDeparture.toISOString(),
        expectedArrivalAt: expectedArrival.toISOString(),
        expectedDepartureAt: expectedDeparture.toISOString(),
        delaySeconds,
        dwellSeconds,
        status: relationship === 1 ? "skipped" : expectedDeparture.getTime() < now ? "passed" : "upcoming",
      };
    });
  };

  const ownStopTimes = (timetable.train.stopTimesByTrip.get(tripId) || []).sort(
    (left, right) => left.stopSequence - right.stopSequence,
  );
  const firstOwnStop = ownStopTimes[0];
  const lastOwnStop = ownStopTimes.at(-1);
  const isTownHallStop = (stopTime) =>
    normaliseStationName(timetable.train.stops.get(stopTime?.stopId)?.name) === "town hall";
  const sameHandoverTime = (left, right) =>
    (left?.departureTime || left?.arrivalTime) === (right?.arrivalTime || right?.departureTime);
  const normaliseDestination = (value) =>
    String(value || "").toLowerCase().replace(/\s+via\s+metro tunnel.*$/i, "").trim();

  let precedingTripId;
  let continuationTripId;
  let previousFormationTripId;
  let nextFormationTripId;
  let bestPreviousGap = Number.POSITIVE_INFINITY;
  let bestNextGap = Number.POSITIVE_INFINITY;
  const gtfsSeconds = (value) => {
    const [hours, minutes, seconds] = String(value || "").split(":").map(Number);
    return Number.isFinite(hours) && Number.isFinite(minutes) && Number.isFinite(seconds)
      ? hours * 3600 + minutes * 60 + seconds
      : Number.NaN;
  };
  if (trip && firstOwnStop && lastOwnStop) {
    for (const [candidateTripId, unsortedCandidateStops] of timetable.train.stopTimesByTrip) {
      if (candidateTripId === tripId) continue;
      const candidateTrip = timetable.train.trips.get(candidateTripId);
      if (!candidateTrip || candidateTrip.serviceId !== trip.serviceId) continue;
      const candidateStops = [...unsortedCandidateStops].sort((left, right) => left.stopSequence - right.stopSequence);
      const candidateFirst = candidateStops[0];
      const candidateLast = candidateStops.at(-1);

      if (trip.blockId && candidateTrip.blockId === trip.blockId) {
        if (candidateLast?.stopId === firstOwnStop.stopId) {
          const gap = gtfsSeconds(firstOwnStop.departureTime || firstOwnStop.arrivalTime) - gtfsSeconds(candidateLast.arrivalTime || candidateLast.departureTime);
          if (gap >= 0 && gap <= 3600 && gap < bestPreviousGap) {
            previousFormationTripId = candidateTripId;
            bestPreviousGap = gap;
          }
        }
        if (candidateFirst?.stopId === lastOwnStop.stopId) {
          const gap = gtfsSeconds(candidateFirst.departureTime || candidateFirst.arrivalTime) - gtfsSeconds(lastOwnStop.arrivalTime || lastOwnStop.departureTime);
          if (gap >= 0 && gap <= 3600 && gap < bestNextGap) {
            nextFormationTripId = candidateTripId;
            bestNextGap = gap;
          }
        }
      }

      if (
        isTownHallStop(lastOwnStop) &&
        candidateFirst?.stopId === lastOwnStop.stopId &&
        sameHandoverTime(lastOwnStop, candidateFirst) &&
        normaliseDestination(candidateTrip.destination) === normaliseDestination(trip.destination)
      ) {
        continuationTripId = candidateTripId;
      }

      if (
        isTownHallStop(firstOwnStop) &&
        candidateLast?.stopId === firstOwnStop.stopId &&
        sameHandoverTime(candidateLast, firstOwnStop) &&
        normaliseDestination(candidateTrip.destination) === normaliseDestination(trip.destination)
      ) {
        precedingTripId = candidateTripId;
      }
    }
  }

  const segmentTripIds = [precedingTripId, tripId, continuationTripId].filter(Boolean);
  const buildSegment = (segmentTripId) => {
    const segmentTrip = timetable.train.trips.get(segmentTripId);
    const segmentRoute = segmentTrip ? timetable.train.routes.get(segmentTrip.routeId) : undefined;
    const segmentStops = buildStops(segmentTripId);
    return {
      tripId: segmentTripId,
      tdn: segmentTripId.match(/-([A-Z]?\d+)$/i)?.[1] || segmentTripId,
      route: segmentRoute?.shortName || segmentRoute?.longName,
      direction: segmentTrip?.directionId === "1" ? "UP" : "DOWN",
      origin: segmentStops[0]?.name,
      destination: segmentStops.at(-1)?.name,
      departsAt: segmentStops[0]?.expectedDepartureAt,
      arrivesAt: segmentStops.at(-1)?.expectedArrivalAt,
      stops: segmentStops,
    };
  };
  const segments = segmentTripIds.map(buildSegment);
  const formationTripIds = Array.from(new Set([previousFormationTripId, ...segmentTripIds, nextFormationTripId].filter(Boolean)));
  const formationSegments = formationTripIds.map(buildSegment);
  // The public TDN may change while the physical train continues. Build the
  // visible timeline from the full linked formation so "show prior stops"
  // includes stations served before that TDN boundary. Deduplicate any shared
  // handover station generically (Town Hall, Flinders Street, or elsewhere).
  const stops = formationSegments.flatMap((segment, segmentIndex, allSegments) => {
    const segmentStops = segment.stops;
    if (segmentIndex === 0 || segmentStops.length === 0) return segmentStops;
    const previousLastStop = allSegments[segmentIndex - 1]?.stops.at(-1)?.name;
    const currentFirstStop = segmentStops[0]?.name;
    return previousLastStop && currentFirstStop
      && normaliseStationName(previousLastStop) === normaliseStationName(currentFirstStop)
      ? segmentStops.slice(1)
      : segmentStops;
  }).map((stop, index) => ({ ...stop, stopSequence: index + 1 }));
  const finalTrip = timetable.train.trips.get(continuationTripId || tripId);

  return {
    tripId,
    route: route?.shortName || route?.longName,
    destination: finalTrip?.destination || trip?.destination,
    segmentTripIds,
    segments: segments.map(({ stops: _stops, ...segment }) => segment),
    formationSegments: formationSegments.map(({ stops: _stops, ...segment }) => segment),
    handover: segmentTripIds.length > 1
      ? {
          station: "Town Hall",
          fromTripId: precedingTripId || tripId,
          toTripId: continuationTripId || tripId,
        }
      : undefined,
    serviceDate,
    stops,
    generatedAt: new Date().toISOString(),
    realtimeFeedAt: toNumber(realtimeFeed?.header?.timestamp)
      ? new Date(toNumber(realtimeFeed.header.timestamp) * 1000).toISOString()
      : undefined,
    scheduleUpdatedAt: timetable.scheduleUpdatedAt,
    source: realtimeTrip
      ? "Transport Victoria GTFS Schedule + GTFS-Realtime"
      : "Transport Victoria GTFS Schedule",
  };
}

export async function getVerifiedTrainMarkerDestination(tripId) {
  if (!tripId) return undefined;
  if (!trainMarkerDestinationsPromise) {
    trainMarkerDestinationsPromise = loadTimetable().then((timetable) => {
      const destinations = new Map();
      const groups = new Map();
      const seconds = (value) => {
        const [hours, minutes, secs] = String(value || "").split(":").map(Number);
        return Number.isFinite(hours) && Number.isFinite(minutes) && Number.isFinite(secs)
          ? hours * 3600 + minutes * 60 + secs
          : Number.NaN;
      };
      const tripRows = (id) => [...(timetable.train.stopTimesByTrip.get(id) || [])]
        .sort((left, right) => left.stopSequence - right.stopSequence);

      for (const [id, trip] of timetable.train.trips) {
        const rows = tripRows(id);
        if (!rows.length) continue;
        const first = rows[0];
        const last = rows.at(-1);
        const originStop = timetable.train.stops.get(first.stopId)?.name;
        const finalStop = timetable.train.stops.get(last.stopId)?.name;
        destinations.set(id, {
          origin: (originStop || "").replace(/\s+Station$/i, ""),
          destination: (trip.destination || finalStop || "").replace(/\s+Station$/i, ""),
        });
        if (!trip.blockId) continue;
        const key = trip.blockId;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ id, trip, rows, first, last });
      }

      for (const group of groups.values()) {
        group.sort((left, right) => seconds(left.first.departureTime || left.first.arrivalTime) - seconds(right.first.departureTime || right.first.arrivalTime));
        for (const current of group) {
          const currentStart = seconds(current.first.departureTime || current.first.arrivalTime);
          const previous = group.find((candidate) => {
            if (candidate.id === current.id || candidate.last.stopId !== current.first.stopId) return false;
            const gap = currentStart - seconds(candidate.last.arrivalTime || candidate.last.departureTime);
            return gap >= 0 && gap <= 3600;
          });
          if (previous) {
            const previousOrigin = timetable.train.stops.get(previous.first.stopId)?.name;
            const currentJourney = destinations.get(current.id);
            if (previousOrigin && currentJourney) {
              destinations.set(current.id, {
                ...currentJourney,
                origin: previousOrigin.replace(/\s+Station$/i, ""),
              });
            }
          }
          const currentEnd = seconds(current.last.arrivalTime || current.last.departureTime);
          const next = group.find((candidate) => {
            if (candidate.id === current.id || candidate.first.stopId !== current.last.stopId) return false;
            const gap = seconds(candidate.first.departureTime || candidate.first.arrivalTime) - currentEnd;
            return gap >= 0 && gap <= 3600;
          });
          if (!next) continue;
          const finalStop = timetable.train.stops.get(next.last.stopId)?.name;
          const finalDestination = (next.trip.destination || finalStop || "")
            .replace(/\s+Station$/i, "")
            .replace(/\s+via\s+.+$/i, "");
          const interchange = (timetable.train.stops.get(current.last.stopId)?.name || "").replace(/\s+Station$/i, "");
          const usesCityLoop = current.rows.some((row) => /^(parliament|melbourne central|flagstaff)$/i.test(
            (timetable.train.stops.get(row.stopId)?.name || "").replace(/\s+Station$/i, ""),
          ));
          if (finalDestination) {
            const currentDestination = `${interchange}${usesCityLoop ? " via City Loop" : ""}`;
            destinations.set(current.id, {
              origin: (timetable.train.stops.get(current.first.stopId)?.name || "").replace(/\s+Station$/i, ""),
              destination: `${currentDestination} → ${finalDestination}`,
            });
          }
        }
      }
      return destinations;
    });
  }
  return (await trainMarkerDestinationsPromise).get(tripId);
}

function squaredDistance(left, right) {
  return (left.lat - right.lat) ** 2 + (left.lng - right.lng) ** 2;
}

// Map stop markers do not carry a PTV ID. Resolve them against the official
// GTFS stop coordinates before asking the Timetable API for departures.
function findNearestOfficialStop(mode, { route, lat, lng }) {
  const requestedRoute = String(route || "").trim().toLowerCase();
  const target = { lat: Number(lat), lng: Number(lng) };
  if (!Number.isFinite(target.lat) || !Number.isFinite(target.lng)) return null;

  let nearest = null;
  for (const stop of mode.stops.values()) {
    if (!Number.isFinite(stop.lat) || !Number.isFinite(stop.lng)) continue;
    const distance = squaredDistance(stop, target);
    if (!nearest || distance < nearest.distance) nearest = { stop, distance };
  }
  if (!nearest || nearest.distance > 0.0036) return null; // ~6 km, guards invalid map points

  // A nearby GTFS stop can serve several routes. The v3 response is filtered
  // below; this fast route check avoids returning an unrelated stop when there
  // are parallel corridors.
  if (!requestedRoute) return nearest.stop;
  return nearest.stop;
}

export async function getVerifiedSurfaceStopDepartures({ mode: modeName, route, lat, lng }) {
  const modeKey = String(modeName || "").toLowerCase() === "tram" ? "tram" : "bus";
  const routeType = modeKey === "tram" ? 1 : 2;
  if (!isPtvV3Configured()) {
    throw new Error("PTV timetable credentials are not configured.");
  }
  const timetable = await loadTimetable();
  const stop = findNearestOfficialStop(timetable[modeKey], { route, lat, lng });
  if (!stop) throw new Error("This map stop could not be matched to an official PTV stop.");

  // Static GTFS stop_ids are not the numeric stop_ids accepted by PTV v3.
  // Resolve the same physical platform through the location endpoint, keeping
  // the GTFS id in our response while using the v3 id only for the API call.
  const requestedRoute = String(route || "").trim().toLowerCase();
  const nearby = await ptvV3Fetch(`/v3/stops/location/${Number(lat)},${Number(lng)}`, {
    route_types: routeType,
    max_results: 20,
    max_distance: 500,
  });
  const nearbyStops = Array.isArray(nearby.stops) ? nearby.stops : [];
  const ptvStop = nearbyStops
    .filter((candidate) => !requestedRoute || (candidate.routes || []).some((candidateRoute) =>
      String(candidateRoute.route_number || candidateRoute.route_name || "").trim().toLowerCase() === requestedRoute,
    ))
    .sort((left, right) => Number(left.stop_distance || 0) - Number(right.stop_distance || 0))[0];
  if (!ptvStop?.stop_id) throw new Error("This GTFS stop could not be matched to a PTV timetable stop for the selected route.");

  const data = await ptvV3Fetch(`/v3/departures/route_type/${routeType}/stop/${encodeURIComponent(ptvStop.stop_id)}`, {
    max_results: 30,
    include_cancelled: true,
    expand: "route,direction,run",
  });
  const collectionValues = (value) => Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value) : [];
  const routeItems = [...collectionValues(data.routes), ...(ptvStop.routes || [])];
  const routes = new Map(routeItems.map((item) => [String(item.route_id), item]));
  const requestedRouteInfo = routeItems.find((item) =>
    String(item.route_number || item.route_name || "").trim().toLowerCase() === requestedRoute,
  );
  let directionItems = collectionValues(data.directions);
  if (directionItems.length === 0 && requestedRouteInfo?.route_id) {
    const directionData = await ptvV3Fetch(`/v3/directions/route/${encodeURIComponent(requestedRouteInfo.route_id)}`);
    directionItems = collectionValues(directionData.directions);
  }
  const directions = new Map(directionItems.map((item) => [String(item.direction_id), item]));
  const departures = (data.departures || [])
    .map((departure) => {
      const routeInfo = routes.get(String(departure.route_id));
      const routeLabel = String(routeInfo?.route_number || routeInfo?.route_name || departure.route_id || "");
      const direction = directions.get(String(departure.direction_id));
      return {
        route: routeLabel,
        destination: direction?.direction_name || routeInfo?.route_name || "Destination unavailable",
        // PTV occasionally publishes a live estimate without its scheduled
        // timestamp. Keep the client contract valid and treat the estimate as
        // the baseline in that case, rather than serialising a missing date.
        scheduledAt: departure.scheduled_timetable_utc || departure.estimated_departure_utc,
        expectedAt: departure.estimated_departure_utc || departure.scheduled_timetable_utc,
        status: departure.cancelled ? "cancelled" : departure.estimated_departure_utc ? "live" : "scheduled",
        platform: departure.platform_number || undefined,
        runId: departure.run_id || undefined,
      };
    })
    .filter((departure) => !requestedRoute || departure.route.toLowerCase() === requestedRoute)
    .filter((departure) => departure.expectedAt)
    .sort((left, right) => Date.parse(left.expectedAt) - Date.parse(right.expectedAt))
    .slice(0, 12);

  return {
    stopId: stop.id,
    stopName: String(ptvStop.stop_name || stop.name).trim(),
    route: String(route || ""),
    departures,
    generatedAt: new Date().toISOString(),
    source: "Public Transport Victoria Timetable API",
  };
}

// Tram vehicle positions carry a GTFS trip ID, so use the same official
// schedule and trip-update sources as buses. This deliberately returns every
// stop in the run; the client decides which earlier stops to collapse.
export async function getVerifiedTramTrip(tripId) {
  if (!tripId || tripId.length > 200) throw new Error("A valid tram trip ID is required.");
  const timetable = await loadTimetable();
  let feed = null;
  try {
    feed = await fetchRealtimeFeed(TRAM_REALTIME_URL, "/trip-updates");
  } catch {
    // The official static schedule still supplies the complete stop pattern.
  }

  const trip = timetable.tram.trips.get(tripId);
  const route = trip ? timetable.tram.routes.get(trip.routeId) : undefined;
  const update = feed ? buildRealtimeTripMap(feed).get(tripId) : undefined;
  const serviceDate = update?.trip?.startDate || getServiceDate();
  const now = Date.now();
  const realtimeBySequence = new Map(
    (update?.stopTimeUpdate || []).map((stopUpdate) => [toNumber(stopUpdate.stopSequence), stopUpdate]),
  );
  const scheduledStopTimes = (timetable.tram.stopTimesByTrip.get(tripId) || [])
    .sort((left, right) => left.stopSequence - right.stopSequence);
  if (!trip && scheduledStopTimes.length === 0) {
    throw new Error("This live tram has not published a matching scheduled trip.");
  }

  const stops = scheduledStopTimes.map((stopTime) => {
    const stopUpdate = realtimeBySequence.get(stopTime.stopSequence) ||
      update?.stopTimeUpdate?.find((candidate) => candidate.stopId === stopTime.stopId);
    const stop = timetable.tram.stops.get(stopTime.stopId);
    const eventSeconds = toNumber(stopUpdate?.departure?.time || stopUpdate?.arrival?.time);
    const scheduledDate = gtfsTimeToDate(serviceDate, stopTime.departureTime || stopTime.arrivalTime);
    const expectedDate = eventSeconds ? new Date(eventSeconds * 1000) : scheduledDate;
    return {
      stopId: stopTime.stopId,
      stopSequence: stopTime.stopSequence,
      name: stop?.name || `PTV stop ${stopTime.stopId}`,
      stopCode: stop?.code,
      lat: Number.isFinite(stop?.lat) ? stop.lat : undefined,
      lng: Number.isFinite(stop?.lng) ? stop.lng : undefined,
      expectedAt: expectedDate.toISOString(),
      status: toNumber(stopUpdate?.scheduleRelationship) === 1
        ? "skipped"
        : expectedDate.getTime() < now
          ? "passed"
          : "upcoming",
    };
  });

  return {
    tripId,
    route: route?.shortName || route?.longName || update?.trip?.routeId,
    destination: trip?.destination,
    stops,
    generatedAt: new Date().toISOString(),
    realtimeFeedAt: toNumber(feed?.header?.timestamp)
      ? new Date(toNumber(feed.header.timestamp) * 1000).toISOString()
      : undefined,
    scheduleUpdatedAt: timetable.scheduleUpdatedAt,
    source: update
      ? "Transport Victoria GTFS Schedule + GTFS-Realtime"
      : "Transport Victoria GTFS Schedule",
  };
}

export async function getVerifiedBusTrip(tripId) {
  if (!tripId || tripId.length > 160) throw new Error("A valid PTV trip ID is required.");
  const timetable = await loadTimetable();
  let feed = null;
  try {
    feed = await fetchRealtimeFeed(BUS_REALTIME_URL, "/trip-updates");
  } catch {
    // A dated GTFS schedule remains useful and verified when realtime is late.
  }
  const update = feed ? buildRealtimeTripMap(feed).get(tripId) : undefined;
  const trip = timetable.bus.trips.get(tripId);
  const route = trip ? timetable.bus.routes.get(trip.routeId) : undefined;
  const now = Date.now();
  const serviceDate = update?.trip?.startDate || getServiceDate();
  const realtimeBySequence = new Map(
    (update?.stopTimeUpdate || []).map((stopUpdate) => [toNumber(stopUpdate.stopSequence), stopUpdate]),
  );
  const scheduledStopTimes = (timetable.bus.stopTimesByTrip.get(tripId) || readIndexedBusStopTimes(tripId))
    .sort((left, right) => left.stopSequence - right.stopSequence);
  const stopRows = scheduledStopTimes.length
    ? scheduledStopTimes
    : (update?.stopTimeUpdate || []).map((stopUpdate) => ({
        stopId: stopUpdate.stopId,
        stopSequence: toNumber(stopUpdate.stopSequence),
        arrivalTime: "",
        departureTime: "",
      }));

  const stops = stopRows
    .map((stopTime) => {
      const stopUpdate = realtimeBySequence.get(stopTime.stopSequence) ||
        update?.stopTimeUpdate?.find((candidate) => candidate.stopId === stopTime.stopId);
      const stop = timetable.bus.stops.get(stopTime.stopId);
      const eventSeconds = toNumber(stopUpdate?.departure?.time || stopUpdate?.arrival?.time);
      const scheduledDate = stopTime.departureTime || stopTime.arrivalTime
        ? gtfsTimeToDate(serviceDate, stopTime.departureTime || stopTime.arrivalTime)
        : null;
      const expectedDate = eventSeconds ? new Date(eventSeconds * 1000) : scheduledDate;
      return {
        stopId: stopTime.stopId,
        stopSequence: stopTime.stopSequence,
        name: stop?.name || `PTV stop ${stopTime.stopId}`,
        stopCode: stop?.code,
        lat: Number.isFinite(stop?.lat) ? stop.lat : undefined,
        lng: Number.isFinite(stop?.lng) ? stop.lng : undefined,
        expectedAt: expectedDate?.toISOString(),
        status: toNumber(stopUpdate?.scheduleRelationship) === 1
          ? "skipped"
          : expectedDate && expectedDate.getTime() < now
            ? "passed"
            : "upcoming",
      };
    })
    // Keep the full published pattern. The client hides older stops by default
    // but can reveal them; dropping them here made completed/stale-feed trips
    // appear to have no data at all.
    .filter(Boolean);

  const currentTrip = timetable.bus.trips.get(tripId);
  const tripUpdates = feed ? buildRealtimeTripMap(feed) : new Map();
  const eventTime = (event) => {
    const seconds = toNumber(event?.departure?.time || event?.arrival?.time);
    return seconds ? seconds * 1000 : Number.NaN;
  };
  const updateBounds = (tripUpdate) => {
    const rows = [...(tripUpdate?.stopTimeUpdate || [])]
      .filter((row) => row.stopId)
      .sort((left, right) => toNumber(left.stopSequence) - toNumber(right.stopSequence));
    return { first: rows[0], last: rows.at(-1) };
  };
  const ownBounds = updateBounds(update);
  let previousFormation;
  let nextFormation;
  let previousGap = Number.POSITIVE_INFINITY;
  let nextGap = Number.POSITIVE_INFINITY;

  if (currentTrip?.blockId && update) {
    for (const [candidateTripId, candidateUpdate] of tripUpdates) {
      if (candidateTripId === tripId) continue;
      const candidateTrip = timetable.bus.trips.get(candidateTripId);
      if (!candidateTrip || candidateTrip.blockId !== currentTrip.blockId || candidateTrip.serviceId !== currentTrip.serviceId) continue;
      const candidateBounds = updateBounds(candidateUpdate);

      if (candidateBounds.last?.stopId === ownBounds.first?.stopId) {
        const gap = eventTime(ownBounds.first) - eventTime(candidateBounds.last);
        if (gap >= 0 && gap <= 90 * 60_000 && gap < previousGap) {
          previousFormation = { tripId: candidateTripId, trip: candidateTrip, update: candidateUpdate, bounds: candidateBounds };
          previousGap = gap;
        }
      }
      if (candidateBounds.first?.stopId === ownBounds.last?.stopId) {
        const gap = eventTime(candidateBounds.first) - eventTime(ownBounds.last);
        if (gap >= 0 && gap <= 90 * 60_000 && gap < nextGap) {
          nextFormation = { tripId: candidateTripId, trip: candidateTrip, update: candidateUpdate, bounds: candidateBounds };
          nextGap = gap;
        }
      }
    }
  }

  const formationSegment = ({ tripId: segmentTripId, trip: segmentTrip, bounds }) => {
    const segmentRoute = timetable.bus.routes.get(segmentTrip.routeId);
    const firstStop = timetable.bus.stops.get(bounds.first?.stopId);
    const lastStop = timetable.bus.stops.get(bounds.last?.stopId);
    const firstTime = eventTime(bounds.first);
    const lastTime = eventTime(bounds.last);
    return {
      tripId: segmentTripId,
      route: segmentRoute?.shortName || segmentRoute?.longName,
      origin: firstStop?.name,
      destination: segmentTrip.destination || lastStop?.name,
      departsAt: Number.isFinite(firstTime) ? new Date(firstTime).toISOString() : undefined,
      arrivesAt: Number.isFinite(lastTime) ? new Date(lastTime).toISOString() : undefined,
    };
  };
  const formationSegments = [previousFormation, nextFormation].filter(Boolean).map(formationSegment);

  // Vehicle positions can arrive without a matching realtime trip update.
  // Fall back to the official static block sequence so formed-by/forming still
  // works for buses whose operator only publishes positions.
  if (currentTrip && scheduledStopTimes.length) {
    const ownFirst = scheduledStopTimes[0];
    const ownLast = scheduledStopTimes.at(-1);
    const ownStart = gtfsTimeToDate(serviceDate, ownFirst.departureTime || ownFirst.arrivalTime)?.getTime();
    const ownEnd = gtfsTimeToDate(serviceDate, ownLast.arrivalTime || ownLast.departureTime)?.getTime();
    let staticPrevious;
    let staticNext;
    let staticPreviousGap = Number.POSITIVE_INFINITY;
    let staticNextGap = Number.POSITIVE_INFINITY;
    for (const [candidateTripId, candidateTrip] of timetable.bus.trips) {
      if (
        candidateTripId === tripId ||
        candidateTrip.serviceId !== currentTrip.serviceId ||
        candidateTrip.routeId !== currentTrip.routeId ||
        (currentTrip.blockId && candidateTrip.blockId !== currentTrip.blockId)
      ) continue;
      const candidateStops = readIndexedBusStopTimes(candidateTripId);
      const first = candidateStops[0];
      const last = candidateStops.at(-1);
      if (!first || !last) continue;
      const start = gtfsTimeToDate(serviceDate, first.departureTime || first.arrivalTime)?.getTime();
      const end = gtfsTimeToDate(serviceDate, last.arrivalTime || last.departureTime)?.getTime();
      if (last.stopId === ownFirst.stopId && Number.isFinite(end) && Number.isFinite(ownStart)) {
        const gap = ownStart - end;
        if (gap >= 0 && gap <= 90 * 60_000 && gap < staticPreviousGap) {
          staticPrevious = { tripId: candidateTripId, trip: candidateTrip, first, last, start, end };
          staticPreviousGap = gap;
        }
      }
      if (first.stopId === ownLast.stopId && Number.isFinite(start) && Number.isFinite(ownEnd)) {
        const gap = start - ownEnd;
        if (gap >= 0 && gap <= 90 * 60_000 && gap < staticNextGap) {
          staticNext = { tripId: candidateTripId, trip: candidateTrip, first, last, start, end };
          staticNextGap = gap;
        }
      }
    }
    const staticSegment = (candidate) => {
      const candidateRoute = timetable.bus.routes.get(candidate.trip.routeId);
      return {
        tripId: candidate.tripId,
        route: candidateRoute?.shortName || candidateRoute?.longName,
        origin: timetable.bus.stops.get(candidate.first.stopId)?.name,
        destination: candidate.trip.destination || timetable.bus.stops.get(candidate.last.stopId)?.name,
        departsAt: Number.isFinite(candidate.start) ? new Date(candidate.start).toISOString() : undefined,
        arrivesAt: Number.isFinite(candidate.end) ? new Date(candidate.end).toISOString() : undefined,
      };
    };
    if (!previousFormation && staticPrevious) formationSegments.unshift(staticSegment(staticPrevious));
    if (!nextFormation && staticNext) formationSegments.push(staticSegment(staticNext));
  }

  return {
    tripId,
    route: route?.shortName || update.trip?.routeId,
    destination: trip?.destination,
    scheduleRelationship: toNumber(update?.trip?.scheduleRelationship),
    stops: stops.slice(0, 120),
    formationSegments,
    generatedAt: new Date().toISOString(),
    realtimeFeedAt: toNumber(feed?.header?.timestamp)
      ? new Date(toNumber(feed.header.timestamp) * 1000).toISOString()
      : undefined,
    scheduleUpdatedAt: timetable.scheduleUpdatedAt,
    source: update
      ? "Transport Victoria GTFS Schedule + GTFS-Realtime"
      : "Transport Victoria GTFS Schedule",
  };
}
