import { getSessionUser, getUserPreferences, readJsonBody, sendJson, upsertUserPreferences } from "../_lib/auth";

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

export default async function handler(req, res) {
  const user = await getSessionUser(req);
  if (!user || user.role === "Guest") {
    sendJson(res, 401, { error: "Sign in to merge account preferences" });
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const body = await readJsonBody(req);
  const existing = await getUserPreferences(user.id);
  const merged = await upsertUserPreferences(user.id, {
    favouriteStops: uniq([...(existing.favouriteStops ?? []), ...((body.favouriteStops ?? []) as string[])]),
    favouriteRoutes: uniq([...(existing.favouriteRoutes ?? []), ...((body.favouriteRoutes ?? []) as string[])]),
    transportModes: uniq([...(existing.transportModes ?? []), ...((body.transportModes ?? []) as string[])]),
    selectedMapFilters: {
      ...(existing.selectedMapFilters ?? {}),
      ...((body.selectedMapFilters ?? {}) as Record<string, boolean>),
    },
    appPreferences: {
      ...(existing.appPreferences ?? {}),
      ...((body.appPreferences ?? {}) as Record<string, unknown>),
    },
  });

  sendJson(res, 200, { preferences: merged });
}
