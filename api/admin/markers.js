import { getSessionUser, listMarkerOverrides, readJsonBody, saveMarkerOverrides, sendJson } from "../_lib/auth.js";

export default async function handler(req, res) {
  const user = await getSessionUser(req);
  if (!user?.isAdmin) {
    sendJson(res, 403, { error: "Admin access required" });
    return;
  }

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
}
