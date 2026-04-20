import { ROLE_OPTIONS, sendJson } from "../_lib/auth.js";

export default function handler(req, res) {
  sendJson(res, 200, { roles: ROLE_OPTIONS });
}
