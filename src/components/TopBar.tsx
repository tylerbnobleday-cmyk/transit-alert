import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchMetroNotifyAlerts,
  isAlertCurrent,
  isHeadlineAlert,
  type MetroNotifyAlert,
} from "@/lib/todays-alerts";
import { TRANSITALERT_VERSION_LABEL } from "@/lib/version";

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

  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0 z-50 flex items-start gap-2 px-2.5 pt-2.5 sm:px-6 sm:pt-5">
      <div className="pointer-events-auto flex min-w-0 max-w-[calc(100%-4.6rem)] items-center gap-1.5 sm:max-w-none sm:gap-3">
        {user && (
          <button
            type="button"
            onClick={onOpenUserMenu}
            className="flex min-w-0 items-center gap-1.5 rounded-2xl border border-white/10 bg-card/80 p-1.5 pr-2.5 shadow-xl shadow-black/50 backdrop-blur-xl transition hover:bg-card sm:gap-3 sm:p-2 sm:pr-4"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white sm:h-11 sm:w-11 sm:text-sm">
              {user.username.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 max-w-[3.25rem] sm:max-w-none">
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
          className="flex min-w-0 items-center gap-1.5 rounded-2xl border border-white/10 bg-card/80 p-1.5 pr-2.5 text-left shadow-xl shadow-black/50 backdrop-blur-xl transition hover:bg-card sm:gap-3 sm:p-2 sm:pr-4"
        >
          <img
            src={`${import.meta.env.BASE_URL}app-logo.svg`}
            alt="Transit Alert"
            className="h-8 w-8 shrink-0 rounded-xl sm:h-10 sm:w-10"
          />
          <div className="min-w-0">
            <h1 className="truncate font-display text-[13px] font-bold leading-none tracking-tight text-white sm:text-lg">
              TransitAlert
            </h1>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
              {TRANSITALERT_VERSION_LABEL}
            </p>
          </div>
        </button>
      </div>

      <div className="pointer-events-none absolute right-2.5 top-2.5 z-[70] flex flex-col items-end gap-2 sm:right-6 sm:top-5 sm:gap-3">
        <button
          type="button"
          onClick={onOpenAlerts}
          className={`pointer-events-auto group relative flex max-w-[10.5rem] items-center gap-2 rounded-full border px-3 py-1.5 text-left backdrop-blur-xl transition hover:scale-[1.02] hover:bg-white/15 sm:max-w-none sm:gap-3 sm:px-4 sm:py-2.5 ${alertSummary.tone}`}
        >
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 sm:h-10 sm:w-10">
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
            <span className="block text-[9px] font-semibold uppercase tracking-[0.22em] text-white/55 sm:text-[10px]">
              Today&apos;s Alerts
            </span>
            <span className="mt-0.5 block text-sm font-display font-bold leading-none text-white sm:text-base">
              {alertLabel}
            </span>
            <span className="mt-1 block max-w-[7.75rem] truncate text-[10px] text-white/70 sm:max-w-[9.5rem] sm:text-[11px]">
              {alertSubtitle}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
