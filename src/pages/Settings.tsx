import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Crown, ExternalLink, LogOut, Save, Shield, SlidersHorizontal, User2 } from "lucide-react";
import { fetchAuthSession, logoutSession } from "@/lib/auth";
import { fetchAdminConfig, saveAdminConfig, type AdminRuntimeConfig } from "@/lib/admin-config";
import { TRANSITALERT_WEB_VERSION } from "@/lib/version";
import {
  DEFAULT_TRANSPORT_MODES,
  defaultPreferences,
  fetchAccountPreferences,
  getPremiumPaypalLink,
  getPremiumPriceAud,
  hasPremiumAccess,
  readLocalPreferences,
  saveAccountPreferences,
  type UserPreferences,
  writeLocalPreferences,
} from "@/lib/preferences";

const TRANSPORT_MODE_OPTIONS = [
  { key: "train", label: "Metro trains" },
  { key: "tram", label: "Trams" },
  { key: "bus", label: "Buses" },
  { key: "vline", label: "V/Line" },
] as const;

const ADMIN_SOURCE_KEYS = [
  { key: "metroNotify", label: "Metro Notify alerts" },
  { key: "plannedWorks", label: "Planned works source" },
  { key: "liveTrains", label: "Live trains API" },
  { key: "reports", label: "Community reports API" },
] as const;

const TRANSITALERT_UPDATE_ENTRIES = [
  {
    date: "07/05/2026",
    items: [
      "Inline station stop markers replaced the older debug-style station labels across the live map.",
      "Live tram and bus route filters expanded, with onboard-style bus stop tracking added to stop detail panels.",
      "Premium consist favourites and consist search tools were added for premium accounts.",
    ],
  },
  {
    date: "02/05/2026",
    items: [
      "V/Line live tracking added, including Gippsland service detail support.",
      "Southern Cross departure board layouts refined.",
      "Settings and preferences UI improved.",
    ],
  },
  {
    date: "29/04/2026",
    items: ["Removed raw feed IDs from live transit labels to clean up user-facing data."],
  },
  {
    date: "25/04/2026",
    items: ["Refactored core transit data flow and UI for better stability and maintainability."],
  },
  {
    date: "22/04/2026",
    items: [
      "Fixed infinite loop issues affecting app performance.",
      "Refined map UI and reduced and cleaned auth role handling.",
    ],
  },
  {
    date: "20/04/2026",
    items: [
      "Improved mobile map interaction, including drag area tuning.",
      "Improved layout fit for map overlays on smaller screens.",
      "Added station platform departure preview.",
      "Raised station detail sheet above planner for better layering.",
      "Fixed Vercel auth runtime loader issues.",
      "Prevented crashes when the database is unavailable.",
      "Consolidated API routes to stay within Hobby limits.",
      "Fixed auth helper imports and converted helpers to JavaScript.",
      "Fixed NodeNext import and TypeScript config issues.",
      "Fixed live metro train feed and tracker map interaction bugs.",
    ],
  },
  {
    date: "19/04/2026",
    items: [
      "Added transport mode filtering.",
      "Added marker editing support.",
      "Major feature drop: mobile planner, authentication system, live tracking, alerts overhaul, and filtering improvements.",
    ],
  },
  {
    date: "14/04/2026",
    items: ["Initial City Loop and train config testing."],
  },
  {
    date: "13/04/2026",
    items: ["Initial project setup: Vite configuration, Vercel setup, submodule fixes, and initial commit."],
  },
] as const;

function areStringArraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function areBooleanMapsEqual(left: Record<string, boolean>, right: Record<string, boolean>) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length && leftKeys.every((key) => left[key] === right[key]);
}

function arePreferencePatchesEqual(current: UserPreferences, next: UserPreferences) {
  return (
    areStringArraysEqual(current.favouriteStops, next.favouriteStops) &&
    areStringArraysEqual(current.favouriteRoutes, next.favouriteRoutes) &&
    areStringArraysEqual(current.transportModes, next.transportModes) &&
    areBooleanMapsEqual(current.selectedMapFilters, next.selectedMapFilters) &&
    JSON.stringify(current.appPreferences) === JSON.stringify(next.appPreferences)
  );
}

export default function Settings() {
  const [, setLocation] = useLocation();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [savedMessage, setSavedMessage] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [adminConfigDraft, setAdminConfigDraft] = useState<AdminRuntimeConfig>({});

  const { data: authSession, isLoading: isAuthLoading } = useQuery({
    queryKey: ["auth-session"],
    queryFn: fetchAuthSession,
    retry: false,
    staleTime: 60_000,
  });

  const isAuthenticated = authSession?.authenticated ?? false;
  const isGuest = authSession?.user?.role === "Guest";
  const isAdmin = authSession?.user?.isAdmin ?? false;

  const { data: accountPreferences } = useQuery({
    queryKey: ["account-preferences", authSession?.user?.id],
    queryFn: fetchAccountPreferences,
    enabled: isAuthenticated && !isGuest,
    retry: false,
    staleTime: 60_000,
  });

  const { data: adminConfig } = useQuery({
    queryKey: ["admin-runtime-config", "settings-page"],
    queryFn: fetchAdminConfig,
    enabled: isAdmin,
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (accountPreferences && !isGuest) {
      setPreferences({
        ...defaultPreferences,
        ...accountPreferences,
      });
      return;
    }

    setPreferences(readLocalPreferences());
  }, [accountPreferences, isGuest]);

  useEffect(() => {
    if (adminConfig) {
      setAdminConfigDraft(adminConfig);
    }
  }, [adminConfig]);

  const savePreferencesMutation = useMutation({
    mutationFn: async () => {
      writeLocalPreferences(preferences);
      if (isAuthenticated && !isGuest) {
        return saveAccountPreferences(preferences);
      }
      return preferences;
    },
    onSuccess: (saved) => {
      setPreferences({
        ...defaultPreferences,
        ...saved,
      });
      setSavedMessage(isAuthenticated && !isGuest ? "Settings saved to your account." : "Settings saved on this device.");
    },
    onError: (error) => {
      setSavedMessage(error instanceof Error ? error.message : "Could not save settings right now.");
    },
  });

  const saveAdminMutation = useMutation({
    mutationFn: () => saveAdminConfig(adminConfigDraft),
    onSuccess: (saved) => {
      setAdminConfigDraft(saved);
      setAdminMessage("Admin runtime settings saved.");
    },
    onError: (error) => {
      setAdminMessage(error instanceof Error ? error.message : "Failed to save admin settings.");
    },
  });

  const signOutMutation = useMutation({
    mutationFn: logoutSession,
    onSuccess: () => {
      setLocation("/login");
    },
  });

  const currentModes = useMemo(
    () => (Array.isArray(preferences.transportModes) && preferences.transportModes.length > 0 ? preferences.transportModes : [...DEFAULT_TRANSPORT_MODES]),
    [preferences.transportModes],
  );
  const premiumEnabled = hasPremiumAccess(preferences);
  const premiumPaypalLink = getPremiumPaypalLink(preferences);
  const premiumPriceAud = getPremiumPriceAud(preferences);

  const hasUnsavedPreferenceChanges = useMemo(() => {
    const baseline = accountPreferences && !isGuest
      ? { ...defaultPreferences, ...accountPreferences }
      : readLocalPreferences();
    return !arePreferencePatchesEqual(baseline, preferences);
  }, [accountPreferences, isGuest, preferences]);

  const toggleTransportMode = (mode: (typeof TRANSPORT_MODE_OPTIONS)[number]["key"]) => {
    setSavedMessage("");
    setPreferences((current) => {
      const nextModes = currentModes.includes(mode)
        ? currentModes.filter((item) => item !== mode)
        : [...currentModes, mode];

      return {
        ...current,
        transportModes: nextModes.length > 0 ? nextModes : [...DEFAULT_TRANSPORT_MODES],
      };
    });
  };

  if (isAuthLoading) {
    return (
      <main className="min-h-screen bg-background px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-card/80 p-8 shadow-2xl backdrop-blur-xl">
          <p className="text-sm text-white/65">Loading account settings...</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated || !authSession?.user) {
    return (
      <main className="min-h-screen bg-background px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-card/80 p-8 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300/80">Settings</p>
          <h1 className="mt-3 text-3xl font-semibold">Sign in to open your settings</h1>
          <p className="mt-3 text-sm text-white/65">
            Account settings are tied to your signed-in profile so favourites and app preferences can follow you across devices.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login" className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500">
              Go to login
            </Link>
            <Link href="/app" className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10">
              Back to app
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300/80">Settings</p>
            <h1 className="mt-2 text-3xl font-semibold">Your account and app settings</h1>
            <p className="mt-2 max-w-3xl text-sm text-white/65">
              Manage how Transit Alert behaves for your account, and if you&apos;re an admin, adjust runtime source settings here too.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/app" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white transition hover:bg-white/10">
              <ArrowLeft className="h-4 w-4" />
              Back to app
            </Link>
            <button
              type="button"
              onClick={() => signOutMutation.mutate()}
              disabled={signOutMutation.isPending}
              className="inline-flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 font-semibold text-red-100 transition hover:bg-red-500/15 disabled:opacity-70"
            >
              <LogOut className="h-4 w-4" />
              {signOutMutation.isPending ? "Signing out..." : "Log out"}
            </button>
          </div>
        </div>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-white/10 bg-card/80 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <User2 className="h-5 w-5 text-blue-300" />
              <div>
                <h2 className="text-lg font-semibold">Account</h2>
                <p className="text-sm text-white/60">Session-backed account details and access level.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">Username</p>
                <p className="mt-2 text-lg font-semibold">{authSession.user.username}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">Role</p>
                <p className="mt-2 text-lg font-semibold">{authSession.user.role}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">Email</p>
                <p className="mt-2 text-lg font-semibold">{authSession.user.email}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-card/80 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <Shield className={`h-5 w-5 ${isAdmin ? "text-emerald-300" : "text-white/55"}`} />
              <div>
                <h2 className="text-lg font-semibold">Access</h2>
                <p className="text-sm text-white/60">What your current account can do.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold">{isAdmin ? "Admin access enabled" : "Standard user access"}</p>
                <p className="mt-1 text-sm text-white/60">
                  {isAdmin
                    ? "You can open runtime source controls and network admin tools."
                    : "You can save preferences, favourites, and use the regular app features tied to your account."}
                </p>
              </div>
              {isGuest && (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                  Guest sessions do not keep server-side settings. Sign in with a registered account if you want your preferences synced.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-card/80 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5 text-yellow-300" />
            <div>
              <h2 className="text-lg font-semibold">TransitAlert Premium</h2>
              <p className="text-sm text-white/60">Simple PayPal-based premium access for advanced map tools.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">
                {premiumEnabled ? "Premium is active on this account/device." : `Premium unlock is $${premiumPriceAud} AUD.`}
              </p>
              <p className="mt-2 text-sm text-white/60">
                Premium currently unlocks freight tracking panels and advanced stop schedules in the live map.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {premiumPaypalLink ? (
                  <a
                    href={premiumPaypalLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border border-yellow-300/20 bg-yellow-500/10 px-4 py-2.5 text-sm font-semibold text-yellow-100 transition hover:bg-yellow-500/15"
                  >
                    Pay with PayPal
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : (
                  <span className="inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/55">
                    No PayPal link configured yet
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Premium access</p>
                    <p className="mt-2 text-sm font-semibold text-white">{premiumEnabled ? "Unlocked" : "Locked"}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => {
                      setSavedMessage("");
                      setPreferences((current) => ({
                        ...current,
                        appPreferences: {
                          ...current.appPreferences,
                          premiumAccess: !(current.appPreferences?.premiumAccess === true),
                        },
                      }));
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      premiumEnabled
                        ? "border border-emerald-400/20 bg-emerald-500/15 text-emerald-100"
                        : "border border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {premiumEnabled ? "Disable" : "Enable"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-white/55">
                  {isAdmin
                    ? "Use this to manually grant premium after a PayPal payment lands."
                    : "An admin needs to grant premium after payment is received."}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">PayPal unlock link</p>
                <input
                  value={premiumPaypalLink}
                  disabled={!isAdmin}
                  onChange={(event) => {
                    setSavedMessage("");
                    const nextValue = event.target.value;
                    setPreferences((current) => ({
                      ...current,
                      appPreferences: {
                        ...current.appPreferences,
                        premiumPaypalLink: nextValue,
                      },
                    }));
                  }}
                  placeholder="https://paypal.me/yourname/5"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-400/40 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="mt-2 text-xs text-white/55">
                  {isAdmin
                    ? "Locked premium cards use this link across the app."
                    : "Ask an admin to configure the PayPal unlock link if it is missing."}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-card/80 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="h-5 w-5 text-blue-300" />
            <div>
              <h2 className="text-lg font-semibold">App preferences</h2>
              <p className="text-sm text-white/60">Choose which transport modes and saved data should shape the app for you.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Transport modes</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {TRANSPORT_MODE_OPTIONS.map((mode) => {
                  const active = currentModes.includes(mode.key);
                  return (
                    <button
                      key={mode.key}
                      type="button"
                      onClick={() => toggleTransportMode(mode.key)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        active
                          ? "border-blue-400/35 bg-blue-500/18 text-blue-100"
                          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">Favourite stops</p>
                <p className="mt-2 text-2xl font-semibold">{preferences.favouriteStops.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">Favourite routes</p>
                <p className="mt-2 text-2xl font-semibold">{preferences.favouriteRoutes.length}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => savePreferencesMutation.mutate()}
              disabled={savePreferencesMutation.isPending || !hasUnsavedPreferenceChanges}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-65"
            >
              <Save className="h-4 w-4" />
              {savePreferencesMutation.isPending ? "Saving..." : "Save settings"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPreferences(readLocalPreferences());
                setSavedMessage("Reloaded local saved preferences.");
              }}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Reload local preferences
            </button>
            {savedMessage && <p className="text-sm text-white/65">{savedMessage}</p>}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-card/80 p-6 shadow-2xl backdrop-blur-xl">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300/80">TransitAlert Melbourne</p>
            <h2 className="mt-2 text-2xl font-semibold">TransitAlert updates</h2>
            <p className="mt-2 max-w-3xl text-sm text-white/65">
              System notes, version history, and recent release changes for the planner, live tracking, maps, alerts, and related tools.
            </p>
          </div>

          <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-slate-950/55 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-white">TransitAlert Web Version {TRANSITALERT_WEB_VERSION} (in progress)</p>
                <p className="mt-1 text-sm text-white/55">Current development stream</p>
              </div>
            </div>

            <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">About This System</p>
              <div className="mt-3 space-y-3 text-sm leading-6 text-white/72">
                <p>
                  TransitAlert is an independent real-time transport platform combining public feeds, available operator data, and app-side logic.
                </p>
                <p>
                  Data may be delayed, incomplete, or unavailable. This app should not be treated as an official operator source.
                </p>
                <p>
                  Diagnostics and usage logging may be used to improve stability, performance, and reliability.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Version {TRANSITALERT_WEB_VERSION}</p>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">02/05/2026</p>
              </div>

              <div className="mt-4 space-y-4">
                {TRANSITALERT_UPDATE_ENTRIES.map((entry) => (
                  <div key={entry.date} className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{entry.date}</p>
                    </div>
                    <div className="mt-3 space-y-2 text-sm leading-6 text-white/72">
                      {entry.items.map((item) => (
                        <p key={`${entry.date}-${item}`}>{item}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {isAdmin && (
          <section className="rounded-[2rem] border border-white/10 bg-card/80 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-emerald-300" />
              <div>
                <h2 className="text-lg font-semibold">Admin runtime settings</h2>
                <p className="text-sm text-white/60">Manage the source endpoints the app should trust for live runtime data.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {ADMIN_SOURCE_KEYS.map(({ key, label }) => (
                <div key={key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{label}</p>
                  <select
                    value={adminConfigDraft[key]?.environment ?? "production"}
                    onChange={(event) =>
                      setAdminConfigDraft((current) => ({
                        ...current,
                        [key]: {
                          environment: event.target.value as "production" | "staging" | "local" | "custom",
                          url: current[key]?.url ?? "",
                        },
                      }))
                    }
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="local">Local</option>
                    <option value="custom">Custom</option>
                  </select>
                  <input
                    value={adminConfigDraft[key]?.url ?? ""}
                    onChange={(event) =>
                      setAdminConfigDraft((current) => ({
                        ...current,
                        [key]: {
                          environment: current[key]?.environment ?? "production",
                          url: event.target.value,
                        },
                      }))
                    }
                    placeholder="Optional custom URL"
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-white/30"
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => saveAdminMutation.mutate()}
                disabled={saveAdminMutation.isPending}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-70"
              >
                <Save className="h-4 w-4" />
                {saveAdminMutation.isPending ? "Saving admin settings..." : "Save admin settings"}
              </button>
              <Link href="/app" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10">
                Open admin tools in app
                <ExternalLink className="h-4 w-4" />
              </Link>
              {adminMessage && <p className="text-sm text-white/65">{adminMessage}</p>}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
