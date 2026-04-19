import type { Report } from "@/lib/api-client-react/src/generated/api.schemas";

export type MetroNotifyAlert = {
  id: string;
  title: string;
  summary: string;
  lines: string[];
  status: string;
  updatedAt?: string;
  url?: string;
  source: "metro";
};

type MetroNotifyResponse =
  | MetroNotifyAlert[]
  | {
      alerts?: MetroNotifyAlert[];
    };

function normaliseMetroAlert(raw: Partial<MetroNotifyAlert> & Record<string, unknown>, index: number): MetroNotifyAlert {
  const lines = Array.isArray(raw.lines)
    ? raw.lines.filter((line): line is string => typeof line === "string" && line.trim().length > 0)
    : [];

  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id : `metro-${index}`,
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title : "Metro service alert",
    summary: typeof raw.summary === "string" ? raw.summary : "",
    lines,
    status: typeof raw.status === "string" && raw.status.trim() ? raw.status : "active",
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
    url: typeof raw.url === "string" ? raw.url : undefined,
    source: "metro",
  };
}

export async function fetchMetroNotifyAlerts(): Promise<MetroNotifyAlert[]> {
  const response = await fetch("/api/metro-notify/alerts");

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    let message = `Failed to load Metro alerts (${response.status})`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload?.error) {
        message = payload.error;
      }
    } catch {
      // Keep the generic message if the endpoint body is not JSON.
    }
    throw new Error(message);
  }

  const payload = (await response.json()) as MetroNotifyResponse;
  const alerts = Array.isArray(payload) ? payload : payload.alerts ?? [];
  return alerts.map((alert, index) => normaliseMetroAlert(alert, index));
}

export function isToday(timestamp?: string): boolean {
  if (!timestamp) return false;

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function toSearchableText(value: string | null | undefined): string {
  return (value ?? "").toLowerCase();
}

function metroAlertMatchesReport(alert: MetroNotifyAlert, report: Report): boolean {
  const reportText = [
    report.lineNumber,
    report.locationName,
    report.notes,
    report.transportType,
  ]
    .map(toSearchableText)
    .join(" ");

  const alertText = [alert.title, alert.summary, ...alert.lines].map(toSearchableText).join(" ");

  const lineMatches = Boolean(
    report.lineNumber &&
      alert.lines.some((line) => toSearchableText(line).includes(toSearchableText(report.lineNumber))),
  );

  const locationMatches = Boolean(
    report.locationName &&
      (alertText.includes(toSearchableText(report.locationName)) ||
        reportText.includes(alertText.slice(0, 48))),
  );

  return lineMatches || locationMatches;
}

export function getTodaysCommunityAlerts(reports: Report[], metroAlerts: MetroNotifyAlert[]): Report[] {
  return reports.filter((report) => {
    if (!isToday(report.createdAt)) return false;
    return !metroAlerts.some((alert) => metroAlertMatchesReport(alert, report));
  });
}
