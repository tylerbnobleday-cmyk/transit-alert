import { ROLE_OPTIONS, sendJson } from "../_lib/auth";

export default function handler(req, res) {
  sendJson(res, 200, { roles: ROLE_OPTIONS });
}
