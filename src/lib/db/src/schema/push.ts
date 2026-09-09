import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { appUsersTable } from "./auth";

export const pushSubscriptionsTable = pgTable("push_subscriptions", {
  endpoint: text("endpoint").primaryKey(),
  p256dh: text("p256dh").notNull(),
  authKey: text("auth_key").notNull(),
  userId: text("user_id").references(() => appUsersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
});

export const sentPushAlertsTable = pgTable("sent_push_alerts", {
  alertId: text("alert_id").primaryKey(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});
