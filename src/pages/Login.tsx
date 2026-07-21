import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LockKeyhole, Sparkles, UserPlus } from "lucide-react";
import {
  changePassword,
  clearGuestIntent,
  continueAsGuest,
  fetchAuthSession,
  fetchRoles,
  hasGuestIntent,
  loginWithPassword,
  markGuestIntent,
  registerAccount,
  logoutSession,
} from "@/lib/auth";

type AuthMode = "sign-in" | "register" | "change-password";

export default function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberUser, setRememberUser] = useState(true);
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerRole, setRegisterRole] = useState("Traveller");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordFormError, setPasswordFormError] = useState("");
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("transitalert-remembered-login");
      if (!saved) return;
      const parsed = JSON.parse(saved) as { username?: string; password?: string; remember?: boolean };
      if (parsed.username) setUsername(parsed.username);
      if (parsed.password) setPassword(parsed.password);
      setRememberUser(parsed.remember ?? true);
    } catch {
      // Ignore malformed local storage and keep defaults.
    }
  }, []);

  const { data: session } = useQuery({
    queryKey: ["auth-session"],
    queryFn: fetchAuthSession,
    retry: false,
    staleTime: 60_000,
  });

  const { data: rolesPayload } = useQuery({
    queryKey: ["auth-roles"],
    queryFn: fetchRoles,
    retry: false,
    staleTime: Infinity,
  });
  const roles = rolesPayload?.roles ?? [];
  const databaseConfigured = session?.databaseConfigured ?? rolesPayload?.databaseConfigured ?? false;

  const clearGuestSessionMutation = useMutation({
    mutationFn: logoutSession,
    onSettled: async () => {
      clearGuestIntent();
      queryClient.setQueryData(["auth-session"], { authenticated: false, user: null });
      await queryClient.invalidateQueries({ queryKey: ["auth-session"] });
    },
  });

  useEffect(() => {
    if (session?.authenticated) {
      if (session.user?.mustChangePassword) {
        setMode("change-password");
        return;
      }
      if (session.user?.role === "Guest") {
        if (hasGuestIntent()) {
          setLocation("/app");
          return;
        }
        if (clearGuestSessionMutation.isIdle) {
          clearGuestSessionMutation.mutate();
        }
        return;
      }
      setLocation("/app");
    }
  }, [clearGuestSessionMutation, session, setLocation]);

  useEffect(() => {
    if (roles.length > 0 && !roles.includes(registerRole)) {
      setRegisterRole(roles.includes("Traveller") ? "Traveller" : roles[0]);
    }
  }, [roles, registerRole]);

  const loginMutation = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      loginWithPassword(username, password),
    onSuccess: async (nextSession) => {
      clearGuestIntent();
      if (nextSession.user?.mustChangePassword) {
        setCurrentPassword(password);
        setPassword("");
        setMode("change-password");
        window.localStorage.removeItem("transitalert-remembered-login");
        queryClient.setQueryData(["auth-session"], nextSession);
        await queryClient.invalidateQueries({ queryKey: ["auth-session"] });
        return;
      }
      try {
        if (rememberUser) {
          window.localStorage.setItem(
            "transitalert-remembered-login",
            JSON.stringify({ username, password, remember: true }),
          );
        } else {
          window.localStorage.removeItem("transitalert-remembered-login");
        }
      } catch {
        // Ignore local storage failures.
      }
      queryClient.setQueryData(["auth-session"], nextSession);
      await queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      setLocation("/app");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ current, next }: { current: string; next: string }) => changePassword(current, next),
    onSuccess: async (nextSession) => {
      window.localStorage.removeItem("transitalert-remembered-login");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordFormError("");
      queryClient.setQueryData(["auth-session"], nextSession);
      await queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      setLocation("/app");
    },
  });

  const registerMutation = useMutation({
    mutationFn: ({
      username,
      email,
      password,
      role,
    }: {
      username: string;
      email: string;
      password: string;
      role: string;
    }) => registerAccount(username, email, password, role),
    onSuccess: async (nextSession) => {
      clearGuestIntent();
      queryClient.setQueryData(["auth-session"], nextSession);
      await queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      setLocation("/app");
    },
  });

  const guestMutation = useMutation({
    mutationFn: continueAsGuest,
    onSuccess: async (nextSession) => {
      markGuestIntent();
      queryClient.setQueryData(["auth-session"], nextSession);
      await queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      setLocation("/app");
    },
  });

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-background text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_34%),radial-gradient(circle_at_bottom,_rgba(15,23,42,0.95),_rgba(2,6,23,1)_60%)]" />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-6xl items-start px-3 py-4 sm:px-6 sm:py-8">
        <div className="grid w-full gap-4 lg:grid-cols-[1.02fr_0.98fr]">
          <section className="order-2 rounded-[1.7rem] border border-white/10 bg-card/70 p-4 shadow-2xl backdrop-blur-2xl sm:rounded-[2rem] sm:p-8 lg:order-1">
            <div className="hidden lg:block">
              <div className="inline-flex items-center gap-3 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200">
                <img
                  src={`${import.meta.env.BASE_URL}app-logo.svg`}
                  alt="TransitAlert independent app mark"
                  className="h-5 w-5 rounded-md object-cover"
                />
                TransitAlert Melbourne
              </div>

              <p className="mt-7 text-xs font-semibold uppercase tracking-[0.24em] text-blue-300/80">
                Accounts
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Enter the network app with a cleaner sign-in flow.
              </h1>
              <p className="mt-3 max-w-xl text-sm text-white/65 sm:text-base">
                Sign in to keep your saved preferences, favourite stops, and live tools in sync across the app.
              </p>
            </div>

            <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-gradient-to-br from-blue-500/10 to-white/5 p-3.5 sm:mt-6 sm:rounded-[1.55rem] sm:p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Sparkles className="h-4 w-4 text-blue-300" />
                What signing in unlocks
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "Saved preferences",
                  "Favourite stations",
                  "Map filters",
                  "Live tracking tools",
                  "Role-based access",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-2.5 sm:mt-6 sm:gap-3 sm:grid-cols-2">
              {[
                {
                  title: "Real-Time Train Tracking",
                  description:
                    "Live monitoring of train positions, running times, and current status across the network using the feeds currently connected to the app.",
                },
                {
                  title: "Disruption Management",
                  description:
                    "Instant alerts for service disruptions, delays, and incidents with live operational status updates where data is available.",
                },
                {
                  title: "Service Alterations",
                  description:
                    "Track platform changes, service modifications, bus replacements, and timetable updates in a single view.",
                },
                {
                  title: "Fleet Management",
                  description:
                    "Comprehensive fleet tracking, trip summaries, and service board views for the rolling stock types supported in the app.",
                },
                {
                  title: "Journey Planning",
                  description:
                    "Dynamic journey planning designed around current network conditions so route choices stay more useful and reliable.",
                },
                {
                  title: "Secure Access",
                  description:
                    "Role-based access control keeps operational tools, admin controls, and account capabilities appropriate to each user role.",
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-[1rem] border border-white/10 bg-white/5 px-3.5 py-3 sm:rounded-[1.1rem] sm:px-4"
                >
                  <p className="text-sm font-semibold leading-tight text-white">{feature.title}</p>
                  <p className="mt-1 text-xs leading-5 text-white/60">{feature.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="order-1 rounded-[1.7rem] border border-white/10 bg-slate-950/85 p-4 shadow-2xl backdrop-blur-2xl sm:rounded-[2rem] sm:p-8 lg:order-2">
            <div className="mb-4 lg:hidden">
              <div className="inline-flex items-center gap-3 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200">
                <img
                  src={`${import.meta.env.BASE_URL}app-logo.svg`}
                  alt="TransitAlert independent app mark"
                  className="h-5 w-5 rounded-md object-cover"
                />
                TransitAlert Melbourne
              </div>

              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-blue-300/80">
                Accounts
              </p>
              <h1 className="mt-3 text-[1.85rem] font-semibold tracking-tight text-white sm:text-3xl">
                Guest version 0.92 is live with verified departures and bus stops.
              </h1>
            </div>

            {mode !== "change-password" && (
            <div className="grid grid-cols-2 gap-2 rounded-[1.15rem] border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setMode("sign-in")}
                className={`rounded-[1rem] px-4 py-3 text-sm font-semibold transition ${
                  mode === "sign-in" ? "bg-blue-600 text-white" : "text-white/65 hover:bg-white/5"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`rounded-[1rem] px-4 py-3 text-sm font-semibold transition ${
                  mode === "register" ? "bg-blue-600 text-white" : "text-white/65 hover:bg-white/5"
                }`}
              >
                Register
              </button>
            </div>
            )}

            {!databaseConfigured && (
              <div className="mt-4 rounded-[1.15rem] border border-amber-400/20 bg-amber-500/10 px-3.5 py-3 text-sm text-amber-100 sm:px-4">
                The account database is not configured yet. Guest browsing still works, but sign-in and new account persistence
                need the live database connected first.
              </div>
            )}

            {mode === "change-password" ? (
              <div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/80">
                  Password update required
                </p>
                <h2 className="mt-3 flex items-center gap-2 text-2xl font-semibold text-white">
                  <LockKeyhole className="h-5 w-5 text-amber-300" />
                  Choose your own password
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  This account is using a temporary password. You must replace it before TransitAlert opens.
                </p>

                <form
                  className="mt-6 space-y-3.5 sm:mt-8 sm:space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setPasswordFormError("");
                    if (newPassword !== confirmPassword) {
                      setPasswordFormError("The new passwords do not match.");
                      return;
                    }
                    changePasswordMutation.mutate({ current: currentPassword, next: newPassword });
                  }}
                >
                  <label className="block">
                    <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                      Temporary password
                    </span>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      onKeyDown={(event) => setIsCapsLockOn(event.getModifierState("CapsLock"))}
                      onKeyUp={(event) => setIsCapsLockOn(event.getModifierState("CapsLock"))}
                      autoComplete="current-password"
                      className="w-full rounded-[1.15rem] border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none transition focus:border-amber-300/60 sm:rounded-2xl sm:py-3"
                    />
                  </label>

                  {isCapsLockOn && (
                    <p className="rounded-xl border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100">
                      Caps Lock is on. Passwords remain case-sensitive for account security.
                    </p>
                  )}

                  <label className="block">
                    <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                      New password
                    </span>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      onKeyDown={(event) => setIsCapsLockOn(event.getModifierState("CapsLock"))}
                      onKeyUp={(event) => setIsCapsLockOn(event.getModifierState("CapsLock"))}
                      autoComplete="new-password"
                      minLength={10}
                      className="w-full rounded-[1.15rem] border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none transition focus:border-amber-300/60 sm:rounded-2xl sm:py-3"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                      Confirm new password
                    </span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      onKeyDown={(event) => setIsCapsLockOn(event.getModifierState("CapsLock"))}
                      onKeyUp={(event) => setIsCapsLockOn(event.getModifierState("CapsLock"))}
                      autoComplete="new-password"
                      minLength={10}
                      className="w-full rounded-[1.15rem] border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none transition focus:border-amber-300/60 sm:rounded-2xl sm:py-3"
                    />
                  </label>

                  <p className="text-xs leading-5 text-white/50">
                    Use at least 10 characters with at least one letter and one number.
                  </p>

                  {(passwordFormError || changePasswordMutation.error instanceof Error) && (
                    <div className="rounded-[1.15rem] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 sm:rounded-2xl">
                      {passwordFormError || (changePasswordMutation.error as Error).message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={changePasswordMutation.isPending}
                    className="w-full rounded-[1.15rem] bg-amber-400 px-4 py-2.5 text-base font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70 sm:rounded-2xl sm:py-3"
                  >
                    {changePasswordMutation.isPending ? "Updating password..." : "Set new password and continue"}
                  </button>
                </form>
              </div>
            ) : mode === "sign-in" ? (
              <div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
                  Sign In
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white">Welcome back</h2>
                <p className="mt-2 text-sm text-white/60">
                  Sign in to open the live map, planner, and saved account tools, or use guest mode for the public 0.92 browse experience.
                </p>

                <form
                  className="mt-6 space-y-3.5 sm:mt-8 sm:space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    loginMutation.mutate({ username, password });
                  }}
                >
                  <label className="block">
                    <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                      Username
                    </span>
                    <input
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      autoComplete="username"
                      placeholder="Enter username"
                      className="w-full rounded-[1.15rem] border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none transition focus:border-blue-400/60 sm:rounded-2xl sm:py-3"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                      Password
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      onKeyDown={(event) => setIsCapsLockOn(event.getModifierState("CapsLock"))}
                      onKeyUp={(event) => setIsCapsLockOn(event.getModifierState("CapsLock"))}
                      autoComplete="current-password"
                      placeholder="Enter password"
                      className="w-full rounded-[1.15rem] border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none transition focus:border-blue-400/60 sm:rounded-2xl sm:py-3"
                    />
                  </label>

                  {isCapsLockOn && (
                    <p className="rounded-xl border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100">
                      Caps Lock is on. Usernames ignore capitals, but passwords are case-sensitive.
                    </p>
                  )}

                  <label className="flex items-center gap-3 rounded-[1.15rem] border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/75 sm:rounded-2xl sm:py-3">
                    <input
                      type="checkbox"
                      checked={rememberUser}
                      onChange={(event) => setRememberUser(event.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-slate-900 text-blue-500"
                    />
                    <span>Remember me on this device</span>
                  </label>

                  {loginMutation.error instanceof Error && (
                    <div className="rounded-[1.15rem] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 sm:rounded-2xl">
                      {loginMutation.error.message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loginMutation.isPending}
                    className="w-full rounded-[1.15rem] bg-blue-600 px-4 py-2.5 text-base font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70 sm:rounded-2xl sm:py-3"
                  >
                    {loginMutation.isPending ? "Signing in..." : "Sign in"}
                  </button>

                  <button
                    type="button"
                    onClick={() => guestMutation.mutate()}
                    disabled={guestMutation.isPending}
                    className="w-full rounded-[1.15rem] border border-white/10 bg-white/5 px-4 py-2.5 text-base font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70 sm:rounded-2xl sm:py-3"
                  >
                    {guestMutation.isPending ? "Entering as guest..." : "Continue as guest"}
                  </button>

                  {(guestMutation.error instanceof Error) && (
                    <div className="rounded-[1.15rem] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 sm:rounded-2xl">
                      {guestMutation.error.message}
                    </div>
                  )}

                  <p className="text-xs leading-5 text-white/50">
                    Guest mode in version 0.92 lets people browse the map and planner without registering, while live tools and account-only features stay restricted until they sign up.
                  </p>
                </form>
              </div>
            ) : (
              <div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
                  Register
                </p>
                <h2 className="mt-3 flex items-center gap-2 text-2xl font-semibold text-white">
                  <UserPlus className="h-5 w-5 text-blue-300" />
                  Create an account
                </h2>
                <p className="mt-2 text-sm text-white/60">
                  Registration is currently for approved debug testers only. Guest version 0.92 keeps public browsing open, and public Traveller sign-ups open in version 1.0.
                </p>

                <form
                  className="mt-6 space-y-3.5 sm:mt-8 sm:space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    registerMutation.mutate({
                      username: registerUsername,
                      email: registerEmail,
                      password: registerPassword,
                      role: "Traveller",
                    });
                  }}
                >
                  <label className="block">
                    <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                      Username
                    </span>
                    <input
                      value={registerUsername}
                      onChange={(event) => setRegisterUsername(event.target.value)}
                      autoComplete="username"
                      className="w-full rounded-[1.15rem] border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none transition focus:border-blue-400/60 sm:rounded-2xl sm:py-3"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                      Password
                    </span>
                    <input
                      type="password"
                      value={registerPassword}
                      onChange={(event) => setRegisterPassword(event.target.value)}
                      autoComplete="new-password"
                      className="w-full rounded-[1.15rem] border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none transition focus:border-blue-400/60 sm:rounded-2xl sm:py-3"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                      Email Address
                    </span>
                    <input
                      type="email"
                      value={registerEmail}
                      onChange={(event) => setRegisterEmail(event.target.value)}
                      autoComplete="email"
                      placeholder="name@example.com"
                      className="w-full rounded-[1.15rem] border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none transition focus:border-blue-400/60 sm:rounded-2xl sm:py-3"
                    />
                  </label>

                  <div className="rounded-[1.15rem] border border-white/10 bg-white/5 p-3 sm:rounded-2xl">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                      Registration access
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-white/70">
                      <p>Approved debug testers can create accounts right now after you add them to the tester approval list.</p>
                      <p>Jack Miller is included as the first built-in debug tester for database verification and sign-up testing.</p>
                      <p>When version 1.0 opens public sign-ups, new accounts will start as <span className="font-semibold text-white">Traveller</span>.</p>
                      <p>Premium access and any extra roles are granted manually by you or another approved admin.</p>
                    </div>
                  </div>

                  {registerMutation.error instanceof Error && (
                    <div className="rounded-[1.15rem] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 sm:rounded-2xl">
                      {registerMutation.error.message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={registerMutation.isPending}
                    className="w-full rounded-[1.15rem] bg-blue-600 px-4 py-2.5 text-base font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70 sm:rounded-2xl sm:py-3"
                  >
                    {registerMutation.isPending ? "Checking tester approval..." : "Create tester account"}
                  </button>
                </form>
              </div>
            )}

            <div className="mt-4 rounded-[1.15rem] border border-white/10 bg-white/5 px-3.5 py-3 text-sm text-white/60 sm:rounded-2xl sm:px-4">
              Guest mode is the public 0.92 experience for browsing. Live tools and saved account features still stay limited until sign-in.
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
