import {
  ROLE_OPTIONS,
  getUserByUsernameOrEmail,
  readJsonBody,
  registerUser,
  sendJson,
  setSessionCookie,
} from "../_lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const body = await readJsonBody(req);
  const username = String(body.username || "").trim();
  const normalized = username.toLowerCase();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const role = String(body.role || "").trim();

  if (!username || username.length < 3) {
    sendJson(res, 400, { error: "Username must be at least 3 characters" });
    return;
  }

  if (!password || password.length < 6) {
    sendJson(res, 400, { error: "Password must be at least 6 characters" });
    return;
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    sendJson(res, 400, { error: "A valid email address is required" });
    return;
  }

  if (!ROLE_OPTIONS.includes(role)) {
    sendJson(res, 400, { error: "Please choose a valid role" });
    return;
  }

  const existing = await getUserByUsernameOrEmail(username, email);
  if (existing) {
    sendJson(res, 409, {
      error: existing.username.toLowerCase() === normalized
        ? "That username is already taken"
        : "That email address is already registered",
    });
    return;
  }

  const user = await registerUser({ username, email, password, role });
  setSessionCookie(res, user);
  sendJson(res, 201, {
    authenticated: true,
    user,
    roles: ROLE_OPTIONS,
  });
}
