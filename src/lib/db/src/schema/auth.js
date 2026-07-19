import {
  boolean,
  doublePrecision,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const appUsersTable = pgTable("app_users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("Traveller"),
  isAdmin: boolean("is_admin").notNull().default(false),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userPreferencesTable = pgTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => appUsersTable.id, { onDelete: "cascade" }),
  favouriteStops: jsonb("favourite_stops").notNull().default([]),
  favouriteRoutes: jsonb("favourite_routes").notNull().default([]),
  selectedMapFilters: jsonb("selected_map_filters").notNull().default({}),
  transportModes: jsonb("transport_modes").notNull().default(["train", "vline"]),
  appPreferences: jsonb("app_preferences").notNull().default({}),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const appConfigTable = pgTable("app_config", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull().default({}),
  updatedBy: text("updated_by").references(() => appUsersTable.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const markerOverridesTable = pgTable("marker_overrides", {
  id: serial("id").primaryKey(),
  markerType: text("marker_type").notNull().default("station"),
  markerName: text("marker_name").notNull().unique(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  updatedBy: text("updated_by").references(() => appUsersTable.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
