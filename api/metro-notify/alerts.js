import { findMetroTrainBlockId, findMetroTrainTrip, getVerifiedTrainMarkerDestination } from "../_lib/ptv-timetable.js";
import { fetchNonMetroTrainDisruptions } from "../_lib/ptv-disruptions.js";

const METRO_ALERTS_URL = "https://www.metrotrains.com.au/api?op=get_healthboard_alerts";
// metrotrains.com.au/service/ renders a blank "Service Updates" page with no
// content (dead on Metro's own site) — send users to Transport Victoria's
// real, live disruptions page instead so "Details here" actually goes
// somewhere.
const METRO_SERVICE_URL = "https://transport.vic.gov.au/disruptions/disruptions-information";

const ALERT_TYPE_LABELS = {
  service: "Service Change",
  minor: "Minor Delay",
  major: "Major Delay",
  suspended: "Suspended",
  works: "Works Alert",
  travel: "Travel Alert",
  cancellation: "Cancellation",
  "good-service": "Good Service",
};

const WORK_TYPE_STATUS = {
  "bus-replacement": "planned works",
  "night-works": "planned works",
  "service-changes": "service change",
  "station-car-park-works": "station access",
  "station-closure": "station access",
  "replacement-buses": "planned works",
};

const ENTITY_MAP = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
};

function decodeHtmlEntities(value) {
  return value.replace(/&nbsp;|&amp;|&quot;|&#39;|&apos;|&lt;|&gt;/g, (match) => ENTITY_MAP[match] ?? match);
}

function stripHtml(value) {
  return decodeHtmlEntities(String(value ?? ""))
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unixToIso(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return undefined;
  }

  return new Date(seconds * 1000).toISOString();
}

function formatLineName(lineName) {
  const cleaned = String(lineName ?? "").trim();
  if (!cleaned) return "Metro";
  if (/all lines|station|loop|corridor|line$/i.test(cleaned)) {
    return cleaned;
  }
  return `${cleaned} Line`;
}

function titleCaseWords(value) {
  return String(value ?? "")
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function sentenceCase(value) {
  const cleaned = String(value ?? "").trim();
  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function formatClock(date, options = {}) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...options,
  })
    .format(date)
    .replace(/\s/g, "")
    .toLowerCase();
}

function formatDate(date, options = {}) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    weekday: "long",
    day: "numeric",
    month: "long",
    ...options,
  }).format(date);
}

function formatPlannedWorksSummary(work) {
  const start = Number(work?.start_date);
  const end = Number(work?.end_date);
  const startDate = Number.isFinite(start) && start > 0 ? new Date(start * 1000) : null;
  const endDate = Number.isFinite(end) && end > 0 ? new Date(end * 1000) : null;
  const stations = Array.isArray(work?.affected_stations)
    ? work.affected_stations.filter((station) => typeof station === "string" && station.trim())
    : [];

  const routeText =
    stations.length >= 2
      ? `${stations[0]} -> ${stations[stations.length - 1]}`
      : stations.length === 1
        ? `${stations[0]} area`
        : "";

  if (!startDate || !endDate) {
    return routeText ? `Affecting ${routeText}.` : "Check Metro planned works details for timing information.";
  }

  const sameDay =
    startDate.toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne" }) ===
    endDate.toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne" });

  const startClock = formatClock(startDate);
  const endClock = formatClock(endDate);
  const startDay = formatDate(startDate);
  const endDay = formatDate(endDate);

  let dateText = "";
  if (sameDay) {
    dateText = `${startClock} to ${endClock} ${startDay}`;
  } else if (endClock === "11:59pm") {
    dateText = `${startClock} ${startDay} to last service ${endDay}`;
  } else {
    dateText = `${startClock} ${startDay} to ${endClock} ${endDay}`;
  }

  if (routeText) {
    return `${dateText}. Affecting ${routeText}.`;
  }

  return `${dateText}.`;
}

function buildRouteLabel(stations) {
  const cleanedStations = Array.isArray(stations)
    ? stations.filter((station) => typeof station === "string" && station.trim())
    : [];

  if (cleanedStations.length >= 2) {
    return `${cleanedStations[0]} -> ${cleanedStations[cleanedStations.length - 1]}`;
  }

  return null;
}

function mergeAlertMaps(map, nextAlert) {
  const existing = map.get(nextAlert.id);
  if (!existing) {
    map.set(nextAlert.id, nextAlert);
    return;
  }

  const mergedLines = [...new Set([...(existing.lines ?? []), ...(nextAlert.lines ?? [])])];
  map.set(nextAlert.id, {
    ...existing,
    ...nextAlert,
    lines: mergedLines,
    updatedAt: existing.updatedAt && nextAlert.updatedAt
      ? (new Date(existing.updatedAt).getTime() >= new Date(nextAlert.updatedAt).getTime()
          ? existing.updatedAt
          : nextAlert.updatedAt)
      : existing.updatedAt ?? nextAlert.updatedAt,
    summary:
      existing.summary && existing.summary.length >= (nextAlert.summary?.length ?? 0)
        ? existing.summary
        : nextAlert.summary,
    url: nextAlert.url ?? existing.url,
  });
}

function normaliseLiveAlert(lineId, lineName, rawAlert) {
  const summary = stripHtml(rawAlert?.alert_text);
  if (!summary || /good service - trains are running on time/i.test(summary)) {
    return null;
  }

  const type = String(rawAlert?.alert_type ?? "").trim().toLowerCase();
  const cause = sentenceCase(rawAlert?.disruption_due_to ?? "");
  const typeLabel = ALERT_TYPE_LABELS[type] ?? "Service Alert";
  // Split on real sentence-ending punctuation only — a plain /[.!?]/ split
  // also breaks on the decimal point in a time like "8.30pm", truncating the
  // title mid-sentence ("...from 8") well before the sentence actually
  // ends. A period with a digit on either side is a time/decimal, not a
  // sentence break.
  const title =
    type === "works"
      ? summary.split(/(?<!\d)[.!?](?!\d)/)[0]?.trim() || typeLabel
      : typeLabel;

  return {
    id: `metro-live-${rawAlert?.alert_id ?? `${lineId}-${type}-${summary}`}`,
    title,
    summary,
    lines: [formatLineName(lineName)],
    status: cause || typeLabel.toLowerCase(),
    updatedAt: unixToIso(rawAlert?.modified ?? rawAlert?.from_date),
    url: METRO_SERVICE_URL,
  };
}

function normalisePlannedWork(lineName, work) {
  const title = stripHtml(work?.title);
  if (!title) {
    return null;
  }

  const routeLabel = buildRouteLabel(work?.affected_stations);
  const summaryBase = formatPlannedWorksSummary(work);
  const summary = routeLabel && !summaryBase.toLowerCase().includes(routeLabel.toLowerCase())
    ? `${summaryBase} ${routeLabel}.`
    : summaryBase;

  return {
    id: `metro-work-${work?.id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title,
    summary,
    lines: [formatLineName(lineName)],
    status: WORK_TYPE_STATUS[String(work?.type ?? "").trim().toLowerCase()] ?? "planned works",
    updatedAt: unixToIso(work?.modified ?? work?.start_date),
    url: typeof work?.link === "string" && work.link.trim() ? work.link.trim() : METRO_SERVICE_URL,
    addToCalendarUrl: undefined,
  };
}

function normaliseLiftOutage(stationOutage, outage, index) {
  const stationName = stripHtml(stationOutage?.station);
  const title = stripHtml(outage?.name || outage?.title || `${stationName} access notice`);
  const summary = stripHtml(outage?.description);
  if (!title && !summary) {
    return null;
  }

  return {
    id: `metro-outage-${stationName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
    title: title || `${stationName} access notice`,
    summary: summary || `${stationName} access changes are currently in place.`,
    lines: ["All lines", stationName ? `${stationName} Station` : "Station access"],
    status: "station access",
    updatedAt: undefined,
    url: METRO_SERVICE_URL,
  };
}

function createAlertsFromHealthboard(payload) {
  const alertsMap = new Map();

  for (const [key, value] of Object.entries(payload ?? {})) {
    if (!value || typeof value !== "object") {
      continue;
    }

    if (["metadata", "disruptions", "lift_escalator_outages"].includes(key)) {
      continue;
    }

    const lineName = value.line_name ?? titleCaseWords(key);

    if (Array.isArray(value.alerts)) {
      for (const rawAlert of value.alerts) {
        const alert = normaliseLiveAlert(key, lineName, rawAlert);
        if (alert) {
          mergeAlertMaps(alertsMap, alert);
        }
      }
    }

    if (Array.isArray(value.planned_works_list)) {
      for (const work of value.planned_works_list) {
        const alert = normalisePlannedWork(lineName, work);
        if (alert) {
          mergeAlertMaps(alertsMap, alert);
        }
      }
    }
  }

  if (Array.isArray(payload?.lift_escalator_outages)) {
    payload.lift_escalator_outages.forEach((stationOutage) => {
      const outages = Array.isArray(stationOutage?.outages) ? stationOutage.outages : [];
      outages.forEach((outage, index) => {
        const alert = normaliseLiftOutage(stationOutage, outage, index);
        if (alert) {
          mergeAlertMaps(alertsMap, alert);
        }
      });
    });
  }

  return [...alertsMap.values()].sort((left, right) => {
    const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
    const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
    return rightTime - leftTime;
  });
}

// Matches Metro's standard cancellation wording: "The 7:30am Anzac to Sunbury
// service has been cancelled." Cancellations don't come with any TDN/consist
// field from Metro's own feed, so linking two of them to "the same train"
// requires cross-checking the real GTFS schedule (see findMetroTrainBlockId).
const CANCELLATION_PATTERN = /^the\s+(\d{1,2}:\d{2}\s*[ap]m)\s+(.+?)\s+to\s+(.+?)\s+service has been cancelled\.?$/i;

function clockMinutes(clockText) {
  const match = clockText.trim().match(/^(\d{1,2}):(\d{2})\s*([ap]m)?$/i);
  if (!match) return Number.POSITIVE_INFINITY;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

// Metro's own alert text names the origin of the specific scheduled trip
// being cancelled, which is sometimes a mid-journey relabelling point (e.g.
// Metro Tunnel services renumbered at Arden) rather than where the physical
// train actually started. Cross-check the real GTFS block_id chain and swap
// in the true starting station when the schedule shows this trip continues
// on from an earlier one — never invent a station the schedule doesn't back.
async function correctCancellationOrigins(alerts) {
  return Promise.all(alerts.map(async (alert) => {
    const match = alert.summary.trim().match(CANCELLATION_PATTERN);
    if (!match) return alert;
    const [, time, origin, destination] = match;

    try {
      const tripId = await findMetroTrainTrip(origin, time);
      if (!tripId) return alert;

      const tdn = tripId.match(/-([A-Z]?\d+)$/i)?.[1];
      const resolved = await getVerifiedTrainMarkerDestination(tripId);
      const trueOrigin = resolved?.origin?.trim();

      if (!trueOrigin || trueOrigin.toLowerCase() === origin.trim().toLowerCase()) {
        return tdn ? { ...alert, tdn } : alert;
      }

      return {
        ...alert,
        tdn,
        summary: `The ${time} ${trueOrigin} to ${destination} service has been cancelled.`,
      };
    } catch {
      // Never let a schedule lookup failure block showing the raw alert.
      return alert;
    }
  }));
}

// Merge cancellation notices only when the real static schedule confirms two
// legs share one physical train's block_id — never on time/route proximity
// alone. Ambiguous or unresolved lookups are left as separate cards.
async function mergeLinkedCancellations(alerts) {
  const candidates = alerts
    .map((alert) => ({ alert, match: alert.summary.trim().match(CANCELLATION_PATTERN) }))
    .filter(({ match }) => Boolean(match));
  if (candidates.length < 2) return alerts;

  const resolved = await Promise.all(candidates.map(async ({ alert, match }) => {
    const [, time, origin, destination] = match;
    let blockId;
    try {
      blockId = await findMetroTrainBlockId(origin, time);
    } catch {
      blockId = undefined;
    }
    return blockId ? { alert, time, origin, destination, blockId } : null;
  }));

  const byBlock = new Map();
  for (const entry of resolved) {
    if (!entry) continue;
    if (!byBlock.has(entry.blockId)) byBlock.set(entry.blockId, []);
    byBlock.get(entry.blockId).push(entry);
  }

  const consumedIds = new Set();
  const merged = [];
  for (const group of byBlock.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => clockMinutes(a.time) - clockMinutes(b.time));
    const first = group[0];
    const last = group[group.length - 1];
    merged.push({
      id: `metro-live-merged-${group.map((entry) => entry.alert.id).join("-")}`,
      title: "Cancellation",
      summary: `The ${first.time} ${first.origin} to ${last.destination} service has been cancelled.`,
      lines: [...new Set(group.flatMap((entry) => entry.alert.lines))],
      status: "cancellation",
      updatedAt: group.map((entry) => entry.alert.updatedAt).filter(Boolean).sort().at(-1),
      url: first.alert.url,
      tdn: [...new Set(group.map((entry) => entry.alert.tdn).filter(Boolean))].join(" / ") || undefined,
    });
    group.forEach((entry) => consumedIds.add(entry.alert.id));
  }

  if (merged.length === 0) return alerts;
  return [...alerts.filter((alert) => !consumedIds.has(alert.id)), ...merged];
}

export async function fetchMergedMetroAlerts() {
  const response = await fetch(METRO_ALERTS_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "TransitAlert Melbourne",
    },
  });

  if (!response.ok) {
    throw new Error(`Metro alerts request failed (${response.status})`);
  }

  const payload = await response.json();
  const rawAlerts = createAlertsFromHealthboard(payload);
  let alerts = rawAlerts;
  try {
    alerts = await correctCancellationOrigins(rawAlerts);
  } catch {
    // Best-effort enhancement — never let it block returning the raw alerts.
  }
  try {
    alerts = await mergeLinkedCancellations(alerts);
  } catch {
    // The static schedule lookup is a best-effort enhancement — never let
    // it block returning the (unmerged) live alerts.
  }

  try {
    const otherModeAlerts = await fetchNonMetroTrainDisruptions();
    alerts = [...alerts, ...otherModeAlerts];
  } catch {
    // V/Line/tram/bus/ferry coverage is additive — never let it block the
    // Metro train alerts this endpoint already reliably returns.
  }

  return alerts;
}

export default async function handler(_req, res) {
  try {
    const alerts = await fetchMergedMetroAlerts();
    res.status(200).json({ alerts });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to load Metro alerts",
    });
  }
}
