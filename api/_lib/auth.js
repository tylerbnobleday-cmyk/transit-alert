import crypto from "node:crypto";

export const ROLE_OPTIONS = [
  "Admin",
  "Traveller",
  "Train Driver",
  "Station Staff",
  "Special",
  "Friend",
  "Bug Tester",
];

const SESSION_COOKIE = "transitalert_session";
const SESSION_SECRET = process.env.AUTH_SESSION_SECRET || process.env.SESSION_SECRET || "transitalert-dev-secret";
const adminUsername = process.env.ADMIN_USERNAME || "tyler";
const adminPassword = process.env.ADMIN_PASSWORD || "AppleJuice";
const adminEmail = `${adminUsername}@transitalert.local`;
let cachedDbContext = undefined;

async function loadDbContext() {
  if (cachedDbContext !== undefined) {
    return cachedDbContext;
  }

  try {
    const [{ db }, schema] = await Promise.all([
      import("../../src/lib/db/src/index.js"),
      import("../../src/lib/db/src/schema/auth.js"),
    ]);

    cachedDbContext = db
      ? {
          db,
          appUsersTable: schema.appUsersTable,
          userPreferencesTable: schema.userPreferencesTable,
          appConfigTable: schema.appConfigTable,
          markerOverridesTable: schema.markerOverridesTable,
        }
      : null;
  } catch {
    cachedDbContext = null;
  }

  return cachedDbContext;
}
const defaultPreferences = {
  favouriteStops: [],
  favouriteRoutes: [],
  selectedMapFilters: {},
  transportModes: ["train", "tram", "bus", "vline"],
  appPreferences: {},
  updatedAt: new Date(),
};

function getFallbackAdminUser() {
  return {
    id: adminUsername.toLowerCase(),
    username: adminUsername,
    email: adminEmail,
    role: "Admin",
    isAdmin: true,
  };
}

function logDbFallback(scope, error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[transitalert-auth] ${scope} falling back: ${message}`);
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function sign(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password, passwordHash) {
  const [salt, existingHash] = String(passwordHash || "").split(":");
  if (!salt || !existingHash) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(existingHash, "hex"), Buffer.from(derived, "hex"));
}

function createSignedSession(user) {
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

function readSignedSession(rawCookie) {
  if (!rawCookie || typeof rawCookie !== "string") return null;
  const [encoded, signature] = rawCookie.split(".");
  if (!encoded || !signature) return null;
  if (sign(encoded) !== signature) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload?.id) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(req) {
  const cookies = {};
  const header = req.headers?.cookie;
  if (!header) return cookies;

  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (!key) continue;
    cookies[key] = decodeURIComponent(value.join("="));
  }
  return cookies;
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : {};
}

export function sendJson(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  if (typeof res.json === "function") {
    res.json(payload);
    return;
  }
  res.send(payload);
}

export function setSessionCookie(res, user, maxAgeSeconds = 60 * 60 * 24 * 7) {
  const token = createSignedSession(user);
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}; Secure`,
  );
}

export function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`,
  );
}

export function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    isAdmin: Boolean(user.isAdmin),
  };
}

export async function ensureAdminAccount() {
  try {
    const context = await loadDbContext();
    if (!context) return;
    const { db, appUsersTable } = context;
    if (!db) return;
    const existing = await db.query.appUsersTable.findFirst({
      where: (fields, operators) => operators.eq(fields.username, adminUsername),
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
  } catch (error) {
    logDbFallback("ensureAdminAccount", error);
  }
}

export async function getSessionUser(req) {
  await ensureAdminAccount();
  const cookies = parseCookies(req);
  const parsed = readSignedSession(cookies[SESSION_COOKIE] || "");
  if (!parsed?.id) return null;

  try {
    const context = await loadDbContext();
    const db = context?.db ?? null;
    if (!db) {
      throw new Error("Database unavailable");
    }

    const user = await db.query.appUsersTable.findFirst({
      where: (fields, operators) => operators.eq(fields.id, parsed.id),
    });
    if (!user) return null;

    return sanitizeUser(user);
  } catch (error) {
    logDbFallback("getSessionUser", error);
    if (parsed.id === "guest-session" || parsed.role === "Guest") {
      return {
        id: "guest-session",
        username: "Guest",
        email: "guest@transitalert.local",
        role: "Guest",
        isAdmin: false,
      };
    }
    if (
      String(parsed.username || "").toLowerCase() === adminUsername.toLowerCase() ||
      String(parsed.id || "").toLowerCase() === adminUsername.toLowerCase()
    ) {
      return getFallbackAdminUser();
    }
    return null;
  }
}

export async function authenticateUser(username, password) {
  await ensureAdminAccount();
  try {
    const context = await loadDbContext();
    const db = context?.db ?? null;
    if (!db) {
      throw new Error("Database unavailable");
    }
    const user = await db.query.appUsersTable.findFirst({
      where: (fields, operators) => operators.eq(fields.username, username),
    });
    if (!user) return null;
    return verifyPassword(password, user.passwordHash) ? sanitizeUser(user) : null;
  } catch (error) {
    logDbFallback("authenticateUser", error);
    if (username.trim().toLowerCase() === adminUsername.toLowerCase() && password === adminPassword) {
      return getFallbackAdminUser();
    }
    return null;
  }
}

export async function registerUser(input) {
  const context = await loadDbContext();
  const db = context?.db ?? null;
  const userPreferencesTable = context?.userPreferencesTable;
  const appUsersTable = context?.appUsersTable;
  if (!db) {
    throw new Error("Registration is unavailable until DATABASE_URL is configured.");
  }
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

export async function getUserByUsernameOrEmail(username, email) {
  try {
    const context = await loadDbContext();
    const db = context?.db ?? null;
    if (!db) {
      throw new Error("Database unavailable");
    }
    const existingByUsername = await db.query.appUsersTable.findFirst({
      where: (fields, operators) => operators.eq(fields.username, username),
    });
    if (existingByUsername) return existingByUsername;

    return db.query.appUsersTable.findFirst({
      where: (fields, operators) => operators.eq(fields.email, email),
    });
  } catch (error) {
    logDbFallback("getUserByUsernameOrEmail", error);
    const matchesAdmin =
      username.trim().toLowerCase() === adminUsername.toLowerCase() ||
      email.trim().toLowerCase() === adminEmail.toLowerCase();
    return matchesAdmin ? getFallbackAdminUser() : null;
  }
}

export async function getUserPreferences(userId) {
  try {
    const context = await loadDbContext();
    const db = context?.db ?? null;
    if (!db) {
      throw new Error("Database unavailable");
    }
    const { userPreferencesTable } = context;
    const existing = await db.query.userPreferencesTable.findFirst({
      where: (fields, operators) => operators.eq(fields.userId, userId),
    });

    if (existing) return existing;

    const [created] = await db.insert(userPreferencesTable).values({ userId }).returning();
    return created;
  } catch (error) {
    logDbFallback("getUserPreferences", error);
    return { ...defaultPreferences, userId };
  }
}

export async function upsertUserPreferences(userId, patch) {
  try {
    const context = await loadDbContext();
    const db = context?.db ?? null;
    if (!db) {
      throw new Error("Database unavailable");
    }
    const { userPreferencesTable } = context;
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
  } catch (error) {
    logDbFallback("upsertUserPreferences", error);
    return {
      userId,
      favouriteStops: patch.favouriteStops ?? defaultPreferences.favouriteStops,
      favouriteRoutes: patch.favouriteRoutes ?? defaultPreferences.favouriteRoutes,
      selectedMapFilters: patch.selectedMapFilters ?? defaultPreferences.selectedMapFilters,
      transportModes: patch.transportModes ?? defaultPreferences.transportModes,
      appPreferences: patch.appPreferences ?? defaultPreferences.appPreferences,
      updatedAt: new Date(),
    };
  }
}

export async function getAppConfig() {
  try {
    const context = await loadDbContext();
    const db = context?.db ?? null;
    if (!db) return {};
    const { appConfigTable } = context;
    const rows = await db.select().from(appConfigTable);
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  } catch (error) {
    logDbFallback("getAppConfig", error);
    return {};
  }
}

export async function setAppConfigValue(key, value, updatedBy) {
  try {
    const context = await loadDbContext();
    const db = context?.db ?? null;
    if (!db) {
      throw new Error("Database unavailable");
    }
    const { appConfigTable } = context;
    const [row] = await db
      .insert(appConfigTable)
      .values({ key, value, updatedBy, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appConfigTable.key,
        set: { value, updatedBy, updatedAt: new Date() },
      })
      .returning();
    return row;
  } catch (error) {
    logDbFallback("setAppConfigValue", error);
    return { key, value, updatedBy, updatedAt: new Date() };
  }
}

export async function listMarkerOverrides() {
  try {
    const context = await loadDbContext();
    const db = context?.db ?? null;
    if (!db) return [];
    const { markerOverridesTable } = context;
    return db.select().from(markerOverridesTable);
  } catch (error) {
    logDbFallback("listMarkerOverrides", error);
    return [];
  }
}

export async function saveMarkerOverrides(overrides, updatedBy) {
  try {
    const context = await loadDbContext();
    const db = context?.db ?? null;
    if (!db) {
      throw new Error("Database unavailable");
    }
    const { markerOverridesTable } = context;
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
  } catch (error) {
    logDbFallback("saveMarkerOverrides", error);
    return overrides.map((override, index) => ({
      id: index + 1,
      markerName: override.markerName,
      markerType: override.markerType ?? "station",
      lat: override.lat,
      lng: override.lng,
      metadata: override.metadata ?? {},
      updatedBy,
      updatedAt: new Date(),
    }));
  }
}
