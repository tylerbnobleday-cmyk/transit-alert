const station = (name) => String(name || "").replace(/\s+Station$/i, "").trim().toLowerCase();
// Include western short workings as well as the three outer termini.
const westernStations = new Set([
  "south kensington", "footscray", "seddon", "yarraville", "spotswood", "newport",
  "north williamstown", "williamstown beach", "williamstown", "seaholme", "altona",
  "westona", "laverton", "aircraft", "williams landing", "hoppers crossing", "werribee",
]);

// Input is the complete, chronologically sorted sequence for one vehicle block
// on one service date. Scheduled times keep grouping stable under live delays.
export function groupTrainWorkings(segments) {
  const workings = [];
  for (let index = 0; index < segments.length; index++) {
    const first = segments[index];
    const second = segments[index + 1];
    const gap = second ? Date.parse(second.scheduledDepartsAt) - Date.parse(first.scheduledArrivesAt) : NaN;
    const sameBlockAndGap = second && first.blockId && first.blockId === second.blockId
      && gap >= 0 && gap <= 10 * 60 * 1000;
    const crossCityViaFlindersStreet = sameBlockAndGap
      && station(first.destination) === "flinders street"
      && station(second.origin) === "flinders street"
      && ((westernStations.has(station(first.origin)) && station(second.destination) === "sandringham")
        || (station(first.origin) === "sandringham" && westernStations.has(station(second.destination))));
    // The Metro Tunnel through-runs Sunbury line trains to Cranbourne/Pakenham
    // (and back), reassigning a new TDN partway at Town Hall — the same
    // one-physical-train-two-TDNs shape as the Flinders Street cross-city
    // pattern above, just handed over at a different station.
    const crossCityViaMetroTunnel = sameBlockAndGap
      && station(first.destination) === "town hall"
      && station(second.origin) === "town hall";
    const crossCity = crossCityViaFlindersStreet || crossCityViaMetroTunnel;
    workings.push({
      segments: crossCity ? [first, second] : [first],
      crossCity: Boolean(crossCity),
      crossCityKind: crossCityViaMetroTunnel ? "metro-tunnel" : crossCityViaFlindersStreet ? "flinders-street" : undefined,
    });
    if (crossCity) index++;
  }
  return workings;
}

// Block boundaries are not evidence of stabling. Across blocks, expose only
// mutually nearest scheduled reversals at outer terminals, clearly as inferred.
// `depth` controls how many workings back/forward of the current one to chase
// (each hop must itself be a confirmed or mutually-inferred connection — the
// chain stops the moment a hop can't be confirmed, it never guesses further).
export function neighbouringTrainWorkings(workings, tripId, depth = 2) {
  const current = workings.find(w => w.segments.some(s => s.tripId === tripId));
  if (!current) return [];
  const first = w => w.segments[0];
  const last = w => w.segments.at(-1);
  // Classic cross-city outer termini, plus the Metro Tunnel corridor's own
  // reversal points — Sunbury-side trains regularly short-work at Watergardens
  // or Sunshine rather than running all the way to Sunbury, and the tunnel's
  // south-eastern side reverses at Cranbourne, Pakenham or East Pakenham.
  const terminals = new Set([
    'sandringham', 'williamstown', 'laverton', 'werribee',
    'sunbury', 'watergardens', 'sunshine', 'cranbourne', 'pakenham', 'east pakenham',
  ]);
  const nearest = (working, forward, sameBlock) => {
    const edge = forward ? last(working) : first(working);
    const candidates = workings.filter(w => w !== working).flatMap(w => {
      const other = forward ? first(w) : last(w);
      const gap = forward
        ? Date.parse(other.scheduledDepartsAt) - Date.parse(edge.scheduledArrivesAt)
        : Date.parse(edge.scheduledDepartsAt) - Date.parse(other.scheduledArrivesAt);
      if (sameBlock) {
        if (!edge.blockId || edge.blockId !== other.blockId || gap < 0) return [];
      } else {
        const end = forward ? edge : other;
        const start = forward ? other : edge;
        if (!terminals.has(station(end.destination)) || station(end.destination) !== station(start.origin)
          || !end.destinationStopId || end.destinationStopId !== start.originStopId
          || end.direction === start.direction || gap < 60_000 || gap > 20 * 60_000) return [];
      }
      return [{ working: w, gap }];
    }).sort((a, b) => a.gap - b.gap);
    return candidates.length && candidates[0].gap !== candidates[1]?.gap ? candidates[0].working : undefined;
  };
  const neighbour = (from, forward) => {
    const official = nearest(from, forward, true);
    if (official) return official;
    const inferred = nearest(from, forward, false);
    return inferred && nearest(inferred, !forward, false) === from
      ? { ...inferred, connectionSource: 'scheduled-turnaround' } : undefined;
  };
  const chain = (forward) => {
    const result = [];
    let cursor = current;
    for (let hop = 0; hop < depth; hop++) {
      const next = neighbour(cursor, forward);
      if (!next) break;
      result.push(next);
      cursor = next;
    }
    return result;
  };
  const backward = chain(false).reverse();
  const forwardChain = chain(true);
  return [...backward, current, ...forwardChain];
}
