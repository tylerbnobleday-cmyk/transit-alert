import {
  consumeAuthRateLimit,
  getAccountStorageStatus,
  getRegistrationPhase,
  isDatabaseConfigured,
  ROLE_OPTIONS,
  authenticateUser,
  clearSessionCookie,
  getSessionUser,
  getUserByUsernameOrEmail,
  isApprovedDebugTester,
  readJsonBody,
  registerUser,
  sendJson,
  setSessionCookie,
} from "../_lib/auth.js";

export default async function handler(req, res) {
  const action = Array.isArray(req.query?.action) ? req.query.action[0] : req.query?.action;
  const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,32}$/;

  const rejectIfRateLimited = (scope, options) => {
    const result = consumeAuthRateLimit(req, scope, options);
    if (!result.allowed) {
      res.setHeader("Retry-After", String(result.retryAfterSeconds));
      sendJson(res, 429, { error: "Too many attempts. Please wait a moment and try again." });
      return true;
    }
    return false;
  };

  if (action === "session") {
    const user = await getSessionUser(req);
    const storageStatus = await getAccountStorageStatus();
    sendJson(res, 200, {
      authenticated: Boolean(user),
      user: user ?? null,
      roles: ROLE_OPTIONS,
      databaseConfigured: storageStatus.databaseConfigured,
      accountStorage: storageStatus.accountStorage,
    });
    return;
  }

  if (action === "roles") {
    sendJson(res, 200, {
      roles: ROLE_OPTIONS,
      publicRoles: ["Traveller"],
      registrationPhase: getRegistrationPhase(),
      databaseConfigured: isDatabaseConfigured(),
    });
    return;
  }

  if (action === "guest") {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    if (rejectIfRateLimited("guest-session", { limit: 15, windowMs: 10 * 60 * 1000 })) {
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
    return;
  }

  if (action === "logout") {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    clearSessionCookie(res);
    sendJson(res, 200, { success: true });
    return;
  }

  if (action === "login") {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    if (rejectIfRateLimited("login", { limit: 12, windowMs: 10 * 60 * 1000 })) {
      return;
    }

    const body = await readJsonBody(req);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (!username) {
      sendJson(res, 400, { error: "Username is required" });
      return;
    }
    if (!USERNAME_PATTERN.test(username)) {
      sendJson(res, 400, { error: "Username format is invalid" });
      return;
    }
    if (!isDatabaseConfigured() && username.trim().toLowerCase() !== String(process.env.ADMIN_USERNAME || "admin").trim().toLowerCase()) {
      sendJson(res, 503, {
        error: "Account database is not configured yet. Ask an admin to finish database setup before signing in.",
      });
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
    return;
  }

  if (action === "register") {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    if (rejectIfRateLimited("register", { limit: 6, windowMs: 30 * 60 * 1000 })) {
      return;
    }

    const body = await readJsonBody(req);
    const username = String(body.username || "").trim();
    const normalized = username.toLowerCase();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const requestedRole = String(body.role || "Traveller").trim();
    const registrationPhase = getRegistrationPhase();
    if (!isDatabaseConfigured()) {
      sendJson(res, 503, {
        error: "Registration is disabled until the account database is configured.",
      });
      return;
    }

    if (!username || username.length < 3) {
      sendJson(res, 400, { error: "Username must be at least 3 characters" });
      return;
    }
    if (!USERNAME_PATTERN.test(username)) {
      sendJson(res, 400, { error: "Username must use only letters, numbers, dots, dashes, or underscores" });
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

    if (!ROLE_OPTIONS.includes(requestedRole)) {
      sendJson(res, 400, { error: "Please choose a valid role" });
      return;
    }

    const approvedTester = isApprovedDebugTester(username, email);
    if (registrationPhase !== "public" && !approvedTester) {
      sendJson(res, 403, {
        error:
          "Registration is currently limited to approved debug testers. Public Traveller sign-ups open in version 1.0 after Tyler approves access.",
      });
      return;
    }

    if (!approvedTester && requestedRole !== "Traveller") {
      sendJson(res, 403, {
        error: "New public accounts can only start as Traveller. Staff, tester, and premium roles are approved manually.",
      });
      return;
    }

    const existing = await getUserByUsernameOrEmail(username, email);
    if (existing) {
      sendJson(res, 409, {
        error:
          existing.username.toLowerCase() === normalized
            ? "That username is already taken"
            : "That email address is already registered",
      });
      return;
    }

    let user;
    const finalRole = approvedTester ? (requestedRole === "Traveller" ? "Bug Tester" : requestedRole) : "Traveller";
    try {
      user = await registerUser({ username, email, password, role: finalRole });
    } catch (error) {
      sendJson(res, 503, {
        error: error instanceof Error ? error.message : "Registration is unavailable right now",
      });
      return;
    }
    setSessionCookie(res, user);
    sendJson(res, 201, {
      authenticated: true,
      user,
      roles: ROLE_OPTIONS,
    });
    return;
  }

  sendJson(res, 404, { error: "Unknown auth action" });
}
