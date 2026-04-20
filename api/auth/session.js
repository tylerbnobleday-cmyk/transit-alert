import { ROLE_OPTIONS, getSessionUser, sendJson } from "../_lib/auth";

export default async function handler(req, res) {
  const user = await getSessionUser(req);
  sendJson(res, 200, {
    authenticated: Boolean(user),
    user: user ?? null,
    roles: ROLE_OPTIONS,
  });
}
