import { isPtvV3Configured, ptvV3Fetch } from "./ptv-v3.js";
import { southernCrossPlatform } from "./vline-public-data.js";

const cache = new Map();
const stationKey = (value) => String(value || "").toLowerCase().replace(/\brailway\b|\bstation\b/g, "").replace(/\s+/g, " ").trim();
const routeKey = (value) => String(value || "").replace(/^aus:vic:vic-0?/, "").replace(/:$/, "");

export async function getVlineDeparturePlatform(stop, trip, scheduledAt) {
  const direct = await southernCrossPlatform(trip, stop, scheduledAt);
  if (direct) return direct;
  if (!isPtvV3Configured() || !stop?.ptvStopId || !trip) return undefined;
  const time = Date.parse(scheduledAt);
  if (!Number.isFinite(time)) return undefined;
  const key = `${stop.ptvStopId}:${scheduledAt}`;
  const now = Date.now();
  let cached = cache.get(key);
  if (!cached || now - cached.at > 15_000) {
    if (cache.size > 500) cache.clear();
    const promise = ptvV3Fetch(`/v3/departures/route_type/3/stop/${stop.ptvStopId}`, {
      date_utc: new Date(time - 1000).toISOString(), max_results: 2, expand: "all",
    }, 4000).catch(() => null);
    cached = { at: now, promise };
    cache.set(key, cached);
  }
  const data = await cached.promise;
  const matches = (data?.departures || []).filter((departure) => {
    const route = data.routes?.[departure.route_id];
    const run = data.runs?.[departure.run_ref] || data.runs?.[departure.run_id];
    return String(departure.stop_id) === stop.ptvStopId &&
      Date.parse(departure.scheduled_departure_utc) === time &&
      routeKey(route?.route_gtfs_id) === routeKey(trip.routeId) &&
      stationKey(run?.destination_name) === stationKey(trip.destination);
  });
  // A route/time alone is insufficient when multiple runs remain possible.
  if (new Set(matches.map((d) => d.run_ref)).size !== 1) return undefined;
  const platforms = [...new Set(matches.map((d) => d.platform_number?.trim()).filter(Boolean))];
  return platforms.length === 1 ? platforms[0] : undefined;
}

export async function enrichVlinePlatforms(stops, mode, trip) {
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(4, stops.length) }, async () => {
    while (index < stops.length) {
      const stop = stops[index++];
      const platform = await getVlineDeparturePlatform(mode.stops.get(stop.stopId), trip, stop.scheduledDepartureAt);
      if (platform) Object.assign(stop, { platform, platformSource: "LIVE" });
    }
  }));
}
