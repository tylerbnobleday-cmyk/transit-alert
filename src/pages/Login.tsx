import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LockKeyhole, Sparkles, UserPlus } from "lucide-react";
import { continueAsGuest, fetchAuthSession, fetchRoles, loginWithPassword, registerAccount } from "@/lib/auth";

type AuthMode = "sign-in" | "register";

export default function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [username, setUsername] = useState("tyler");
  const [password, setPassword] = useState("");
  const [rememberUser, setRememberUser] = useState(true);
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerRole, setRegisterRole] = useState("Traveller");

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

  const { data: roles = [] } = useQuery({
    queryKey: ["auth-roles"],
    queryFn: fetchRoles,
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (session?.authenticated) {
      setLocation("/app");
    }
  }, [session, setLocation]);

  useEffect(() => {
    if (roles.length > 0 && !roles.includes(registerRole)) {
      setRegisterRole(roles[0]);
    }
  }, [roles, registerRole]);

  const roleGroups = useMemo(() => roles, [roles]);

  const loginMutation = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      loginWithPassword(username, password),
    onSuccess: async (nextSession) => {
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
      queryClient.setQueryData(["auth-session"], nextSession);
      await queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      setLocation("/app");
    },
  });

  const guestMutation = useMutation({
    mutationFn: continueAsGuest,
    onSuccess: async (nextSession) => {
      queryClient.setQueryData(["auth-session"], nextSession);
      await queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      setLocation("/app");
    },
  });

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-background text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_34%),radial-gradient(circle_at_bottom,_rgba(15,23,42,0.95),_rgba(2,6,23,1)_60%)]" />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-6xl items-start px-4 py-5 sm:px-6 sm:py-8">
        <div className="grid w-full gap-5 lg:grid-cols-[1.02fr_0.98fr]">
          <section className="order-2 rounded-[2rem] border border-white/10 bg-card/70 p-5 shadow-2xl backdrop-blur-2xl sm:p-8 lg:order-1">
            <div className="hidden lg:block">
              <div className="inline-flex items-center gap-3 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200">
                <img
                  src={`${import.meta.env.BASE_URL}app-logo.svg`}
                  alt="X'Trapolis 2.0"
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

            <div className="mt-6 rounded-[1.55rem] border border-white/10 bg-gradient-to-br from-blue-500/10 to-white/5 p-4 sm:p-5">
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

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
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
                  className="rounded-[1.1rem] border border-white/10 bg-white/5 px-4 py-3"
                >
                  <p className="text-sm font-semibold leading-tight text-white">{feature.title}</p>
                  <p className="mt-1 text-xs leading-5 text-white/60">{feature.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="order-1 rounded-[2rem] border border-white/10 bg-slate-950/85 p-5 shadow-2xl backdrop-blur-2xl sm:p-8 lg:order-2">
            <div className="mb-5 lg:hidden">
              <div className="inline-flex items-center gap-3 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200">
                <img
                  src={`${import.meta.env.BASE_URL}app-logo.svg`}
                  alt="X'Trapolis 2.0"
                  className="h-5 w-5 rounded-md object-cover"
                />
                TransitAlert Melbourne
              </div>

              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-blue-300/80">
                Accounts
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                Sign in or register before entering the network app.
              </h1>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
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

            {mode === "sign-in" ? (
              <div>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
                  Sign In
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white">Welcome back</h2>
                <p className="mt-2 text-sm text-white/60">
                  Sign in to open the live map, planner, and saved account tools.
                </p>

                <form
                  className="mt-8 space-y-4"
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
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-blue-400/60"
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
                      autoComplete="current-password"
                      placeholder="Enter password"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-blue-400/60"
                    />
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
                    <input
                      type="checkbox"
                      checked={rememberUser}
                      onChange={(event) => setRememberUser(event.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-slate-900 text-blue-500"
                    />
                    <span>Remember me on this device</span>
                  </label>

                  {loginMutation.error instanceof Error && (
                    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                      {loginMutation.error.message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loginMutation.isPending}
                    className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loginMutation.isPending ? "Signing in..." : "Sign in"}
                  </button>

                  <button
                    type="button"
                    onClick={() => guestMutation.mutate()}
                    disabled={guestMutation.isPending}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {guestMutation.isPending ? "Entering as guest..." : "Continue as guest"}
                  </button>

                  {(guestMutation.error instanceof Error) && (
                    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                      {guestMutation.error.message}
                    </div>
                  )}

                  <p className="text-xs leading-5 text-white/50">
                    Guest mode lets people browse the map and planner without registering, but live tools and account-only features stay restricted until they sign up.
                  </p>
                </form>
              </div>
            ) : (
              <div>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
                  Register
                </p>
                <h2 className="mt-3 flex items-center gap-2 text-2xl font-semibold text-white">
                  <UserPlus className="h-5 w-5 text-blue-300" />
                  Create an account
                </h2>
                <p className="mt-2 text-sm text-white/60">
                  Pick a username, email, password, and role to start using saved features across the app.
                </p>

                <form
                  className="mt-8 space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    registerMutation.mutate({
                      username: registerUsername,
                      email: registerEmail,
                      password: registerPassword,
                      role: registerRole,
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
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-blue-400/60"
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
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-blue-400/60"
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
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-blue-400/60"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                      Role
                    </span>
                    <select
                      value={registerRole}
                      onChange={(event) => setRegisterRole(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-blue-400/60"
                    >
                      {roleGroups.map((role) => (
                        <option key={role} value={role} className="bg-slate-950 text-white">
                          {role}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                      Available roles
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {roleGroups.map((role) => (
                        <span
                          key={role}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            role === registerRole
                              ? "border-blue-400/50 bg-blue-500/10 text-blue-200"
                              : "border-white/10 bg-white/5 text-white/70"
                          }`}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>

                  {registerMutation.error instanceof Error && (
                    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                      {registerMutation.error.message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={registerMutation.isPending}
                    className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {registerMutation.isPending ? "Creating account..." : "Register and enter app"}
                  </button>
                </form>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
              Guest mode still works for browsing, but live tools and saved account features stay limited until sign-in.
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
