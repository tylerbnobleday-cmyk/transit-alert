import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, BellRing, ExternalLink, MessageSquareWarning, TrainFront, TriangleAlert } from "lucide-react";
import { useGetReports } from "@/lib/api-client-react/src/generated/api";
import { fetchMetroNotifyAlerts, getTodaysCommunityAlerts, type MetroNotifyAlert } from "@/lib/todays-alerts";

type FeaturedAlert =
  | Awaited<ReturnType<typeof fetchMetroNotifyAlerts>>[number]
  | ReturnType<typeof getTodaysCommunityAlerts>[number]
  | undefined;

function getFeaturedAlertTitle(featuredAlert: FeaturedAlert) {
  if (!featuredAlert) return "No featured alert yet";
  if ("title" in featuredAlert) return featuredAlert.title;
  return featuredAlert.locationName;
}

function getFeaturedAlertSummary(featuredAlert: FeaturedAlert) {
  if (!featuredAlert) return "No active major service alerts right now.";
  if ("summary" in featuredAlert) return featuredAlert.summary || "Metro service alert available.";
  return featuredAlert.notes || "Fresh community context is available for today.";
}

function getAlertCategory(alert: MetroNotifyAlert) {
  const searchable = `${alert.title} ${alert.summary}`.toLowerCase();
  if (searchable.includes("bus replacement") || searchable.includes("coach replacement")) {
    return "Bus Replacement";
  }
  if (searchable.includes("planned work")) {
    return "Planned Works";
  }
  if (searchable.includes("station detour") || searchable.includes("access") || searchable.includes("exit")) {
    return "Station detour";
  }
  if (searchable.includes("work") || searchable.includes("maintenance")) {
    return "Works Alert";
  }
  if (searchable.includes("delay")) {
    return "Delay";
  }
  return "Service Alert";
}

function isFreshAlert(updatedAt?: string) {
  if (!updatedAt) return true;
  const diff = Date.now() - new Date(updatedAt).getTime();
  return diff < 1000 * 60 * 60 * 24 * 14;
}

function getOperationDetail(alert: MetroNotifyAlert) {
  const summary = alert.summary?.trim();
  if (summary) return summary;
  return "Check run details and plan your journey where possible with service alterations in place.";
}

export default function TodaysAlerts() {
  const { data: reports } = useGetReports({
    query: { refetchInterval: 60000 },
  });

  const { data: metroAlerts = [], isLoading: isMetroLoading } = useQuery({
    queryKey: ["/api/metro-notify/alerts"],
    queryFn: fetchMetroNotifyAlerts,
    refetchInterval: 60000,
  });

  const allReports = Array.isArray(reports) ? reports : [];
  const communityAlerts = useMemo(
    () => getTodaysCommunityAlerts(allReports, metroAlerts),
    [allReports, metroAlerts],
  );

  const featuredAlert = metroAlerts[0] ?? communityAlerts[0];
  const sortedMetroAlerts = [...metroAlerts].sort((a, b) => {
    const left = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const right = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return right - left;
  });
  const operationCards = sortedMetroAlerts.slice(0, 3);

  return (
    <main className="min-h-[100dvh] bg-background text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300/80">Featured View</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Today&apos;s Alerts</h1>
            <p className="mt-2 text-sm text-white/60">
              Metro service notifications and filtered community reports in one place.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to map
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
          <section className="rounded-[2rem] border border-white/10 bg-card/80 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-200">
                <BellRing className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300/80">
                  Today&apos;s featured alert
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{getFeaturedAlertTitle(featuredAlert)}</h2>
                <p className="mt-2 text-sm text-white/70">{getFeaturedAlertSummary(featuredAlert)}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">Metro Notify</p>
                <p className="mt-2 text-3xl font-bold text-white">{metroAlerts.length}</p>
                <p className="mt-1 text-xs text-white/55">Service notifications</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">Community</p>
                <p className="mt-2 text-3xl font-bold text-white">{communityAlerts.length}</p>
                <p className="mt-1 text-xs text-white/55">Unique reports today</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">Filtering</p>
                <p className="mt-2 text-3xl font-bold text-white">{Math.max(allReports.length - communityAlerts.length, 0)}</p>
                <p className="mt-1 text-xs text-white/55">Duplicate reports trimmed</p>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-card/80 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-200">
                <TriangleAlert className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">What&apos;s live right now</h2>
                <p className="text-sm text-white/60">This panel gives you the strongest signals first.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm text-white/70">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white">Metro service alerts</p>
                <p className="mt-1">
                  {isMetroLoading
                    ? "Loading Metro alerts..."
                    : "Backed by the live alerts feed, with a TransportVic fallback when needed."}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white">User-generated notifications</p>
                <p className="mt-1">Filtered to reduce duplicates that just restate Metro-flagged disruptions.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white">Train-focused routing</p>
                <p className="mt-1">The map already exposes live consist tracking, and the next journey planner step is to connect that to GTFS trip timing data.</p>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-[2rem] border border-white/10 bg-card/80 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300/80">Live Operations</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{operationCards.length} New Alerts</h2>
              <p className="mt-2 text-sm text-white/60">Seen included / Newest first</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 md:min-w-[320px]">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">Push notifications</p>
                <p className="mt-2 text-lg font-semibold text-white">Off</p>
                <p className="mt-1 text-xs text-white/55">Hook this to Telegram or browser push next.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">Live tracking</p>
                <p className="mt-2 text-lg font-semibold text-white">How it works</p>
                <p className="mt-1 text-xs text-white/55">
                  The map polls live consist snapshots, then drops trains onto the network when active runs are detected.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {operationCards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-white/55">
                No live operations alerts are available right now.
              </div>
            ) : (
              operationCards.map((alert) => {
                const category = getAlertCategory(alert);
                const fresh = isFreshAlert(alert.updatedAt);
                const detailUrl = alert.url || "https://transport.vic.gov.au/disruptions/disruptions-information";

                return (
                  <article key={`operations-${alert.id}`} className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
                            {category}
                          </span>
                          {fresh && (
                            <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                              New
                            </span>
                          )}
                        </div>

                        <h3 className="mt-3 text-lg font-semibold text-white">{alert.title}</h3>
                        <p className="mt-2 text-sm text-white/70">{getOperationDetail(alert)}</p>

                        <p className="mt-3 text-xs text-white/45">
                          {alert.updatedAt
                            ? `${formatDistanceToNow(new Date(alert.updatedAt), { addSuffix: true })}`
                            : "Just updated"}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <a
                          href={detailUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                        >
                          Read more
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        {alert.addToCalendarUrl && (
                          <a
                            href={alert.addToCalendarUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                          >
                            Add to calendar
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-[2rem] border border-white/10 bg-card/80 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-3">
              <TrainFront className="h-5 w-5 text-blue-300" />
              <div>
                <h2 className="text-lg font-semibold">Metro service notifications</h2>
                <p className="text-sm text-white/60">Dedicated transport network alerts with Metro/PTV data and a TransportVic fallback.</p>
              </div>
            </div>

            <div className="space-y-3">
              {metroAlerts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-white/55">
                  No Metro service alerts are available from `/api/metro-notify/alerts` right now.
                </div>
              ) : (
                metroAlerts.map((alert) => (
                  <article key={alert.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-white">{alert.title}</h3>
                        <p className="mt-1 text-sm text-white/65">{alert.summary || "Service disruption in progress."}</p>
                      </div>
                      <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
                        {alert.status}
                      </span>
                    </div>

                    {alert.lines.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {alert.lines.map((line) => (
                          <span key={`${alert.id}-${line}`} className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/75">
                            {line}
                          </span>
                        ))}
                      </div>
                    )}

                    {alert.updatedAt && (
                      <p className="mt-3 text-xs text-white/45">
                        Updated {formatDistanceToNow(new Date(alert.updatedAt), { addSuffix: true })}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {alert.url && (
                        <a
                          href={alert.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                        >
                          Read more
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {alert.addToCalendarUrl && (
                        <a
                          href={alert.addToCalendarUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                        >
                          Add to calendar
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-card/80 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-3">
              <MessageSquareWarning className="h-5 w-5 text-amber-300" />
              <div>
                <h2 className="text-lg font-semibold">Community alerts</h2>
                <p className="text-sm text-white/60">User reports that add fresh detail beyond Metro service notices.</p>
              </div>
            </div>

            <div className="space-y-3">
              {communityAlerts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-white/55">
                  No unique community alerts for today yet.
                </div>
              ) : (
                communityAlerts.map((report) => (
                  <article key={report.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-white">
                          {report.locationName}
                          {report.lineNumber ? ` - ${report.lineNumber}` : ""}
                        </h3>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">
                          {report.transportType} - {report.reportType}
                        </p>
                      </div>
                      <span className="text-xs text-white/45">
                        {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                      </span>
                    </div>

                    {report.notes && <p className="mt-3 text-sm text-white/70">{report.notes}</p>}
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
