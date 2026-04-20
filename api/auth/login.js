import {
  ROLE_OPTIONS,
  authenticateUser,
  readJsonBody,
  sendJson,
  setSessionCookie,
} from "../_lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const body = await readJsonBody(req);
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  if (!username) {
    sendJson(res, 400, { error: "Username is required" });
    return;
  }

  const user = await authenticateUser(username, password);
  if (!user) {
    sendJson(res, 401, { error: "Invalid username or password" });
    return;
  }

  setSessionCookie(res, user);
  sendJson(res, 200, {
    authenticated: true,
    user,
    roles: ROLE_OPTIONS,
  });
}
