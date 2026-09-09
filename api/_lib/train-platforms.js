// Metres between two lat/lng points (equirectangular approximation — fine at this scale).
function metresBetween(a, b) {
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(a.lat - b.lat);
  const dLng = toRad(a.lng - b.lng);
  const meanLat = toRad((a.lat + b.lat) / 2);
  const x = dLng * Math.cos(meanLat);
  return 6371000 * Math.sqrt(dLat * dLat + x * x);
}

// A stop the same physical platform, never station names: a station can have many
// platforms. V/Line and Metro sometimes assign the same physical platform two
// different stop_ids (e.g. Footscray's 22240 vs the metro network's 15520 are the
// same platform ~2m apart), so an exact stop_id match misses real, permanent
// platform assignments. Fall back to the nearest metro platform at the same parent
// station, since a platform's location never moves — this is the schedule's usual
// stopping pattern, not a live guess.
const SAME_PLATFORM_RADIUS_METRES = 25;

export function mergeSharedTrainPlatforms(regionalStops, metroStops) {
  const metroByParent = new Map();
  for (const stop of metroStops.values()) {
    if (!stop.platform || !stop.parentStation) continue;
    if (!metroByParent.has(stop.parentStation)) metroByParent.set(stop.parentStation, []);
    metroByParent.get(stop.parentStation).push(stop);
  }

  for (const [id, stop] of regionalStops) {
    if (stop.platform || !stop.parentStation) continue;

    const exact = metroStops.get(id);
    if (exact?.platform && exact.parentStation === stop.parentStation) {
      stop.platform = exact.platform;
      continue;
    }

    const candidates = metroByParent.get(stop.parentStation);
    if (!candidates || !Number.isFinite(stop.lat) || !Number.isFinite(stop.lng)) continue;
    let nearest;
    let nearestDistance = Infinity;
    for (const candidate of candidates) {
      if (!Number.isFinite(candidate.lat) || !Number.isFinite(candidate.lng)) continue;
      const distance = metresBetween(stop, candidate);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = candidate;
      }
    }
    if (nearest && nearestDistance <= SAME_PLATFORM_RADIUS_METRES) {
      stop.platform = nearest.platform;
    }
  }
}

export function resolveTrainPlatformDetails(stop, realtimeStop, stops, livePlatform) {
  if (typeof livePlatform === "string" && livePlatform.trim()) {
    return { platform: livePlatform.trim(), platformSource: "LIVE" };
  }
  const assignedId = realtimeStop?.stopTimeProperties?.assignedStopId || realtimeStop?.stopId;
  if (assignedId && assignedId !== stop?.id) {
    const assigned = stops.get(assignedId);
    if (assigned && stop?.parentStation && assigned.parentStation === stop.parentStation) {
      return { platform: assigned.platform, platformSource: assigned.platform ? "LIVE" : undefined };
    }
    // Do not show an old allocation when a new platform cannot be resolved.
    if (realtimeStop?.stopTimeProperties?.assignedStopId) return {};
  }
  return { platform: stop?.platform, platformSource: stop?.platform ? "SCHEDULED" : undefined };
}

export function resolveTrainPlatform(stop, realtimeStop, stops) {
  return resolveTrainPlatformDetails(stop, realtimeStop, stops).platform;
}
