import { eq } from "drizzle-orm";
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

async function hasAlertBeenSent(alertId) {
  const context = await loadPushDbContext();
  if (!context) return true;
  const existing = await context.db.query.sentPushAlertsTable.findFirst({
    where: eq(context.sentPushAlertsTable.alertId, alertId),
  });
  return Boolean(existing);
}

async function markAlertSent(alertId) {
  const context = await loadPushDbContext();
  if (!context) return;
  const { db, sentPushAlertsTable } = context;
  await db.insert(sentPushAlertsTable).values({ alertId }).onConflictDoNothing();
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

export async function sendPushToAllSubscriptions(payload) {
  if (!ensureVapidConfigured()) return { attempted: 0, succeeded: 0, vapidConfigured: false };
  const subscriptions = await getAllSubscriptions();
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
    const result = await sendPushToAllSubscriptions({
      title: alert.title,
      body: alert.summary,
      url: "./alerts/today",
      tag: alert.id,
    });
    if (result?.succeeded > 0) await markAlertSent(alert.id);
    results.push({ id: alert.id, title: alert.title, ...result });
  }
  return { alerts: results };
}

export async function checkAndPushNewAlerts() {
  if (!ensureVapidConfigured()) return;

  const { fetchMergedMetroAlerts } = await import("../metro-notify/alerts.js");
  const alerts = await fetchMergedMetroAlerts();
  const headlineAlerts = alerts.filter(isHeadlineAlert);

  for (const alert of headlineAlerts) {
    if (await hasAlertBeenSent(alert.id)) continue;

    const result = await sendPushToAllSubscriptions({
      title: alert.title || "TransitAlert",
      body: alert.summary,
      url: "./alerts/today",
      tag: alert.id,
    });
    // Only record an alert as "sent" once it actually reached a device.
    // This loop runs continuously from server start, long before anyone
    // may have subscribed yet — marking an alert sent regardless meant
    // every alert that existed before the first real subscriber signed up
    // was permanently skipped and could never be delivered to them.
    if (result?.succeeded > 0) {
      await markAlertSent(alert.id);
    }
  }
}
