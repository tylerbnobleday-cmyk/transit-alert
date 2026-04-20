import { getAppConfig, getSessionUser, readJsonBody, sendJson, setAppConfigValue } from "../_lib/auth";

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

  if (req.method === "GET") {
    const config = await getAppConfig();
    sendJson(res, 200, { config });
    return;
  }

  if (req.method === "POST" || req.method === "PUT") {
    const body = await readJsonBody(req);
    const entries = Object.entries(body?.config ?? {});

    for (const [, value] of entries) {
      const record = value as Record<string, unknown>;
      const maybeUrl = typeof record?.url === "string" ? record.url : "";
      if (!isValidUrl(maybeUrl)) {
        sendJson(res, 400, { error: `Invalid URL: ${maybeUrl}` });
        return;
      }
    }

    for (const [key, value] of entries) {
      await setAppConfigValue(key, value as Record<string, unknown>, user.id);
    }

    const config = await getAppConfig();
    sendJson(res, 200, { config });
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
}
