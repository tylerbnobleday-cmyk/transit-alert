import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bell, BellRing, CheckCircle2, PlusSquare, Share, Smartphone, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchMetroNotifyAlerts,
  isAlertCurrent,
  isHeadlineAlert,
  type MetroNotifyAlert,
} from "@/lib/todays-alerts";
import { TRANSITALERT_VERSION_LABEL } from "@/lib/version";
import {
  isIosDevice,
  isStandaloneApp,
  notificationsEnabled,
  setNotificationsEnabled,
  showAppNotification,
  updateAppBadge,
} from "@/lib/pwa";

const KNOWN_ALERT_LINES = [
  "Metro Tunnel",
  "Werribee Line",
  "Williamstown Line",
  "Sandringham Line",
  "Frankston Line",
  "Mernda Line",
  "Hurstbridge Line",
  "Sunbury Line",
  "Cranbourne Line",
  "Pakenham Line",
  "Craigieburn Line",
  "Upfield Line",
  "Belgrave Line",
  "Lilydale Line",
  "Glen Waverley Line",
  "Alamein Line",
  "Stony Point Line",
  "City Loop",
  "Altona Loop",
] as const;

function extractAlertLineLabel(alert: MetroNotifyAlert) {
  const explicitLine = alert.lines.find((line) => typeof line === "string" && line.trim().length > 0)?.trim();
  if (explicitLine) return explicitLine;

  const searchable = `${alert.title} ${alert.summary}`;
  const knownMatch = KNOWN_ALERT_LINES.find((line) => searchable.toLowerCase().includes(line.toLowerCase()));
  if (knownMatch) return knownMatch;

  const titledLineMatch = searchable.match(/\b([A-Z][A-Za-z']+(?:\s+[A-Z][A-Za-z']+)*)\s+Line\b/);
  if (titledLineMatch) {
    return `${titledLineMatch[1].trim()} Line`;
  }

  if (/multiple lines?|several lines?|various lines?/i.test(searchable)) {
    return "Multiple lines affected";
  }

  return "Service update";
}

interface TopBarProps {
  onOpenAlerts: () => void;
  onOpenUserMenu: () => void;
  onOpenVersion: () => void;
  user?: {
    username: string;
    role: string;
    isAdmin: boolean;
  } | null;
}

function getAlertCategory(alert?: MetroNotifyAlert | null) {
  if (!alert) {
    return {
      typeLabel: "Good service",
      detailLabel: "No active alerts",
      tone: "border-emerald-400/20 bg-emerald-500/12 text-emerald-100 shadow-[0_10px_30px_rgba(16,185,129,0.18)]",
      dotTone: "bg-emerald-400",
    };
  }

  const searchable = `${alert.title} ${alert.summary}`.toLowerCase();
  const lineLabel = extractAlertLineLabel(alert);

  if (searchable.includes("bus replacement") || searchable.includes("coach replacement")) {
    return {
      typeLabel: "Bus Replacement",
      detailLabel: lineLabel,
      tone: "border-orange-400/25 bg-orange-500/12 text-orange-100 shadow-[0_10px_30px_rgba(249,115,22,0.18)]",
      dotTone: "bg-orange-400",
    };
  }

  if (searchable.includes("major") || searchable.includes("suspended") || searchable.includes("closed")) {
    return {
      typeLabel: "Major delays",
      detailLabel: lineLabel,
      tone: "border-red-400/25 bg-red-500/12 text-red-100 shadow-[0_10px_30px_rgba(239,68,68,0.18)]",
      dotTone: "bg-red-400",
    };
  }

  if (searchable.includes("delay")) {
    return {
      typeLabel: "Minor delays",
      detailLabel: lineLabel,
      tone: "border-yellow-400/25 bg-yellow-500/12 text-yellow-100 shadow-[0_10px_30px_rgba(234,179,8,0.18)]",
      dotTone: "bg-yellow-300",
    };
  }

  if (searchable.includes("work") || searchable.includes("maintenance")) {
    return {
      typeLabel: "Works",
      detailLabel: lineLabel,
      tone: "border-blue-400/20 bg-blue-500/12 text-blue-100 shadow-[0_10px_30px_rgba(59,130,246,0.18)]",
      dotTone: "bg-blue-300",
    };
  }

  return {
    typeLabel: "Service alert",
    detailLabel: lineLabel,
    tone: "border-blue-400/20 bg-blue-500/12 text-blue-100 shadow-[0_10px_30px_rgba(59,130,246,0.18)]",
    dotTone: "bg-blue-300",
  };
}

function isRecentAlert(updatedAt?: string) {
  if (!updatedAt) return false;
  const parsed = new Date(updatedAt).getTime();
  if (Number.isNaN(parsed)) return false;
  return Date.now() - parsed < 1000 * 60 * 60 * 2;
}

export function TopBar({ onOpenAlerts, onOpenUserMenu, onOpenVersion, user }: TopBarProps) {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(
    typeof window === "undefined" || !("Notification" in window) ? "unsupported" : Notification.permission,
  );
  const [notificationActive, setNotificationActive] = useState(notificationsEnabled);
  const [isNotificationGuideOpen, setIsNotificationGuideOpen] = useState(false);
  const seenAlertIdsRef = useRef<string[]>([]);
  const { data: metroAlerts = [] } = useQuery({
    queryKey: ["/api/metro-notify/alerts", "topbar"],
    queryFn: fetchMetroNotifyAlerts,
    refetchInterval: 60000,
    retry: false,
  });

  const headlineAlerts = metroAlerts.filter((alert) => isAlertCurrent(alert) && isHeadlineAlert(alert));
  const alertsToday = headlineAlerts.length;
  const leadAlert = headlineAlerts[0];
  const alertSummary = getAlertCategory(leadAlert);
  const alertLabel = `${alertsToday} ${alertsToday === 1 ? "Alert" : "Alerts"}`;
  const alertSubtitle =
    alertsToday > 1
      ? "Live disruptions only"
      : alertsToday === 1
        ? `${alertSummary.typeLabel} • ${alertSummary.detailLabel}`
        : "Good service • No active alerts";
  const alertIsRecent = leadAlert ? isRecentAlert(leadAlert.updatedAt) : false;

  useEffect(() => {
    void updateAppBadge(notificationActive ? alertsToday : 0);
  }, [alertsToday, notificationActive]);

  useEffect(() => {
    const currentIds = headlineAlerts.map((alert) => alert.id);
    if (seenAlertIdsRef.current.length === 0) {
      seenAlertIdsRef.current = currentIds;
      return;
    }

    const newAlerts = headlineAlerts.filter((alert) => !seenAlertIdsRef.current.includes(alert.id));
    if (notificationActive && document.visibilityState === "hidden") {
      newAlerts.slice(0, 3).forEach((alert) => {
        const summary = getAlertCategory(alert);
        void showAppNotification(summary.typeLabel, {
          body: `${summary.detailLabel}: ${alert.title}`,
          tag: `transitalert-${alert.id}`,
          data: { url: `${import.meta.env.BASE_URL}alerts/today` },
        });
      });
    }
    seenAlertIdsRef.current = currentIds;
  }, [headlineAlerts, notificationActive]);

  const enableNotifications = async () => {
    if (!("Notification" in window)) {
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === "granted") {
      setNotificationsEnabled(true);
      setNotificationActive(true);
      await showAppNotification("TransitAlert is ready", {
        body: "Live disruption alerts and app badges are now enabled.",
        tag: "transitalert-enabled",
      });
    }
  };

  const disableNotifications = () => {
    setNotificationsEnabled(false);
    setNotificationActive(false);
    void updateAppBadge(0);
  };

  const iosNeedsInstall = isIosDevice() && !isStandaloneApp();

  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0 z-50 flex items-start justify-between gap-2 px-2.5 pt-2.5 sm:px-6 sm:pt-5">
      <div className="pointer-events-auto flex min-w-0 items-center gap-1.5 sm:gap-3">
        {user && (
          <button
            type="button"
            onClick={onOpenUserMenu}
            className="flex shrink-0 items-center rounded-full border border-white/10 bg-card/80 p-1.5 shadow-xl shadow-black/50 backdrop-blur-xl transition hover:bg-card sm:gap-3 sm:rounded-2xl sm:p-2 sm:pr-4"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white sm:h-11 sm:w-11 sm:text-sm">
              {user.username.slice(0, 1).toUpperCase()}
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-xs font-semibold text-white sm:text-sm">{user.username}</p>
              <p className="truncate text-[9px] uppercase tracking-[0.16em] text-muted-foreground sm:text-[11px]">
                {user.role}
              </p>
            </div>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenVersion}
          className="flex min-w-0 items-center gap-1.5 rounded-full border border-white/10 bg-card/80 p-1.5 pr-2.5 text-left shadow-xl shadow-black/50 backdrop-blur-xl transition hover:bg-card sm:gap-3 sm:rounded-2xl sm:p-2 sm:pr-4"
        >
          <img
            src={`${import.meta.env.BASE_URL}app-logo.svg`}
            alt="TransitAlert independent app mark"
            className="h-8 w-8 shrink-0 rounded-xl sm:h-10 sm:w-10"
          />
          <div className="min-w-0">
            <h1 className="truncate font-display text-[12px] font-bold leading-none tracking-tight text-white sm:text-lg">
              TransitAlert
            </h1>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
              {TRANSITALERT_VERSION_LABEL}
            </p>
          </div>
        </button>
      </div>

      <div className="pointer-events-auto relative z-[70] flex shrink-0 items-center gap-1.5 sm:gap-3">
        <button
          type="button"
          onClick={() => setIsNotificationGuideOpen(true)}
          className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-xl backdrop-blur-xl transition hover:scale-[1.03] ${
            notificationActive
              ? "border-emerald-400/25 bg-emerald-500/15 text-emerald-100"
              : "border-white/10 bg-card/80 text-white/75"
          }`}
          aria-label={notificationActive ? "Notifications enabled" : "Set up notifications"}
          title={notificationActive ? "Notifications enabled" : "Set up notifications"}
        >
          {notificationActive ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onOpenAlerts}
          className={`group relative flex h-11 items-center gap-2 rounded-full border px-2.5 text-left backdrop-blur-xl transition hover:scale-[1.02] hover:bg-white/15 sm:h-auto sm:gap-3 sm:px-4 sm:py-2.5 ${alertSummary.tone}`}
        >
          <div className="relative hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 sm:flex sm:h-10 sm:w-10">
            {alertsToday > 0 ? (
              <AlertTriangle className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            ) : (
              <CheckCircle2 className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            )}
            {alertIsRecent && (
              <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center">
                <span className={`absolute inline-flex h-3 w-3 animate-ping rounded-full opacity-75 ${alertSummary.dotTone}`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${alertSummary.dotTone}`} />
              </span>
            )}
          </div>

          <div className="min-w-0">
            <span className="hidden text-[9px] font-semibold uppercase tracking-[0.22em] text-white/55 sm:block sm:text-[10px]">
              Today&apos;s Alerts
            </span>
            <span className="mt-0.5 block text-sm font-display font-bold leading-none text-white sm:text-base">
              {alertLabel}
            </span>
            <span className="mt-1 hidden max-w-[7.75rem] truncate text-[10px] text-white/70 sm:block sm:max-w-[9.5rem] sm:text-[11px]">
              {alertSubtitle}
            </span>
          </div>
        </button>
      </div>

      {isNotificationGuideOpen && (
        <div className="pointer-events-auto fixed inset-0 z-[2000] flex items-end justify-center bg-black/60 p-3 backdrop-blur-md sm:items-center sm:p-6">
          <button
            type="button"
            aria-label="Close notification setup"
            onClick={() => setIsNotificationGuideOpen(false)}
            className="absolute inset-0"
          />
          <section className="relative w-full max-w-md overflow-hidden rounded-[1.8rem] border border-white/10 bg-slate-950/98 p-5 text-white shadow-2xl sm:rounded-[2rem] sm:p-6">
            <button
              type="button"
              onClick={() => setIsNotificationGuideOpen(false)}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70"
              aria-label="Close notification setup"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-500/15 text-blue-100">
              <Smartphone className="h-6 w-6" />
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-300/80">iPhone-ready web app</p>
            <h2 className="mt-2 pr-10 text-2xl font-semibold tracking-tight">TransitAlert, without the browser clutter.</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Install the app for a full-screen map, alert badges, and notification access.
            </p>

            {iosNeedsInstall ? (
              <div className="mt-5 space-y-2.5">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-200"><Share className="h-4 w-4" /></span>
                  <p className="text-sm text-white/75"><span className="font-semibold text-white">1. Tap Share</span> in Safari&apos;s bottom toolbar.</p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-200"><PlusSquare className="h-4 w-4" /></span>
                  <p className="text-sm text-white/75"><span className="font-semibold text-white">2. Add to Home Screen</span>, then open TransitAlert there.</p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-200"><Bell className="h-4 w-4" /></span>
                  <p className="text-sm text-white/75"><span className="font-semibold text-white">3. Tap the bell</span> again and allow notifications.</p>
                </div>
              </div>
            ) : notificationActive ? (
              <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                <div className="flex items-center gap-3">
                  <BellRing className="h-5 w-5 text-emerald-200" />
                  <div>
                    <p className="font-semibold text-emerald-50">Notifications are on</p>
                    <p className="mt-0.5 text-xs text-emerald-100/65">New disruptions can appear as alerts and app badges.</p>
                  </div>
                </div>
                <button type="button" onClick={disableNotifications} className="mt-4 text-xs font-semibold text-white/50 underline decoration-white/20 underline-offset-4">
                  Turn off TransitAlert notifications
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void enableNotifications()}
                disabled={notificationPermission === "denied" || notificationPermission === "unsupported"}
                className="mt-5 w-full rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
              >
                {notificationPermission === "denied" ? "Notifications blocked in settings" : "Enable live alert notifications"}
              </button>
            )}

            <p className="mt-4 text-center text-[11px] leading-4 text-white/35">
              Apple Dynamic Island Live Activities require a native App Store build. This is the strongest supported Safari web-app experience.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
