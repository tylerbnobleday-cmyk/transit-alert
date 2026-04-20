import { clearSessionCookie, sendJson } from "../_lib/auth";

export default function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  clearSessionCookie(res);
  sendJson(res, 200, { success: true });
}
