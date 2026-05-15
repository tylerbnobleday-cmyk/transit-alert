import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronDown, ChevronUp, MapPin, Plus, Search, TrainFront } from "lucide-react";
import {
  Map as TransitMap,
  ADMIN_DEBUG_LINE_OPTIONS,
  Station,
  ALL_STATIONS,
  LINES,
  SERVICE_FILTERS,
  getFilterChips,
  type AdminDebugLineKey,
  type LayerState,
  type ServiceFilterKey,
  type TransportMode,
} from "@/components/Map";
import { TopBar } from "@/components/TopBar";
import { RiskyRoutes } from "@/components/RiskyRoutes";
import { AddReportDrawer } from "@/components/AddReportDrawer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TRANSITALERT_WEB_VERSION } from "@/lib/version";
import { clearGuestIntent, fetchAuthSession, hasGuestIntent, logoutSession } from "@/lib/auth";
import {
  fetchAdminAccounts,
  fetchAdminConfig,
  saveAdminConfig,
  updateAdminAccount,
  type AdminAccountRecord,
  type ApprovedDebugTesterRecord,
  type AdminRuntimeConfig,
} from "@/lib/admin-config";
import { fetchLiveTrains, type LiveTrain } from "@/lib/live-trains";
import busButtonIcon from "@/assets/icons/bus.png";
import tramButtonIcon from "@/assets/icons/tram.png";
import {
  DEFAULT_TRANSPORT_MODES,
  defaultPreferences,
  fetchAccountPreferences,
  getFavouriteConsists,
  getMobilePerformanceMode,
  getPremiumPaypalLink,
  hasPremiumAccess,
  mergeLocalPreferences,
  readLocalPreferences,
  saveAccountPreferences,
  type UserPreferences,
  writeLocalPreferences,
} from "@/lib/preferences";

const TRAIN_BOARDING_HINTS: Record<string, { zone: string; reason: string }> = {
  "North Melbourne": {
    zone: "Front third",
    reason: "Best for quick exits toward concourse links and northern platform changes.",
  },
  "Southern Cross": {
    zone: "Front third",
    reason: "Usually easiest for regional interchange, coach links, and the main concourse.",
  },
  "Flinders Street": {
    zone: "Middle cars",
    reason: "Best all-round spot for the subway, Swanston Street exits, and platform swaps.",
  },
  Richmond: {
    zone: "Middle cars",
    reason: "Keeps you close to the stairs for Burnley, Clifton Hill, Sandringham, and Frankston transfers.",
  },
  "South Yarra": {
    zone: "Middle to rear",
    reason: "Better for Sandringham and Frankston-side interchanges without a long platform walk.",
  },
  Parliament: {
    zone: "Middle cars",
    reason: "Closest to the main CBD concourse and exits.",
  },
  "Melbourne Central": {
    zone: "Middle cars",
    reason: "Best for the central concourse, escalators, and connecting walkways.",
  },
  Flagstaff: {
    zone: "Middle cars",
    reason: "Best for station exits and less rushing along the platform.",
  },
};

const SIMPLE_SURFACE_ROUTES = [
  {
    name: "Route 64 tram",
    mode: "tram" as const,
    stops: ["Melbourne University", "Domain Interchange", "Balaclava Junction", "Caulfield Junction", "East Brighton"],
    summary: "Good cross-city tram link via Domain, St Kilda Road, and Hawthorn Road.",
  },
  {
    name: "Route 630 bus",
    mode: "bus" as const,
    stops: ["Elwood", "Elsternwick Station", "Ormond Station", "Huntingdale Station", "Monash University"],
    summary: "Useful orbital bus for rail interchanges between the bayside and Monash corridor.",
  },
];

const HOME_ORIGIN_LABEL = "Home Â· 15 Louise St, Brighton East";
const CURRENT_LOCATION_LABEL = "Current location";
const JOURNEY_STORAGE_KEY = "transitalert-active-journey-v1";
const ADMIN_DEBUG_STORAGE_KEY = "transitalert-admin-debug-line-v1";
const HOME_ORIGIN_COORDS: [number, number] = [-37.9147, 145.0186];
const VERSION_SEEN_STORAGE_KEY = "transitalert-last-seen-version";
const ACCOUNT_ROLE_OPTIONS = ["Traveller", "Bug Tester", "Friend", "Special", "Train Driver", "Station Staff", "Admin"] as const;

type PlannerSheetProps = {
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
};

type DockedPanelSheetProps = {
  isOpen: boolean;
  onToggle: () => void;
  eyebrow: string;
  title: string;
  summary: string;
  children: ReactNode;
};

type VersionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  showWelcome: boolean;
};

type FleetTypeKey =
  | "hcmt"
  | "xtrapolis"
  | "siemens"
  | "ss-comeng"
  | "ns-comeng"
  | "n-class"
  | "vlocity";

type FleetTripStatus = "running" | "upcoming";

type FleetTypeConfig = {
  key: FleetTypeKey;
  label: string;
  emoji: string;
  total: number;
};

type FleetTrip = {
  id: string;
  focusKey: string;
  tdn: string;
  tripNumber: string;
  line: string;
  route: string;
  fleet: FleetTypeKey;
  status: FleetTripStatus;
  lineColor: string;
  statusLabel: string;
  updatedAt: string;
  consist: string;
};

type StationDeparture = {
  id: string;
  destination: string;
  platform: string;
  status: "On Time" | "Boarding" | "Departed" | "Delayed";
  time: string;
  tdn: string;
  lineLabel: string;
  lineTone: string;
};

type JourneyLeg = {
  mode: "train" | "tram" | "bus" | "walk";
  title: string;
  from: string;
  to: string;
  detail: string;
  badge: string;
};

type JourneyDisplay = {
  summary: string;
  pattern: string;
  typeLabel: string;
  window: string;
  duration: string;
  date: string;
  stopCountLabel: string;
  legs: JourneyLeg[];
};

type PersistedJourneyState = {
  journeyOrigin: string;
  journeyDestination: string;
  currentLocationOrigin: string | null;
  currentLocationCoords: [number, number] | null;
  routeStationNames: string[];
  summary: string;
  boardingAdvice: string;
  display: JourneyDisplay | null;
  attachedServiceKey: string | null;
  attachedServiceLabel: string | null;
  startedAt: string | null;
};

type ChangelogEntry = {
  version: string;
  date: string;
  notes: string[];
};

const FLEET_TYPES: FleetTypeConfig[] = [
  { key: "hcmt", label: "HCMT", emoji: "Train", total: 37 },
  { key: "xtrapolis", label: "X'Trapolis", emoji: "Train", total: 32 },
  { key: "siemens", label: "Siemens", emoji: "Train", total: 20 },
  { key: "ss-comeng", label: "SS Comeng", emoji: "Train", total: 12 },
  { key: "ns-comeng", label: "NS Comeng", emoji: "Train", total: 7 },
  { key: "n-class", label: "N Class", emoji: "Train", total: 1 },
  { key: "vlocity", label: "VLocity", emoji: "Train", total: 25 },
];

const VERSION_LOG: ChangelogEntry[] = [
  {
    version: TRANSITALERT_WEB_VERSION,
    date: "14/05/2026",
    notes: [
      "Admin tools now show the approved debug-tester whitelist beside the account list for faster tester management.",
      "Tyler admin defaults were cleaned up with the correct email + premium access, and public-facing TDN labels are now masked behind premium.",
      "Database-first Render account handling was refined again so persistence, tester sign-up, and release tracking are easier to manage.",
    ],
  },
  {
    version: "V0.88",
    date: "12/05/2026",
    notes: [
      "Original app and fleet artwork replaced older source-derived visuals so TransitAlert reads clearly as an independent project.",
      "Privacy and account security were tightened with safer auth responses, request throttling, and stronger backend-only secret handling.",
      "Responsible transport-data handling guidance was added so release decisions stay aligned with safer operational-data presentation before public launch.",
    ],
  },
  {
    version: "V0.87",
    date: "10/05/2026",
    notes: [
      "Glen Waverley debug overlays, Burnley loop rendering, and admin-side map debug tools were expanded.",
      "Fleet display rules were tightened so invalid train types stop showing on the wrong lines.",
      "Render deployment support was stabilised for the app’s post-Netlify hosting move.",
    ],
  },
  {
    version: "V0.86",
    date: "09/05/2026",
    notes: [
      "Surface route visuals, alert grouping, and line overlays were refined across the shared map renderer.",
      "Freight corridors and interstate overlays were improved as part of the broader network visual pass.",
    ],
  },
  {
    version: "V0.85",
    date: "08/05/2026",
    notes: [
      "First-open update boards and station boarding guides were added for key interchanges.",
      "Journey planning became more persistent and stable once a journey has started.",
      "Guest and login flows were tightened so people could get back to real auth from inside the app.",
    ],
  },
  {
    version: "V0.84",
    date: "07/05/2026",
    notes: [
      "Surface route filters for trams and buses were expanded and made easier to toggle from the map.",
      "Live tram colours and route styling were aligned more closely with route palettes.",
    ],
  },
  {
    version: "V0.83",
    date: "06/05/2026",
    notes: [
      "Live tram and bus tracking gained stronger map integration, popups, and stop-linked panels.",
      "More tram routes and stops were added so the surface network felt much more complete.",
    ],
  },
  {
    version: "V0.82",
    date: "05/05/2026",
    notes: [
      "Premium features, freight overlays, and admin-side controls were expanded during the major map feature push.",
      "Performance and UI stability improvements landed across the planner and interactive map layers.",
    ],
  },
  {
    version: "V0.81",
    date: "04/05/2026",
    notes: [
      "Auth, settings, and account preference saving were refined before the Render and database-first migration work.",
      "Planner and station detail interactions were improved for day-to-day testing.",
    ],
  },
  {
    version: "V0.80",
    date: "03/05/2026",
    notes: [
      "The shared app version system was formalised and exposed more clearly through the app UI.",
      "More route data, admin tooling, and early premium wiring landed in the lead-up to the later 0.8x releases.",
    ],
  },
  {
    version: "V0.70",
    date: "02/05/2026",
    notes: [
      "V/Line live tracking landed with Gippsland service detail support and better Southern Cross departure boards.",
      "Settings, preferences, and surface route layers were refined across the app.",
      "Regional route shaping and live service presentation improved for newer map overlays.",
    ],
  },
  {
    version: "V0.68",
    date: "29/04/2026",
    notes: [
      "Raw feed IDs were stripped out of live transit labels to clean up user-facing data.",
    ],
  },
  {
    version: "V0.67",
    date: "21/06/2025",
    notes: [
      "Searching by station code now picks the station directly.",
      "Examples like THL now resolve to Town Hall instead of unrelated matches.",
    ],
  },
  {
    version: "V0.66",
    date: "15/06/2025",
    notes: [
      "Major departures template refresh.",
      "Fleet page received bigger visual upgrades.",
      "General backend and UI cleanups rolled into the same release.",
    ],
  },
];

const TRANSITALERT_SYSTEM_NOTES = [
  "Independent real-time transport platform pulling together public feeds, operator data where available, and app-side logic.",
  "Data can be delayed, incomplete, or unavailable, so the app should never be treated as an official operator source.",
  "Usage, diagnostics, and stability logging may be collected to improve reliability, performance, and safety of the system.",
];

const VERSION_HIGHLIGHT_CARDS = [
  {
    title: "What’s new in 0.89",
    body: "Tester whitelist visibility, premium-only TDN masking, and cleaner Tyler/admin account defaults now sit on top of the earlier branding, privacy, and database work.",
  },
  {
    title: "Journey planning",
    body: "Trips persist more reliably, GPS starts are friendlier, and attached live services stay visible while your journey is active.",
  },
  {
    title: "Privacy and assets",
    body: "The app icon, fleet icons, and release notes were refreshed to stay original, independent, and clearer about data and security expectations.",
  },
] as const;

const PLANNER_LINES = [
  { name: "Frankston", stations: LINES.frankston },
  { name: "Cranbourne", stations: LINES.cranbourne },
  { name: "Pakenham", stations: LINES.pakenham },
  { name: "Sunbury", stations: LINES.sunbury },
  { name: "Metro Tunnel", stations: LINES.metroTunnel },
  { name: "Sandringham", stations: LINES.sandringham },
  { name: "Mernda", stations: LINES.mernda },
  { name: "Hurstbridge", stations: LINES.hurstbridge },
  { name: "Craigieburn", stations: LINES.craigieburn },
  { name: "Upfield", stations: LINES.upfield },
  { name: "Belgrave", stations: LINES.belgrave },
  { name: "Lilydale", stations: LINES.lilydale },
  { name: "Glen Waverley", stations: LINES.glenWaverley },
  { name: "Alamein", stations: LINES.alamein },
  { name: "Werribee", stations: LINES.werribee },
  { name: "Williamstown", stations: LINES.williamstown },
] as const;

const STATUS_STYLES: Record<FleetTripStatus, string> = {
  running: "bg-emerald-500/15 text-emerald-300",
  upcoming: "bg-slate-500/15 text-slate-300",
};

const STATUS_LABELS: Record<FleetTripStatus, string> = {
  running: "Running",
  upcoming: "Recent",
};

function getFleetLineTone(line: string) {
  const joined = line.toLowerCase();
  if (/(sunbury|cranbourne|pakenham|metro tunnel)/i.test(joined)) return "bg-sky-500 text-sky-950";
  if (/(mernda|hurstbridge)/i.test(joined)) return "bg-red-600 text-white";
  if (/(frankston|stony point)/i.test(joined)) return "bg-green-600 text-white";
  if (/(werribee|williamstown|sandringham|altona)/i.test(joined)) return "bg-pink-500 text-white";
  if (/(upfield|craigieburn)/i.test(joined)) return "bg-yellow-400 text-yellow-950";
  if (/(belgrave|lilydale|glen waverley|alamein)/i.test(joined)) return "bg-blue-600 text-white";
  return "bg-slate-500 text-white";
}

function normaliseFleetLineGroup(vehicle: LiveTrain) {
  const searchable = `${vehicle.line} ${vehicle.destination} ${vehicle.serviceDescription ?? ""}`.toLowerCase();
  if (/(metro tunnel|town hall|state library)/i.test(searchable)) return "metro-tunnel";
  if (/(cranbourne|pakenham|east pakenham)/i.test(searchable)) return "hcmt-corridor";
  if (/(sunbury|watergardens)/i.test(searchable)) return "sunbury";
  if (/(mernda|hurstbridge)/i.test(searchable)) return "clifton-hill";
  if (/(belgrave|lilydale|glen waverley|alamein)/i.test(searchable)) return "burnley";
  if (/(craigieburn|upfield)/i.test(searchable)) return "northern";
  if (/(frankston|werribee|williamstown|sandringham|altona)/i.test(searchable)) return "bayside";
  return "unknown";
}

function resolveMetroFleetKey(vehicle: LiveTrain, explicitFleet: FleetTypeKey | null): FleetTypeKey {
  const lineGroup = normaliseFleetLineGroup(vehicle);

  switch (lineGroup) {
    case "metro-tunnel":
    case "hcmt-corridor":
    case "sunbury":
      return "hcmt";
    case "clifton-hill":
    case "burnley":
      return "xtrapolis";
    case "northern":
      return explicitFleet === "xtrapolis" ? "xtrapolis" : "ns-comeng";
    case "bayside":
      if (explicitFleet === "ss-comeng" || explicitFleet === "siemens") {
        return explicitFleet;
      }
      return "siemens";
    default:
      return explicitFleet ?? "xtrapolis";
  }
}

function inferFleetTypeKey(vehicle: LiveTrain): FleetTypeKey {
  const searchable = `${vehicle.trainType} ${vehicle.line} ${vehicle.destination} ${vehicle.serviceDescription ?? ""}`.toLowerCase();
  if (/(hcmt)/i.test(searchable)) return "hcmt";
  if (/(x'?trapolis)/i.test(searchable)) return "xtrapolis";
  if (/(vlocity)/i.test(searchable)) return "vlocity";
  if (/(n class|swan hill|bairnsdale|geelong|ballarat|traralgon)/i.test(searchable)) return "n-class";
  let explicitFleet: FleetTypeKey | null = null;
  if (/(siemens)/i.test(searchable)) {
    explicitFleet = "siemens";
  } else if (/(comeng)/i.test(searchable)) {
    explicitFleet = /(craigieburn|upfield)/i.test(searchable) ? "ns-comeng" : "ss-comeng";
  }
  return resolveMetroFleetKey(vehicle, explicitFleet);
}

function buildFleetRoute(vehicle: LiveTrain) {
  const cleaned = vehicle.serviceDescription?.trim();
  if (cleaned && cleaned.length > 0) return cleaned;
  return `${vehicle.line} to ${vehicle.destination}`;
}

function formatFleetUpdatedAt(timestamp?: string) {
  if (!timestamp) return "Live now";
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "Live now";
  return `Seen ${parsed.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })}`;
}

function formatServiceClock(timestamp?: string) {
  if (!timestamp) return "Live";
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "Live";
  return parsed.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const PUBLIC_SERVICE_CODE_MAP: Array<[string, string]> = [
  ["flinders street", "FSS"],
  ["flinders st", "FSS"],
  ["flinders", "FSS"],
  ["southern cross", "SCS"],
  ["town hall", "THL"],
  ["state library", "STL"],
  ["parliament", "PAR"],
  ["melbourne central", "MCE"],
  ["flagstaff", "FGS"],
  ["glen waverley", "GWY"],
  ["lilydale", "LIL"],
  ["belgrave", "BEL"],
  ["alamein", "ALA"],
  ["mernda", "MER"],
  ["hurstbridge", "HBE"],
  ["sunbury", "SUN"],
  ["cranbourne", "CRA"],
  ["pakenham", "PAK"],
  ["frankston", "FKN"],
  ["sandringham", "SDM"],
  ["werribee", "WER"],
  ["williamstown", "WIL"],
  ["upfield", "UPF"],
  ["craigieburn", "CBN"],
  ["ballarat", "BAL"],
  ["bendigo", "BEN"],
  ["geelong", "GEL"],
  ["traralgon", "TRA"],
  ["bairnsdale", "BAI"],
];

function getPublicServiceCode(...values: string[]) {
  const joined = values.join(" ").toLowerCase();
  const matched = PUBLIC_SERVICE_CODE_MAP.find(([needle]) => joined.includes(needle));
  if (matched) return matched[1];

  const words = values
    .join(" ")
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);

  const fallback = words.map((word) => word[0]?.toUpperCase() ?? "").join("");
  return fallback || "SRV";
}

function getPublicFleetServiceLabel(trip: FleetTrip) {
  return `${formatServiceClock(trip.updatedAt)} ${getPublicServiceCode(trip.route, trip.line)} Service`;
}

function buildFleetTripsFromLive(vehicles: LiveTrain[]): FleetTrip[] {
  return vehicles.map((vehicle, index) => ({
    id: `${vehicle.consist}-${vehicle.tdn}-${index}`,
    focusKey: `${vehicle.consist}::${vehicle.tdn}`,
    tdn: vehicle.tdn.startsWith("TDN") ? vehicle.tdn : `TDN ${vehicle.tdn}`,
    tripNumber: vehicle.tdn.replace(/^TDN\s*/i, "").trim(),
    line: vehicle.line,
    route: buildFleetRoute(vehicle),
    fleet: inferFleetTypeKey(vehicle),
    status: vehicle.timestamp ? "running" : "upcoming",
    lineColor: getFleetLineTone(vehicle.line),
    statusLabel: formatFleetUpdatedAt(vehicle.timestamp),
    updatedAt: vehicle.timestamp ?? "",
    consist: vehicle.consist,
  }));
}

function addMinutesToTime(base: Date, minutes: number) {
  return new Date(base.getTime() + minutes * 60_000);
}

function formatPlannerTimeWindow(start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${formatter.format(start)}-${formatter.format(end)}`;
}

function formatPlannerDate(date: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatPlannerDuration(totalMinutes: number) {
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function getJourneyLegModeTone(mode: JourneyLeg["mode"]) {
  switch (mode) {
    case "train":
      return "border-sky-400/20 bg-sky-500/10 text-sky-100";
    case "tram":
      return "border-lime-400/20 bg-lime-500/10 text-lime-100";
    case "bus":
      return "border-orange-400/20 bg-orange-500/10 text-orange-100";
    default:
      return "border-white/10 bg-white/5 text-white/80";
  }
}

function journeyLegsOrigin(display: JourneyDisplay) {
  return display.legs[0]?.from ?? "Unknown";
}

function journeyLegsDestination(display: JourneyDisplay) {
  return display.legs[display.legs.length - 1]?.to ?? "Unknown";
}

function areStringArraysEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function areBooleanMapsEqual(
  left: Record<string, boolean>,
  right: Record<string, boolean>,
) {
  const leftEntries = Object.entries(left).sort(([a], [b]) => a.localeCompare(b));
  const rightEntries = Object.entries(right).sort(([a], [b]) => a.localeCompare(b));

  if (leftEntries.length !== rightEntries.length) return false;

  return leftEntries.every(([key, value], index) => {
    const [otherKey, otherValue] = rightEntries[index] ?? [];
    return key === otherKey && value === otherValue;
  });
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

function formatJourneyStarted(timestamp: string | null) {
  if (!timestamp) return "";
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}

function readPersistedJourneyState(): PersistedJourneyState | null {
  try {
    const raw = window.localStorage.getItem(JOURNEY_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedJourneyState;
  } catch {
    return null;
  }
}

function writePersistedJourneyState(state: PersistedJourneyState) {
  try {
    window.localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore local storage failures.
  }
}

const STATION_SERVICE_LOOKUP: Record<string, string[]> = {
  "Town Hall": ["Sunbury", "Cranbourne", "Pakenham", "Metro Tunnel"],
  "State Library": ["Sunbury", "Cranbourne", "Pakenham", "Metro Tunnel"],
  "Flinders Street": ["Sandringham", "Frankston", "Werribee", "Williamstown", "Mernda", "Hurstbridge"],
  "Southern Cross": ["Werribee", "Williamstown", "Sunbury", "Craigieburn", "Upfield"],
  "North Melbourne": ["Sunbury", "Craigieburn", "Upfield"],
};

const STATION_DEPARTURES: Record<string, StationDeparture[]> = {
  "Town Hall": [
    { id: "thl-1", destination: "Cranbourne", platform: "2", status: "Boarding", time: "22:43", tdn: "C531", lineLabel: "Metro Tunnel", lineTone: "bg-cyan-500/15 text-cyan-200" },
    { id: "thl-2", destination: "Sunbury", platform: "1", status: "On Time", time: "22:43", tdn: "Z135", lineLabel: "Metro Tunnel", lineTone: "bg-cyan-500/15 text-cyan-200" },
    { id: "thl-3", destination: "East Pakenham", platform: "2", status: "On Time", time: "22:53", tdn: "C137", lineLabel: "Metro Tunnel", lineTone: "bg-cyan-500/15 text-cyan-200" },
    { id: "thl-4", destination: "West Footscray", platform: "1", status: "Delayed", time: "23:03", tdn: "Z141", lineLabel: "Sunbury", lineTone: "bg-cyan-500/15 text-cyan-200" },
  ],
  "Flinders Street": [
    { id: "fss-1", destination: "Sandringham", platform: "10", status: "On Time", time: "22:41", tdn: "601M", lineLabel: "Bayside / Cross City", lineTone: "bg-pink-500/15 text-pink-200" },
    { id: "fss-2", destination: "Werribee", platform: "9", status: "Boarding", time: "22:44", tdn: "715M", lineLabel: "Bayside / Cross City", lineTone: "bg-pink-500/15 text-pink-200" },
    { id: "fss-3", destination: "Mernda", platform: "1", status: "On Time", time: "22:47", tdn: "804M", lineLabel: "Clifton Hill", lineTone: "bg-rose-500/15 text-rose-200" },
  ],
};

function getStationDepartureBoard(stationName: string) {
  return STATION_DEPARTURES[stationName] ?? [
    { id: `${stationName}-1`, destination: "City Loop", platform: "1", status: "On Time", time: "22:45", tdn: "Z101", lineLabel: "Metro", lineTone: "bg-white/10 text-white/80" },
    { id: `${stationName}-2`, destination: "Outbound service", platform: "2", status: "Boarding", time: "22:53", tdn: "Z109", lineLabel: "Metro", lineTone: "bg-white/10 text-white/80" },
  ];
}

function PlannerSheet({ isOpen, onToggle, children }: PlannerSheetProps) {
  return (
    <div
      className={`pointer-events-none overflow-hidden rounded-t-[1.75rem] border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-2xl transition-transform duration-300 sm:rounded-[1.85rem] ${
        isOpen ? "translate-y-0" : "translate-y-[calc(100%-66px)]"
      }`}
    >
      <button
        onClick={onToggle}
        className="pointer-events-auto flex w-full flex-col items-center justify-center px-4 pb-2.5 pt-2.5 text-white"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Hide planner" : "Show planner"}
      >
        <span className="mb-2 h-1.5 w-12 rounded-full bg-white/20" />
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-600 px-3.5 py-1.5 text-sm font-semibold shadow-lg shadow-blue-950/35">
          <ChevronUp className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          {isOpen ? "Hide Planner" : "Show Planner"}
        </span>
      </button>

      <div className={`${isOpen ? "pointer-events-auto" : "pointer-events-none"} max-h-[64vh] overflow-y-auto px-4 pb-4 sm:px-5 sm:pb-4.5`}>
        {children}
      </div>
    </div>
  );
}

function VersionModal({ isOpen, onClose, showWelcome }: VersionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/96 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-300/80">TransitAlert Melbourne</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">TransitAlert updates</h2>
            <p className="mt-1 text-sm text-white/65">
              System notes, version history, and recent release changes for the planner and live tools.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70 sm:block">
              TransitAlert Web Version {TRANSITALERT_WEB_VERSION}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>

          <div className="overflow-y-auto px-5 py-5 sm:px-6">
            {showWelcome && (
              <div className="mb-4 rounded-[1.35rem] border border-blue-400/20 bg-blue-500/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/90">First open</p>
                    <p className="mt-2 text-xl font-semibold text-white">Welcome to TransitAlert {TRANSITALERT_WEB_VERSION}</p>
                    <p className="mt-1 max-w-3xl text-sm text-blue-50/80">
                      This board shows the main changes for the current build so new or returning users know what shifted straight away.
                    </p>
                  </div>
                  <span className="rounded-full border border-blue-300/20 bg-slate-950/50 px-3 py-1 text-xs font-semibold text-blue-100">
                    New in {TRANSITALERT_WEB_VERSION}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {VERSION_HIGHLIGHT_CARDS.map((card) => (
                    <div key={card.title} className="rounded-[1.15rem] border border-white/10 bg-black/20 p-3">
                      <p className="text-sm font-semibold text-white">{card.title}</p>
                      <p className="mt-2 text-sm leading-6 text-white/72">{card.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-300/85">About This System</p>
            <div className="mt-3 grid gap-2">
              {TRANSITALERT_SYSTEM_NOTES.map((note) => (
                <div key={note} className="rounded-2xl border border-white/5 bg-black/20 px-3 py-2 text-sm text-white/80">
                  {note}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {VERSION_LOG.map((entry) => (
              <div key={`${entry.version}-${entry.date}`} className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-base font-semibold text-white">{entry.version}</p>
                  <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                    {entry.date}
                  </span>
                </div>
                <div className="mt-3 grid gap-2">
                  {entry.notes.map((note) => (
                    <div key={note} className="rounded-2xl border border-white/5 bg-black/20 px-3 py-2 text-sm text-white/80">
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DockedPanelSheet({ isOpen, onToggle, eyebrow, title, summary, children }: DockedPanelSheetProps) {
  return (
    <div
      className={`pointer-events-none overflow-hidden rounded-t-[2rem] border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-2xl transition-transform duration-300 sm:rounded-[2rem] ${
        isOpen ? "translate-y-0" : "translate-y-[calc(100%-92px)]"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="pointer-events-auto flex w-full items-start justify-between gap-4 px-5 pb-4 pt-4 text-left text-white"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-300/80">{eyebrow}</p>
          <p className="mt-2 text-lg font-semibold">{title}</p>
          <p className="mt-1 text-sm text-white/60">{summary}</p>
        </div>
        <span className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80">
          <ChevronUp className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          {isOpen ? "Collapse" : "Expand"}
        </span>
      </button>

      <div className={`${isOpen ? "pointer-events-auto" : "pointer-events-none"} max-h-[68vh] overflow-y-auto px-5 pb-5`}>
        {children}
      </div>
    </div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { data: authSession } = useQuery({
    queryKey: ["auth-session"],
    queryFn: fetchAuthSession,
    retry: false,
    staleTime: 60_000,
  });
  const { data: liveFleetVehicles = [], isFetching: isFleetRefreshing } = useQuery({
    queryKey: ["live-fleet-board"],
    queryFn: fetchLiveTrains,
    enabled: (authSession?.user?.role ?? "") !== "Guest",
    retry: false,
    refetchInterval: isMobile ? 30_000 : 15_000,
    staleTime: isMobile ? 20_000 : 10_000,
  });
    const isAuthenticated = authSession?.authenticated ?? false;
    const [activeTab, setActiveTab] = useState<"map" | "fleets" | "admin">("map");
    const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
    const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [isUtilityPanelOpen, setIsUtilityPanelOpen] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isVersionOpen, setIsVersionOpen] = useState(false);
  const [isVersionFirstOpen, setIsVersionFirstOpen] = useState(false);
  const [userMenuMessage, setUserMenuMessage] = useState("");
  const [selectedFleetType, setSelectedFleetType] = useState<FleetTypeKey | null>(null);
  const [focusedVehicleKey, setFocusedVehicleKey] = useState<string | null>(null);
  const [journeyOrigin, setJourneyOrigin] = useState<string>("Flinders Street");
  const [journeyDestination, setJourneyDestination] = useState<string>("Sandringham");
  const [journeyRoute, setJourneyRoute] = useState<Station[]>([]);
  const [journeySummary, setJourneySummary] = useState<string>("Plan a journey using the fields below.");
  const [journeyBoardingAdvice, setJourneyBoardingAdvice] = useState<string>("");
  const [journeyDisplay, setJourneyDisplay] = useState<JourneyDisplay | null>(null);
  const [currentLocationOrigin, setCurrentLocationOrigin] = useState<string | null>(null);
  const [currentLocationCoords, setCurrentLocationCoords] = useState<[number, number] | null>(null);
  const [journeyStartedAt, setJourneyStartedAt] = useState<string | null>(null);
  const [attachedJourneyServiceKey, setAttachedJourneyServiceKey] = useState<string | null>(null);
  const [attachedJourneyServiceLabel, setAttachedJourneyServiceLabel] = useState<string | null>(null);
  const [hasHydratedJourney, setHasHydratedJourney] = useState(false);
  const [originPickerMessage, setOriginPickerMessage] = useState("");
  const [isOriginPickerOpen, setIsOriginPickerOpen] = useState(false);
  const [originSearch, setOriginSearch] = useState("");
  const [journeyPlannerMessage, setJourneyPlannerMessage] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [adminSelectedStation, setAdminSelectedStation] = useState("Flinders Street");
  const [adminLat, setAdminLat] = useState("-37.8184161");
  const [adminLng, setAdminLng] = useState("144.9664779");
  const [adminSelectedLine, setAdminSelectedLine] = useState("metroTunnel");
  const [adminDebugLineKey, setAdminDebugLineKey] = useState<AdminDebugLineKey>(() => {
    if (typeof window === "undefined") {
      return "none";
    }

    const stored = window.localStorage.getItem(ADMIN_DEBUG_STORAGE_KEY);
    return ADMIN_DEBUG_LINE_OPTIONS.some((option) => option.key === stored)
      ? (stored as AdminDebugLineKey)
      : "none";
  });
  const [splitCrossCityGroup, setSplitCrossCityGroup] = useState(true);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [hasMergedLocalPreferences, setHasMergedLocalPreferences] = useState(false);
  const [adminConfigDraft, setAdminConfigDraft] = useState<AdminRuntimeConfig>({});
  const [adminAccountDrafts, setAdminAccountDrafts] = useState<
    Record<string, Pick<AdminAccountRecord, "role" | "isAdmin" | "isPremium">>
  >({});
  const isAdmin = authSession?.user?.isAdmin ?? false;
  const isGuest = authSession?.user?.role === "Guest";
  const isPremium = hasPremiumAccess(preferences);
  const mobilePerformanceMode = getMobilePerformanceMode(preferences);
  const premiumPaypalLink = getPremiumPaypalLink(preferences);
  const favouriteConsists = getFavouriteConsists(preferences);
  const isDatabaseConfigured = authSession?.databaseConfigured === true;

  useEffect(() => {
    if (isMobile) {
      setIsUtilityPanelOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ADMIN_DEBUG_STORAGE_KEY, adminDebugLineKey);
  }, [adminDebugLineKey]);

  const { data: accountPreferences } = useQuery({
    queryKey: ["account-preferences", authSession?.user?.id],
    queryFn: fetchAccountPreferences,
    enabled: isAuthenticated && !isGuest,
    retry: false,
    staleTime: 60_000,
  });

  const { data: adminConfig } = useQuery({
    queryKey: ["admin-runtime-config"],
    queryFn: fetchAdminConfig,
    enabled: isAdmin,
    retry: false,
    staleTime: 60_000,
  });

  const { data: adminAccountsPayload } = useQuery({
    queryKey: ["admin-accounts"],
    queryFn: fetchAdminAccounts,
    enabled: isAdmin,
    retry: false,
    staleTime: 30_000,
  });
  const adminAccounts = adminAccountsPayload?.accounts ?? [];
  const approvedDebugTesters = adminAccountsPayload?.approvedDebugTesters ?? [];

  const signOutMutation = useMutation({
    mutationFn: logoutSession,
    onSuccess: async () => {
      queryClient.setQueryData(["auth-session"], { authenticated: false, user: null });
      await queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      setActiveTab("map");
      setLocation("/login");
    },
  });

  const adminAccountMutation = useMutation({
    mutationFn: ({ accountId, patch }: { accountId: string; patch: Pick<AdminAccountRecord, "role" | "isAdmin" | "isPremium"> }) =>
      updateAdminAccount(accountId, patch),
    onSuccess: async (account) => {
      if (account) {
        setAdminAccountDrafts((current) => ({
          ...current,
          [account.id]: {
            role: account.role,
            isAdmin: account.isAdmin,
            isPremium: account.isPremium,
          },
        }));
      }
      setAdminMessage("Account access updated.");
      await queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
    },
    onError: (error) => {
      setAdminMessage(error instanceof Error ? error.message : "Failed to update account access.");
    },
  });

  const stationOptions = useMemo(() => ALL_STATIONS.map((station) => station.name).sort(), []);
  const uniqueStations = useMemo(() => {
    const seen = new Map<string, Station>();
    for (const station of ALL_STATIONS) {
      if (!seen.has(station.name)) seen.set(station.name, station);
    }
    return [...seen.values()];
  }, []);
  const stationByName = useMemo(
    () => new Map(uniqueStations.map((station) => [station.name, station])),
    [uniqueStations],
  );
  const stationByNormalizedName = useMemo(
    () => new Map(uniqueStations.map((station) => [station.name.trim().toLowerCase(), station])),
    [uniqueStations],
  );
  const plannerNetwork = useMemo(() => {
    const graph = new Map<string, Array<{ to: string; line: string }>>();

    for (const line of PLANNER_LINES) {
      for (let index = 0; index < line.stations.length - 1; index += 1) {
        const current = line.stations[index];
        const next = line.stations[index + 1];
        if (!current || !next) continue;

        const currentEdges = graph.get(current.name) ?? [];
        currentEdges.push({ to: next.name, line: line.name });
        graph.set(current.name, currentEdges);

        const nextEdges = graph.get(next.name) ?? [];
        nextEdges.push({ to: current.name, line: line.name });
        graph.set(next.name, nextEdges);
      }
    }

    return graph;
  }, []);
  const lineKeys = useMemo(() => Object.keys(LINES), []);

  const selectedFleetConfig = useMemo(
    () => FLEET_TYPES.find((fleet) => fleet.key === selectedFleetType) ?? null,
    [selectedFleetType],
  );
  const liveFleetTrips = useMemo(() => buildFleetTripsFromLive(liveFleetVehicles), [liveFleetVehicles]);
  const fleetCountByType = useMemo(
    () =>
      liveFleetTrips.reduce<Record<FleetTypeKey, number>>(
        (counts, trip) => {
          counts[trip.fleet] += 1;
          return counts;
        },
        {
          hcmt: 0,
          xtrapolis: 0,
          siemens: 0,
          "ss-comeng": 0,
          "ns-comeng": 0,
          "n-class": 0,
          vlocity: 0,
        },
      ),
    [liveFleetTrips],
  );
  const fleetTripsForSelection = useMemo(
    () => (selectedFleetType ? liveFleetTrips.filter((trip) => trip.fleet === selectedFleetType) : []),
    [liveFleetTrips, selectedFleetType],
  );
  const fleetTripsToDisplay = useMemo(
    () => (selectedFleetType ? fleetTripsForSelection : liveFleetTrips),
    [fleetTripsForSelection, liveFleetTrips, selectedFleetType],
  );
  const fleetStats = useMemo(() => {
    const trips = fleetTripsToDisplay;
    return {
      liveTrips: trips.length,
      runningNow: trips.filter((trip) => trip.status === "running").length,
      upcomingSoon: trips.filter((trip) => trip.status === "upcoming").length,
    };
  }, [fleetTripsToDisplay]);
  const serviceDayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-AU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date()),
    [],
  );
  const lastUpdatedLabel = useMemo(() => {
    const latestTimestamp = liveFleetTrips
      .map((trip) => (trip.updatedAt ? new Date(trip.updatedAt).getTime() : 0))
      .filter((value) => Number.isFinite(value) && value > 0)
      .sort((a, b) => b - a)[0];

    const baseDate = latestTimestamp ? new Date(latestTimestamp) : new Date();

    return new Intl.DateTimeFormat("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(baseDate);
  }, [liveFleetTrips]);
  const stationDraftPreview = useMemo(
    () => uniqueStations.find((station) => station.name === adminSelectedStation) ?? uniqueStations[0],
    [adminSelectedStation, uniqueStations],
  );
  const nearbyOriginStations = useMemo(
    () => ["Town Hall", "Flinders Street", "State Library", "Southern Cross", "North Melbourne"]
      .map((name) => uniqueStations.find((station) => station.name === name))
      .filter((station): station is Station => Boolean(station)),
    [uniqueStations],
  );
  const filteredOriginStations = useMemo(() => {
    const query = originSearch.trim().toLowerCase();
    if (!query) return uniqueStations.slice(0, 18);
    return uniqueStations.filter((station) => station.name.toLowerCase().includes(query)).slice(0, 24);
  }, [originSearch, uniqueStations]);

  const openLiveTrainOnMap = useCallback((trip: FleetTrip) => {
    setFocusedVehicleKey(trip.focusKey);
    setActiveTab("map");
    setIsPlannerOpen(true);
  }, []);

  const attachJourneyToService = useCallback((trip: FleetTrip) => {
    setAttachedJourneyServiceKey(trip.focusKey);
    setAttachedJourneyServiceLabel(
      hasPremiumAccess(accountPreferences)
        ? `${trip.line} Â· TDN ${trip.tripNumber} Â· ${trip.route}`
        : getPublicFleetServiceLabel(trip),
    );
    setJourneyStartedAt((current) => current ?? new Date().toISOString());
    setFocusedVehicleKey(trip.focusKey);
    setActiveTab("map");
    setIsPlannerOpen(true);
  }, [accountPreferences]);

  const finishJourney = useCallback(() => {
    setJourneyRoute([]);
    setJourneySummary("Plan a journey using the fields below.");
    setJourneyBoardingAdvice("");
    setJourneyDisplay(null);
    setAttachedJourneyServiceKey(null);
    setAttachedJourneyServiceLabel(null);
    setJourneyStartedAt(null);
  }, []);

  const useCurrentLocationForOrigin = () => {
    if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.geolocation) {
      setOriginPickerMessage("Current location is not available in this browser.");
      return;
    }

    setOriginPickerMessage("Finding your current location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nearestStation = uniqueStations
          .map((station) => ({
            station,
            distance:
              (station.position[0] - position.coords.latitude) ** 2 +
              (station.position[1] - position.coords.longitude) ** 2,
          }))
          .sort((left, right) => left.distance - right.distance)[0]?.station;
        const label = nearestStation
          ? `${CURRENT_LOCATION_LABEL} Â· Near ${nearestStation.name}`
          : `${CURRENT_LOCATION_LABEL} Â· ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
        setCurrentLocationOrigin(label);
        setCurrentLocationCoords([position.coords.latitude, position.coords.longitude]);
        setJourneyOrigin(label);
        setOriginPickerMessage("Current location ready.");
        setIsOriginPickerOpen(false);
      },
      () => {
        setOriginPickerMessage("Couldn't fetch your current location just now.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  useEffect(() => {
    if (activeTab === "admin" && !isAdmin) {
      setActiveTab("map");
    }
  }, [activeTab, isAdmin]);

  useEffect(() => {
    setPreferences(readLocalPreferences());
  }, []);

  useEffect(() => {
    if (hasHydratedJourney || uniqueStations.length === 0) return;

    const persisted = readPersistedJourneyState();
    if (!persisted) {
      setHasHydratedJourney(true);
      return;
    }

    setJourneyOrigin(persisted.journeyOrigin || "Flinders Street");
    setJourneyDestination(persisted.journeyDestination || "Sandringham");
    setCurrentLocationOrigin(persisted.currentLocationOrigin ?? null);
    setCurrentLocationCoords(persisted.currentLocationCoords ?? null);
    setJourneySummary(persisted.summary || "Plan a journey using the fields below.");
    setJourneyBoardingAdvice(persisted.boardingAdvice || "");
    setJourneyDisplay(persisted.display ?? null);
    setAttachedJourneyServiceKey(persisted.attachedServiceKey ?? null);
    setAttachedJourneyServiceLabel(persisted.attachedServiceLabel ?? null);
    setJourneyStartedAt(persisted.startedAt ?? null);
    setJourneyRoute(
      (persisted.routeStationNames ?? [])
        .map((stationName) => stationByName.get(stationName))
        .filter((station): station is Station => Boolean(station)),
    );
    setHasHydratedJourney(true);
  }, [hasHydratedJourney, stationByName, uniqueStations.length]);

  useEffect(() => {
    if (!hasHydratedJourney) return;

    writePersistedJourneyState({
      journeyOrigin,
      journeyDestination,
      currentLocationOrigin,
      currentLocationCoords,
      routeStationNames: journeyRoute.map((station) => station.name),
      summary: journeySummary,
      boardingAdvice: journeyBoardingAdvice,
      display: journeyDisplay,
      attachedServiceKey: attachedJourneyServiceKey,
      attachedServiceLabel: attachedJourneyServiceLabel,
      startedAt: journeyStartedAt,
    });
  }, [
    attachedJourneyServiceKey,
    attachedJourneyServiceLabel,
    currentLocationCoords,
    currentLocationOrigin,
    hasHydratedJourney,
    journeyBoardingAdvice,
    journeyDestination,
    journeyDisplay,
    journeyOrigin,
    journeyRoute,
    journeyStartedAt,
    journeySummary,
  ]);

  useEffect(() => {
    if (accountPreferences && !isGuest) {
      setPreferences({
        ...defaultPreferences,
        ...accountPreferences,
      });
    }
  }, [accountPreferences, isGuest]);

  useEffect(() => {
    if (!isAuthenticated || isGuest || hasMergedLocalPreferences || !authSession?.user?.id) return;

    const localPreferences = readLocalPreferences();
    const hasLocalData =
      localPreferences.favouriteStops.length > 0 ||
      localPreferences.favouriteRoutes.length > 0 ||
      Object.keys(localPreferences.selectedMapFilters).length > 0 ||
      localPreferences.transportModes.length > 0 ||
      Object.keys(localPreferences.appPreferences).length > 0;

    if (!hasLocalData) {
      setHasMergedLocalPreferences(true);
      return;
    }

    void mergeLocalPreferences(localPreferences)
      .then((merged) => {
        setPreferences(merged);
        writeLocalPreferences(merged);
      })
      .finally(() => setHasMergedLocalPreferences(true));
  }, [authSession?.user?.id, hasMergedLocalPreferences, isAuthenticated, isGuest]);

  useEffect(() => {
    if (adminConfig) {
      setAdminConfigDraft(adminConfig);
    }
  }, [adminConfig]);

  useEffect(() => {
    if (adminAccounts.length === 0) return;
    setAdminAccountDrafts(
      Object.fromEntries(
        adminAccounts.map((account) => [
          account.id,
          {
            role: account.role,
            isAdmin: account.isAdmin,
            isPremium: account.isPremium,
          },
        ]),
      ),
    );
  }, [adminAccounts]);

  useEffect(() => {
    if (!authSession?.user) {
      setIsUserMenuOpen(false);
    }
  }, [authSession?.user]);

  useEffect(() => {
    if (isGuest && activeTab !== "map") {
      setActiveTab("map");
    }
  }, [activeTab, isGuest]);

  useEffect(() => {
    if (!isAuthenticated || !isGuest) return;
    if (hasGuestIntent()) return;
    clearGuestIntent();
    setLocation("/login");
  }, [isAuthenticated, isGuest, setLocation]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const lastSeenVersion = window.localStorage.getItem(VERSION_SEEN_STORAGE_KEY);
      if (lastSeenVersion !== TRANSITALERT_WEB_VERSION) {
        setIsVersionFirstOpen(true);
        setIsVersionOpen(true);
      }
    } catch {
      // Ignore local storage failures.
    }
  }, []);

  const handleCloseVersionModal = useCallback(() => {
    setIsVersionOpen(false);
    setIsVersionFirstOpen(false);
    try {
      window.localStorage.setItem(VERSION_SEEN_STORAGE_KEY, TRANSITALERT_WEB_VERSION);
    } catch {
      // Ignore local storage failures.
    }
  }, []);

  useEffect(() => {
    if (activeTab === "map") return;
    setIsUtilityPanelOpen(true);
  }, [activeTab]);

  useEffect(() => {
    if (authSession && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authSession, isAuthenticated, setLocation]);

  const findNearestStation = useCallback(
    (coords: [number, number]) => {
      return uniqueStations
        .map((station) => ({
          station,
          distance:
            (station.position[0] - coords[0]) ** 2 +
            (station.position[1] - coords[1]) ** 2,
        }))
        .sort((left, right) => left.distance - right.distance)[0]?.station ?? null;
    },
    [uniqueStations],
  );

  const buildJourneyPath = useCallback(
    (originName: string, destinationName: string) => {
      if (originName === destinationName) {
        return { stationNames: [originName], edgeLines: [] as string[] };
      }

      const visited = new Set<string>([originName]);
      const queue = [originName];
      const previous = new Map<string, { station: string; line: string }>();

      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) continue;
        if (current === destinationName) break;

        for (const edge of plannerNetwork.get(current) ?? []) {
          if (visited.has(edge.to)) continue;
          visited.add(edge.to);
          previous.set(edge.to, { station: current, line: edge.line });
          queue.push(edge.to);
        }
      }

      if (!visited.has(destinationName)) return null;

      const stationNames: string[] = [destinationName];
      const edgeLines: string[] = [];
      let cursor = destinationName;

      while (cursor !== originName) {
        const step = previous.get(cursor);
        if (!step) return null;
        edgeLines.unshift(step.line);
        stationNames.unshift(step.station);
        cursor = step.station;
      }

      return { stationNames, edgeLines };
    },
    [plannerNetwork],
  );

  const getJourneyBoardingAdvice = (route: Station[], summary: string) => {
    if (route.length < 2) return "";

    const transferMatch = summary.match(/Change at (.+?) from/);
    const focusStation = transferMatch?.[1] ?? route[route.length - 1]?.name;
    const hint = (focusStation && TRAIN_BOARDING_HINTS[focusStation]) || null;

    if (hint) {
      return `${hint.zone}: ${hint.reason}`;
    }

    return "Middle cars: usually the safest all-round pick for concourse access, stairs, and flexible transfers.";
  };

  const buildJourneyDisplay = (
    route: Station[],
    summary: string,
    legs: JourneyLeg[],
    pattern: string,
    typeLabel = "Metro train",
  ): JourneyDisplay => {
    const start = new Date();
    const totalMinutes = Math.max(route.length * 3, legs.length * 8, 9);
    const end = addMinutesToTime(start, totalMinutes);

    return {
      summary,
      pattern,
      typeLabel,
      window: formatPlannerTimeWindow(start, end),
      duration: formatPlannerDuration(totalMinutes),
      date: formatPlannerDate(start),
      stopCountLabel: `${Math.max(route.length - 1, 0)} stops`,
      legs,
    };
  };

  const applyJourneyPlan = (route: Station[], summary: string, display?: JourneyDisplay) => {
    setJourneyRoute(route);
    setJourneySummary(summary);
    setJourneyBoardingAdvice(getJourneyBoardingAdvice(route, summary));
    setJourneyDisplay(display ?? null);
    setJourneyStartedAt(route.length > 0 ? new Date().toISOString() : null);
    setAttachedJourneyServiceKey(null);
    setAttachedJourneyServiceLabel(null);
  };

  const computeJourneyRoute = () => {
    try {
      setJourneyPlannerMessage("");
      const trimmedDestination = journeyDestination.trim();
      const destination =
        stationByName.get(trimmedDestination) ??
        stationByNormalizedName.get(trimmedDestination.toLowerCase()) ??
        null;
      const isHomeOrigin = journeyOrigin === HOME_ORIGIN_LABEL;
      const isCurrentLocationOrigin = currentLocationOrigin !== null && journeyOrigin === currentLocationOrigin;

      let resolvedOrigin =
        stationByName.get(journeyOrigin) ??
        stationByNormalizedName.get(journeyOrigin.trim().toLowerCase()) ??
        null;
      let accessLeg: JourneyLeg | null = null;

    if (isHomeOrigin) {
      const nearestHomeStation = findNearestStation(HOME_ORIGIN_COORDS);
      if (nearestHomeStation) {
        resolvedOrigin = nearestHomeStation;
        accessLeg = {
          mode: "walk",
          title: "Start from home",
          from: "15 Louise St, Brighton East",
          to: nearestHomeStation.name,
          detail: "Use your nearest rail interchange as the handoff into the network.",
          badge: "Walk",
        };
      }
    } else if (isCurrentLocationOrigin && currentLocationCoords) {
      const nearestGpsStation = findNearestStation(currentLocationCoords);
      if (nearestGpsStation) {
        resolvedOrigin = nearestGpsStation;
        accessLeg = {
          mode: "walk",
          title: "Start from current location",
          from: journeyOrigin,
          to: nearestGpsStation.name,
          detail: "GPS start attached to the nearest station before the rail leg begins.",
          badge: "GPS",
        };
      }
    }

      if (!resolvedOrigin || !destination) {
        applyJourneyPlan([], "Pick a valid destination and start point, then plan the trip again.");
        setJourneyPlannerMessage("Choose a recognised start point and destination before planning.");
        return;
      }

      if (resolvedOrigin.name === destination.name) {
        const singleLegs: JourneyLeg[] = [
          ...(accessLeg ? [accessLeg] : []),
          {
            mode: "walk",
            title: "You have arrived",
            from: resolvedOrigin.name,
            to: destination.name,
            detail: "No further travel needed.",
            badge: "Arrived",
          },
        ];
        applyJourneyPlan(
          [resolvedOrigin],
          "You're already at your destination.",
          buildJourneyDisplay([resolvedOrigin], "You're already at your destination.", singleLegs, "Already there", "Station access"),
        );
        return;
      }

      const path = buildJourneyPath(resolvedOrigin.name, destination.name);
      if (!path) {
        applyJourneyPlan(
          [resolvedOrigin, destination],
          "No clean through-route was found right now, so the planner kept your start and end pinned.",
          buildJourneyDisplay(
            [resolvedOrigin, destination],
            "No clean through-route was found right now.",
            [
              ...(accessLeg ? [accessLeg] : []),
              {
                mode: "walk",
                title: "Manual transfer",
                from: resolvedOrigin.name,
                to: destination.name,
                detail: "Check live services manually or attach yourself to a specific trip below.",
                badge: "Fallback",
              },
            ],
            "Manual transfer",
            "Fallback route",
          ),
        );
        return;
      }

      const routeStations = path.stationNames
        .map((stationName) => stationByName.get(stationName))
        .filter((station): station is Station => Boolean(station));
      const trainLegs: JourneyLeg[] = [];

      if (path.edgeLines.length > 0) {
        let segmentStartIndex = 0;
        let activeLine = path.edgeLines[0] ?? "";

        for (let index = 1; index <= path.edgeLines.length; index += 1) {
          const lineAtIndex = path.edgeLines[index];
          if (lineAtIndex === activeLine) continue;

          const from = path.stationNames[segmentStartIndex] ?? resolvedOrigin.name;
          const to = path.stationNames[index] ?? destination.name;
          const stopCount = Math.max(index - segmentStartIndex, 0);
          trainLegs.push({
            mode: "train",
            title: `${activeLine} line`,
            from,
            to,
            detail: `${stopCount} stop${stopCount === 1 ? "" : "s"}${index < path.stationNames.length - 1 ? " before changing" : ""}`,
            badge: "Train",
          });

          segmentStartIndex = index;
          activeLine = lineAtIndex ?? "";
        }
      }
      

      const journeyLegs = [...(accessLeg ? [accessLeg] : []), ...trainLegs];
      const changeStations = trainLegs
        .slice(0, -1)
        .map((leg) => leg.to)
        .filter(Boolean);
      const summary =
        trainLegs.length <= 1
          ? `Direct journey via the ${trainLegs[0]?.title ?? "rail network"} (${Math.max(routeStations.length - 1, 0)} stops).`
          : `Stay on board, then change at ${changeStations.join(", ")} to finish the trip to ${destination.name}.`;
      const pattern =
        trainLegs.length <= 1
          ? trainLegs[0]?.title ?? "Direct service"
          : `Change at ${changeStations.join(" + ")}`;

      applyJourneyPlan(
        routeStations,
        summary,
        buildJourneyDisplay(
          routeStations,
          summary,
          journeyLegs,
          pattern,
          accessLeg ? "Multi-stage journey" : "Rail journey",
        ),
      );
    } catch (error) {
      console.error("Journey planning failed", error);
      setJourneyPlannerMessage("Journey planning hit a problem. Your inputs were kept, so please try again.");
      applyJourneyPlan([], "Journey planning hit a problem before the route could be drawn.");
    }
  };

  const loadStationDraft = (stationName: string) => {
    const station = uniqueStations.find((item) => item.name === stationName);
    setAdminSelectedStation(stationName);
    if (station) {
      setAdminLat(String(station.position[0]));
      setAdminLng(String(station.position[1]));
    }
  };

  const saveStationDraft = () => {
    setAdminMessage(
      `Draft saved for ${adminSelectedStation}: ${adminLat}, ${adminLng} on ${adminSelectedLine}. Persist this next.`,
    );
  };

  const updateAdminAccountDraft = useCallback(
    (
      accountId: string,
      field: "role" | "isAdmin" | "isPremium",
      value: string | boolean,
    ) => {
      setAdminAccountDrafts((current) => ({
        ...current,
        [accountId]: {
          role: current[accountId]?.role ?? "Traveller",
          isAdmin: current[accountId]?.isAdmin ?? false,
          isPremium: current[accountId]?.isPremium ?? false,
          ...(field === "role" ? { role: String(value) } : {}),
          ...(field === "isAdmin" ? { isAdmin: Boolean(value) } : {}),
          ...(field === "isPremium" ? { isPremium: Boolean(value) } : {}),
        },
      }));
    },
    [],
  );


  const updatePreferences = useCallback(
    (patch: Partial<UserPreferences>) => {
      setPreferences((current) => {
        const next = {
          ...current,
          ...patch,
        };

        if (arePreferencePatchesEqual(current, next)) {
          return current;
        }

        writeLocalPreferences(next);
        if (isAuthenticated && !isGuest) {
          void saveAccountPreferences(next).catch((error) => {
            console.warn("Unable to save account preferences right now.", error);
          });
        }
        return next;
      });
    },
    [isAuthenticated, isGuest],
  );

  useEffect(() => {
    const currentModes = Array.isArray(preferences.transportModes) ? preferences.transportModes : [];
    const appPreferences = preferences.appPreferences ?? {};
    const hasMigratedTransportModes = appPreferences.transportModesMigrated === true;

    if (hasMigratedTransportModes) {
      return;
    }

    const isLegacyTrainOnly = currentModes.length === 1 && currentModes[0] === "train";
    const hasInvalidModes = currentModes.length === 0;

    if (isLegacyTrainOnly || hasInvalidModes) {
      updatePreferences({
        transportModes: [...DEFAULT_TRANSPORT_MODES],
        appPreferences: {
          ...appPreferences,
          transportModesMigrated: true,
        },
      });
      return;
    }

    updatePreferences({
      appPreferences: {
        ...appPreferences,
        transportModesMigrated: true,
      },
    });
  }, [preferences.appPreferences, preferences.transportModes, updatePreferences]);

  const layerState = preferences.selectedMapFilters as Partial<LayerState>;

  const visiblePlannerFilters = useMemo(() => {
    return SERVICE_FILTERS.filter((filter) => {
      if (filter.key === "crossCityPink") {
        return !splitCrossCityGroup;
      }
      if (filter.key === "werribeeWilliamstownGroup" || filter.key === "sandringhamGroup") {
        return splitCrossCityGroup;
      }
      if (filter.key === "frankstonGroup") {
        return false;
      }
      if (filter.key === "upfieldCraigieburnCityLoop") {
        return false;
      }
      return true;
    });
  }, [splitCrossCityGroup]);

  const isPlannerFilterActive = (filter: ServiceFilterKey) => {
    switch (filter) {
      case "geelongRegionalGroup":
        return (preferences.transportModes as TransportMode[]).includes("vline") && Boolean(layerState.geelongRegional);
      case "ballaratRegionalGroup":
        return (preferences.transportModes as TransportMode[]).includes("vline") && Boolean(layerState.ballaratRegional);
      case "bendigoRegionalGroup":
        return (preferences.transportModes as TransportMode[]).includes("vline") && Boolean(layerState.bendigoRegional);
      case "seymourRegionalGroup":
        return (preferences.transportModes as TransportMode[]).includes("vline") && Boolean(layerState.seymourRegional);
      case "traralgonRegionalGroup":
        return (preferences.transportModes as TransportMode[]).includes("vline") && Boolean(layerState.traralgonRegional);
      case "metroTunnelServices":
        return Boolean(layerState.metroTunnel || layerState.sunburyLine || layerState.cranbourneLine || layerState.pakenhamLine);
      case "crossCityPink":
        return Boolean(layerState.werribeeLine || layerState.sandringhamLine);
      case "werribeeWilliamstownGroup":
        return Boolean(layerState.werribeeLine);
      case "sandringhamGroup":
        return Boolean(layerState.sandringhamLine);
      case "burnleyGroup":
        return Boolean(layerState.belgraveLine || layerState.lilydaleLine || layerState.glenWaverleyLine || layerState.alameinLine || layerState.burnleyLoop);
      case "cliftonHillGroup":
        return Boolean(layerState.merndaLine || layerState.hurstbridgeLine || layerState.cliftonHillLoop);
      case "caulfieldGroup":
      case "frankstonGroup":
        return Boolean(layerState.frankstonLine);
      case "upfieldCraigieburn":
        return Boolean(layerState.upfieldLine || layerState.craigieburnLine);
      case "upfieldCraigieburnCityLoop":
        return Boolean(layerState.northernLoop);
      default:
        return false;
    }
  };

  const togglePlannerTransportMode = useCallback((mode: TransportMode) => {
    const currentModes = (preferences.transportModes as TransportMode[]) || [...DEFAULT_TRANSPORT_MODES];
    const nextModes = currentModes.includes(mode)
      ? currentModes.filter((item) => item !== mode)
      : [...currentModes, mode];
    updatePreferences({ transportModes: nextModes.length > 0 ? nextModes : [...DEFAULT_TRANSPORT_MODES] });
  }, [preferences.transportModes, updatePreferences]);

  const togglePlannerServiceFilter = useCallback((filter: ServiceFilterKey) => {
    const prev = layerState;
    let next: Partial<LayerState> = { ...prev };
    const currentModes = (preferences.transportModes as TransportMode[]) || [...DEFAULT_TRANSPORT_MODES];
    const shouldForceShowRegional = !currentModes.includes("vline") && (
      filter === "geelongRegionalGroup" ||
      filter === "ballaratRegionalGroup" ||
      filter === "bendigoRegionalGroup" ||
      filter === "seymourRegionalGroup" ||
      filter === "traralgonRegionalGroup"
    );

    switch (filter) {
      case "geelongRegionalGroup":
        next = { ...prev, geelongRegional: shouldForceShowRegional ? true : !Boolean(prev.geelongRegional) };
        break;
      case "ballaratRegionalGroup":
        next = { ...prev, ballaratRegional: shouldForceShowRegional ? true : !Boolean(prev.ballaratRegional) };
        break;
      case "bendigoRegionalGroup":
        next = { ...prev, bendigoRegional: shouldForceShowRegional ? true : !Boolean(prev.bendigoRegional) };
        break;
      case "seymourRegionalGroup":
        next = { ...prev, seymourRegional: shouldForceShowRegional ? true : !Boolean(prev.seymourRegional) };
        break;
      case "traralgonRegionalGroup":
        next = { ...prev, traralgonRegional: shouldForceShowRegional ? true : !Boolean(prev.traralgonRegional) };
        break;
      case "metroTunnelServices": {
        const nextValue = !Boolean(prev.metroTunnel);
        next = {
          ...prev,
          metroTunnel: nextValue,
          sunburyLine: nextValue,
          cranbourneLine: nextValue,
          pakenhamLine: nextValue,
        };
        break;
      }
      case "crossCityPink":
        next = {
          ...prev,
          werribeeLine: !Boolean(prev.werribeeLine),
          sandringhamLine: !Boolean(prev.sandringhamLine),
        };
        break;
      case "werribeeWilliamstownGroup":
        next = {
          ...prev,
          werribeeLine: !Boolean(prev.werribeeLine),
        };
        break;
      case "sandringhamGroup":
        next = {
          ...prev,
          sandringhamLine: !Boolean(prev.sandringhamLine),
        };
        break;
      case "burnleyGroup": {
        const nextValue = !(prev.belgraveLine || prev.lilydaleLine || prev.glenWaverleyLine || prev.alameinLine || prev.burnleyLoop);
        next = {
          ...prev,
          belgraveLine: nextValue,
          lilydaleLine: nextValue,
          glenWaverleyLine: nextValue,
          alameinLine: nextValue,
          burnleyLoop: nextValue,
        };
        break;
      }
      case "cliftonHillGroup": {
        const nextValue = !(prev.merndaLine || prev.hurstbridgeLine || prev.cliftonHillLoop);
        next = {
          ...prev,
          merndaLine: nextValue,
          hurstbridgeLine: nextValue,
          cliftonHillLoop: nextValue,
        };
        break;
      }
      case "caulfieldGroup":
      case "frankstonGroup": {
        const nextValue = !Boolean(prev.frankstonLine);
        next = {
          ...prev,
          frankstonLine: nextValue,
        };
        break;
      }
      case "upfieldCraigieburn":
        next = {
          ...prev,
          upfieldLine: !Boolean(prev.upfieldLine),
          craigieburnLine: !Boolean(prev.craigieburnLine),
        };
        break;
      case "upfieldCraigieburnCityLoop":
        next = {
          ...prev,
          northernLoop: !Boolean(prev.northernLoop),
        };
        break;
      default:
        break;
    }

    updatePreferences({
      selectedMapFilters: next as Record<string, boolean>,
      ...(shouldForceShowRegional
        ? { transportModes: [...currentModes, "vline"] }
        : {}),
    });
  }, [layerState, preferences.transportModes, updatePreferences]);

  const toggleFavouriteStop = (stationName: string) => {
    const exists = preferences.favouriteStops.includes(stationName);
    updatePreferences({
      favouriteStops: exists
        ? preferences.favouriteStops.filter((item) => item !== stationName)
        : [...preferences.favouriteStops, stationName],
    });
  };

  const toggleFavouriteConsist = useCallback(
    (consist: string) => {
      const normalized = consist.trim();
      if (!normalized) return;

      const nextFavouriteConsists = favouriteConsists.includes(normalized)
        ? favouriteConsists.filter((item) => item !== normalized)
        : [...favouriteConsists, normalized];

      updatePreferences({
        appPreferences: {
          ...preferences.appPreferences,
          favouriteConsists: nextFavouriteConsists,
        },
      });
    },
    [favouriteConsists, preferences.appPreferences, updatePreferences],
  );

  const utilitySheetCopy = useMemo(() => {
    if (activeTab === "fleets") {
      return {
        eyebrow: "Fleets",
        title: "Live fleet board",
        summary: selectedFleetConfig
          ? `Showing ${selectedFleetConfig.label} trips and live-style fleet stats.`
          : "Choose a fleet type to peek at the live board.",
      };
    }

    return {
      eyebrow: "Admin",
      title: "Network editor tools",
      summary: isAdmin
        ? "Station positions, line assignments, and admin drafting tools."
        : "Admin-only tools live here once your account has permission.",
    };
  }, [activeTab, isAdmin, selectedFleetConfig]);

  const handleTabChange = (value: string) => {
    if (isGuest && value !== "map") {
      setUserMenuMessage("Guest access is limited to the map and journey planner. Register to unlock the full app.");
      setIsUserMenuOpen(true);
      return;
    }
    setActiveTab(value as "map" | "fleets" | "admin");
    setIsUtilityPanelOpen(value === "map" ? isUtilityPanelOpen : true);
  };

  if (!authSession) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background px-6 text-white">
        <div className="rounded-[2rem] border border-white/10 bg-card/80 px-6 py-5 shadow-2xl backdrop-blur-xl">
          Loading your account session...
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background px-6 text-white">
        <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-card/85 p-6 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-300/80">
            TransitAlert Melbourne
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Session ended</h1>
          <p className="mt-2 text-sm text-white/65">
            Your app session is no longer active, so we&apos;re sending you back to sign in.
          </p>
          <button
            type="button"
            onClick={() => setLocation("/login")}
            className="mt-5 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Go to login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-background">
        <TopBar
          onOpenVersion={() => {
            setIsVersionFirstOpen(false);
            setIsVersionOpen(true);
          }}
          onOpenAlerts={() => setLocation("/alerts/today")}
          onOpenUserMenu={() => {
            setUserMenuMessage("");
            setIsUserMenuOpen((value) => !value);
          }}
        user={authSession?.user ?? null}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
      <div className="pointer-events-none absolute inset-x-0 top-[4.85rem] z-[55] flex justify-center px-2.5 sm:top-5 sm:px-6">
        <TabsList className="pointer-events-auto flex w-full max-w-[calc(100%-0.75rem)] justify-start gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-card/80 p-1 shadow-xl backdrop-blur-xl sm:w-auto sm:max-w-xl sm:justify-center">
            <TabsTrigger className="shrink-0 px-2.5 py-1 text-xs sm:px-3 sm:text-sm" value="map">Journey Planner</TabsTrigger>
            {!isGuest && <TabsTrigger className="shrink-0 px-2.5 py-1 text-xs sm:px-3 sm:text-sm" value="fleets">Fleets</TabsTrigger>}
            {isAdmin && <TabsTrigger className="shrink-0 px-2.5 py-1 text-xs sm:px-3 sm:text-sm" value="admin">Admin</TabsTrigger>}
        </TabsList>
      </div>

      {isUserMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Close account menu"
            onClick={() => setIsUserMenuOpen(false)}
            className="absolute inset-0 z-[58] bg-transparent"
          />
          <div className="absolute left-3 right-3 top-[6.2rem] z-[59] w-auto max-w-[19rem] rounded-[1.6rem] border border-white/10 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-2xl sm:left-6 sm:right-auto sm:top-24 sm:w-[280px] sm:max-w-none">
            <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-3">
              <p className="text-sm font-semibold text-white">{authSession?.user?.username ?? "Account"}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">{authSession?.user?.role ?? "Session"}</p>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {isGuest ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setUserMenuMessage("");
                      setLocation("/login");
                    }}
                    className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-left text-sm font-semibold text-blue-100 transition hover:bg-blue-500/15"
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setUserMenuMessage("");
                      setLocation("/register");
                    }}
                    className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-left text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15"
                  >
                    Create account
                  </button>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs leading-relaxed text-white/65">
                    Guest mode hides live vehicles and premium account tools. Log in or register to unlock the full app.
                  </div>
                </>
              ) : (
                <>
              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  setUserMenuMessage("");
                  setLocation("/settings");
                }}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Open settings
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setUserMenuMessage("");
                    setLocation("/settings");
                  }}
                  className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-left text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15"
                >
                  Admin settings
                </button>
              )}
              <button
                type="button"
                onClick={() => signOutMutation.mutate()}
                disabled={signOutMutation.isPending}
                className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-left text-sm font-semibold text-red-100 transition hover:bg-red-500/15 disabled:opacity-70"
              >
                {signOutMutation.isPending ? "Signing out..." : "Log out"}
              </button>
                </>
              )}
            </div>
            {userMenuMessage && (
              <p className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-white/65">
                {userMenuMessage}
              </p>
            )}
          </div>
        </>
      )}

      {isOriginPickerOpen && (
        <>
          <button
            type="button"
            aria-label="Close origin picker"
            onClick={() => setIsOriginPickerOpen(false)}
            className="absolute inset-0 z-[70] bg-black/55 backdrop-blur-sm"
          />
          <div className="absolute inset-x-3 top-[6.4rem] z-[71] mx-auto w-auto max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-2xl sm:inset-x-4 sm:top-28 sm:w-full">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-white">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-300/75">Nearest Stations</p>
                <h3 className="mt-1 text-2xl font-semibold">Choose where you're starting from</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOriginPickerOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="grid max-h-[75vh] gap-5 overflow-y-auto p-5 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
                <p className="text-lg font-semibold text-white">Stops Near</p>
                <p className="mt-1 text-sm text-white/60">Quick-start stations for testing departures and route planning.</p>
                <div className="mt-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setJourneyOrigin(HOME_ORIGIN_LABEL);
                      setOriginPickerMessage("");
                      setIsOriginPickerOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-4 text-left transition hover:bg-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-blue-300" />
                      <div>
                        <p className="text-base font-semibold text-white">Home Â· 15 Louise St, Brighton East</p>
                        <p className="text-xs text-white/55">Saved Tyler origin</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                      Home
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={useCurrentLocationForOrigin}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-4 text-left transition hover:bg-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-cyan-300" />
                      <div>
                        <p className="text-base font-semibold text-white">Select your current location now</p>
                        <p className="text-xs text-white/55">Use live GPS as your trip origin</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-200">
                      GPS
                    </span>
                  </button>
                </div>
                {originPickerMessage && (
                  <p className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/65">
                    {originPickerMessage}
                  </p>
                )}
                <div className="mt-4 space-y-3">
                  {nearbyOriginStations.map((station, index) => (
                    <button
                      key={station.name}
                      type="button"
                      onClick={() => {
                        setJourneyOrigin(station.name);
                        setIsOriginPickerOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-4 text-left transition hover:bg-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-blue-300" />
                        <div>
                          <p className="text-base font-semibold text-white">{station.name}</p>
                          <p className="text-xs text-white/55">
                            {index === 0 ? "Best quick test station" : "Nearby suggested station"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {preferences.favouriteStops.includes(station.name) && (
                          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">
                            Favourite
                          </span>
                        )}
                        <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                          {index === 0 ? "Recommended" : `${(1.1 + index * 0.3).toFixed(2)} km`}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    value={originSearch}
                    onChange={(event) => setOriginSearch(event.target.value)}
                    placeholder="Search station"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-11 py-3 text-white outline-none transition focus:border-blue-400/50"
                  />
                </div>
                <div className="mt-4 max-h-[26rem] space-y-2 overflow-y-auto pr-1">
                  {filteredOriginStations.map((station) => (
                    <button
                      key={station.name}
                      type="button"
                      onClick={() => {
                        setJourneyOrigin(station.name);
                        setIsOriginPickerOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                        station.name === journeyOrigin
                          ? "border-blue-400/40 bg-blue-500/10"
                          : "border-white/10 bg-slate-900/80 hover:bg-white/10"
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-white">{station.name}</p>
                        <p className="mt-1 text-xs text-white/50">
                          {(STATION_SERVICE_LOOKUP[station.name] ?? ["Metro services"]).join(" â€¢ ")}
                        </p>
                      </div>
                      {station.name === "Town Hall" && (
                        <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-200">
                          Town Hall test
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <TransitMap
        journeyRoute={journeyRoute}
        splitCrossCityGroup={splitCrossCityGroup}
        transportModes={preferences.transportModes as Array<"train" | "tram" | "bus" | "vline">}
        onTransportModesChange={(transportModes) => updatePreferences({ transportModes })}
        persistedLayerState={preferences.selectedMapFilters}
        onLayerStateChange={(selectedMapFilters) => updatePreferences({ selectedMapFilters: selectedMapFilters as Record<string, boolean> })}
        isAdmin={isAdmin}
        isGuest={isGuest}
        isPremium={isPremium}
        mobilePerformanceMode={mobilePerformanceMode}
        premiumPaypalLink={premiumPaypalLink}
        favouriteConsists={favouriteConsists}
        onToggleFavouriteConsist={toggleFavouriteConsist}
        showFilterRail={false}
        focusedVehicleKey={focusedVehicleKey}
        onFocusedVehicleHandled={() => setFocusedVehicleKey(null)}
        debugLineKey={adminDebugLineKey}
      />

      {activeTab === "map" && !isMobile && <RiskyRoutes />}

      {activeTab === "map" && (
        <div className="absolute inset-x-0 bottom-0 z-40 pointer-events-none">
          <div className="mx-auto w-full max-w-3xl px-3 pb-3 pointer-events-none sm:px-4 sm:pb-4">
            <PlannerSheet isOpen={isPlannerOpen} onToggle={() => setIsPlannerOpen((value) => !value)}>
              <div className="space-y-3.5">
                <div className="px-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300/80">Journey Planner</p>
                  <h2 className="mt-1.5 text-lg font-semibold text-white sm:text-[1.6rem]">
                    Route across the network without losing the map.
                  </h2>
                  <p className="mt-1 text-sm text-white/60">
                    Built like a mobile transit app, but still polished on desktop.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-white/60">From</span>
                    <button
                      type="button"
                      onClick={() => setIsOriginPickerOpen(true)}
                      className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-left text-base text-white outline-none transition hover:border-blue-400/40"
                    >
                      <span>{journeyOrigin}</span>
                      <ChevronDown className="h-4 w-4 text-white/55" />
                    </button>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-white/60">To</span>
                    <input
                      value={journeyDestination}
                      onChange={(event) => setJourneyDestination(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          computeJourneyRoute();
                        }
                      }}
                      list="station-options"
                      placeholder="Where to?"
                      className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-base text-white outline-none transition focus:border-primary"
                    />
                  </label>
                </div>

                <div className="rounded-[1.7rem] border border-white/10 bg-[#0f1730]/92 p-3.5 shadow-2xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">Service filters</p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {visiblePlannerFilters
                      .filter((filter) => isPlannerFilterActive(filter.key))
                      .map((filter) => (
                        <span
                          key={`active-chip-${filter.key}`}
                          className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${filter.tone}`}
                        >
                          {filter.label}
                        </span>
                      ))}
                  </div>

                  <div className="mt-3.5 flex flex-wrap gap-2.5">
                    {([
                      { key: "train", icon: "Train", activeClass: "border-blue-400/40 bg-blue-500 text-white shadow-lg shadow-blue-950/40" },
                      { key: "tram", icon: tramButtonIcon, activeClass: "border-[#78BE20]/50 bg-[#78BE20] text-white shadow-lg shadow-[#78BE20]/25", isImage: true },
                      { key: "vline", icon: "V/Line", activeClass: "border-purple-400/40 bg-purple-500 text-white shadow-lg shadow-purple-950/40" },
                      { key: "bus", icon: busButtonIcon, activeClass: "border-[#FF8200]/55 bg-[#FF8200] text-white shadow-lg shadow-[#FF8200]/25", isImage: true },
                    ] as Array<{ key: TransportMode; icon: string; activeClass: string; isImage?: boolean }>).map((mode) => {
                      const active = (preferences.transportModes as TransportMode[]).includes(mode.key);
                      return (
                        <button
                          key={mode.key}
                          type="button"
                          onClick={() => togglePlannerTransportMode(mode.key)}
                          className={`flex h-12 w-12 items-center justify-center rounded-full border text-[10px] font-bold transition sm:h-[3.25rem] sm:w-[3.25rem] ${
                            active
                              ? mode.activeClass
                              : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
                          }`}
                          aria-label={mode.key}
                        >
                          {mode.isImage ? (
                            <img
                              src={mode.icon}
                              alt=""
                              className={`h-8 w-8 rounded-full object-contain transition sm:h-9 sm:w-9 ${
                                active ? "" : "grayscale brightness-75 opacity-60"
                              }`}
                            />
                          ) : (
                            mode.icon
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {isAdmin && (
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setActiveTab("admin")}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/70 transition hover:bg-white/10"
                      >
                        Admin tools
                      </button>
                    </div>
                  )}
                </div>

                {journeyPlannerMessage && (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    {journeyPlannerMessage}
                  </div>
                )}

                <button
                  onClick={computeJourneyRoute}
                  className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-blue-500"
                >
                  Plan route
                </button>

                <datalist id="station-options">
                  {stationOptions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>

                <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/85 p-4 text-sm text-white/75">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {journeyRoute.length > 0 ? "Journey board" : "Ready when you are"}
                      </p>
                      <p className="mt-1 text-sm">{journeySummary}</p>
                      {journeyStartedAt && (
                        <p className="mt-1 text-xs text-white/45">Started {formatJourneyStarted(journeyStartedAt)}</p>
                      )}
                    </div>
                    {journeyDisplay && journeyDisplay.legs.length > 0 && journeyRoute.length > 0 && (
                      <div className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                        {journeyDisplay.stopCountLabel}
                      </div>
                    )}
                  </div>

                  {journeyBoardingAdvice && journeyRoute.length > 1 && (
                    <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/85">
                        Best boarding position
                      </p>
                      <p className="mt-1 text-sm text-emerald-50/95">{journeyBoardingAdvice}</p>
                    </div>
                  )}

                  {attachedJourneyServiceLabel && (
                    <div className="mt-3 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/85">
                        Attached service
                      </p>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-cyan-50/95">{attachedJourneyServiceLabel}</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => attachedJourneyServiceKey && setFocusedVehicleKey(attachedJourneyServiceKey)}
                            className="rounded-full border border-cyan-300/25 bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-100"
                          >
                            Track service
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAttachedJourneyServiceKey(null);
                              setAttachedJourneyServiceLabel(null);
                            }}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/75"
                          >
                            Detach
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {journeyDisplay && journeyDisplay.legs.length > 0 && journeyRoute.length > 0 && (
                    <div className="mt-4 space-y-4">
                      <div className="rounded-[1.7rem] border border-white/10 bg-white/5 p-5">
                        <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                              Origin
                            </p>
                            <p className="mt-2 text-3xl font-semibold text-white">{journeyLegsOrigin(journeyDisplay)}</p>
                          </div>
                          <div className="flex flex-col items-center gap-3 text-center">
                            <div className="text-lg font-semibold text-emerald-300">{"\u2014  \u2192  \u2014"}</div>
                            <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
                              {journeyDisplay.pattern}
                            </span>
                          </div>
                          <div className="text-left lg:text-right">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                              Destination
                            </p>
                            <p className="mt-2 text-3xl font-semibold text-white">{journeyLegsDestination(journeyDisplay)}</p>
                          </div>
                        </div>

                        <div className="mt-5 h-px bg-white/10" />

                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                          <span>Type <span className="ml-2 text-sm normal-case tracking-normal text-white">{journeyDisplay.typeLabel}</span></span>
                          <span>Window <span className="ml-2 text-sm normal-case tracking-normal text-white">{journeyDisplay.window}</span></span>
                          <span>Duration <span className="ml-2 text-sm normal-case tracking-normal text-white">{journeyDisplay.duration}</span></span>
                          <span>Date <span className="ml-2 text-sm normal-case tracking-normal text-white">{journeyDisplay.date}</span></span>
                        </div>
                      </div>

                      <div className="grid gap-3">
                        {journeyDisplay.legs.map((leg, index) => (
                          <div
                            key={`${leg.title}-${leg.from}-${leg.to}-${index}`}
                            className={`rounded-[1.35rem] border px-4 py-4 ${getJourneyLegModeTone(leg.mode)}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-current/70">
                                  Leg {index + 1} Â· {leg.badge}
                                </p>
                                <p className="mt-2 text-lg font-semibold text-white">{leg.title}</p>
                                <p className="mt-1 text-sm text-current/90">
                                  {leg.from} to {leg.to}
                                </p>
                              </div>
                              <span className="rounded-full border border-current/25 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-current">
                                {leg.mode}
                              </span>
                            </div>
                            <p className="mt-3 text-sm text-current/80">{leg.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {journeyRoute.length > 0 && (
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={finishJourney}
                        className="rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-red-100 transition hover:bg-red-500/15"
                      >
                        Finish journey
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </PlannerSheet>
          </div>
        </div>
      )}

      <VersionModal isOpen={isVersionOpen} onClose={handleCloseVersionModal} showWelcome={isVersionFirstOpen} />

      {activeTab !== "map" && (
        <div className="absolute inset-x-0 bottom-0 z-40 pointer-events-none">
          <div className="mx-auto w-full max-w-6xl px-3 pb-3 pointer-events-none sm:px-4 sm:pb-4">
            <DockedPanelSheet
              isOpen={isUtilityPanelOpen}
              onToggle={() => setIsUtilityPanelOpen((value) => !value)}
              eyebrow={utilitySheetCopy.eyebrow}
              title={utilitySheetCopy.title}
              summary={utilitySheetCopy.summary}
            >
              <div className="rounded-[2rem] border border-white/10 bg-card/55 p-5 text-white shadow-2xl sm:p-6">
            {activeTab === "fleets" && (
              <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_rgba(15,23,42,0.96)_45%,_rgba(10,15,25,1)_100%)] p-4 shadow-2xl sm:p-6">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-2xl text-center xl:text-left">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300/90">Live Fleet Types</p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">See what each fleet type is running right now</h2>
                      <p className="mt-2 text-sm text-white/60">
                        {selectedFleetConfig
                          ? `Showing live tracked ${selectedFleetConfig.label} services from the current train feed.`
                          : "Showing all live tracked train services from the current feed. Tap a fleet type to narrow the list."}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
                      <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-5 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Service Day</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{serviceDayLabel}</p>
                      </div>
                      <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-5 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Last Updated</p>
                        <p className="mt-2 text-2xl font-semibold text-blue-300">{isFleetRefreshing ? "Refreshing..." : lastUpdatedLabel}</p>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-white/10" />

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      { label: "Live Trips", value: fleetStats.liveTrips },
                      { label: "Running Now", value: fleetStats.runningNow },
                      { label: "Upcoming Soon", value: fleetStats.upcomingSoon },
                      { label: "Selected Type", value: selectedFleetConfig?.label ?? "All fleets" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-[1.35rem] border border-white/10 bg-black/20 px-5 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-blue-300">{item.label}</span>
                          <span className="text-2xl font-semibold text-white">{item.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {FLEET_TYPES.map((fleet) => {
                      const isSelected = selectedFleetType === fleet.key;
                      return (
                        <button
                          key={fleet.key}
                          type="button"
                          onClick={() => setSelectedFleetType((current) => (current === fleet.key ? null : fleet.key))}
                          className={`inline-flex items-center gap-3 rounded-[1.2rem] border px-4 py-3 text-left transition ${
                            isSelected
                              ? "border-blue-400/70 bg-blue-500/10 shadow-[0_0_24px_rgba(59,130,246,0.22)]"
                              : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5"
                          }`}
                        >
                          <span className="text-base font-semibold text-white">{fleet.label}</span>
                          <span className="text-2xl font-semibold text-white/80">{fleetCountByType[fleet.key]}</span>
                        </button>
                      );
                    })}
                  </div>

                  {fleetTripsToDisplay.length > 0 ? (
                    <div className="space-y-3">
                      {fleetTripsToDisplay.map((trip, index) => (
                        <article
                          key={`${trip.fleet}-${trip.tdn}-${trip.id}`}
                          className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/25 shadow-lg"
                        >
                          <div className="flex flex-col gap-4 border-l-4 border-l-blue-400 px-4 py-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex min-w-0 flex-1 items-start gap-4">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-lg font-semibold text-blue-300">
                                {index + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  {hasPremiumAccess(accountPreferences) ? (
                                    <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                                      TDN / Trip {trip.tripNumber}
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/85">
                                      {getPublicFleetServiceLabel(trip)}
                                    </span>
                                  )}
                                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${trip.lineColor}`}>
                                    {trip.line}
                                  </span>
                                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-950/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-300">
                                    <TrainFront className="h-3.5 w-3.5" />
                                    {selectedFleetConfig?.label ?? FLEET_TYPES.find((fleet) => fleet.key === trip.fleet)?.label ?? trip.fleet}
                                  </span>
                                </div>
                                <p className="mt-3 text-xl font-semibold tracking-tight text-white">{trip.route}</p>
                                <p className="mt-1 text-sm text-white/55">
                                  {hasPremiumAccess(accountPreferences)
                                    ? `Trip ${trip.tdn} · Consist ${trip.consist}`
                                    : `${getPublicFleetServiceLabel(trip)} · Premium unlocks TDN and consist details`}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-col gap-3 md:items-end">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLES[trip.status]}`}>
                                  {STATUS_LABELS[trip.status]}
                                </span>
                                <span className="text-sm font-semibold text-white/85">{trip.statusLabel}</span>
                                <button
                                  type="button"
                                  onClick={() => openLiveTrainOnMap(trip)}
                                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                                >
                                  Live track
                                </button>
                              </div>
                            </div>
                          </div>
                        </article>
                      ))}

                      <p className="pt-1 text-sm text-white/60">
                        {selectedFleetConfig
                          ? `Showing ${fleetTripsToDisplay.length} live trips for ${selectedFleetConfig.label}.`
                          : `Showing all ${fleetTripsToDisplay.length} live trips from the current feed.`}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-[1.8rem] border border-dashed border-white/15 bg-black/15 px-6 py-16 text-center text-lg text-white/55">
                      {selectedFleetConfig
                        ? `No live ${selectedFleetConfig.label} services are in the current feed right now.`
                        : "No live train services are in the current feed right now."}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "admin" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Network Admin</h2>
                  <p className="mt-1 text-sm text-white/60">
                    Adjust station coordinates and draft line placement changes from your authenticated admin account.
                  </p>
                </div>

                {!isAdmin ? (
                  <div className="max-w-xl rounded-[1.8rem] border border-white/10 bg-white/5 p-5">
                    <p className="text-sm font-semibold text-white">Admin Sign-In Required</p>
                    <p className="mt-1 text-sm text-white/60">
                      This editor is now protected by your account session instead of a local page password.
                    </p>
                    <button
                      type="button"
                      onClick={() => setLocation("/login")}
                      className="mt-4 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
                    >
                      Go to login
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                      <div className="rounded-[1.8rem] border border-white/10 bg-white/5 p-5">
                        <p className="text-sm font-semibold text-white">Account Management</p>
                        <p className="mt-1 text-xs text-white/60">
                          Review registered accounts, adjust role/access, and manually control premium while registration stays tester-only.
                        </p>
                        <div className="mt-4 space-y-3">
                          {adminAccounts.length > 0 ? (
                            adminAccounts.map((account) => {
                              const draft = adminAccountDrafts[account.id] ?? {
                                role: account.role,
                                isAdmin: account.isAdmin,
                                isPremium: account.isPremium,
                              };
                              return (
                                <div key={account.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-white">{account.username}</p>
                                      <p className="mt-1 text-xs text-white/55">{account.email || "No email saved"}</p>
                                      <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/40">
                                        Created {account.createdAt ? new Date(account.createdAt).toLocaleString() : "from fallback config"}
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/75">
                                        {account.role}
                                      </span>
                                      {account.isAdmin ? (
                                        <span className="rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-200">
                                          Admin
                                        </span>
                                      ) : null}
                                      {account.isPremium ? (
                                        <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                                          Premium
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>

                                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                                    <label className="block sm:col-span-2">
                                      <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">Role</span>
                                      <select
                                        value={draft.role}
                                        onChange={(event) => updateAdminAccountDraft(account.id, "role", event.target.value)}
                                        className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
                                      >
                                        {ACCOUNT_ROLE_OPTIONS.map((role) => (
                                          <option key={role} value={role}>
                                            {role}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white">
                                      <input
                                        type="checkbox"
                                        checked={draft.isAdmin}
                                        onChange={(event) => updateAdminAccountDraft(account.id, "isAdmin", event.target.checked)}
                                        className="h-4 w-4 rounded border-white/20 bg-slate-950"
                                      />
                                      Admin access
                                    </label>
                                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white">
                                      <input
                                        type="checkbox"
                                        checked={draft.isPremium}
                                        onChange={(event) => updateAdminAccountDraft(account.id, "isPremium", event.target.checked)}
                                        className="h-4 w-4 rounded border-white/20 bg-slate-950"
                                      />
                                      Premium tools
                                    </label>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      adminAccountMutation.mutate({
                                        accountId: account.id,
                                        patch: draft,
                                      })
                                    }
                                    className="mt-4 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                                    disabled={adminAccountMutation.isPending}
                                  >
                                    {adminAccountMutation.isPending ? "Saving account..." : "Save account access"}
                                  </button>
                                </div>
                              );
                            })
                          ) : (
                            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/50 px-4 py-8 text-center text-sm text-white/55">
                              No accounts were returned from the current auth source yet.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-[1.8rem] border border-white/10 bg-white/5 p-5">
                        <p className="text-sm font-semibold text-white">How registration works right now</p>
                        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Approved debug testers</p>
                              <p className="mt-2 text-sm text-white/70">
                                These usernames or emails are currently allowed through the tester-only registration gate.
                              </p>
                            </div>
                            <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-200">
                              {approvedDebugTesters.length} approved
                            </span>
                          </div>
                          <div className="mt-4 space-y-2">
                            {approvedDebugTesters.length > 0 ? (
                              approvedDebugTesters.map((tester: ApprovedDebugTesterRecord) => (
                                <div
                                  key={`${tester.source}-${tester.value}`}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-slate-900 px-3 py-2"
                                >
                                  <span className="text-sm font-medium text-white">{tester.value}</span>
                                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">
                                    {tester.source === "env"
                                      ? "Env allowlist"
                                      : tester.source === "built-in-account"
                                        ? "Built-in account"
                                        : "Built-in tester"}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/50 px-3 py-4 text-sm text-white/50">
                                No tester whitelist entries are being returned yet.
                              </div>
                            )}
                          </div>
                        </div>
                        {!isDatabaseConfigured && (
                          <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                            The account database is not configured right now. Guest browsing still works, but proper account
                            registration, persistence after refresh/relaunch, and admin account management need
                            <span className="font-semibold text-white"> DATABASE_URL </span>
                            connected on the server.
                          </div>
                        )}
                        <div className="mt-4 space-y-3 text-sm text-white/70">
                          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-white/45">Sign-up gate</p>
                            <p className="mt-2 text-white">
                              Registration is currently limited to approved debug testers from the Netlify env var <span className="font-semibold text-blue-200">APPROVED_DEBUG_TESTERS</span>.
                              Version 1.0 is where normal public traveller sign-up is meant to open.
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-white/45">Stored data</p>
                            <p className="mt-2 text-white">
                              We store username, email, password hash, role, admin flag, timestamps, plus preferences like favourites, transport filters, premium access, and saved map behaviour.
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-white/45">Login + live APIs</p>
                            <p className="mt-2 text-white">
                              Login creates a signed session cookie. Guests can browse the base map and planner, but live train, tram, bus, and consist feeds stay hidden until a real account signs in.
                              Premium access is controlled from this admin screen and unlocks things like consist favourites and consist-based search.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[1.8rem] border border-white/10 bg-white/5 p-5">
                      <p className="text-sm font-semibold text-white">Station Position Editor</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <label className="block sm:col-span-2">
                          <span className="mb-1 block text-xs font-medium text-white/60">Station</span>
                          <select
                            value={adminSelectedStation}
                            onChange={(event) => loadStationDraft(event.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                          >
                            {uniqueStations.map((station) => (
                              <option key={station.name} value={station.name}>
                                {station.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-white/60">Latitude</span>
                          <input
                            value={adminLat}
                            onChange={(event) => setAdminLat(event.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-white/60">Longitude</span>
                          <input
                            value={adminLng}
                            onChange={(event) => setAdminLng(event.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                          />
                        </label>

                        <label className="block sm:col-span-2">
                          <span className="mb-1 block text-xs font-medium text-white/60">Target Line / Group</span>
                          <select
                            value={adminSelectedLine}
                            onChange={(event) => setAdminSelectedLine(event.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                          >
                            {lineKeys.map((lineKey) => (
                              <option key={lineKey} value={lineKey}>
                                {lineKey}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={saveStationDraft}
                          className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
                        >
                          Save Draft
                        </button>
                        <button
                          type="button"
                          onClick={() => signOutMutation.mutate()}
                          className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
                        >
                          Sign out
                        </button>
                      </div>

                      <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-slate-950/60 p-4">
                        <p className="text-sm font-semibold text-white">Cross-City Filter Mode</p>
                        <p className="mt-1 text-xs text-white/60">
                          Switch between one combined Bayside filter or separate Sandringham and Werribee / Williamstown filters.
                        </p>
                        <button
                          type="button"
                          onClick={() => setSplitCrossCityGroup((value) => !value)}
                          className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                        >
                          {splitCrossCityGroup ? "Change back to combined Bayside filter" : "Split Sandringham and Werribee / Williamstown"}
                        </button>
                      </div>

                      <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-slate-950/60 p-4">
                        <p className="text-sm font-semibold text-white">Map Debug Overlay</p>
                        <p className="mt-1 text-xs text-white/60">
                          Pick one line or loop to show admin debug markers on the live map.
                        </p>
                        <label className="mt-3 block">
                          <span className="mb-1 block text-xs font-medium text-white/60">Debug line</span>
                          <select
                            value={adminDebugLineKey}
                            onChange={(event) => setAdminDebugLineKey(event.target.value as AdminDebugLineKey)}
                            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                          >
                            {ADMIN_DEBUG_LINE_OPTIONS.map((option) => (
                              <option key={option.key} value={option.key}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <p className="mt-3 text-xs text-white/55">
                          For Glen Waverley and Mount Waverley edits in VS Code, use <span className="font-semibold text-white">GLEN_WAVERLEY_STATIONS</span> for stop locations and <span className="font-semibold text-white">GLEN_WAVERLEY_TRACK_POINTS</span> in <span className="font-semibold text-white">src/components/Map.tsx</span> for the drawn route shape between them.
                        </p>
                      </div>

                      <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-slate-950/60 p-4">
                        <p className="text-sm font-semibold text-white">Runtime API Sources</p>
                        <p className="mt-1 text-xs text-white/60">
                          Choose which live source each part of the app should point at in production.
                        </p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {[
                            ["trains", "Trains API"],
                            ["buses", "Buses API"],
                            ["trams", "Trams API"],
                            ["alerts", "Alerts API"],
                            ["shapes", "Shapes / routes API"],
                          ].map(([key, label]) => (
                            <div key={key} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                              <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">{label}</p>
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
                                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
                              >
                                <option value="production">Production</option>
                                <option value="staging">Staging</option>
                                <option value="local">Local / dev</option>
                                <option value="custom">Custom URL</option>
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
                                placeholder="https://api.example.com"
                                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
                              />
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            void saveAdminConfig(adminConfigDraft)
                              .then((saved) => {
                                setAdminConfigDraft(saved);
                                setAdminMessage("Runtime API source settings saved.");
                              })
                              .catch((error) => {
                                setAdminMessage(error instanceof Error ? error.message : "Failed to save runtime API settings.");
                              });
                          }}
                          className="mt-4 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
                        >
                          Save API source settings
                        </button>
                      </div>
                    </div>

                    <div className="rounded-[1.8rem] border border-white/10 bg-white/5 p-5">
                      <p className="text-sm font-semibold text-white">Draft Preview</p>
                      <div className="mt-4 space-y-3 text-sm text-white/70">
                        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-white/45">Station</p>
                          <p className="mt-2 text-lg font-semibold text-white">{stationDraftPreview?.name ?? adminSelectedStation}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-white/45">New Coordinates</p>
                          <p className="mt-2 text-white">{adminLat}, {adminLng}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-white/45">Line Assignment</p>
                          <p className="mt-2 text-white">{adminSelectedLine}</p>
                        </div>
                        <p className="text-xs text-white/50">
                          This is a draft editor view for now. The next step would be persisting these adjustments to a backend or config file and reflecting them on the live map.
                        </p>
                        {adminMessage && <p className="text-sm text-blue-200">{adminMessage}</p>}
                      </div>
                    </div>
                  </div>
                  </div>
                )}
              </div>
            )}
              </div>
            </DockedPanelSheet>
          </div>
        </div>
      )}
      </Tabs>

      <div className="pointer-events-none absolute bottom-28 right-3 z-30 flex sm:bottom-10 sm:right-6">
        <button
          onClick={() => {
            if (isGuest) {
              setUserMenuMessage("Create an account to add reports and community updates.");
              setIsUserMenuOpen(true);
              return;
            }
            setIsAddDrawerOpen(true);
          }}
          className="pointer-events-auto group flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-black shadow-[0_10px_40px_rgba(255,255,255,0.3)] transition-all hover:scale-105 active:scale-95 sm:px-6 sm:text-base"
        >
          <div className="rounded-full bg-black p-1 text-white transition-transform duration-300 group-hover:rotate-90">
            <Plus className="h-4 w-4" />
          </div>
          <span className="text-sm tracking-tight sm:text-base">Add a Report</span>
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-20 left-3 z-30 max-w-[12.5rem] rounded-2xl border border-white/10 bg-slate-950/78 px-3 py-2.5 text-[10px] leading-4 text-white/75 shadow-xl backdrop-blur-xl sm:bottom-6 sm:left-6 sm:max-w-xs sm:text-xs sm:leading-4">
        TransitAlert is an independent project. We are not operated by, affiliated with, or endorsed by the Department of Transport and Planning, Transport Victoria, PTV, or Metro Trains Melbourne.
      </div>

        <AddReportDrawer isOpen={isAddDrawerOpen} onClose={() => setIsAddDrawerOpen(false)} />
      </main>
    );
  }


