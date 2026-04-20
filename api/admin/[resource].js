import {
  getAppConfig,
  getSessionUser,
  listMarkerOverrides,
  readJsonBody,
  saveMarkerOverrides,
  sendJson,
  setAppConfigValue,
} from "../_lib/auth.js";

function isValidUrl(value) {
  if (!value) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  const user = await getSessionUser(req);
  if (!user?.isAdmin) {
    sendJson(res, 403, { error: "Admin access required" });
    return;
  }

  const resource = Array.isArray(req.query?.resource) ? req.query.resource[0] : req.query?.resource;

  if (resource === "markers") {
    if (req.method === "GET") {
      const overrides = await listMarkerOverrides();
      sendJson(res, 200, { overrides });
      return;
    }

    if (req.method === "POST" || req.method === "PUT") {
      const body = await readJsonBody(req);
      const overrides = Array.isArray(body?.overrides) ? body.overrides : [];
      const saved = await saveMarkerOverrides(overrides, user.id);
      sendJson(res, 200, { overrides: saved });
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (resource === "settings") {
    if (req.method === "GET") {
      const config = await getAppConfig();
      sendJson(res, 200, { config });
      return;
    }

    if (req.method === "POST" || req.method === "PUT") {
      const body = await readJsonBody(req);
      const entries = Object.entries(body?.config ?? {});

      for (const [, value] of entries) {
        const record = value;
        const maybeUrl = typeof record?.url === "string" ? record.url : "";
        if (!isValidUrl(maybeUrl)) {
          sendJson(res, 400, { error: `Invalid URL: ${maybeUrl}` });
          return;
        }
      }

      for (const [key, value] of entries) {
        await setAppConfigValue(key, value, user.id);
      }

      const config = await getAppConfig();
      sendJson(res, 200, { config });
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  sendJson(res, 404, { error: "Unknown admin resource" });
}
