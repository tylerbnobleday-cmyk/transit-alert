import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, BellRing, ExternalLink, MessageSquareWarning, TrainFront, TriangleAlert, X } from "lucide-react";
import { useGetReports } from "@/lib/api-client-react/src/generated/api";
import { fetchMetroNotifyAlerts, getTodaysCommunityAlerts, type MetroNotifyAlert } from "@/lib/todays-alerts";

type FeaturedAlert =
  | Awaited<ReturnType<typeof fetchMetroNotifyAlerts>>[number]
  | ReturnType<typeof getTodaysCommunityAlerts>[number]
  | undefined;

type AlertFilterId =
  | "all"
  | "trespasser"
  | "faulty-train"
  | "track-fault"
  | "bus-replacement"
  | "works-upgrade"
  | "station-access"
  | "delay"
  | "other";

type AlertGroupId =
  | "all"
  | "metro-tunnel"
  | "cross-city"
  | "burnley"
  | "clifton-hill"
  | "northern"
  | "frankston"
  | "sandringham"
  | "other";

type AlertFilter = {
  id: AlertFilterId;
  label: string;
  keywords?: string[];
};

type AlertGroup = {
  id: AlertGroupId;
  label: string;
  aliases?: string[];
  activeClassName?: string;
  inactiveBadgeClassName?: string;
  activeBadgeClassName?: string;
};

const ALERT_FILTERS: AlertFilter[] = [
  { id: "all", label: "All alerts" },
  { id: "trespasser", label: "Trespassers", keywords: ["trespasser", "trespass", "police request", "person near the tracks", "person on the tracks"] },
  { id: "faulty-train", label: "Faulty train", keywords: ["faulty train", "disabled train", "train fault", "mechanical fault", "mechanical issue", "equipment fault", "broken down train"] },
  { id: "track-fault", label: "Track fault", keywords: ["track fault", "signalling", "signal fault", "points fault", "overhead fault", "power fault", "infrastructure fault"] },
  { id: "bus-replacement", label: "Bus replacement", keywords: ["bus replacement", "replacement bus", "coach replacement", "coach service"] },
  { id: "works-upgrade", label: "Works / upgrades", keywords: ["planned work", "works", "maintenance", "upgrade", "big build", "occupation", "level crossing removal"] },
  { id: "station-access", label: "Station / access", keywords: ["station detour", "access", "exit", "lift outage", "escalator", "entrance closed", "platform closure"] },
  { id: "delay", label: "Delays", keywords: ["delay", "major delays", "delayed", "service change", "service disruption"] },
  { id: "other", label: "Other" },
];

const ALERT_BROWSER_NOTIFICATIONS_KEY = "transitalert-alert-browser-notifications";

const ALERT_GROUPS: AlertGroup[] = [
  { id: "all", label: "All groups", activeClassName: "border-white/25 bg-white/12 text-white", inactiveBadgeClassName: "border-white/10 bg-white/5 text-white/70", activeBadgeClassName: "border-white/25 bg-white/12 text-white" },
  { id: "metro-tunnel", label: "Cranbourne, Pakenham and Sunbury", aliases: ["metro tunnel", "pakenham line", "cranbourne line", "sunbury line", "town hall", "state library", "anzac", "arden", "parkville", "watergardens", "st albans", "sunshine", "west footscray", "middle footscray", "footscray", "hawksburn", "toorak", "armadale", "malvern", "caulfield", "carnegie", "murrumbeena", "hughesdale", "oakleigh", "huntingdale", "clayton", "westall", "springvale", "sandown park", "noble park", "yarraman", "dandenong", "lynbrook", "merinda park", "cranbourne", "hallam", "narre warren", "berwick", "beaconsfield", "officer", "cardinia road", "pakenham", "east pakenham"], activeClassName: "border-cyan-400/35 bg-cyan-500/15 text-cyan-100", inactiveBadgeClassName: "border-cyan-400/15 bg-cyan-500/10 text-cyan-100/85", activeBadgeClassName: "border-cyan-400/35 bg-cyan-500/15 text-cyan-100" },
  { id: "cross-city", label: "Laverton, Werribee and Williamstown", aliases: ["laverton", "werribee line", "williamstown line", "altona loop", "north williamstown", "williamstown beach", "williamstown", "newport", "spotswood", "yarraville", "seddon", "south kensington", "aircraft", "williams landing", "hoppers crossing", "seaholme", "altona", "westona", "werribee", "point cook", "galvin", "paisley"], activeClassName: "border-fuchsia-400/35 bg-fuchsia-500/15 text-fuchsia-100", inactiveBadgeClassName: "border-fuchsia-400/15 bg-fuchsia-500/10 text-fuchsia-100/85", activeBadgeClassName: "border-fuchsia-400/35 bg-fuchsia-500/15 text-fuchsia-100" },
  { id: "burnley", label: "Burnley group", aliases: ["belgrave line", "lilydale line", "glen waverley line", "alamein line", "burnley", "east richmond", "hawthorn", "glenferrie", "auburn", "camberwell", "east camberwell", "canterbury", "chatham", "surrey hills", "mont albert", "box hill", "laburnum", "blackburn", "nunawading", "mitcham", "heatherdale", "ringwood", "ringwood east", "croydon", "mooroolbark", "lilydale", "upper ferntree gully", "ferntree gully", "boronia", "bayswater", "heathmont", "tecoma", "belgrave", "riversdale", "willison", "hartwell", "burwood", "ashburton", "alamein", "heyington", "kooyong", "tooronga", "gardiner", "glen iris", "darling", "east malvern", "holmesglen", "jordanville", "mount waverley", "syndal", "glen waverley"], activeClassName: "border-blue-400/35 bg-blue-500/15 text-blue-100", inactiveBadgeClassName: "border-blue-400/15 bg-blue-500/10 text-blue-100/85", activeBadgeClassName: "border-blue-400/35 bg-blue-500/15 text-blue-100" },
  { id: "clifton-hill", label: "Clifton Hill", aliases: ["mernda line", "hurstbridge line", "jolimont", "west richmond", "north richmond", "collingwood", "victoria park", "clifton hill", "rushall", "merri", "northcote", "croxton", "thornbury", "bell", "preston", "regent", "reservoir", "ruthven", "keon park", "thomastown", "lalor", "epping", "south morang", "middle gorge", "hawkstowe", "mernda", "westgarth", "dennis", "fairfield", "alphington", "darebin", "ivanhoe", "eaglemont", "heidelberg", "rosanna", "macleod", "watsonia", "greensborough", "montmorency", "eltham", "diamond creek", "wattle glen", "hurstbridge"], activeClassName: "border-rose-400/35 bg-rose-500/15 text-rose-100", inactiveBadgeClassName: "border-rose-400/15 bg-rose-500/10 text-rose-100/85", activeBadgeClassName: "border-rose-400/35 bg-rose-500/15 text-rose-100" },
  { id: "northern", label: "Upfield and Craigieburn", aliases: ["upfield line", "craigieburn line", "north melbourne", "kensington", "newmarket", "ascot vale", "moonee ponds", "essendon", "glenbervie", "strathmore", "pascoe vale", "oak park", "glenroy", "jacana", "broadmeadows", "coolaroo", "roxburgh park", "craigieburn", "macaulay", "flemington bridge", "royal park", "jewell", "brunswick", "anstey", "moreland", "coburg", "batman", "merlynston", "fawkner", "gowrie", "upfield"], activeClassName: "border-amber-400/35 bg-amber-500/15 text-amber-100", inactiveBadgeClassName: "border-amber-400/15 bg-amber-500/10 text-amber-100/85", activeBadgeClassName: "border-amber-400/35 bg-amber-500/15 text-amber-100" },
  { id: "frankston", label: "Frankston", aliases: ["frankston line", "stony point line", "glen huntly", "ormond", "mckinnon", "bentleigh", "patterson", "moorabbin", "highett", "southland", "cheltenham", "mentone", "parkdale", "mordialloc", "aspendale", "edithvale", "chelsea", "bonbeach", "carrum", "seaford", "kananook", "frankston", "leeton", "tyabb", "hastings", "bittern", "morradoo", "crib point", "stony point"], activeClassName: "border-emerald-400/35 bg-emerald-500/15 text-emerald-100", inactiveBadgeClassName: "border-emerald-400/15 bg-emerald-500/10 text-emerald-100/85", activeBadgeClassName: "border-emerald-400/35 bg-emerald-500/15 text-emerald-100" },
  { id: "sandringham", label: "Sandringham", aliases: ["sandringham line", "prahran", "windsor", "balaclava", "ripponlea", "elsternwick", "gardenvale", "north brighton", "middle brighton", "brighton beach", "hampton", "sandringham"], activeClassName: "border-[#F178AF]/45 bg-[#F178AF]/18 text-[#FFD8EA]", inactiveBadgeClassName: "border-[#F178AF]/25 bg-[#F178AF]/12 text-[#FFD8EA]", activeBadgeClassName: "border-[#F178AF]/45 bg-[#F178AF]/18 text-[#FFD8EA]" },
  { id: "other", label: "Other", activeClassName: "border-slate-300/35 bg-slate-400/15 text-slate-100", inactiveBadgeClassName: "border-slate-300/15 bg-slate-400/10 text-slate-100/85", activeBadgeClassName: "border-slate-300/35 bg-slate-400/15 text-slate-100" },
];

function getAlertGroupTone(group: AlertGroup, active: boolean) {
  if (active) {
    return group.activeClassName ?? "border-emerald-400/30 bg-emerald-500/15 text-emerald-100";
  }

  return "border-white/10 bg-white/5 text-white/70 hover:bg-white/10";
}

function getAlertGroupBadgeTone(group: AlertGroup, active = false) {
  if (active) {
    return group.activeBadgeClassName ?? "border-emerald-400/35 bg-emerald-500/15 text-emerald-100";
  }

  return group.inactiveBadgeClassName ?? "border-emerald-400/15 bg-emerald-500/10 text-emerald-100/85";
}

function getAlertGroupPillTone(group: AlertGroup) {
  return group.inactiveBadgeClassName ?? "border-emerald-400/15 bg-emerald-500/10 text-emerald-100/85";
}

function getAlertGroupStripTone(group: AlertGroup) {
  switch (group.id) {
    case "metro-tunnel":
      return "bg-cyan-400";
    case "cross-city":
      return "bg-fuchsia-400";
    case "burnley":
      return "bg-blue-400";
    case "clifton-hill":
      return "bg-rose-400";
    case "northern":
      return "bg-amber-400";
    case "frankston":
      return "bg-emerald-400";
    case "sandringham":
      return "bg-[#F178AF]";
    default:
      return "bg-slate-400";
  }
}

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
  const filter = getAlertFilter(alert);
  if (filter.id === "bus-replacement") {
    return "Bus Replacement";
  }
  if (filter.id === "trespasser") {
    return "Trespasser";
  }
  if (filter.id === "faulty-train") {
    return "Faulty Train";
  }
  if (filter.id === "track-fault") {
    return "Track Fault";
  }
  if (filter.id === "station-access") {
    return "Station / Access";
  }
  if (filter.id === "works-upgrade") {
    return "Works Alert";
  }
  if (filter.id === "delay") {
    return "Delay";
  }
  return "Service Alert";
}

function getAlertSearchableText(alert: MetroNotifyAlert) {
  return `${alert.title} ${alert.summary} ${alert.lines.join(" ")}`.toLowerCase();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getAlertFilter(alert: MetroNotifyAlert): AlertFilter {
  const searchable = getAlertSearchableText(alert);
  const matched = ALERT_FILTERS.find(
    (filter) =>
      filter.id !== "all" &&
      filter.id !== "other" &&
      filter.keywords?.some((keyword) => searchable.includes(keyword)),
  );

  return matched ?? ALERT_FILTERS.find((filter) => filter.id === "other")!;
}

function getAlertGroup(alert: MetroNotifyAlert): AlertGroup {
  const titleText = cleanAlertCopy(alert.title).toLowerCase();
  const summaryText = cleanAlertCopy(alert.summary).toLowerCase();
  const normalisedLines = alert.lines.map((line) => line.trim().toLowerCase());

  const scoredGroups = ALERT_GROUPS.map((group) => {
    if (group.id === "all" || group.id === "other") {
      return { group, score: -1 };
    }

    const score = (group.aliases ?? []).reduce((total, alias) => {
      const lower = alias.toLowerCase();
      const pattern = new RegExp(`\\b${escapeRegExp(lower)}\\b`, "i");
      let aliasScore = 0;

      if (normalisedLines.includes(lower)) aliasScore = Math.max(aliasScore, 4);
      if (pattern.test(titleText)) aliasScore = Math.max(aliasScore, 5);
      if (pattern.test(summaryText)) aliasScore = Math.max(aliasScore, 1);

      return total + aliasScore;
    }, 0);

    return { group, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  return scoredGroups[0]?.group ?? ALERT_GROUPS.find((group) => group.id === "other")!;
}

function isFreshAlert(updatedAt?: string) {
  if (!updatedAt) return true;
  const diff = Date.now() - new Date(updatedAt).getTime();
  return diff < 1000 * 60 * 60 * 24 * 14;
}

function shouldHideExpiredAlert(alert: MetroNotifyAlert) {
  const filter = getAlertFilter(alert);
  if (filter.id !== "trespasser") {
    return false;
  }

  if (!alert.updatedAt) {
    return false;
  }

  const updatedAt = new Date(alert.updatedAt).getTime();
  if (Number.isNaN(updatedAt)) {
    return false;
  }

  const diff = Date.now() - updatedAt;
  return diff > 1000 * 60 * 15;
}

function getOperationDetail(alert: MetroNotifyAlert) {
  const summary = getAlertFeedDetail(alert);
  if (summary) return summary;
  return "Check run details and plan your journey where possible with service alterations in place.";
}

function cleanAlertCopy(value: string) {
  return value
    .replace(/^\s*(?:aus:vic:)?vic-02-[a-z0-9-]+:{1,2}\s*/i, "")
    .replace(/\s+/g, " ")
    .replace(/\bplanned work:\s*/i, "")
    .replace(/\bwhat to expect:\s*/gi, "")
    .trim();
}

function getShortAlertSentence(value: string) {
  const cleaned = cleanAlertCopy(value);
  if (!cleaned) return "";

  const firstSentence = cleaned.match(/[^.!?]+[.!?]?/u)?.[0]?.trim() ?? cleaned;
  const looksBroken =
    firstSentence.length < 12 ||
    /^\d+[.)]?\s*$/u.test(firstSentence) ||
    /^[^a-zA-Z]*\d+[^a-zA-Z]*$/u.test(firstSentence);

  const fallbackSentence = cleaned
    .split(/(?<=[.!?])\s+/u)
    .map((part) => part.trim())
    .find((part) => part.length >= 18 && /[a-zA-Z]/u.test(part));

  const candidate = looksBroken ? fallbackSentence ?? cleaned : firstSentence;
  return candidate.length > 220 ? `${candidate.slice(0, 217).trimEnd()}...` : candidate;
}

function getAlertFeedHeadline(alert: MetroNotifyAlert) {
  const leadLine = alert.lines.find((line) => line.trim().length > 0)?.trim();
  const title = cleanAlertCopy(alert.title);
  const summary = cleanAlertCopy(alert.summary);
  const primaryText = title || summary || "Service alert in progress.";
  const matchedGroup = getAlertGroup(alert);
  const leadLineMatchesGroup = leadLine
    ? matchedGroup.aliases?.some((alias) => alias.toLowerCase() === leadLine.toLowerCase()) ?? false
    : false;
  const titleStartsWithStationOrLocation = /^(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s+(?:Station|stn|car spaces|lift|bus|works|closure|closures)/.test(title);
  const referencesTwoEndpoints = /\b(?:between|from)\s+.+\s+(?:and|to)\s+.+/i.test(title);

  if (!leadLine) {
    return primaryText;
  }

  if (primaryText.toLowerCase().includes(leadLine.toLowerCase())) {
    return primaryText;
  }

  if (!leadLineMatchesGroup || titleStartsWithStationOrLocation) {
    return primaryText;
  }

  if (referencesTwoEndpoints) {
    return primaryText;
  }

  return `${leadLine}: ${primaryText}`;
}

function getAlertFeedDetail(alert: MetroNotifyAlert) {
  const title = cleanAlertCopy(alert.title);
  const summary = cleanAlertCopy(alert.summary);
  const shortSummary = getShortAlertSentence(summary);

  if (shortSummary && shortSummary.toLowerCase() !== title.toLowerCase()) {
    return shortSummary;
  }

  return "Check run details and plan ahead if your trip is affected.";
}

function getAlertDisplayLines(alert: MetroNotifyAlert) {
  const titleText = cleanAlertCopy(alert.title).toLowerCase();
  const summaryText = cleanAlertCopy(alert.summary).toLowerCase();
  const searchable = `${titleText} ${summaryText}`;
  const group = getAlertGroup(alert);

  if (group.id === "metro-tunnel") {
    if (searchable.includes("dandenong")) {
      return ["Dandenong Line"];
    }
    if (searchable.includes("cranbourne")) {
      return ["Cranbourne Line"];
    }
    if (searchable.includes("pakenham")) {
      return ["Pakenham Line"];
    }
    if (searchable.includes("sunbury")) {
      return ["Sunbury Line"];
    }
    return ["Cranbourne, Pakenham and Sunbury"];
  }

  if (group.id === "northern") {
    if (searchable.includes("pascoe vale")) {
      return ["Craigieburn corridor"];
    }
    if (searchable.includes("upfield")) {
      return ["Upfield corridor"];
    }
    if (searchable.includes("craigieburn")) {
      return ["Craigieburn corridor"];
    }
  }

  if (group.id === "cross-city") {
    if (searchable.includes("williamstown")) {
      return ["Williamstown corridor"];
    }
    if (searchable.includes("werribee")) {
      return ["Werribee corridor"];
    }
    if (searchable.includes("laverton")) {
      return ["Laverton corridor"];
    }
  }

  if (group.id === "frankston") {
    if (searchable.includes("stony point")) {
      return ["Stony Point Line"];
    }
    if (searchable.includes("frankston")) {
      return ["Frankston Line"];
    }
  }

  const matchingLines = alert.lines.filter((line) =>
    group.aliases?.some((alias) => alias.toLowerCase() === line.trim().toLowerCase()),
  );

  if (matchingLines.length > 0) {
    return matchingLines;
  }

  return [group.label];
}

function getAlertRouteLabel(alert: MetroNotifyAlert) {
  const title = cleanAlertCopy(alert.title);

  const fromMatch = title.match(/\bfrom\s+(.+?)\s+to\s+(.+)$/i);
  if (fromMatch) {
    return `${fromMatch[1].trim()} -> ${fromMatch[2].trim()}`;
  }

  const betweenMatch = title.match(/\bbetween\s+(.+?)\s+and\s+(.+)$/i);
  if (betweenMatch) {
    return `${betweenMatch[1].trim()} <-> ${betweenMatch[2].trim()}`;
  }

  const stationMatch = title.match(/^(.+?)\s+Station\s+/i);
  if (stationMatch?.[1]?.trim()) {
    return `${stationMatch[1].trim()} Station`;
  }

  return null;
}

function buildMetroPlannedWorksSlug(title: string) {
  return cleanAlertCopy(title)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getAlertDetailUrl(alert: MetroNotifyAlert) {
  const cleanedTitle = cleanAlertCopy(alert.title);
  const searchable = `${cleanedTitle} ${cleanAlertCopy(alert.summary)}`.toLowerCase();

  if (
    searchable.includes("williams landing car space closures") ||
    (searchable.includes("williams landing") && searchable.includes("wallace avenue"))
  ) {
    return "https://www.metrotrains.com.au/planned-works/?pwId=714131";
  }

  if (
    searchable.includes("buses replace trains from newport to werribee") ||
    (searchable.includes("newport") && searchable.includes("werribee") && searchable.includes("replacement buses"))
  ) {
    return "https://www.metrotrains.com.au/planned-works/?pwId=726190";
  }

  const isWorksAlert = getAlertFilter(alert).id === "works-upgrade" || searchable.includes("planned work");

  if (isWorksAlert) {
    const slug = buildMetroPlannedWorksSlug(cleanedTitle);
    if (slug) {
      return `https://www.metrotrains.com.au/planned-works/${slug}/`;
    }
    return "https://www.metrotrains.com.au/planned-works/";
  }

  return alert.url || "https://transport.vic.gov.au/disruptions/disruptions-information";
}

export default function TodaysAlerts() {
  const [selectedFilter, setSelectedFilter] = useState<AlertFilterId>("all");
  const [selectedGroup, setSelectedGroup] = useState<AlertGroupId>("all");
  const [expandedGroupId, setExpandedGroupId] = useState<AlertGroupId | null>(null);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState<NotificationPermission | "unsupported">(
    typeof window === "undefined" || !("Notification" in window) ? "unsupported" : Notification.permission,
  );
  const seenAlertIdsRef = useRef<string[]>([]);
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

  const activeMetroAlerts = useMemo(
    () => metroAlerts.filter((alert) => !shouldHideExpiredAlert(alert)),
    [metroAlerts],
  );
  const sortedMetroAlerts = [...activeMetroAlerts].sort((a, b) => {
    const left = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const right = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return right - left;
  });
  const filteredMetroAlerts = useMemo(() => {
    return sortedMetroAlerts.filter((alert) => {
      const typeMatches = selectedFilter === "all" || getAlertFilter(alert).id === selectedFilter;
      const groupMatches = selectedGroup === "all" || getAlertGroup(alert).id === selectedGroup;
      return typeMatches && groupMatches;
    });
  }, [selectedFilter, selectedGroup, sortedMetroAlerts]);
  const groupedAlertSummaries = useMemo(
    () =>
      ALERT_GROUPS.filter((group) => group.id !== "all").map((group) => {
        const alerts = sortedMetroAlerts.filter((alert) => getAlertGroup(alert).id === group.id);
        return {
          group,
          count: alerts.length,
          latestAlert: alerts[0],
        };
      }),
    [sortedMetroAlerts],
  );
  const expandedGroup = expandedGroupId
    ? ALERT_GROUPS.find((group) => group.id === expandedGroupId) ?? null
    : null;
  const expandedGroupAlerts = expandedGroup
    ? sortedMetroAlerts.filter((alert) => getAlertGroup(alert).id === expandedGroup.id)
    : [];
  const featuredAlert = filteredMetroAlerts[0] ?? activeMetroAlerts[0] ?? communityAlerts[0];
  const operationCards = filteredMetroAlerts.slice(0, 3);
  const activeFilterLabel = ALERT_FILTERS.find((filter) => filter.id === selectedFilter)?.label ?? "All alerts";
  const activeGroupLabel = ALERT_GROUPS.find((group) => group.id === selectedGroup)?.label ?? "All groups";
  const browserNotificationsSupported =
    typeof window !== "undefined" && "Notification" in window;
  const browserNotificationsStatusLabel =
    browserNotificationPermission === "granted"
      ? browserNotificationsEnabled
        ? "On"
        : "Ready"
      : browserNotificationPermission === "denied"
        ? "Blocked"
        : browserNotificationPermission === "unsupported"
          ? "Unsupported"
          : "Off";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(ALERT_BROWSER_NOTIFICATIONS_KEY);
    setBrowserNotificationsEnabled(stored === "true");
    if ("Notification" in window) {
      setBrowserNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    const currentIds = metroAlerts.map((alert) => alert.id);
    if (seenAlertIdsRef.current.length === 0) {
      seenAlertIdsRef.current = currentIds;
      return;
    }

    if (
      !browserNotificationsEnabled ||
      !browserNotificationsSupported ||
      browserNotificationPermission !== "granted"
    ) {
      seenAlertIdsRef.current = currentIds;
      return;
    }

    const newAlerts = metroAlerts.filter((alert) => !seenAlertIdsRef.current.includes(alert.id));
    if (newAlerts.length > 0 && typeof document !== "undefined" && document.visibilityState === "hidden") {
      newAlerts.slice(0, 3).forEach((alert) => {
        new Notification(getAlertCategory(alert), {
          body: getAlertFeedHeadline(alert),
          tag: `transitalert-${alert.id}`,
        });
      });
    }

    seenAlertIdsRef.current = currentIds;
  }, [
    browserNotificationPermission,
    browserNotificationsEnabled,
    browserNotificationsSupported,
    metroAlerts,
  ]);

  const handleToggleBrowserNotifications = async () => {
    if (!browserNotificationsSupported || typeof window === "undefined") {
      return;
    }

    if (browserNotificationPermission === "granted") {
      const nextValue = !browserNotificationsEnabled;
      setBrowserNotificationsEnabled(nextValue);
      window.localStorage.setItem(ALERT_BROWSER_NOTIFICATIONS_KEY, String(nextValue));
      return;
    }

    if (browserNotificationPermission === "denied") {
      return;
    }

    const permission = await Notification.requestPermission();
    setBrowserNotificationPermission(permission);
    const enabled = permission === "granted";
    setBrowserNotificationsEnabled(enabled);
    window.localStorage.setItem(ALERT_BROWSER_NOTIFICATIONS_KEY, String(enabled));
  };

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
              <p className="mt-2 text-sm text-white/60">{activeFilterLabel} · {activeGroupLabel} / newest first</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 md:min-w-[320px]">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">Push notifications</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-lg font-semibold text-white">{browserNotificationsStatusLabel}</p>
                  <button
                    type="button"
                    onClick={handleToggleBrowserNotifications}
                    disabled={!browserNotificationsSupported || browserNotificationPermission === "denied"}
                    className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      browserNotificationPermission === "denied" || !browserNotificationsSupported
                        ? "cursor-not-allowed border-white/10 bg-white/5 text-white/35"
                        : browserNotificationsEnabled
                          ? "border-emerald-400/25 bg-emerald-500/15 text-emerald-100"
                          : "border-blue-400/25 bg-blue-500/15 text-blue-100 hover:bg-blue-500/20"
                    }`}
                  >
                    {browserNotificationsEnabled ? "Turn off" : "Turn on"}
                  </button>
                </div>
                <p className="mt-1 text-xs text-white/55">
                  {browserNotificationPermission === "denied"
                    ? "Browser notifications are blocked for this site. Re-enable them in site settings."
                    : browserNotificationsSupported
                      ? "One tap enables browser alerts for new Metro notifications while the app is open."
                      : "This browser does not support web notifications here."}
                </p>
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

          <div className="mt-5 flex flex-wrap gap-2">
            {ALERT_FILTERS.map((filter) => {
              const isActive = selectedFilter === filter.id;
              const count =
                filter.id === "all"
                  ? sortedMetroAlerts.length
                  : sortedMetroAlerts.filter((alert) => getAlertFilter(alert).id === filter.id).length;

              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setSelectedFilter(filter.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "border-blue-400/30 bg-blue-500/15 text-blue-100"
                      : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {filter.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${isActive ? "bg-blue-400/20 text-blue-100" : "bg-white/10 text-white/65"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {groupedAlertSummaries.map(({ group, count, latestAlert }) => {
              const isActive = selectedGroup === group.id;

              return (
                <button
                  key={`group-summary-${group.id}`}
                  type="button"
                  onClick={() => {
                    setSelectedGroup(group.id);
                    setExpandedGroupId(group.id);
                  }}
                  className={`relative overflow-hidden rounded-[1.25rem] border p-4 pt-5 text-left transition ${getAlertGroupTone(group, isActive)}`}
                >
                  <div className={`absolute inset-x-0 top-0 h-1.5 ${getAlertGroupStripTone(group)}`} />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{group.label}</p>
                      <p className="mt-1 text-xs text-white/55">
                        {count === 0
                          ? "No current alerts"
                          : count === 1
                            ? "1 active alert"
                            : `${count} active alerts`}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-semibold ${getAlertGroupBadgeTone(group, isActive)}`}>
                      {count}
                    </span>
                  </div>

                  <div className="mt-3 rounded-2xl border border-white/10 bg-black/10 p-3">
                    {latestAlert ? (
                      <>
                        <p className="text-sm font-semibold leading-snug text-white">
                          {getAlertFeedHeadline(latestAlert)}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-white/60">
                          {getAlertFeedDetail(latestAlert)}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-white/45">
                        Nothing major is showing for this group right now.
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 space-y-3">
            {operationCards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-white/55">
                No live operations alerts match the current filter right now.
              </div>
            ) : (
              operationCards.map((alert) => {
                const category = getAlertCategory(alert);
                const alertGroup = getAlertGroup(alert);
                const fresh = isFreshAlert(alert.updatedAt);
                const detailUrl = getAlertDetailUrl(alert);
                const displayLines = getAlertDisplayLines(alert);
                const routeLabel = getAlertRouteLabel(alert);
                const pillTone = getAlertGroupPillTone(alertGroup);

                return (
                  <article key={`operations-${alert.id}`} className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-white">{category}</span>
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getAlertGroupBadgeTone(alertGroup)}`}>
                            {alertGroup.label}
                          </span>
                          {fresh && (
                            <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold text-blue-200">
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/45">
                          {alert.updatedAt
                            ? `${formatDistanceToNow(new Date(alert.updatedAt), { addSuffix: true })}`
                            : "Just updated"}
                        </p>
                      </div>

                      <h3 className="mt-3 text-lg font-semibold leading-snug text-white">
                        {getAlertFeedHeadline(alert)}
                      </h3>
                      <p className="mt-2 text-sm text-white/60">{getAlertFeedDetail(alert)}</p>

                      {(displayLines.length > 0 || routeLabel) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {displayLines.map((line) => (
                            <span
                              key={`operations-${alert.id}-${line}`}
                              className={`rounded-full border px-3 py-1 text-xs font-medium ${pillTone}`}
                            >
                              {line}
                            </span>
                          ))}
                          {routeLabel ? (
                            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${pillTone}`}>
                              {routeLabel}
                            </span>
                          ) : null}
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <a
                          href={detailUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                        >
                          Details here
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
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
              {filteredMetroAlerts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-white/55">
                  No Metro service alerts match the current filter right now.
                </div>
              ) : (
                filteredMetroAlerts.map((alert) => {
                  const alertGroup = getAlertGroup(alert);
                  const displayLines = getAlertDisplayLines(alert);
                  const routeLabel = getAlertRouteLabel(alert);
                  const pillTone = getAlertGroupPillTone(alertGroup);

                  return (
                  <article key={alert.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-white">{getAlertCategory(alert)}</span>
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${getAlertGroupBadgeTone(alertGroup)}`}>
                            {alertGroup.label}
                          </span>
                        </div>
                        <h3 className="mt-2 text-base font-semibold leading-snug text-white">
                          {getAlertFeedHeadline(alert)}
                        </h3>
                        <p className="mt-2 text-sm text-white/60">{getAlertFeedDetail(alert)}</p>
                      </div>
                      <p className="shrink-0 text-xs text-white/45">
                        {alert.updatedAt
                          ? formatDistanceToNow(new Date(alert.updatedAt), { addSuffix: true })
                          : "Just updated"}
                      </p>
                    </div>

                    {(displayLines.length > 0 || routeLabel) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {displayLines.map((line) => (
                          <span key={`${alert.id}-${line}`} className={`rounded-full border px-3 py-1 text-xs font-medium ${pillTone}`}>
                            {line}
                          </span>
                        ))}
                        {routeLabel ? (
                          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${pillTone}`}>
                            {routeLabel}
                          </span>
                        ) : null}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {getAlertDetailUrl(alert) && (
                        <a
                          href={getAlertDetailUrl(alert)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                        >
                          Details here
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
                );
                })
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

      {expandedGroup && (
        <div className="fixed inset-0 z-[1200] flex items-start justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-md">
          <div className="max-h-[calc(100dvh-3rem)] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-white/10 bg-slate-950/96 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300/80">
                  Alert group
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{expandedGroup.label}</h2>
                <p className="mt-2 text-sm text-white/60">
                  {expandedGroupAlerts.length === 0
                    ? "No active alerts in this group right now."
                    : expandedGroupAlerts.length === 1
                      ? "1 active alert in this corridor."
                      : `${expandedGroupAlerts.length} active alerts in this corridor.`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpandedGroupId(null)}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {expandedGroupAlerts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-white/55">
                  Nothing major is showing for this group right now.
                </div>
              ) : (
                expandedGroupAlerts.map((alert) => {
                  const displayLines = getAlertDisplayLines(alert);
                  const routeLabel = getAlertRouteLabel(alert);
                  const pillTone = getAlertGroupPillTone(expandedGroup);

                  return (
                  <article key={`expanded-${alert.id}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-white">{getAlertCategory(alert)}</span>
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${getAlertGroupBadgeTone(expandedGroup)}`}>
                            {expandedGroup.label}
                          </span>
                        </div>
                        <h3 className="mt-2 text-base font-semibold leading-snug text-white">
                          {getAlertFeedHeadline(alert)}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-white/60">{getAlertFeedDetail(alert)}</p>
                      </div>
                      <p className="shrink-0 text-xs text-white/45">
                        {alert.updatedAt
                          ? formatDistanceToNow(new Date(alert.updatedAt), { addSuffix: true })
                          : "Just updated"}
                      </p>
                    </div>

                    {(displayLines.length > 0 || routeLabel) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {displayLines.map((line) => (
                          <span key={`${alert.id}-expanded-${line}`} className={`rounded-full border px-3 py-1 text-xs font-medium ${pillTone}`}>
                            {line}
                          </span>
                        ))}
                        {routeLabel ? (
                          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${pillTone}`}>
                            {routeLabel}
                          </span>
                        ) : null}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {getAlertDetailUrl(alert) && (
                        <a
                          href={getAlertDetailUrl(alert)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                        >
                          Details here
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
                );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
