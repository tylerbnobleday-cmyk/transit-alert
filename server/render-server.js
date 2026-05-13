import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import adminHandler from "../api/admin/[resource].js";
import authHandler from "../api/auth/[action].js";
import consistHandler from "../api/consist/[consist].js";
import metroNotifyAlertsHandler from "../api/metro-notify/alerts.js";
import preferencesHandler from "../api/preferences/[[...slug]].js";
import liveBusesHandler from "../api/ptv/live-buses.js";
import liveTrainsHandler from "../api/ptv/live-trains.js";
import liveTramsHandler from "../api/ptv/live-trams.js";
import reportsHandler from "../api/reports/[[...slug]].js";
import telegramStatusHandler from "../api/telegram/status.js";
import { ensureDatabaseReady, isDatabaseConfigured } from "../src/lib/db/src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, "../dist");
const INDEX_FILE = path.join(DIST_DIR, "index.html");
const PORT = Number(process.env.PORT || 3000);

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

function createResponseShim(res) {
  return {
    statusCode: 200,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    json(payload) {
      if (!this.headers["Content-Type"] && !this.headers["content-type"]) {
        this.headers["Content-Type"] = "application/json; charset=utf-8";
      }
      this.send(JSON.stringify(payload));
      return this;
    },
    send(payload) {
      const body =
        typeof payload === "string" || Buffer.isBuffer(payload)
          ? payload
          : JSON.stringify(payload);
      res.writeHead(this.statusCode, this.headers);
      res.end(body);
      return this;
    },
  };
}

function getApiResolution(urlObject) {
  const segments = urlObject.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  if (segments[0] !== "api") {
    return null;
  }

  const group = segments[1] || "";
  const remainder = segments.slice(2);
  const query = Object.fromEntries(urlObject.searchParams.entries());

  switch (group) {
    case "auth":
      return { handler: authHandler, query: { ...query, action: remainder[0] || "" } };
    case "preferences":
      return { handler: preferencesHandler, query: { ...query, slug: remainder } };
    case "reports":
      return { handler: reportsHandler, query: { ...query, slug: remainder } };
    case "admin":
      return { handler: adminHandler, query: { ...query, resource: remainder[0] || "" } };
    case "consist":
      return { handler: consistHandler, query: { ...query, consist: remainder[0] || "" } };
    case "metro-notify":
      return remainder[0] === "alerts" ? { handler: metroNotifyAlertsHandler, query } : null;
    case "ptv":
      if (remainder[0] === "live-buses") return { handler: liveBusesHandler, query };
      if (remainder[0] === "live-trains") return { handler: liveTrainsHandler, query };
      if (remainder[0] === "live-trams") return { handler: liveTramsHandler, query };
      return null;
    case "telegram":
      return remainder[0] === "status" ? { handler: telegramStatusHandler, query } : null;
    default:
      return null;
  }
}

function getStaticPath(urlObject) {
  const requestedPath = decodeURIComponent(urlObject.pathname === "/" ? "/index.html" : urlObject.pathname);
  const normalizedPath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  return path.join(DIST_DIR, normalizedPath);
}

async function serveStaticFile(filePath, res) {
  const fileStats = await stat(filePath);
  if (!fileStats.isFile()) {
    return false;
  }

  const extension = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[extension] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": contentType });
  createReadStream(filePath).pipe(res);
  return true;
}

async function serveSpa(urlObject, res) {
  const staticPath = getStaticPath(urlObject);
  const relativeTarget = path.relative(DIST_DIR, staticPath);

  if (!relativeTarget.startsWith("..") && existsSync(staticPath)) {
    try {
      const served = await serveStaticFile(staticPath, res);
      if (served) {
        return;
      }
    } catch {
      // Fall through to SPA index.
    }
  }

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  createReadStream(INDEX_FILE).pipe(res);
}

const server = createServer(async (req, res) => {
  const urlObject = new URL(req.url || "/", `http://${req.headers.host || `127.0.0.1:${PORT}`}`);
  const resolvedApi = getApiResolution(urlObject);

  if (resolvedApi) {
    req.query = resolvedApi.query;
    req.url = `${urlObject.pathname}${urlObject.search}`;

    try {
      await resolvedApi.handler(req, createResponseShim(res));
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Unexpected server error" }));
    }
    return;
  }

  try {
    await serveSpa(urlObject, res);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Failed to serve application");
  }
});

async function start() {
  if (isDatabaseConfigured) {
    try {
      await ensureDatabaseReady();
      console.log("[transitalert-db] Database ready");
    } catch (error) {
      console.error("[transitalert-db] Database bootstrap failed", error);
    }
  } else {
    console.warn("[transitalert-db] DATABASE_URL is not configured");
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`TransitAlert Render server listening on ${PORT}`);
  });
}

void start();
