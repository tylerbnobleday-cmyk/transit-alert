import { eq, inArray } from "drizzle-orm";
import webpush from "web-push";

let cachedPushDbContext;

async function loadPushDbContext() {
  if (cachedPushDbContext !== undefined) {
    return cachedPushDbContext;
  }

  try {
    const [{ db, ensureDatabaseReady, isDatabaseConfigured }, schema] = await Promise.all([
      import("../../src/lib/db/src/index.js"),
      import("../../src/lib/db/src/schema/push.js"),
    ]);

    if (isDatabaseConfigured) {
      await ensureDatabaseReady();
    }

    cachedPushDbContext = db
      ? {
          db,
          pushSubscriptionsTable: schema.pushSubscriptionsTable,
          sentPushAlertsTable: schema.sentPushAlertsTable,
        }
      : null;
  } catch {
    cachedPushDbContext = null;
  }

  return cachedPushDbContext;
}

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@transit-alert.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export function isPushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export async function saveSubscription(subscription, userId) {
  const context = await loadPushDbContext();
  if (!context || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return false;
  }

  const { db, pushSubscriptionsTable } = context;
  await db
    .insert(pushSubscriptionsTable)
    .values({
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      authKey: subscription.keys.auth,
      userId: userId ?? null,
      lastSeenAt: new Date(),
    })
    .onConflictDoUpdate({
      target: pushSubscriptionsTable.endpoint,
      set: {
        p256dh: subscription.keys.p256dh,
        authKey: subscription.keys.auth,
        userId: userId ?? null,
        lastSeenAt: new Date(),
      },
    });
  return true;
}

export async function removeSubscriptionByEndpoint(endpoint) {
  const context = await loadPushDbContext();
  if (!context || !endpoint) return false;
  const { db, pushSubscriptionsTable } = context;
  await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, endpoint));
  return true;
}

async function getAllSubscriptions() {
  const context = await loadPushDbContext();
  if (!context) return [];
  return context.db.query.pushSubscriptionsTable.findMany();
}

// PTV's own "last modified" timestamp on a disruption record can be far
// older than a specific train service actually being cancelled under it
// (the disruption record itself may not have been touched in hours even
// though this particular service just appeared as newly affected) — so a
// freshly-pushed cancellation notification could show a misleading "about
// 10 hours ago" instead of reflecting when we actually noticed and notified
// about it. This is real data we already keep (sentPushAlertsTable is
// written the moment we push an alert), just not previously exposed to the
// frontend. Not a one-off — every alert display of "time ago" should prefer
// this over the PTV feed's own updatedAt when we have it.
export async function getSentAlertTimestamps(alertIds) {
  const context = await loadPushDbContext();
  if (!context || !alertIds.length) return new Map();
  const rows = await context.db.query.sentPushAlertsTable.findMany({
    where: inArray(context.sentPushAlertsTable.alertId, alertIds),
  });
  return new Map(rows.map((row) => [row.alertId, row.sentAt]));
}

async function markAlertSent(alertId) {
  const context = await loadPushDbContext();
  if (!context) return;
  const { db, sentPushAlertsTable } = context;
  await db.insert(sentPushAlertsTable).values({ alertId }).onConflictDoNothing();
}

// checkAndPushNewAlerts polls continuously; if one run is still sending
// pushes to every subscriber (real network time) when the next scheduled
// run starts, the old hasAlertBeenSent-then-later-markAlertSent pattern let
// both runs see "not sent yet" and both actually send — the same real
// disruption landing as two identical notifications a minute apart. Insert
// the claim row FIRST, atomically, and only send if this call is the one
// that actually inserted it (onConflictDoNothing + returning() tells us
// that) — whichever concurrent run loses the race skips sending entirely
// rather than both proceeding.
async function claimAlertForSending(alertId) {
  const context = await loadPushDbContext();
  if (!context) return false;
  const { db, sentPushAlertsTable } = context;
  const inserted = await db
    .insert(sentPushAlertsTable)
    .values({ alertId })
    .onConflictDoNothing()
    .returning({ alertId: sentPushAlertsTable.alertId });
  return inserted.length > 0;
}

async function releaseAlertClaim(alertId) {
  const context = await loadPushDbContext();
  if (!context) return;
  const { db, sentPushAlertsTable } = context;
  await db.delete(sentPushAlertsTable).where(eq(sentPushAlertsTable.alertId, alertId));
}

const MONTH_NAME_INDEX = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};
const ALERT_DATE_PATTERN = new RegExp(`\\b(\\d{1,2})\\s+(${Object.keys(MONTH_NAME_INDEX).join("|")})\\b`, "gi");

// Multi-night works notices ("buses replace trains ... Sunday 6 September to
// Wednesday 9 September") are published once and never touched again in the
// feed, so updatedAt goes "stale" by the usual freshness check well before
// the closure itself ends — a closure announced 4 days ago that runs a week
// is still genuinely happening tonight. Mirrors the same widening check in
// src/lib/todays-alerts.ts: this only ever makes an alert MORE likely to
// still count as current, never less.
function parseAlertActiveWindow(text) {
  const matches = [...text.matchAll(ALERT_DATE_PATTERN)];
  if (matches.length < 2) return null;

  const toTimestamp = (day, monthName, year) => {
    const month = MONTH_NAME_INDEX[monthName.toLowerCase()];
    if (month === undefined) return Number.NaN;
    return new Date(year, month, Number(day), 23, 59, 59).getTime();
  };

  const first = matches[0];
  const last = matches[matches.length - 1];
  const year = new Date().getFullYear();
  const start = toTimestamp(first[1], first[2], year);
  let end = toTimestamp(last[1], last[2], year);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;

  if (end < start) {
    end = toTimestamp(last[1], last[2], year + 1);
  }
  return { start, end };
}

function isWithinParsedAlertWindow(alert, graceMs = 1000 * 60 * 60 * 24) {
  const window = parseAlertActiveWindow(`${alert.title ?? ""} ${alert.summary ?? ""}`);
  if (!window) return false;
  const now = Date.now();
  return now >= window.start - graceMs && now <= window.end + graceMs;
}

// Mirrors src/lib/todays-alerts.ts's isHeadlineAlert so push notifications
// only fire for the same disruptions the app itself surfaces as headlines —
// never for routine planned works or access notices.
export function isHeadlineAlert(alert) {
  const searchable = `${alert.title ?? ""} ${alert.summary ?? ""} ${alert.status ?? ""}`.toLowerCase();
  const updatedAt = alert.updatedAt ? new Date(alert.updatedAt).getTime() : Number.NaN;
  const hasValidUpdatedAt = Number.isFinite(updatedAt);
  const ageMs = hasValidUpdatedAt ? Date.now() - updatedAt : 0;

  if (/trespass|police request|police operation|person hit by train|disabled train|mechanical|signal|overhead|power fault|fault|major delay|minor delay|service disruption|delay/.test(searchable)) {
    return !hasValidUpdatedAt || ageMs <= 1000 * 60 * 60 * 12;
  }

  if (/has been cancelled|have been cancelled|service cancelled|run cancelled|cancellation/.test(searchable)) {
    return !hasValidUpdatedAt || ageMs <= 1000 * 60 * 60 * 12;
  }

  if (/buses replace trains|replacement buses|bus replacement|station closed|suspended/.test(searchable)) {
    return !hasValidUpdatedAt || ageMs <= 1000 * 60 * 60 * 24 * 3 || isWithinParsedAlertWindow(alert);
  }

  return false;
}

// PTV's own disruption text is usually one real, specific sentence (what
// happened, where, how long) followed by several sentences of the SAME
// generic operational boilerplate — "Trains may remain stationary at
// platforms...", "Check information displays and listen for announcements"
// — that PTV appends near-verbatim to almost every trespasser/fault alert
// regardless of what actually happened. That's useful detail on a station
// departure board, but crammed into a push notification it buries the one
// fact that actually matters under generic filler. This keeps only the real,
// specific opening sentence(s) rather than inventing or rewording anything.
const ALERT_BOILERPLATE_SENTENCE = /check (the )?information displays|listen for announcements|trains may remain stationary|may terminate\/?originate|allow extra travel time|consider alternative travel|plan ahead|visit (ptv|our website)|for more information/i;

export function formatAlertPushBody(summary) {
  const trimmed = String(summary ?? "").trim();
  if (!trimmed) return trimmed;

  const sentences = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [trimmed];
  const kept = [];
  let length = 0;
  for (const sentence of sentences) {
    if (ALERT_BOILERPLATE_SENTENCE.test(sentence)) break;
    kept.push(sentence.trim());
    length += sentence.length;
    if (length >= 140) break;
  }

  const result = kept.join(" ").trim();
  if (result) return result;
  // Every sentence looked like boilerplate (or there was only one long run-on
  // sentence) — fall back to a plain length cap rather than dropping the
  // notification body entirely.
  return trimmed.length > 160 ? `${trimmed.slice(0, 157).trimEnd()}...` : trimmed;
}

// PTV's own alert.title is frequently just a severity classification —
// "Minor Delay", "Major Delay", "Service Alert" — with no hint of what
// actually happened, even though the real cause is one clause away in the
// summary ("Delays up to 10 minutes due to a disruptive passenger at
// Caulfield."). A bare "Minor Delay" push notification title tells a rider
// nothing they couldn't already guess; pulling the real "due to ..." clause
// out of the (already-cleaned) body into the title applies to every alert
// this generic, not just one kind — trespassers, faults, cancellations, etc.
// all use the same "due to X" phrasing in the real feed.
// "Service Change" is one of PTV's own real generic category titles (see
// ALERT_TYPE_LABELS.service in metro-notify/alerts.js) — confirmed missing
// live: a real "disruptive passenger" delay came through titled plain
// "Service Change" even though the body already had the real cause,
// because this pattern only recognised "delay/disruption/alert" as the
// generic second word, not "change".
const GENERIC_ALERT_TITLE = /^(minor|major|service)?\s*(delay|delays|disruption|alert|service alert|change)s?$/i;

export function formatAlertPushTitle(rawTitle, cleanedBody) {
  const title = String(rawTitle ?? "").trim();
  if (!title || !GENERIC_ALERT_TITLE.test(title)) return title || "TransitAlert";
  const causeMatch = String(cleanedBody ?? "").match(/\bdue to ([^.,;]+)/i);
  return causeMatch ? `${title} due to ${causeMatch[1].trim()}` : title;
}

async function deliverPushToSubscriptions(subscriptions, payload) {
  const body = JSON.stringify(payload);
  let succeeded = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.authKey },
          },
          body,
        );
        succeeded += 1;
      } catch (error) {
        const statusCode = error?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await removeSubscriptionByEndpoint(subscription.endpoint).catch(() => undefined);
        } else {
          console.error("[transitalert-push] Failed to deliver push", subscription.endpoint, error?.message ?? error);
        }
      }
    }),
  );

  return { attempted: subscriptions.length, succeeded, vapidConfigured: true };
}

export async function sendPushToAllSubscriptions(payload) {
  if (!ensureVapidConfigured()) return { attempted: 0, succeeded: 0, vapidConfigured: false };
  return deliverPushToSubscriptions(await getAllSubscriptions(), payload);
}

// Real per-account targeting rather than a blind broadcast — this app has a
// real, multi-account auth system (appUsersTable), so "notify a specific
// person" has to actually mean their account's own subscriptions, not
// everyone who happens to have push enabled.
async function findUserIdByEmail(email) {
  const context = await loadPushDbContext();
  if (!context) return null;
  const { appUsersTable } = await import("../../src/lib/db/src/schema/auth.js");
  const user = await context.db.query.appUsersTable.findFirst({
    where: eq(appUsersTable.email, email.toLowerCase()),
  });
  return user?.id ?? null;
}

export async function sendPushToUserEmail(email, payload) {
  if (!ensureVapidConfigured()) return { attempted: 0, succeeded: 0, vapidConfigured: false };
  const context = await loadPushDbContext();
  if (!context) return { attempted: 0, succeeded: 0, vapidConfigured: true };
  const userId = await findUserIdByEmail(email);
  if (!userId) return { attempted: 0, succeeded: 0, vapidConfigured: true, userFound: false };
  const subscriptions = await context.db.query.pushSubscriptionsTable.findMany({
    where: eq(context.pushSubscriptionsTable.userId, userId),
  });
  return deliverPushToSubscriptions(subscriptions, payload);
}

export async function sendTestPush() {
  return sendPushToAllSubscriptions({
    title: "Welcome to Metro",
    body: "Welcome to World",
    url: "./alerts/today",
    tag: "transitalert-test",
  });
}

// No real trespasser incident or track fault is currently active, so these
// are clearly labelled as drills rather than invented as if they were real
// live disruptions — never send a mock alert without making it obvious
// it's a mock.
export async function sendMockSafetyTestPushes() {
  const mocks = [
    {
      title: "TEST — Trespasser incident (not real)",
      body: "This is a drill notification only. Trains may be delayed while Metro Trains respond to a person on the tracks.",
      tag: "transitalert-mock-trespasser",
    },
    {
      title: "TEST — Track fault (not real)",
      body: "This is a drill notification only. A track fault is affecting services in this area.",
      tag: "transitalert-mock-track-fault",
    },
  ];

  const results = [];
  for (const mock of mocks) {
    const result = await sendPushToAllSubscriptions({ ...mock, url: "./alerts/today" });
    results.push({ title: mock.title, ...result });
  }
  return { pushes: results };
}

// Sends real, current disruption alerts (not fabricated test copy) so the
// user can confirm what an actual alert push looks and reads like, without
// waiting for isHeadlineAlert's stricter severity/age filter to naturally
// qualify one. Marks each as sent so the normal 60s watch loop doesn't
// immediately re-deliver the same ones a second time.
export async function sendRecentAlertsTestBatch(count = 5) {
  if (!ensureVapidConfigured()) return { attempted: 0, succeeded: 0, alerts: [] };

  const { fetchMergedMetroAlerts } = await import("../metro-notify/alerts.js");
  const alerts = await fetchMergedMetroAlerts();
  const recentAlerts = [...alerts]
    .filter((alert) => alert.title && alert.summary)
    .sort((left, right) => new Date(right.updatedAt ?? 0).getTime() - new Date(left.updatedAt ?? 0).getTime())
    .slice(0, count);

  const results = [];
  for (const alert of recentAlerts) {
    const body = formatAlertPushBody(alert.summary);
    const title = formatAlertPushTitle(alert.title, body);
    const result = await sendPushToAllSubscriptions({
      title,
      body,
      url: "./alerts/today",
      tag: alert.id,
    });
    if (result?.succeeded > 0) await markAlertSent(alert.id);
    results.push({ id: alert.id, title, ...result });
  }
  return { alerts: results };
}

// The "down" alert (id "transitalert-tram-feed-down") is claimed once and
// stays claimed for as long as the outage lasts, so it never repeats. That
// same claim doubles as "we already told everyone it's down" state here:
// once it's gone (feed genuinely back up + claim released), announce the
// recovery and release the claim so a future, separate outage can alert
// again from scratch.
async function checkTramFeedRecovery() {
  const context = await loadPushDbContext();
  if (!context) return;
  const wasDown = await context.db.query.sentPushAlertsTable.findFirst({
    where: eq(context.sentPushAlertsTable.alertId, "transitalert-tram-feed-down"),
  });
  if (!wasDown) return;

  const { checkTramFeedStatus } = await import("../ptv/live-trams.js");
  const status = await checkTramFeedStatus().catch(() => ({ down: true }));
  if (status.down) return;

  await releaseAlertClaim("transitalert-tram-feed-down");
  const result = await sendPushToAllSubscriptions({
    title: "Tram Tracking Back Online",
    body: "Live tram tracking has resumed — PTV's tram data feed is back up.",
    url: "./alerts/today",
    tag: "transitalert-tram-feed-recovered",
  });
  // If nobody was actually reachable, don't act like this was announced —
  // let the next run try again with a fresh check.
  if (!(result?.succeeded > 0)) {
    await markAlertSent("transitalert-tram-feed-down");
  }
}

// Real, specific train 430M (the tracked/highlighted consist — see
// isTrackedConsist in Map.tsx) reforming as a new service is a distinct,
// real state change: its trip_id changing. Claiming
// "transitalert-430m-service-<tripId>" atomically means each real trip_id
// this physical train picks up only ever announces once, the same
// dedup approach the alert-push loop already uses.
// This app has a real, multi-account auth system — a blind broadcast would
// reach every subscriber, not just the one person who asked for this
// specific train's alerts. Targeted to Tyler's own account by email.
const TRACKED_430M_NOTIFY_EMAIL = "tylerbnobleday@gmail.com";

async function checkTracked430mService() {
  const { getCachedLiveTrains } = await import("../ptv/live-trains.js");
  const trains = getCachedLiveTrains();
  const tracked = trains?.find?.((train) => train.consist === "430M");
  if (!tracked?.tripId) return;

  const claimed = await claimAlertForSending(`transitalert-430m-service-${tracked.tripId}`);
  if (!claimed) return;

  const result = await sendPushToUserEmail(TRACKED_430M_NOTIFY_EMAIL, {
    title: "430M formed a new service",
    body: `430M is now running ${tracked.line ? `on the ${tracked.line} line` : "a new service"}${tracked.destination ? ` to ${tracked.destination}` : ""} (TDN ${tracked.tdn}).`,
    url: "./",
    tag: `430m-${tracked.tripId}`,
  });
  if (!(result?.succeeded > 0)) {
    await releaseAlertClaim(`transitalert-430m-service-${tracked.tripId}`);
  }
}

export async function checkAndPushNewAlerts() {
  if (!ensureVapidConfigured()) return;

  await checkTramFeedRecovery().catch((error) => {
    console.warn("[push] tram feed recovery check failed:", error instanceof Error ? error.message : error);
  });
  await checkTracked430mService().catch((error) => {
    console.warn("[push] 430M service check failed:", error instanceof Error ? error.message : error);
  });

  const { fetchMergedMetroAlerts } = await import("../metro-notify/alerts.js");
  const alerts = await fetchMergedMetroAlerts();
  const headlineAlerts = alerts.filter(isHeadlineAlert);

  for (const alert of headlineAlerts) {
    if (!(await claimAlertForSending(alert.id))) continue;

    const body = formatAlertPushBody(alert.summary);
    const result = await sendPushToAllSubscriptions({
      title: formatAlertPushTitle(alert.title, body) || "TransitAlert",
      body,
      url: "./alerts/today",
      tag: alert.id,
    });
    // Only keep an alert marked "sent" once it actually reached a device.
    // This loop runs continuously from server start, long before anyone
    // may have subscribed yet — keeping the claim regardless meant every
    // alert that existed before the first real subscriber signed up was
    // permanently skipped and could never be delivered to them. Release the
    // claim so a later run (once someone has subscribed) can still send it.
    if (!(result?.succeeded > 0)) {
      await releaseAlertClaim(alert.id);
    }
  }
}
