import { ROLE_OPTIONS, sendJson, setSessionCookie } from "../_lib/auth.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const guestUser = {
    id: "guest-session",
    username: "Guest",
    email: "guest@transitalert.local",
    role: "Guest",
    isAdmin: false,
  };

  setSessionCookie(res, guestUser, 60 * 60 * 24 * 2);
  sendJson(res, 200, {
    authenticated: true,
    user: guestUser,
    roles: ROLE_OPTIONS,
  });
}
