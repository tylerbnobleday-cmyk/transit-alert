import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ChevronDown, ChevronUp, MapPin, Plus, Search, TrainFront } from "lucide-react";
import {
  Map as TransitMap,
  Station,
  ALL_STATIONS,
  LINES,
  SERVICE_FILTERS,
  getFilterChips,
  type LayerState,
  type ServiceFilterKey,
  type TransportMode,
} from "@/components/Map";
import { TopBar } from "@/components/TopBar";
import { RiskyRoutes } from "@/components/RiskyRoutes";
import { AddReportDrawer } from "@/components/AddReportDrawer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TRANSITALERT_WEB_VERSION } from "@/lib/version";
import { fetchAuthSession, logoutSession } from "@/lib/auth";
import { fetchAdminConfig, saveAdminConfig, type AdminRuntimeConfig } from "@/lib/admin-config";
import { fetchLiveTrains, type LiveTrain } from "@/lib/live-trains";
import busButtonIcon from "@/assets/icons/bus.png";
import tramButtonIcon from "@/assets/icons/tram.png";
import {
  DEFAULT_TRANSPORT_MODES,
  defaultPreferences,
  fetchAccountPreferences,
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

const HOME_ORIGIN_LABEL = "Home · 15 Louise St, Brighton East";
const CURRENT_LOCATION_LABEL = "Current location";

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

type ChangelogEntry = {
  version: string;
  date: string;
  notes: string[];
};

const FLEET_TYPES: FleetTypeConfig[] = [
  { key: "hcmt", label: "HCMT", emoji: "Train", total: 33 },
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
    date: "11/10/2025",
    notes: [
      "New icons and a refreshed header landed.",
      "Fleet colours now follow route names instead of relying on TDN guesses.",
      "General real-time improvements helped V/Line trips appear more reliably.",
    ],
  },
  {
    version: "V0.6.9",
    date: "29/08/2025",
    notes: [
      "Trip, departures, fleet, and WebPID pages moved off the older DB collection.",
      "PTDB backend work sped up loading and cleaned up direct consist matching.",
      "WebPID bumped to TransitAlert PID 0.7 alpha.",
    ],
  },
  {
    version: "V0.6.8",
    date: "18/08/2025",
    notes: [
      "Profile became the main settings area.",
      "Alerts bubble drag and desktop opening behaviour were refined.",
      "Admin password resets now include a visible reason for the user.",
    ],
  },
  {
    version: "V0.6.7",
    date: "21/06/2025",
    notes: [
      "Searching by station code now picks the station directly.",
      "Examples like THL now resolve to Town Hall instead of unrelated matches.",
    ],
  },
  {
    version: "V0.6.6",
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

function inferFleetTypeKey(vehicle: LiveTrain): FleetTypeKey {
  const searchable = `${vehicle.trainType} ${vehicle.line} ${vehicle.destination} ${vehicle.serviceDescription ?? ""}`.toLowerCase();
  if (/(hcmt)/i.test(searchable)) return "hcmt";
  if (/(x'?trapolis)/i.test(searchable)) return "xtrapolis";
  if (/(siemens)/i.test(searchable)) return "siemens";
  if (/(vlocity)/i.test(searchable)) return "vlocity";
  if (/(n class|swan hill|bairnsdale|geelong|ballarat|traralgon)/i.test(searchable)) return "n-class";
  if (/(comeng)/i.test(searchable)) {
    return /(craigieburn|upfield|sunbury|mernda|hurstbridge)/i.test(searchable) ? "ns-comeng" : "ss-comeng";
  }
  if (/(craigieburn|upfield|sunbury|mernda|hurstbridge)/i.test(searchable)) return "ns-comeng";
  if (/(frankston|werribee|williamstown|sandringham|altona)/i.test(searchable)) return "ss-comeng";
  return "siemens";
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
      className={`pointer-events-none overflow-hidden rounded-t-[2rem] border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-2xl transition-transform duration-300 sm:rounded-[2rem] ${
        isOpen ? "translate-y-0" : "translate-y-[calc(100%-78px)]"
      }`}
    >
      <button
        onClick={onToggle}
        className="pointer-events-auto flex w-full flex-col items-center justify-center px-4 pb-3 pt-3 text-white"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Hide planner" : "Show planner"}
      >
        <span className="mb-3 h-1.5 w-14 rounded-full bg-white/20" />
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-600 px-4 py-2 text-sm font-semibold shadow-lg shadow-blue-950/40">
          <ChevronUp className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          {isOpen ? "Hide Planner" : "Show Planner"}
        </span>
      </button>

      <div className={`${isOpen ? "pointer-events-auto" : "pointer-events-none"} max-h-[70vh] overflow-y-auto px-4 pb-4 sm:px-5 sm:pb-5`}>
        {children}
      </div>
    </div>
  );
}

function VersionModal({ isOpen, onClose }: VersionModalProps) {
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
  const queryClient = useQueryClient();
  const { data: liveFleetVehicles = [], isFetching: isFleetRefreshing } = useQuery({
    queryKey: ["live-fleet-board"],
    queryFn: fetchLiveTrains,
    retry: false,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
  const { data: authSession } = useQuery({
    queryKey: ["auth-session"],
    queryFn: fetchAuthSession,
    retry: false,
    staleTime: 60_000,
  });
    const isAuthenticated = authSession?.authenticated ?? false;
    const [activeTab, setActiveTab] = useState<"map" | "fleets" | "admin">("map");
    const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
    const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [isUtilityPanelOpen, setIsUtilityPanelOpen] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isVersionOpen, setIsVersionOpen] = useState(false);
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
  const [originPickerMessage, setOriginPickerMessage] = useState("");
  const [isOriginPickerOpen, setIsOriginPickerOpen] = useState(false);
  const [originSearch, setOriginSearch] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [adminSelectedStation, setAdminSelectedStation] = useState("Flinders Street");
  const [adminLat, setAdminLat] = useState("-37.8184161");
  const [adminLng, setAdminLng] = useState("144.9664779");
  const [adminSelectedLine, setAdminSelectedLine] = useState("metroTunnel");
  const [splitCrossCityGroup, setSplitCrossCityGroup] = useState(true);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [hasMergedLocalPreferences, setHasMergedLocalPreferences] = useState(false);
  const [adminConfigDraft, setAdminConfigDraft] = useState<AdminRuntimeConfig>({});
  const isAdmin = authSession?.user?.isAdmin ?? false;
  const isGuest = authSession?.user?.role === "Guest";

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

  const signOutMutation = useMutation({
    mutationFn: logoutSession,
    onSuccess: async () => {
      queryClient.setQueryData(["auth-session"], { authenticated: false, user: null });
      await queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      setActiveTab("map");
      setLocation("/login");
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
  const fleetStats = useMemo(() => {
    const trips = selectedFleetType ? fleetTripsForSelection : liveFleetTrips;
    return {
      liveTrips: trips.length,
      runningNow: trips.filter((trip) => trip.status === "running").length,
      upcomingSoon: trips.filter((trip) => trip.status === "upcoming").length,
    };
  }, [fleetTripsForSelection, liveFleetTrips, selectedFleetType]);
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

  const useCurrentLocationForOrigin = () => {
    if (!navigator.geolocation) {
      setOriginPickerMessage("Current location is not available in this browser.");
      return;
    }

    setOriginPickerMessage("Finding your current location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const label = `${CURRENT_LOCATION_LABEL} · ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
        setCurrentLocationOrigin(label);
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
    if (isGuest && activeTab !== "map") {
      setActiveTab("map");
    }
  }, [activeTab, isGuest]);

  useEffect(() => {
    if (activeTab === "map") return;
    setIsUtilityPanelOpen(true);
  }, [activeTab]);

  useEffect(() => {
    if (authSession && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authSession, isAuthenticated, setLocation]);

  const getLineSegment = (stations: Station[], start: string, end: string) => {
    const startIndex = stations.findIndex((station) => station.name === start);
    const endIndex = stations.findIndex((station) => station.name === end);
    if (startIndex === -1 || endIndex === -1) return [];
    return startIndex <= endIndex
      ? stations.slice(startIndex, endIndex + 1)
      : stations.slice(endIndex, startIndex + 1).reverse();
  };

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
  };

  const computeJourneyRoute = () => {
    const isHomeOrigin = journeyOrigin === HOME_ORIGIN_LABEL;
    const isCurrentLocationOrigin = currentLocationOrigin !== null && journeyOrigin === currentLocationOrigin;
    const origin = ALL_STATIONS.find((station) => station.name === journeyOrigin);
    const destination = ALL_STATIONS.find((station) => station.name === journeyDestination);

    if ((isHomeOrigin || isCurrentLocationOrigin) && journeyDestination === "Arden") {
      const stateLibrary = ALL_STATIONS.find((station) => station.name === "State Library");
      const arden = ALL_STATIONS.find((station) => station.name === "Arden");

      if (stateLibrary && arden) {
        const metroTunnelLeg = getLineSegment(LINES.metroTunnel, "State Library", "Arden");
        const legs: JourneyLeg[] = [
          {
            mode: "bus",
            title: "Route 630 bus",
            from: "15 Louise St, Brighton East",
            to: "Elsternwick / Hawthorn Rd",
            detail: "Orbital feeder toward the tram corridor",
            badge: "Bus",
          },
          {
            mode: "tram",
            title: "Route 64 tram",
            from: "Hawthorn Rd",
            to: "State Library",
            detail: "Cross-city tram run into the CBD",
            badge: "Tram",
          },
          {
            mode: "train",
            title: "Metro Tunnel",
            from: "State Library",
            to: "Arden",
            detail: "Metro Tunnel platforms 1 / 2 to Arden",
            badge: "Train",
          },
        ];
        applyJourneyPlan(
          metroTunnelLeg,
          `Change at State Library from Route 64 tram to Metro Tunnel services for Arden. ${isHomeOrigin ? "Home" : "Current location"} starts are now supported, and Route 630 bus has been added as a future orbital option in the planner.`,
          buildJourneyDisplay(
            metroTunnelLeg,
            `Change at State Library from Route 64 tram to Metro Tunnel services for Arden.`,
            legs,
            "Bus + tram + Metro Tunnel",
            "Multi-modal journey",
          ),
        );
        return;
      }
    }

    if (!origin || !destination) {
      applyJourneyPlan(
        [],
        "Select a valid station destination. Home and current location starts now work for the Arden example too.",
      );
      return;
    }

    if (origin.name === destination.name) {
      applyJourneyPlan(
        [origin],
        "You're already at your destination.",
        buildJourneyDisplay(
          [origin],
          "You're already at your destination.",
          [
            {
              mode: "walk",
              title: "You have arrived",
              from: origin.name,
              to: destination.name,
              detail: "No travel needed",
              badge: "Stay put",
            },
          ],
          "Already there",
          "Station access",
        ),
      );
      return;
    }

    const lines = [
      { name: "Frankston", stations: LINES.frankston },
      { name: "Cranbourne", stations: LINES.cranbourne },
      { name: "Pakenham", stations: LINES.pakenham },
      { name: "Sunbury", stations: LINES.sunbury },
      { name: "Metro Tunnel", stations: LINES.metroTunnel },
      { name: "Sandringham", stations: LINES.sandringham },
    ];

    const originLines = lines.filter((line) => line.stations.some((station) => station.name === origin.name));
    const destinationLines = lines.filter((line) => line.stations.some((station) => station.name === destination.name));
    const commonLine = originLines.find((originLine) =>
      destinationLines.some((destinationLine) => destinationLine.name === originLine.name),
    );

    if (commonLine) {
      const segment = getLineSegment(commonLine.stations, origin.name, destination.name);
      applyJourneyPlan(
        segment,
        `Direct journey via the ${commonLine.name} line (${segment.length} stops).`,
        buildJourneyDisplay(
          segment,
          `Direct journey via the ${commonLine.name} line.`,
          [
            {
              mode: "train",
              title: `${commonLine.name} line`,
              from: origin.name,
              to: destination.name,
              detail: `${Math.max(segment.length - 1, 0)} stops direct`,
              badge: "Train",
            },
          ],
          "Stops all stations",
        ),
      );
      return;
    }

    const transferStations = ["South Yarra", "Flinders Street", "Southern Cross"];
    let bestRoute: Station[] = [];
    let bestSummary = "No direct connection available.";
    let bestDisplay: JourneyDisplay | null = null;

    for (const transfer of transferStations) {
      const originLine = originLines.find((line) => line.stations.some((station) => station.name === transfer));
      const destinationLine = destinationLines.find((line) => line.stations.some((station) => station.name === transfer));
      if (!originLine || !destinationLine) continue;

      const firstLeg = getLineSegment(originLine.stations, origin.name, transfer);
      const secondLeg = getLineSegment(destinationLine.stations, transfer, destination.name).slice(1);
      const route = [...firstLeg, ...secondLeg];
      const legs: JourneyLeg[] = [
        {
          mode: "train",
          title: `${originLine.name} line`,
          from: origin.name,
          to: transfer,
          detail: `${Math.max(firstLeg.length - 1, 0)} stops to interchange`,
          badge: "Train",
        },
        {
          mode: "train",
          title: `${destinationLine.name} line`,
          from: transfer,
          to: destination.name,
          detail: `${Math.max(secondLeg.length, 0)} stops after changing`,
          badge: "Train",
        },
      ];
      if (!bestRoute.length || route.length < bestRoute.length) {
        bestRoute = route;
        bestSummary = `Change at ${transfer} from ${originLine.name} line to ${destinationLine.name} line (${route.length} stops).`;
        bestDisplay = buildJourneyDisplay(
          route,
          `Change at ${transfer} from ${originLine.name} line to ${destinationLine.name} line.`,
          legs,
          `Change at ${transfer}`,
        );
      }
    }

    if (bestRoute.length) {
      applyJourneyPlan(bestRoute, bestSummary, bestDisplay ?? undefined);
      return;
    }

    applyJourneyPlan(
      [origin, destination],
      "Fallback route: start and end markers shown, with no route connection found.",
      buildJourneyDisplay(
        [origin, destination],
        "Fallback route: start and end markers shown, with no route connection found.",
        [
          {
            mode: "walk",
            title: "Manual transfer",
            from: origin.name,
            to: destination.name,
            detail: "No clean line match found yet",
            badge: "Fallback",
          },
        ],
        "Check services manually",
        "Fallback route",
      ),
    );
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
      case "vline":
        return false;
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
    if (filter === "vline") return;
    const prev = layerState;
    let next: Partial<LayerState> = { ...prev };

    switch (filter) {
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

    updatePreferences({ selectedMapFilters: next as Record<string, boolean> });
  },[]);

  const toggleFavouriteStop = (stationName: string) => {
    const exists = preferences.favouriteStops.includes(stationName);
    updatePreferences({
      favouriteStops: exists
        ? preferences.favouriteStops.filter((item) => item !== stationName)
        : [...preferences.favouriteStops, stationName],
    });
  };

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
          onOpenVersion={() => setIsVersionOpen(true)}
          onOpenAlerts={() => setLocation("/alerts/today")}
          onOpenUserMenu={() => {
          if (isGuest) {
            setLocation("/login");
            return;
          }
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
              <p className="text-sm font-semibold text-white">{authSession.user?.username}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">{authSession.user?.role}</p>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {[
                "Settings",
                "UI Settings",
                "Change App Icon",
              ].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setUserMenuMessage(`${item} is ready for the next pass.`);
                  }}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  {item}
                </button>
              ))}
              <button
                type="button"
                onClick={() => signOutMutation.mutate()}
                disabled={signOutMutation.isPending}
                className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-left text-sm font-semibold text-red-100 transition hover:bg-red-500/15 disabled:opacity-70"
              >
                {signOutMutation.isPending ? "Signing out..." : "Log out"}
              </button>
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

            <div className="grid gap-5 p-5 lg:grid-cols-[1.05fr_0.95fr]">
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
                        <p className="text-base font-semibold text-white">Home · 15 Louise St, Brighton East</p>
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
                          {(STATION_SERVICE_LOOKUP[station.name] ?? ["Metro services"]).join(" • ")}
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
        showFilterRail={false}
        focusedVehicleKey={focusedVehicleKey}
        onFocusedVehicleHandled={() => setFocusedVehicleKey(null)}
      />

      {activeTab === "map" && <RiskyRoutes />}

      {activeTab === "map" && (
        <div className="absolute inset-x-0 bottom-0 z-40 pointer-events-none">
          <div className="mx-auto w-full max-w-3xl px-3 pb-3 pointer-events-none sm:px-4 sm:pb-4">
            <PlannerSheet isOpen={isPlannerOpen} onToggle={() => setIsPlannerOpen((value) => !value)}>
              <div className="space-y-4">
                <div className="px-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300/80">Journey Planner</p>
                  <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
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

                <div className="rounded-[1.9rem] border border-white/10 bg-[#0f1730]/92 p-4 shadow-2xl">
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

                  <div className="mt-4 flex flex-wrap gap-3">
                    {([
                      { key: "train", icon: "Train", activeClass: "border-blue-400/40 bg-blue-500 text-white shadow-lg shadow-blue-950/40" },
                      { key: "tram", icon: tramButtonIcon, activeClass: "border-[#78BE20]/50 bg-[#78BE20] text-white shadow-lg shadow-[#78BE20]/25", isImage: true },
                      { key: "vline", icon: "V/Line", activeClass: "border-purple-400/40 bg-purple-500 text-white shadow-lg shadow-purple-950/40" },
                      { key: "bus", icon: busButtonIcon, activeClass: "border-[#FF8200]/55 bg-[#FF8200] text-white shadow-lg shadow-[#FF8200]/25", isImage: true },
                    ] as Array<{ key: TransportMode; icon: string; activeClass: string; isImage?: boolean }>).map((mode) => {
                      const active = (preferences.transportModes as TransportMode[]).includes(mode.key);
                      const disabled = mode.key === "vline";
                      return (
                        <button
                          key={mode.key}
                          type="button"
                          disabled={disabled}
                          onClick={() => !disabled && togglePlannerTransportMode(mode.key)}
                          className={`flex h-14 w-14 items-center justify-center rounded-full border text-[11px] font-bold transition ${
                            disabled
                              ? "cursor-not-allowed border-purple-400/20 bg-purple-500/8 text-purple-200/50 opacity-70"
                              : active
                                ? mode.activeClass
                                : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
                          }`}
                          aria-label={mode.key}
                        >
                          {mode.isImage ? (
                            <img src={mode.icon} alt="" className="h-10 w-10 rounded-full object-contain" />
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

                <div className="rounded-[1.9rem] border border-emerald-400/20 bg-emerald-500/8 p-4 shadow-2xl">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200/85">Live trains now</p>
                      <h3 className="mt-2 text-lg font-semibold text-white">
                        {liveFleetTrips.length > 0
                          ? `${liveFleetTrips.length} live train${liveFleetTrips.length === 1 ? "" : "s"} on the map`
                          : "No live trains returned right now"}
                      </h3>
                      <p className="mt-1 text-sm text-white/65">
                        Press any service below to jump to its live marker and trip details.
                      </p>
                    </div>
                    <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
                      Live tracker
                    </span>
                  </div>

                  {liveFleetTrips.length > 0 ? (
                    <div className="mt-4 grid gap-2">
                      {liveFleetTrips.slice(0, 6).map((trip) => (
                        <button
                          key={`map-live-${trip.id}`}
                          type="button"
                          onClick={() => openLiveTrainOnMap(trip)}
                          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-left transition hover:border-emerald-300/30 hover:bg-white/10"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                                TDN / Trip {trip.tripNumber}
                              </span>
                              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${trip.lineColor}`}>
                                {trip.line}
                              </span>
                            </div>
                            <p className="mt-2 truncate text-sm font-semibold text-white">{trip.route}</p>
                            <p className="mt-1 text-xs text-white/55">{trip.statusLabel}</p>
                          </div>
                          <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80">
                            Track
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/55 px-4 py-5 text-sm text-white/60">
                      The live train overlay is still enabled, but the feed did not return active services on this refresh.
                    </div>
                  )}
                </div>

                <datalist id="station-options">
                  {stationOptions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>

                <button
                  onClick={computeJourneyRoute}
                  className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-blue-500"
                >
                  Plan route
                </button>

                <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/85 p-4 text-sm text-white/75">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {journeyRoute.length > 0 ? "Journey board" : "Ready when you are"}
                      </p>
                      <p className="mt-1 text-sm">{journeySummary}</p>
                    </div>
                    {journeyDisplay && journeyRoute.length > 0 && (
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

                  {journeyDisplay && journeyRoute.length > 0 && (
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
                                  Leg {index + 1} · {leg.badge}
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
                </div>

              </div>
            </PlannerSheet>
          </div>
        </div>
      )}

      <VersionModal isOpen={isVersionOpen} onClose={() => setIsVersionOpen(false)} />

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
                          : "Choose a fleet type to load live services from the current feed."}
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
                      { label: "Selected Type", value: selectedFleetConfig?.label ?? "None" },
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

                  {selectedFleetConfig ? (
                    fleetTripsForSelection.length > 0 ? (
                    <div className="space-y-3">
                      {fleetTripsForSelection.map((trip, index) => (
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
                                  <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                                    TDN / Trip {trip.tripNumber}
                                  </span>
                                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${trip.lineColor}`}>
                                    {trip.line}
                                  </span>
                                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-950/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-300">
                                    <TrainFront className="h-3.5 w-3.5" />
                                    {selectedFleetConfig.label}
                                  </span>
                                </div>
                                <p className="mt-3 text-xl font-semibold tracking-tight text-white">{trip.route}</p>
                                <p className="mt-1 text-sm text-white/55">Trip {trip.tdn} · Consist {trip.consist}</p>
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
                        Showing {fleetTripsForSelection.length} live trips for {selectedFleetConfig.label}.
                      </p>
                    </div>
                    ) : (
                      <div className="rounded-[1.6rem] border border-dashed border-white/15 bg-black/15 px-6 py-12 text-center text-white/60">
                        No live {selectedFleetConfig.label} services are in the current feed right now.
                      </div>
                    )
                  ) : (
                    <div className="rounded-[1.8rem] border border-dashed border-white/15 bg-black/15 px-6 py-16 text-center text-lg text-white/55">
                      Choose a fleet type above to load live services from the current feed.
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

