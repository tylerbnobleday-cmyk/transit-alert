let boardCache;
const trackerCache = new Map();
export async function southernCrossPlatform(trip, stop, scheduledAt) {
  if (stop?.parentStation !== "vic:rail:SSS") return undefined;
  if (!boardCache || Date.now() - boardCache.at > 15000) {
    boardCache = { at: Date.now(), promise: fetch("https://www.vline.com.au", { signal: AbortSignal.timeout(4000) }).then(r => r.ok ? r.text() : "").catch(() => "") };
  }
  const html = await boardCache.promise;
  const date = new Date(scheduledAt);
  if (Math.abs(Date.now() - date.getTime()) > 45 * 60 * 1000) return undefined;
  const localDate = d => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(d);
  if (!Number.isFinite(date.getTime()) || localDate(date) !== localDate(new Date())) return undefined;
  const clock = new Intl.DateTimeFormat("en-GB", { timeZone: "Australia/Melbourne", hour: "2-digit", minute: "2-digit" }).format(date);
  const tdn = trip?.id.match(/-([A-Z]?\d+)$/i)?.[1];
  const rows = [...html.matchAll(/HandleMouseClick\(event,\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)'\)/g)];
  const platforms = [...new Set(rows.filter(r => r[1] === "Melbourne, Southern Cross" && r[2] === clock && r[5] === tdn).map(r => r[4].trim()).filter(p => /^\d+(?:[AB]|\s+(?:North|South))?$/i.test(p)))];
  return platforms.length === 1 ? platforms[0] : undefined;
}

// This source explicitly reports a leading carriage, not a complete coupled consist.
export async function reportedVlineLeadingSets(serviceDate) {
  if (!/^\d{8}$/.test(serviceDate || "")) return new Map();
  let entry = trackerCache.get(serviceDate);
  if (!entry || Date.now() - entry.at > 60000) {
    if (trackerCache.size > 2) trackerCache.clear();
    const date = `${serviceDate.slice(6,8)}/${serviceDate.slice(4,6)}/${serviceDate.slice(0,4)}`;
    entry = { at: Date.now(), promise: fetch(`https://transportvic.me/vline/tracker/date?date=${encodeURIComponent(date)}`, { signal: AbortSignal.timeout(4000) }).then(r => r.ok ? r.text() : "").catch(() => "") };
    trackerCache.set(serviceDate, entry);
  }
  const html = await entry.promise;
  const result = new Map();
  for (const row of html.matchAll(/<a href="(\/vline\/run\/[^"<>]+)">#(\d+): ([^<]+): (VL\d{1,3})<\/a>/g)) {
    if (result.has(row[2])) { result.set(row[2], null); continue; }
    result.set(row[2], { setId: row[4], source: "TransportVic", sourceUrl: `https://transportvic.me${row[1]}`, observedAt: new Date(entry.at).toISOString() });
  }
  return result;
}
