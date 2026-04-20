import {
  getSessionUser,
  getUserPreferences,
  readJsonBody,
  sendJson,
  upsertUserPreferences,
} from "../_lib/auth.js";

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

export default async function handler(req, res) {
  const user = await getSessionUser(req);
  if (!user || user.role === "Guest") {
    sendJson(res, 401, { error: "Sign in to access account preferences" });
    return;
  }

  const slug = Array.isArray(req.query?.slug) ? req.query.slug : req.query?.slug ? [req.query.slug] : [];
  const action = slug[0] || "";

  if (!action) {
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
    return;
  }

  if (action === "merge") {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    const body = await readJsonBody(req);
    const existing = await getUserPreferences(user.id);
    const merged = await upsertUserPreferences(user.id, {
      favouriteStops: uniq([...(existing.favouriteStops ?? []), ...((body.favouriteStops ?? []) || [])]),
      favouriteRoutes: uniq([...(existing.favouriteRoutes ?? []), ...((body.favouriteRoutes ?? []) || [])]),
      transportModes: uniq([...(existing.transportModes ?? []), ...((body.transportModes ?? []) || [])]),
      selectedMapFilters: {
        ...(existing.selectedMapFilters ?? {}),
        ...((body.selectedMapFilters ?? {}) || {}),
      },
      appPreferences: {
        ...(existing.appPreferences ?? {}),
        ...((body.appPreferences ?? {}) || {}),
      },
    });

    sendJson(res, 200, { preferences: merged });
    return;
  }

  sendJson(res, 404, { error: "Unknown preferences action" });
}
