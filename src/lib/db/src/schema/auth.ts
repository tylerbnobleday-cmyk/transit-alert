import {
  boolean,
  doublePrecision,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const appUsersTable = pgTable("app_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("Traveller"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userPreferencesTable = pgTable("user_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => appUsersTable.id, { onDelete: "cascade" }),
  favouriteStops: jsonb("favourite_stops").$type<string[]>().notNull().default([]),
  favouriteRoutes: jsonb("favourite_routes").$type<string[]>().notNull().default([]),
  selectedMapFilters: jsonb("selected_map_filters").$type<Record<string, boolean>>().notNull().default({}),
  transportModes: jsonb("transport_modes").$type<string[]>().notNull().default(["train", "tram", "bus", "vline"]),
  appPreferences: jsonb("app_preferences").$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const appConfigTable = pgTable("app_config", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull().default({}),
  updatedBy: uuid("updated_by").references(() => appUsersTable.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const markerOverridesTable = pgTable("marker_overrides", {
  id: serial("id").primaryKey(),
  markerType: text("marker_type").notNull().default("station"),
  markerName: text("marker_name").notNull().unique(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  updatedBy: uuid("updated_by").references(() => appUsersTable.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
