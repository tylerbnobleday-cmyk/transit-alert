import {
  getAppConfig,
  getSessionUser,
  listApprovedDebugTesters,
  listAccounts,
  listMarkerOverrides,
  readJsonBody,
  ROLE_OPTIONS,
  saveMarkerOverrides,
  sendJson,
  setAppConfigValue,
  updateAccountAccess,
} from "../_lib/auth.js";
import { isEmailConfigured, sendWelcomeEmail } from "../_lib/mailer.js";

function isValidUrl(value) {
  if (!value) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  const user = await getSessionUser(req);
  if (!user?.isAdmin) {
    sendJson(res, 403, { error: "Admin access required" });
    return;
  }

  const resource = Array.isArray(req.query?.resource) ? req.query.resource[0] : req.query?.resource;

  if (resource === "markers") {
    if (req.method === "GET") {
      const overrides = await listMarkerOverrides();
      sendJson(res, 200, { overrides });
      return;
    }

    if (req.method === "POST" || req.method === "PUT") {
      const body = await readJsonBody(req);
      const overrides = Array.isArray(body?.overrides) ? body.overrides : [];
      const saved = await saveMarkerOverrides(overrides, user.id);
      sendJson(res, 200, { overrides: saved });
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (resource === "settings") {
    if (req.method === "GET") {
      const config = await getAppConfig();
      sendJson(res, 200, { config });
      return;
    }

    if (req.method === "POST" || req.method === "PUT") {
      const body = await readJsonBody(req);
      const entries = Object.entries(body?.config ?? {});

      for (const [, value] of entries) {
        const record = value;
        const maybeUrl = typeof record?.url === "string" ? record.url : "";
        if (!isValidUrl(maybeUrl)) {
          sendJson(res, 400, { error: `Invalid URL: ${maybeUrl}` });
          return;
        }
      }

      for (const [key, value] of entries) {
        await setAppConfigValue(key, value, user.id);
      }

      const config = await getAppConfig();
      sendJson(res, 200, { config });
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (resource === "accounts") {
    if (req.method === "GET") {
      const accounts = await listAccounts();
      const approvedDebugTesters = listApprovedDebugTesters();
      sendJson(res, 200, { accounts, approvedDebugTesters });
      return;
    }

    if (req.method === "POST" || req.method === "PUT") {
      const body = await readJsonBody(req);
      const accountId = String(body?.accountId || "").trim();
      const patch = body?.patch ?? {};

      if (!accountId) {
        sendJson(res, 400, { error: "Account id is required." });
        return;
      }

      const role = String(patch.role || "").trim();
      if (!ROLE_OPTIONS.includes(role)) {
        sendJson(res, 400, { error: "Please choose a valid role." });
        return;
      }

      try {
        const account = await updateAccountAccess(accountId, {
          role,
          isAdmin: Boolean(patch.isAdmin),
          isPremium: Boolean(patch.isPremium),
        });
        sendJson(res, 200, { account });
      } catch (error) {
        sendJson(res, 503, {
          error: error instanceof Error ? error.message : "Failed to update account.",
        });
      }
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  // Deliberately a separate, explicit admin-triggered action rather than
  // something that runs automatically — a bulk email to every registered
  // account is a real, hard-to-reverse action affecting real people, so it
  // only ever fires when an admin clicks the button for it.
  if (resource === "broadcast-welcome") {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    if (!isEmailConfigured()) {
      sendJson(res, 503, { error: "Email isn't configured yet — set RESEND_API_KEY before sending a broadcast." });
      return;
    }

    const accounts = await listAccounts();
    const results = await Promise.all(
      accounts
        .filter((account) => account.email && account.role !== "Guest")
        .map(async (account) => ({ email: account.email, ...(await sendWelcomeEmail(account)) })),
    );
    const sent = results.filter((result) => result.sent).length;
    sendJson(res, 200, { sent, failed: results.length - sent, total: results.length });
    return;
  }

  sendJson(res, 404, { error: "Unknown admin resource" });
}
