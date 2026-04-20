import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../../src/lib/db/src/index";
import { appUsersTable, userPreferencesTable, appConfigTable, markerOverridesTable } from "../../src/lib/db/src/schema";

export const ROLE_OPTIONS = [
  "Admin",
  "Traveller",
  "Train Driver",
  "DAO",
  "Fleet Controller",
  "Signaller",
  "Station Staff",
  "Authorised Officer",
  "Special",
  "Friend",
  "Debug",
  "Bug Tester",
] as const;

const SESSION_COOKIE = "transitalert_session";
const SESSION_SECRET = process.env.AUTH_SESSION_SECRET || process.env.SESSION_SECRET || "transitalert-dev-secret";
const adminUsername = process.env.ADMIN_USERNAME || "tyler";
const adminPassword = process.env.ADMIN_PASSWORD || "AppleJuice";
const adminEmail = `${adminUsername}@transitalert.local`;

export type SessionUser = {
  id: string;
  username: string;
  email: string;
  role: string;
  isAdmin: boolean;
};

type CookieRequest = {
  headers?: {
    cookie?: string;
  };
  body?: unknown;
  method?: string;
};

type CookieResponse = {
  status: (code: number) => CookieResponse;
  setHeader: (name: string, value: string) => void;
  send: (body: unknown) => void;
  json?: (body: unknown) => void;
};

function base64url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function sign(value: string) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

function createPasswordHash(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, passwordHash: string) {
  const [salt, existingHash] = passwordHash.split(":");
  if (!salt || !existingHash) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(existingHash, "hex"), Buffer.from(derived, "hex"));
}

function createSignedSession(user: SessionUser) {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    isAdmin: Boolean(user.isAdmin),
    iat: Date.now(),
  };
  const encoded = base64url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

function readSignedSession(rawCookie: string) {
  if (!rawCookie || typeof rawCookie !== "string") return null;
  const [encoded, signature] = rawCookie.split(".");
  if (!encoded || !signature) return null;
  if (sign(encoded) !== signature) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload?.id) return null;
    return payload as SessionUser & { iat?: number };
  } catch {
    return null;
  }
}

export function parseCookies(req: CookieRequest) {
  const cookies: Record<string, string> = {};
  const header = req.headers?.cookie;
  if (!header) return cookies;

  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (!key) continue;
    cookies[key] = decodeURIComponent(value.join("="));
  }
  return cookies;
}

export async function readJsonBody<T>(req: AsyncIterable<Uint8Array> & CookieRequest): Promise<T> {
  if (req.body && typeof req.body === "object") {
    return req.body as T;
  }
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return (raw ? JSON.parse(raw) : {}) as T;
}

export function sendJson(res: CookieResponse, status: number, payload: unknown) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  if (typeof res.json === "function") {
    res.json(payload);
    return;
  }
  res.send(payload);
}

export function setSessionCookie(res: CookieResponse, user: SessionUser, maxAgeSeconds = 60 * 60 * 24 * 7) {
  const token = createSignedSession(user);
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}; Secure`,
  );
}

export function clearSessionCookie(res: CookieResponse) {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`,
  );
}

export async function ensureAdminAccount() {
  const existing = await db.query.appUsersTable.findFirst({
    where: eq(appUsersTable.username, adminUsername),
  });

  if (!existing) {
    await db.insert(appUsersTable).values({
      username: adminUsername,
      email: adminEmail,
      passwordHash: createPasswordHash(adminPassword),
      role: "Admin",
      isAdmin: true,
    });
  }
}

export async function getSessionUser(req: CookieRequest) {
  await ensureAdminAccount();
  const cookies = parseCookies(req);
  const parsed = readSignedSession(cookies[SESSION_COOKIE] || "");
  if (!parsed?.id) return null;

  const user = await db.query.appUsersTable.findFirst({
    where: eq(appUsersTable.id, parsed.id),
  });
  if (!user) return null;

  return sanitizeUser(user);
}

export function sanitizeUser(user: {
  id: string;
  username: string;
  email: string;
  role: string;
  isAdmin: boolean;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    isAdmin: Boolean(user.isAdmin),
  };
}

export async function authenticateUser(username: string, password: string) {
  await ensureAdminAccount();
  const user = await db.query.appUsersTable.findFirst({
    where: eq(appUsersTable.username, username),
  });
  if (!user) return null;
  return verifyPassword(password, user.passwordHash) ? sanitizeUser(user) : null;
}

export async function registerUser(input: { username: string; email: string; password: string; role: string }) {
  const [user] = await db
    .insert(appUsersTable)
    .values({
      username: input.username,
      email: input.email,
      passwordHash: createPasswordHash(input.password),
      role: input.role,
      isAdmin: false,
    })
    .returning();

  await db.insert(userPreferencesTable).values({
    userId: user.id,
  });

  return sanitizeUser(user);
}

export async function getUserByUsernameOrEmail(username: string, email: string) {
  return db.query.appUsersTable.findFirst({
    where: eq(appUsersTable.username, username),
  }).then(async (existingByUsername) => {
    if (existingByUsername) return existingByUsername;
    return db.query.appUsersTable.findFirst({
      where: eq(appUsersTable.email, email),
    });
  });
}

export async function getUserPreferences(userId: string) {
  const existing = await db.query.userPreferencesTable.findFirst({
    where: eq(userPreferencesTable.userId, userId),
  });

  if (existing) return existing;

  const [created] = await db.insert(userPreferencesTable).values({ userId }).returning();
  return created;
}

export async function upsertUserPreferences(
  userId: string,
  patch: Partial<{
    favouriteStops: string[];
    favouriteRoutes: string[];
    selectedMapFilters: Record<string, boolean>;
    transportModes: string[];
    appPreferences: Record<string, unknown>;
  }>,
) {
  const existing = await getUserPreferences(userId);
  const [updated] = await db
    .insert(userPreferencesTable)
    .values({
      userId,
      favouriteStops: patch.favouriteStops ?? existing.favouriteStops,
      favouriteRoutes: patch.favouriteRoutes ?? existing.favouriteRoutes,
      selectedMapFilters: patch.selectedMapFilters ?? existing.selectedMapFilters,
      transportModes: patch.transportModes ?? existing.transportModes,
      appPreferences: patch.appPreferences ?? existing.appPreferences,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userPreferencesTable.userId,
      set: {
        favouriteStops: patch.favouriteStops ?? existing.favouriteStops,
        favouriteRoutes: patch.favouriteRoutes ?? existing.favouriteRoutes,
        selectedMapFilters: patch.selectedMapFilters ?? existing.selectedMapFilters,
        transportModes: patch.transportModes ?? existing.transportModes,
        appPreferences: patch.appPreferences ?? existing.appPreferences,
        updatedAt: new Date(),
      },
    })
    .returning();

  return updated;
}

export async function getAppConfig() {
  const rows = await db.select().from(appConfigTable);
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function setAppConfigValue(key: string, value: Record<string, unknown>, updatedBy?: string) {
  const [row] = await db
    .insert(appConfigTable)
    .values({ key, value, updatedBy, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appConfigTable.key,
      set: { value, updatedBy, updatedAt: new Date() },
    })
    .returning();
  return row;
}

export async function listMarkerOverrides() {
  return db.select().from(markerOverridesTable);
}

export async function saveMarkerOverrides(
  overrides: Array<{ markerName: string; markerType?: string; lat: number; lng: number; metadata?: Record<string, unknown> }>,
  updatedBy?: string,
) {
  const saved = [];
  for (const override of overrides) {
    const [row] = await db
      .insert(markerOverridesTable)
      .values({
        markerName: override.markerName,
        markerType: override.markerType ?? "station",
        lat: override.lat,
        lng: override.lng,
        metadata: override.metadata ?? {},
        updatedBy,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: markerOverridesTable.markerName,
        set: {
          lat: override.lat,
          lng: override.lng,
          markerType: override.markerType ?? "station",
          metadata: override.metadata ?? {},
          updatedBy,
          updatedAt: new Date(),
        },
      })
      .returning();
    saved.push(row);
  }
  return saved;
}
