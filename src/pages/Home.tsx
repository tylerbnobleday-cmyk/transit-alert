import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, MapPin, Plus, Search, Send, TrainFront } from "lucide-react";
import { Map as TransitMap, Station, ALL_STATIONS, LINES } from "@/components/Map";
import { TopBar } from "@/components/TopBar";
import { RiskyRoutes } from "@/components/RiskyRoutes";
import { AddReportDrawer } from "@/components/AddReportDrawer";
import { ChatPanel } from "@/components/ChatPanel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetTelegramStatus } from "@/lib/api-client-react/src/generated/api";
import { fetchAuthSession, logoutSession } from "@/lib/auth";

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
  id: number;
  tdn: string;
  line: string;
  route: string;
  fleet: FleetTypeKey;
  departs: string;
  arrives: string;
  status: FleetTripStatus;
  lineColor: string;
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

const FLEET_TYPES: FleetTypeConfig[] = [
  { key: "hcmt", label: "HCMT", emoji: "Train", total: 33 },
  { key: "xtrapolis", label: "X'Trapolis", emoji: "Train", total: 32 },
  { key: "siemens", label: "Siemens", emoji: "Train", total: 20 },
  { key: "ss-comeng", label: "SS Comeng", emoji: "Train", total: 12 },
  { key: "ns-comeng", label: "NS Comeng", emoji: "Train", total: 7 },
  { key: "n-class", label: "N Class", emoji: "Train", total: 1 },
  { key: "vlocity", label: "VLocity", emoji: "Train", total: 25 },
];

const FLEET_TRIPS: FleetTrip[] = [
  { id: 1, tdn: "TDN C128", line: "Pakenham", route: "EPH to THL", fleet: "hcmt", departs: "20:51", arrives: "22:03", status: "running", lineColor: "bg-sky-500 text-sky-950" },
  { id: 2, tdn: "TDN 1887", line: "Hurstbridge", route: "FSS to HBE", fleet: "xtrapolis", departs: "20:42", arrives: "21:50", status: "running", lineColor: "bg-red-600 text-white" },
  { id: 3, tdn: "TDN 4449", line: "Frankston", route: "FSS to FKN", fleet: "siemens", departs: "20:48", arrives: "21:52", status: "running", lineColor: "bg-green-600 text-white" },
  { id: 4, tdn: "TDN 4954", line: "Frankston", route: "FKN to FSS", fleet: "ss-comeng", departs: "20:46", arrives: "21:59", status: "running", lineColor: "bg-green-600 text-white" },
  { id: 5, tdn: "TDN 5091", line: "Upfield", route: "FSS to UFD", fleet: "ns-comeng", departs: "21:22", arrives: "21:57", status: "running", lineColor: "bg-yellow-400 text-yellow-950" },
  { id: 6, tdn: "TDN 8089", line: "Swan Hill", route: "SSS to SWH", fleet: "n-class", departs: "18:40", arrives: "23:19", status: "running", lineColor: "bg-violet-500 text-white" },
  { id: 7, tdn: "TDN 8469", line: "Bairnsdale", route: "SSS to BDE", fleet: "vlocity", departs: "18:21", arrives: "22:22", status: "running", lineColor: "bg-violet-500 text-white" },
  { id: 8, tdn: "TDN 8814", line: "Geelong", route: "SSS to GEL", fleet: "vlocity", departs: "21:22", arrives: "22:00", status: "upcoming", lineColor: "bg-violet-500 text-white" },
];

const STATUS_STYLES: Record<FleetTripStatus, string> = {
  running: "bg-emerald-500/15 text-emerald-300",
  upcoming: "bg-amber-500/15 text-amber-300",
};

const STATUS_LABELS: Record<FleetTripStatus, string> = {
  running: "Running",
  upcoming: "Upcoming",
};

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
      className={`overflow-hidden rounded-t-[2rem] border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-2xl transition-transform duration-300 sm:rounded-[2rem] ${
        isOpen ? "translate-y-0" : "translate-y-[calc(100%-78px)]"
      }`}
    >
      <button
        onClick={onToggle}
        className="flex w-full flex-col items-center justify-center px-4 pb-3 pt-3 text-white"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Hide planner" : "Show planner"}
      >
        <span className="mb-3 h-1.5 w-14 rounded-full bg-white/20" />
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-600 px-4 py-2 text-sm font-semibold shadow-lg shadow-blue-950/40">
          <ChevronUp className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          {isOpen ? "Hide Planner" : "Show Planner"}
        </span>
      </button>

      <div className="max-h-[70vh] overflow-y-auto px-4 pb-4 sm:px-5 sm:pb-5">
        {children}
      </div>
    </div>
  );
}

function DockedPanelSheet({ isOpen, onToggle, eyebrow, title, summary, children }: DockedPanelSheetProps) {
  return (
    <div
      className={`overflow-hidden rounded-t-[2rem] border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-2xl transition-transform duration-300 sm:rounded-[2rem] ${
        isOpen ? "translate-y-0" : "translate-y-[calc(100%-92px)]"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 px-5 pb-4 pt-4 text-left text-white"
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

      <div className="max-h-[68vh] overflow-y-auto px-5 pb-5">
        {children}
      </div>
    </div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: botStatus } = useGetTelegramStatus();
  const { data: authSession } = useQuery({
    queryKey: ["auth-session"],
    queryFn: fetchAuthSession,
    retry: false,
    staleTime: 60_000,
  });
  const isAuthenticated = authSession?.authenticated ?? false;
  const [activeTab, setActiveTab] = useState<"map" | "telegram" | "fleets" | "admin">("map");
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [isUtilityPanelOpen, setIsUtilityPanelOpen] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [userMenuMessage, setUserMenuMessage] = useState("");
  const [selectedFleetType, setSelectedFleetType] = useState<FleetTypeKey | null>(null);
  const [journeyOrigin, setJourneyOrigin] = useState<string>("Flinders Street");
  const [journeyDestination, setJourneyDestination] = useState<string>("Sandringham");
  const [journeyRoute, setJourneyRoute] = useState<Station[]>([]);
  const [journeySummary, setJourneySummary] = useState<string>("Plan a journey using the fields below.");
  const [isOriginPickerOpen, setIsOriginPickerOpen] = useState(false);
  const [originSearch, setOriginSearch] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [adminSelectedStation, setAdminSelectedStation] = useState("Flinders Street");
  const [adminLat, setAdminLat] = useState("-37.8184161");
  const [adminLng, setAdminLng] = useState("144.9664779");
  const [adminSelectedLine, setAdminSelectedLine] = useState("metroTunnel");
  const [splitCrossCityGroup, setSplitCrossCityGroup] = useState(true);
  const isAdmin = authSession?.user?.isAdmin ?? false;
  const isGuest = authSession?.user?.role === "Guest";

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
  const fleetTripsForSelection = useMemo(
    () => (selectedFleetType ? FLEET_TRIPS.filter((trip) => trip.fleet === selectedFleetType) : []),
    [selectedFleetType],
  );
  const fleetStats = useMemo(() => {
    const trips = selectedFleetType ? fleetTripsForSelection : FLEET_TRIPS;
    return {
      liveTrips: trips.length,
      runningNow: trips.filter((trip) => trip.status === "running").length,
      upcomingSoon: trips.filter((trip) => trip.status === "upcoming").length,
    };
  }, [fleetTripsForSelection, selectedFleetType]);
  const serviceDayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-AU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date()),
    [],
  );
  const lastUpdatedLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-AU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date()),
    [],
  );
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

  useEffect(() => {
    if (activeTab === "admin" && !isAdmin) {
      setActiveTab("map");
    }
  }, [activeTab, isAdmin]);

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

  const computeJourneyRoute = () => {
    const origin = ALL_STATIONS.find((station) => station.name === journeyOrigin);
    const destination = ALL_STATIONS.find((station) => station.name === journeyDestination);
    if (!origin || !destination) {
      setJourneyRoute([]);
      setJourneySummary("Select valid stations to plan a route.");
      return;
    }

    if (origin.name === destination.name) {
      setJourneyRoute([origin]);
      setJourneySummary("You're already at your destination.");
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
      setJourneyRoute(segment);
      setJourneySummary(`Direct journey via the ${commonLine.name} line (${segment.length} stops).`);
      return;
    }

    const transferStations = ["South Yarra", "Flinders Street", "Southern Cross"];
    let bestRoute: Station[] = [];
    let bestSummary = "No direct connection available.";

    for (const transfer of transferStations) {
      const originLine = originLines.find((line) => line.stations.some((station) => station.name === transfer));
      const destinationLine = destinationLines.find((line) => line.stations.some((station) => station.name === transfer));
      if (!originLine || !destinationLine) continue;

      const firstLeg = getLineSegment(originLine.stations, origin.name, transfer);
      const secondLeg = getLineSegment(destinationLine.stations, transfer, destination.name).slice(1);
      const route = [...firstLeg, ...secondLeg];
      if (!bestRoute.length || route.length < bestRoute.length) {
        bestRoute = route;
        bestSummary = `Change at ${transfer} from ${originLine.name} line to ${destinationLine.name} line (${route.length} stops).`;
      }
    }

    if (bestRoute.length) {
      setJourneyRoute(bestRoute);
      setJourneySummary(bestSummary);
      return;
    }

    setJourneyRoute([origin, destination]);
    setJourneySummary("Fallback route: start and end markers shown, with no route connection found.");
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

  const utilitySheetCopy = useMemo(() => {
    if (activeTab === "telegram") {
      return {
        eyebrow: "Telegram",
        title: "Bot panel and live tracker",
        summary: botStatus?.connected
          ? `Connected as @${botStatus.username}`
          : "Peek into bot status, tracker access, and push notification setup.",
      };
    }

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
  }, [activeTab, botStatus, isAdmin, selectedFleetConfig]);

  const handleTabChange = (value: string) => {
    if (isGuest && value !== "map") {
      setUserMenuMessage("Guest access is limited to the map and journey planner. Register to unlock the full app.");
      setIsUserMenuOpen(true);
      return;
    }
    setActiveTab(value as "map" | "telegram" | "fleets" | "admin");
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
    return null;
  }

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-background">
      <TopBar
        onOpenChat={() => {
          if (isGuest) {
            setUserMenuMessage("Register an account to use live bot, chat, and tracker tools.");
            setIsUserMenuOpen(true);
            return;
          }
          setIsChatOpen(true);
        }}
        onOpenAlerts={() => setLocation("/alerts/today")}
        onOpenUserMenu={() => setIsUserMenuOpen((value) => !value)}
        user={authSession?.user ?? null}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
      <div className="absolute inset-x-0 top-4 z-[55] flex justify-center px-4 sm:top-5 sm:px-6">
        <TabsList className="w-full max-w-xl bg-card/80 p-1 shadow-xl backdrop-blur-xl border border-white/10 md:w-auto">
          <TabsTrigger value="map">Journey Planner</TabsTrigger>
          {!isGuest && <TabsTrigger value="telegram">Telegram</TabsTrigger>}
          {!isGuest && <TabsTrigger value="fleets">Fleets</TabsTrigger>}
          {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
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
          <div className="absolute left-4 top-20 z-[59] w-[280px] rounded-[1.6rem] border border-white/10 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-2xl sm:left-6 sm:top-24">
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
          <div className="absolute inset-x-4 top-24 z-[71] mx-auto w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-2xl sm:top-28">
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
                      <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                        {index === 0 ? "Recommended" : `${(1.1 + index * 0.3).toFixed(2)} km`}
                      </span>
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

      <TransitMap journeyRoute={journeyRoute} splitCrossCityGroup={splitCrossCityGroup} />

      {activeTab === "map" && <RiskyRoutes />}

      {activeTab === "map" && (
        <div className="absolute inset-x-0 bottom-0 z-40 pointer-events-none">
          <div className="mx-auto w-full max-w-3xl px-3 pb-3 pointer-events-auto sm:px-4 sm:pb-4">
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
                        {journeyRoute.length > 0 ? "Route summary" : "Ready when you are"}
                      </p>
                      <p className="mt-1 text-sm">{journeySummary}</p>
                    </div>
                    {journeyRoute.length > 0 && (
                      <div className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                        {journeyRoute.length} stops
                      </div>
                    )}
                  </div>

                  {journeyRoute.length > 0 && (
                    <div className="mt-4 grid gap-2">
                      {journeyRoute.map((station, index) => (
                        <div
                          key={`${station.name}-${index}`}
                          className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-3 py-2.5"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white/80">
                            {index + 1}
                          </span>
                          <span className="text-sm text-white">{station.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </PlannerSheet>
          </div>
        </div>
      )}

      {activeTab !== "map" && (
        <div className="absolute inset-x-0 bottom-0 z-40 pointer-events-none">
          <div className="mx-auto w-full max-w-6xl px-3 pb-3 pointer-events-auto sm:px-4 sm:pb-4">
            <DockedPanelSheet
              isOpen={isUtilityPanelOpen}
              onToggle={() => setIsUtilityPanelOpen((value) => !value)}
              eyebrow={utilitySheetCopy.eyebrow}
              title={utilitySheetCopy.title}
              summary={utilitySheetCopy.summary}
            >
              <div className="rounded-[2rem] border border-white/10 bg-card/55 p-5 text-white shadow-2xl sm:p-6">
            {activeTab === "telegram" && (
              <div className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold">Telegram Bot Integration</h2>
                <p className="text-sm text-muted-foreground">
                  Use the in-site 430M tracker panel or connect with Telegram for push notifications on your phone.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">Bot status</p>
                      {botStatus?.connected ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {botStatus?.connected
                        ? `Connected as @${botStatus.username}`
                        : "Bot not configured. Set TELEGRAM_BOT_TOKEN in your local environment."}
                    </p>
                    {botStatus?.connected && (
                      <a
                        href={`https://t.me/${botStatus.username}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-blue-400 transition hover:text-blue-300"
                      >
                        Open in Telegram <Send className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-semibold">Usage Instructions</p>
                    <ul className="mt-2 flex list-disc list-inside flex-col gap-1 text-xs text-muted-foreground">
                      <li>Open the top-right tracker button to view the 430M web bot panel</li>
                      <li>Use <code className="text-white/80">/status</code> in Telegram to get current consist info</li>
                      <li>Add the Telegram bot to a channel if you want push alerts later</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "fleets" && (
              <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_rgba(15,23,42,0.96)_45%,_rgba(10,15,25,1)_100%)] p-4 shadow-2xl sm:p-6">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-2xl text-center xl:text-left">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300/90">Live Fleet Types</p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">See what each fleet type is running right now</h2>
                      <p className="mt-2 text-sm text-white/60">
                        {selectedFleetConfig
                          ? `Showing currently running services plus imminent departures for ${selectedFleetConfig.label}.`
                          : "Choose a fleet type to load live trips. This keeps the page lighter than pulling every live service at once."}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
                      <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-5 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Service Day</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{serviceDayLabel}</p>
                      </div>
                      <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-5 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Last Updated</p>
                        <p className="mt-2 text-2xl font-semibold text-blue-300">{lastUpdatedLabel}</p>
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
                          <span className="text-2xl font-semibold text-white/80">{fleet.total}</span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedFleetConfig ? (
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
                                    {trip.tdn}
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
                              </div>
                            </div>

                            <div className="flex flex-col gap-3 md:items-end">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLES[trip.status]}`}>
                                  {STATUS_LABELS[trip.status]}
                                </span>
                                <span className="text-lg font-semibold text-white">
                                  {trip.departs}
                                  <span className="mx-2 text-white/35">→</span>
                                  {trip.arrives}
                                </span>
                                <button
                                  type="button"
                                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                                >
                                  Open Trip
                                </button>
                              </div>
                            </div>
                          </div>
                        </article>
                      ))}

                      <p className="pt-1 text-sm text-white/60">
                        Showing {fleetTripsForSelection.length} of {selectedFleetConfig.total} live trips for {selectedFleetConfig.label}.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-[1.8rem] border border-dashed border-white/15 bg-black/15 px-6 py-16 text-center text-lg text-white/55">
                      Choose a fleet type above to load live trips for that type.
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

      <div className="pointer-events-none absolute bottom-6 left-4 z-30 flex sm:left-6">
        <button
          onClick={() => {
            if (isGuest) {
              setUserMenuMessage("Create an account to add reports and community updates.");
              setIsUserMenuOpen(true);
              return;
            }
            setIsAddDrawerOpen(true);
          }}
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-black shadow-[0_10px_40px_rgba(255,255,255,0.3)] transition-all hover:scale-105 active:scale-95 group"
        >
          <div className="rounded-full bg-black p-1 text-white transition-transform duration-300 group-hover:rotate-90">
            <Plus className="h-4 w-4" />
          </div>
          <span className="text-base tracking-tight">Add a Report</span>
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-6 right-4 z-30 max-w-xs rounded-2xl border border-white/10 bg-slate-950/72 px-3 py-2 text-[11px] leading-4 text-white/70 shadow-xl backdrop-blur-xl sm:right-6 sm:text-xs">
        TransitAlert is an independent project. We are not operated by, affiliated with, or endorsed by the Department of Transport and Planning, Transport Victoria, PTV, or Metro Trains Melbourne.
      </div>

      <AddReportDrawer isOpen={isAddDrawerOpen} onClose={() => setIsAddDrawerOpen(false)} />
      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </main>
  );
}
