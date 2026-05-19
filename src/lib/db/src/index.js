import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;

export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;
export const db = pool ? drizzle(pool, { schema }) : null;
export const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

let databaseReadyPromise = null;

export async function ensureDatabaseReady() {
  if (!pool) {
    return false;
  }

  if (!databaseReadyPromise) {
    databaseReadyPromise = (async () => {
      await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS app_users (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          username text NOT NULL UNIQUE,
          email text NOT NULL UNIQUE,
          password_hash text NOT NULL,
          role text NOT NULL DEFAULT 'Traveller',
          is_admin boolean NOT NULL DEFAULT false,
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
          favourite_stops jsonb NOT NULL DEFAULT '[]'::jsonb,
          favourite_routes jsonb NOT NULL DEFAULT '[]'::jsonb,
          selected_map_filters jsonb NOT NULL DEFAULT '{}'::jsonb,
          transport_modes jsonb NOT NULL DEFAULT '["train","vline"]'::jsonb,
          app_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
          updated_at timestamp NOT NULL DEFAULT now()
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS app_config (
          key text PRIMARY KEY,
          value jsonb NOT NULL DEFAULT '{}'::jsonb,
          updated_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
          updated_at timestamp NOT NULL DEFAULT now()
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS marker_overrides (
          id serial PRIMARY KEY,
          marker_type text NOT NULL DEFAULT 'station',
          marker_name text NOT NULL UNIQUE,
          lat double precision NOT NULL,
          lng double precision NOT NULL,
          metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
          updated_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
          updated_at timestamp NOT NULL DEFAULT now()
        );
      `);
      await pool.query(`
        ALTER TABLE user_preferences
        ALTER COLUMN transport_modes SET DEFAULT '["train","vline"]'::jsonb;
      `);
      return true;
    })().catch((error) => {
      databaseReadyPromise = null;
      throw error;
    });
  }

  return databaseReadyPromise;
}

export * from "./schema/index.js";
