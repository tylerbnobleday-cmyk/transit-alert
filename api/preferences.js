import { getSessionUser, getUserPreferences, readJsonBody, sendJson, upsertUserPreferences } from "./_lib/auth";

export default async function handler(req, res) {
  const user = await getSessionUser(req);
  if (!user || user.role === "Guest") {
    sendJson(res, 401, { error: "Sign in to access account preferences" });
    return;
  }

  if (req.method === "GET") {
    const preferences = await getUserPreferences(user.id);
    sendJson(res, 200, { preferences });
    return;
  }

  if (req.method === "POST" || req.method === "PUT") {
    const body = await readJsonBody(req);
    const preferences = await upsertUserPreferences(user.id, body);
    sendJson(res, 200, { preferences });
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
}
