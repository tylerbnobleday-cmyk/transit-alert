import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  CircleMarker,
  useMap,
  Pane,
} from "react-leaflet";
import L from "leaflet";
import { formatDistanceToNow } from "date-fns";
import { useGetReports } from "@/lib/api-client-react/src/generated/api";
import type { Report } from "@/lib/api-client-react/src/generated/api.schemas";
import smartbusIcon from "@/assets/icons/smartbus.svg";
import trainIcon from "@/assets/icons/train.svg";
import tramIcon from "@/assets/icons/tram.png";
import hcmtIcon from "@/assets/icons/hcmt.svg";
import xtrapolisIcon from "@/assets/icons/xtrapolis.svg";
import siemensIcon from "@/assets/icons/siemens.svg";
import southsideComengIcon from "@/assets/icons/ss-comeng.svg";
import northsideComengIcon from "@/assets/icons/ns-comeng.svg";
import { fetchLiveTrains, isVlineLiveTrain, type LiveTrain } from "@/lib/live-trains";
import { fetchLiveBuses, type LiveBus } from "@/lib/live-buses";
import { fetchLiveTrams, type LiveTram } from "@/lib/live-trams";
import { GENERATED_TRAM_ROUTE_BUNDLES } from "@/lib/generated-tram-routes";
import { findStationCoordinate } from "@/lib/station-coordinates";
import { fetchConsistSnapshot, type ConsistSnapshot } from "@/lib/transportvic-bot";
import { fetchMarkerOverrides, saveMarkerOverrides, type MarkerOverride } from "@/lib/marker-overrides";
import type { MobilePerformanceMode } from "@/lib/preferences";
import { DEFAULT_TRANSPORT_MODES } from "@/lib/preferences";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Accessibility,
  Train,
  BusFront,
  MapPin,
  Layers,
  AlertTriangle,
  Clock,
  Info,
  Plane,
  ZoomIn,
  ZoomOut,
  ArrowRight,
  ExternalLink,
  Navigation,
  Eye,
  EyeOff,
  Search,
  Star,
} from "lucide-react";

const MELBOURNE_CENTER: [number, number] = [-37.8136, 144.9631];
const SOUTHERN_CROSS_POSITION: [number, number] = [-37.818313906129944, 144.95218];
const FEATURED_CONSIST = "430M";
const FLAGSTAFF_POSITION: [number, number] = [-37.81145, 144.9562];
const MELBOURNE_CENTRAL_POSITION: [number, number] = [-37.80955, 144.96278];
const MELBOURNE_CENTRAL_STATE_LIBRARY_INTERCHANGE: [number, number] = [-37.80995575690716, 144.96286];
const STATE_LIBRARY_POSITION: [number, number] = [-37.80941962893699, 144.96324300865265];
const TOWN_HALL_POSITION: [number, number] = [-37.816897881552016, 144.96717135795797];
const FREIGHT_BROWN = "#7b4b2a";
const FREIGHT_BROWN_DARK = "#5a3417";
const CITY_LOOP_PILL_STATIONS = new Set([
  "Flinders Street",
  "Southern Cross",
  "Flagstaff",
  "Melbourne Central",
  "Parliament",
  "State Library",
  "Town Hall",
]);
const SPECIAL_PILL_STATIONS = new Set([
  "Caulfield",
  "Clayton",
  "Dandenong",
  "Pakenham",
  "Frankston",
  "Malvern",
  "Sunshine",
  "Watergardens",
  "Sunbury",
]);
const SINGLE_RENDER_STATIONS = new Set([
  "Flinders Street",
  "Southern Cross",
  "Flagstaff",
  "Melbourne Central",
  "Parliament",
  "State Library",
  "Town Hall",
]);
const COMBINED_LOOP_INTERCHANGES = new Set(["Melbourne Central", "State Library"]);
const CAULFIELD_METRO_SHARED_STATIONS = new Set([
  "Hawksburn",
  "Toorak",
  "Armadale",
  "Malvern",
  "Caulfield",
]);
const NORTHERN_SHARED_STATIONS = new Set(["North Melbourne"]);

function createCityLoopPillIcon(strokeColor: string, stationName: string) {
  const isHorizontalPill =
    stationName === "Parliament" ||
    stationName === "Southern Cross" ||
    stationName === "State Library" ||
    stationName === "Town Hall" ||
    SPECIAL_PILL_STATIONS.has(stationName);
  const isCompactHorizontalPill = stationName === "State Library";
  const isCombinedCentralLibrary = stationName === "Melbourne Central / State Library";
  const pillRotation =
    SPECIAL_PILL_STATIONS.has(stationName)
      ? "0deg"
      : "0deg";

  if (isCombinedCentralLibrary) {
    return L.divIcon({
html: `
  <div style="position:relative;width:54px;height:78px;display:flex;align-items:center;justify-content:center;">
  <div style="position:relative;width:30px;height:58px; transform: rotate(-12deg); transform-origin: center;">
    
    <div style="position:absolute;left:11px;top:14px;width:8px;height:38px;border-radius:9999px;background:#f8fafc;border:2px solid rgba(15,23,42,0.96);box-shadow:0 3px 8px rgba(0,0,0,0.36);overflow:hidden;">
      <div style="position:absolute;top:3px;bottom:3px;left:2px;width:2px;border-radius:9999px;background:${strokeColor};opacity:0.95;"></div>
    </div>

    <div style="position:absolute;left:12px;top:9px;width:9px;height:9px;border-radius:9999px;background:#f8fafc;border:2px solid rgba(15,23,42,0.96);transform:rotate(45deg);box-shadow:0 3px 8px rgba(0,0,0,0.36);"></div>

    <div style="position:absolute;left:16px;top:0;width:14px;height:8px;border-radius:9999px;background:#f8fafc;border:2px solid rgba(15,23,42,0.96);box-shadow:0 3px 8px rgba(0,0,0,0.36);"></div>

  </div>
</div>
`,
      className: "bg-transparent border-none",
      iconSize: [54, 78],
      iconAnchor: [27, 39],
      popupAnchor: [0, -18],
    });
  }

  const hitWidth = isHorizontalPill ? (isCompactHorizontalPill ? 52 : 62) : 38;
  const hitHeight = isHorizontalPill ? 38 : 58;

  return L.divIcon({
    html: `
      <div style="display:flex;align-items:center;justify-content:center;width:${hitWidth}px;height:${hitHeight}px;">
        <div style="display:flex;align-items:center;justify-content:center;width:${isHorizontalPill ? (isCompactHorizontalPill ? "28px" : "34px") : "14px"};height:${isHorizontalPill ? (isCompactHorizontalPill ? "14px" : "16px") : "34px"};transform:rotate(${pillRotation});transform-origin:center;">
        <div style="width:${isHorizontalPill ? (isCompactHorizontalPill ? "22px" : "28px") : "8px"};height:${isHorizontalPill ? (isCompactHorizontalPill ? "7px" : "8px") : "28px"};border-radius:9999px;background:#f8fafc;border:2px solid rgba(15,23,42,0.96);box-shadow:0 3px 8px rgba(0,0,0,0.36);position:relative;overflow:hidden;">
          <div style="position:absolute;${isHorizontalPill ? `left:${isCompactHorizontalPill ? "2px" : "3px"};right:${isCompactHorizontalPill ? "2px" : "3px"};top:1px;height:2px;` : "top:3px;bottom:3px;left:1px;width:2px;"}border-radius:9999px;background:${strokeColor};opacity:0.95;"></div>
        </div>
        </div>
      </div>
    `,
    className: "bg-transparent border-none",
    iconSize: [hitWidth, hitHeight],
    iconAnchor: [Math.round(hitWidth / 2), Math.round(hitHeight / 2)],
    popupAnchor: isHorizontalPill ? [0, -10] : [0, -18],
  });
}

// =========================
// Types
// =========================
export type Station = {
  name: string;
  position: [number, number];
  staffed?: boolean;
  barriers?: boolean;
  vline?: boolean;
  metro?: boolean;
  zone?: string;
};

type BoardingZoneKey = "front" | "middle" | "rear";

type StationBoardingGuide = {
  summary: string;
  interchange: string;
  boardingZones: Array<{
    fleet: string;
    formation: string;
    bestBoarding: BoardingZoneKey;
    note: string;
  }>;
};

const STATION_BOARDING_GUIDES: Record<string, StationBoardingGuide> = {
  "Southern Cross": {
    summary: "Best for regional interchange, XPT, coach links, and walking straight into the main concourse.",
    interchange: "Front cars usually help most for concourse exits, regional platforms, and coach transfers.",
    boardingZones: [
      { fleet: "Metro 6-car", formation: "6 cars", bestBoarding: "front", note: "Best for concourse exits and quick regional interchange." },
      { fleet: "Metro 7-car HCMT", formation: "7 cars", bestBoarding: "front", note: "Front half is still the safest all-round choice for Southern Cross exits." },
      { fleet: "V/Line", formation: "Regional", bestBoarding: "front", note: "Usually easiest for coach links, waiting room access, and concourse exits." },
    ],
  },
  "Flinders Street": {
    summary: "Best all-round CBD arrival point with strong tram, subway, and city interchange access.",
    interchange: "Middle cars are the most balanced choice for Swanston Street, Degraves subway, and city-loop style transfers.",
    boardingZones: [
      { fleet: "Metro 6-car", formation: "6 cars", bestBoarding: "middle", note: "Best for subway exits, tram changes, and platform swaps." },
      { fleet: "Metro 7-car HCMT", formation: "7 cars", bestBoarding: "middle", note: "Middle cars give the cleanest access to the core concourse and exits." },
      { fleet: "Regional / interstate", formation: "Long distance", bestBoarding: "middle", note: "A safer all-round spot if you are meeting city connections instead of exiting quickly." },
    ],
  },
  Richmond: {
    summary: "Main east-side transfer hub for Burnley, Clifton Hill, Frankston, Sandringham, and Caulfield group swaps.",
    interchange: "Middle cars minimise the walk when switching between almost every east and south-east corridor.",
    boardingZones: [
      { fleet: "Metro 6-car", formation: "6 cars", bestBoarding: "middle", note: "Best for cross-platform style changes and concourse access." },
      { fleet: "Metro 7-car HCMT", formation: "7 cars", bestBoarding: "middle", note: "The middle remains the least risky spot for busy Richmond interchanges." },
    ],
  },
  Caulfield: {
    summary: "Best transfer point between Frankston, Cranbourne, Pakenham, Route 3, Route 64, and Route 67 corridors.",
    interchange: "Middle-to-front boarding works best here because most onward movement flows toward the main interchange spine.",
    boardingZones: [
      { fleet: "Metro 6-car", formation: "6 cars", bestBoarding: "middle", note: "Strongest option for Frankston and Dandenong-side interchange movement." },
      { fleet: "Metro 7-car HCMT", formation: "7 cars", bestBoarding: "middle", note: "Middle cars stay closest to the busiest interchange paths." },
      { fleet: "Regional Gippsland", formation: "Regional", bestBoarding: "front", note: "Front side helps with concourse access and metro transfers." },
    ],
  },
  Clayton: {
    summary: "Important Monash corridor station where front-to-middle boarding tends to reduce the platform walk.",
    interchange: "Best for Monash bus interchange and Dandenong corridor changes.",
    boardingZones: [
      { fleet: "Metro 6-car", formation: "6 cars", bestBoarding: "middle", note: "Keeps you closest to the main station entrance and bus interchange." },
      { fleet: "Metro 7-car HCMT", formation: "7 cars", bestBoarding: "middle", note: "Middle section is still the safest all-round choice here." },
      { fleet: "Regional Gippsland", formation: "Regional", bestBoarding: "front", note: "Front half is generally better for exits and station transfer paths." },
    ],
  },
  "North Melbourne": {
    summary: "Useful for Craigieburn, Upfield, Sunbury, airport-coach style links, and future Arden-side interchange movement.",
    interchange: "Front third is usually best for exits and northern platform changes.",
    boardingZones: [
      { fleet: "Metro 6-car", formation: "6 cars", bestBoarding: "front", note: "Best for concourse links and northern line platform swaps." },
      { fleet: "Metro 7-car HCMT", formation: "7 cars", bestBoarding: "front", note: "Front half gives the cleaner exit for transfers." },
      { fleet: "Regional / interstate", formation: "Regional", bestBoarding: "front", note: "Best for terminal-side movement and quick exits." },
    ],
  },
  Dandenong: {
    summary: "Best transfer point for Cranbourne, Pakenham, Gippsland, buses, and south-east freight corridor viewing.",
    interchange: "Middle-to-front boarding is usually the best tradeoff for exits and platform changes.",
    boardingZones: [
      { fleet: "Metro 6-car", formation: "6 cars", bestBoarding: "middle", note: "Best for rapid interchange between metro platforms." },
      { fleet: "Metro 7-car HCMT", formation: "7 cars", bestBoarding: "middle", note: "Middle cars keep the station walk manageable." },
      { fleet: "Regional Gippsland", formation: "Regional", bestBoarding: "front", note: "Front side usually feels closest to the main station access." },
    ],
  },
};

type SurfaceStop = {
  id: string;
  name: string;
  locality: string;
  position: [number, number];
  subtitle: string;
  modes: TransportMode[];
  routeLabel: string;
  departures: SurfaceStopDeparture[];
};

type SurfaceStopDeparture = {
  route: string;
  destination: string;
  departureLabel: string;
  statusLabel: string;
  note?: string;
};

type FreightLocation = {
  name: string;
  kind: string;
  position: [number, number];
};

interface MapProps {
  journeyRoute?: Station[];
  splitCrossCityGroup?: boolean;
  transportModes?: TransportMode[];
  onTransportModesChange?: (modes: TransportMode[]) => void;
  persistedLayerState?: Partial<LayerState>;
  onLayerStateChange?: (layers: LayerState) => void;
  isAdmin?: boolean;
  isGuest?: boolean;
  isPremium?: boolean;
  premiumPaypalLink?: string | null;
  favouriteConsists?: string[];
  onToggleFavouriteConsist?: (consist: string) => void;
  showFilterRail?: boolean;
  focusedVehicleKey?: string | null;
  onFocusedVehicleHandled?: () => void;
  debugLineKey?: AdminDebugLineKey;
  mobilePerformanceMode?: MobilePerformanceMode;
}

export interface LayerState {
  merndaLine: boolean;
  hurstbridgeLine: boolean;
  cliftonHillLoop: boolean;
  frankstonLine: boolean;
  cranbourneLine: boolean;
  pakenhamLine: boolean;
  sunburyLine: boolean;
  craigieburnLine: boolean;
  upfieldLine: boolean;
  lilydaleLine: boolean;
  belgraveLine: boolean;
  alameinLine: boolean;
  glenWaverleyLine: boolean;
  northernLoop: boolean;
  burnleyLoop: boolean;
  metroTunnel: boolean;
  werribeeLine: boolean;
  sandringhamLine: boolean;
  geelongRegional: boolean;
  ballaratRegional: boolean;
  bendigoRegional: boolean;
  seymourRegional: boolean;
  traralgonRegional: boolean;
  inspectors: boolean;
  delays: boolean;
  incidents: boolean;
  heatCircles: boolean;
}

export type ServiceFilterKey =
  | "geelongRegionalGroup"
  | "ballaratRegionalGroup"
  | "bendigoRegionalGroup"
  | "seymourRegionalGroup"
  | "traralgonRegionalGroup"
  | "metroTunnelServices"
  | "crossCityPink"
  | "werribeeWilliamstownGroup"
  | "sandringhamGroup"
  | "frankstonGroup"
  | "caulfieldGroup"
  | "burnleyGroup"
  | "cliftonHillGroup"
  | "upfieldCraigieburn"
  | "upfieldCraigieburnCityLoop";

export type TransportMode = "train" | "tram" | "bus" | "vline";
export type AdminDebugLineKey =
  | "none"
  | "glenWaverleyLine"
  | "bairnsdaleLine"
  | "cliftonHillLoop"
  | "northernLoop"
  | "caulfieldLoop";

export const ADMIN_DEBUG_LINE_OPTIONS: Array<{ key: AdminDebugLineKey; label: string }> = [
  { key: "none", label: "Off" },
  { key: "glenWaverleyLine", label: "Glen Waverley Line" },
  { key: "bairnsdaleLine", label: "Bairnsdale Line" },
  { key: "cliftonHillLoop", label: "Clifton Hill Loop" },
  { key: "northernLoop", label: "Northern Loop" },
  { key: "caulfieldLoop", label: "Caulfield Loop" },
];

type SurfaceRouteFilter = {
  key: string;
  mode: Extract<TransportMode, "tram" | "bus">;
  route: string;
  label: string;
  description?: string;
  tone: string;
};

function areLayerStatesEqual(
  left?: Partial<LayerState> | null,
  right?: Partial<LayerState> | null,
) {
  const leftEntries = Object.entries(left ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const rightEntries = Object.entries(right ?? {}).sort(([a], [b]) => a.localeCompare(b));

  if (leftEntries.length !== rightEntries.length) return false;

  return leftEntries.every(([key, value], index) => {
    const [otherKey, otherValue] = rightEntries[index] ?? [];
    return key === otherKey && value === otherValue;
  });
}

function getLiveLineColor(line: string): string {
  const colorMap: Record<string, string> = {
    frankston: "#22c55e",
    mernda: "#BE1014",
    hurstbridge: "#BE1014",
    craigieburn: "#FFD200",
    upfield: "#FFD200",
    lilydale: "#003A8F",
    belgrave: "#003A8F",
    "glen waverley": "#003A8F",
    glenwaverley: "#003A8F",
    alamein: "#003A8F",
    sandringham: "#F178AF",
    werribee: "#F178AF",
    williamstown: "#F178AF",
    altona: "#F178AF",
    sunbury: "#279FD5",
    cranbourne: "#279FD5",
    pakenham: "#279FD5",
    "v/line": "#7c3aed",
    vline: "#7c3aed",
    traralgon: "#7c3aed",
    bairnsdale: "#7c3aed",
    ballarat: "#7c3aed",
    bendigo: "#7c3aed",
    echuca: "#7c3aed",
    geelong: "#7c3aed",
    "waurn ponds": "#7c3aed",
    wendouree: "#7c3aed",
    seymour: "#7c3aed",
    shepparton: "#7c3aed",
    warrnambool: "#7c3aed",
    maryborough: "#7c3aed",
    ararat: "#7c3aed",
      "swan hill": "#7c3aed",
      albury: "#7c3aed",
      "nsw trainlink": "#d9480f",
      "nsw trainlink xpt": "#d9480f",
      "nsw trainlink xplorer": "#b45309",
      xpt: "#d9480f",
      xplorer: "#b45309",
    };

  return colorMap[line.toLowerCase()] ?? "#3b82f6";
}

function getDirectionArrow(direction: LiveTrain["direction"]) {
  switch (direction) {
    case "up":
    case "city-bound":
      return "⬆";
    case "down":
    case "outbound":
      return "⬇";
    default:
      return "•";
  }
}

function getMarkerServiceCode(line: string) {
  const normalized = line.trim().toLowerCase();

  switch (normalized) {
    case "flinders street":
    case "flinders st":
    case "flinders":
      return "FSS";
    case "town hall":
      return "THL";
    case "state library":
      return "STL";
    case "lilydale":
      return "LIL";
    case "belgrave":
      return "BEL";
    case "glen waverley":
      return "GWY";
    case "alamein":
      return "ALA";
    case "mernda":
      return "MER";
    case "hurstbridge":
      return "HBE";
    case "frankston":
      return "FKN";
    case "sandringham":
      return "SDM";
    case "williamstown":
      return "WIL";
    case "werribee":
      return "WER";
    case "sunbury":
      return "SUN";
    case "cranbourne":
      return "CRA";
    case "pakenham":
      return "PAK";
    case "craigieburn":
      return "CBN";
    case "upfield":
      return "UPF";
    case "metro tunnel":
      return "MTL";
    case "v/line":
      return "VLI";
    case "traralgon":
      return "TRA";
    case "ballarat":
      return "BAL";
    case "bendigo":
      return "BEN";
    case "echuca":
      return "ECH";
    case "geelong":
      return "GEL";
    case "waurn ponds":
      return "WPN";
    case "wendouree":
      return "WND";
    default:
      return line.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "SRV";
  }
}

function getMarkerServiceTime(timestamp?: string) {
  if (!timestamp) {
    return "--:--";
  }

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return "--:--";
  }

  return parsed.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getPublicServiceReference(destination: string, etaLabel?: string) {
  return `${etaLabel || "--:--"} ${getMarkerServiceCode(destination)} Service`;
}

function getTrainLabelPriority(vehicle: LiveTrain) {
    if (isVlineLiveTrain(vehicle)) {
      return "high";
    }
  
    const normalizedLine = vehicle.line.trim().toLowerCase();
    if (
      normalizedLine === "metro tunnel" ||
      normalizedLine === "v/line" ||
      normalizedLine === "traralgon" ||
      normalizedLine === "nsw trainlink" ||
      normalizedLine === "nsw trainlink xpt" ||
      normalizedLine === "nsw trainlink xplorer"
    ) {
      return "high";
    }

  return "normal";
}

function createLiveTrainIcon(
  vehicle: LiveTrain,
  options?: {
    expanded?: boolean;
    selected?: boolean;
    dimmed?: boolean;
    hideSecondaryLabel?: boolean;
  },
) {
  const color = getLiveLineColor(vehicle.line);
  const arrow = "▲";
  const rotation =
    typeof vehicle.heading === "number" && Number.isFinite(vehicle.heading)
      ? vehicle.heading
      : vehicle.direction === "up" || vehicle.direction === "city-bound"
        ? 0
        : vehicle.direction === "down" || vehicle.direction === "outbound"
          ? 180
          : 0;
  const isTrackedConsist = vehicle.consist === "430M";
  const isExpanded = options?.expanded ?? false;
  const isSelected = options?.selected ?? false;
  const isDimmed = options?.dimmed ?? false;
  const hideSecondaryLabel = options?.hideSecondaryLabel ?? false;
  const outerSize = isTrackedConsist ? 70 : isSelected ? 62 : 50;
  const innerSize = isTrackedConsist ? 34 : isSelected ? 30 : 24;
  const markerOpacity = isDimmed ? 0.72 : 1;
  const labelOpacity = isDimmed ? 0.5 : isSelected ? 1 : 0.92;
  const destinationLabel = vehicle.destination
    .replace(/\bStreet\b/gi, "St")
    .replace(/\bStation\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18);
  const badgePrimaryLabel = isVlineLiveTrain(vehicle)
    ? (isExpanded ? `${getMarkerServiceTime(vehicle.timestamp)} ${destinationLabel}` : destinationLabel)
    : isExpanded
      ? `${getMarkerServiceTime(vehicle.timestamp)} ${getMarkerServiceCode(vehicle.line)} Service`
      : `${getMarkerServiceTime(vehicle.timestamp)} ${getMarkerServiceCode(vehicle.line)}`;
  const badgeSecondaryLabel = `TDN ${vehicle.tdn}`;

  return L.divIcon({
    html: `
      <div style="position:relative;width:${outerSize}px;height:${outerSize}px;display:flex;align-items:center;justify-content:center;opacity:${markerOpacity};">
        <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:${isSelected ? "0.34" : isTrackedConsist ? "0.28" : "0.18"};animation:ping 2s infinite;"></div>
        ${
          isTrackedConsist
            ? `<div style="position:absolute;inset:8px;border-radius:9999px;border:1px solid rgba(255,255,255,0.22);"></div>`
            : ""
        }

        <div style="
          width:${innerSize}px;
          height:${innerSize}px;
          border-radius:9999px;
          background:${color};
          border:${isTrackedConsist || isSelected ? "3px" : "2px"} solid white;
          box-shadow:${isTrackedConsist || isSelected ? "0 10px 26px rgba(0,0,0,0.78)" : "0 4px 14px rgba(0,0,0,0.58)"};
          display:flex;
          align-items:center;
          justify-content:center;
          color:white;
          font-size:${isTrackedConsist ? "16px" : isSelected ? "14px" : "12px"};
          font-weight:700;
          transform: rotate(${rotation}deg);
        ">
          ${arrow}
        </div>

        <div style="
          position:absolute;
          top:${isTrackedConsist ? "-18px" : isExpanded ? "-16px" : "-14px"};
          left:50%;
          transform:translateX(-50%);
          background:linear-gradient(180deg, rgba(15,23,42,0.98), rgba(30,41,59,0.95));
          color:white;
          font-size:${isTrackedConsist ? "10px" : isExpanded ? "9px" : "8px"};
          font-weight:700;
          padding:${isTrackedConsist ? "5px 8px" : isExpanded ? "4px 7px" : "3px 6px"};
          border-radius:10px;
          border:1px solid ${isSelected ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.14)"};
          box-shadow:${isSelected ? "0 12px 30px rgba(0,0,0,0.52)" : "0 8px 20px rgba(0,0,0,0.38)"};
          white-space:normal;
          min-width:${isTrackedConsist ? "138px" : isExpanded ? "122px" : "76px"};
          max-width:${isTrackedConsist ? "150px" : isExpanded ? "136px" : "92px"};
          text-align:center;
          line-height:1.12;
          backdrop-filter: blur(10px);
          opacity:${labelOpacity};
        ">
          <div style="font-size:${isTrackedConsist ? "9px" : isExpanded ? "8px" : "7px"};font-weight:800;letter-spacing:${isExpanded ? "0.03em" : "0.08em"};text-transform:uppercase;">
            ${badgePrimaryLabel}
          </div>
          ${isExpanded && !hideSecondaryLabel
            ? `<div style="margin-top:3px;font-size:${isTrackedConsist ? "8px" : "7px"};font-weight:700;opacity:0.78;letter-spacing:0.08em;text-transform:uppercase;">${badgeSecondaryLabel}</div>`
            : ""}
        </div>
        ${hideSecondaryLabel
          ? ""
          : `<div style="
              position:absolute;
              left:50%;
              bottom:${isTrackedConsist ? "-23px" : "-21px"};
              transform:translateX(-50%);
              background:rgba(15,23,42,0.95);
              color:white;
              font-size:${isTrackedConsist ? "10px" : "9px"};
              font-weight:700;
              padding:${isTrackedConsist ? "4px 9px" : isExpanded ? "3px 8px" : "2px 7px"};
              border-radius:9999px;
              border:1px solid ${isSelected ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.12)"};
              box-shadow:${isSelected ? "0 10px 24px rgba(0,0,0,0.42)" : "0 6px 14px rgba(0,0,0,0.3)"};
              white-space:nowrap;
              max-width:${isExpanded ? "132px" : "112px"};
              overflow:hidden;
              text-overflow:ellipsis;
              backdrop-filter: blur(8px);
              opacity:${labelOpacity};
            ">
              ${destinationLabel}
            </div>`}
      </div>
    `,
    className: "bg-transparent border-none",
    iconSize: [outerSize, outerSize],
    iconAnchor: [outerSize / 2, outerSize / 2],
    popupAnchor: [0, -22],
  });
}

function createLiveBusIcon(bus: LiveBus) {
  const routeLabel = bus.route.slice(0, 6);
  const destinationLabel = (bus.destination ?? "Live bus")
    .replace(/^route\s+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18);
  const rotation = typeof bus.heading === "number" && Number.isFinite(bus.heading) ? bus.heading : 0;

  return L.divIcon({
    html: `
      <div style="position:relative;width:56px;height:56px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;border-radius:50%;background:#f97316;opacity:0.2;animation:ping 2.2s infinite;"></div>
        <div style="
          width:28px;
          height:28px;
          border-radius:9999px;
          background:#f97316;
          border:2px solid white;
          box-shadow:0 4px 14px rgba(0,0,0,0.55);
          display:flex;
          align-items:center;
          justify-content:center;
          transform:rotate(${rotation}deg);
        ">
          <img src="${smartbusIcon}" alt="" style="width:14px;height:14px;object-fit:contain;filter:brightness(0) invert(1);" />
        </div>
        <div style="
          position:absolute;
          top:-8px;
          left:50%;
          transform:translateX(-50%);
          background:#0f172a;
          color:white;
          font-size:9px;
          font-weight:700;
          padding:2px 6px;
          border-radius:6px;
          border:1px solid rgba(255,255,255,0.15);
          box-shadow:0 4px 10px rgba(0,0,0,0.4);
          white-space:nowrap;
        ">
          ${routeLabel}
        </div>
        <div style="
          position:absolute;
          left:50%;
          bottom:-16px;
          transform:translateX(-50%);
          background:rgba(15,23,42,0.92);
          color:white;
          font-size:9px;
          font-weight:700;
          padding:2px 6px;
          border-radius:9999px;
          border:1px solid rgba(255,255,255,0.14);
          box-shadow:0 4px 10px rgba(0,0,0,0.35);
          white-space:nowrap;
          max-width:120px;
          overflow:hidden;
          text-overflow:ellipsis;
        ">
          ${destinationLabel}
        </div>
      </div>
    `,
    className: "bg-transparent border-none",
    iconSize: [56, 56],
    iconAnchor: [28, 28],
    popupAnchor: [0, -22],
  });
}

// =========================
// Constants
// =========================
const TRANSPORT_EMOJI: Record<string, string> = {
  tram: "🚃",
  train: "🚆",
  bus: "🚌",
  stop: "🚏",
};

const REPORT_COLOR: Record<string, string> = {
  inspector: "#e11d48",
  delay: "#f59e0b",
  incident: "#3b82f6",
};

const REPORT_LABEL: Record<string, string> = {
  inspector: "Inspector",
  delay: "Delay",
  incident: "Incident",
};

const DIRECTION_LABEL: Record<string, string> = {
  city_bound: "City Bound 🏙️",
  outbound: "Outbound 🏠",
  unknown: "",
};

export const SERVICE_FILTERS: Array<{
  key: ServiceFilterKey;
  category: "regional" | "metro" | "special";
  label: string;
  description?: string;
  tone: string;
}> = [
  {
    key: "metroTunnelServices",
    category: "special",
    label: "Pakenham, Cranbourne and Sunbury",
    description: "Metro Tunnel services",
    tone: "bg-[#279FD5]/15 border-[#279FD5]/40 text-[#b8e7fb]",
  },
  {
    key: "geelongRegionalGroup",
    category: "regional",
    label: "Geelong Line - Warrnambool",
    description: "Geelong, Waurn Ponds, Warrnambool corridor",
    tone: "bg-purple-500/15 border-purple-400/30 text-purple-200",
  },
  {
    key: "ballaratRegionalGroup",
    category: "regional",
    label: "Ballarat Line - Ararat, Maryborough",
    description: "Ballarat regional corridor",
    tone: "bg-purple-500/15 border-purple-400/30 text-purple-200",
  },
  {
    key: "bendigoRegionalGroup",
    category: "regional",
    label: "Bendigo Line - Swan Hill, Echuca",
    description: "Bendigo regional corridor",
    tone: "bg-purple-500/15 border-purple-400/30 text-purple-200",
  },
  {
    key: "seymourRegionalGroup",
    category: "regional",
    label: "Seymour Line - Shepparton, Albury",
    description: "Seymour regional corridor",
    tone: "bg-purple-500/15 border-purple-400/30 text-purple-200",
  },
  {
    key: "traralgonRegionalGroup",
    category: "regional",
    label: "Tralgon line - Bairnsdale",
    description: "Gippsland regional corridor",
    tone: "bg-purple-500/15 border-purple-400/30 text-purple-200",
  },
  {
    key: "crossCityPink",
    category: "metro",
    label: "Bayside / Cross City",
    description: "Werribee, Williamstown, Sandringham",
    tone: "bg-pink-500/15 border-pink-400/30 text-pink-200",
  },
  {
    key: "werribeeWilliamstownGroup",
    category: "metro",
    label: "Werribee / Williamstown",
    description: "Werribee, Laverton, Williamstown",
    tone: "bg-pink-500/15 border-pink-400/30 text-pink-200",
  },
  {
    key: "sandringhamGroup",
    category: "metro",
    label: "Sandringham",
    description: "Sandringham line",
    tone: "bg-pink-500/15 border-pink-400/30 text-pink-200",
  },
  {
    key: "burnleyGroup",
    category: "metro",
    label: "Belgrave, Lilydale, Glen Waverley, Alamein",
    description: "Burnley group",
    tone: "bg-blue-500/15 border-blue-400/30 text-blue-200",
  },
  {
    key: "cliftonHillGroup",
    category: "metro",
    label: "Mernda and Hurstbridge Lines",
    description: "Clifton Hill group",
    tone: "bg-[#BE1014]/15 border-[#BE1014]/40 text-[#f6b1b3]",
  },
  {
    key: "caulfieldGroup",
    category: "metro",
    label: "Frankston",
    description: "Frankston line",
    tone: "bg-emerald-500/15 border-emerald-400/30 text-emerald-200",
  },
  {
    key: "upfieldCraigieburn",
    category: "metro",
    label: "Upfield / Craigieburn",
    description: "Upfield, Craigieburn",
    tone: "bg-yellow-500/15 border-yellow-400/30 text-yellow-200",
  },
  {
    key: "upfieldCraigieburnCityLoop",
    category: "metro",
    label: "Via City Loop",
    tone: "bg-slate-400/15 border-slate-300/30 text-slate-100",
  },
];

const SURFACE_ROUTE_FILTERS: SurfaceRouteFilter[] = [
  {
    key: "tram:1",
    mode: "tram",
    route: "1",
    label: "Tram 1",
    description: "East Coburg - South Melbourne Beach",
    tone: "bg-[#84cc16]/15 border-[#84cc16]/40 text-[#d9f99d]",
  },
  {
    key: "tram:3",
    mode: "tram",
    route: "3",
    label: "Tram 3",
    description: "Melbourne University - East Malvern",
    tone: "bg-[#7dd3fc]/15 border-[#7dd3fc]/40 text-[#d7f3ff]",
  },
  {
    key: "tram:5",
    mode: "tram",
    route: "5",
    label: "Tram 5",
    description: "Melbourne University - Malvern",
    tone: "bg-red-500/15 border-red-400/40 text-red-200",
  },
  {
    key: "tram:6",
    mode: "tram",
    route: "6",
    label: "Tram 6",
    description: "Moreland - Glen Iris",
    tone: "bg-[#166534]/15 border-[#166534]/40 text-[#bbf7d0]",
  },
  {
    key: "tram:11",
    mode: "tram",
    route: "11",
    label: "Tram 11",
    description: "West Preston - Docklands",
    tone: "bg-[#0f766e]/15 border-[#0f766e]/40 text-[#99f6e4]",
  },
  {
    key: "tram:16",
    mode: "tram",
    route: "16",
    label: "Tram 16",
    description: "Melbourne University - Kew",
    tone: "bg-[#d4a017]/15 border-[#d4a017]/40 text-[#fde68a]",
  },
  {
    key: "tram:64",
    mode: "tram",
    route: "64",
    label: "Tram 64",
    description: "Melbourne University - East Brighton",
    tone: "bg-[#38bdf8]/15 border-[#38bdf8]/40 text-[#dbeafe]",
  },
  {
    key: "tram:67",
    mode: "tram",
    route: "67",
    label: "Tram 67",
    description: "Melbourne University - Carnegie",
    tone: "bg-[#8b5e3c]/15 border-[#8b5e3c]/40 text-[#e7d3c6]",
  },
  {
    key: "tram:96",
    mode: "tram",
    route: "96",
    label: "Tram 96",
    description: "East Brunswick - St Kilda Beach",
    tone: "bg-[#d946ef]/15 border-[#d946ef]/40 text-[#f5d0fe]",
  },
  {
    key: "bus:630",
    mode: "bus",
    route: "630",
    label: "Bus 630",
    description: "Monash University - Elwood",
    tone: "bg-orange-500/15 border-orange-400/40 text-orange-200",
  },
];

// =========================
// Station Data
// =========================
const MERNDA_STATIONS: Station[] = [
  { name: "Flinders Street", position: [-37.8184161, 144.9664779] },
  { name: "Jolimont", position: [-37.816492790989656, 144.983959764190870] },
  { name: "West Richmond", position: [-37.814925027573054, 144.991454748502189] },
  { name: "North Richmond", position: [-37.8103479913108, 144.99248203456145] },
  { name: "Collingwood", position: [-37.80446558539445, 144.99373364780257] },
  { name: "Victoria Park", position: [-37.79910783339788, 144.9944465452046] },
  { name: "Clifton Hill", position: [-37.78831003762462, 144.9955664605472] },
  { name: "Rushall", position: [-37.78282063669237, 144.99170449547316] },
  { name: "Merri", position: [-37.777750539846984, 144.9930158084578] },
  { name: "Northcote", position: [-37.76992048990079, 144.99530821413396] },
  { name: "Croxton", position: [-37.76411084888179, 144.99711065861806] },
  { name: "Thornbury", position: [-37.75506489378074, 144.99849818692718] },
  { name: "Bell", position: [-37.745589224974715, 145.00035427556313] },
  { name: "Preston", position: [-37.73875587823244, 145.00073179107602] },
  { name: "Regent", position: [-37.72833894198504, 145.00280413393259] },
  { name: "Reservoir", position: [-37.71684669179448, 145.0068228311183] },
  { name: "Ruthven", position: [-37.70788599148591, 145.00942830349587] },
  { name: "Keon Park", position: [-37.69472251099498, 145.01181442718885] },
  { name: "Thomastown", position: [-37.68021126137258, 145.01421277845355] },
  { name: "Lalor", position: [-37.66589866750707, 145.01723865896338] },
  { name: "Epping", position: [-37.652168089301284, 145.03102996205098] },
  { name: "South Morang", position: [-37.64891049184418, 145.06792353651812] },
  { name: "Middle Gorge", position: [-37.64387601247085, 145.09247381096623] },
  { name: "Hawkstowe", position: [-37.62273956095706, 145.0973495770265] },
  { name: "Mernda", position: [-37.60268052005695, 145.10077971801257] },
];

const HURSTBRIDGE_STATIONS: Station[] = [
  { name: "Westgarth", position: [-37.780435356377716, 144.99914123026358] },
  { name: "Dennis", position: [-37.779172853272264, 145.00829366121818] },
  { name: "Fairfield", position: [-37.779149281616895, 145.0169411256442] },
  { name: "Alphington", position: [-37.77831232032454, 145.03110400902273] },
  { name: "Darebin", position: [-37.77471056691468, 145.03864348039912] },
  { name: "Ivanhoe", position: [-37.76889144629401, 145.04539541149356] },
  { name: "Eaglemont", position: [-37.763774817116406, 145.05361850109273] },
  { name: "Heidelberg", position: [-37.75712552748012, 145.06075329719897] },
  { name: "Rosanna", position: [-37.742727897658824, 145.06624322896707] },
  { name: "Macleod", position: [-37.725937461490375, 145.06921622194628] },
  { name: "Watsonia", position: [-37.710982647475866, 145.0837557852137] },
  { name: "Greensborough", position: [-37.70381979075029, 145.10791799219962] },
  { name: "Montmorency", position: [-37.71524351441112, 145.1209352506941] },
  { name: "Eltham", position: [-37.71344678805767, 145.1478333806195] },
  { name: "Diamond Creek", position: [-37.67339874337512, 145.15845112766686] },
  { name: "Wattle Glen", position: [-37.66398633478114, 145.18168038197572] },
  { name: "Hurstbridge", position: [-37.63940767064736, 145.19213890280744] },
];

const CLIFTONHILLGROUPLOOP_STATIONS: Station[] = [
  { name: "Jolimont", position: [-37.816492790989656, 144.983959764190870] },
  { name: "Flinders Street", position: [-37.8184161, 144.9664779] },
  { name: "Southern Cross", position: [-37.8176, 144.9522] },
  { name: "Flagstaff", position: [-37.81196029877101, 144.9566610145156] },
  { name: "Melbourne Central", position: [-37.8101, 144.9626] },
  { name: "Parliament", position: [-37.81123787494798, 144.97303582934072] },
  { name: "Jolimont", position: [-37.816492790989656, 144.983959764190870] },
];
const FRANKSTON_STATIONS: Station[] = [
  { name: "Frankston", position: [-38.1426676, 145.1262003] },
  { name: "Kananook", position: [-38.121688, 145.1354187] },
  { name: "Seaford", position: [-38.1040134, 145.1282259] },
  { name: "Carrum", position: [-38.0774817, 145.1230629] },
  { name: "Bonbeach", position: [-38.065449, 145.120108] },
  { name: "Chelsea", position: [-38.0532764, 145.1166366] },
  { name: "Edithvale", position: [-38.0365046, 145.1075721] },
  { name: "Aspendale", position: [-38.0272365, 145.1021263] },
  { name: "Mordialloc", position: [-38.0067174, 145.0875658] },
  { name: "Parkdale", position: [-37.9924751, 145.0755901] },
  { name: "Mentone", position: [-37.9835507, 145.066334] },
  { name: "Cheltenham", position: [-37.9670081, 145.0546951] },
  { name: "Southland", position: [-37.9584027, 145.0488064] },
  { name: "Highett", position: [-37.9484438, 145.04188] },
  { name: "Moorabbin", position: [-37.9343919, 145.0368952] },
  { name: "Patterson", position: [-37.9251159, 145.0354959] },
  { name: "Bentleigh", position: [-37.9175354, 145.0369346] },
  { name: "McKinnon", position: [-37.9114018, 145.0381036] },
  { name: "Ormond", position: [-37.9042587, 145.0394811] },
  { name: "Glen Huntly", position: [-37.8893136, 145.042285] },
  { name: "Caulfield", position: [-37.8773212, 145.0423811] },
  { name: "Malvern", position: [-37.8663425, 145.029464] },
  { name: "Armadale", position: [-37.8562948, 145.0192436] },
  { name: "Toorak", position: [-37.8506631, 145.0136792] },
  { name: "Hawksburn", position: [-37.8446738, 145.0019694] },
  { name: "South Yarra", position: [-37.8381009, 144.99237] },
  { name: "Richmond", position: [-37.82359625345165, 144.9891977969667] },
];
const CRAIGIEBURN_STATIONS: Station[] = [
  { name: "Craigieburn", position: [-37.6020, 144.9437] },
  { name: "Roxburgh Park", position: [-37.6258, 144.9308] },
  { name: "Coolaroo", position: [-37.6493, 144.9270] },
  { name: "Broadmeadows", position: [-37.6800, 144.9198] },
  { name: "Jacana", position: [-37.6884, 144.9078] },
  { name: "Glenroy", position: [-37.7089, 144.9190] },
  { name: "Oak Park", position: [-37.7184, 144.9198] },
  { name: "Pascoe Vale", position: [-37.7305, 144.9280] },
  { name: "Strathmore", position: [-37.7428, 144.9200] },
  { name: "Essendon", position: [-37.7560, 144.9162] },
  { name: "Moonee Ponds", position: [-37.7668, 144.9240] },
  { name: "Ascot Vale", position: [-37.7753, 144.9220] },
  { name: "Newmarket", position: [-37.7872, 144.9288] },
  { name: "Kensington", position: [-37.7947, 144.9306] },
  { name: "North Melbourne", position: [-37.8073, 144.9426] },
];
const CRAIGIEBURN_LINE_STATION_NAMES = new Set(CRAIGIEBURN_STATIONS.map((station) => station.name));

const UPFIELD_STATIONS: Station[] = [
  { name: "Upfield", position: [-37.66596335944676, 144.9467666568411] },
  { name: "Gowrie", position: [-37.700488788558154, 144.9587638475899] },
  { name: "Fawkner", position: [-37.714619680600784, 144.96043443278583] },
  { name: "Merlynston", position: [-37.720838587789075, 144.96132813911086] },
  { name: "Batman", position: [-37.733495074613145, 144.9628250960023] },
  { name: "Coburg", position: [-37.7424037808555, 144.96335891081486] },
  { name: "Moreland", position: [-37.75444459188999, 144.9620055682174] },
  { name: "Anstey", position: [-37.76069196371862, 144.96087713383022] },
  { name: "Brunswick", position: [-37.76758492900192, 144.9596657557033] },
  { name: "Jewell", position: [-37.77484767387166, 144.95885347284442] },
  { name: "Royal Park", position: [-37.781197766101826, 144.95165987191965] },
  { name: "Flemington Bridge", position: [-37.788102966652666, 144.93926769062355] },
  { name: "Macaulay", position: [-37.79496835285672, 144.9361473868707] },
  { name: "North Melbourne", position: [-37.80632077425195, 144.94148671559594] },
];
const LILYDALE_STATIONS: Station[] = [
  { name: "Richmond", position: [-37.82359625345165, 144.9891977969667] },
  { name: "East Richmond", position: [-37.8260, 145.0007] },
  { name: "Burnley", position: [-37.8270, 145.0074] },
  { name: "Hawthorn", position: [-37.8226, 145.0226] },
  { name: "Glenferrie", position: [-37.8210, 145.0368] },
  { name: "Auburn", position: [-37.8201, 145.0457] },
  { name: "Camberwell", position: [-37.8260, 145.0587] },
  { name: "East Camberwell", position: [-37.8268, 145.0697] },
  { name: "Canterbury", position: [-37.8249, 145.0812] },
  { name: "Chatham", position: [-37.8243, 145.1030] },
  { name: "Union", position: [-37.8184, 145.1106] },
  { name: "Box Hill", position: [-37.8189, 145.1254] },
  { name: "Laburnum", position: [-37.8209, 145.1400] },
  { name: "Blackburn", position: [-37.8200, 145.1509] },
  { name: "Nunawading", position: [-37.8204, 145.1738] },
  { name: "Mitcham", position: [-37.8230, 145.1888] },
  { name: "Heatherdale", position: [-37.8184, 145.2130] },
  { name: "Ringwood", position: [-37.8158, 145.2289] },
  { name: "Croydon", position: [-37.7951, 145.2817] },
  { name: "Mooroolbark", position: [-37.7848, 145.3126] },
  { name: "Lilydale", position: [-37.7578, 145.3451] },
];

const BELGRAVE_STATIONS: Station[] = [
  { name: "Richmond", position: [-37.82359625345165, 144.9891977969667] },
  { name: "East Richmond", position: [-37.8260, 145.0007] },
  { name: "Burnley", position: [-37.8270, 145.0074] },
  { name: "Hawthorn", position: [-37.8226, 145.0226] },
  { name: "Glenferrie", position: [-37.8210, 145.0368] },
  { name: "Auburn", position: [-37.8201, 145.0457] },
  { name: "Camberwell", position: [-37.8260, 145.0587] },
  { name: "East Camberwell", position: [-37.8268, 145.0697] },
  { name: "Canterbury", position: [-37.8249, 145.0812] },
  { name: "Chatham", position: [-37.8243, 145.1030] },
  { name: "Union", position: [-37.8184, 145.1106] },
  { name: "Box Hill", position: [-37.8189, 145.1254] },
  { name: "Laburnum", position: [-37.8209, 145.1400] },
  { name: "Blackburn", position: [-37.8200, 145.1509] },
  { name: "Nunawading", position: [-37.8204, 145.1738] },
  { name: "Mitcham", position: [-37.8230, 145.1888] },
  { name: "Heatherdale", position: [-37.8184, 145.2130] },
  { name: "Ringwood", position: [-37.8158, 145.2289] },
  { name: "Heathmont", position: [-37.8290, 145.2446] },
  { name: "Bayswater", position: [-37.8415, 145.2682] },
  { name: "Boronia", position: [-37.8600, 145.2847] },
  { name: "Ferntree Gully", position: [-37.8858, 145.2953] },
  { name: "Upper Ferntree Gully", position: [-37.8927, 145.3095] },
  { name: "Upwey", position: [-37.9035, 145.3303] },
  { name: "Tecoma", position: [-37.9082, 145.3446] },
  { name: "Belgrave", position: [-37.9109, 145.3536] },
];

const ALAMEIN_STATIONS: Station[] = [
  { name: "Camberwell", position: [-37.8260, 145.0587] },
  { name: "Riversdale", position: [-37.8316, 145.0706] },
  { name: "Willison", position: [-37.8355, 145.0817] },
  { name: "Hartwell", position: [-37.8433, 145.0849] },
  { name: "Burwood", position: [-37.8501, 145.0888] },
  { name: "Ashburton", position: [-37.8620, 145.0818] },
  { name: "Alamein", position: [-37.8672, 145.0797] },
];

const GLEN_WAVERLEY_STATIONS: Station[] = [
  { name: "Richmond", position: [-37.82359625345165, 144.9891977969667] },
  { name: "East Richmond", position: [-37.82632740224405, 144.9972673053531] },
  { name: "Burnley", position: [-37.82767802049741, 145.00771393724537] },
  { name: "Heyington", position: [-37.83472931277994, 145.02262594154345] },
  { name: "Kooyong", position: [-37.83975647035526, 145.032989610259] },
  { name: "Tooronga", position: [-37.84933641308045, 145.04169596793076] },
  { name: "Gardiner", position: [-37.85319254950284, 145.0519567538175] },
  { name: "Glen Iris", position: [-37.85924791323599, 145.05815226608306] },
  { name: "Darling", position: [-37.868960963389696, 145.0628898525902] },
  { name: "East Malvern", position: [-37.876943166140485, 145.06928548142633] },
  { name: "Holmesglen", position: [-37.874467434174626, 145.0901950084133] },
  { name: "Jordanville", position: [-37.8736209099283, 145.11208946608417] },
  { name: "Mount Waverley", position: [-37.875253140075536, 145.1277433710727] },
  { name: "Syndal", position: [-37.876238755103856, 145.14971636451426] },
  { name: "Glen Waverley", position: [-37.87945446561707, 145.16198233013415] },
];
const GLEN_WAVERLEY_TRACK_POINTS: [number, number][] = [
  [-37.82359625345165, 144.9891977969667], // Richmond
  [-37.82632740224405, 144.9972673053531], // East Richmond
  [-37.82767802049741, 145.00771393724537], // Burnley
  [-37.829413, 145.011806], // curve out of Burnley
  [-37.831682, 145.016412],
  [-37.83472931277994, 145.02262594154345], // Heyington
  [-37.837386, 145.028241],
  [-37.83975647035526, 145.032989610259], // Kooyong
  [-37.843821, 145.036854],
  [-37.846884, 145.039581],
  [-37.84933641308045, 145.04169596793076], // Tooronga
  [-37.851602, 145.046948],
  [-37.85319254950284, 145.0519567538175], // Gardiner
  [-37.856214, 145.055384],
  [-37.85924791323599, 145.05815226608306], // Glen Iris
  [-37.864376, 145.060731],
  [-37.868960963389696, 145.0628898525902], // Darling
  [-37.872912, 145.066022],
  [-37.876943166140485, 145.06928548142633], // East Malvern
  [-37.876093, 145.076836],
  [-37.875128, 145.083944],
  [-37.874467434174626, 145.0901950084133], // Holmesglen
  [-37.874122, 145.097864],
  [-37.873827, 145.104965],
  [-37.8736209099283, 145.11208946608417], // Jordanville
  [-37.873982, 145.117684],
  [-37.874648, 145.122747],
  [-37.875253140075536, 145.1277433710727], // Mount Waverley
  [-37.875698, 145.134914],
  [-37.875969, 145.142836],
  [-37.876238755103856, 145.14971636451426], // Syndal
  [-37.876918, 145.154947],
  [-37.877945, 145.158804],
  [-37.87945446561707, 145.16198233013415], // Glen Waverley
];
const BURNLEYGROUPLOOP_STATIONS: Station[] = [
  { name: "Richmond", position: [-37.82359625345165, 144.9891977969667] },
  { name: "Flinders Street", position: [-37.8184161, 144.9664779] },
  { name: "Southern Cross", position: [-37.8176, 144.9522] },
  { name: "Flagstaff", position: [-37.81196029877101, 144.9566610145156] },
  { name: "Melbourne Central", position: [-37.8101, 144.9626] },
  { name: "Parliament", position: [-37.81123787494798, 144.97303582934072] },
  { name: "Richmond", position: [-37.82359625345165, 144.9891977969667] },
];
const JOLIMONT_TO_FLINDERS_PORTAL: [number, number][] = [
  [-37.815808751063095, 144.9778546912331],
    [-37.815624405906064, 144.9750759227291],// exiting Parliament
  [-37.815743064919, 144.97438123057663], 
  [-37.81632152482936, 144.97277458741638], // Parliament -> Jolimont curve
  [-37.81778485426324, 144.96826388056115], // Jolimont / MCG side
  [-37.8184161, 144.9664779], // Flinders Street eastern portal
];

const PAKENHAM_STATIONS: Station[] = [
  { name: "Anzac", position: [-37.83323797420302, 144.97276854232885] },
  { name: "Hawksburn", position: [-37.8446738, 145.0019694] },
  { name: "Toorak", position: [-37.8506631, 145.0136792] },
  { name: "Armadale", position: [-37.8562948, 145.0192436] },
  { name: "Malvern", position: [-37.8663425, 145.029464] },
  { name: "Caulfield", position: [-37.8770, 145.0424] },
  { name: "Carnegie", position: [-37.88584755576908, 145.0576145973216] },
  { name: "Murrumbeena", position: [-37.889800131059374, 145.06676121081267] },
  { name: "Hughesdale", position: [-37.89413917232323, 145.076200726158132] },
  { name: "Oakleigh", position: [-37.900458908475315, 145.08839984150381] },
  { name: "Huntingdale", position: [-37.91097055312629, 145.10241977630986] },
  { name: "Clayton", position: [-37.924541507360765, 145.12053998830723] },
  { name: "Westall", position: [-37.937755318504934, 145.13805369881837] },
  { name: "Springvale", position: [-37.94893771437316, 145.15307099140574] },
  { name: "Sandown Park", position: [-37.95653055647639, 145.1628965591817] },
  { name: "Noble Park", position: [-37.9571, 145.1631] },
  { name: "Yarraman", position: [-37.9633, 145.1746] },
  { name: "Dandenong", position: [-37.98991938287247, 145.20988128532633] },
  { name: "Hallam", position: [-37.9953, 145.2341] },
  { name: "Narre Warren", position: [-38.0136, 145.2595] },
  { name: "Berwick", position: [-38.0286, 145.2903] },
  { name: "Beaconsfield", position: [-38.0436, 145.3205] },
  { name: "Officer", position: [-38.0653, 145.3664] },
  { name: "Cardinia Road", position: [-38.0795, 145.3953] },
  { name: "Pakenham", position: [-38.0735, 145.4716] },
  { name: "East Pakenham", position: [-38.0821, 145.51] },
];

const CRANBOURNE_STATIONS: Station[] = [
  { name: "Dandenong", position: [-37.98991938287247, 145.20988128532633] },
  { name: "Lynbrook", position: [-38.056307584760475, 145.25319338898683] },
  { name: "Merinda Park", position: [-38.079655791047855, 145.26428718532986] },
  { name: "Cranbourne", position: [-38.099, 145.2613] },
];

const SUNBURY_STATIONS: Station[] = [
  { name: "Sunbury", position: [-37.5837, 144.717] },
  { name: "Diggers Rest", position: [-37.62621416753362, 144.71929552429663] },
  { name: "Watergardens", position: [-37.70018094198704, 144.77262172318856] },
  { name: "Keilor Plains", position: [-37.72930031255676, 144.7928135623099] },
  { name: "St. Albans", position: [-37.74478482442231, 144.79992678066148 ] },
  { name: "Ginifer", position: [-37.76011342095589, 144.81221129777228] },
  { name: "Albion", position: [-37.776690746428365, 144.82408952556068] },
  { name: "Sunshine", position: [-37.78812106172095, 144.83237218696007] },
  { name: "Tottenham", position: [-37.79906652439008, 144.86302968739224] },
  { name: "West Footscray", position: [-37.80159439768236, 144.88351876420322] },
  { name: "Middle Footscray", position: [-37.80244211892746, 144.89150101820428] },
  { name: "Footscray", position: [-37.801696124765726, 144.90150029345793] },
  { name: "South Kensington", position: [-37.79971717185788, 144.92584789732544] },
  { name: "Arden", position: [-37.80093646751718, 144.94074635061708] },
  { name: "Parkville", position: [-37.79978943619289, 144.9595131752267] },
  { name: "State Library", position: STATE_LIBRARY_POSITION },
  { name: "Town Hall", position: TOWN_HALL_POSITION },
  { name: "Anzac", position: [-37.83323797420302, 144.97276854232885] },
];

const METRO_TUNNEL_STATIONS: Station[] = [
  { name: "Arden", position: [-37.80093646751718, 144.94074635061708] },
  { name: "Parkville", position: [-37.79978943619289, 144.9595131752267] },
  { name: "State Library", position: STATE_LIBRARY_POSITION },
  { name: "Town Hall", position: TOWN_HALL_POSITION },
  { name: "Anzac", position: [-37.83323797420302, 144.97276854232885] },
];

const CAUFIELDLOOP_STATIONS: Station[] = [
  { name: "Richmond", position: [-37.82359625345165, 144.9891977969667] },
  { name: "Flinders Street", position: [-37.8184161, 144.9664779] },
  { name: "Southern Cross", position: [-37.8176, 144.9522] },
  { name: "Flagstaff", position: [-37.81196029877101, 144.9566610145156] },
  { name: "Melbourne Central", position: [-37.8101, 144.9626] },
  { name: "Parliament", position: [-37.81123787494798, 144.97303582934072] },
  { name: "Richmond", position: [-37.82359625345165, 144.9891977969667] },
];

const NORTHERNGROUPLOOP_STATIONS: Station[] = [
  { name: "North Melbourne", position: [-37.8073, 144.9426] },
  { name: "Southern Cross", position: [-37.8176, 144.9522] },
  { name: "Flinders Street", position: [-37.81840600875998, 144.96599046643283] },
  { name: "Parliament", position: [-37.81123787494798, 144.97303582934072] },
  { name: "Melbourne Central", position: [-37.8101, 144.9626] },
  { name: "Flagstaff", position: [-37.81196029877101, 144.9566610145156] },
  { name: "North Melbourne", position: [-37.8073, 144.9426] },
];

const WERRIBEE_STATIONS: Station[] = [
  { name: "Southern Cross", position: [-37.81934099941143, 144.9524609650515] },
  { name: "North Melbourne", position: [-37.8073, 144.9426] },
  { name: "South Kensington", position: [-37.79971717185788, 144.92584789732544] },
  { name: "Footscray", position: [-37.801696124765726, 144.90150029345793] },
  { name: "Seddon", position: [-37.80864624508298, 144.89540631027074] },
  { name: "Yarraville", position: [-37.8159245612344, 144.88935190525294] },
  { name: "Spotswood", position: [-37.830475560641304, 144.88574396020414] },
  { name: "Newport", position: [-37.84264314186776, 144.88355527766285] },
  { name: "Laverton", position: [-37.86374615697885, 144.7720741120282] },
  { name: "Aircraft", position: [-37.86652430453361, 144.76084104096728] },
  { name: "Williams Landing", position: [-37.87009845943303, 144.74700083780496] },
  { name: "Hoppers Crossing", position: [-37.882748919778834, 144.70113749736035] },
  { name: "Werribee", position: [-37.89950763796044, 144.66087578807574] },
];

const WILLIAMSTOWN_STATIONS: Station[] = [
  { name: "Newport", position: [-37.84269100630597, 144.88362501538808] },
  { name: "North Williamstown", position: [-37.85731316329924, 144.88884995850088] },
  { name: "Williamstown Beach", position: [-37.86405552358406, 144.89446402447876] },
  { name: "Williamstown", position: [-37.86768910119632, 144.90528941998267] },
];

const ALTONA_LOOP_STATIONS: Station[] = [
  { name: "Newport", position: [-37.84269100630597, 144.88362501538808] },
  { name: "Seaholme", position: [-37.867764659987316, 144.84120771014238] },
  { name: "Altona", position: [-37.86698148967684, 144.82999249088098] },
  { name: "Westona", position: [-37.86511016206653, 144.8135289261629] },
  { name: "Laverton", position: [-37.86374615697885, 144.7720741120282] },
];

const SANDRINGHAM_STATIONS: Station[] = [
  { name: "Flinders Street", position: [-37.8184161, 144.9664779] },
  { name: "Richmond", position: [-37.82359625345165, 144.9891977969667] },
  {
    name: "South Yarra",
    position: [-37.8381009, 144.99237],
    staffed: true,
    barriers: true,
    metro: true,
    zone: "1",
  },
  {
    name: "Prahran",
    position: [-37.8495243704257, 144.98999628587248],
    staffed: false,
    barriers: false,
    metro: true,
    zone: "1",
  },
  {
    name: "Windsor",
    position: [-37.85625063817182, 144.9918631033007],
    staffed: false,
    barriers: false,
    metro: true,
    zone: "1",
  },
  {
    name: "Balaclava",
    position: [-37.869403785294736, 144.9935489947572],
    staffed: false,
    barriers: false,
    metro: true,
    zone: "1",
  },
  {
    name: "Ripponlea",
    position: [-37.875885136161095, 144.9950077304033],
    staffed: false,
    barriers: false,
    metro: true,
    zone: "1",
  },
  {
    name: "Elsternwick",
    position: [-37.8848445043112, 145.00082275960173],
    staffed: false,
    barriers: false,
    metro: true,
    zone: "1",
  },
  {
    name: "Gardenvale",
    position: [-37.89657979680589, 145.00399849503614],
    staffed: false,
    barriers: false,
    metro: true,
    zone: "1",
  },
    {
    name: "North Brighton",
    position: [-37.90457206843572, 145.00235830164291],
    staffed: false,
    barriers: false,
    metro: true,
    zone: "1",
  },
  {
    name: "Middle Brighton",
    position: [-37.915119235574004, 144.99609266135178],
    staffed: false,
    barriers: false,
    metro: true,
    zone: "1",
  },  {
    name: "Brighton Beach",
    position: [  -37.9265958148369, 144.98914037554712],
    staffed: false,
    barriers: false,
    metro: true,
    zone: "1",
  },
  {
    name: "Hampton",
    position: [-37.9378, 145.0028],
    staffed: false,
    barriers: false,
    metro: true,
    zone: "1",
  },
  {
    name: "Sandringham",
    position: [-37.9505, 145.0058],
    staffed: true,
    barriers: false,
    metro: true,
    zone: "1",
  },
];

const GIPPSLAND_STATIONS: Station[] = [
  { name: "Southern Cross", position: [-37.8176, 144.9522], vline: true, zone: "1" },
  { name: "Flinders Street", position: [-37.8184161, 144.9664779], vline: true, zone: "1" },
  { name: "Richmond", position: [-37.82359625345165, 144.9891977969667], vline: true, zone: "1" },
  { name: "Caulfield", position: [-37.8770, 145.0424], vline: true, zone: "1" },
  { name: "Clayton", position: [-37.9247726501578, 145.12035310256484], vline: true, zone: "1" },
  { name: "Dandenong", position: [-37.98797563248677, 145.21479109451644], vline: true, zone: "2" },
  { name: "Berwick", position: [-38.031330253111215, 145.34417492481994], vline: true, zone: "2" },
  { name: "Pakenham", position: [-38.06853892399032, 145.4849690774776], vline: true, zone: "2" },
  { name: "Warragul", position: [-38.15965088085526, 145.92871651094258], vline: true },
  { name: "Moe", position: [-38.17588027961461, 146.26083329049215], vline: true },
  { name: "Morwell", position: [-38.23555857042696, 146.39640612076153], vline: true },
  { name: "Traralgon", position: [-38.19489747401578, 146.5415475189243], vline: true },
];

const BALLARAT_REGIONAL_STATIONS: Station[] = [
  { name: "Southern Cross", position: [-37.8176, 144.9522], vline: true, zone: "1" },
  { name: "Sunshine", position: [-37.791897110759385, 144.83351243198313], vline: true, zone: "1" },
  { name: "Melton", position: [-37.68490447367019, 144.58866263023615], vline: true, zone: "2" },
  { name: "Ballarat", position: [-37.55861757585211, 143.85946145441608], vline: true },
  { name: "Wendouree", position: [-37.5309, 143.8487], vline: true },
  { name: "Ararat", position: [-37.2867, 142.9479], vline: true },
  { name: "Maryborough", position: [-37.0462, 143.7397], vline: true },
];

const SEYMOUR_REGIONAL_STATIONS: Station[] = [
  { name: "Southern Cross", position: [-37.81767225337158, 144.950639128634], vline: true, zone: "1" },
  { name: "Broadmeadows", position: [-37.6805, 144.9191], vline: true, zone: "2" },
  { name: "Seymour", position: [-37.0264, 145.1337], vline: true },
];

// =========================
// Polyline Data
// =========================
const MELBOURNE_CENTRAL_TO_STATE_LIBRARY: [number, number][] = [
  [-37.8101, 144.9626],
  [-37.8117, 144.9629],
];
const CLIFTON_HILL_POSITION: [number, number] = [-37.78831003762462, 144.9955664605472];

const CAUFIELD_LOOP: [number, number][] = [
  [-37.8188437593049, 144.97790945754892],
  [-37.8181727321212, 144.9775078452675], // last point
  [-37.81768238193436, 144.9769297210735], //  richmond portal cfd 
  [-37.81746731800017, 144.97667222901444],
  [-37.81686605500994, 144.97604932173275],
  [-37.81623674589375, 144.97549946888685],
  [-37.81560107467396, 144.9750569043993],
  [-37.8146221302977, 144.9746103166069],
  [-37.8136177452875, 144.97416238769392],
  [-37.81266738107811, 144.97371982320394],
  [-37.81139915013397, 144.97313845175165], // parliment station 
  [-37.809766246687126, 144.97238334592595],
  [-37.808744134445945, 144.97188076367107],
  [-37.80814758671704, 144.97105262471715],
  [-37.808443204354354, 144.97155687999603],
  [-37.807998203978606, 144.9706362187189],
  [-37.80783501193112, 144.96928433538403], // cureve 12
  [-37.808498781192675, 144.96706891082312],
  [-37.80986347281194, 144.9624031365788], //  Melbourne Centreral Stzatiopn
  [-37.8117198114853, 144.95609063535503], // FLAGstaff station 
  [-37.813109401599526, 144.95152276827767],
  [-37.813305239346434, 144.9508467242103], // latrobe street 
  [-37.81346098414173, 144.95054430515134],
  [-37.813636329085746, 144.95028882474315],
  [-37.81405826174884, 144.94994552250395],
  [-37.81447516545205, 144.94977184946842],
  [-37.81499801340689, 144.9496933948548],
  [-37.815696727434805, 144.9497725200221],
[-37.816076011426915, 144.94990126605308], // 
[-37.81622364865211, 144.94994932059933], // Southern Cross (City Loop Western Portal)
[-37.81871545154895, 144.95187242335422], // Southern Cross 
[-37.819310838649166, 144.95234717436176], // Southern Cross Via Duct Curve 1
[-37.82012445594275, 144.95304723092087], // Southern Cross Via Duct Curve 2
[-37.82103128962857, 144.95433469121622], // Southern Cross Via Duct Curve 3
[-37.82114993994472, 144.95459218328656], // Southern Cross Via Duct Curve 4
[-37.821383002502714, 144.95569188895558], // Southern Cross Via Duct Curve 5
[-37.82139147749586, 144.95593060558758], // Southern Cross Via Duct Curve 6
[-37.821194433760674, 144.95703835790874], // Southern Cross Via Duct Curve 7
[-37.82096560812568, 144.95760430399687], // Southern Cross Via Duct Curve 8
[-37.820945852394416, 144.95783796247386], // Southern Cross Via Duct Curve 9
[-37.82063439405348, 144.95870029266104], // Southern Cross Via Duct Curve 10
[-37.8202689728552, 144.95961065802055], // Southern Cross Via Duct Curve 11
  [-37.81978957119074, 144.9609187795137], // Southern Cross Via Duct Curve 12
  [-37.81968257183936, 144.9619151979514], // Southern Cross Via Duct Curve 13
[-37.81938608424239, 144.96263273086195], // Southern Cross Via Duct Curve 14
[-37.819158312401186, 144.96355675186595], // Southern Cross Via Duct Curve 15
[-37.81896761915805, 144.96448747839776],
  [-37.81871971720591, 144.96543429817373],
  [-37.81857139939793, 144.9660082909082], // Flinders Street 
];
const BURNLEY_LOOP: [number, number][] = [...CAUFIELD_LOOP];
const JOLIMONT_TO_WEST_RICHMOND: [number, number][] = [
  [-37.816492790989656, 144.98395976419087],   // Jolimont
  [-37.816851137082246, 144.98751730791793],
  [-37.81656720697537, 144.98920441740864],
  [-37.816154014429515, 144.9900600244845],
  [-37.81533821827685, 144.99107387481638],
  [-37.814925027573054, 144.99145474850218],   // West Richmond
  [-37.81416008894346, 144.99181148230872], // end of platform W RICHMOND 
  [-37.81305398638554, 144.99203947007265], // york st 
  [-37.81178046463648, 144.9922460001681], // garfield street
  [-37.810964636334965, 144.9923747462035], // elithibith street
  [-37.8103479913108, 144.99248203456145], // north richmond statioon 
  [-37.80974617469039, 144.99256518304463],
  [-37.80833061486316, 144.9929514211424], // greensowrd st
  [-37.807406671946765, 144.99321695984267],
  [-37.80682178467832, 144.9933269304114],
  [-37.805111948572794, 144.993620995022],
  [-37.80446558539445, 144.99373364780257], // colling wood station
  [-37.803230062368854, 144.99393481347792],
  [-37.801913985082294, 144.99414670799277], // yarra st 
  [-37.801301503109485, 144.9941440257755], // studly st 
  [-37.800642390533845, 144.9941359791526],
  [-37.79929235705923, 144.99436933133384],
  [-37.79912916452965, 144.99442029330388], // victoria park station
  [-37.79766253492816, 144.9946455988675],
  [-37.795935180955574, 144.99493795964617],
  [-37.794518762887, 144.9951669011697],
  [-37.79325093503257, 144.99532107701643],
  [-37.792025822370704, 144.9950850426258],
  [-37.7911244592212, 144.99499399411127],

  [-37.79035503477694, 144.99506641375723],
  [-37.78980332038522, 144.99515805457796],
  [-37.7894196621083, 144.9952412030535], // clfinton hill arpocahc 
  [-37.788251717787986, 144.99544505093596], // clifton hill 
];
const NORTHERN_LOOP: [number, number][] = [
  [-37.8073, 144.9426], // Southern Cross (Western portal / loop entry)

  // heading north-east under La Trobe St toward Flagstaff
  [-37.81247065691958, 144.94693600775102], // approaching Flagstaff
  [-37.81332250616509, 144.95006210136958],

  [-37.81335215689385, 144.9507340157454], // Flagstaff area
[-37.813197486324185, 144.95145685001907],
  // curve east toward Melbourne Central
  [-37.81196029877101, 144.9566610145156], // Flagstaff → Melbourne Central curve
  [-37.8101, 144.9626], // Melbourne Central

  // continue east/north-east toward Parliament
  // edit JOLIMONT_TO_FLINDERS_PORTAL above if you want to shape the Parliament/Jolimont/Flinders section
  [-37.80807339740153, 144.96921480284715], // leaving Melbourne Central
  [-37.80801993633507, 144.96972437757896], // tunnel alignment
  [-37.80804748502936, 144.970295688085],
  [-37.8082191343581, 144.9709984268594],
  [-37.80873407995166, 144.97174944539097],
  [-37.81059179110248, 144.97265533855764], // approaching Parliament
  [-37.811378449431345, 144.97302812703637], // Parliament station

  // turn south toward Jolimont / Richmond portal
  [-37.8147653441898, 144.97416778728817], // exiting Parliament
  [-37.815923183065, 144.97346658889202], // Parliament → Jolimont curve
  [-37.81763600460815, 144.9681709646954], // Jolimont / MCG side
  [-37.81832010684088, 144.96587601682907], //flidners 

  // swing back west toward Flinders Street
  [-37.819578159795725, 144.9610791331353], // viaduct toward Flinders

  // continue west back toward Southern Cross
  [-37.82100744345243, 144.95730565300772],
  [-37.82104875922244, 144.9572225045253],
  [-37.82109536715535, 144.95707701757522], // Flinders → Southern Cross curve
  [-37.82105330977752, 144.95720748873785],
   [-37.8212923531196, 144.95643129110326],
 [-37.821328429885675, 144.95581637936937],
  [-37.8211906937223, 144.95500906362312], // viaduct mid-section
   [-37.82098307302916, 144.95440017298998],
   [-37.820287292816374, 144.95337319911047],
   [-37.819882604979846, 144.95296282113222],
  [-37.81973721503802, 144.95279892337976], // approaching Southern Cross
  [-37.81934099941143, 144.9524609650515], // Southern Cross approach
  [-37.816853698443914, 144.95049612250577],
  [-37.81621957350685, 144.94995894904764], // last plit off of cfd and nrthn 
[-37.81219780049446, 144.9464798395072],
];
const SANDRINGHAM_LINE: [number, number][] = [
  [-37.81932100824693, 144.96515822429285], // Flinders Street
  [-37.81885676092435, 144.96680614367563],
  [-37.81868831342351, 144.96738684195435],
  [-37.81810105905219, 144.9693011010421],
  [-37.81775144701517, 144.97037800795056],
  [-37.817514691457086, 144.9714540393451],
  [-37.81739547670335, 144.97178214437636],
  [-37.81730860273319, 144.97319298632365],
  [-37.81759253191024, 144.97503700501213],
  [-37.81805762249785, 144.9762976432565],
  [-37.81838498518352, 144.9769521022641],
  [-37.818903041615916, 144.9778171146715],
  [-37.81964992638664, 144.97898924001413],
  [-37.82058643504468, 144.9804389739665],
  [-37.8212956127862, 144.98150645039166],
  [-37.821843728631805, 144.9823642792451],
  [-37.822836355553684, 144.9841989101896],
  [-37.82289792870241, 144.9843463614976],
  [-37.82335451103584, 144.98566198503144],
  [-37.823768685272795, 144.9869941790775],
  [-37.82431954341726, 144.9891573806168], // Richmond

  // South Yarra → Richmond curves
  [-37.82606575858881, 144.99270326773168], // Richmond to South Yarra curve
  [-37.82598101345592, 144.99258525053799], // Richmond to South Yarra curve 2
  [-37.82768438956031, 144.99390491980614], // Richmond to South Yarra curve 3
  [-37.83259166656431, 144.9935008513864], // Richmond to South Yarra curve 4
  [-37.834942448947026, 144.9930213092438], // Richmond to South Yarra curve 5
  [-37.836163536721816, 144.9928552912536], // Richmond to South Yarra curve 6
  [-37.839242018981536, 144.99204952288912], // South Yarra
  [-37.83950870844592, 144.99201319177607], // South Yarra bridge
  [-37.83972265048852, 144.9919246788808], // South Yarra entrance curve
  [-37.84031681301816, 144.99176776965538], // South Yarra entrance curve 2
  [-37.84948088240228, 144.98989704452956], // pharsanhn station
  [-37.85156784714275, 144.9895675847279],
  [-37.85397372002226, 144.99008256884602],
  [-37.8547700127662, 144.9905653664568],
  [-37.85586278356211, 144.99177772498697], // winsdor station
  [-37.85659711485019, 144.9927396136255], // winsdor station bridnge 
  [-37.85788256936412, 144.9937561708309], 
  [-37.860062857088174, 144.9948972776503],
  [-37.86164683209365, 144.99498579055694],
  [-37.864329579924544, 144.994492948562],
  [-37.86588170121176, 144.99418985894465],
  [-37.86944319832077, 144.9935407643723],
  [-37.872229574061805, 144.99349788204847],
  [-37.87594743585128, 144.99515012282768],
  [-37.88124019548833, 144.99826148525],
  [-37.8873075976758, 145.00279758553393],
  [-37.88908573308372, 145.00388119801502],
  [-37.89206072149637, 145.00471275875503],
  [-37.894516141671495, 145.00454107880682],
  [-37.89659889201308, 145.0041977560489],
  [-37.9505, 145.0058],
];

// =========================
// Derived Data
// =========================
const MERNDA_LINE = MERNDA_STATIONS.map((s) => s.position);
const HURSTBRIDGE_LINE = HURSTBRIDGE_STATIONS.map((s) => s.position);
const MERNDA_BRANCH_LINE = MERNDA_STATIONS.slice(MERNDA_STATIONS.findIndex((station) => station.name === "Clifton Hill")).map((s) => s.position);
const HURSTBRIDGE_BRANCH_LINE: [number, number][] = [CLIFTON_HILL_POSITION, ...HURSTBRIDGE_LINE];
const CLIFTONHILL_LOOP: [number, number][] = [
  [-37.816492790989656, 144.983959764190870], // Jolimont
    [-37.815823035935786, 144.97785563825553],
    [-37.81527440590607, 144.9750759227291],// exiting Parliament
  [-37.815393064919005, 144.97438123057663], 
  [-37.816131603788584, 144.9733437265942], // Parliament -> Jolimont curve
  [-37.817634854263244, 144.96826388056115], // Jolimont / MCG side
  [-37.81830019553066, 144.9661902038941], // Flinders Street
  [-37.81962871794242, 144.96119376026797],
  [-37.82032716362383, 144.9590835338242],
  [-37.82129915764358, 144.95648876990828],
  [-37.8212396948123, 144.95500037577344],
  [-37.820114282704075, 144.95311576000708],
  [-37.819330859301594, 144.95242620896954], // Southern Cross
  [-37.81764785079244, 144.95110717843116],
    [-37.816004158290546, 144.94992174254918],
  [-37.81527949037888, 144.94975812780976],
  [-37.814138418282056, 144.95003974441732],
  [-37.81371465922187, 144.9502663584635],
  [-37.81336091942794, 144.950829264709],
  [-37.811699102585074, 144.95654834454922], // Flagstaff
  [-37.809961702457514, 144.9625342832056], // Melbourne Central
  [-37.811704369421705, 144.95654762414082],
  [-37.808050963795516, 144.96916411750817],
  [-37.807981227663504, 144.96993958540307],
    [-37.80809697107995, 144.97061752072608],

  [-37.808358272498175, 144.9713049058432],
  [-37.80874077936197, 144.97177965092897],
  [-37.809237048952674, 144.97205260610428],
  [-37.81138709188395, 144.97306243861945], // Parliament
  [-37.8134221337534, 144.97401646795137],
  [-37.81391479396574, 144.97425250234232], // RIGHT TREACK 
  [-37.81418443133632, 144.97439197721198],
  [-37.81436242324288, 144.97449658336052],
  [-37.81431640835925, 144.97447008934023],
  [-37.814837194661806, 144.97484007119382],
  [-37.81520853710754, 144.9752652013244],
  [-37.81555775700814, 144.97629458077256], // loop portal
  [-37.815723447250065, 144.9770791387547],
  [-37.815823035935786, 144.97785563825553],
   // back to Jolimont
];
const CRAIGIEBURN_LINE = CRAIGIEBURN_STATIONS.map((station) => station.position);
const UPFIELD_LINE = UPFIELD_STATIONS.map((station) => station.position);
const WERRIBEE_LINE = WERRIBEE_STATIONS.map((station) => station.position);
const WILLIAMSTOWN_LINE = WILLIAMSTOWN_STATIONS.map((station) => station.position);
const ALTONA_LOOP_LINE = ALTONA_LOOP_STATIONS.map((station) => station.position);
const RENDERED_SANDRINGHAM_STATIONS = alignStationsToRenderedPolyline(
  SANDRINGHAM_STATIONS,
  SANDRINGHAM_LINE,
  "right",
  0.5,
);
const FRANKSTON_TRACK: [number, number][] = [
  [-38.1426676, 145.1262003], // Frankston
  [-38.1378, 145.1282],
  [-38.1315, 145.1312],
  [-38.1265, 145.1340],
  [-38.121688, 145.1354187], // Kananook
  [-38.1160, 145.1338],
  [-38.1100, 145.1308],
  [-38.1040134, 145.1282259], // Seaford
  [-38.0960, 145.1263],
  [-38.0875, 145.1245],
  [-38.0774817, 145.1230629], // Carrum
  [-38.0710, 145.1217],
  [-38.065449, 145.120108], // Bonbeach
  [-38.0594, 145.1185],
  [-38.0532764, 145.1166366], // Chelsea
  [-38.0450, 145.1117],
  [-38.0365046, 145.1075721], // Edithvale
  [-38.0317, 145.1049],
  [-38.0272365, 145.1021263], // Aspendale
  [-38.0188, 145.0959],
  [-38.0067174, 145.0875658], // Mordialloc
  [-37.9996, 145.0816],
  [-37.9924751, 145.0755901], // Parkdale
  [-37.9878, 145.0710],
  [-37.9835507, 145.066334], // Mentone
  [-37.9750, 145.0596],
  [-37.9670081, 145.0546951], // Cheltenham
  [-37.9628, 145.0517],
  [-37.9584027, 145.0488064], // Southland
  [-37.9532, 145.0452],
  [-37.9484438, 145.04188], // Highett
  [-37.9410, 145.0392],
  [-37.9343919, 145.0368952], // Moorabbin
  [-37.9297, 145.0358],
  [-37.9251159, 145.0354959], // Patterson
  [-37.9214, 145.0360],
  [-37.9175354, 145.0369346], // Bentleigh
  [-37.9142, 145.0375],
  [-37.9114018, 145.0381036], // McKinnon
  [-37.9078, 145.0388],
  [-37.9042587, 145.0394811], // Ormond
  [-37.8968, 145.0409],
  [-37.8893136, 145.042285], // Glen Huntly
  [-37.8832, 145.0424],
  [-37.8773212, 145.0423811], // Caulfield
  [-37.8715, 145.0364],
  [-37.8663425, 145.029464], // Malvern
  [-37.8611, 145.0240],
  [-37.8562948, 145.0192436], // Armadale
  [-37.8532, 145.0161],
  [-37.8506631, 145.0136792], // Toorak
  [-37.8475, 145.0084],
[-37.8446738, 145.0019694], // Hawksburn
[-37.8416212064182, 144.99381416666222],
[-37.84099027756291, 144.99277197708855],
[-37.84039541175312, 144.9924065225265],
[-37.839758877221995, 144.9922573545601],
[-37.83925452634713, 144.99223852217295],
[-37.838735090354006, 144.99226495747362], // South Yarra

// smooth northbound run after South Yarra
[-37.83792, 144.992620],
[-37.83702, 144.992780],
[-37.83602, 144.992950],
[-37.83492, 144.993100],
[-37.83362, 144.993280],
[-37.83241166656431, 144.993450],
[-37.83052, 144.993680],
[-37.82872, 144.993900],
[-37.82750438956031, 144.994050],

// gentle curve into Richmond
[-37.82672, 144.993700],
[-37.82602, 144.993200],
[-37.82522, 144.992100],
[-37.82462, 144.990700],
[-37.82423492722702, 144.989400], // Richmond

[-37.82393611011648, 144.98802759456223],
[-37.82272421180452, 144.98414375600464],
[-37.82154098337264, 144.9820521293735],
[-37.8201108100639, 144.97988356338206],
[-37.81916264285825, 144.9783909140706],
[-37.8188437593049, 144.97790945754892],
[-37.818365904421206, 144.97726539063947], // end of tight curve

// continue smooth toward Flinders
[-37.817977622497846, 144.9762976432565],
[-37.817512531910236, 144.97503700501213],
[-37.816777252040204, 144.97346390042898],
[-37.81697169949515, 144.97127965374332],
[-37.81730059791522, 144.9701526942503],
[-37.81772234068387, 144.96885853532544],
[-37.81826608064349, 144.96703006353502],
[-37.8185034697015, 144.96618382735207],

[-37.81883627840431, 144.96497044269884], // Flinders Street

];
const GLEN_WAVERLEY_LINE = GLEN_WAVERLEY_TRACK_POINTS;
const UPFIELD_DEBUG_TRACK_POINTS = offsetPolylineCoordinates(UPFIELD_LINE, "right", 0.45)
  .map((position, index) => ({ position, index }));
const GLEN_WAVERLEY_DEBUG_TRACK_POINTS = GLEN_WAVERLEY_LINE.map((position, index) => ({ position, index }));
const CAULFIELD_DEBUG_TRACK_POINTS = CAUFIELD_LOOP.map((position, index) => ({ position, index }));
const CLIFTON_HILL_DEBUG_TRACK_POINTS = CLIFTONHILL_LOOP.map((position, index) => ({ position, index }));
const NORTHERN_DEBUG_TRACK_POINTS = NORTHERN_LOOP.map((position, index) => ({ position, index }));
const CRANBOURNE_LINE = CRANBOURNE_STATIONS.map((station) => station.position);
const PAKENHAM_LINE = PAKENHAM_STATIONS.map((station) => station.position);
const PAKENHAM_PRE_HAWKSBURN_LINE = PAKENHAM_STATIONS.slice(
  0,
  PAKENHAM_STATIONS.findIndex((station) => station.name === "Hawksburn") + 1,
).map((station) => station.position);
const PAKENHAM_HAWKSBURN_TO_CARNEGIE_LINE = PAKENHAM_STATIONS.slice(
  PAKENHAM_STATIONS.findIndex((station) => station.name === "Hawksburn"),
  PAKENHAM_STATIONS.findIndex((station) => station.name === "Carnegie") + 1,
).map((station) => station.position);
const PAKENHAM_POST_CARNEGIE_LINE = PAKENHAM_STATIONS.slice(
  PAKENHAM_STATIONS.findIndex((station) => station.name === "Carnegie"),
).map((station) => station.position);
const PAKENHAM_POST_HAWKSBURN_LINE = PAKENHAM_STATIONS.slice(
  PAKENHAM_STATIONS.findIndex((station) => station.name === "Hawksburn"),
).map((station) => station.position);
const SUNBURY_LINE = SUNBURY_STATIONS.map((station) => station.position);
const LILYDALE_LINE = LILYDALE_STATIONS.map((station) => station.position);
const BELGRAVE_LINE = BELGRAVE_STATIONS.map((station) => station.position);
const ALAMEIN_LINE = ALAMEIN_STATIONS.map((station) => station.position);
const METRO_TUNNEL_LINE = METRO_TUNNEL_STATIONS.map((station) => station.position);
const GIPPSLAND_LINE: [number, number][] = [
  [-37.81760709859187, 144.95075647527574], // Southern Cross PL 15 
  [-37.82003795534144, 144.9528633468371], // other End of Southern Cross
  [-37.82129209074471, 144.9550755519225],
  [-37.82136837320113, 144.9559339066656],
  [-37.82131857949724, 144.95652927526464],
  [-37.820857746012116, 144.95761022756787],
  [-37.820073469467914, 144.9597783875615],
  [-37.818990477433246, 144.96368834682139],
  [-37.818821008246935, 144.96515822429285], // Flinders Street
  [-37.818150662566204, 144.96736131393143],
[-37.81818831342351, 144.96738684195435],
  [-37.817639232385886, 144.96846961450348],
  [-37.81714544962751, 144.97007759187528],
  [-37.81681551870191, 144.97131452441218],
  [-37.81660939712368, 144.9731447175639],
  [-37.81685517913301, 144.97491898208378],
  [-37.81755762249785, 144.9762976432565],
  [-37.81794590442121, 144.97726539063947],
  [-37.81817605752223, 144.9775121630495],
  [-37.818423759304906, 144.97790945754892],
  [-37.818742642858254, 144.9783909140706],
  [-37.8196908100639, 144.97988356338206],
  [-37.82112098337264, 144.9820521293735],
  [-37.82230421180452, 144.98414375600464],
  [-37.823516110116486, 144.98802759456223],
  [-37.823476053233385, 144.9882499129706], // Richmond
  [-37.82399301107746, 144.9901703745477],
  [-37.82466788109256, 144.99168870460775],
  [-37.82663700198918, 144.9937727998178], // adsf
  [-37.8311146308829, 144.99377198472502],
  [-37.831791409259644, 144.99362628424882],
  [-37.832731891109304, 144.99342654024068],
  [-37.83392014167189, 144.99317215202188],
  [-37.83511518438329, 144.99299724118583],
  [-37.835784644893494, 144.99289278063767],
  [-37.83725989427833, 144.99260545847454],
  [-37.83792726162909, 144.99254420463757],
  [-37.83845859357905, 144.99236423742724], // South Yarra
[-37.83996928304227, 144.9924849986416],
[-37.84097754580992, 144.9934720515407],
[-37.841667764546266, 144.99487698594072],
[-37.84332351771486, 144.9989121534479],
  [-37.84450296093722, 145.00179929213567], // Hawksburn
  [-37.84484397157079, 145.00257981496097], // hwksburn end 
  [-37.8506631, 145.0136792], // Toorak
  [-37.8562948, 145.0192436], // Armadale
  [-37.8663425, 145.029464], // Malvern
  [-37.8773212, 145.0423811], // Caulfield
  [-37.88584755576908, 145.0576145973216], // Carnegie
  [-37.889800131059374, 145.06676121081267], // Murrumbeena
  [-37.89413917232323, 145.07620072615813], // Hughesdale
  [-37.900458908475315, 145.08839984150381], // Oakleigh
  [-37.91097055312629, 145.10241977630986], // Huntingdale
  [-37.924541507360765, 145.12053998830723], // Clayton
  [-37.937755318504934, 145.13805369881837], // Westall
  [-37.94893771437316, 145.15307099140574], // Springvale
  [-37.95653055647639, 145.1628965591817], // Sandown Park
  [-37.9571, 145.1631], // Noble Park
  [-37.9633, 145.1746], // Yarraman
  [-37.98991938287247, 145.20988128532633], // Dandenong
  [-37.9953, 145.2341], // Hallam
  [-38.0136, 145.2595], // Narre Warren
  [-38.0286, 145.2903], // Berwick
  [-38.0436, 145.3205], // Beaconsfield
  [-38.0653, 145.3664], // Officer
  [-38.0795, 145.3953], // Cardinia Road
  [-38.0735, 145.4716], // Pakenham
  [-38.0821, 145.51], // East Pakenham
  [-38.0954, 145.5802],
  [-38.1088, 145.6761],
  [-38.1217, 145.7688],
  [-38.1348, 145.8539],
  [-38.1489, 145.9318],
  [-38.15965088085526, 145.92871651094258], // Warragul
  [-38.1689, 146.0374],
  [-38.1738, 146.1452],
  [-38.17588027961461, 146.26083329049215], // Moe
  [-38.1967, 146.3314],
  [-38.2165, 146.3718],
  [-38.23555857042696, 146.39640612076153], // Morwell
  [-38.2206, 146.4587],
  [-38.2058, 146.5029],
  [-38.19489747401578, 146.5415475189243], // Traralgon
];
const GIPPSLAND_CARNEGIE_INDEX = GIPPSLAND_LINE.findIndex(
  ([lat, lng]) =>
    Math.abs(lat - -37.88584755576908) < 0.000001 &&
    Math.abs(lng - 145.0576145973216) < 0.000001,
);
const GIPPSLAND_PRE_CARNEGIE_LINE =
  GIPPSLAND_CARNEGIE_INDEX >= 0 ? GIPPSLAND_LINE.slice(0, GIPPSLAND_CARNEGIE_INDEX + 1) : GIPPSLAND_LINE;
const GIPPSLAND_POST_CARNEGIE_LINE =
  GIPPSLAND_CARNEGIE_INDEX >= 0 ? GIPPSLAND_LINE.slice(GIPPSLAND_CARNEGIE_INDEX) : GIPPSLAND_LINE;
const BAIRNSDALE_DEBUG_TRACK_POINTS = [
  ...GIPPSLAND_PRE_CARNEGIE_LINE,
  ...offsetPolylineCoordinates(GIPPSLAND_POST_CARNEGIE_LINE, "right", 0.38).slice(1),
].map((position, index) => ({ position, index }));
const GEELONG_LINE: [number, number][] = [
  [-37.79971717185788, 144.92584789732544], // South Kensington
  [-37.801696124765726, 144.90150029345793], // Footscray
  [-37.80244211892746, 144.89150101820428], // Middle Footscray
  [-37.80159439768236, 144.88351876420322], // West Footscray
  [-37.79906652439008, 144.86302968739224], // Tottenham
  [-37.7941, 144.8474], // White City
  [-37.78812106172095, 144.83237218696007], // Sunshine
  [-37.7794, 144.8008], // Ardeer
  [-37.7686, 144.7759], // Deer Park
  [-37.745, 144.7312], // Robinsons Road Junction corridor
  [-37.8361, 144.6948], // Tarneit
  [-37.8646, 144.6567], // Wyndham Vale
  [-37.8976, 144.6519], // Little River
  [-38.0222, 144.4066], // Lara
  [-38.0709, 144.3595], // Corio
  [-38.0954, 144.3465], // North Shore
  [-38.1113, 144.343], // North Geelong
  [-38.1471, 144.3607], // Geelong
  [-38.1608, 144.3733], // South Geelong
  [-38.1713, 144.3792], // Geelong Racecourse corridor
  [-38.1912, 144.3618], // Marshall
  [-38.2143, 144.3222], // Waurn Ponds
];
const BALLARAT_SHARED_VLINE_TRUNK: [number, number][] = [
  [-37.81767225337158, 144.950639128634], // Southern Cross
  [-37.8128, 144.9469],
  [-37.8096, 144.9443],
  [-37.8073, 144.9426], // North Melbourne
  [-37.8047, 144.9378],
  [-37.8022, 144.9326],
  [-37.8008, 144.9291],
  [-37.79971717185788, 144.92584789732544], // South Kensington
  [-37.801696124765726, 144.90150029345793], // Footscray
  [-37.78812106172095, 144.83237218696007], // Sunshine
];
const SEYMOUR_REGIONAL_LINE: [number, number][] = [
  [-37.81767225337158, 144.950639128634], // Southern Cross
  [-37.8128, 144.9469],
  [-37.8096, 144.9443],
  [-37.8073, 144.9426], // North Melbourne
  [-37.7812, 144.9313],
  [-37.7407, 144.9241],
  [-37.6805, 144.9191], // Broadmeadows
  [-37.4684, 144.9594],
  [-37.2452, 145.0418],
  [-37.0264, 145.1337], // Seymour
];
const SUNSHINE_VLINE_EXPRESS_OVERLAY: [number, number][] = [
  [-37.7929, 144.8468],
  [-37.7914, 144.8418],
  [-37.7901, 144.8373],
  [-37.7889, 144.8346],
  [-37.7867, 144.8278],
  [-37.7835, 144.8185],
  [-37.7794, 144.8008], // Ardeer
];
const SUNSHINE_VLINE_STOPPING_OVERLAY: [number, number][] = [
  [-37.78812106172095, 144.83237218696007], // Sunshine
  [-37.7869, 144.8283],
  [-37.7846, 144.8213],
  [-37.7817, 144.8115],
  [-37.7794, 144.8008], // Ardeer
];
const BALLARAT_LINE: [number, number][] = [
  ...BALLARAT_SHARED_VLINE_TRUNK,
  [-37.7295, 144.7752], // Deer Park corridor
  [-37.6918, 144.6151], // Rockbank corridor
  [-37.6832, 144.5837], // Cobblebank corridor
  [-37.6841, 144.5698], // Melton
  [-37.7017, 144.4419], // Bacchus Marsh
  [-37.7085, 144.2291], // Ballan
  [-37.7376, 144.1065], // Gordon corridor
  [-37.55861757585211, 143.85946145441608], // Ballarat
  [-37.5309, 143.8487], // Wendouree
];
const ARARAT_BRANCH_LINE: [number, number][] = [
  [-37.55861757585211, 143.85946145441608], // Ballarat
  [-37.7268, 143.6925], // Beaufort
  [-37.2867, 142.9479], // Ararat
];
const MARYBOROUGH_BRANCH_LINE: [number, number][] = [
  [-37.55861757585211, 143.85946145441608], // Ballarat
  [-37.4084, 143.7954], // Creswick
  [-37.0462, 143.7397], // Maryborough
];
const FREIGHT_LOCATIONS: FreightLocation[] = [
  { name: "Appleton Dock", kind: "Dock terminal", position: [-37.8261, 144.9159] },
  { name: "Dynon", kind: "Freight terminal", position: [-37.8139, 144.9388] },
  { name: "South Dynon", kind: "Freight yard", position: [-37.8189, 144.9305] },
  { name: "Tottenham Yard", kind: "Freight yard", position: [-37.7994, 144.8728] },
  { name: "West Footscray", kind: "Junction", position: [-37.80159439768236, 144.88351876420322] },
  { name: "North Geelong Yard", kind: "Freight yard", position: [-38.0972, 144.3447] },
  { name: "Gheringhap Loop", kind: "Passing loop", position: [-38.2213, 144.2054] },
  { name: "Maroona Loop", kind: "Passing loop", position: [-37.4364, 142.8823] },
  { name: "Seymour", kind: "Freight corridor", position: [-37.0264, 145.1337] },
  { name: "Benalla", kind: "Freight corridor", position: [-36.5515, 145.9843] },
  { name: "Wodonga", kind: "Freight corridor", position: [-36.1212, 146.8879] },
  { name: "Ballarat", kind: "Freight corridor", position: [-37.55861757585211, 143.85946145441608] },
  { name: "Maryborough", kind: "Freight corridor", position: [-37.0462, 143.7397] },
];
const FREIGHT_PORT_TERMINAL_LINE: [number, number][] = [
  [-37.8261, 144.9159], // Appleton Dock
  [-37.8219, 144.9202],
  [-37.8189, 144.9305], // South Dynon
  [-37.8139, 144.9388], // Dynon
  [-37.8078, 144.9136],
  [-37.80159439768236, 144.88351876420322], // West Footscray
  [-37.7994, 144.8728], // Tottenham Yard
];
const FREIGHT_WESTERN_CORRIDOR_LINE: [number, number][] = [
  [-37.8189, 144.9305], // South Dynon
  [-37.8078, 144.9136],
  [-37.80159439768236, 144.88351876420322], // West Footscray
  [-37.7994, 144.8728], // Tottenham Yard
  [-37.78812106172095, 144.83237218696007], // Sunshine corridor
  [-38.0972, 144.3447], // North Geelong Yard
  [-38.2213, 144.2054], // Gheringhap Loop
  [-37.4364, 142.8823], // Maroona Loop
  [-37.55861757585211, 143.85946145441608], // Ballarat
  [-37.0462, 143.7397], // Maryborough
];
const FREIGHT_NORTH_CORRIDOR_LINE: [number, number][] = [
  [-37.8189, 144.9305], // South Dynon
  [-37.8073, 144.9426], // North Melbourne corridor
  [-37.0264, 145.1337], // Seymour
  [-36.5515, 145.9843], // Benalla
  [-36.1212, 146.8879], // Wodonga
];
const XPT_INTERSTATE_LINE: [number, number][] = [
  [-37.81767225337158, 144.950639128634], // Southern Cross
  [-37.6805, 144.9191], // Broadmeadows
  [-37.0264, 145.1337], // Seymour
  [-36.3582, 146.3181], // Wangaratta
  [-36.0796, 146.924], // Albury
  [-35.6682, 147.0396], // Culcairn
  [-35.5209, 147.0399], // Henty
  [-35.2741, 147.1133], // The Rock
  [-35.1082, 147.3673], // Wagga Wagga
  [-34.8654, 147.5859], // Junee
  [-34.6393, 148.0273], // Cootamundra
  [-34.5537, 148.373], // Harden
  [-34.8428, 148.9118], // Yass Junction
  [-34.7874, 149.2661], // Gunning
  [-34.7545, 149.7202], // Goulburn
  [-34.5519, 150.3717], // Moss Vale
  [-34.0657, 150.8148], // Campbelltown
  [-33.883, 151.207], // Sydney Central
];
const XPT_INTERSTATE_STOPS: Array<{ name: string; position: [number, number]; note?: string }> = [
  { name: "Southern Cross", position: [-37.81767225337158, 144.950639128634] },
  { name: "Broadmeadows", position: [-37.6805, 144.9191], note: "Pick up only" },
  { name: "Seymour", position: [-37.0264, 145.1337], note: "Pick up only" },
  { name: "Wangaratta", position: [-36.3582, 146.3181] },
  { name: "Albury", position: [-36.0796, 146.924] },
  { name: "Culcairn", position: [-35.6682, 147.0396], note: "Request stop" },
  { name: "Henty", position: [-35.5209, 147.0399], note: "Request stop" },
  { name: "The Rock", position: [-35.2741, 147.1133], note: "Request stop" },
  { name: "Wagga Wagga", position: [-35.1082, 147.3673] },
  { name: "Junee", position: [-34.8654, 147.5859] },
  { name: "Cootamundra", position: [-34.6393, 148.0273] },
  { name: "Harden", position: [-34.5537, 148.373], note: "Request stop" },
  { name: "Yass Junction", position: [-34.8428, 148.9118], note: "Request stop" },
  { name: "Gunning", position: [-34.7874, 149.2661], note: "Request stop" },
  { name: "Goulburn", position: [-34.7545, 149.7202] },
  { name: "Moss Vale", position: [-34.5519, 150.3717] },
  { name: "Campbelltown", position: [-34.0657, 150.8148], note: "Drop off only" },
  { name: "Sydney Central", position: [-33.883, 151.207] },
];
export const ALL_STATIONS: Station[] = [
    ...CLIFTONHILLGROUPLOOP_STATIONS,
  ...MERNDA_STATIONS,
  ...HURSTBRIDGE_STATIONS,
  ...CAUFIELDLOOP_STATIONS,
  ...NORTHERNGROUPLOOP_STATIONS,
  ...BURNLEYGROUPLOOP_STATIONS,
  ...FRANKSTON_STATIONS,
  ...CRANBOURNE_STATIONS,
  ...PAKENHAM_STATIONS,
  ...SUNBURY_STATIONS,
  ...CRAIGIEBURN_STATIONS,
  ...UPFIELD_STATIONS,
  ...LILYDALE_STATIONS,
  ...BELGRAVE_STATIONS,
  ...ALAMEIN_STATIONS,
  ...GLEN_WAVERLEY_STATIONS,
  ...METRO_TUNNEL_STATIONS,
  ...SANDRINGHAM_STATIONS,
  ...WERRIBEE_STATIONS,
  ...WILLIAMSTOWN_STATIONS,
  ...ALTONA_LOOP_STATIONS,
  ...GIPPSLAND_STATIONS,
  ...BALLARAT_REGIONAL_STATIONS,
  ...SEYMOUR_REGIONAL_STATIONS,
].filter(
  (station, index, array) =>
    array.findIndex((item) => item.name === station.name) === index
);

const ROUTE_630_SURFACE_DEPARTURES: SurfaceStopDeparture[] = [
  { route: "630", destination: "Elwood", departureLabel: "4 min", statusLabel: "Scheduled", note: "Toward Elwood" },
  { route: "630", destination: "Elwood", departureLabel: "17 min", statusLabel: "Scheduled", note: "Via North Rd" },
  { route: "630", destination: "Monash University", departureLabel: "29 min", statusLabel: "Scheduled", note: "Return working" },
];

const ROUTE_630_ELWOOD_STOP_DATA: Array<{
  name: string;
  locality: string;
  position: [number, number];
  platform?: string;
}> = [
  { name: "Monash University", locality: "Clayton", position: [-37.91464313, 145.13183523], platform: "Bay A" },
  { name: "Princes Hwy/North Rd", locality: "Clayton", position: [-37.91441604, 145.12492487] },
  { name: "Clayton Rd/North Rd", locality: "Clayton", position: [-37.91399193, 145.12150037] },
  { name: "Banksia St/North Rd", locality: "Clayton", position: [-37.91366689, 145.11864213] },
  { name: "Flora Rd/North Rd", locality: "Clayton", position: [-37.91337919, 145.11643134] },
  { name: "Colin Rd/North Rd", locality: "Oakleigh South", position: [-37.91295282, 145.11288186] },
  { name: "Milgate St/North Rd", locality: "Oakleigh South", position: [-37.91248923, 145.10926514] },
  { name: "Huntingdale Station/Haughton Rd", locality: "Oakleigh", position: [-37.91086528, 145.10299383], platform: "Bay C" },
  { name: "Windsor Ave/North Rd", locality: "Oakleigh South", position: [-37.91127333, 145.09924109] },
  { name: "Gadd St/North Rd", locality: "Oakleigh South", position: [-37.91095915, 145.09653065] },
  { name: "South Oakleigh Bowling Club/North Rd", locality: "Oakleigh South", position: [-37.91059896, 145.09376455] },
  { name: "Best St/North Rd", locality: "Oakleigh South", position: [-37.91034682, 145.09155304] },
  { name: "Cleek Ave/North Rd", locality: "Oakleigh South", position: [-37.90990941, 145.08792453] },
  { name: "Warrigal Rd/North Rd", locality: "Bentleigh East", position: [-37.90973552, 145.08609776] },
  { name: "White St/North Rd", locality: "Bentleigh East", position: [-37.90909080, 145.08137140] },
  { name: "Hallow St/North Rd", locality: "Bentleigh East", position: [-37.90875727, 145.07860476] },
  { name: "Coatesville Uniting Church/North Rd", locality: "Bentleigh East", position: [-37.90848136, 145.07661008] },
  { name: "Poet Rd/North Rd", locality: "Bentleigh East", position: [-37.90812580, 145.07360521] },
  { name: "Baker St/North Rd", locality: "Bentleigh East", position: [-37.90779433, 145.07097507] },
  { name: "Marlborough St/North Rd", locality: "Bentleigh East", position: [-37.90750444, 145.06868510] },
  { name: "Cobar St/North Rd", locality: "Bentleigh East", position: [-37.90716011, 145.06582787] },
  { name: "East Boundary Rd/North Rd", locality: "Bentleigh East", position: [-37.90671403, 145.06226815] },
  { name: "Murrong Ave/North Rd", locality: "Bentleigh East", position: [-37.90664972, 145.06055239] },
  { name: "Rochford St/North Rd", locality: "Bentleigh East", position: [-37.90634592, 145.05797851] },
  { name: "Elimatta Rd/North Rd", locality: "Bentleigh East", position: [-37.90613948, 145.05639161] },
  { name: "Tucker Rd/North Rd", locality: "Ormond", position: [-37.90590013514765, 145.05422800990036] },
  { name: "Collins St/North Rd", locality: "Ormond", position: [-37.90555663, 145.05166413] },
  { name: "Bewdley St/North Rd", locality: "Ormond", position: [-37.90532965, 145.04992995] },
  { name: "Tyrone St/North Rd", locality: "Ormond", position: [-37.90497624, 145.04709589] },
  { name: "Dunlop Ave/North Rd", locality: "Ormond", position: [-37.90440506, 145.04255022] },
  { name: "Ormond Station/North Rd", locality: "Ormond", position: [-37.90405375, 145.03985266] },
  { name: "Anthony St/North Rd", locality: "Ormond", position: [-37.90373414, 145.03743861] },
  { name: "Wheatley Rd/North Rd", locality: "Ormond", position: [-37.90349357, 145.03544330] },
  { name: "O'Loughlan St/North Rd", locality: "Ormond", position: [-37.90309942, 145.03234888] },
  { name: "Stewart St/North Rd", locality: "Ormond", position: [-37.90281931, 145.03014994] },
  { name: "Thompson St/North Rd", locality: "Ormond", position: [-37.90260406, 145.02859755] },
  { name: "Thomas St/North Rd", locality: "Brighton East", position: [-37.90232426, 145.02642138] },
  { name: "Hodder St/North Rd", locality: "Brighton East", position: [-37.90192567, 145.02307698] },
  { name: "Hawthorn Rd/North Rd", locality: "Brighton East", position: [-37.90141125, 145.01874626] },
  { name: "Landcox St/North Rd", locality: "Brighton East", position: [-37.90092984, 145.01477866] },
  { name: "North Rd/Kooyong Rd", locality: "Caulfield South", position: [-37.90001253, 145.01222170] },
  { name: "Kooyong Rd/Gardenvale Rd", locality: "Gardenvale", position: [-37.89841358, 145.01199178] },
  { name: "Magnolia Rd/Gardenvale Rd", locality: "Gardenvale", position: [-37.89816088, 145.00983781] },
  { name: "Begonia Rd/Gardenvale Rd", locality: "Gardenvale", position: [-37.89786557, 145.00729834] },
  { name: "Gardenvale Station/Martin St", locality: "Brighton", position: [-37.89744000, 145.00398910] },
  { name: "Cochrane St/Martin St", locality: "Brighton", position: [-37.89691743, 144.99974999] },
  { name: "Star Of The Sea College/Martin St", locality: "Brighton", position: [-37.89660293, 144.99715428] },
  { name: "New St/Martin St", locality: "Brighton", position: [-37.89637873, 144.99510199] },
  { name: "Martin St/Drake St", locality: "Brighton", position: [-37.89560444, 144.99197295] },
  { name: "Cole St/Drake St", locality: "Brighton", position: [-37.89405961, 144.99227648] },
  { name: "Head St/Drake St", locality: "Brighton", position: [-37.89213704, 144.99262437] },
  { name: "Head St/New St", locality: "Brighton", position: [-37.89173491, 144.99546678] },
  { name: "Elsternwick Park/Bent Ave", locality: "Brighton", position: [-37.88825917, 144.99457179] },
  { name: "St Kilda St/Bent Ave", locality: "Brighton", position: [-37.88791540, 144.99185211] },
];

const ROUTE_630_MONASH_STOP_DATA: Array<{
  name: string;
  locality: string;
  position: [number, number];
  platform?: string;
}> = [
  { name: "St Kilda St/Bent Ave", locality: "Brighton", position: [-37.88791540, 144.99185211] },
  { name: "St Kilda St/Head St", locality: "Brighton", position: [-37.89173681, 144.99135027] },
  { name: "Head St/Drake St", locality: "Brighton", position: [-37.89226547, 144.99275734] },
  { name: "Cole St/Drake St", locality: "Brighton", position: [-37.89378348, 144.99246593] },
  { name: "Martin St/Drake St", locality: "Brighton", position: [-37.89573287, 144.99210592] },
  { name: "New St/Martin St", locality: "Brighton", position: [-37.89613959, 144.99428969] },
  { name: "Star Of The Sea College/Martin St", locality: "Brighton", position: [-37.89648622, 144.99718018] },
  { name: "Cochrane St/Martin St", locality: "Brighton", position: [-37.89682202, 144.99996865] },
  { name: "Gardenvale Station/Martin St", locality: "Brighton", position: [-37.89732522, 145.00412867] },
  { name: "Begonia Rd/Gardenvale Rd", locality: "Gardenvale", position: [-37.89776037, 145.00747177] },
  { name: "Magnolia Rd/Gardenvale Rd", locality: "Gardenvale", position: [-37.89804455, 145.00988643] },
  { name: "Kooyong Rd/Gardenvale Rd", locality: "Gardenvale", position: [-37.89828709, 145.01197244] },
  { name: "North Rd/Kooyong Rd", locality: "Caulfield South", position: [-37.90004244, 145.01239148] },
  { name: "Younger Ave/North Rd", locality: "Brighton East", position: [-37.90077998, 145.01551055] },
  { name: "Hawthorn Rd/North Rd", locality: "Brighton East", position: [-37.90127822, 145.01994399] },
  { name: "Brighton Cemetery/North Rd", locality: "Brighton East", position: [-37.90159089, 145.02246042] },
  { name: "Bambra Rd/North Rd", locality: "Ormond", position: [-37.90197954, 145.02574821] },
  { name: "Spring Rd/North Rd", locality: "Ormond", position: [-37.90231010, 145.02826421] },
  { name: "Scott St/North Rd", locality: "Ormond", position: [-37.90263966, 145.03072339] },
  { name: "Frederick St/North Rd", locality: "Ormond", position: [-37.90294025, 145.03306964] },
  { name: "Ormond Uniting Hall/North Rd", locality: "Ormond", position: [-37.90325340, 145.03563166] },
  { name: "Dalmor Ave/North Rd", locality: "Ormond", position: [-37.90350411, 145.03769494] },
  { name: "Ormond Station/North Rd", locality: "Ormond", position: [-37.90372398, 145.03953158] },
  { name: "Ulupna Rd/North Rd", locality: "Ormond", position: [-37.90415719, 145.04281838] },
  { name: "Nicholls Rd/North Rd", locality: "Ormond", position: [-37.90463654, 145.04671817] },
  { name: "Wild Cherry Rd/North Rd", locality: "Bentleigh East", position: [-37.90507256, 145.05018696] },
  { name: "Koornang Rd/North Rd", locality: "Bentleigh East", position: [-37.90533354, 145.05234106] },
  { name: "Tara Gr/North Rd", locality: "Bentleigh East", position: [-37.90564590, 145.05488053] },
  { name: "Elimatta Rd/North Rd", locality: "Bentleigh East", position: [-37.90580056, 145.05605932] },
  { name: "Parkview Dr/North Rd", locality: "Bentleigh East", position: [-37.90615412, 145.05891621] },
  { name: "Murrumbeena Rd/North Rd", locality: "Bentleigh East", position: [-37.90637403, 145.06077573] },
  { name: "Crosbie Rd/North Rd", locality: "Bentleigh East", position: [-37.90697169, 145.06587830] },
  { name: "Brett St/North Rd", locality: "Bentleigh East", position: [-37.90733782, 145.06841648] },
  { name: "Reid St/North Rd", locality: "Bentleigh East", position: [-37.90780396, 145.07211223] },
  { name: "Poath Rd/North Rd", locality: "Bentleigh East", position: [-37.90799068, 145.07360873] },
  { name: "Brine St/North Rd", locality: "Bentleigh East", position: [-37.90835451, 145.07656789] },
  { name: "Austin St/North Rd", locality: "Bentleigh East", position: [-37.90862494, 145.07877881] },
  { name: "White St/North Rd", locality: "Bentleigh East", position: [-37.90896654, 145.08148837] },
  { name: "Warrigal Rd/North Rd", locality: "Bentleigh East", position: [-37.90932042, 145.08440237] },
  { name: "Eastgate St/North Rd", locality: "Oakleigh South", position: [-37.90976455, 145.08788279] },
  { name: "Best St/North Rd", locality: "Oakleigh South", position: [-37.91010431, 145.09104746] },
  { name: "Young St/North Rd", locality: "Oakleigh South", position: [-37.91046717, 145.09453005] },
  { name: "Gadd St/North Rd", locality: "Oakleigh South", position: [-37.91068726, 145.09643529] },
  { name: "McIntosh St/North Rd", locality: "Oakleigh South", position: [-37.91100511, 145.09937311] },
  { name: "Huntingdale Station/Haughton Rd", locality: "Oakleigh", position: [-37.91119986, 145.10306485], platform: "Bay A" },
  { name: "Shafton St/North Rd", locality: "Oakleigh South", position: [-37.91190920, 145.10738041] },
  { name: "Fenton St/North Rd", locality: "Clayton", position: [-37.91219501, 145.11002341] },
  { name: "Franklyn St/North Rd", locality: "Clayton", position: [-37.91255311, 145.11324470] },
  { name: "Coane St/North Rd", locality: "Clayton", position: [-37.91295044, 145.11666977] },
  { name: "Kennaugh St/North Rd", locality: "Clayton", position: [-37.91325242, 145.11921006] },
  { name: "Clayton North Primary School/North Rd", locality: "Clayton", position: [-37.91362920, 145.12248785] },
  { name: "Princes Hwy/North Rd", locality: "Clayton", position: [-37.91411960, 145.12611541] },
  { name: "Monash University", locality: "Clayton", position: [-37.91464313, 145.13183523], platform: "Bay A" },
];

const ROUTE_630_SURFACE_STOPS: SurfaceStop[] = ROUTE_630_ELWOOD_STOP_DATA.map((stop, index) => ({
  id: `route-630-elwood-${index + 1}`,
  name: stop.name,
  locality: stop.locality,
  position: stop.position,
  subtitle: stop.platform ? `630 bus stop · ${stop.platform}` : "630 bus stop",
  modes: ["bus"],
  routeLabel: "630",
  departures: ROUTE_630_SURFACE_DEPARTURES,
}));

const ROUTE_630_MONASH_SURFACE_STOPS: SurfaceStop[] = ROUTE_630_MONASH_STOP_DATA.map((stop, index) => ({
  id: `route-630-monash-${index + 1}`,
  name: stop.name,
  locality: stop.locality,
  position: stop.position,
  subtitle: stop.platform ? `630 bus stop · ${stop.platform}` : "630 bus stop",
  modes: ["bus"],
  routeLabel: "630",
  departures: ROUTE_630_SURFACE_DEPARTURES,
}));

const ROUTE_64_EASTBOUND_DEPARTURES: SurfaceStopDeparture[] = [
  { route: "64", destination: "East Brighton", departureLabel: "2 min", statusLabel: "Tram due", note: "Southbound" },
  { route: "64", destination: "Melbourne University", departureLabel: "7 min", statusLabel: "Scheduled", note: "Northbound" },
  { route: "64", destination: "East Brighton", departureLabel: "14 min", statusLabel: "Scheduled", note: "Via St Kilda Rd" },
];

const ROUTE_64_WESTBOUND_DEPARTURES: SurfaceStopDeparture[] = [
  { route: "64", destination: "Melbourne University", departureLabel: "1 min", statusLabel: "Tram due", note: "Northbound" },
  { route: "64", destination: "East Brighton", departureLabel: "8 min", statusLabel: "Scheduled", note: "Southbound" },
  { route: "64", destination: "Melbourne University", departureLabel: "16 min", statusLabel: "Scheduled", note: "Via Swanston St" },
];

const ROUTE_64_EASTBOUND_STOP_DATA: Array<{ name: string; locality: string }> = [
  { name: "Melbourne University/Swanston St #1", locality: "Carlton" },
  { name: "Lincoln Square/Swanston St #3", locality: "Carlton" },
  { name: "Queensberry St/Swanston St #4", locality: "Melbourne City" },
  { name: "RMIT University/Swanston St #7", locality: "Melbourne City" },
  { name: "Melbourne Central Station/Swanston St #8", locality: "Melbourne City" },
  { name: "Bourke Street Mall/Swanston St #10", locality: "Melbourne City" },
  { name: "City Square/Swanston St #11", locality: "Melbourne City" },
  { name: "Federation Square/Swanston St #13", locality: "Melbourne City" },
  { name: "Arts Precinct/St Kilda Rd #14", locality: "Southbank" },
  { name: "Grant St-Police Memorial/St Kilda Rd #17", locality: "Southbank" },
  { name: "Shrine of Remembrance/St Kilda Rd #19", locality: "Melbourne City" },
  { name: "Anzac Station/St Kilda Rd #20", locality: "Melbourne City" },
  { name: "Toorak Rd/St Kilda Rd #22", locality: "Melbourne City" },
  { name: "Arthur St/St Kilda Rd #23", locality: "South Melbourne" },
  { name: "Leopold St/St Kilda Rd #24", locality: "South Melbourne" },
  { name: "Commercial Rd/St Kilda Rd #25", locality: "South Melbourne" },
  { name: "Moubray St/St Kilda Rd #26", locality: "South Melbourne" },
  { name: "High St/St Kilda Rd #27", locality: "St Kilda" },
  { name: "Union St/St Kilda Rd #29", locality: "St Kilda" },
  { name: "St Kilda Junction/St Kilda Rd #30", locality: "St Kilda" },
  { name: "Queens Way/Queens Way #31", locality: "Windsor" },
  { name: "Chapel St/Dandenong Rd #32", locality: "Windsor" },
  { name: "Hornby St/Dandenong Rd #33", locality: "Windsor" },
  { name: "The Avenue/Dandenong Rd #34", locality: "Prahran" },
  { name: "Williams Rd/Dandenong Rd #35", locality: "Prahran" },
  { name: "Closeburn Ave/Dandenong Rd #36", locality: "St Kilda East" },
  { name: "Lansdowne Rd/Dandenong Rd #37", locality: "Prahran" },
  { name: "Orrong Rd/Dandenong Rd #38", locality: "Armadale" },
  { name: "Wattletree Rd/Dandenong Rd #40", locality: "Armadale" },
  { name: "Kooyong Rd/Dandenong Rd #42", locality: "Armadale" },
  { name: "Egerton Rd/Dandenong Rd #43", locality: "Armadale" },
  { name: "Bailey Ave/Dandenong Rd #44", locality: "Caulfield North" },
  { name: "Hawthorn Rd/Dandenong Rd #48", locality: "Caulfield North" },
  { name: "Arthur St/Hawthorn Rd #49", locality: "Caulfield North" },
  { name: "Inkerman Rd/Hawthorn Rd #50", locality: "Caulfield North" },
  { name: "Balaclava Rd/Hawthorn Rd #51", locality: "Caulfield North" },
  { name: "Halstead St/Hawthorn Rd #52", locality: "Caulfield North" },
  { name: "Northcote Ave/Hawthorn Rd #53", locality: "Caulfield North" },
  { name: "Glen Eira Rd/Hawthorn Rd #54", locality: "Caulfield North" },
  { name: "Sylverly Gr/Hawthorn Rd #55", locality: "Caulfield" },
  { name: "Briggs St/Hawthorn Rd #56", locality: "Caulfield" },
  { name: "Glenhuntly Rd/Hawthorn Rd #57", locality: "Caulfield South" },
  { name: "Sycamore St/Hawthorn Rd #58", locality: "Caulfield South" },
  { name: "Princes Park/Hawthorn Rd #59", locality: "Caulfield South" },
  { name: "Dover St/Hawthorn Rd #60", locality: "Caulfield South" },
  { name: "Stone St/Hawthorn Rd #61", locality: "Caulfield South" },
  { name: "Gardenvale Rd/Hawthorn Rd #62", locality: "Brighton East" },
  { name: "North Rd/Hawthorn Rd #63", locality: "Brighton East" },
  { name: "Taylor St/Hawthorn Rd #64", locality: "Brighton East" },
  { name: "Davey Ave/Hawthorn Rd #65", locality: "Brighton East" },
  { name: "Union St/Hawthorn Rd #66", locality: "Brighton East" },
  { name: "Rogers Ave/Hawthorn Rd #67", locality: "Brighton East" },
  { name: "East Brighton/Hawthorn Rd #68", locality: "East Brighton" },
];

const ROUTE_64_WESTBOUND_STOP_DATA: Array<{ name: string; locality: string }> = [
  { name: "East Brighton/Hawthorn Rd #68", locality: "East Brighton" },
  { name: "Howell St/Hawthorn Rd #67", locality: "Brighton East" },
  { name: "Union St/Hawthorn Rd #66", locality: "Brighton East" },
  { name: "Davey Ave/Hawthorn Rd #65", locality: "Brighton East" },
  { name: "Taylor St/Hawthorn Rd #64", locality: "Brighton East" },
  { name: "North Rd/Hawthorn Rd #63", locality: "Caulfield South" },
  { name: "Gardenvale Rd/Hawthorn Rd #62", locality: "Caulfield South" },
  { name: "Raynes St/Hawthorn Rd #61", locality: "Caulfield South" },
  { name: "Dover St/Hawthorn Rd #60", locality: "Caulfield South" },
  { name: "Princes Park/Hawthorn Rd #59", locality: "Princes Park" },
  { name: "Sycamore St/Hawthorn Rd #58", locality: "Caulfield South" },
  { name: "Glenhuntly Rd/Hawthorn Rd #57", locality: "Caulfield" },
  { name: "Lockhart St/Hawthorn Rd #56", locality: "Caulfield" },
  { name: "Sylverly Gr/Hawthorn Rd #55", locality: "Caulfield" },
  { name: "Glen Eira Rd/Hawthorn Rd #54", locality: "Caulfield North" },
  { name: "Crotonhurst Ave/Hawthorn Rd #53", locality: "Caulfield North" },
  { name: "Halstead St/Hawthorn Rd #52", locality: "Caulfield North" },
  { name: "Balaclava Rd/Hawthorn Rd #51", locality: "Caulfield North" },
  { name: "Inkerman Rd/Hawthorn Rd #50", locality: "Caulfield North" },
  { name: "Wanda Rd/Hawthorn Rd #49", locality: "Caulfield North" },
  { name: "48A-Dandenong Rd/Hawthorn Rd", locality: "Caulfield North" },
  { name: "Hawthorn Rd/Dandenong Rd #48", locality: "Armadale" },
  { name: "Bailey Ave/Dandenong Rd #44", locality: "Armadale" },
  { name: "Matlock Ct/Dandenong Rd #43", locality: "Armadale" },
  { name: "Kooyong Rd/Dandenong Rd #42", locality: "Armadale" },
  { name: "Wattletree Rd/Dandenong Rd #40", locality: "Armadale" },
  { name: "Orrong Rd/Dandenong Rd #38", locality: "Prahran" },
  { name: "Lansdowne Rd/Dandenong Rd #37", locality: "Prahran" },
  { name: "Alexandra St/Dandenong Rd #36", locality: "Prahran" },
  { name: "Williams Rd/Dandenong Rd #35", locality: "St Kilda East" },
  { name: "Westbury St/Dandenong Rd #34", locality: "Windsor" },
  { name: "Hornby St/Dandenong Rd #33", locality: "Windsor" },
  { name: "Chapel St/Dandenong Rd #32", locality: "St Kilda" },
  { name: "Queens Way/Queens Way #31", locality: "Queens Way" },
  { name: "St Kilda Junction/St Kilda Rd #30", locality: "St Kilda Junction" },
  { name: "Union St/St Kilda Rd #29", locality: "Melbourne City" },
  { name: "Lorne St/St Kilda Rd #27", locality: "Melbourne City" },
  { name: "Beatrice St/St Kilda Rd #26", locality: "Melbourne City" },
  { name: "Commercial Rd/St Kilda Rd #25", locality: "Melbourne City" },
  { name: "Leopold St/St Kilda Rd #24", locality: "Melbourne City" },
  { name: "Arthur St/St Kilda Rd #23", locality: "Melbourne City" },
  { name: "Toorak Rd/St Kilda Rd #22", locality: "Melbourne City" },
  { name: "Anzac Station/St Kilda Rd #20", locality: "Anzac Station" },
  { name: "Shrine of Remembrance/St Kilda Rd #19", locality: "Shrine of Remembrance" },
  { name: "Grant St-Police Memorial/St Kilda Rd #17", locality: "Southbank" },
  { name: "Arts Precinct/St Kilda Rd #14", locality: "Arts Precinct" },
  { name: "Federation Square/Swanston St #13", locality: "Melbourne City" },
  { name: "City Square/Swanston St #11", locality: "Melbourne City" },
  { name: "Bourke Street Mall/Swanston St #10", locality: "Melbourne City" },
  { name: "Melbourne Central Station/Swanston St #8", locality: "Melbourne City" },
  { name: "RMIT University/Swanston St #7", locality: "Melbourne City" },
  { name: "Queensberry St/Swanston St #4", locality: "Carlton" },
  { name: "Lincoln Square/Swanston St #3", locality: "Carlton" },
  { name: "Melbourne University/Swanston St #1", locality: "Melbourne University" },
];

const ROUTE_64_ROUTE_LINE: [number, number][] = [
  [-37.79775, 144.96102], // Melbourne University
  [-37.7962, 144.9631],
  [-37.7935, 144.9632],
  [-37.8093, 144.9631], // Melbourne Central / Swanston
  [-37.8139, 144.9631],
  [-37.8169, 144.9672], // Federation Square / Flinders
  [-37.8219, 144.9687],
  [-37.8298, 144.9686], // Arts Centre / Shrine
  [-37.8377, 144.9732], // Anzac
  [-37.8449, 144.9785], // St Kilda Junction
  [-37.8518, 144.9874],
  [-37.8603, 145.0006],
  [-37.8677, 145.0119],
  [-37.8738, 145.0213], // Hawthorn / Dandenong intersection
  [-37.8796, 145.0210],
  [-37.8852, 145.0206],
  [-37.8910, 145.0201],
  [-37.8971, 145.0196],
  [-37.9014, 145.01875], // North Rd
  [-37.90378, 145.01881], // Taylor St
  [-37.9076, 145.0187],
  [-37.9112, 145.01855], // East Brighton
];

function interpolateStopsAlongPolyline(
  polyline: [number, number][],
  stopCount: number,
): [number, number][] {
  if (polyline.length === 0 || stopCount <= 0) return [];
  if (polyline.length === 1) return Array.from({ length: stopCount }, () => polyline[0]);

  const cumulativeDistances = [0];
  for (let index = 1; index < polyline.length; index += 1) {
    cumulativeDistances.push(
      cumulativeDistances[index - 1] + getDistanceInMetres(polyline[index - 1], polyline[index]),
    );
  }

  const totalDistance = cumulativeDistances[cumulativeDistances.length - 1] ?? 0;
  if (totalDistance <= 0) return Array.from({ length: stopCount }, () => polyline[0]);

  return Array.from({ length: stopCount }, (_, index) => {
    if (index === 0) return polyline[0];
    if (index === stopCount - 1) return polyline[polyline.length - 1];

    const targetDistance = (index / (stopCount - 1)) * totalDistance;
    let segmentIndex = 1;
    while (segmentIndex < cumulativeDistances.length && cumulativeDistances[segmentIndex] < targetDistance) {
      segmentIndex += 1;
    }

    const previousDistance = cumulativeDistances[segmentIndex - 1] ?? 0;
    const nextDistance = cumulativeDistances[segmentIndex] ?? totalDistance;
    const segmentProgress =
      nextDistance === previousDistance ? 0 : (targetDistance - previousDistance) / (nextDistance - previousDistance);
    const [startLat, startLng] = polyline[segmentIndex - 1] ?? polyline[0];
    const [endLat, endLng] = polyline[segmentIndex] ?? polyline[polyline.length - 1];

    return [
      startLat + (endLat - startLat) * segmentProgress,
      startLng + (endLng - startLng) * segmentProgress,
    ];
  });
}

function normaliseSurfaceRouteLabel(routeLabel: string) {
  const trimmed = routeLabel.trim();
  const numericMatch = trimmed.match(/^0*(\d+[A-Z]?)$/i);
  if (numericMatch?.[1]) {
    return numericMatch[1].toUpperCase();
  }
  return trimmed.toUpperCase();
}

function createLiveTramIcon(tram: LiveTram) {
  const routeLabel = normaliseSurfaceRouteLabel(tram.route).slice(0, 6);
  const destinationLabel = (tram.destination ?? "Live tram")
    .replace(/^route\s+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18);
  const rotation = typeof tram.heading === "number" && Number.isFinite(tram.heading) ? tram.heading : 0;
  const { fillColor, strokeColor } = getSurfaceRouteColors(routeLabel, "#00ab8e", "#065f56");

  return L.divIcon({
      html: `
        <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;inset:0;border-radius:50%;background:${fillColor};opacity:0.18;animation:ping 2.2s infinite;"></div>
          <div style="
            width:22px;
            height:22px;
            border-radius:9999px;
            background:${fillColor};
            border:2px solid ${strokeColor};
            box-shadow:0 4px 14px rgba(0,0,0,0.55);
            display:flex;
            align-items:center;
            justify-content:center;
            transform:rotate(${rotation}deg);
          ">
          <img src="${tramIcon}" alt="" style="width:11px;height:11px;object-fit:contain;filter:brightness(0) invert(1);" />
        </div>
        <div style="
          position:absolute;
          top:-6px;
          left:50%;
          transform:translateX(-50%);
            background:#0f172a;
            color:white;
            font-size:8px;
            font-weight:700;
            padding:2px 5px;
            border-radius:6px;
            border:1px solid ${strokeColor};
            box-shadow:0 4px 10px rgba(0,0,0,0.4);
            white-space:nowrap;
          ">
            ${routeLabel}
          </div>
        <div style="
          position:absolute;
          left:50%;
          bottom:-14px;
          transform:translateX(-50%);
          background:rgba(15,23,42,0.92);
          color:white;
          font-size:8px;
          font-weight:700;
          padding:2px 5px;
          border-radius:9999px;
          border:1px solid rgba(255,255,255,0.14);
          box-shadow:0 4px 10px rgba(0,0,0,0.35);
          white-space:nowrap;
          max-width:110px;
          overflow:hidden;
          text-overflow:ellipsis;
        ">
          ${destinationLabel}
        </div>
      </div>
    `,
    className: "bg-transparent border-none",
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -18],
  });
}

function getSurfaceRouteColors(routeLabel: string, fallbackFillColor: string, fallbackStrokeColor: string) {
  switch (normaliseSurfaceRouteLabel(routeLabel)) {
    case "1":
      return { fillColor: "#b5bd00", strokeColor: "#7e8500" };
    case "3":
      return { fillColor: "#8dc8e8", strokeColor: "#4f88a8" };
    case "5":
      return { fillColor: "#d50032", strokeColor: "#8f0022" };
    case "6":
      return { fillColor: "#01426a", strokeColor: "#012c47" };
    case "11":
      return { fillColor: "#6eceb2", strokeColor: "#3f8f7d" };
    case "12":
      return { fillColor: "#007e92", strokeColor: "#005866" };
    case "16":
      return { fillColor: "#fbd872", strokeColor: "#b8952f" };
    case "19":
      return { fillColor: "#8a1b61", strokeColor: "#5d1242" };
    case "30":
      return { fillColor: "#534f96", strokeColor: "#3b386c" };
    case "35":
      return { fillColor: "#6b3529", strokeColor: "#4a251d" };
    case "48":
      return { fillColor: "#333434", strokeColor: "#1e1f20" };
    case "57":
      return { fillColor: "#00c1d5", strokeColor: "#008a99" };
    case "58":
      return { fillColor: "#969696", strokeColor: "#666666" };
    case "59":
      return { fillColor: "#00653a", strokeColor: "#004427" };
    case "64":
      return { fillColor: "#00ab8e", strokeColor: "#007866" };
    case "67":
      return { fillColor: "#956c58", strokeColor: "#6b4c3d" };
    case "70":
      return { fillColor: "#f59bbb", strokeColor: "#c56d8c" };
    case "72":
      return { fillColor: "#9abeaa", strokeColor: "#6d8d7c" };
    case "75":
      return { fillColor: "#00a9e0", strokeColor: "#00779e" };
    case "78":
      return { fillColor: "#a0a0d6", strokeColor: "#6f6fa0" };
    case "82":
      return { fillColor: "#d2d755", strokeColor: "#9a9f2e" };
    case "86":
      return { fillColor: "#ffb500", strokeColor: "#c58800" };
    case "96":
      return { fillColor: "#c6007e", strokeColor: "#8b0058" };
    case "109":
      return { fillColor: "#e87722", strokeColor: "#aa5312" };
    default:
      return { fillColor: fallbackFillColor, strokeColor: fallbackStrokeColor };
  }
}

const ROUTE_64_EASTBOUND_SURFACE_STOPS: SurfaceStop[] = interpolateStopsAlongPolyline(
  ROUTE_64_ROUTE_LINE,
  ROUTE_64_EASTBOUND_STOP_DATA.length,
).map((position, index) => ({
  id: `route-64-east-brighton-${index + 1}`,
  name: ROUTE_64_EASTBOUND_STOP_DATA[index]?.name ?? `Route 64 stop ${index + 1}`,
  locality: ROUTE_64_EASTBOUND_STOP_DATA[index]?.locality ?? "Melbourne",
  position,
  subtitle: "Route 64 tram stop",
  modes: ["tram"],
  routeLabel: "64",
  departures: ROUTE_64_EASTBOUND_DEPARTURES,
}));

const ROUTE_64_WESTBOUND_SURFACE_STOPS: SurfaceStop[] = interpolateStopsAlongPolyline(
  [...ROUTE_64_ROUTE_LINE].reverse() as [number, number][],
  ROUTE_64_WESTBOUND_STOP_DATA.length,
).map((position, index) => ({
  id: `route-64-melbourne-university-${index + 1}`,
  name: ROUTE_64_WESTBOUND_STOP_DATA[index]?.name ?? `Route 64 return stop ${index + 1}`,
  locality: ROUTE_64_WESTBOUND_STOP_DATA[index]?.locality ?? "Melbourne",
  position,
  subtitle: "Route 64 tram stop",
  modes: ["tram"],
  routeLabel: "64",
  departures: ROUTE_64_WESTBOUND_DEPARTURES,
}));

const ROUTE_16_KEW_DEPARTURES: SurfaceStopDeparture[] = [
  { route: "16", destination: "Kew", departureLabel: "3 min", statusLabel: "Tram due", note: "Eastbound" },
  { route: "16", destination: "Melbourne University", departureLabel: "8 min", statusLabel: "Scheduled", note: "Westbound" },
  { route: "16", destination: "Kew", departureLabel: "16 min", statusLabel: "Scheduled", note: "Via Glenferrie Rd" },
];

const ROUTE_16_UNIVERSITY_DEPARTURES: SurfaceStopDeparture[] = [
  { route: "16", destination: "Melbourne University", departureLabel: "2 min", statusLabel: "Tram due", note: "Westbound" },
  { route: "16", destination: "Kew", departureLabel: "9 min", statusLabel: "Scheduled", note: "Eastbound" },
  { route: "16", destination: "Melbourne University", departureLabel: "18 min", statusLabel: "Scheduled", note: "Via Swanston St" },
];

const ROUTE_16_KEW_STOP_DATA: Array<{ name: string; locality: string }> = [
  { name: "Melbourne University/Swanston St #1", locality: "Carlton" },
  { name: "Lincoln Square/Swanston St #3", locality: "Carlton" },
  { name: "Queensberry St/Swanston St #4", locality: "Melbourne City" },
  { name: "RMIT University/Swanston St #7", locality: "Melbourne City" },
  { name: "Melbourne Central Station/Swanston St #8", locality: "Melbourne City" },
  { name: "Bourke Street Mall/Swanston St #10", locality: "Melbourne City" },
  { name: "City Square/Swanston St #11", locality: "Melbourne City" },
  { name: "Federation Square/Swanston St #13", locality: "Melbourne City" },
  { name: "Arts Precinct/St Kilda Rd #14", locality: "Southbank" },
  { name: "Grant St-Police Memorial/St Kilda Rd #17", locality: "Southbank" },
  { name: "Shrine of Remembrance/St Kilda Rd #19", locality: "Melbourne City" },
  { name: "Anzac Station/St Kilda Rd #20", locality: "Melbourne City" },
  { name: "Toorak Rd/St Kilda Rd #22", locality: "Melbourne City" },
  { name: "Arthur St/St Kilda Rd #23", locality: "South Melbourne" },
  { name: "Leopold St/St Kilda Rd #24", locality: "South Melbourne" },
  { name: "Moubray St/St Kilda Rd #26", locality: "South Melbourne" },
  { name: "High St/St Kilda Rd #27", locality: "St Kilda" },
  { name: "Union St/St Kilda Rd #29", locality: "St Kilda" },
  { name: "St Kilda Junction/St Kilda Rd #30", locality: "St Kilda Junction" },
  { name: "St Kilda Rd/Fitzroy St #131", locality: "St Kilda" },
  { name: "Princes St/Fitzroy St #132", locality: "St Kilda" },
  { name: "Canterbury Rd/Fitzroy St #133", locality: "St Kilda" },
  { name: "Park St/Fitzroy St #134", locality: "St Kilda" },
  { name: "Jacka Bvd/Fitzroy St #135", locality: "St Kilda" },
  { name: "Alfred Square/The Esplanade #136", locality: "St Kilda" },
  { name: "Luna Park/The Esplanade #138", locality: "St Kilda" },
  { name: "Barkly St/Carlisle St #33", locality: "St Kilda" },
  { name: "Greeves St/Carlisle St #34", locality: "St Kilda" },
  { name: "St Kilda Rd/Carlisle St #35", locality: "St Kilda" },
  { name: "St Kilda Town Hall/Carlisle St #36", locality: "St Kilda Town Hall" },
  { name: "Chapel St/Carlisle St #37", locality: "Balaclava" },
  { name: "Balaclava Station/Carlisle St #38", locality: "Balaclava Station" },
  { name: "Orange Gr/Carlisle St #39", locality: "Balaclava" },
  { name: "Hotham St/Carlisle St #40", locality: "St Kilda East" },
  { name: "Empress Rd/Balaclava Rd #41", locality: "Caulfield North" },
  { name: "Sidwell Ave/Balaclava Rd #42", locality: "Caulfield North" },
  { name: "Orrong Rd/Balaclava Rd #43", locality: "Caulfield North" },
  { name: "Ontario St/Balaclava Rd #44", locality: "Caulfield North" },
  { name: "Kent Gr/Balaclava Rd #45", locality: "Caulfield North" },
  { name: "Kooyong Rd/Balaclava Rd #46", locality: "Caulfield North" },
  { name: "Elmhurst Rd/Balaclava Rd #47", locality: "Caulfield North" },
  { name: "Hawthorn Rd/Balaclava Rd #51", locality: "Caulfield North" },
  { name: "Inkerman Rd/Hawthorn Rd #50", locality: "Caulfield North" },
  { name: "Wanda Rd/Hawthorn Rd #49", locality: "Caulfield North" },
  { name: "48A-Dandenong Rd/Hawthorn Rd", locality: "Malvern" },
  { name: "Hawthorn Rd/Dandenong Rd #48", locality: "Malvern" },
  { name: "Malvern Railway Station/Glenferrie Rd #53", locality: "Malvern Railway Station" },
  { name: "Wattletree Rd/Glenferrie Rd #54", locality: "Malvern" },
  { name: "Llaneast St/Glenferrie Rd #55", locality: "Malvern" },
  { name: "Malvern Tram Depot/Glenferrie Rd #56", locality: "Malvern Tram Depot" },
  { name: "High St/Glenferrie Rd #57", locality: "Malvern" },
  { name: "Bell St/Glenferrie Rd #58", locality: "Malvern" },
  { name: "Malvern Rd/Glenferrie Rd #59", locality: "Malvern" },
  { name: "Stonnington Pl/Glenferrie Rd #60", locality: "Malvern" },
  { name: "Moorakyne Ave/Glenferrie Rd #61", locality: "Malvern" },
  { name: "Mayfield Ave/Glenferrie Rd #62", locality: "Malvern" },
  { name: "Toorak Rd/Glenferrie Rd #63", locality: "Kooyong" },
  { name: "Mernda Rd/Glenferrie Rd #64", locality: "Toorak" },
  { name: "Warra St/Glenferrie Rd #65", locality: "Toorak" },
  { name: "Kooyong Tennis Centre/Glenferrie Rd #66", locality: "Kooyong Tennis Centre" },
  { name: "Gardiner Rd/Glenferrie Rd #67", locality: "Hawthorn" },
  { name: "Callantina Rd/Glenferrie Rd #68", locality: "Hawthorn" },
  { name: "South St/Glenferrie Rd #69", locality: "Hawthorn" },
  { name: "Riversdale Rd/Glenferrie Rd #70", locality: "Hawthorn" },
  { name: "Urquhart St/Glenferrie Rd #71", locality: "Hawthorn" },
  { name: "Manningtree Rd/Glenferrie Rd #72", locality: "Hawthorn" },
  { name: "Burwood Rd/Glenferrie Rd #73", locality: "Hawthorn" },
  { name: "Glenferrie Station/Glenferrie Rd #74", locality: "Glenferrie Station" },
  { name: "Chrystobel Cres/Glenferrie Rd #75", locality: "Hawthorn" },
  { name: "Johnson St/Glenferrie Rd #76", locality: "Hawthorn" },
  { name: "Barkers Rd/Glenferrie Rd #77", locality: "Hawthorn" },
  { name: "Fitzwilliam St/Glenferrie Rd #78", locality: "Hawthorn" },
  { name: "Wellington St/Glenferrie Rd #79", locality: "Hawthorn" },
  { name: "Cotham Rd/Glenferrie Rd #80", locality: "Kew" },
];

const ROUTE_16_UNIVERSITY_STOP_DATA: Array<{ name: string; locality: string }> = [
  { name: "Cotham Rd/Glenferrie Rd #80", locality: "Hawthorn" },
  { name: "Wellington St/Glenferrie Rd #79", locality: "Hawthorn" },
  { name: "Fitzwilliam St/Glenferrie Rd #78", locality: "Hawthorn" },
  { name: "Barkers Rd/Glenferrie Rd #77", locality: "Hawthorn" },
  { name: "Johnson St/Glenferrie Rd #76", locality: "Hawthorn" },
  { name: "Liddiard St/Glenferrie Rd #75", locality: "Hawthorn" },
  { name: "Glenferrie Railway Station/Glenferrie Rd #74", locality: "Glenferrie Railway Station" },
  { name: "Burwood Rd/Glenferrie Rd #73", locality: "Hawthorn" },
  { name: "Manningtree Rd/Glenferrie Rd #72", locality: "Hawthorn" },
  { name: "Urquhart St/Glenferrie Rd #71", locality: "Hawthorn" },
  { name: "Riversdale Rd/Glenferrie Rd #70", locality: "Hawthorn" },
  { name: "South St/Glenferrie Rd #69", locality: "Hawthorn" },
  { name: "Callantina Rd/Glenferrie Rd #68", locality: "Hawthorn" },
  { name: "Gardiner Rd/Glenferrie Rd #67", locality: "Kooyong" },
  { name: "Vision Australia/Glenferrie Rd #66", locality: "Vision Australia" },
  { name: "Kooyong Railway Station/Glenferrie Rd #65", locality: "Kooyong Railway Station" },
  { name: "Power St/Glenferrie Rd #64", locality: "Kooyong" },
  { name: "Toorak Rd/Glenferrie Rd #63", locality: "Malvern" },
  { name: "Mayfield Ave/Glenferrie Rd #62", locality: "Malvern" },
  { name: "Moorakyne Ave/Glenferrie Rd #61", locality: "Malvern" },
  { name: "Stonnington Pl/Glenferrie Rd #60", locality: "Malvern" },
  { name: "Malvern Rd/Glenferrie Rd #59", locality: "Malvern" },
  { name: "Sorrett Ave/Glenferrie Rd #58", locality: "Malvern" },
  { name: "High St/Glenferrie Rd #57", locality: "Malvern" },
  { name: "Malvern Tram Depot/Glenferrie Rd #56", locality: "Malvern Tram Depot" },
  { name: "Edsall St/Glenferrie Rd #55", locality: "Malvern" },
  { name: "Wattletree Rd/Glenferrie Rd #54", locality: "Malvern" },
  { name: "Malvern Railway Station/Glenferrie Rd #53", locality: "Malvern Railway Station" },
  { name: "Dandenong Rd/Glenferrie Rd #52", locality: "Malvern" },
  { name: "Hawthorn Rd/Dandenong Rd #48", locality: "Caulfield North" },
  { name: "Arthur St/Hawthorn Rd #49", locality: "Caulfield North" },
  { name: "Inkerman Rd/Hawthorn Rd #50", locality: "Caulfield North" },
  { name: "Balaclava Rd/Hawthorn Rd #51", locality: "Caulfield North" },
  { name: "Caulfield Junior College/Balaclava Rd #47", locality: "Caulfield Junior College" },
  { name: "Kooyong Rd/Balaclava Rd #46", locality: "Caulfield North" },
  { name: "Kent Gr/Balaclava Rd #45", locality: "Caulfield North" },
  { name: "Otira Rd/Balaclava Rd #44", locality: "Caulfield North" },
  { name: "Orrong Rd/Balaclava Rd #43", locality: "St Kilda East" },
  { name: "Allan Rd/Balaclava Rd #42", locality: "St Kilda East" },
  { name: "Vadlure Ave/Balaclava Rd #41", locality: "St Kilda East" },
  { name: "Hotham St/Balaclava Rd #40", locality: "St Kilda" },
  { name: "Carlisle Ave/Carlisle St #39", locality: "Balaclava" },
  { name: "Balaclava Station/Carlisle St #38", locality: "Balaclava Station" },
  { name: "Chapel St/Carlisle St #37", locality: "St Kilda" },
  { name: "St Kilda Town Hall/Carlisle St #36", locality: "St Kilda Town Hall" },
  { name: "Brighton Rd/Carlisle St #35", locality: "St Kilda" },
  { name: "Mitchell St/Carlisle St #34", locality: "St Kilda" },
  { name: "Barkly St/Carlisle St #33", locality: "St Kilda" },
  { name: "Havelock St/Carlisle St #32", locality: "St Kilda" },
  { name: "Luna Park/The Esplanade #138", locality: "Luna Park" },
  { name: "Alfred Square/The Esplanade #136", locality: "St Kilda" },
  { name: "Acland St/Fitzroy St #135", locality: "St Kilda" },
  { name: "Park St/Fitzroy St #134", locality: "St Kilda" },
  { name: "Canterbury Rd/Fitzroy St #133", locality: "St Kilda" },
  { name: "Princes St/Fitzroy St #132", locality: "St Kilda" },
  { name: "St Kilda Rd/Fitzroy St #131", locality: "St Kilda Junction" },
  { name: "St Kilda Junction/St Kilda Rd #30", locality: "St Kilda Junction" },
  { name: "Union St/St Kilda Rd #29", locality: "Melbourne City" },
  { name: "Lorne St/St Kilda Rd #27", locality: "Melbourne City" },
  { name: "Beatrice St/St Kilda Rd #26", locality: "Melbourne City" },
  { name: "Commercial Rd/St Kilda Rd #25", locality: "Melbourne City" },
  { name: "Leopold St/St Kilda Rd #24", locality: "Melbourne City" },
  { name: "Arthur St/St Kilda Rd #23", locality: "Melbourne City" },
  { name: "Toorak Rd/St Kilda Rd #22", locality: "Melbourne City" },
  { name: "Anzac Station/St Kilda Rd #20", locality: "Anzac Station" },
  { name: "Shrine of Remembrance/St Kilda Rd #19", locality: "Shrine of Remembrance" },
  { name: "Grant St-Police Memorial/St Kilda Rd #17", locality: "Southbank" },
  { name: "Arts Precinct/St Kilda Rd #14", locality: "Arts Precinct" },
  { name: "Federation Square/Swanston St #13", locality: "Federation Square" },
  { name: "City Square/Swanston St #11", locality: "Melbourne City" },
  { name: "Bourke Street Mall/Swanston St #10", locality: "Melbourne City" },
  { name: "Melbourne Central Station/Swanston St #8", locality: "Melbourne Central Station" },
  { name: "RMIT University/Swanston St #7", locality: "RMIT University" },
  { name: "Queensberry St/Swanston St #4", locality: "Carlton" },
  { name: "Lincoln Square/Swanston St #3", locality: "Lincoln Square" },
  { name: "Melbourne University/Swanston St #1", locality: "Melbourne University" },
];

const ROUTE_16_ROUTE_LINE: [number, number][] = [
  [-37.79775, 144.96102], // Melbourne University
  [-37.8093, 144.9631],
  [-37.8169, 144.9672], // Federation Square
  [-37.8298, 144.9686],
  [-37.8377, 144.9732], // Anzac
  [-37.8449, 144.9785], // St Kilda Junction
  [-37.8609, 144.9790], // Fitzroy / Acland / Esplanade
  [-37.8682, 144.9820], // Carlisle
  [-37.8726, 144.9904], // Balaclava Rd
  [-37.8764, 145.0022],
  [-37.8802, 145.0146], // Hawthorn Rd / Dandenong
  [-37.8756, 145.0200], // Glenferrie Rd south
  [-37.8641, 145.0202],
  [-37.8500, 145.0210],
  [-37.8379, 145.0218], // Toorak / Kooyong
  [-37.8229, 145.0224],
  [-37.8073, 145.0233], // Glenferrie
  [-37.7999, 145.0240], // Kew / Cotham
];

const ROUTE_16_KEW_SURFACE_STOPS: SurfaceStop[] = interpolateStopsAlongPolyline(
  ROUTE_16_ROUTE_LINE,
  ROUTE_16_KEW_STOP_DATA.length,
).map((position, index) => ({
  id: `route-16-kew-${index + 1}`,
  name: ROUTE_16_KEW_STOP_DATA[index]?.name ?? `Route 16 stop ${index + 1}`,
  locality: ROUTE_16_KEW_STOP_DATA[index]?.locality ?? "Melbourne",
  position,
  subtitle: "Route 16 tram stop",
  modes: ["tram"],
  routeLabel: "16",
  departures: ROUTE_16_KEW_DEPARTURES,
}));

const ROUTE_16_UNIVERSITY_SURFACE_STOPS: SurfaceStop[] = interpolateStopsAlongPolyline(
  [...ROUTE_16_ROUTE_LINE].reverse() as [number, number][],
  ROUTE_16_UNIVERSITY_STOP_DATA.length,
).map((position, index) => ({
  id: `route-16-university-${index + 1}`,
  name: ROUTE_16_UNIVERSITY_STOP_DATA[index]?.name ?? `Route 16 return stop ${index + 1}`,
  locality: ROUTE_16_UNIVERSITY_STOP_DATA[index]?.locality ?? "Melbourne",
  position,
  subtitle: "Route 16 tram stop",
  modes: ["tram"],
  routeLabel: "16",
  departures: ROUTE_16_UNIVERSITY_DEPARTURES,
}));

const ROUTE_3_EAST_MALVERN_DEPARTURES: SurfaceStopDeparture[] = [
  { route: "3", destination: "East Malvern", departureLabel: "4 min", statusLabel: "Tram due", note: "Eastbound" },
  { route: "3", destination: "Melbourne University", departureLabel: "10 min", statusLabel: "Scheduled", note: "Westbound" },
  { route: "3", destination: "East Malvern", departureLabel: "19 min", statusLabel: "Scheduled", note: "Via Balaclava Rd" },
];

const ROUTE_3_UNIVERSITY_DEPARTURES: SurfaceStopDeparture[] = [
  { route: "3", destination: "Melbourne University", departureLabel: "3 min", statusLabel: "Tram due", note: "Westbound" },
  { route: "3", destination: "East Malvern", departureLabel: "9 min", statusLabel: "Scheduled", note: "Eastbound" },
  { route: "3", destination: "Melbourne University", departureLabel: "18 min", statusLabel: "Scheduled", note: "Via Swanston St" },
];

const ROUTE_3_EAST_MALVERN_STOP_DATA: Array<{ name: string; locality: string }> = [
  { name: "Melbourne University/Swanston St #1", locality: "Carlton" },
  { name: "Lincoln Square/Swanston St #3", locality: "Carlton" },
  { name: "Queensberry St/Swanston St #4", locality: "Melbourne City" },
  { name: "RMIT University/Swanston St #7", locality: "Melbourne City" },
  { name: "Melbourne Central Station/Swanston St #8", locality: "Melbourne City" },
  { name: "Bourke Street Mall/Swanston St #10", locality: "Melbourne City" },
  { name: "City Square/Swanston St #11", locality: "Melbourne City" },
  { name: "Federation Square/Swanston St #13", locality: "Melbourne City" },
  { name: "Arts Precinct/St Kilda Rd #14", locality: "Southbank" },
  { name: "Grant St-Police Memorial/St Kilda Rd #17", locality: "Southbank" },
  { name: "Shrine of Remembrance/St Kilda Rd #19", locality: "Melbourne City" },
  { name: "Anzac Station/St Kilda Rd #20", locality: "Melbourne City" },
  { name: "Toorak Rd/St Kilda Rd #22", locality: "Melbourne City" },
  { name: "Arthur St/St Kilda Rd #23", locality: "South Melbourne" },
  { name: "Leopold St/St Kilda Rd #24", locality: "South Melbourne" },
  { name: "Commercial Rd/St Kilda Rd #25", locality: "South Melbourne" },
  { name: "Moubray St/St Kilda Rd #26", locality: "South Melbourne" },
  { name: "High St/St Kilda Rd #27", locality: "St Kilda" },
  { name: "Union St/St Kilda Rd #29", locality: "St Kilda" },
  { name: "St Kilda Junction/St Kilda Rd #30", locality: "St Kilda Junction" },
  { name: "Barkly St/St Kilda Rd #31", locality: "St Kilda" },
  { name: "Alma Rd/St Kilda Rd #32", locality: "St Kilda" },
  { name: "Argyle St/St Kilda Rd #33", locality: "St Kilda" },
  { name: "Inkerman St/St Kilda Rd #34", locality: "St Kilda" },
  { name: "Carlisle St/St Kilda Rd #35", locality: "St Kilda" },
  { name: "St Kilda Town Hall/Carlisle St #36", locality: "St Kilda Town Hall" },
  { name: "Chapel St/Carlisle St #37", locality: "Balaclava" },
  { name: "Balaclava Station/Carlisle St #38", locality: "Balaclava Station" },
  { name: "Orange Gr/Carlisle St #39", locality: "Balaclava" },
  { name: "Hotham St/Carlisle St #40", locality: "St Kilda East" },
  { name: "Empress Rd/Balaclava Rd #41", locality: "Caulfield North" },
  { name: "Sidwell Ave/Balaclava Rd #42", locality: "Caulfield North" },
  { name: "Orrong Rd/Balaclava Rd #43", locality: "Caulfield North" },
  { name: "Ontario St/Balaclava Rd #44", locality: "Caulfield North" },
  { name: "Kent Gr/Balaclava Rd #45", locality: "Caulfield North" },
  { name: "Kooyong Rd/Balaclava Rd #46", locality: "Caulfield North" },
  { name: "Elmhurst Rd/Balaclava Rd #47", locality: "Caulfield North" },
  { name: "Hawthorn Rd/Balaclava Rd #51", locality: "Caulfield North" },
  { name: "Caulfield Park Bowling Club/Balaclava Rd #52", locality: "Caulfield Park Bowling Club" },
  { name: "Caulfield Park/Balaclava Rd #53", locality: "Caulfield Park" },
  { name: "Kambrook Rd/Balaclava Rd #54", locality: "Caulfield North" },
  { name: "Normanby Rd/Balaclava Rd #55", locality: "Caulfield North" },
  { name: "Caulfield Racecourse/Normanby Rd #56", locality: "Caulfield Racecourse" },
  { name: "Caulfield Railway Station/Derby Rd #57", locality: "Caulfield Railway Station" },
  { name: "Dandenong Rd/Derby Rd #58", locality: "Caulfield North" },
  { name: "Dandenong Rd/Waverley Rd #59", locality: "Malvern East" },
  { name: "Burke Rd/Waverley Rd #60", locality: "Malvern East" },
  { name: "Tennyson St/Waverley Rd #61", locality: "Malvern East" },
  { name: "The Avenue/Waverley Rd #62", locality: "Malvern East" },
  { name: "Oak Gr/Waverley Rd #63", locality: "Malvern East" },
  { name: "Darling Rd/Waverley Rd #64", locality: "Malvern East" },
];

const ROUTE_3_UNIVERSITY_STOP_DATA: Array<{ name: string; locality: string }> = [
  { name: "Darling Rd/Waverley Rd #64", locality: "Malvern East" },
  { name: "Hughes St/Waverley Rd #63", locality: "Malvern East" },
  { name: "Macgregor St/Waverley Rd #62", locality: "Malvern East" },
  { name: "Tennyson St/Waverley Rd #61", locality: "Malvern East" },
  { name: "Burke Rd/Waverley Rd #60", locality: "Caulfield East" },
  { name: "Dandenong Rd/Waverley Rd #59", locality: "Caulfield East" },
  { name: "Caulfield Railway Station/Derby Rd #57", locality: "Caulfield Railway Station" },
  { name: "Caulfield Racecourse/Normanby Rd #56", locality: "Caulfield Racecourse" },
  { name: "Balaclava Rd/Normanby Rd #55", locality: "Caulfield East" },
  { name: "Kambrook Rd/Balaclava Rd #54", locality: "Caulfield North" },
  { name: "Caulfield Park/Balaclava Rd #53", locality: "Caulfield Park" },
  { name: "Caulfield Park Bowling Club/Balaclava Rd #52", locality: "Caulfield Park Bowling Club" },
  { name: "Hawthorn Rd/Balaclava Rd #51", locality: "Caulfield North" },
  { name: "Caulfield Junior College/Balaclava Rd #47", locality: "Caulfield Junior College" },
  { name: "Kooyong Rd/Balaclava Rd #46", locality: "Caulfield North" },
  { name: "Kent Gr/Balaclava Rd #45", locality: "Caulfield North" },
  { name: "Otira Rd/Balaclava Rd #44", locality: "Caulfield North" },
  { name: "Orrong Rd/Balaclava Rd #43", locality: "St Kilda East" },
  { name: "Allan Rd/Balaclava Rd #42", locality: "St Kilda East" },
  { name: "Vadlure Ave/Balaclava Rd #41", locality: "St Kilda East" },
  { name: "Hotham St/Balaclava Rd #40", locality: "St Kilda" },
  { name: "Carlisle Ave/Carlisle St #39", locality: "Balaclava" },
  { name: "Balaclava Station/Carlisle St #38", locality: "Balaclava Station" },
  { name: "Chapel St/Carlisle St #37", locality: "St Kilda" },
  { name: "St Kilda Town Hall/Carlisle St #36", locality: "St Kilda Town Hall" },
  { name: "Brighton Rd/Carlisle St #35", locality: "St Kilda" },
  { name: "Carlisle St/St Kilda Rd #35", locality: "St Kilda" },
  { name: "Inkerman St/St Kilda Rd #34", locality: "St Kilda" },
  { name: "Argyle St/St Kilda Rd #33", locality: "St Kilda" },
  { name: "Alma Rd/St Kilda Rd #32", locality: "St Kilda" },
  { name: "Barkly St/St Kilda Rd #31", locality: "St Kilda" },
  { name: "St Kilda Junction/St Kilda Rd #30", locality: "St Kilda Junction" },
  { name: "Union St/St Kilda Rd #29", locality: "Melbourne City" },
  { name: "Lorne St/St Kilda Rd #27", locality: "Melbourne City" },
  { name: "Beatrice St/St Kilda Rd #26", locality: "Melbourne City" },
  { name: "Commercial Rd/St Kilda Rd #25", locality: "Melbourne City" },
  { name: "Leopold St/St Kilda Rd #24", locality: "Melbourne City" },
  { name: "Arthur St/St Kilda Rd #23", locality: "Melbourne City" },
  { name: "Toorak Rd/St Kilda Rd #22", locality: "Melbourne City" },
  { name: "Anzac Station/St Kilda Rd #20", locality: "Anzac Station" },
  { name: "Shrine of Remembrance/St Kilda Rd #19", locality: "Shrine of Remembrance" },
  { name: "Grant St-Police Memorial/St Kilda Rd #17", locality: "Southbank" },
  { name: "Arts Precinct/St Kilda Rd #14", locality: "Arts Precinct" },
  { name: "Federation Square/Swanston St #13", locality: "Federation Square" },
  { name: "City Square/Swanston St #11", locality: "Melbourne City" },
  { name: "Bourke Street Mall/Swanston St #10", locality: "Melbourne City" },
  { name: "Melbourne Central Station/Swanston St #8", locality: "Melbourne Central Station" },
  { name: "RMIT University/Swanston St #7", locality: "RMIT University" },
  { name: "Queensberry St/Swanston St #4", locality: "Carlton" },
  { name: "Lincoln Square/Swanston St #3", locality: "Lincoln Square" },
  { name: "Melbourne University/Swanston St #1", locality: "Melbourne University" },
];

const ROUTE_3_ROUTE_LINE: [number, number][] = [
  [-37.79775, 144.96102], // Melbourne University
  [-37.8093, 144.9631],
  [-37.8169, 144.9672], // Federation Square
  [-37.8298, 144.9686],
  [-37.8377, 144.9732], // Anzac
  [-37.8449, 144.9785], // St Kilda Junction
  [-37.8568, 144.9824], // Carlisle / Balaclava
  [-37.8708, 144.9928], // Balaclava Rd
  [-37.8738, 145.0068], // Caulfield Park / Normanby
  [-37.8774, 145.0181], // Derby / Waverley Rd start
  [-37.8778, 145.0325], // East Malvern
];

const ROUTE_3_EAST_MALVERN_SURFACE_STOPS: SurfaceStop[] = interpolateStopsAlongPolyline(
  ROUTE_3_ROUTE_LINE,
  ROUTE_3_EAST_MALVERN_STOP_DATA.length,
).map((position, index) => ({
  id: `route-3-east-malvern-${index + 1}`,
  name: ROUTE_3_EAST_MALVERN_STOP_DATA[index]?.name ?? `Route 3 stop ${index + 1}`,
  locality: ROUTE_3_EAST_MALVERN_STOP_DATA[index]?.locality ?? "Melbourne",
  position,
  subtitle: "Route 3 tram stop",
  modes: ["tram"],
  routeLabel: "3",
  departures: ROUTE_3_EAST_MALVERN_DEPARTURES,
}));

const ROUTE_3_UNIVERSITY_SURFACE_STOPS: SurfaceStop[] = interpolateStopsAlongPolyline(
  [...ROUTE_3_ROUTE_LINE].reverse() as [number, number][],
  ROUTE_3_UNIVERSITY_STOP_DATA.length,
).map((position, index) => ({
  id: `route-3-university-${index + 1}`,
  name: ROUTE_3_UNIVERSITY_STOP_DATA[index]?.name ?? `Route 3 return stop ${index + 1}`,
  locality: ROUTE_3_UNIVERSITY_STOP_DATA[index]?.locality ?? "Melbourne",
  position,
  subtitle: "Route 3 tram stop",
  modes: ["tram"],
  routeLabel: "3",
  departures: ROUTE_3_UNIVERSITY_DEPARTURES,
}));

const ROUTE_1_SOUTH_MELBOURNE_DEPARTURES: SurfaceStopDeparture[] = [
  { route: "1", destination: "South Melbourne Beach", departureLabel: "2 min", statusLabel: "Tram due", note: "Southbound" },
  { route: "1", destination: "East Coburg", departureLabel: "8 min", statusLabel: "Scheduled", note: "Northbound" },
  { route: "1", destination: "South Melbourne Beach", departureLabel: "15 min", statusLabel: "Scheduled", note: "Via Sturt St" },
];

const ROUTE_1_EAST_COBURG_DEPARTURES: SurfaceStopDeparture[] = [
  { route: "1", destination: "East Coburg", departureLabel: "3 min", statusLabel: "Tram due", note: "Northbound" },
  { route: "1", destination: "South Melbourne Beach", departureLabel: "9 min", statusLabel: "Scheduled", note: "Southbound" },
  { route: "1", destination: "East Coburg", departureLabel: "17 min", statusLabel: "Scheduled", note: "Via Lygon St" },
];

const ROUTE_1_SOUTH_MELBOURNE_STOP_DATA: Array<{ name: string; locality: string }> = [
  { name: "Bell St/Nicholson St #135", locality: "Coburg" },
  { name: "Merribell Ave/Nicholson St #134", locality: "Coburg" },
  { name: "Harding St/Nicholson St #133", locality: "Coburg" },
  { name: "Crozier St/Nicholson St #132", locality: "Coburg" },
  { name: "Rennie St/Nicholson St #131", locality: "Coburg" },
  { name: "The Avenue/Nicholson St #130", locality: "Coburg" },
  { name: "Moreland Rd/Nicholson St #129", locality: "Brunswick" },
  { name: "Moreland Rd/Holmes St #129", locality: "Brunswick East" },
  { name: "Mitchell St/Holmes St #128", locality: "Brunswick East" },
  { name: "Albion St/Holmes St #127", locality: "Brunswick East" },
  { name: "Stewart St/Lygon St #126", locality: "Brunswick East" },
  { name: "Blyth St/Lygon St #125", locality: "Brunswick East" },
  { name: "Victoria St/Lygon St #124", locality: "Brunswick East" },
  { name: "Albert St/Lygon St #123", locality: "Brunswick East" },
  { name: "Glenlyon Rd/Lygon St #122", locality: "Brunswick East" },
  { name: "Weston St/Lygon St #121", locality: "Brunswick" },
  { name: "Brunswick Rd/Lygon St #120", locality: "Carlton North" },
  { name: "Pigdon St/Lygon St #118", locality: "Carlton North" },
  { name: "Richardson St/Lygon St #117", locality: "Carlton North" },
  { name: "Fenwick St/Lygon St #116", locality: "Carlton North" },
  { name: "Melbourne Cemetery/Lygon St #115", locality: "Melbourne Cemetery" },
  { name: "Princes St/Lygon St #114", locality: "Carlton" },
  { name: "Lytton St/Lygon St #113", locality: "Carlton" },
  { name: "Lygon St/Elgin St #112", locality: "Carlton" },
  { name: "Melbourne University/Swanston St #1", locality: "Melbourne University" },
  { name: "Lincoln Square/Swanston St #3", locality: "Lincoln Square" },
  { name: "Queensberry St/Swanston St #4", locality: "Melbourne City" },
  { name: "RMIT University/Swanston St #7", locality: "RMIT University" },
  { name: "Melbourne Central Station/Swanston St #8", locality: "Melbourne Central Station" },
  { name: "Bourke Street Mall/Swanston St #10", locality: "Bourke Street Mall" },
  { name: "City Square/Swanston St #11", locality: "Melbourne City" },
  { name: "Federation Square/Swanston St #13", locality: "Federation Square" },
  { name: "Arts Precinct/St Kilda Rd #14", locality: "Arts Precinct" },
  { name: "Arts Precinct/Sturt St #17", locality: "Arts Precinct" },
  { name: "Grant St/Sturt St #18", locality: "Southbank" },
  { name: "Miles St/Sturt St #19", locality: "Southbank" },
  { name: "Kings Way/Sturt St #20", locality: "South Melbourne" },
  { name: "Dorcas St/Eastern Rd #22", locality: "South Melbourne" },
  { name: "Moray St/Park St #23", locality: "South Melbourne" },
  { name: "Clarendon St/Park St #24", locality: "South Melbourne" },
  { name: "Cecil St/Park St #25", locality: "South Melbourne" },
  { name: "Ferrars St/Park St #26", locality: "South Melbourne" },
  { name: "Montague St/Park St #27", locality: "Albert Park" },
  { name: "Bridport St/Montague St #28", locality: "Albert Park" },
  { name: "Bridport St/Victoria Ave #29", locality: "Albert Park" },
  { name: "Richardson St/Victoria Ave #30", locality: "Albert Park" },
  { name: "Graham St/Victoria Ave #31", locality: "Albert Park" },
  { name: "Beaconsfield Pde/Victoria Ave #32", locality: "Albert Park" },
];

const ROUTE_1_EAST_COBURG_STOP_DATA: Array<{ name: string; locality: string }> = [
  { name: "Beaconsfield Pde/Victoria Ave #32", locality: "Albert Park" },
  { name: "Graham St/Victoria Ave #31", locality: "Albert Park" },
  { name: "Richardson St/Victoria Ave #30", locality: "Albert Park" },
  { name: "Bridport St/Victoria Ave #29", locality: "Albert Park" },
  { name: "Montague St/Bridport St #28", locality: "South Melbourne" },
  { name: "Park St/Montague St #27", locality: "South Melbourne" },
  { name: "Ferrars St/Park St #26", locality: "South Melbourne" },
  { name: "Cecil St/Park St #25", locality: "South Melbourne" },
  { name: "Clarendon St/Park St #24", locality: "South Melbourne" },
  { name: "Moray St/Park St #23", locality: "South Melbourne" },
  { name: "Dorcas St/Eastern Rd #22", locality: "South Melbourne" },
  { name: "Kings Way/Sturt St #20", locality: "Southbank" },
  { name: "Miles St/Sturt St #19", locality: "Southbank" },
  { name: "Grant St/Sturt St #18", locality: "Southbank" },
  { name: "Arts Precinct/Sturt St #17", locality: "Arts Precinct" },
  { name: "Arts Precinct/St Kilda Rd #14", locality: "Arts Precinct" },
  { name: "Federation Square/Swanston St #13", locality: "Federation Square" },
  { name: "City Square/Swanston St #11", locality: "Melbourne City" },
  { name: "Bourke Street Mall/Swanston St #10", locality: "Bourke Street Mall" },
  { name: "Melbourne Central Station/Swanston St #8", locality: "Melbourne Central Station" },
  { name: "RMIT University/Swanston St #7", locality: "RMIT University" },
  { name: "Queensberry St/Swanston St #4", locality: "Carlton" },
  { name: "Lincoln Square/Swanston St #3", locality: "Lincoln Square" },
  { name: "Melbourne University/Swanston St #1", locality: "Melbourne University" },
  { name: "Lygon St/Elgin St #112", locality: "Carlton" },
  { name: "Lytton St/Lygon St #113", locality: "Carlton North" },
  { name: "Princes St/Lygon St #114", locality: "Carlton North" },
  { name: "Melbourne Cemetery/Lygon St #115", locality: "Melbourne Cemetery" },
  { name: "Fenwick St/Lygon St #116", locality: "Carlton North" },
  { name: "Richardson St/Lygon St #117", locality: "Carlton North" },
  { name: "Pigdon St/Lygon St #118", locality: "Brunswick" },
  { name: "Brunswick Rd/Lygon St #120", locality: "Brunswick East" },
  { name: "Weston St/Lygon St #121", locality: "Brunswick East" },
  { name: "Glenlyon Rd/Lygon St #122", locality: "Brunswick East" },
  { name: "Albert St/Lygon St #123", locality: "Brunswick East" },
  { name: "Victoria St/Lygon St #124", locality: "Brunswick East" },
  { name: "Blyth St/Lygon St #125", locality: "Brunswick East" },
  { name: "Stewart St/Lygon St #126", locality: "Brunswick East" },
  { name: "Albion St/Lygon St #127", locality: "Brunswick East" },
  { name: "Mitchell St/Holmes St #128", locality: "Brunswick" },
  { name: "Moreland Rd/Holmes St #129", locality: "Coburg" },
  { name: "The Avenue/Nicholson St #130", locality: "Coburg" },
  { name: "Rennie St/Nicholson St #131", locality: "Coburg" },
  { name: "Crozier St/Nicholson St #132", locality: "Coburg" },
  { name: "Harding St/Nicholson St #133", locality: "Coburg" },
  { name: "Merribell Ave/Nicholson St #134", locality: "Coburg" },
  { name: "Bell St/Nicholson St #135", locality: "Coburg" },
];

const ROUTE_1_ROUTE_LINE: [number, number][] = [
  [-37.7406, 144.9798], // East Coburg / Bell St
  [-37.7524, 144.9801], // Moreland / Nicholson
  [-37.7664, 144.9728], // Holmes / Lygon transition
  [-37.7768, 144.9686], // Brunswick / Carlton North
  [-37.7897, 144.9660], // Melbourne Cemetery / Lygon
  [-37.79775, 144.96102], // Melbourne University
  [-37.8093, 144.9631],
  [-37.8169, 144.9672], // Federation Square
  [-37.8235, 144.9690],
  [-37.8312, 144.9705], // Sturt St
  [-37.8362, 144.9696], // South Melbourne
  [-37.8428, 144.9657], // Park St / Montague
  [-37.8473, 144.9625], // Victoria Ave
];

const ROUTE_1_SOUTH_MELBOURNE_SURFACE_STOPS: SurfaceStop[] = interpolateStopsAlongPolyline(
  ROUTE_1_ROUTE_LINE,
  ROUTE_1_SOUTH_MELBOURNE_STOP_DATA.length,
).map((position, index) => ({
  id: `route-1-south-melbourne-${index + 1}`,
  name: ROUTE_1_SOUTH_MELBOURNE_STOP_DATA[index]?.name ?? `Route 1 stop ${index + 1}`,
  locality: ROUTE_1_SOUTH_MELBOURNE_STOP_DATA[index]?.locality ?? "Melbourne",
  position,
  subtitle: "Route 1 tram stop",
  modes: ["tram"],
  routeLabel: "1",
  departures: ROUTE_1_SOUTH_MELBOURNE_DEPARTURES,
}));

const ROUTE_1_EAST_COBURG_SURFACE_STOPS: SurfaceStop[] = interpolateStopsAlongPolyline(
  [...ROUTE_1_ROUTE_LINE].reverse() as [number, number][],
  ROUTE_1_EAST_COBURG_STOP_DATA.length,
).map((position, index) => ({
  id: `route-1-east-coburg-${index + 1}`,
  name: ROUTE_1_EAST_COBURG_STOP_DATA[index]?.name ?? `Route 1 return stop ${index + 1}`,
  locality: ROUTE_1_EAST_COBURG_STOP_DATA[index]?.locality ?? "Melbourne",
  position,
  subtitle: "Route 1 tram stop",
  modes: ["tram"],
  routeLabel: "1",
  departures: ROUTE_1_EAST_COBURG_DEPARTURES,
}));

const ROUTE_96_ST_KILDA_DEPARTURES: SurfaceStopDeparture[] = [
  { route: "96", destination: "St Kilda Beach", departureLabel: "2 min", statusLabel: "Tram due", note: "Southbound" },
  { route: "96", destination: "East Brunswick", departureLabel: "8 min", statusLabel: "Scheduled", note: "Northbound" },
  { route: "96", destination: "St Kilda Beach", departureLabel: "15 min", statusLabel: "Scheduled", note: "Via Bourke St" },
];

const ROUTE_96_EAST_BRUNSWICK_DEPARTURES: SurfaceStopDeparture[] = [
  { route: "96", destination: "East Brunswick", departureLabel: "3 min", statusLabel: "Tram due", note: "Northbound" },
  { route: "96", destination: "St Kilda Beach", departureLabel: "9 min", statusLabel: "Scheduled", note: "Southbound" },
  { route: "96", destination: "East Brunswick", departureLabel: "18 min", statusLabel: "Scheduled", note: "Via Nicholson St" },
];

const ROUTE_96_ST_KILDA_STOP_DATA: Array<{ name: string; locality: string }> = [
  { name: "Blyth St/Nicholson St #23", locality: "Brunswick East" },
  { name: "Albert St/Nicholson St #22", locality: "Fitzroy North" },
  { name: "Glenlyon Rd/Nicholson St #21", locality: "Fitzroy North" },
  { name: "Miller St/Nicholson St #20", locality: "Fitzroy North" },
  { name: "Holden St/Nicholson St #19", locality: "Fitzroy North" },
  { name: "Scotchmer St/Nicholson St #18", locality: "Fitzroy North" },
  { name: "Reid St/Nicholson St #17", locality: "Fitzroy North" },
  { name: "Freeman St/Nicholson St #16", locality: "Fitzroy North" },
  { name: "Alexandra Pde/Nicholson St #15", locality: "Fitzroy" },
  { name: "Rose St/Nicholson St #14", locality: "Fitzroy" },
  { name: "Johnston St/Nicholson St #13", locality: "Fitzroy" },
  { name: "Moor St/Nicholson St #12", locality: "Fitzroy" },
  { name: "Melbourne Museum/Nicholson St #11", locality: "Melbourne Museum" },
  { name: "Albert St/Nicholson St #10", locality: "Melbourne City" },
  { name: "Spring St/Bourke St #9", locality: "Melbourne City" },
  { name: "Russell St/Bourke St #7", locality: "Melbourne City" },
  { name: "Swanston St/Bourke St #6", locality: "Melbourne City" },
  { name: "Elizabeth St/Bourke St #5", locality: "Melbourne City" },
  { name: "Queen St/Bourke St #4", locality: "Melbourne City" },
  { name: "William St/Bourke St #3", locality: "Melbourne City" },
  { name: "Spencer St/Bourke St #1", locality: "Melbourne City" },
  { name: "Southern Cross Railway Station/Spencer St #122", locality: "Southern Cross Railway Station" },
  { name: "Batman Park/Spencer St #124", locality: "Batman Park" },
  { name: "124A-Casino/MCEC/Clarendon St", locality: "Casino/MCEC" },
  { name: "Port Junction/79 Whiteman St #125", locality: "Port Junction" },
  { name: "City Rd/Light Rail #126", locality: "South Melbourne" },
  { name: "South Melbourne Station/Light Rail #127", locality: "South Melbourne Station" },
  { name: "Albert Park Station/Light Rail #128", locality: "Albert Park Station" },
  { name: "Melbourne Sports and Aquatic Centre/Light Rail #129", locality: "Melbourne Sports and Aquatic Centre" },
  { name: "Middle Park Station/Light Rail #130", locality: "Middle Park Station" },
  { name: "Fraser St/Light Rail #131", locality: "St Kilda" },
  { name: "St Kilda Station/Fitzroy St #132", locality: "St Kilda Station" },
  { name: "Canterbury Rd/Fitzroy St #133", locality: "St Kilda" },
  { name: "Park St/Fitzroy St #134", locality: "St Kilda" },
  { name: "Jacka Bvd/Fitzroy St #135", locality: "St Kilda" },
  { name: "Alfred Square/The Esplanade #136", locality: "St Kilda" },
  { name: "Luna Park/The Esplanade #138", locality: "Luna Park" },
  { name: "Belford St/Acland St #139", locality: "St Kilda" },
];

const ROUTE_96_EAST_BRUNSWICK_STOP_DATA: Array<{ name: string; locality: string }> = [
  { name: "Belford St/Acland St #139", locality: "St Kilda" },
  { name: "Luna Park/The Esplanade #138", locality: "Luna Park" },
  { name: "Alfred Square/The Esplanade #136", locality: "St Kilda" },
  { name: "Acland St/Fitzroy St #135", locality: "St Kilda" },
  { name: "Park St/Fitzroy St #134", locality: "St Kilda" },
  { name: "Canterbury Rd/Fitzroy St #133", locality: "St Kilda" },
  { name: "St Kilda Station/Fitzroy St #132", locality: "St Kilda Station" },
  { name: "Fraser St/Light Rail #131", locality: "Middle Park" },
  { name: "Middle Park Station/Light Rail #130", locality: "Middle Park Station" },
  { name: "Melbourne Sports and Aquatic Centre/Light Rail #129", locality: "Melbourne Sports and Aquatic Centre" },
  { name: "Albert Park Station/Light Rail #128", locality: "Albert Park Station" },
  { name: "South Melbourne Station/Light Rail #127", locality: "South Melbourne Station" },
  { name: "City Rd/Light Rail #126", locality: "Southbank" },
  { name: "Clarendon St/Whiteman St #125", locality: "Casino/MCEC" },
  { name: "Batman Park/Spencer St #124", locality: "Batman Park" },
  { name: "Southern Cross Railway Station/Spencer St #122", locality: "Southern Cross Railway Station" },
  { name: "Spencer St/Bourke St #1", locality: "Melbourne City" },
  { name: "William St/Bourke St #3", locality: "Melbourne City" },
  { name: "Queen St/Bourke St #4", locality: "Melbourne City" },
  { name: "Elizabeth St/Bourke St #5", locality: "Melbourne City" },
  { name: "Swanston St/Bourke St #6", locality: "Melbourne City" },
  { name: "Russell St/Bourke St #7", locality: "Melbourne City" },
  { name: "Spring St/Bourke St #9", locality: "East Melbourne" },
  { name: "Albert St/Nicholson St #10", locality: "Fitzroy" },
  { name: "Melbourne Museum/Nicholson St #11", locality: "Melbourne Museum" },
  { name: "Moor St/Nicholson St #12", locality: "Carlton" },
  { name: "Johnston St/Nicholson St #13", locality: "Carlton" },
  { name: "Rose St/Nicholson St #14", locality: "Carlton" },
  { name: "Alexandra Pde/Nicholson St #15", locality: "Fitzroy North" },
  { name: "Freeman St/Nicholson St #16", locality: "Carlton North" },
  { name: "Reid St/Nicholson St #17", locality: "Carlton North" },
  { name: "Scotchmer St/Nicholson St #18", locality: "Fitzroy" },
  { name: "Brunswick Rd/Nicholson St #19", locality: "Brunswick East" },
  { name: "Miller St/Nicholson St #20", locality: "Brunswick East" },
  { name: "Glenlyon Rd/Nicholson St #21", locality: "Brunswick East" },
  { name: "Albert St/Nicholson St #22", locality: "Brunswick East" },
  { name: "Blyth St/Nicholson St #23", locality: "Brunswick East" },
];

const ROUTE_96_ROUTE_LINE: [number, number][] = [
  [-37.7655, 144.9788], // East Brunswick
  [-37.7796, 144.9783], // Fitzroy North
  [-37.7913, 144.9794], // Nicholson / Museum
  [-37.8111, 144.9689], // Bourke St city
  [-37.8177, 144.9522], // Southern Cross
  [-37.8228, 144.9556], // Whiteman / Clarendon
  [-37.8367, 144.9618], // Light rail
  [-37.8507, 144.9700], // Fitzroy St
  [-37.8670, 144.9817], // Acland / St Kilda Beach
];

const ROUTE_96_ST_KILDA_SURFACE_STOPS: SurfaceStop[] = interpolateStopsAlongPolyline(
  ROUTE_96_ROUTE_LINE,
  ROUTE_96_ST_KILDA_STOP_DATA.length,
).map((position, index) => ({
  id: `route-96-st-kilda-${index + 1}`,
  name: ROUTE_96_ST_KILDA_STOP_DATA[index]?.name ?? `Route 96 stop ${index + 1}`,
  locality: ROUTE_96_ST_KILDA_STOP_DATA[index]?.locality ?? "Melbourne",
  position,
  subtitle: "Route 96 tram stop",
  modes: ["tram"],
  routeLabel: "96",
  departures: ROUTE_96_ST_KILDA_DEPARTURES,
}));

const ROUTE_96_EAST_BRUNSWICK_SURFACE_STOPS: SurfaceStop[] = interpolateStopsAlongPolyline(
  [...ROUTE_96_ROUTE_LINE].reverse() as [number, number][],
  ROUTE_96_EAST_BRUNSWICK_STOP_DATA.length,
).map((position, index) => ({
  id: `route-96-east-brunswick-${index + 1}`,
  name: ROUTE_96_EAST_BRUNSWICK_STOP_DATA[index]?.name ?? `Route 96 return stop ${index + 1}`,
  locality: ROUTE_96_EAST_BRUNSWICK_STOP_DATA[index]?.locality ?? "Melbourne",
  position,
  subtitle: "Route 96 tram stop",
  modes: ["tram"],
  routeLabel: "96",
  departures: ROUTE_96_EAST_BRUNSWICK_DEPARTURES,
}));

const ROUTE_5_MALVERN_DEPARTURES: SurfaceStopDeparture[] = [
  { route: "5", destination: "Malvern", departureLabel: "3 min", statusLabel: "Tram due", note: "Southbound" },
  { route: "5", destination: "Melbourne University", departureLabel: "9 min", statusLabel: "Scheduled", note: "Northbound" },
  { route: "5", destination: "Malvern", departureLabel: "17 min", statusLabel: "Scheduled", note: "Via Wattletree Rd" },
];

const ROUTE_5_UNIVERSITY_DEPARTURES: SurfaceStopDeparture[] = [
  { route: "5", destination: "Melbourne University", departureLabel: "2 min", statusLabel: "Tram due", note: "Northbound" },
  { route: "5", destination: "Malvern", departureLabel: "8 min", statusLabel: "Scheduled", note: "Southbound" },
  { route: "5", destination: "Melbourne University", departureLabel: "16 min", statusLabel: "Scheduled", note: "Via Swanston St" },
];

const ROUTE_5_MALVERN_STOP_DATA: Array<{ name: string; locality: string }> = [
  { name: "Melbourne University/Swanston St #1", locality: "Melbourne University" },
  { name: "Lincoln Square/Swanston St #3", locality: "Lincoln Square" },
  { name: "Queensberry St/Swanston St #4", locality: "Melbourne City" },
  { name: "RMIT University/Swanston St #7", locality: "RMIT University" },
  { name: "Melbourne Central Station/Swanston St #8", locality: "Melbourne Central Station" },
  { name: "Bourke Street Mall/Swanston St #10", locality: "Bourke Street Mall" },
  { name: "City Square/Swanston St #11", locality: "City Square" },
  { name: "Federation Square/Swanston St #13", locality: "Federation Square" },
  { name: "Arts Precinct/St Kilda Rd #14", locality: "Arts Precinct" },
  { name: "Grant St-Police Memorial/St Kilda Rd #17", locality: "Grant St-Police Memorial" },
  { name: "Shrine of Remembrance/St Kilda Rd #19", locality: "Shrine of Remembrance" },
  { name: "Anzac Station/St Kilda Rd #20", locality: "Anzac Station" },
  { name: "Toorak Rd/St Kilda Rd #22", locality: "Melbourne City" },
  { name: "Arthur St/St Kilda Rd #23", locality: "South Melbourne" },
  { name: "Leopold St/St Kilda Rd #24", locality: "South Melbourne" },
  { name: "Commercial Rd/St Kilda Rd #25", locality: "South Melbourne" },
  { name: "Moubray St/St Kilda Rd #26", locality: "South Melbourne" },
  { name: "High St/St Kilda Rd #27", locality: "St Kilda" },
  { name: "Union St/St Kilda Rd #29", locality: "St Kilda" },
  { name: "St Kilda Junction/St Kilda Rd #30", locality: "St Kilda Junction" },
  { name: "Queens Way/Queens Way #31", locality: "Queens Way" },
  { name: "Chapel St/Dandenong Rd #32", locality: "Windsor" },
  { name: "Hornby St/Dandenong Rd #33", locality: "Windsor" },
  { name: "The Avenue/Dandenong Rd #34", locality: "Prahran" },
  { name: "Williams Rd/Dandenong Rd #35", locality: "St Kilda East" },
  { name: "Closeburn Ave/Dandenong Rd #36", locality: "St Kilda East" },
  { name: "Lansdowne Rd/Dandenong Rd #37", locality: "Prahran" },
  { name: "Orrong Rd/Dandenong Rd #38", locality: "Armadale" },
  { name: "Wattletree Rd/Dandenong Rd #40", locality: "Armadale" },
  { name: "Armadale St/Wattletree Rd #41", locality: "Armadale" },
  { name: "Kooyong Rd/Wattletree Rd #42", locality: "Armadale" },
  { name: "Egerton Rd/Wattletree Rd #43", locality: "Armadale" },
  { name: "Duncraig Ave/Wattletree Rd #44", locality: "Malvern" },
  { name: "Glenferrie Rd/Wattletree Rd #45", locality: "Malvern" },
  { name: "Nicholls St/Wattletree Rd #46", locality: "Malvern" },
  { name: "Cabrini Hospital/Wattletree Rd #47", locality: "Cabrini Hospital" },
  { name: "Dixon St/Wattletree Rd #48", locality: "Malvern East" },
  { name: "Tooronga Rd/Wattletree Rd #49", locality: "Malvern East" },
  { name: "Vincent St/Wattletree Rd #50", locality: "Malvern East" },
  { name: "Erica Ave/Wattletree Rd #51", locality: "Malvern East" },
  { name: "Burke Rd/Wattletree Rd #52", locality: "Malvern East" },
];

const ROUTE_5_UNIVERSITY_STOP_DATA: Array<{ name: string; locality: string }> = [
  { name: "Burke Rd/Wattletree Rd #52", locality: "Malvern East" },
  { name: "Nott St/Wattletree Rd #51", locality: "Malvern East" },
  { name: "Anderson St/Wattletree Rd #50", locality: "Malvern East" },
  { name: "Tooronga Rd/Wattletree Rd #49", locality: "Malvern East" },
  { name: "Dixon St/Wattletree Rd #48", locality: "Malvern" },
  { name: "Cabrini Hospital/Wattletree Rd #47", locality: "Cabrini Hospital" },
  { name: "Soudan St/Wattletree Rd #46", locality: "Malvern" },
  { name: "Glenferrie Rd/Wattletree Rd #45", locality: "Armadale" },
  { name: "Duncraig Ave/Wattletree Rd #44", locality: "Armadale" },
  { name: "Egerton Rd/Wattletree Rd #43", locality: "Armadale" },
  { name: "Kooyong Rd/Wattletree Rd #42", locality: "Armadale" },
  { name: "Wattletree Rd/Dandenong Rd #40", locality: "Armadale" },
  { name: "Orrong Rd/Dandenong Rd #38", locality: "Prahran" },
  { name: "Lansdowne Rd/Dandenong Rd #37", locality: "Prahran" },
  { name: "Alexandra St/Dandenong Rd #36", locality: "Prahran" },
  { name: "Williams Rd/Dandenong Rd #35", locality: "St Kilda East" },
  { name: "Westbury St/Dandenong Rd #34", locality: "Windsor" },
  { name: "Hornby St/Dandenong Rd #33", locality: "Windsor" },
  { name: "Chapel St/Dandenong Rd #32", locality: "St Kilda" },
  { name: "Queens Way/Queens Way #31", locality: "Queens Way" },
  { name: "St Kilda Junction/St Kilda Rd #30", locality: "St Kilda Junction" },
  { name: "Union St/St Kilda Rd #29", locality: "Melbourne City" },
  { name: "Lorne St/St Kilda Rd #27", locality: "Melbourne City" },
  { name: "Beatrice St/St Kilda Rd #26", locality: "Melbourne City" },
  { name: "Commercial Rd/St Kilda Rd #25", locality: "Melbourne City" },
  { name: "Leopold St/St Kilda Rd #24", locality: "Melbourne City" },
  { name: "Arthur St/St Kilda Rd #23", locality: "Melbourne City" },
  { name: "Toorak Rd/St Kilda Rd #22", locality: "Melbourne City" },
  { name: "Anzac Station/St Kilda Rd #20", locality: "Anzac Station" },
  { name: "Shrine of Remembrance/St Kilda Rd #19", locality: "Shrine of Remembrance" },
  { name: "Grant St-Police Memorial/St Kilda Rd #17", locality: "Grant St-Police Memorial" },
  { name: "Arts Precinct/St Kilda Rd #14", locality: "Arts Precinct" },
  { name: "Federation Square/Swanston St #13", locality: "Federation Square" },
  { name: "City Square/Swanston St #11", locality: "City Square" },
  { name: "Bourke Street Mall/Swanston St #10", locality: "Bourke Street Mall" },
  { name: "Melbourne Central Station/Swanston St #8", locality: "Melbourne Central Station" },
  { name: "RMIT University/Swanston St #7", locality: "RMIT University" },
  { name: "Queensberry St/Swanston St #4", locality: "Carlton" },
  { name: "Lincoln Square/Swanston St #3", locality: "Lincoln Square" },
  { name: "Melbourne University/Swanston St #1", locality: "Melbourne University" },
];

const ROUTE_5_ROUTE_LINE: [number, number][] = [
  [-37.79775, 144.96102],
  [-37.8093, 144.9631],
  [-37.8169, 144.9672],
  [-37.8298, 144.9686],
  [-37.8377, 144.9732],
  [-37.8449, 144.9785],
  [-37.8518, 144.9874],
  [-37.8603, 145.0006],
  [-37.8677, 145.0119],
  [-37.8728, 145.0215],
  [-37.8753, 145.0288],
  [-37.8766, 145.0368],
];

const ROUTE_5_MALVERN_SURFACE_STOPS: SurfaceStop[] = interpolateStopsAlongPolyline(
  ROUTE_5_ROUTE_LINE,
  ROUTE_5_MALVERN_STOP_DATA.length,
).map((position, index) => ({
  id: `route-5-malvern-${index + 1}`,
  name: ROUTE_5_MALVERN_STOP_DATA[index]?.name ?? `Route 5 stop ${index + 1}`,
  locality: ROUTE_5_MALVERN_STOP_DATA[index]?.locality ?? "Melbourne",
  position,
  subtitle: "Route 5 tram stop",
  modes: ["tram"],
  routeLabel: "5",
  departures: ROUTE_5_MALVERN_DEPARTURES,
}));

const ROUTE_5_UNIVERSITY_SURFACE_STOPS: SurfaceStop[] = interpolateStopsAlongPolyline(
  [...ROUTE_5_ROUTE_LINE].reverse() as [number, number][],
  ROUTE_5_UNIVERSITY_STOP_DATA.length,
).map((position, index) => ({
  id: `route-5-university-${index + 1}`,
  name: ROUTE_5_UNIVERSITY_STOP_DATA[index]?.name ?? `Route 5 return stop ${index + 1}`,
  locality: ROUTE_5_UNIVERSITY_STOP_DATA[index]?.locality ?? "Melbourne",
  position,
  subtitle: "Route 5 tram stop",
  modes: ["tram"],
  routeLabel: "5",
  departures: ROUTE_5_UNIVERSITY_DEPARTURES,
}));

const ROUTE_6_GLEN_IRIS_DEPARTURES: SurfaceStopDeparture[] = [
  { route: "6", destination: "Glen Iris", departureLabel: "4 min", statusLabel: "Tram due", note: "Southbound" },
  { route: "6", destination: "Moreland", departureLabel: "11 min", statusLabel: "Scheduled", note: "Northbound" },
  { route: "6", destination: "Glen Iris", departureLabel: "19 min", statusLabel: "Scheduled", note: "Via High St" },
];

const ROUTE_6_MORELAND_DEPARTURES: SurfaceStopDeparture[] = [
  { route: "6", destination: "Moreland", departureLabel: "3 min", statusLabel: "Tram due", note: "Northbound" },
  { route: "6", destination: "Glen Iris", departureLabel: "9 min", statusLabel: "Scheduled", note: "Southbound" },
  { route: "6", destination: "Moreland", departureLabel: "17 min", statusLabel: "Scheduled", note: "Via Lygon St" },
];

const ROUTE_6_GLEN_IRIS_STOP_DATA: Array<{ name: string; locality: string }> = [
  { name: "Moreland Station/Cameron St #133", locality: "Moreland Station" },
  { name: "Sydney Rd/Moreland Rd #132", locality: "Coburg" },
  { name: "De Carle St/Moreland Rd #131", locality: "Coburg" },
  { name: "Barrow St/Moreland Rd #130", locality: "Coburg" },
  { name: "Moreland Rd/Holmes St #129", locality: "Brunswick" },
  { name: "Mitchell St/Holmes St #128", locality: "Brunswick East" },
  { name: "Albion St/Holmes St #127", locality: "Brunswick East" },
  { name: "Stewart St/Lygon St #126", locality: "Brunswick East" },
  { name: "Blyth St/Lygon St #125", locality: "Brunswick East" },
  { name: "Victoria St/Lygon St #124", locality: "Brunswick East" },
  { name: "Albert St/Lygon St #123", locality: "Brunswick East" },
  { name: "Glenlyon Rd/Lygon St #122", locality: "Brunswick East" },
  { name: "Weston St/Lygon St #121", locality: "Brunswick" },
  { name: "Brunswick Rd/Lygon St #120", locality: "Carlton North" },
  { name: "Pigdon St/Lygon St #118", locality: "Carlton North" },
  { name: "Richardson St/Lygon St #117", locality: "Carlton North" },
  { name: "Fenwick St/Lygon St #116", locality: "Carlton North" },
  { name: "Melbourne Cemetery/Lygon St #115", locality: "Melbourne Cemetery" },
  { name: "Princes St/Lygon St #114", locality: "Carlton" },
  { name: "Lytton St/Lygon St #113", locality: "Carlton" },
  { name: "Lygon St/Elgin St #112", locality: "Carlton" },
  { name: "Melbourne University/Swanston St #1", locality: "Melbourne University" },
  { name: "Lincoln Square/Swanston St #3", locality: "Lincoln Square" },
  { name: "Queensberry St/Swanston St #4", locality: "Melbourne City" },
  { name: "RMIT University/Swanston St #7", locality: "RMIT University" },
  { name: "Melbourne Central Station/Swanston St #8", locality: "Melbourne Central Station" },
  { name: "Bourke Street Mall/Swanston St #10", locality: "Bourke Street Mall" },
  { name: "City Square/Swanston St #11", locality: "City Square" },
  { name: "Federation Square/Swanston St #13", locality: "Federation Square" },
  { name: "Arts Precinct/St Kilda Rd #14", locality: "Arts Precinct" },
  { name: "Grant St-Police Memorial/St Kilda Rd #17", locality: "Grant St-Police Memorial" },
  { name: "Shrine of Remembrance/St Kilda Rd #19", locality: "Shrine of Remembrance" },
  { name: "Anzac Station/St Kilda Rd #20", locality: "Anzac Station" },
  { name: "Toorak Rd/St Kilda Rd #22", locality: "Melbourne City" },
  { name: "Arthur St/St Kilda Rd #23", locality: "South Melbourne" },
  { name: "Leopold St/St Kilda Rd #24", locality: "South Melbourne" },
  { name: "Commercial Rd/St Kilda Rd #25", locality: "South Melbourne" },
  { name: "Moubray St/St Kilda Rd #26", locality: "South Melbourne" },
  { name: "High St/St Kilda Rd #27", locality: "Prahran" },
  { name: "Punt Rd/High St #28", locality: "Prahran" },
  { name: "Perth St/High St #29", locality: "Prahran" },
  { name: "Prahran Station/High St #30", locality: "Prahran Station" },
  { name: "Chapel St/High St #31", locality: "Prahran" },
  { name: "Hornby St/High St #32", locality: "Prahran" },
  { name: "Prahran RSL/High St #33", locality: "Prahran RSL" },
  { name: "Lewisham Rd/High St #34", locality: "Prahran" },
  { name: "Williams Rd/High St #35", locality: "Prahran" },
  { name: "Chatsworth Rd/High St #36", locality: "Prahran" },
  { name: "Airlie Ave/High St #37", locality: "Prahran" },
  { name: "Orrong Rd/High St #38", locality: "Armadale" },
  { name: "Auburn Gr/High St #39", locality: "Armadale" },
  { name: "Armadale Station/High St #40", locality: "Armadale Station" },
  { name: "Kooyong Rd/High St #41", locality: "Armadale" },
  { name: "Huntingtower Rd/High St #42", locality: "Armadale" },
  { name: "Mercer Rd/High St #43", locality: "Malvern" },
  { name: "Glenferrie Rd/High St #44", locality: "Malvern" },
  { name: "De La Salle College/High St #45", locality: "De La Salle College" },
  { name: "Fraser St/High St #46", locality: "Malvern" },
  { name: "Dixon St/High St #47", locality: "Glen Iris" },
  { name: "Tooronga Rd/High St #48", locality: "Glen Iris" },
  { name: "Harold Holt Swim Centre/High St #49", locality: "Harold Holt Swim Centre" },
  { name: "Belmont Ave/High St #50", locality: "Glen Iris" },
  { name: "Burke Rd/High St #51", locality: "Glen Iris" },
  { name: "Boyanda Rd/High St #52", locality: "Glen Iris" },
  { name: "Malvern Rd/High St #53", locality: "Glen Iris" },
];

const ROUTE_6_MORELAND_STOP_DATA: Array<{ name: string; locality: string }> = [
  { name: "Malvern Rd/High St #53", locality: "Glen Iris" },
  { name: "Boyanda Rd/High St #52", locality: "Glen Iris" },
  { name: "Burke Rd/High St #51", locality: "Glen Iris" },
  { name: "Belmont Ave/High St #50", locality: "Glen Iris" },
  { name: "Harold Holt Swim Centre/High St #49", locality: "Harold Holt Swim Centre" },
  { name: "Tooronga Rd/High St #48", locality: "Malvern" },
  { name: "Dixon St/High St #47", locality: "Malvern" },
  { name: "Fraser St/High St #46", locality: "Malvern" },
  { name: "De La Salle College/High St #45", locality: "De La Salle College" },
  { name: "Glenferrie Rd/High St #44", locality: "Armadale" },
  { name: "Mercer Rd/High St #43", locality: "Armadale" },
  { name: "Huntingtower Rd/High St #42", locality: "Armadale" },
  { name: "Kooyong Rd/High St #41", locality: "Armadale" },
  { name: "Armadale Station/High St #40", locality: "Armadale Station" },
  { name: "Auburn Gr/High St #39", locality: "Armadale" },
  { name: "Orrong Rd/High St #38", locality: "Prahran" },
  { name: "Airlie Ave/High St #37", locality: "Prahran" },
  { name: "Chatsworth Rd/High St #36", locality: "Prahran" },
  { name: "Williams Rd/High St #35", locality: "Prahran" },
  { name: "Lewisham Rd/High St #34", locality: "Prahran" },
  { name: "Prahran RSL/High St #33", locality: "Prahran RSL" },
  { name: "Hornby St/High St #32", locality: "Prahran" },
  { name: "Chapel St/High St #31", locality: "Windsor" },
  { name: "Prahran Station/High St #30", locality: "Prahran Station" },
  { name: "Perth St/High St #29", locality: "Windsor" },
  { name: "Punt Rd/High St #28", locality: "Melbourne City" },
  { name: "Lorne St/St Kilda Rd #27", locality: "Melbourne City" },
  { name: "Beatrice St/St Kilda Rd #26", locality: "Melbourne City" },
  { name: "Commercial Rd/St Kilda Rd #25", locality: "Melbourne City" },
  { name: "Leopold St/St Kilda Rd #24", locality: "Melbourne City" },
  { name: "Arthur St/St Kilda Rd #23", locality: "Melbourne City" },
  { name: "Toorak Rd/St Kilda Rd #22", locality: "Melbourne City" },
  { name: "Anzac Station/St Kilda Rd #20", locality: "Anzac Station" },
  { name: "Shrine of Remembrance/St Kilda Rd #19", locality: "Shrine of Remembrance" },
  { name: "Grant St-Police Memorial/St Kilda Rd #17", locality: "Grant St-Police Memorial" },
  { name: "Arts Precinct/St Kilda Rd #14", locality: "Arts Precinct" },
  { name: "Federation Square/Swanston St #13", locality: "Federation Square" },
  { name: "City Square/Swanston St #11", locality: "City Square" },
  { name: "Bourke Street Mall/Swanston St #10", locality: "Bourke Street Mall" },
  { name: "Melbourne Central Station/Swanston St #8", locality: "Melbourne Central Station" },
  { name: "RMIT University/Swanston St #7", locality: "RMIT University" },
  { name: "Queensberry St/Swanston St #4", locality: "Carlton" },
  { name: "Lincoln Square/Swanston St #3", locality: "Lincoln Square" },
  { name: "Melbourne University/Swanston St #1", locality: "Melbourne University" },
  { name: "Lygon St/Elgin St #112", locality: "Carlton" },
  { name: "Lytton St/Lygon St #113", locality: "Carlton North" },
  { name: "Princes St/Lygon St #114", locality: "Carlton North" },
  { name: "Melbourne Cemetery/Lygon St #115", locality: "Melbourne Cemetery" },
  { name: "Fenwick St/Lygon St #116", locality: "Carlton North" },
  { name: "Richardson St/Lygon St #117", locality: "Carlton North" },
  { name: "Pigdon St/Lygon St #118", locality: "Brunswick" },
  { name: "Brunswick Rd/Lygon St #120", locality: "Brunswick East" },
  { name: "Weston St/Lygon St #121", locality: "Brunswick East" },
  { name: "Glenlyon Rd/Lygon St #122", locality: "Brunswick East" },
  { name: "Albert St/Lygon St #123", locality: "Brunswick East" },
  { name: "Victoria St/Lygon St #124", locality: "Brunswick East" },
  { name: "Blyth St/Lygon St #125", locality: "Brunswick East" },
  { name: "Stewart St/Lygon St #126", locality: "Brunswick East" },
  { name: "Albion St/Lygon St #127", locality: "Brunswick East" },
  { name: "Mitchell St/Holmes St #128", locality: "Brunswick" },
  { name: "Moreland Rd/Holmes St #129", locality: "Coburg" },
  { name: "Barrow St/Moreland Rd #130", locality: "Coburg" },
  { name: "De Carle St/Moreland Rd #131", locality: "Coburg" },
  { name: "Sydney Rd/Moreland Rd #132", locality: "Coburg" },
  { name: "Moreland Station/Moreland Rd #133", locality: "Moreland Station" },
];

const ROUTE_6_ROUTE_LINE: [number, number][] = [
  [-37.7542, 144.9649], // Moreland
  [-37.7664, 144.9728], // Holmes / Lygon
  [-37.7768, 144.9686], // Carlton North
  [-37.7897, 144.9660], // Cemetery / Carlton
  [-37.79775, 144.96102],
  [-37.8093, 144.9631],
  [-37.8169, 144.9672],
  [-37.8298, 144.9686],
  [-37.8377, 144.9732],
  [-37.8468, 144.9835], // High St / Prahran
  [-37.8559, 145.0042], // Armadale / Malvern
  [-37.8618, 145.0215],
  [-37.8656, 145.0298], // Glen Iris
];

const ROUTE_6_GLEN_IRIS_SURFACE_STOPS: SurfaceStop[] = interpolateStopsAlongPolyline(
  ROUTE_6_ROUTE_LINE,
  ROUTE_6_GLEN_IRIS_STOP_DATA.length,
).map((position, index) => ({
  id: `route-6-glen-iris-${index + 1}`,
  name: ROUTE_6_GLEN_IRIS_STOP_DATA[index]?.name ?? `Route 6 stop ${index + 1}`,
  locality: ROUTE_6_GLEN_IRIS_STOP_DATA[index]?.locality ?? "Melbourne",
  position,
  subtitle: "Route 6 tram stop",
  modes: ["tram"],
  routeLabel: "6",
  departures: ROUTE_6_GLEN_IRIS_DEPARTURES,
}));

const ROUTE_6_MORELAND_SURFACE_STOPS: SurfaceStop[] = interpolateStopsAlongPolyline(
  [...ROUTE_6_ROUTE_LINE].reverse() as [number, number][],
  ROUTE_6_MORELAND_STOP_DATA.length,
).map((position, index) => ({
  id: `route-6-moreland-${index + 1}`,
  name: ROUTE_6_MORELAND_STOP_DATA[index]?.name ?? `Route 6 return stop ${index + 1}`,
  locality: ROUTE_6_MORELAND_STOP_DATA[index]?.locality ?? "Melbourne",
  position,
  subtitle: "Route 6 tram stop",
  modes: ["tram"],
  routeLabel: "6",
  departures: ROUTE_6_MORELAND_DEPARTURES,
}));

const ROUTE_11_DOCKLANDS_DEPARTURES: SurfaceStopDeparture[] = [
  { route: "11", destination: "Victoria Harbour Docklands", departureLabel: "3 min", statusLabel: "Tram due", note: "Southbound" },
  { route: "11", destination: "West Preston", departureLabel: "9 min", statusLabel: "Scheduled", note: "Northbound" },
  { route: "11", destination: "Victoria Harbour Docklands", departureLabel: "17 min", statusLabel: "Scheduled", note: "Via Collins St" },
];

const ROUTE_11_WEST_PRESTON_DEPARTURES: SurfaceStopDeparture[] = [
  { route: "11", destination: "West Preston", departureLabel: "2 min", statusLabel: "Tram due", note: "Northbound" },
  { route: "11", destination: "Victoria Harbour Docklands", departureLabel: "8 min", statusLabel: "Scheduled", note: "Southbound" },
  { route: "11", destination: "West Preston", departureLabel: "16 min", statusLabel: "Scheduled", note: "Via Brunswick St" },
];

const ROUTE_11_DOCKLANDS_STOP_DATA: Array<{ name: string; locality: string; position: [number, number] }> = [
  { name: "West Preston/Gilbert Rd #47", locality: "PTV GTFS", position: [-37.72918594, 144.99158656] },
  { name: "Jacka St/Gilbert Rd #45", locality: "PTV GTFS", position: [-37.73276368, 144.99105870] },
  { name: "Cooper St/Gilbert Rd #44", locality: "PTV GTFS", position: [-37.73460563, 144.99073657] },
  { name: "Murray Rd/Gilbert Rd #43", locality: "PTV GTFS", position: [-37.73646559, 144.99041394] },
  { name: "Cramer St/Gilbert Rd #42", locality: "PTV GTFS", position: [-37.73891028, 144.99003009] },
  { name: "Bruce St/Gilbert Rd #41", locality: "PTV GTFS", position: [-37.74095959, 144.98971365] },
  { name: "Bell St/Gilbert Rd #40", locality: "PTV GTFS", position: [-37.74353804, 144.98924668] },
  { name: "Latona Ave/Gilbert Rd #39", locality: "PTV GTFS", position: [-37.74562396, 144.98896324] },
  { name: "Oakover Rd/Gilbert Rd #38", locality: "PTV GTFS", position: [-37.74823019, 144.98854086] },
  { name: "Miller St/Gilbert Rd #37", locality: "PTV GTFS", position: [-37.75060223, 144.98812478] },
  { name: "Devon St/Miller St #36", locality: "PTV GTFS", position: [-37.75126315, 144.99094434] },
  { name: "St Georges Rd/Miller St #35", locality: "PTV GTFS", position: [-37.75164413, 144.99479302] },
  { name: "Miller St/St Georges Rd #34", locality: "PTV GTFS", position: [-37.75226818, 144.99492372] },
  { name: "Hutton St/St Georges Rd #33", locality: "PTV GTFS", position: [-37.75508521, 144.99417799] },
  { name: "Normanby Ave/St Georges Rd #32", locality: "PTV GTFS", position: [-37.75846227, 144.99350787] },
  { name: "Gadd St/St Georges Rd #31", locality: "PTV GTFS", position: [-37.76263888, 144.99269120] },
  { name: "Gladstone Ave/St Georges Rd #30", locality: "PTV GTFS", position: [-37.76519815, 144.99215657] },
  { name: "Arthurton Rd/St Georges Rd #29", locality: "PTV GTFS", position: [-37.76814455, 144.99160008] },
  { name: "Sumner Ave/St Georges Rd #28", locality: "PTV GTFS", position: [-37.77141000, 144.99072837] },
  { name: "Westbourne Gr/St Georges Rd #27", locality: "PTV GTFS", position: [-37.77364614, 144.99027046] },
  { name: "Clarke St/St Georges Rd #26", locality: "PTV GTFS", position: [-37.77573893, 144.98986183] },
  { name: "Miller St/St Georges Rd #25", locality: "PTV GTFS", position: [-37.77795152, 144.98855296] },
  { name: "Holden St/St Georges Rd #24", locality: "PTV GTFS", position: [-37.77987866, 144.98688841] },
  { name: "Park St/St Georges Rd #23", locality: "PTV GTFS", position: [-37.78173486, 144.98529383] },
  { name: "Scotchmer St/St Georges Rd #22", locality: "PTV GTFS", position: [-37.78321817, 144.98402724] },
  { name: "Alfred Cres/St Georges Rd #21", locality: "PTV GTFS", position: [-37.78538493, 144.98215155] },
  { name: "Fitzroy Bowls Club/Brunswick St #20", locality: "PTV GTFS", position: [-37.78817377, 144.98029287] },
  { name: "Newry St/Brunswick St #19", locality: "PTV GTFS", position: [-37.79053694, 144.97988784] },
  { name: "Alexandra Pde/Brunswick St #18", locality: "PTV GTFS", position: [-37.79292673, 144.97945935] },
  { name: "Leicester St/Brunswick St #17", locality: "PTV GTFS", position: [-37.79546083, 144.97903825] },
  { name: "Johnston St/Brunswick St #16", locality: "PTV GTFS", position: [-37.79816569, 144.97858975] },
  { name: "St David St/Brunswick St #15", locality: "PTV GTFS", position: [-37.80053784, 144.97818436] },
  { name: "King William St/Brunswick St #14", locality: "PTV GTFS", position: [-37.80270321, 144.97780729] },
  { name: "Gertrude St/Brunswick St #13", locality: "PTV GTFS", position: [-37.80559663, 144.97731947] },
  { name: "St Vincents Plaza/Victoria Pde #12", locality: "PTV GTFS", position: [-37.80827390, 144.97631501] },
  { name: "Albert St/Gisborne St #11", locality: "PTV GTFS", position: [-37.80939028, 144.97572795] },
  { name: "Parliament Railway Station/Macarthur St #10", locality: "PTV GTFS", position: [-37.81244860, 144.97434947] },
  { name: "Spring St/Collins St #8", locality: "PTV GTFS", position: [-37.81353855, 144.97327462] },
  { name: "Exhibition St/Collins St #7", locality: "PTV GTFS", position: [-37.81435556, 144.97048055] },
  { name: "Melbourne Town Hall/Collins St #6", locality: "PTV GTFS", position: [-37.81568334, 144.96595711] },
  { name: "Elizabeth St/Collins St #5", locality: "PTV GTFS", position: [-37.81639699, 144.96344972] },
  { name: "William St/Collins St #3", locality: "PTV GTFS", position: [-37.81756122, 144.95938493] },
  { name: "Spencer St/Collins St #1", locality: "PTV GTFS", position: [-37.81884589, 144.95499861] },
  { name: "Southern Cross Station/Collins St #D14", locality: "PTV GTFS", position: [-37.81966206, 144.95218145] },
  { name: "Batman's Hill/Collins St #D15", locality: "PTV GTFS", position: [-37.82024859, 144.95015445] },
  { name: "Harbour Esp/Collins St #D16", locality: "PTV GTFS", position: [-37.82081807, 144.94818470] },
  { name: "Merchant St/Collins St #D17", locality: "PTV GTFS", position: [-37.82151400, 144.94520032] },
  { name: "Bourke St/Collins St #D18", locality: "PTV GTFS", position: [-37.82081855, 144.94201596] },
];

const ROUTE_11_WEST_PRESTON_STOP_DATA: Array<{ name: string; locality: string; position: [number, number] }> = [
  { name: "Bourke St/Collins St #D18", locality: "PTV GTFS", position: [-37.82078292, 144.94203967] },
  { name: "Merchant St/Collins St #D17", locality: "PTV GTFS", position: [-37.82145630, 144.94550865] },
  { name: "Harbour Esp/Collins St #D16", locality: "PTV GTFS", position: [-37.82080570, 144.94799191] },
  { name: "Batman's Hill/Collins St #D15", locality: "PTV GTFS", position: [-37.82009180, 144.95046552] },
  { name: "Southern Cross Station/Collins St #D14", locality: "PTV GTFS", position: [-37.81948862, 144.95257249] },
  { name: "Spencer St/Collins St #1", locality: "PTV GTFS", position: [-37.81870592, 144.95524103] },
  { name: "William St/Collins St #3", locality: "PTV GTFS", position: [-37.81739736, 144.95980976] },
  { name: "Elizabeth St/Collins St #5", locality: "PTV GTFS", position: [-37.81624916, 144.96376050] },
  { name: "Melbourne Town Hall/Collins St #6", locality: "PTV GTFS", position: [-37.81551769, 144.96627972] },
  { name: "Exhibition St/Collins St #7", locality: "PTV GTFS", position: [-37.81422456, 144.97072269] },
  { name: "Spring St/Collins St #8", locality: "PTV GTFS", position: [-37.81341597, 144.97348244] },
  { name: "Parliament Railway Station/Macarthur St #10", locality: "PTV GTFS", position: [-37.81217073, 144.97443658] },
  { name: "Albert St/Gisborne St #11", locality: "PTV GTFS", position: [-37.80969458, 144.97560605] },
  { name: "Gertrude St/Brunswick St #13", locality: "PTV GTFS", position: [-37.80585453, 144.97711935] },
  { name: "Hanover St/Brunswick St #14", locality: "PTV GTFS", position: [-37.80283501, 144.97761062] },
  { name: "Bell St/Brunswick St #15", locality: "PTV GTFS", position: [-37.80044523, 144.97803924] },
  { name: "Johnston St/Brunswick St #16", locality: "PTV GTFS", position: [-37.79853129, 144.97836400] },
  { name: "Leicester St/Brunswick St #17", locality: "PTV GTFS", position: [-37.79562886, 144.97885197] },
  { name: "Alexandra Pde/Brunswick St #18", locality: "PTV GTFS", position: [-37.79362503, 144.97919049] },
  { name: "Newry St/Brunswick St #19", locality: "PTV GTFS", position: [-37.79080346, 144.97966482] },
  { name: "Fitzroy Bowls Club/Brunswick St #20", locality: "PTV GTFS", position: [-37.78829657, 144.98009648] },
  { name: "Alfred Cres/St Georges Rd #21", locality: "PTV GTFS", position: [-37.78542589, 144.98191198] },
  { name: "Scotchmer St/St Georges Rd #22", locality: "PTV GTFS", position: [-37.78340992, 144.98364732] },
  { name: "Park St/St Georges Rd #23", locality: "PTV GTFS", position: [-37.78150928, 144.98527725] },
  { name: "Holden St/St Georges Rd #24", locality: "PTV GTFS", position: [-37.78007062, 144.98651987] },
  { name: "Miller St/St Georges Rd #25", locality: "PTV GTFS", position: [-37.77801932, 144.98830133] },
  { name: "Clarke St/St Georges Rd #26", locality: "PTV GTFS", position: [-37.77592635, 144.98975457] },
  { name: "Westbourne Gr/St Georges Rd #27", locality: "PTV GTFS", position: [-37.77380673, 144.99017529] },
  { name: "Sumner Ave/St Georges Rd #28", locality: "PTV GTFS", position: [-37.77157059, 144.99063320] },
  { name: "Arthurton Rd/St Georges Rd #29", locality: "PTV GTFS", position: [-37.76856211, 144.99124820] },
  { name: "Gladstone Ave/St Georges Rd #30", locality: "PTV GTFS", position: [-37.76529375, 144.99194965] },
  { name: "Bird Ave/St Georges Rd #31", locality: "PTV GTFS", position: [-37.76241020, 144.99249306] },
  { name: "Normanby Ave/St Georges Rd #32", locality: "PTV GTFS", position: [-37.75922271, 144.99318084] },
  { name: "Hutton St/St Georges Rd #33", locality: "PTV GTFS", position: [-37.75566608, 144.99388989] },
  { name: "Miller St/St Georges Rd #34", locality: "PTV GTFS", position: [-37.75204240, 144.99489576] },
  { name: "Bracken Ave/Miller St #36", locality: "PTV GTFS", position: [-37.75144068, 144.99131409] },
  { name: "Miller St/Gilbert Rd #37", locality: "PTV GTFS", position: [-37.75031243, 144.98804183] },
  { name: "Oakover Rd/Gilbert Rd #38", locality: "PTV GTFS", position: [-37.74808317, 144.98837460] },
  { name: "Latona Ave/Gilbert Rd #39", locality: "PTV GTFS", position: [-37.74563926, 144.98880394] },
  { name: "Bell St/Gilbert Rd #40", locality: "PTV GTFS", position: [-37.74407502, 144.98902787] },
  { name: "Bruce St/Gilbert Rd #41", locality: "PTV GTFS", position: [-37.74131642, 144.98949972] },
  { name: "Cramer St/Gilbert Rd #42", locality: "PTV GTFS", position: [-37.73909615, 144.98983215] },
  { name: "Murray Rd/Gilbert Rd #43", locality: "PTV GTFS", position: [-37.73671452, 144.99021430] },
  { name: "Cooper St/Gilbert Rd #44", locality: "PTV GTFS", position: [-37.73454006, 144.99059083] },
  { name: "Jacka St/Gilbert Rd #45", locality: "PTV GTFS", position: [-37.73299440, 144.99084821] },
  { name: "McNamara St/Gilbert Rd #46", locality: "PTV GTFS", position: [-37.73005621, 144.99135880] },
  { name: "West Preston/Gilbert Rd #47", locality: "PTV GTFS", position: [-37.72918594, 144.99158656] },
];

const ROUTE_11_ROUTE_LINE: [number, number][] = ROUTE_11_DOCKLANDS_STOP_DATA.map((stop) => stop.position);

const ROUTE_11_DOCKLANDS_SURFACE_STOPS: SurfaceStop[] = ROUTE_11_DOCKLANDS_STOP_DATA.map((stop, index) => ({
  id: `route-11-docklands-${index + 1}`,
  name: stop.name,
  locality: stop.locality,
  position: stop.position,
  subtitle: "Route 11 tram stop",
  modes: ["tram"],
  routeLabel: "11",
  departures: ROUTE_11_DOCKLANDS_DEPARTURES,
}));

const ROUTE_11_WEST_PRESTON_SURFACE_STOPS: SurfaceStop[] = ROUTE_11_WEST_PRESTON_STOP_DATA.map((stop, index) => ({
  id: `route-11-west-preston-${index + 1}`,
  name: stop.name,
  locality: stop.locality,
  position: stop.position,
  subtitle: "Route 11 tram stop",
  modes: ["tram"],
  routeLabel: "11",
  departures: ROUTE_11_WEST_PRESTON_DEPARTURES,
}));

const ROUTE_67_CARNEGIE_DEPARTURES: SurfaceStopDeparture[] = [
  { route: "67", destination: "Carnegie", departureLabel: "4 min", statusLabel: "Tram due", note: "Southbound" },
  { route: "67", destination: "Melbourne University", departureLabel: "11 min", statusLabel: "Scheduled", note: "Northbound" },
  { route: "67", destination: "Carnegie", departureLabel: "19 min", statusLabel: "Scheduled", note: "Via Glenhuntly Rd" },
];

const ROUTE_67_UNIVERSITY_DEPARTURES: SurfaceStopDeparture[] = [
  { route: "67", destination: "Melbourne University", departureLabel: "3 min", statusLabel: "Tram due", note: "Northbound" },
  { route: "67", destination: "Carnegie", departureLabel: "10 min", statusLabel: "Scheduled", note: "Southbound" },
  { route: "67", destination: "Melbourne University", departureLabel: "18 min", statusLabel: "Scheduled", note: "Via Swanston St" },
];

const ROUTE_67_CARNEGIE_STOP_DATA: Array<{ name: string; locality: string; position: [number, number] }> = [
  { name: "Melbourne University/Swanston St #1", locality: "PTV GTFS", position: [-37.79930548, 144.96419183] },
  { name: "Lincoln Square/Swanston St #3", locality: "PTV GTFS", position: [-37.80236978, 144.96368745] },
  { name: "Queensberry St/Swanston St #4", locality: "PTV GTFS", position: [-37.80569411, 144.96310774] },
  { name: "RMIT University/Swanston St #7", locality: "PTV GTFS", position: [-37.80813946, 144.96329043] },
  { name: "Melbourne Central Station/Swanston St #8", locality: "PTV GTFS", position: [-37.81038237, 144.96427381] },
  { name: "Bourke Street Mall/Swanston St #10", locality: "PTV GTFS", position: [-37.81319863, 144.96558229] },
  { name: "City Square/Swanston St #11", locality: "PTV GTFS", position: [-37.81637753, 144.96701723] },
  { name: "Federation Square/Swanston St #13", locality: "PTV GTFS", position: [-37.81847551, 144.96795936] },
  { name: "Arts Precinct/St Kilda Rd #14", locality: "PTV GTFS", position: [-37.82184570, 144.96951422] },
  { name: "Grant St-Police Memorial/St Kilda Rd #17", locality: "PTV GTFS", position: [-37.82474278, 144.97080951] },
  { name: "Shrine of Remembrance/St Kilda Rd #19", locality: "PTV GTFS", position: [-37.82879869, 144.97136874] },
  { name: "Anzac Station/St Kilda Rd #20", locality: "PTV GTFS", position: [-37.83366407, 144.97340570] },
  { name: "Toorak Rd/St Kilda Rd #22", locality: "PTV GTFS", position: [-37.83595132, 144.97539977] },
  { name: "Arthur St/St Kilda Rd #23", locality: "PTV GTFS", position: [-37.83885520, 144.97657033] },
  { name: "Leopold St/St Kilda Rd #24", locality: "PTV GTFS", position: [-37.84115853, 144.97740511] },
  { name: "Commercial Rd/St Kilda Rd #25", locality: "PTV GTFS", position: [-37.84452295, 144.97863142] },
  { name: "Moubray St/St Kilda Rd #26", locality: "PTV GTFS", position: [-37.84755154, 144.97971927] },
  { name: "High St/St Kilda Rd #27", locality: "PTV GTFS", position: [-37.84986386, 144.98055399] },
  { name: "Union St/St Kilda Rd #29", locality: "PTV GTFS", position: [-37.85300170, 144.98170720] },
  { name: "St Kilda Junction/St Kilda Rd #30", locality: "PTV GTFS", position: [-37.85529579, 144.98253116] },
  { name: "Barkly St/St Kilda Rd #31", locality: "PTV GTFS", position: [-37.85826072, 144.98358695] },
  { name: "Alma Rd/St Kilda Rd #32", locality: "PTV GTFS", position: [-37.86098010, 144.98451310] },
  { name: "Argyle St/St Kilda Rd #33", locality: "PTV GTFS", position: [-37.86208602, 144.98489218] },
  { name: "Inkerman St/St Kilda Rd #34", locality: "PTV GTFS", position: [-37.86511320, 144.98590098] },
  { name: "Carlisle St/St Kilda Rd #35", locality: "PTV GTFS", position: [-37.86754374, 144.98680105] },
  { name: "St Kilda Primary School/Brighton Rd #36", locality: "PTV GTFS", position: [-37.87005858, 144.98841507] },
  { name: "Chapel St/Brighton Rd #37", locality: "PTV GTFS", position: [-37.87177121, 144.98949396] },
  { name: "Brunning St/Brighton Rd #38", locality: "PTV GTFS", position: [-37.87280032, 144.99012535] },
  { name: "Glen Eira Rd/Brighton Rd #39", locality: "PTV GTFS", position: [-37.87663555, 144.99254505] },
  { name: "Scott St/Brighton Rd #40", locality: "PTV GTFS", position: [-37.87888580, 144.99397335] },
  { name: "Coleridge St/Brighton Rd #41", locality: "PTV GTFS", position: [-37.88079850, 144.99516076] },
  { name: "Hotham St/Brighton Rd #42", locality: "PTV GTFS", position: [-37.88295709, 144.99650074] },
  { name: "Brighton Rd/Glenhuntly Rd #43", locality: "PTV GTFS", position: [-37.88379999, 144.99784232] },
  { name: "Elsternwick Railway Station/Glenhuntly Rd #44", locality: "PTV GTFS", position: [-37.88414954, 145.00037979] },
  { name: "Elsternwick Shopping Centre/Glenhuntly Rd #45", locality: "PTV GTFS", position: [-37.88461334, 145.00381246] },
  { name: "Orrong Rd/Glenhuntly Rd #46", locality: "PTV GTFS", position: [-37.88486171, 145.00570461] },
  { name: "Shoobra Rd/Glenhuntly Rd #47", locality: "PTV GTFS", position: [-37.88527112, 145.00912745] },
  { name: "Parkside St/Glenhuntly Rd #48", locality: "PTV GTFS", position: [-37.88564862, 145.01226692] },
  { name: "Kooyong Rd/Glenhuntly Rd #49", locality: "PTV GTFS", position: [-37.88596297, 145.01487370] },
  { name: "Royal Pde/Glenhuntly Rd #50", locality: "PTV GTFS", position: [-37.88639071, 145.01833026] },
  { name: "Hawthorn Rd/Glenhuntly Rd #51", locality: "PTV GTFS", position: [-37.88680896, 145.02176438] },
  { name: "Jasmine St/Glenhuntly Rd #52", locality: "PTV GTFS", position: [-37.88710990, 145.02412145] },
  { name: "Glenhuntly Tram Depot/Glenhuntly Rd #53", locality: "PTV GTFS", position: [-37.88745140, 145.02675035] },
  { name: "Bambra Rd/Glenhuntly Rd #54", locality: "PTV GTFS", position: [-37.88767314, 145.02868885] },
  { name: "Fallon St/Glenhuntly Rd #55", locality: "PTV GTFS", position: [-37.88793069, 145.03061504] },
  { name: "Kambrook Rd/Glenhuntly Rd #56", locality: "PTV GTFS", position: [-37.88825137, 145.03308536] },
  { name: "Clarke Ave/Glenhuntly Rd #57", locality: "PTV GTFS", position: [-37.88850154, 145.03511412] },
  { name: "Booran Rd/Glenhuntly Rd #58", locality: "PTV GTFS", position: [-37.88879435, 145.03753974] },
  { name: "Glenhuntly Shops/Glenhuntly Rd #60", locality: "PTV GTFS", position: [-37.88913166, 145.04047590] },
  { name: "Glen Huntly Railway Station/Glen Huntly Rd  #61", locality: "PTV GTFS", position: [-37.88930730, 145.04182441] },
  { name: "Grange Rd/Glenhuntly Rd #62", locality: "PTV GTFS", position: [-37.88963266, 145.04459036] },
  { name: "Maroona Rd/Glenhuntly Rd #63", locality: "PTV GTFS", position: [-37.88993824, 145.04725452] },
  { name: "Mernda Ave/Glenhuntly Rd #64", locality: "PTV GTFS", position: [-37.89023661, 145.04948679] },
  { name: "Mimosa Rd/Glenhuntly Rd #65", locality: "PTV GTFS", position: [-37.89051748, 145.05175364] },
  { name: "Truganini Rd/Glenhuntly Rd #66", locality: "PTV GTFS", position: [-37.89078104, 145.05406646] },
  { name: "Centre Rd/Truganini Rd #67", locality: "PTV GTFS", position: [-37.89265356, 145.05449476] },
  { name: "Carnegie/Truganini Rd #68", locality: "PTV GTFS", position: [-37.89386477, 145.05580476] },
];

const ROUTE_67_UNIVERSITY_STOP_DATA: Array<{ name: string; locality: string; position: [number, number] }> = [
  { name: "Carnegie/Truganini Rd #68", locality: "PTV GTFS", position: [-37.89386477, 145.05580476] },
  { name: "Centre Rd/Truganini Rd #67", locality: "PTV GTFS", position: [-37.89269653, 145.05436854] },
  { name: "Glenhuntly Rd/Truganini Rd #66", locality: "PTV GTFS", position: [-37.89106911, 145.05404750] },
  { name: "Mimosa Rd/Glenhuntly Rd #65", locality: "PTV GTFS", position: [-37.89071398, 145.05219195] },
  { name: "Mernda Ave/Glenhuntly Rd #64", locality: "PTV GTFS", position: [-37.89040572, 145.04990306] },
  { name: "Maroona Rd/Glenhuntly Rd #63", locality: "PTV GTFS", position: [-37.89014321, 145.04765847] },
  { name: "Grange Rd/Glenhuntly Rd #62", locality: "PTV GTFS", position: [-37.88983839, 145.04503977] },
  { name: "Glen Huntly Railway Station/Glen Huntly Rd  #61", locality: "PTV GTFS", position: [-37.88954800, 145.04275047] },
  { name: "Glenhuntly Shops/Glenhuntly Rd #60", locality: "PTV GTFS", position: [-37.88930772, 145.04076688] },
  { name: "Booran Rd/Glenhuntly Rd #58", locality: "PTV GTFS", position: [-37.88896104, 145.03780822] },
  { name: "Laura St/Glenhuntly Rd #57", locality: "PTV GTFS", position: [-37.88866994, 145.03548488] },
  { name: "Kean St/Glenhuntly Rd #56", locality: "PTV GTFS", position: [-37.88841940, 145.03343339] },
  { name: "Fallon St/Glenhuntly Rd #55", locality: "PTV GTFS", position: [-37.88810811, 145.03098555] },
  { name: "Bambra Rd/Glenhuntly Rd #54", locality: "PTV GTFS", position: [-37.88783890, 145.02890048] },
  { name: "Glenhuntly Tram Depot/Glenhuntly Rd #53", locality: "PTV GTFS", position: [-37.88761063, 145.02710997] },
  { name: "Jasmine St/Glenhuntly Rd #52", locality: "PTV GTFS", position: [-37.88721838, 145.02414129] },
  { name: "Hawthorn Rd/Glenhuntly Rd #51", locality: "PTV GTFS", position: [-37.88698794, 145.02222579] },
  { name: "Royal Pde/Glenhuntly Rd #50", locality: "PTV GTFS", position: [-37.88649766, 145.01825917] },
  { name: "Kooyong Rd/Glenhuntly Rd #49", locality: "PTV GTFS", position: [-37.88610173, 145.01508602] },
  { name: "Parkside St/Glenhuntly Rd #48", locality: "PTV GTFS", position: [-37.88575632, 145.01224128] },
  { name: "Shoobra Rd/Glenhuntly Rd #47", locality: "PTV GTFS", position: [-37.88538803, 145.00911293] },
  { name: "Orrong Rd/Glenhuntly Rd #46", locality: "PTV GTFS", position: [-37.88505052, 145.00621119] },
  { name: "Elsternwick Shopping Centre/Glenhuntly Rd #45", locality: "PTV GTFS", position: [-37.88475077, 145.00394520] },
  { name: "Elsternwick Railway Station/Glenhuntly Rd #44", locality: "PTV GTFS", position: [-37.88430576, 145.00055749] },
  { name: "Brighton Rd/Glenhuntly Rd #43", locality: "PTV GTFS", position: [-37.88390364, 144.99757800] },
  { name: "Hotham St/Brighton Rd #42", locality: "PTV GTFS", position: [-37.88286431, 144.99634407] },
  { name: "Coleridge St/Brighton Rd #41", locality: "PTV GTFS", position: [-37.88084218, 144.99507998] },
  { name: "Scott St/Brighton Rd #40", locality: "PTV GTFS", position: [-37.87894750, 144.99389209] },
  { name: "Glen Eira Rd/Brighton Rd #39", locality: "PTV GTFS", position: [-37.87595969, 144.99201768] },
  { name: "Wimbledon Ave/Brighton Rd #38", locality: "PTV GTFS", position: [-37.87288061, 144.99007770] },
  { name: "St Kilda Primary School/Brighton Rd #36", locality: "PTV GTFS", position: [-37.87012046, 144.98834518] },
  { name: "Carlisle St/St Kilda Rd #35", locality: "PTV GTFS", position: [-37.86732465, 144.98663650] },
  { name: "Inkerman St/St Kilda Rd #34", locality: "PTV GTFS", position: [-37.86406917, 144.98545198] },
  { name: "Argyle St/St Kilda Rd #33", locality: "PTV GTFS", position: [-37.86248255, 144.98489274] },
  { name: "Alma Rd/St Kilda Rd #32", locality: "PTV GTFS", position: [-37.85994487, 144.98405254] },
  { name: "Barkly St/St Kilda Rd #31", locality: "PTV GTFS", position: [-37.85796839, 144.98335622] },
  { name: "St Kilda Junction/St Kilda Rd #30", locality: "PTV GTFS", position: [-37.85503126, 144.98234516] },
  { name: "Union St/St Kilda Rd #29", locality: "PTV GTFS", position: [-37.85248340, 144.98143720] },
  { name: "Lorne St/St Kilda Rd #27", locality: "PTV GTFS", position: [-37.84935476, 144.98029512] },
  { name: "Beatrice St/St Kilda Rd #26", locality: "PTV GTFS", position: [-37.84789461, 144.97975537] },
  { name: "Commercial Rd/St Kilda Rd #25", locality: "PTV GTFS", position: [-37.84401326, 144.97833851] },
  { name: "Leopold St/St Kilda Rd #24", locality: "PTV GTFS", position: [-37.84148319, 144.97741896] },
  { name: "Arthur St/St Kilda Rd #23", locality: "PTV GTFS", position: [-37.83929754, 144.97661506] },
  { name: "Toorak Rd/St Kilda Rd #22", locality: "PTV GTFS", position: [-37.83547648, 144.97503778] },
  { name: "Anzac Station/St Kilda Rd #20", locality: "PTV GTFS", position: [-37.83321372, 144.97237268] },
  { name: "Shrine of Remembrance/St Kilda Rd #19", locality: "PTV GTFS", position: [-37.82893146, 144.97122876] },
  { name: "Grant St-Police Memorial/St Kilda Rd #17", locality: "PTV GTFS", position: [-37.82427870, 144.97054956] },
  { name: "Arts Precinct/St Kilda Rd #14", locality: "PTV GTFS", position: [-37.82151653, 144.96923923] },
  { name: "Federation Square/Swanston St #13", locality: "PTV GTFS", position: [-37.81806508, 144.96767526] },
  { name: "City Square/Swanston St #11", locality: "PTV GTFS", position: [-37.81572996, 144.96656925] },
  { name: "Bourke Street Mall/Swanston St #10", locality: "PTV GTFS", position: [-37.81275921, 144.96518542] },
  { name: "Melbourne Central Station/Swanston St #8", locality: "PTV GTFS", position: [-37.80988909, 144.96388980] },
  { name: "RMIT University/Swanston St #7", locality: "PTV GTFS", position: [-37.80779872, 144.96286817] },
  { name: "Queensberry St/Swanston St #4", locality: "PTV GTFS", position: [-37.80513545, 144.96311173] },
  { name: "Lincoln Square/Swanston St #3", locality: "PTV GTFS", position: [-37.80262884, 144.96355540] },
  { name: "Melbourne University/Swanston St #1", locality: "PTV GTFS", position: [-37.79876562, 144.96424072] },
];

const ROUTE_67_ROUTE_LINE: [number, number][] = ROUTE_67_CARNEGIE_STOP_DATA.map((stop) => stop.position);

const ROUTE_67_CARNEGIE_SURFACE_STOPS: SurfaceStop[] = ROUTE_67_CARNEGIE_STOP_DATA.map((stop, index) => ({
  id: `route-67-carnegie-${index + 1}`,
  name: stop.name,
  locality: stop.locality,
  position: stop.position,
  subtitle: "Route 67 tram stop",
  modes: ["tram"],
  routeLabel: "67",
  departures: ROUTE_67_CARNEGIE_DEPARTURES,
}));

const ROUTE_67_UNIVERSITY_SURFACE_STOPS: SurfaceStop[] = ROUTE_67_UNIVERSITY_STOP_DATA.map((stop, index) => ({
  id: `route-67-university-${index + 1}`,
  name: stop.name,
  locality: stop.locality,
  position: stop.position,
  subtitle: "Route 67 tram stop",
  modes: ["tram"],
  routeLabel: "67",
  departures: ROUTE_67_UNIVERSITY_DEPARTURES,
}));

const GENERATED_TRAM_SURFACE_STOPS: SurfaceStop[] = GENERATED_TRAM_ROUTE_BUNDLES.flatMap((bundle) => {
  const forwardDepartures: SurfaceStopDeparture[] = [
    {
      route: bundle.routeLabel,
      destination: bundle.forwardDestination,
      departureLabel: "4 min",
      statusLabel: "Tram due",
      note: "Live route",
    },
    {
      route: bundle.routeLabel,
      destination: bundle.reverseDestination,
      departureLabel: "11 min",
      statusLabel: "Scheduled",
      note: "Return service",
    },
    {
      route: bundle.routeLabel,
      destination: bundle.forwardDestination,
      departureLabel: "19 min",
      statusLabel: "Scheduled",
      note: bundle.longName,
    },
  ];

  const reverseDepartures: SurfaceStopDeparture[] = [
    {
      route: bundle.routeLabel,
      destination: bundle.reverseDestination,
      departureLabel: "3 min",
      statusLabel: "Tram due",
      note: "Live route",
    },
    {
      route: bundle.routeLabel,
      destination: bundle.forwardDestination,
      departureLabel: "9 min",
      statusLabel: "Scheduled",
      note: "Outbound service",
    },
    {
      route: bundle.routeLabel,
      destination: bundle.reverseDestination,
      departureLabel: "17 min",
      statusLabel: "Scheduled",
      note: bundle.longName,
    },
  ];

  return [
    ...bundle.forwardStops.map((stop, index) => ({
      id: `generated-tram-${bundle.routeLabel}-forward-${index + 1}`,
      name: stop.name,
      locality: stop.locality,
      position: stop.position,
      subtitle: `Route ${bundle.routeLabel} tram stop`,
      modes: ["tram"] as TransportMode[],
      routeLabel: bundle.routeLabel,
      departures: forwardDepartures,
    })),
    ...bundle.reverseStops.map((stop, index) => ({
      id: `generated-tram-${bundle.routeLabel}-reverse-${index + 1}`,
      name: stop.name,
      locality: stop.locality,
      position: stop.position,
      subtitle: `Route ${bundle.routeLabel} tram stop`,
      modes: ["tram"] as TransportMode[],
      routeLabel: bundle.routeLabel,
      departures: reverseDepartures,
    })),
  ];
});

const ANYTRIP_SURFACE_STOPS: SurfaceStop[] = [
  ...ROUTE_630_SURFACE_STOPS,
  ...ROUTE_630_MONASH_SURFACE_STOPS,
  ...ROUTE_1_SOUTH_MELBOURNE_SURFACE_STOPS,
  ...ROUTE_1_EAST_COBURG_SURFACE_STOPS,
  ...ROUTE_96_ST_KILDA_SURFACE_STOPS,
  ...ROUTE_96_EAST_BRUNSWICK_SURFACE_STOPS,
  ...ROUTE_3_EAST_MALVERN_SURFACE_STOPS,
  ...ROUTE_3_UNIVERSITY_SURFACE_STOPS,
  ...ROUTE_5_MALVERN_SURFACE_STOPS,
  ...ROUTE_5_UNIVERSITY_SURFACE_STOPS,
  ...ROUTE_6_GLEN_IRIS_SURFACE_STOPS,
  ...ROUTE_6_MORELAND_SURFACE_STOPS,
  ...ROUTE_11_DOCKLANDS_SURFACE_STOPS,
  ...ROUTE_11_WEST_PRESTON_SURFACE_STOPS,
  ...ROUTE_16_KEW_SURFACE_STOPS,
  ...ROUTE_16_UNIVERSITY_SURFACE_STOPS,
  ...ROUTE_67_CARNEGIE_SURFACE_STOPS,
  ...ROUTE_67_UNIVERSITY_SURFACE_STOPS,
  ...ROUTE_64_EASTBOUND_SURFACE_STOPS,
  ...ROUTE_64_WESTBOUND_SURFACE_STOPS,
  ...GENERATED_TRAM_SURFACE_STOPS,
];

function getPrimarySurfaceDestination(stop: SurfaceStop) {
  return stop.departures[0]?.destination?.trim() ?? "";
}

function getOrderedSurfaceRouteStops(referenceStop: SurfaceStop) {
  const primaryDestination = getPrimarySurfaceDestination(referenceStop);

  return ANYTRIP_SURFACE_STOPS.filter((stop) => {
    if (stop.routeLabel !== referenceStop.routeLabel) {
      return false;
    }

    if (!stop.modes.some((mode) => referenceStop.modes.includes(mode))) {
      return false;
    }

    return getPrimarySurfaceDestination(stop) === primaryDestination;
  });
}

export const LINES = {
  mernda: MERNDA_STATIONS,
  hurstbridge: HURSTBRIDGE_STATIONS,
  cliftonHillLoop: CLIFTONHILLGROUPLOOP_STATIONS,
  frankston: FRANKSTON_STATIONS,
  cranbourne: CRANBOURNE_STATIONS,
  pakenham: PAKENHAM_STATIONS,
  sunbury: SUNBURY_STATIONS,
  craigieburn: CRAIGIEBURN_STATIONS,
  upfield: UPFIELD_STATIONS,
  lilydale: LILYDALE_STATIONS,
  belgrave: BELGRAVE_STATIONS,
  alamein: ALAMEIN_STATIONS,
  glenWaverley: GLEN_WAVERLEY_STATIONS,
  metroTunnel: METRO_TUNNEL_STATIONS,
  sandringham: SANDRINGHAM_STATIONS,
  werribee: WERRIBEE_STATIONS,
  williamstown: WILLIAMSTOWN_STATIONS,
  altonaLoop: ALTONA_LOOP_STATIONS,
  gippsland: GIPPSLAND_STATIONS,
};

const PLATFORM_PRESET_PRIORITY = [
  "metroTunnel",
  "frankston",
  "sandringham",
  "werribee",
  "williamstown",
  "mernda",
  "hurstbridge",
  "sunbury",
  "cranbourne",
  "pakenham",
  "craigieburn",
  "upfield",
  "belgrave",
  "lilydale",
  "glenWaverley",
  "alamein",
  "altonaLoop",
] as const;

type PlatformBoardEntry = {
  platform: string;
  label: string;
  tone: string;
  layoutClass?: string;
  services: Array<{
    destination: string;
    etaLabel: string;
    tdnLabel: string;
    statusLabel?: string;
    originLabel?: string;
    viaLabel?: string;
  }>;
  emptyState?: string;
};

type DepartureBoardColumn = {
  title: string;
  accent: string;
  platform: string;
  scheduledTime: string;
  departingTime: string;
  status: string;
  via: string;
  stops: string[];
};

type SouthernCrossAccessAlert = {
  title: string;
  summary: string;
  affectedPlatforms: string[];
  groups: string[];
  tone: string;
};

type FreightMovement = {
  operator: string;
  serviceId: string;
  movement: string;
  timeLabel: string;
  lineLabel: string;
  statusLabel: string;
  note?: string;
};

const SOUTH_YARRA_PLATFORM_BOARD: PlatformBoardEntry[] = [
  {
    platform: "1",
    label: "Platform 1 · Flinders Street / Newport",
    tone: "bg-pink-500/12 border-pink-400/20 text-pink-100",
    services: [
      { destination: "Flinders Street", etaLabel: "13:53", tdnLabel: "TDN X086", statusLabel: "1m late" },
      { destination: "Flinders Street → Newport", etaLabel: "14:23", tdnLabel: "TDN X090 → 6265", statusLabel: "On Time" },
    ],
  },
  {
    platform: "2",
    label: "Platform 2 · Sandringham",
    tone: "bg-pink-500/12 border-pink-400/20 text-pink-100",
    services: [
      { destination: "Sandringham", etaLabel: "13:43", tdnLabel: "TDN X081", statusLabel: "1m late" },
      { destination: "Sandringham", etaLabel: "13:58", tdnLabel: "TDN X083", statusLabel: "On Time" },
    ],
  },
  {
    platform: "3",
    label: "Platform 3 · City Loop",
    tone: "bg-emerald-500/12 border-emerald-400/20 text-emerald-100",
    services: [
      { destination: "City Loop", etaLabel: "13:45", tdnLabel: "TDN 4902", statusLabel: "On Time" },
      { destination: "City Loop", etaLabel: "13:55", tdnLabel: "TDN 4904", statusLabel: "2m late" },
    ],
  },
  {
    platform: "4",
    label: "Platform 4 · Frankston",
    tone: "bg-emerald-500/12 border-emerald-400/20 text-emerald-100",
    services: [
      { destination: "Frankston", etaLabel: "13:43", tdnLabel: "TDN 4413", statusLabel: "On Time" },
      { destination: "Frankston", etaLabel: "13:53", tdnLabel: "TDN 4415", statusLabel: "On Time" },
    ],
  },
];

const RICHMOND_PLATFORM_BOARD: PlatformBoardEntry[] = [
  {
    platform: "1",
    label: "Platform 1 - Flinders Street / Newport",
    tone: "bg-pink-500/12 border-pink-400/20 text-pink-100",
    services: [
      { destination: "Flinders Street", etaLabel: "13:56", tdnLabel: "TDN X086", statusLabel: "1m late" },
      { destination: "Flinders Street", etaLabel: "14:11", tdnLabel: "TDN X088", statusLabel: "2m late" },
    ],
  },
  {
    platform: "2",
    label: "Platform 2 - Sandringham",
    tone: "bg-pink-500/12 border-pink-400/20 text-pink-100",
    services: [
      { destination: "Sandringham", etaLabel: "13:55", tdnLabel: "TDN X083", statusLabel: "On Time" },
      { destination: "Sandringham", etaLabel: "14:10", tdnLabel: "TDN X085", statusLabel: "On Time" },
    ],
  },
  {
    platform: "3",
    label: "Platform 3 - City Loop",
    tone: "bg-emerald-500/12 border-emerald-400/20 text-emerald-100",
    services: [
      { destination: "City Loop", etaLabel: "13:58", tdnLabel: "TDN 4904", statusLabel: "1m late" },
      { destination: "City Loop", etaLabel: "14:08", tdnLabel: "TDN 4906", statusLabel: "On Time" },
    ],
  },
  {
    platform: "4",
    label: "Platform 4 - Frankston",
    tone: "bg-emerald-500/12 border-emerald-400/20 text-emerald-100",
    services: [
      { destination: "Frankston", etaLabel: "13:50", tdnLabel: "TDN 4415", statusLabel: "On Time" },
      { destination: "Frankston", etaLabel: "14:00", tdnLabel: "TDN 4417", statusLabel: "On Time" },
    ],
  },
  {
    platform: "5",
    label: "Platform 5 - Southern Cross",
    tone: "bg-violet-500/12 border-violet-400/20 text-violet-100",
    services: [
      { destination: "Southern Cross", etaLabel: "14:02", tdnLabel: "TDN 8428", statusLabel: "1m late" },
      { destination: "Southern Cross", etaLabel: "14:42", tdnLabel: "TDN 8430", statusLabel: "On Time" },
    ],
  },
  {
    platform: "6",
    label: "Platform 6 - Traralgon",
    tone: "bg-violet-500/12 border-violet-400/20 text-violet-100",
    services: [
      { destination: "Traralgon", etaLabel: "13:58", tdnLabel: "TDN 8427", statusLabel: "Scheduled" },
      { destination: "Traralgon", etaLabel: "14:38", tdnLabel: "TDN 8429", statusLabel: "Scheduled" },
    ],
  },
  {
    platform: "7",
    label: "Platform 7 - Flinders Street",
    tone: "bg-blue-500/12 border-blue-400/25 text-blue-100",
    services: [
      { destination: "Flinders Street", etaLabel: "14:03", tdnLabel: "TDN 2080", statusLabel: "On Time" },
      { destination: "Flinders Street", etaLabel: "14:17", tdnLabel: "TDN 3004", statusLabel: "4m late" },
    ],
  },
  {
    platform: "8",
    label: "Platform 8 - Flinders Street",
    tone: "bg-blue-500/12 border-blue-400/25 text-blue-100",
    services: [
      { destination: "Flinders Street", etaLabel: "14:02", tdnLabel: "TDN 3204", statusLabel: "2m late" },
      { destination: "Flinders Street", etaLabel: "14:18", tdnLabel: "TDN 2082", statusLabel: "On Time" },
    ],
  },
  {
    platform: "9",
    label: "Platform 9 - Burnley group",
    tone: "bg-blue-500/12 border-blue-400/25 text-blue-100",
    services: [
      { destination: "Glen Waverley", etaLabel: "13:51", tdnLabel: "TDN 2605", statusLabel: "3m late" },
      { destination: "Belgrave", etaLabel: "13:53", tdnLabel: "TDN 3603", statusLabel: "4m late" },
    ],
  },
  {
    platform: "10",
    label: "Platform 10 - Burnley group",
    tone: "bg-blue-500/12 border-blue-400/25 text-blue-100",
    services: [
      { destination: "Glen Waverley", etaLabel: "15:21", tdnLabel: "TDN 2081", statusLabel: "1m late" },
      { destination: "Blackburn", etaLabel: "15:50", tdnLabel: "TDN 3905", statusLabel: "3m late" },
    ],
  },
];

const FOOTSCRAY_PLATFORM_BOARD: PlatformBoardEntry[] = [
  {
    platform: "1",
    label: "Platform 1 · Metro Tunnel eastbound",
    tone: "bg-[#279FD5]/12 border-[#279FD5]/25 text-[#d7f4ff]",
    services: [
      { destination: "Town Hall → East Pakenham", etaLabel: "14:42", tdnLabel: "TDN Z074 → C071", statusLabel: "On Time", originLabel: "Origin Footscray", viaLabel: "Metro Tunnel" },
      { destination: "Town Hall → Cranbourne", etaLabel: "14:52", tdnLabel: "TDN Z458 → C471", statusLabel: "On Time", originLabel: "Origin Footscray", viaLabel: "Metro Tunnel" },
      { destination: "Town Hall → East Pakenham", etaLabel: "15:02", tdnLabel: "TDN Z076 → C073", statusLabel: "On Time", originLabel: "Origin Footscray", viaLabel: "Metro Tunnel" },
      { destination: "Town Hall → Cranbourne", etaLabel: "15:12", tdnLabel: "TDN Z460 → C473", statusLabel: "On Time", originLabel: "Origin Footscray", viaLabel: "Metro Tunnel" },
      { destination: "Town Hall → East Pakenham", etaLabel: "15:22", tdnLabel: "TDN Z078 → C075", statusLabel: "On Time", originLabel: "Origin Footscray", viaLabel: "Metro Tunnel" },
      { destination: "Town Hall → Cranbourne", etaLabel: "15:32", tdnLabel: "TDN Z462 → C475", statusLabel: "1m late", originLabel: "Origin Footscray", viaLabel: "Metro Tunnel" },
    ],
  },
  {
    platform: "2",
    label: "Platform 2 · Sunbury / Watergardens",
    tone: "bg-[#279FD5]/12 border-[#279FD5]/25 text-[#d7f4ff]",
    services: [
      { destination: "Sunbury", etaLabel: "14:46", tdnLabel: "TDN Z069", statusLabel: "On Time", originLabel: "Origin Town Hall", viaLabel: "Metro Tunnel" },
      { destination: "Watergardens", etaLabel: "14:56", tdnLabel: "TDN Z467", statusLabel: "On Time", originLabel: "Origin Town Hall", viaLabel: "Metro Tunnel" },
      { destination: "Sunbury", etaLabel: "15:06", tdnLabel: "TDN Z071", statusLabel: "On Time", originLabel: "Origin Town Hall", viaLabel: "Metro Tunnel" },
      { destination: "Watergardens", etaLabel: "15:16", tdnLabel: "TDN Z469", statusLabel: "On Time", originLabel: "Origin Town Hall", viaLabel: "Metro Tunnel" },
      { destination: "Sunbury", etaLabel: "15:26", tdnLabel: "TDN Z073", statusLabel: "On Time", originLabel: "Origin Town Hall", viaLabel: "Metro Tunnel" },
      { destination: "Watergardens", etaLabel: "15:36", tdnLabel: "TDN Z471", statusLabel: "On Time", originLabel: "Origin Town Hall", viaLabel: "Metro Tunnel" },
    ],
  },
  {
    platform: "3",
    label: "Platform 3 · Southern Cross / regional",
    tone: "bg-violet-500/12 border-violet-400/20 text-violet-100",
    services: [
      { destination: "Southern Cross", etaLabel: "14:42", tdnLabel: "TDN 8134", statusLabel: "On Time", originLabel: "Regional shuttle", viaLabel: "Westbound arrival" },
      { destination: "Southern Cross", etaLabel: "14:50", tdnLabel: "TDN 8772", statusLabel: "2m early", originLabel: "Regional shuttle", viaLabel: "Westbound arrival" },
      { destination: "Southern Cross", etaLabel: "15:10", tdnLabel: "TDN 8774", statusLabel: "1m early", originLabel: "Regional shuttle", viaLabel: "Westbound arrival" },
      { destination: "Southern Cross", etaLabel: "15:19", tdnLabel: "TDN 8074", statusLabel: "On Time", originLabel: "Regional shuttle", viaLabel: "Westbound arrival" },
      { destination: "Southern Cross", etaLabel: "15:22", tdnLabel: "TDN 8136", statusLabel: "1m late", originLabel: "Regional shuttle", viaLabel: "Westbound arrival" },
      { destination: "Southern Cross", etaLabel: "15:30", tdnLabel: "TDN 8776", statusLabel: "On Time", originLabel: "Regional shuttle", viaLabel: "Westbound arrival" },
    ],
  },
  {
    platform: "4",
    label: "Platform 4 · Geelong / Ballarat / Bendigo",
    tone: "bg-violet-500/12 border-violet-400/20 text-violet-100",
    services: [
      { destination: "Waurn Ponds", etaLabel: "14:38", tdnLabel: "TDN 8759", statusLabel: "1m late", originLabel: "Origin Southern Cross", viaLabel: "Regional" },
      { destination: "Wendouree", etaLabel: "14:43", tdnLabel: "TDN 8129", statusLabel: "2m late", originLabel: "Origin Southern Cross", viaLabel: "Regional" },
      { destination: "Waurn Ponds", etaLabel: "14:58", tdnLabel: "TDN 8761", statusLabel: "1m late", originLabel: "Origin Southern Cross", viaLabel: "Regional" },
      { destination: "Bendigo", etaLabel: "15:10", tdnLabel: "TDN 8027", statusLabel: "1m late", originLabel: "Origin Southern Cross", viaLabel: "Regional" },
      { destination: "Waurn Ponds", etaLabel: "15:18", tdnLabel: "TDN 8763", statusLabel: "1m late", originLabel: "Origin Southern Cross", viaLabel: "Regional" },
      { destination: "Wendouree", etaLabel: "15:23", tdnLabel: "TDN 8131", statusLabel: "2m late", originLabel: "Origin Southern Cross", viaLabel: "Regional" },
    ],
  },
  {
    platform: "5",
    label: "Platform 5 · Flinders Street",
    tone: "bg-pink-500/12 border-pink-400/20 text-pink-100",
    services: [
      { destination: "Flinders Street", etaLabel: "14:45", tdnLabel: "TDN 6320", statusLabel: "4m late", originLabel: "Origin Williamstown", viaLabel: "City bound" },
      { destination: "Flinders Street", etaLabel: "14:55", tdnLabel: "TDN 6456", statusLabel: "2m late", originLabel: "Origin Werribee", viaLabel: "City bound" },
      { destination: "Flinders Street", etaLabel: "15:05", tdnLabel: "TDN 6322", statusLabel: "3m late", originLabel: "Origin Williamstown", viaLabel: "City bound" },
      { destination: "Flinders Street", etaLabel: "15:15", tdnLabel: "TDN 6458", statusLabel: "2m late", originLabel: "Origin Werribee", viaLabel: "City bound" },
      { destination: "Flinders Street", etaLabel: "15:25", tdnLabel: "TDN 6324", statusLabel: "On Time", originLabel: "Origin Williamstown", viaLabel: "City bound" },
      { destination: "Flinders Street", etaLabel: "15:35", tdnLabel: "TDN 6460", statusLabel: "1m late", originLabel: "Origin Werribee", viaLabel: "City bound" },
    ],
  },
  {
    platform: "6",
    label: "Platform 6 · Werribee / Williamstown",
    tone: "bg-pink-500/12 border-pink-400/20 text-pink-100",
    services: [
      { destination: "Williamstown", etaLabel: "14:43", tdnLabel: "TDN 6325", statusLabel: "On Time", originLabel: "Origin Flinders Street", viaLabel: "Werribee corridor" },
      { destination: "Werribee", etaLabel: "14:53", tdnLabel: "TDN 6457", statusLabel: "On Time", originLabel: "Origin Flinders Street", viaLabel: "Werribee corridor" },
      { destination: "Williamstown", etaLabel: "15:03", tdnLabel: "TDN 6327", statusLabel: "On Time", originLabel: "Origin Flinders Street", viaLabel: "Werribee corridor" },
      { destination: "Werribee", etaLabel: "15:13", tdnLabel: "TDN 6459", statusLabel: "3m late", originLabel: "Origin Flinders Street", viaLabel: "Werribee corridor" },
      { destination: "Williamstown", etaLabel: "15:23", tdnLabel: "TDN 6329", statusLabel: "On Time", originLabel: "Origin Flinders Street", viaLabel: "Werribee corridor" },
      { destination: "Werribee", etaLabel: "15:33", tdnLabel: "TDN 6461", statusLabel: "On Time", originLabel: "Origin Flinders Street", viaLabel: "Werribee corridor" },
    ],
  },
];

const MALVERN_PLATFORM_BOARD: PlatformBoardEntry[] = [
  {
    platform: "1",
    label: "Platform 1 · City Loop / Metro Tunnel",
    tone: "bg-[#279FD5]/12 border-[#279FD5]/25 text-[#d7f4ff]",
    services: [
      {
        destination: "Town Hall",
        etaLabel: "10:06",
        tdnLabel: "TDN Z458 → C471",
        statusLabel: "On Time",
        originLabel: "Origin Cranbourne",
        viaLabel: "Metro Tunnel",
      },
      {
        destination: "City Loop",
        etaLabel: "10:15",
        tdnLabel: "TDN 4858 → 4375",
        statusLabel: "3m late",
        originLabel: "Origin Frankston",
        viaLabel: "Stops all via City Loop",
      },
    ],
  },
  {
    platform: "2",
    label: "Platform 2 · Frankston",
    tone: "bg-emerald-500/12 border-emerald-400/20 text-emerald-100",
    services: [
      {
        destination: "Frankston",
        etaLabel: "10:24",
        tdnLabel: "TDN 4860 → 4377",
        statusLabel: "8m late",
        originLabel: "Origin City Loop",
        viaLabel: "Stops all stations",
      },
      {
        destination: "Mordialloc",
        etaLabel: "10:33",
        tdnLabel: "TDN 4862 → 4379",
        statusLabel: "1m late",
        originLabel: "Origin Flinders Street",
        viaLabel: "Frankston line",
      },
    ],
  },
  {
    platform: "3",
    label: "Platform 3 · Cranbourne / Pakenham",
    tone: "bg-[#279FD5]/12 border-[#279FD5]/25 text-[#d7f4ff]",
    services: [
      {
        destination: "Cranbourne",
        etaLabel: "10:32",
        tdnLabel: "TDN Z460 → C473",
        statusLabel: "On Time",
        originLabel: "Platform 3",
        viaLabel: "Metro Tunnel",
      },
      {
        destination: "Pakenham",
        etaLabel: "10:42",
        tdnLabel: "TDN Z078 → C075",
        statusLabel: "On Time",
        originLabel: "Platform 3",
        viaLabel: "Metro Tunnel",
      },
    ],
  },
];

const CAULFIELD_PLATFORM_BOARD: PlatformBoardEntry[] = [
  {
    platform: "1",
    label: "Platform 1 · City Loop",
    tone: "bg-emerald-500/12 border-emerald-400/20 text-emerald-100",
    services: [
      {
        destination: "City Loop",
        etaLabel: "10:05",
        tdnLabel: "TDN 4860",
        statusLabel: "2m late",
        originLabel: "Origin Caulfield",
        viaLabel: "Stops all via City Loop",
      },
      {
        destination: "City Loop",
        etaLabel: "10:14",
        tdnLabel: "TDN 4862",
        statusLabel: "3m late",
        originLabel: "Origin Caulfield",
        viaLabel: "Stops all via City Loop",
      },
      {
        destination: "City Loop",
        etaLabel: "10:24",
        tdnLabel: "TDN 4864",
        statusLabel: "2m late",
        originLabel: "Origin Caulfield",
        viaLabel: "Stops all via City Loop",
      },
      {
        destination: "City Loop",
        etaLabel: "10:34",
        tdnLabel: "TDN 4866",
        statusLabel: "2m late",
        originLabel: "Origin Caulfield",
        viaLabel: "Stops all via City Loop",
      },
    ],
  },
  {
    platform: "2",
    label: "Platform 2 · Frankston / Dandenong / Sunbury",
    tone: "bg-emerald-500/12 border-emerald-400/20 text-emerald-100",
    services: [
      {
        destination: "Frankston",
        etaLabel: "10:04",
        tdnLabel: "TDN 4367",
        statusLabel: "On Time",
        originLabel: "Origin Flinders Street",
        viaLabel: "Frankston line",
      },
      {
        destination: "Frankston",
        etaLabel: "10:24",
        tdnLabel: "TDN 4371",
        statusLabel: "On Time",
        originLabel: "Origin Flinders Street",
        viaLabel: "Frankston line",
      },
      {
        destination: "Frankston",
        etaLabel: "10:34",
        tdnLabel: "TDN 4373",
        statusLabel: "On Time",
        originLabel: "Origin Flinders Street",
        viaLabel: "Frankston line",
      },
      {
        destination: "Town Hall → Sunbury",
        etaLabel: "10:40",
        tdnLabel: "TDN C456 → Z047",
        statusLabel: "On Time",
        originLabel: "Origin Cranbourne / Pakenham",
        viaLabel: "Metro Tunnel",
      },
    ],
  },
  {
    platform: "3",
    label: "Platform 3 · Cranbourne / Pakenham / Watergardens",
    tone: "bg-[#279FD5]/12 border-[#279FD5]/25 text-[#d7f4ff]",
    services: [
      {
        destination: "Town Hall → Sunbury",
        etaLabel: "10:00",
        tdnLabel: "TDN C452 → Z043",
        statusLabel: "2m late",
        originLabel: "Origin Pakenham corridor",
        viaLabel: "Metro Tunnel",
      },
      {
        destination: "East Pakenham",
        etaLabel: "10:09",
        tdnLabel: "TDN C041",
        statusLabel: "On Time",
        originLabel: "Origin Town Hall",
        viaLabel: "Metro Tunnel",
      },
      {
        destination: "Cranbourne",
        etaLabel: "10:19",
        tdnLabel: "TDN C441",
        statusLabel: "On Time",
        originLabel: "Origin Town Hall",
        viaLabel: "Metro Tunnel",
      },
      {
        destination: "Town Hall → Watergardens",
        etaLabel: "10:30",
        tdnLabel: "TDN C054 → Z443",
        statusLabel: "1m late",
        originLabel: "Origin Cranbourne / Pakenham",
        viaLabel: "Metro Tunnel",
      },
    ],
  },
  {
    platform: "4",
    label: "Platform 4 · Gippsland / City Loop / Frankston",
    tone: "bg-violet-500/12 border-violet-400/20 text-violet-100",
    services: [
      {
        destination: "Traralgon",
        etaLabel: "10:04",
        tdnLabel: "TDN 8415",
        statusLabel: "1m late",
        originLabel: "V/Line",
        viaLabel: "Gippsland line",
      },
      {
        destination: "City Loop",
        etaLabel: "10:14",
        tdnLabel: "TDN 4862",
        statusLabel: "3m late",
        originLabel: "Origin Caulfield",
        viaLabel: "Stops all via City Loop",
      },
      {
        destination: "Town Hall → Sunbury",
        etaLabel: "10:20",
        tdnLabel: "TDN C454 → Z045",
        statusLabel: "On Time",
        originLabel: "Origin Cranbourne / Pakenham",
        viaLabel: "Metro Tunnel",
      },
      {
        destination: "Frankston",
        etaLabel: "10:34",
        tdnLabel: "TDN 4373",
        statusLabel: "On Time",
        originLabel: "Origin Flinders Street",
        viaLabel: "Frankston line",
      },
    ],
  },
];

const DANDENONG_PLATFORM_BOARD: PlatformBoardEntry[] = [
  {
    platform: "1",
    label: "Platform 1 · City bound",
    tone: "bg-[#279FD5]/12 border-[#279FD5]/25 text-[#d7f4ff]",
    services: [
      {
        destination: "Town Hall → Watergardens",
        etaLabel: "14:02",
        tdnLabel: "TDN C064 → Z453",
        statusLabel: "On Time",
        originLabel: "Origin Cranbourne / Pakenham",
        viaLabel: "Metro Tunnel",
      },
      {
        destination: "Town Hall → Sunbury",
        etaLabel: "14:12",
        tdnLabel: "TDN C458 → Z049",
        statusLabel: "1m late",
        originLabel: "Origin Pakenham corridor",
        viaLabel: "Metro Tunnel",
      },
    ],
  },
  {
    platform: "2",
    label: "Platform 2 · Cranbourne / Pakenham",
    tone: "bg-[#279FD5]/12 border-[#279FD5]/25 text-[#d7f4ff]",
    services: [
      {
        destination: "Cranbourne",
        etaLabel: "14:09",
        tdnLabel: "TDN C447",
        statusLabel: "On Time",
        originLabel: "Origin Town Hall",
        viaLabel: "Metro Tunnel",
      },
      {
        destination: "East Pakenham",
        etaLabel: "14:19",
        tdnLabel: "TDN C049",
        statusLabel: "On Time",
        originLabel: "Origin Town Hall",
        viaLabel: "Metro Tunnel",
      },
    ],
  },
  {
    platform: "3",
    label: "Platform 3 · Gippsland regional",
    tone: "bg-violet-500/12 border-violet-400/20 text-violet-100",
    services: [
      {
        destination: "Southern Cross",
        etaLabel: "14:24",
        tdnLabel: "TDN 8420",
        statusLabel: "Westbound",
        originLabel: "Origin Traralgon",
        viaLabel: "Gippsland line",
      },
      {
        destination: "Traralgon",
        etaLabel: "14:44",
        tdnLabel: "TDN 8421",
        statusLabel: "Eastbound",
        originLabel: "Origin Southern Cross",
        viaLabel: "Gippsland line",
      },
    ],
  },
];

const CLAYTON_PLATFORM_BOARD: PlatformBoardEntry[] = [
  {
    platform: "1",
    label: "Platform 1 Â· City bound / Gippsland westbound",
    tone: "bg-[#279FD5]/12 border-[#279FD5]/25 text-[#d7f4ff]",
    services: [
      {
        destination: "Town Hall â†’ Watergardens",
        etaLabel: "14:08",
        tdnLabel: "TDN C064 â†’ Z453",
        statusLabel: "On Time",
        originLabel: "Origin Cranbourne / Pakenham",
        viaLabel: "Metro Tunnel",
      },
      {
        destination: "Southern Cross",
        etaLabel: "14:36",
        tdnLabel: "TDN 8420",
        statusLabel: "Regional express",
        originLabel: "Origin Traralgon",
        viaLabel: "Gippsland line",
      },
    ],
  },
  {
    platform: "2",
    label: "Platform 2 Â· Pakenham / Gippsland eastbound",
    tone: "bg-violet-500/12 border-violet-400/20 text-violet-100",
    services: [
      {
        destination: "East Pakenham",
        etaLabel: "14:19",
        tdnLabel: "TDN C049",
        statusLabel: "On Time",
        originLabel: "Origin Town Hall",
        viaLabel: "Metro Tunnel",
      },
      {
        destination: "Traralgon",
        etaLabel: "14:44",
        tdnLabel: "TDN 8421",
        statusLabel: "Regional express",
        originLabel: "Origin Southern Cross",
        viaLabel: "Gippsland line",
      },
    ],
  },
];

const CITY_LOOP_PLATFORM_BOARD: PlatformBoardEntry[] = [
  {
    platform: "1",
    label: "Platform 1 · Clifton Hill loop",
    tone: "bg-red-500/12 border-red-400/20 text-red-100",
    services: [
      { destination: "Mernda", etaLabel: "09:59", tdnLabel: "TDN 1673", statusLabel: "1m late", originLabel: "Origin Flinders Street", viaLabel: "Via City Loop" },
      { destination: "Hurstbridge", etaLabel: "10:06", tdnLabel: "TDN 1861", statusLabel: "On Time", originLabel: "Origin Flinders Street", viaLabel: "Via City Loop" },
    ],
  },
  {
    platform: "2",
    label: "Platform 2 · Caulfield / Frankston",
    tone: "bg-emerald-500/12 border-emerald-400/20 text-emerald-100",
    services: [
      { destination: "Flinders Street → Frankston", etaLabel: "10:06", tdnLabel: "TDN 4856 → 4373", statusLabel: "1m late" },
      { destination: "Flinders Street → Frankston", etaLabel: "10:15", tdnLabel: "TDN 4858 → 4375", statusLabel: "3m late" },
    ],
  },
  {
    platform: "3",
    label: "Platform 3 · Northern loop",
    tone: "bg-yellow-500/12 border-yellow-400/25 text-yellow-100",
    services: [
      { destination: "Flinders Street → Craigieburn", etaLabel: "10:05", tdnLabel: "TDN 5634 → 5261", statusLabel: "3m late" },
      { destination: "Flinders Street → Upfield", etaLabel: "10:15", tdnLabel: "TDN 5868 → 5037", statusLabel: "2m late" },
    ],
  },
  {
    platform: "4",
    label: "Platform 4 · Burnley loop",
    tone: "bg-blue-500/12 border-blue-400/20 text-blue-100",
    services: [
      { destination: "Flinders Street → Lilydale", etaLabel: "09:54", tdnLabel: "TDN 3634 → 3227", statusLabel: "4m late" },
      { destination: "Flinders Street → Glen Waverley", etaLabel: "10:08", tdnLabel: "TDN 3918 → 2055", statusLabel: "3m late" },
    ],
  },
];

const TOWN_HALL_PLATFORM_BOARD: PlatformBoardEntry[] = [
  {
    platform: "1",
    label: "Platform 1 · Sunbury / Watergardens",
    tone: "bg-[#279FD5]/12 border-[#279FD5]/25 text-[#d7f4ff]",
    services: [
      {
        destination: "Sunbury",
        etaLabel: "10:06",
        tdnLabel: "TDN Z069",
        statusLabel: "On Time",
        originLabel: "Origin Footscray",
        viaLabel: "Metro Tunnel",
      },
      {
        destination: "Watergardens",
        etaLabel: "10:16",
        tdnLabel: "TDN Z071",
        statusLabel: "On Time",
        originLabel: "Origin Footscray",
        viaLabel: "Metro Tunnel",
      },
    ],
  },
  {
    platform: "2",
    label: "Platform 2 · Cranbourne / Pakenham",
    tone: "bg-[#279FD5]/12 border-[#279FD5]/25 text-[#d7f4ff]",
    services: [
      {
        destination: "Cranbourne",
        etaLabel: "10:08",
        tdnLabel: "TDN Z458 → C471",
        statusLabel: "On Time",
        originLabel: "Origin Footscray",
        viaLabel: "Metro Tunnel",
      },
      {
        destination: "Pakenham",
        etaLabel: "10:18",
        tdnLabel: "TDN Z074 → C071",
        statusLabel: "On Time",
        originLabel: "Origin Footscray",
        viaLabel: "Metro Tunnel",
      },
    ],
  },
  {
    platform: "EXT",
    label: "Extension · Flinders Street",
    tone: "bg-white/6 border-white/15 text-white",
    services: [
      {
        destination: "Flinders Street",
        etaLabel: "10:10",
        tdnLabel: "TDN Z069",
        statusLabel: "2 min after Town Hall",
        originLabel: "Southbound extension",
        viaLabel: "Continues beyond Town Hall",
      },
      {
        destination: "Flinders Street",
        etaLabel: "10:20",
        tdnLabel: "TDN Z458 → C471",
        statusLabel: "2 min after Town Hall",
        originLabel: "Southbound extension",
        viaLabel: "Continues beyond Town Hall",
      },
    ],
  },
];

const METRO_TUNNEL_CONNECTION_BOARD: PlatformBoardEntry = {
  platform: "MT",
  label: "Metro Tunnel · Platforms 1 / 2",
  tone: "bg-[#279FD5]/12 border-[#279FD5]/25 text-[#d7f4ff]",
  services: [
    {
      destination: "Sunbury",
      etaLabel: "10:02",
      tdnLabel: "TDN MT01",
      statusLabel: "On Time",
      originLabel: "Platform 1",
      viaLabel: "Watergardens branch",
    },
    {
      destination: "Pakenham / Cranbourne",
      etaLabel: "10:08",
      tdnLabel: "TDN MT02",
      statusLabel: "1m late",
      originLabel: "Platform 2",
      viaLabel: "Metro Tunnel",
    },
  ],
};

const FLINDERS_STREET_PLATFORM_BOARD: PlatformBoardEntry[] = [
  {
    platform: "1",
    label: "Platform 1 - Mernda / Hurstbridge",
    tone: "bg-[#BE1014]/12 border-[#BE1014]/25 text-[#ffd6d8]",
    services: [
      { destination: "Mernda", etaLabel: "09:47", tdnLabel: "TDN 1671", statusLabel: "On Time" },
      { destination: "Mernda", etaLabel: "09:52", tdnLabel: "TDN 1673", statusLabel: "2m late" },
    ],
  },
  {
    platform: "2",
    label: "Platform 2 - Burnley group",
    tone: "bg-blue-500/12 border-blue-400/25 text-blue-100",
    services: [
      { destination: "Blackburn", etaLabel: "09:44", tdnLabel: "TDN 3427", statusLabel: "On Time" },
      { destination: "Belgrave", etaLabel: "09:56", tdnLabel: "TDN 3021", statusLabel: "On Time" },
    ],
  },
  {
    platform: "3",
    label: "Platform 3 - Burnley group",
    tone: "bg-blue-500/12 border-blue-400/25 text-blue-100",
    services: [
      { destination: "Lilydale", etaLabel: "09:40", tdnLabel: "TDN 3225", statusLabel: "On Time" },
      { destination: "Glen Waverley", etaLabel: "09:48", tdnLabel: "TDN 2051", statusLabel: "1m late" },
    ],
  },
  {
    platform: "4",
    label: "Platform 4 - Northern group",
    tone: "bg-yellow-500/12 border-yellow-400/25 text-yellow-100",
    services: [
      { destination: "Broadmeadows", etaLabel: "09:54", tdnLabel: "TDN 5257", statusLabel: "On Time" },
      { destination: "Upfield", etaLabel: "10:06", tdnLabel: "TDN 5035", statusLabel: "On Time" },
    ],
  },
  {
    platform: "5",
    label: "Platform 5 - Northern group",
    tone: "bg-yellow-500/12 border-yellow-400/25 text-yellow-100",
    services: [
      { destination: "Upfield", etaLabel: "09:50", tdnLabel: "TDN 5033", statusLabel: "On Time" },
      { destination: "Craigieburn", etaLabel: "09:58", tdnLabel: "TDN 5259", statusLabel: "On Time" },
    ],
  },
  {
    platform: "6",
    label: "Platform 6 - Frankston / regional",
    tone: "bg-emerald-500/12 border-emerald-400/20 text-emerald-100",
    services: [
      { destination: "Frankston", etaLabel: "09:46", tdnLabel: "TDN 4367", statusLabel: "1m late" },
      { destination: "Traralgon", etaLabel: "09:52", tdnLabel: "TDN 8415", statusLabel: "On Time" },
    ],
  },
  {
    platform: "7",
    label: "Platform 7 - Frankston / regional",
    tone: "bg-emerald-500/12 border-emerald-400/20 text-emerald-100",
    services: [
      { destination: "Frankston", etaLabel: "10:06", tdnLabel: "TDN 4369", statusLabel: "On Time" },
      { destination: "Bairnsdale", etaLabel: "10:32", tdnLabel: "TDN 8417", statusLabel: "On Time" },
    ],
  },
  {
    platform: "8",
    label: "Platform 8 - Newport / Williamstown",
    tone: "bg-pink-500/12 border-pink-400/20 text-pink-100",
    services: [
      { destination: "Newport", etaLabel: "09:50", tdnLabel: "TDN 6255", statusLabel: "On Time" },
      { destination: "Williamstown", etaLabel: "09:57", tdnLabel: "TDN 6335", statusLabel: "On Time" },
    ],
  },
  {
    platform: "9",
    label: "Platform 9 - Newport / Williamstown",
    tone: "bg-pink-500/12 border-pink-400/20 text-pink-100",
    services: [
      { destination: "Williamstown", etaLabel: "09:42", tdnLabel: "TDN 6223", statusLabel: "On Time" },
      { destination: "Newport", etaLabel: "09:47", tdnLabel: "TDN 6441", statusLabel: "On Time" },
    ],
  },
  {
    platform: "10",
    label: "Platform 10 - Newport / Williamstown",
    tone: "bg-pink-500/12 border-pink-400/20 text-pink-100",
    services: [
      { destination: "Williamstown", etaLabel: "09:53", tdnLabel: "TDN 6319", statusLabel: "On Time" },
      { destination: "Newport", etaLabel: "10:04", tdnLabel: "TDN 6513", statusLabel: "On Time" },
    ],
  },
  {
    platform: "12",
    label: "Platform 12 - Sandringham overflow / 10B",
    tone: "bg-pink-500/10 border-pink-300/15 text-pink-100/90",
    services: [],
    emptyState: "Usually no departures. Rare Sandringham turnbacks only.",
  },
  {
    platform: "13",
    label: "Platform 13 - Sandringham",
    tone: "bg-pink-500/12 border-pink-400/20 text-pink-100",
    services: [
      { destination: "Sandringham", etaLabel: "09:51", tdnLabel: "TDN X051", statusLabel: "On Time" },
      { destination: "Sandringham", etaLabel: "10:06", tdnLabel: "TDN X053", statusLabel: "On Time" },
    ],
  },
];

const NORTH_MELBOURNE_PLATFORM_BOARD: PlatformBoardEntry[] = [
  {
    platform: "1",
    label: "Platform 1 · City Loop starters",
    tone: "bg-yellow-500/12 border-yellow-400/25 text-yellow-100",
    services: [
      {
        destination: "City Loop",
        etaLabel: "15:20",
        tdnLabel: "TDN UFD11",
        statusLabel: "Next service",
        originLabel: "Origin North Melbourne",
        viaLabel: "Via North Melbourne Loop",
      },
      {
        destination: "City Loop",
        etaLabel: "15:27",
        tdnLabel: "TDN UFD13",
        statusLabel: "Following",
        originLabel: "Origin North Melbourne",
        viaLabel: "Loop departure",
      },
    ],
  },
  {
    platform: "2",
    label: "Platform 2 · Upfield outbound",
    tone: "bg-yellow-500/12 border-yellow-400/25 text-yellow-100",
    services: [
      {
        destination: "Upfield",
        etaLabel: "15:23",
        tdnLabel: "TDN UFD21",
        statusLabel: "Next service",
        originLabel: "Origin City Loop",
        viaLabel: "Stops all outbound",
      },
      {
        destination: "Coburg",
        etaLabel: "15:32",
        tdnLabel: "TDN UFD22",
        statusLabel: "Following",
        originLabel: "Origin Flinders Street",
        viaLabel: "Short run",
      },
    ],
  },
  {
    platform: "3",
    label: "Platform 3 · Northern group City Loop",
    tone: "bg-yellow-500/12 border-yellow-400/25 text-yellow-100",
    services: [
      {
        destination: "City Loop",
        etaLabel: "15:24",
        tdnLabel: "TDN CGB15",
        statusLabel: "Next service",
        originLabel: "Origin North Melbourne",
        viaLabel: "Northern group via Loop",
      },
      {
        destination: "City Loop",
        etaLabel: "15:34",
        tdnLabel: "TDN CGB17",
        statusLabel: "Following",
        originLabel: "Origin North Melbourne",
        viaLabel: "Loop departure",
      },
    ],
  },
  {
    platform: "4",
    label: "Platform 4 · Craigieburn / Broadmeadows outbound",
    tone: "bg-yellow-500/12 border-yellow-400/25 text-yellow-100",
    services: [
      {
        destination: "Craigieburn",
        etaLabel: "15:26",
        tdnLabel: "TDN CGB31",
        statusLabel: "Next service",
        originLabel: "Origin City Loop",
        viaLabel: "Stops all outbound",
      },
      {
        destination: "Broadmeadows",
        etaLabel: "15:36",
        tdnLabel: "TDN CGB33",
        statusLabel: "Following",
        originLabel: "Origin Flinders Street",
        viaLabel: "Short run",
      },
    ],
  },
  {
    platform: "5",
    label: "Platform 5 · Flinders Street / through city",
    tone: "bg-slate-500/12 border-slate-300/20 text-slate-100",
    services: [
      {
        destination: "Flinders Street",
        etaLabel: "15:28",
        tdnLabel: "TDN XCY41",
        statusLabel: "Next service",
        originLabel: "Cross-city movement",
        viaLabel: "Through to city",
      },
      {
        destination: "City Loop",
        etaLabel: "15:39",
        tdnLabel: "TDN XCY43",
        statusLabel: "Following",
        originLabel: "Cross-city movement",
        viaLabel: "Loop-bound",
      },
    ],
  },
  {
    platform: "6",
    label: "Platform 6 · Werribee / Williamstown / Laverton",
    tone: "bg-pink-500/12 border-pink-400/20 text-pink-100",
    services: [
      {
        destination: "Werribee",
        etaLabel: "15:23",
        tdnLabel: "TDN WER21",
        statusLabel: "Next service",
        originLabel: "Origin Flinders Street",
        viaLabel: "Cross-city westbound",
      },
      {
        destination: "Laverton",
        etaLabel: "15:32",
        tdnLabel: "TDN WER22",
        statusLabel: "Following",
        originLabel: "Origin Flinders Street",
        viaLabel: "Stops all westbound",
      },
    ],
  },
];

const SOUTHERN_CROSS_DEPARTURE_BOARD: DepartureBoardColumn[] = [
  {
    title: "Waurn Ponds",
    accent: "bg-[#7c3aed]",
    platform: "2A",
    scheduledTime: "12:18",
    departingTime: "Now",
    status: "Geelong corridor",
    via: "via Geelong",
    stops: ["Southern Cross", "Footscray", "Tarneit", "Wyndham Vale", "Geelong", "Waurn Ponds"],
  },
  {
    title: "Wendouree",
    accent: "bg-[#7c3aed]",
    platform: "2B",
    scheduledTime: "12:24",
    departingTime: "12:24",
    status: "Ballarat line",
    via: "via Sunshine and Ballarat",
    stops: ["Southern Cross", "Sunshine", "Melton", "Ballarat", "Wendouree"],
  },
  {
    title: "Bendigo",
    accent: "bg-[#7c3aed]",
    platform: "3A",
    scheduledTime: "12:32",
    departingTime: "12:32",
    status: "Bendigo line",
    via: "via Sunbury and Castlemaine",
    stops: ["Southern Cross", "Sunbury", "Castlemaine", "Bendigo"],
  },
  {
    title: "Shepparton",
    accent: "bg-[#7c3aed]",
    platform: "3B",
    scheduledTime: "12:40",
    departingTime: "12:40",
    status: "Seymour corridor",
    via: "via Broadmeadows and Seymour",
    stops: ["Southern Cross", "Broadmeadows", "Seymour", "Nagambie", "Murchison East", "Shepparton"],
  },
  {
    title: "Traralgon",
    accent: "bg-[#7c3aed]",
    platform: "15/16",
    scheduledTime: "12:49",
    departingTime: "12:49",
    status: "Gippsland line",
    via: "via Pakenham and Moe",
    stops: ["Southern Cross", "Richmond", "Pakenham", "Moe", "Morwell", "Traralgon"],
  },
  {
    title: "Warrnambool",
    accent: "bg-[#7c3aed]",
    platform: "7A",
    scheduledTime: "13:02",
    departingTime: "13:02",
    status: "South West line",
    via: "via Geelong and Colac",
    stops: ["Southern Cross", "Geelong", "Colac", "Camperdown", "Warrnambool"],
  },
  {
    title: "Bacchus Marsh",
    accent: "bg-[#7c3aed]",
    platform: "8A",
    scheduledTime: "13:10",
    departingTime: "13:10",
    status: "Western regional",
    via: "via Sunshine and Melton",
    stops: ["Southern Cross", "Sunshine", "Caroline Springs", "Melton", "Bacchus Marsh"],
  },
];

const SOUTHERN_CROSS_PLATFORM_1_SERVICES = [
  {
    runId: "621",
    destination: "Sydney Central",
    lineLabel: "NSW TrainLink XPT",
    consist: "XP set",
    departureLabel: "7:50pm",
    dayLabel: "Tonight",
    statusLabel: "Timetabled",
  },
  {
    runId: "623",
    destination: "Sydney Central",
    lineLabel: "NSW TrainLink XPT",
    consist: "XP set",
    departureLabel: "8:30am",
    dayLabel: "Tomorrow",
    statusLabel: "Timetabled",
  },
  {
    runId: "XPT",
    destination: "Albury / Sydney Central",
    lineLabel: "NSW TrainLink XPT",
    consist: "Long distance",
    departureLabel: "Check boards",
    dayLabel: "Updates live",
    statusLabel: "Timetabled",
  },
];

const SOUTHERN_CROSS_ACCESS_ALERTS: SouthernCrossAccessAlert[] = [
  {
    title: "Southern Cross Escalator Upgrade Project",
    summary: "We’re upgrading the escalators on platforms 9–14 to make them more efficient and reliable.",
    affectedPlatforms: ["9/10", "11/12", "13/14"],
    groups: ["Burnley Loop", "Northern Loop", "Caulfield Loop", "Through suburban"],
    tone: "border-amber-400/20 bg-amber-500/10 text-amber-50",
  },
  {
    title: "Southern Cross Platforms 11 and 12",
    summary: "There is limited escalator access for passengers exiting Platforms 11/12 onto the Collins Street concourse.",
    affectedPlatforms: ["11/12"],
    groups: ["Northern Loop", "Caulfield Loop"],
    tone: "border-cyan-400/20 bg-cyan-500/10 text-cyan-50",
  },
];

const FREIGHT_MOVEMENT_BOARD: Record<string, FreightMovement[]> = {
  "North Melbourne": [
    {
      operator: "Pacific National",
      serviceId: "3MC1",
      movement: "Dynon -> Melbourne Freight Terminal",
      timeLabel: "18:42",
      lineLabel: "Broad gauge freight roads",
      statusLabel: "Due",
      note: "Interstate handoff",
    },
    {
      operator: "SCT Logistics",
      serviceId: "6PM7",
      movement: "Westbound interstate",
      timeLabel: "19:03",
      lineLabel: "Standard gauge main line",
      statusLabel: "Path set",
      note: "Through movement with no passenger boarding",
    },
  ],
  "South Kensington": [
    {
      operator: "Qube",
      serviceId: "9142",
      movement: "Appleton Dock transfer",
      timeLabel: "18:36",
      lineLabel: "Dock corridor",
      statusLabel: "Approaching",
      note: "Container shuttle",
    },
    {
      operator: "Pacific National",
      serviceId: "9791",
      movement: "Dynon -> Tottenham",
      timeLabel: "18:58",
      lineLabel: "Freight bypass",
      statusLabel: "Due",
      note: "Through movement",
    },
  ],
  Footscray: [
    {
      operator: "SCT Logistics",
      serviceId: "7MA8",
      movement: "Westbound interstate",
      timeLabel: "18:47",
      lineLabel: "Independent goods lines",
      statusLabel: "Due",
      note: "Runs clear of metro platforms",
    },
    {
      operator: "Pacific National",
      serviceId: "8246",
      movement: "Tottenham transfer",
      timeLabel: "19:12",
      lineLabel: "Freight corridor",
      statusLabel: "Path set",
      note: "Local terminal move",
    },
  ],
  Sunshine: [
    {
      operator: "Pacific National",
      serviceId: "9146",
      movement: "Maryvale paper train",
      timeLabel: "18:51",
      lineLabel: "Ballarat corridor",
      statusLabel: "Due",
      note: "Westbound freight path",
    },
    {
      operator: "SSR",
      serviceId: "7924",
      movement: "Grain working",
      timeLabel: "19:24",
      lineLabel: "Regional freight corridor",
      statusLabel: "Timetabled",
      note: "Indicative path",
    },
  ],
  Newport: [
    {
      operator: "Pacific National",
      serviceId: "8452",
      movement: "Appleton Dock -> Geelong",
      timeLabel: "18:40",
      lineLabel: "Western freight route",
      statusLabel: "Due",
      note: "Through freight road",
    },
    {
      operator: "Qube",
      serviceId: "9031",
      movement: "Port shuttle",
      timeLabel: "19:06",
      lineLabel: "Dock transfer corridor",
      statusLabel: "Approaching",
      note: "No passenger boarding",
    },
  ],
  Dandenong: [
    {
      operator: "Pacific National",
      serviceId: "9461",
      movement: "Long Island steel",
      timeLabel: "18:55",
      lineLabel: "South-east freight corridor",
      statusLabel: "Due",
      note: "Freight road movement",
    },
    {
      operator: "Qube",
      serviceId: "8810",
      movement: "Lyndhurst intermodal",
      timeLabel: "19:21",
      lineLabel: "Industrial branch path",
      statusLabel: "Timetabled",
      note: "Indicative path",
    },
  ],
};

const LINE_PLATFORM_PRESETS: Record<
  (typeof PLATFORM_PRESET_PRIORITY)[number],
  {
    inboundLabel: string;
    inboundServices: string[];
    outboundLabel: string;
    outboundServices: string[];
    tone: string;
  }
> = {
  metroTunnel: {
    inboundLabel: "Platform 1 � Sunbury / Watergardens",
    inboundServices: ["Sunbury", "Watergardens"],
    outboundLabel: "Platform 2 � Cranbourne / Pakenham",
    outboundServices: ["Cranbourne", "Pakenham"],
    tone: "bg-cyan-500/12 border-cyan-400/20 text-cyan-100",
  },
  frankston: {
    inboundLabel: "Platform 1 · City bound",
    inboundServices: ["Town Hall", "State Library"],
    outboundLabel: "Platform 2 · Frankston bound",
    outboundServices: ["Frankston", "Mordialloc"],
    tone: "bg-emerald-500/12 border-emerald-400/20 text-emerald-100",
  },
  sandringham: {
    inboundLabel: "Platform 1 · City bound",
    inboundServices: ["Flinders Street", "City Loop"],
    outboundLabel: "Platform 2 · Sandringham bound",
    outboundServices: ["Sandringham", "Brighton Beach"],
    tone: "bg-pink-500/12 border-pink-400/20 text-pink-100",
  },
  werribee: {
    inboundLabel: "Platform 1 · City bound",
    inboundServices: ["Flinders Street", "City Loop"],
    outboundLabel: "Platform 2 · Werribee bound",
    outboundServices: ["Werribee", "Laverton"],
    tone: "bg-pink-500/12 border-pink-400/20 text-pink-100",
  },
  williamstown: {
    inboundLabel: "Platform 1 · City bound",
    inboundServices: ["Flinders Street", "Southern Cross"],
    outboundLabel: "Platform 2 · Williamstown bound",
    outboundServices: ["Williamstown", "Newport"],
    tone: "bg-pink-500/12 border-pink-400/20 text-pink-100",
  },
  mernda: {
    inboundLabel: "Platform 1 · City bound",
    inboundServices: ["City Loop", "Flinders Street"],
    outboundLabel: "Platform 2 · Mernda bound",
    outboundServices: ["Mernda", "South Morang"],
    tone: "bg-[#BE1014]/12 border-[#BE1014]/25 text-[#ffd6d8]",
  },
  hurstbridge: {
    inboundLabel: "Platform 1 · City bound",
    inboundServices: ["City Loop", "Flinders Street"],
    outboundLabel: "Platform 2 · Hurstbridge bound",
    outboundServices: ["Hurstbridge", "Greensborough"],
    tone: "bg-[#BE1014]/12 border-[#BE1014]/25 text-[#ffd6d8]",
  },
  sunbury: {
    inboundLabel: "Platform 1 · City bound",
    inboundServices: ["City Loop", "Flinders Street"],
    outboundLabel: "Platform 2 · Sunbury bound",
    outboundServices: ["Sunbury", "Watergardens"],
    tone: "bg-[#279FD5]/12 border-[#279FD5]/25 text-[#d7f4ff]",
  },
  cranbourne: {
    inboundLabel: "Platform 1 · City bound",
    inboundServices: ["Town Hall", "State Library"],
    outboundLabel: "Platform 2 · Cranbourne bound",
    outboundServices: ["Cranbourne", "Dandenong"],
    tone: "bg-[#279FD5]/12 border-[#279FD5]/25 text-[#d7f4ff]",
  },
  pakenham: {
    inboundLabel: "Platform 1 · City bound",
    inboundServices: ["Town Hall", "State Library"],
    outboundLabel: "Platform 2 · Pakenham bound",
    outboundServices: ["Pakenham", "Westall"],
    tone: "bg-[#279FD5]/12 border-[#279FD5]/25 text-[#d7f4ff]",
  },
  craigieburn: {
    inboundLabel: "Platform 1 · City bound",
    inboundServices: ["City Loop", "Flinders Street"],
    outboundLabel: "Platform 2 · Craigieburn bound",
    outboundServices: ["Craigieburn", "Broadmeadows"],
    tone: "bg-yellow-500/12 border-yellow-400/25 text-yellow-100",
  },
  upfield: {
    inboundLabel: "Platform 1 · City bound",
    inboundServices: ["City Loop", "Flinders Street"],
    outboundLabel: "Platform 2 · Upfield bound",
    outboundServices: ["Upfield", "Coburg"],
    tone: "bg-yellow-500/12 border-yellow-400/25 text-yellow-100",
  },
  belgrave: {
    inboundLabel: "Platform 1 · City bound",
    inboundServices: ["City Loop", "Flinders Street"],
    outboundLabel: "Platform 2 · Belgrave bound",
    outboundServices: ["Belgrave", "Ringwood"],
    tone: "bg-blue-500/12 border-blue-400/25 text-blue-100",
  },
  lilydale: {
    inboundLabel: "Platform 1 · City bound",
    inboundServices: ["City Loop", "Flinders Street"],
    outboundLabel: "Platform 2 · Lilydale bound",
    outboundServices: ["Lilydale", "Ringwood"],
    tone: "bg-blue-500/12 border-blue-400/25 text-blue-100",
  },
  glenWaverley: {
    inboundLabel: "Platform 1 · City bound",
    inboundServices: ["City Loop", "Flinders Street"],
    outboundLabel: "Platform 2 · Glen Waverley bound",
    outboundServices: ["Glen Waverley", "Mount Waverley"],
    tone: "bg-blue-500/12 border-blue-400/25 text-blue-100",
  },
  alamein: {
    inboundLabel: "Platform 1 · City bound",
    inboundServices: ["City Loop", "Flinders Street"],
    outboundLabel: "Platform 2 · Alamein bound",
    outboundServices: ["Alamein", "Camberwell"],
    tone: "bg-blue-500/12 border-blue-400/25 text-blue-100",
  },
  altonaLoop: {
    inboundLabel: "Platform 1 · City bound",
    inboundServices: ["Flinders Street", "Southern Cross"],
    outboundLabel: "Platform 2 · Altona Loop",
    outboundServices: ["Laverton", "Altona"],
    tone: "bg-pink-500/12 border-pink-400/20 text-pink-100",
  },
};
// =========================
// Helpers
// =========================
function getStationDetails(station: Station): string {
  if (station.name === "Southern Cross") {
    return "Metro, V/Line, XPT, coaches, replacement buses";
  }
  if (station.name === "Flinders Street") {
    return "13 platforms · Staffed (premium) · Partially gated (some Myki barriers + open entrances) · Accessible · Major CBD hub with tram connections and easy interchange to Town Hall via City Loop";
  }

  const details: string[] = [];

  if (station.metro) details.push("Metro");
  if (station.vline) details.push("V/Line");
  if (typeof station.staffed === "boolean") {
    details.push(station.staffed ? "Staffed" : "Unstaffed");
  }
  if (typeof station.barriers === "boolean") {
    details.push(station.barriers ? "Myki barriers" : "No barriers");
  }
  if (station.zone) details.push(`Zone ${station.zone}`);
  if (FREIGHT_MOVEMENT_BOARD[station.name]?.length) details.push("Freight corridor");

  return details.length ? details.join(" · ") : "Metro station";
}

function renderBoardingZoneGraphic(bestBoarding: BoardingZoneKey, accentColor: string) {
  return (
    <div className="mt-3 grid grid-cols-3 gap-1.5">
      {(["front", "middle", "rear"] as BoardingZoneKey[]).map((zone) => {
        const active = zone === bestBoarding;
        return (
          <div
            key={zone}
            className={`rounded-full border px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.16em] ${
              active ? "text-white" : "text-white/45"
            }`}
            style={{
              borderColor: active ? accentColor : "rgba(255,255,255,0.10)",
              background: active ? accentColor : "rgba(255,255,255,0.03)",
            }}
          >
            {zone}
          </div>
        );
      })}
    </div>
  );
}

function renderStationBoardingGuide(stationName: string) {
  const guide = STATION_BOARDING_GUIDES[stationName];
  if (!guide) return null;

  return (
    <div className="rounded-[1.1rem] border border-cyan-400/20 bg-cyan-500/10 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200">Boarding guide</p>
          <p className="mt-1 text-sm font-semibold text-white">{stationName}</p>
          <p className="mt-1 text-xs leading-relaxed text-white/65">{guide.summary}</p>
        </div>
        <span className="rounded-full border border-cyan-300/20 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
          Interchange help
        </span>
      </div>

      <div className="mt-3 rounded-[0.95rem] border border-white/10 bg-black/20 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Best general advice</p>
        <p className="mt-2 text-sm leading-relaxed text-white/78">{guide.interchange}</p>
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-3">
        {guide.boardingZones.map((zone) => (
          <div key={`${stationName}-${zone.fleet}-${zone.formation}`} className="rounded-[0.95rem] border border-white/10 bg-black/20 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-white">{zone.fleet}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/45">{zone.formation}</p>
              </div>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
                Best: {zone.bestBoarding}
              </span>
            </div>
            {renderBoardingZoneGraphic(zone.bestBoarding, "#06b6d4")}
            <p className="mt-3 text-xs leading-relaxed text-white/65">{zone.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function getFreightMovements(stationName: string) {
  return FREIGHT_MOVEMENT_BOARD[stationName] ?? [];
}

function getStationLineMemberships(stationName: string) {
  return PLATFORM_PRESET_PRIORITY.filter((lineKey) =>
    LINES[lineKey].some((station) => station.name === stationName),
  );
}

function buildPlatformBoard(station: Station): PlatformBoardEntry[] {
  if (station.name === "South Yarra") {
    return SOUTH_YARRA_PLATFORM_BOARD;
  }
  if (station.name === "Richmond") {
    return RICHMOND_PLATFORM_BOARD;
  }
  if (station.name === "North Melbourne") {
    return NORTH_MELBOURNE_PLATFORM_BOARD;
  }
  if (station.name === "Footscray") {
    return FOOTSCRAY_PLATFORM_BOARD;
  }
  if (station.name === "Malvern") {
    return MALVERN_PLATFORM_BOARD;
  }
  if (station.name === "Caulfield") {
    return CAULFIELD_PLATFORM_BOARD;
  }
  if (station.name === "Clayton") {
    return CLAYTON_PLATFORM_BOARD;
  }
  if (station.name === "Dandenong") {
    return DANDENONG_PLATFORM_BOARD;
  }
  if (station.name === "Flinders Street") {
    return FLINDERS_STREET_PLATFORM_BOARD;
  }
  if (station.name === "Town Hall") {
    return TOWN_HALL_PLATFORM_BOARD;
  }
  if (["Flagstaff", "Melbourne Central", "Parliament", "State Library", "Town Hall"].includes(station.name)) {
    return CITY_LOOP_PLATFORM_BOARD;
  }

  const memberships = getStationLineMemberships(station.name);
  const primaryLine = memberships[0] ?? "frankston";
  const preset = LINE_PLATFORM_PRESETS[primaryLine];
  const now = new Date();
  const minuteOffsets = [4, 11, 7, 16];

  const formatEta = (offsetMinutes: number) => {
    const nextTime = new Date(now.getTime() + offsetMinutes * 60_000);
    return nextTime.toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const buildTdnLabel = (destination: string, platform: string, index: number) => {
    const destCode = destination
      .split(/\s+/)
      .map((part) => part[0] ?? "")
      .join("")
      .toUpperCase()
      .slice(0, 3);

    const lineCode = primaryLine
      .replace(/[^a-z]/gi, "")
      .slice(0, 1)
      .toUpperCase();

    return `TDN ${lineCode}${destCode}${platform}${index + 1}`;
  };

  return [
    {
      platform: "1",
      label: preset.inboundLabel,
      tone: preset.tone,
      services: preset.inboundServices.slice(0, 2).map((destination, index) => ({
        destination,
        etaLabel: formatEta(minuteOffsets[index] ?? 5 + index * 6),
        tdnLabel: buildTdnLabel(destination, "1", index),
      })),
    },
    {
      platform: "2",
      label: preset.outboundLabel,
      tone: preset.tone,
      services: preset.outboundServices.slice(0, 2).map((destination, index) => ({
        destination,
        etaLabel: formatEta(minuteOffsets[index + 2] ?? 10 + index * 7),
        tdnLabel: buildTdnLabel(destination, "2", index),
      })),
    },
  ];
}

function renderPlatformBoardCard(
  stationName: string,
  platform: PlatformBoardEntry,
  indexOffset = 0,
  isPremium = false,
  onServiceClick?: (
    stationName: string,
    platform: PlatformBoardEntry,
    service: PlatformBoardEntry["services"][number],
  ) => void,
) {
  if (platform.platform === "MT") {
    const primaryService = platform.services[0];
    const secondaryServices = platform.services.slice(1);
    const formatMetroTunnelStatus = (service: (typeof platform.services)[number]) =>
      service.viaLabel === "Watergardens branch" ? "Stops all" : "Metro Tunnel";
    const formatMetroTunnelCountdown = (
      service: (typeof platform.services)[number],
      fallback: string,
    ) => (service.etaLabel.toLowerCase().includes("now") ? "Now" : fallback);

    return (
      <div
        key={`${stationName}-platform-${platform.platform}-${indexOffset}`}
        className="overflow-hidden rounded-[1.1rem] border border-[#279FD5]/30 bg-white text-slate-950 shadow-[0_16px_36px_rgba(0,0,0,0.24)]"
      >
        <div className="border-l-[8px] border-l-[#279FD5] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Metro Tunnel · Platforms 1 / 2
          </p>
          {primaryService && (
            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <button
                type="button"
                onClick={() => onServiceClick?.(stationName, platform, primaryService)}
                className="min-w-0 text-left transition hover:opacity-90"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[2rem] font-semibold leading-none text-slate-950">
                    {primaryService.etaLabel}
                  </span>
                  <span className="min-w-0 text-[2rem] font-semibold leading-[0.95] text-slate-950 break-words">
                    {primaryService.destination}
                  </span>
                </div>
                <p className="mt-2 text-[15px] font-medium text-slate-900">
                  {formatMetroTunnelStatus(primaryService)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                  {primaryService.originLabel && (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 font-medium text-slate-700">
                      {primaryService.originLabel}
                    </span>
                  )}
                  {isPremium && primaryService.tdnLabel ? (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 font-semibold text-slate-700">
                      {primaryService.tdnLabel}
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 font-semibold text-slate-700">
                      {getPublicServiceReference(primaryService.destination, primaryService.etaLabel)}
                    </span>
                  )}
                  <span>{primaryService.statusLabel ?? "Scheduled"}</span>
                </div>
              </button>
              <div className="shrink-0 bg-black px-4 py-2 text-[2rem] font-semibold leading-none text-white shadow-[0_6px_16px_rgba(0,0,0,0.25)]">
                {formatMetroTunnelCountdown(primaryService, "5 min")}
              </div>
            </div>
          )}
        </div>

        {secondaryServices.length > 0 && (
          <div className="border-t border-black/10 bg-white px-4 py-3">
            <div className="space-y-3">
              {secondaryServices.map((service, index) => (
                <button
                  type="button"
                  onClick={() => onServiceClick?.(stationName, platform, service)}
                  key={`${platform.platform}-${service.destination}-${index}`}
                  className="grid w-full gap-3 border-l-[6px] border-l-[#279FD5] border-t border-black/15 pt-3 text-left transition hover:opacity-90 first:border-t-0 first:pt-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                >
                  <div className="min-w-0 pl-3">
                    <p className="text-[1.8rem] font-semibold leading-none text-slate-950">
                      {service.etaLabel}
                    </p>
                    <p className="mt-1 text-[1.85rem] font-semibold leading-[0.95] text-slate-950 break-words">
                      {service.destination}
                    </p>
                    <p className="mt-2 text-[15px] font-medium text-slate-900">
                      {formatMetroTunnelStatus(service)}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                      {service.originLabel && (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 font-medium text-slate-700">
                          {service.originLabel}
                        </span>
                      )}
                      {isPremium && service.tdnLabel ? (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 font-semibold text-slate-700">
                          {service.tdnLabel}
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 font-semibold text-slate-700">
                          {getPublicServiceReference(service.destination, service.etaLabel)}
                        </span>
                      )}
                      <span>{service.statusLabel ?? "Scheduled"}</span>
                    </div>
                  </div>
                  <div className="shrink-0 bg-black px-4 py-2 text-[2rem] font-semibold leading-none text-white shadow-[0_6px_16px_rgba(0,0,0,0.25)]">
                    {formatMetroTunnelCountdown(service, index === 0 ? "13 min" : "24 min")}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      key={`${stationName}-platform-${platform.platform}-${indexOffset}`}
      className={`rounded-[1rem] border p-2.5 ${platform.tone}`}
    >
      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/55">
        {platform.label}
      </p>
      <div className="mt-2 space-y-1.5">
        {platform.services.length > 0 ? (
          platform.services.map((service, index) => {
            const display = getPlatformServiceDisplay(
              stationName,
              platform.label,
              service,
            );

            return (
              <div
                key={`${platform.platform}-${service.destination}-${index}`}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/15 px-2.5 py-1.5"
              >
                <button
                  type="button"
                  onClick={() => onServiceClick?.(stationName, platform, service)}
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left transition hover:opacity-90"
                >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white">{display.destination}</p>
                  {(display.originLabel || display.viaLabel) && (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {display.originLabel && (
                        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-medium text-white/70">
                          {display.originLabel}
                        </span>
                      )}
                      {display.viaLabel && (
                        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-medium text-white/70">
                          {display.viaLabel}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <p className="text-[10px] text-white/50">{service.statusLabel ?? "Next service"}</p>
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/80">
                      {isPremium ? service.tdnLabel : getPublicServiceReference(display.destination, service.etaLabel)}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/85">
                  {service.etaLabel}
                </span>
                </button>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-white/15 bg-black/10 px-3 py-5 text-center">
            <p className="text-xs font-semibold text-white/85">No regular departures</p>
            <p className="mt-1 text-[10px] text-white/55">
              {platform.emptyState ?? "Check the live station displays for any special movements."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function getPlatformServiceDisplay(
  stationName: string,
  platformLabel: string,
  service: PlatformBoardEntry["services"][number],
) {
  let destination = service.destination;
  let originLabel = service.originLabel;
  let viaLabel = service.viaLabel;

  const arrowParts = destination
    .split(/\s*(?:→|->|â†’)\s*/g)
    .map((part) => part.trim())
    .filter(Boolean);

  const isCityLoopStation = ["Flagstaff", "Melbourne Central", "Parliament", "State Library", "Town Hall"].includes(stationName);

  if (isCityLoopStation) {
    const isCaulfieldFrankstonPlatform = /caulfield|frankston/i.test(platformLabel);
    const isCliftonHillPlatform = /clifton hill/i.test(platformLabel);
    const isNorthernPlatform = /northern/i.test(platformLabel);
    const isBurnleyPlatform = /burnley/i.test(platformLabel);

    if (isCaulfieldFrankstonPlatform && arrowParts.length > 1) {
      originLabel ||= `Origin ${arrowParts[arrowParts.length - 1]}`;
      destination = "City Loop";
      viaLabel ||= "Stops all via City Loop";
    } else if (isCliftonHillPlatform) {
      destination = arrowParts.length > 1 ? arrowParts[arrowParts.length - 1] : destination;
      originLabel ||= "Origin Flinders Street";
      viaLabel ||= "Stops all via City Loop";
    } else if (isNorthernPlatform) {
      destination = arrowParts.length > 1 ? arrowParts[arrowParts.length - 1] : destination;
      originLabel ||= "Origin Flinders Street";
      viaLabel ||= "Stops all via City Loop";
    } else if (isBurnleyPlatform) {
      destination = arrowParts.length > 1 ? arrowParts[arrowParts.length - 1] : destination;
      originLabel ||= "Origin Flinders Street";
      viaLabel ||= "Stops all via City Loop";
    } else if (arrowParts.length > 1) {
      originLabel ||= `Origin ${arrowParts[0]}`;
      destination = arrowParts[arrowParts.length - 1];
      viaLabel ||= "Via City Loop";
    }
  }

  return {
    destination,
    originLabel,
    viaLabel,
  };
}

function normaliseServiceMatchText(value: string) {
  return value
    .toLowerCase()
    .replace(/\bline\b/g, "")
    .replace(/\bstreet\b/g, "st")
    .replace(/city loop/g, "city loop")
    .replace(/\s*(?:â†’|->|Ã¢â€ â€™)\s*/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractServiceTdnCandidates(tdnLabel?: string) {
  if (!tdnLabel) return [];

  return [...new Set(
    tdnLabel
      .replace(/^TDN\s+/i, "")
      .split(/\s*(?:â†’|->|Ã¢â€ â€™)\s*/g)
      .map((part) => part.trim().toUpperCase())
      .filter(Boolean),
  )];
}

function stripTdnPrefix(tdnLabel?: string) {
  if (!tdnLabel) return "";
  return tdnLabel.replace(/^TDN\s+/i, "").trim();
}

function isRegionalSetIdentifier(value?: string | null) {
  if (!value) return false;
  return /^V\d{3,4}$/i.test(value.trim());
}

function getPlatformLineHints(
  stationName: string,
  platform: PlatformBoardEntry,
  service: PlatformBoardEntry["services"][number],
) {
  const display = getPlatformServiceDisplay(stationName, platform.label, service);
  const searchable = normaliseServiceMatchText(
    `${platform.label} ${service.destination} ${display.destination} ${display.originLabel ?? ""} ${display.viaLabel ?? ""}`,
  );

  const hints = new Set<string>();
  const hintMap: Array<[string, string]> = [
    ["frankston", "frankston"],
    ["werribee", "werribee"],
    ["williamstown", "williamstown"],
    ["sandringham", "sandringham"],
    ["sunbury", "sunbury"],
    ["watergardens", "sunbury"],
    ["cranbourne", "cranbourne"],
    ["pakenham", "pakenham"],
    ["mernda", "mernda"],
    ["hurstbridge", "hurstbridge"],
    ["lilydale", "lilydale"],
    ["belgrave", "belgrave"],
    ["alamein", "alamein"],
    ["glen waverley", "glen waverley"],
    ["craigieburn", "craigieburn"],
    ["upfield", "upfield"],
    ["traralgon", "traralgon"],
    ["geelong", "geelong"],
    ["waurn ponds", "waurn ponds"],
    ["wendouree", "ballarat"],
    ["ballarat", "ballarat"],
    ["bendigo", "bendigo"],
    ["shepparton", "shepparton"],
  ];

  hintMap.forEach(([needle, value]) => {
    if (searchable.includes(needle)) {
      hints.add(value);
    }
  });

  return [...hints];
}

function getRegionalTrainTypeLabel(vehicle: LiveTrain) {
  if (!isVlineLiveTrain(vehicle)) {
    return vehicle.trainType;
  }

  const joined = `${vehicle.consist} ${vehicle.trainType} ${vehicle.tdn} ${vehicle.line} ${vehicle.destination}`.toUpperCase();
  const genericRegionalLabel =
    !vehicle.trainType.trim() ||
    /^(REGIONAL TRAIN|TRAIN|V\/LINE|VLINE|UNKNOWN)$/i.test(vehicle.trainType.trim());
  const setMentions = joined.match(/\bV\d{3,4}\b/g) ?? [];
  const inferredCars =
    /6[\s-]?CAR|SIX[\s-]?CAR/.test(joined) || setMentions.length >= 2
      ? 6
      : 3;

  if (/SPRINTER/.test(joined)) {
    return "Sprinter";
  }

  if (/XPT/.test(joined)) {
    return "NSW TrainLink XPT";
  }

  if (/XPLORER/.test(joined)) {
    return "NSW TrainLink Xplorer";
  }

  if (/N\s*CLASS|N-?SET|LOCOMOTIVE|LOCO/.test(joined)) {
    return genericRegionalLabel ? "N class" : vehicle.trainType;
  }

  if (/VLOCITY/.test(joined) || setMentions.length > 0) {
    return `VLocity (${inferredCars}-car)`;
  }

  return genericRegionalLabel ? "Regional train" : vehicle.trainType;
}

function getRegionalAllocatedSetLabel(vehicle: LiveTrain) {
  const candidates = [vehicle.consist, vehicle.tdn]
    .map((value) => value.trim())
    .filter(Boolean);
  return candidates.find((value) => isRegionalSetIdentifier(value)) ?? candidates[0] ?? "";
}

function getVehicleAlertKeywords(vehicle: LiveTrain, snapshot?: ConsistSnapshot) {
  const keywords = new Set<string>();
  const pushKeyword = (value?: string | null) => {
    if (!value) return;
    const normalised = normaliseServiceMatchText(value);
    if (normalised.length >= 4) {
      keywords.add(normalised);
    }
  };

  pushKeyword(vehicle.line);
  pushKeyword(vehicle.destination);
  pushKeyword(snapshot?.current_trip?.origin);
  pushKeyword(snapshot?.current_trip?.destination);
  pushKeyword(snapshot?.next_trip?.origin);
  pushKeyword(snapshot?.next_trip?.destination);
  pushKeyword(snapshot?.position?.current_stop);
  pushKeyword(snapshot?.position?.next_stop);

  if (normaliseServiceMatchText(vehicle.line) === "upfield") {
    pushKeyword("upfield");
    pushKeyword("craigieburn");
    pushKeyword("northern");
  }

  if (normaliseServiceMatchText(vehicle.line) === "frankston") {
    pushKeyword("frankston");
    pushKeyword("stony point");
    pushKeyword("caulfield");
  }

  return [...keywords];
}

function offsetPolylineCoordinates(
  coordinates: [number, number][],
  direction: "left" | "right" = "left",
  multiplier = 1
): [number, number][] {
  if (coordinates.length < 2) return coordinates;

  const offsetDistance = 0.0004 * multiplier;
  const sign = direction === "left" ? 1 : -1;

  return coordinates.map((coord, index) => {
    let perpendicular: [number, number] = [0, 0];

    if (index === 0) {
      const next = coordinates[1];
      const dx = next[1] - coord[1];
      const dy = next[0] - coord[0];
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      perpendicular = [-dy / len, dx / len];
    } else if (index === coordinates.length - 1) {
      const prev = coordinates[index - 1];
      const dx = coord[1] - prev[1];
      const dy = coord[0] - prev[0];
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      perpendicular = [-dy / len, dx / len];
    } else {
      const prev = coordinates[index - 1];
      const next = coordinates[index + 1];

      const dx1 = coord[1] - prev[1];
      const dy1 = coord[0] - prev[0];
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;
      const perp1: [number, number] = [-dy1 / len1, dx1 / len1];

      const dx2 = next[1] - coord[1];
      const dy2 = next[0] - coord[0];
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
      const perp2: [number, number] = [-dy2 / len2, dx2 / len2];

      perpendicular = [
        (perp1[0] + perp2[0]) / 2,
        (perp1[1] + perp2[1]) / 2,
      ];
    }

    return [
      coord[0] + perpendicular[0] * offsetDistance * sign,
      coord[1] + perpendicular[1] * offsetDistance * sign,
    ];
  });
}

function createFeaturedConsistIcon(isLive: boolean) {
  const glowColor = isLive ? "#facc15" : "#94a3b8";
  const badgeTone = isLive ? "#0f172a" : "#1e293b";
  const badgeText = isLive ? "LIVE" : "EST";

  return L.divIcon({
    html: `
      <div style="position:relative;width:58px;height:58px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;border-radius:50%;background:${glowColor};opacity:${isLive ? "0.22" : "0.14"};animation:ping 2.2s infinite;"></div>
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:9999px;background:#0f172a;border:2px solid ${glowColor};box-shadow:0 8px 20px rgba(15,23,42,0.58);">
          <span style="font-size:20px;line-height:1;color:${glowColor};">★</span>
        </div>
        <div style="position:absolute;top:-7px;right:-2px;border-radius:9999px;background:${badgeTone};border:1px solid rgba(255,255,255,0.18);padding:2px 6px;color:#f8fafc;font-size:9px;font-weight:800;letter-spacing:0.08em;">430M</div>
        <div style="position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);border-radius:9999px;background:rgba(15,23,42,0.92);border:1px solid rgba(255,255,255,0.12);padding:2px 6px;color:${glowColor};font-size:8px;font-weight:800;letter-spacing:0.12em;">${badgeText}</div>
      </div>
    `,
    className: "bg-transparent border-none",
    iconSize: [58, 58],
    iconAnchor: [29, 29],
    popupAnchor: [0, -24],
  });
}

function resolveConsistSnapshotCoordinate(snapshot?: ConsistSnapshot | null): [number, number] | null {
  if (!snapshot) return null;

  if (typeof snapshot.position?.lat === "number" && typeof snapshot.position?.lng === "number") {
    return [snapshot.position.lat, snapshot.position.lng];
  }

  return (
    findStationCoordinate(snapshot.position?.current_stop) ??
    findStationCoordinate(snapshot.position?.next_stop) ??
    findStationCoordinate(snapshot.current_trip?.origin) ??
    findStationCoordinate(snapshot.current_trip?.destination) ??
    findStationCoordinate(snapshot.next_trip?.origin) ??
    findStationCoordinate(snapshot.next_trip?.destination) ??
    SOUTHERN_CROSS_POSITION
  );
}

function projectPointToSegment(
  point: [number, number],
  start: [number, number],
  end: [number, number],
): [number, number] {
  const segmentLat = end[0] - start[0];
  const segmentLng = end[1] - start[1];
  const segmentLengthSquared = segmentLat * segmentLat + segmentLng * segmentLng;

  if (segmentLengthSquared === 0) {
    return start;
  }

  const pointLat = point[0] - start[0];
  const pointLng = point[1] - start[1];
  const t = Math.max(
    0,
    Math.min(1, (pointLat * segmentLat + pointLng * segmentLng) / segmentLengthSquared),
  );

  return [start[0] + segmentLat * t, start[1] + segmentLng * t];
}

function getDistanceSquared(left: [number, number], right: [number, number]) {
  const latDelta = left[0] - right[0];
  const lngDelta = left[1] - right[1];
  return latDelta * latDelta + lngDelta * lngDelta;
}

function alignStationsToRenderedPolyline(
  stations: Station[],
  track: [number, number][],
  direction: "left" | "right",
  multiplier: number,
): Station[] {
  const renderedTrack = offsetPolylineCoordinates(track, direction, multiplier);

  if (renderedTrack.length < 2) {
    return stations;
  }

  return stations.map((station) => {
    let closestPoint = station.position;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < renderedTrack.length - 1; index += 1) {
      const projectedPoint = projectPointToSegment(
        station.position,
        renderedTrack[index],
        renderedTrack[index + 1],
      );
      const distance = getDistanceSquared(station.position, projectedPoint);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestPoint = projectedPoint;
      }
    }

    return {
      ...station,
      position: closestPoint,
    };
  });
}

function renderStationMarkers(
  renderedStationKeys: Set<string>,
  stations: Station[],
  fillColor: string,
  strokeColor: string,
  resolveStation: (station: Station) => Station,
  onSelectStation: (station: Station) => void,
  onToggleStationLine?: (station: Station) => boolean,
) {
  const useCompactInlineStops = stations === GLEN_WAVERLEY_STATIONS;
  return stations.map((station, index) => {
    const resolvedStation = resolveStation(station);
    const isCityLoopPill =
      CITY_LOOP_PILL_STATIONS.has(resolvedStation.name) || SPECIAL_PILL_STATIONS.has(resolvedStation.name);
    const isSharedCaulfieldMetroStation = CAULFIELD_METRO_SHARED_STATIONS.has(resolvedStation.name);
    const isSharedNorthernStation = NORTHERN_SHARED_STATIONS.has(resolvedStation.name);
    const isCraigieburnLineStation = CRAIGIEBURN_LINE_STATION_NAMES.has(resolvedStation.name);
    const shouldRenderOnce =
      SINGLE_RENDER_STATIONS.has(resolvedStation.name) ||
      SPECIAL_PILL_STATIONS.has(resolvedStation.name) ||
      isSharedCaulfieldMetroStation ||
      isSharedNorthernStation;
    const isCombinedLoopInterchange = COMBINED_LOOP_INTERCHANGES.has(resolvedStation.name);
    const stationRenderKey = isCombinedLoopInterchange
      ? "Melbourne Central / State Library"
      : `${resolvedStation.name}`;
    const markerPosition = isCombinedLoopInterchange
      ? MELBOURNE_CENTRAL_STATE_LIBRARY_INTERCHANGE
      : resolvedStation.position;
    const markerName = isCombinedLoopInterchange
      ? "Melbourne Central / State Library"
      : resolvedStation.name;
    const isEndpoint = index === 0 || index === stations.length - 1;

    if (shouldRenderOnce && renderedStationKeys.has(stationRenderKey)) {
      return null;
    }

    if (shouldRenderOnce) {
      renderedStationKeys.add(stationRenderKey);
    }

    if (isCityLoopPill) {
      return (
        <Marker
          key={`${station.name}-${station.position[0]}-${station.position[1]}`}
          position={markerPosition}
          icon={createCityLoopPillIcon(strokeColor, markerName)}
          pane="stationPane"
          zIndexOffset={3400}
          eventHandlers={{
            click: () => {
              if (!onToggleStationLine?.(resolvedStation)) {
                onSelectStation(resolvedStation);
              }
            },
          }}
        />
      );
    }

    return (
      <Marker
        key={`${station.name}-${station.position[0]}-${station.position[1]}`}
        position={resolvedStation.position}
        pane="stationPane"
        icon={createInlineStationStopIcon(
          resolvedStation.name,
          isSharedCaulfieldMetroStation || isCraigieburnLineStation ? "#ffffff" : strokeColor,
          { endpoint: isEndpoint, compact: useCompactInlineStops },
        )}
        zIndexOffset={3300}
        eventHandlers={{
          click: () => {
            if (!onToggleStationLine?.(resolvedStation)) {
              onSelectStation(resolvedStation);
            }
          },
        }}
      />
    );
  });
}

function renderRouteStopMarkers(
  stops: Array<{ name: string; position: [number, number]; note?: string }>,
  fillColor: string,
  strokeColor: string,
  subtitle: string,
  visibleBounds?: L.LatLngBounds | null,
) {
  return stops
    .filter((stop) => !visibleBounds || visibleBounds.contains(L.latLng(stop.position[0], stop.position[1])))
    .map((stop, index) => (
    <Marker
      key={`${stop.name}-${stop.position[0]}-${stop.position[1]}`}
      position={stop.position}
      icon={createInlineStationStopIcon(stop.name, strokeColor, {
        endpoint: index === 0 || index === stops.length - 1,
      })}
      zIndexOffset={3200}
    >
      <Popup>
        <div className="p-3 w-48">
          <p className="font-semibold text-white">{stop.name}</p>
          <p className="text-xs text-white/60 mt-1">{subtitle}</p>
          {stop.note ? <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200">{stop.note}</p> : null}
        </div>
      </Popup>
    </Marker>
  ));
}

function renderFreightLocationMarkers(stops: FreightLocation[], visibleBounds?: L.LatLngBounds | null) {
  return stops
    .filter((stop) => !visibleBounds || visibleBounds.contains(L.latLng(stop.position[0], stop.position[1])))
    .map((stop, index) => (
    <Marker
      key={`${stop.name}-${stop.position[0]}-${stop.position[1]}`}
      position={stop.position}
      icon={createInlineStationStopIcon(stop.name, FREIGHT_BROWN, {
        endpoint: index === 0 || index === stops.length - 1,
      })}
      pane="stationPane"
      zIndexOffset={3250}
    >
      <Popup>
        <div className="p-3 w-56">
          <p className="font-semibold text-white">{stop.name}</p>
          <p className="mt-1 text-xs text-white/70">
            {stop.kind} · Freight corridor
          </p>
        </div>
      </Popup>
    </Marker>
  ));
}

function renderSurfaceStops(
  stops: SurfaceStop[],
  fillColor: string,
  strokeColor: string,
  onSelect: (stop: SurfaceStop) => void,
  visibleBounds?: L.LatLngBounds | null,
  mode: "bus" | "tram" = "bus",
) {
  return stops
    .filter((stop) => !visibleBounds || visibleBounds.contains(L.latLng(stop.position[0], stop.position[1])))
    .map((stop) => (
    <CircleMarker
      key={stop.id}
      center={stop.position}
      radius={mode === "tram" ? 3.5 : 5}
      pathOptions={{
        ...getSurfaceRouteColors(stop.routeLabel, fillColor, strokeColor),
        fillOpacity: 0.98,
        stroke: mode !== "tram",
        weight: mode === "tram" ? 0 : 2,
      }}
      eventHandlers={{
        click: () => onSelect(stop),
      }}
    >
      <Popup>
        <div className="p-3 w-56">
          <p className="font-semibold text-white">{stop.name}</p>
          <p className="mt-1 text-xs text-white/70">
            {stop.locality} · {stop.subtitle}
          </p>
          <button
            type="button"
            onClick={() => onSelect(stop)}
            className="mt-3 inline-flex rounded-full border border-white/15 bg-white/6 px-3 py-1 text-[11px] font-semibold text-blue-200 transition hover:bg-white/10"
          >
            Open schedules
          </button>
        </div>
      </Popup>
    </CircleMarker>
  ));
}

function getDebugPointLabel(index: number) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (index < alphabet.length) {
    return alphabet[index];
  }

  const first = Math.floor(index / alphabet.length) - 1;
  const second = index % alphabet.length;
  return `${alphabet[Math.max(0, first)]}${alphabet[second]}`;
}

function createDebugPointIcon(label: string, color: string) {
  return L.divIcon({
    html: `
      <div style="
        min-width:22px;
        height:22px;
        padding:0 6px;
        border-radius:9999px;
        background:rgba(15,23,42,0.92);
        border:1px solid ${color};
        color:${color};
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:11px;
        font-weight:700;
        box-shadow:0 4px 10px rgba(0,0,0,0.45);
      ">
        ${label}
      </div>
    `,
    className: "bg-transparent border-none",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function escapeInlineMarkerHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createInlineStationStopIcon(
  stationName: string,
  color: string,
  options?: {
    endpoint?: boolean;
    compact?: boolean;
  },
) {
  const endpoint = options?.endpoint ?? false;
  const compact = options?.compact ?? false;
  const escapedName = escapeInlineMarkerHtml(stationName);
  const tickHeight = endpoint ? (compact ? 14 : 16) : compact ? 10 : 14;
  const iconHeight = endpoint ? (compact ? 46 : 60) : compact ? 40 : 52;
  const labelMargin = compact ? 2 : 4;
  const translateY = compact ? -22 : -30;

  return L.divIcon({
    html: `
      <div style="
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:flex-end;
        min-width:136px;
        transform:translateY(${translateY}px);
      ">
        <div style="
          margin-bottom:${labelMargin}px;
          color:#ffffff;
          font-size:12px;
          font-weight:700;
          line-height:1.1;
          white-space:nowrap;
          text-shadow:0 2px 10px rgba(2,6,23,0.95), 0 0 6px rgba(2,6,23,0.85);
          letter-spacing:0.01em;
        ">
          ${escapedName}
        </div>
        <div style="
          width:3px;
          height:${tickHeight}px;
          background:${color};
          border-radius:999px;
          box-shadow:0 0 0 1px rgba(255,255,255,0.12);
        "></div>
        ${
          endpoint
            ? `<div style="
                width:12px;
                height:12px;
                margin-top:-1px;
                border-radius:999px;
                background:${color};
                border:2px solid rgba(255,255,255,0.95);
                box-shadow:0 0 0 2px rgba(15,23,42,0.92);
              "></div>`
            : ""
        }
      </div>
    `,
    className: "bg-transparent border-none",
    iconSize: [136, iconHeight],
    iconAnchor: [68, iconHeight - 2],
  });
}

function renderTrackDebugMarkers(
  trackName: string,
  points: Array<{ position: [number, number]; index: number }>,
  color: string,
) {
  return points.map((point, labelIndex) => (
    <Marker
      key={`${trackName}-debug-${point.index}`}
      position={point.position}
      icon={createDebugPointIcon(getDebugPointLabel(labelIndex), color)}
      pane="stationPane"
      zIndexOffset={3600}
    >
      <Popup>
        <div className="p-3 w-64">
          <p className="font-semibold text-white">
            {trackName}[{point.index}]
          </p>
          <p className="mt-1 text-xs text-white/70">Label {getDebugPointLabel(labelIndex)}</p>
          <p className="mt-2 text-xs break-all text-white/60">
            [{point.position[0]}, {point.position[1]}]
          </p>
        </div>
      </Popup>
    </Marker>
  ));
}

function formatRouteWindow(time?: string | null) {
  if (!time) {
    return "Unknown";
  }

  return time.slice(0, 5);
}

type RegionalServiceStop = {
  time: string;
  name: string;
  platform?: string;
  side?: string;
  note?: string;
  delayMinutes?: number;
};

type RegionalServiceProfile = {
  line: string;
  accent: string;
  serviceType: string;
  origin: string;
  destination: string;
  window: string;
  duration: string;
  platform: string;
  stops: RegionalServiceStop[];
};

const TRARALGON_REGIONAL_PROFILE: RegionalServiceProfile = {
  line: "Traralgon",
  accent: "#7c3aed",
  serviceType: "Express Service",
  origin: "Traralgon",
  destination: "Southern Cross",
  window: "05:54 - 08:15",
  duration: "2h 21m",
  platform: "15",
  stops: [
    { time: "05:54", name: "Traralgon", platform: "1", side: "Right", delayMinutes: 0 },
    { time: "05:59", name: "Morwell Industrial Sidings", note: "Express", delayMinutes: 0 },
    { time: "06:00", name: "Maryvale Sidings", note: "Express", delayMinutes: 0 },
    { time: "06:02", name: "Morwell East", note: "Express", delayMinutes: 0 },
    { time: "06:02", name: "Morwell", platform: "1", side: "Right", delayMinutes: 0 },
    { time: "06:03", name: "Morwell Loop", note: "Express", delayMinutes: 0 },
    { time: "06:04", name: "Morwell Loop West", note: "Express", delayMinutes: 0 },
    { time: "06:07", name: "Herne's Oak", note: "Express", delayMinutes: 0 },
    { time: "06:12", name: "Moe", platform: "1", side: "Left", delayMinutes: 0 },
    { time: "06:12", name: "Moe West Junction", note: "Express", delayMinutes: 0 },
    { time: "06:18", name: "Trafalgar", delayMinutes: 0 },
    { time: "06:24", name: "Yarragon", delayMinutes: 0 },
    { time: "06:32", name: "Warragul", delayMinutes: 0 },
    { time: "06:38", name: "Drouin", delayMinutes: 0 },
    { time: "06:44", name: "Longwarry", platform: "1", side: "Left", delayMinutes: 0 },
    { time: "06:48", name: "Bunyip", platform: "1", side: "Left", delayMinutes: 0 },
    { time: "06:50", name: "Bunyip West", note: "Express", delayMinutes: 0 },
    { time: "06:52", name: "Garfield", delayMinutes: 0 },
    { time: "06:56", name: "Tynong", delayMinutes: 0 },
    { time: "07:00", name: "Nar Nar Goon", delayMinutes: 0 },
    { time: "07:02", name: "Pakenham MTM Boundary", note: "Express", delayMinutes: 0 },
    { time: "07:06", name: "Pakenham East", note: "Express", delayMinutes: 0 },
    { time: "07:08", name: "East Pakenham", note: "Express", delayMinutes: 0 },
    { time: "07:10", name: "Pakenham", platform: "1", side: "Left", delayMinutes: -1 },
    { time: "07:13", name: "Cardinia Road", platform: "1", side: "Left", note: "Express", delayMinutes: -1 },
    { time: "07:14", name: "Officer", platform: "1", side: "Left", note: "Express", delayMinutes: -1 },
    { time: "07:17", name: "Beaconsfield", platform: "1", side: "Right", note: "Express", delayMinutes: -1 },
    { time: "07:19", name: "Berwick", platform: "1", side: "Right", note: "Express", delayMinutes: -1 },
    { time: "07:21", name: "Narre Warren", platform: "1", side: "Left", note: "Express", delayMinutes: -1 },
    { time: "07:23", name: "Hallam", platform: "1", side: "Left", note: "Express", delayMinutes: -1 },
    { time: "07:25", name: "General Motors", side: "Waypoint", delayMinutes: -1 },
    { time: "07:27", name: "Dandenong East Junction", side: "Waypoint", delayMinutes: -1 },
    { time: "07:28", name: "Dandenong", delayMinutes: -1 },
    { time: "07:30", name: "Yarraman", platform: "1", side: "Right", note: "Express", delayMinutes: -1 },
    { time: "07:32", name: "Noble Park", platform: "1", side: "Right", note: "Express", delayMinutes: -1 },
    { time: "07:34", name: "Sandown Park", platform: "1", side: "Right", note: "Express", delayMinutes: -1 },
    { time: "07:35", name: "Springvale", platform: "1", side: "Left", note: "Express", delayMinutes: -1 },
    { time: "07:37", name: "Westall", note: "Express", delayMinutes: 0 },
    { time: "07:39", name: "Clayton", platform: "1", side: "Right", delayMinutes: 0 },
    { time: "07:42", name: "Huntingdale", platform: "1", side: "Right", note: "Express", delayMinutes: 0 },
    { time: "07:45", name: "Oakleigh", platform: "1", side: "Left", note: "Express", delayMinutes: 0 },
    { time: "07:47", name: "Hughesdale", platform: "1", side: "Right", note: "Express", delayMinutes: -1 },
    { time: "07:48", name: "Murrumbeena", platform: "1", side: "Right", note: "Express", delayMinutes: -1 },
    { time: "07:49", name: "Carnegie", platform: "1", side: "Right", note: "Express", delayMinutes: -1 },
    { time: "07:52", name: "Caulfield", delayMinutes: -1 },
    { time: "07:54", name: "Malvern", note: "Express", delayMinutes: -1 },
    { time: "07:56", name: "Armadale", note: "Express", delayMinutes: -1 },
    { time: "07:57", name: "Toorak", note: "Express", delayMinutes: -1 },
    { time: "07:58", name: "Hawksburn", note: "Express", delayMinutes: -1 },
    { time: "08:00", name: "South Yarra", note: "Express", delayMinutes: -1 },
    { time: "08:02", name: "Richmond", delayMinutes: -1 },
    { time: "08:11", name: "Flinders Street", delayMinutes: -6 },
    { time: "08:14", name: "Viaduct Junction", side: "Waypoint", delayMinutes: -2 },
    { time: "08:15", name: "Southern Cross", platform: "15", side: "Right", delayMinutes: 0 },
  ],
};

const WAURN_PONDS_REGIONAL_PROFILE: RegionalServiceProfile = {
  line: "Waurn Ponds",
  accent: "#7c3aed",
  serviceType: "Express Service",
  origin: "Southern Cross",
  destination: "Waurn Ponds",
  window: "14:30 - 15:48",
  duration: "1h 18m",
  platform: "4A",
  stops: [
    { time: "14:30", name: "Southern Cross", platform: "4A", side: "Right", delayMinutes: 1 },
    { time: "14:31", name: "North Melbourne Junction", side: "Waypoint", delayMinutes: 1 },
    { time: "14:33", name: "South Kensington Junction", side: "Waypoint", delayMinutes: 1 },
    { time: "14:34", name: "South Kensington", note: "Express", delayMinutes: 2 },
    { time: "14:38", name: "Footscray", delayMinutes: 3 },
    { time: "14:39", name: "Middle Footscray", platform: "2", side: "Right", note: "Express", delayMinutes: 3 },
    { time: "14:39", name: "West Footscray", platform: "2", side: "Left", note: "Express", delayMinutes: 3 },
    { time: "14:41", name: "Tottenham", platform: "2", side: "Right", note: "Express", delayMinutes: 3 },
    { time: "14:41", name: "White City", side: "Waypoint", delayMinutes: 3 },
    { time: "14:43", name: "Sunshine", delayMinutes: 4 },
    { time: "14:46", name: "Ardeer", note: "Express", delayMinutes: 4 },
    { time: "14:48", name: "Deer Park", delayMinutes: 5 },
    { time: "14:57", name: "Robinsons Road Junction", note: "Express", delayMinutes: 4 },
    { time: "14:57", name: "Tarneit", delayMinutes: 4 },
    { time: "15:04", name: "Wyndham Vale", delayMinutes: 6 },
    { time: "15:12", name: "Little River", delayMinutes: 6 },
    { time: "15:18", name: "Lara", delayMinutes: 6 },
    { time: "15:22", name: "Corio", note: "Express", delayMinutes: 6 },
    { time: "15:24", name: "North Shore", delayMinutes: 6 },
    { time: "15:26", name: "North Geelong A Box", note: "Express", delayMinutes: 6 },
    { time: "15:27", name: "North Geelong", delayMinutes: 7 },
    { time: "15:34", name: "Geelong", delayMinutes: 5 },
    { time: "15:37", name: "South Geelong", delayMinutes: 7 },
    { time: "15:39", name: "Geelong Racecourse", note: "Express", delayMinutes: 7 },
    { time: "15:42", name: "Marshall", delayMinutes: 7 },
    { time: "15:48", name: "Waurn Ponds", delayMinutes: 5 },
  ],
};

const XPT_SYDNEY_PROFILE: RegionalServiceProfile = {
  line: "NSW TrainLink XPT",
  accent: "#d9480f",
  serviceType: "Interstate long-distance service",
  origin: "Southern Cross",
  destination: "Sydney Central",
  window: "19:50 - 06:47",
  duration: "10h 57m",
  platform: "1",
  stops: [
    { time: "19:50", name: "Southern Cross", platform: "1", side: "Right", delayMinutes: 0 },
    { time: "20:16", name: "Broadmeadows", platform: "3", side: "Right", note: "Pick up only", delayMinutes: 0 },
    { time: "21:01", name: "Seymour", platform: "1", side: "Right", note: "Pick up only", delayMinutes: 0 },
    { time: "22:22", name: "Wangaratta", platform: "2", side: "Right", delayMinutes: 0 },
    { time: "23:07", name: "Albury", platform: "1", side: "Right", delayMinutes: 0 },
    { time: "23:36", name: "Culcairn", platform: "1", side: "Right", note: "Request stop", delayMinutes: 0 },
    { time: "23:47", name: "Henty", platform: "1", side: "Right", note: "Request stop", delayMinutes: 0 },
    { time: "00:04", name: "The Rock", platform: "1", side: "Right", note: "Request stop", delayMinutes: 0 },
    { time: "00:22", name: "Wagga Wagga", platform: "1", side: "Right", delayMinutes: 0 },
    { time: "00:48", name: "Junee", platform: "1", side: "Right", delayMinutes: 0 },
    { time: "01:35", name: "Cootamundra", platform: "1", side: "Right", delayMinutes: 0 },
    { time: "02:16", name: "Harden", platform: "1", side: "Right", note: "Request stop", delayMinutes: 0 },
    { time: "03:07", name: "Yass Junction", platform: "1", side: "Right", note: "Request stop", delayMinutes: 0 },
    { time: "03:35", name: "Gunning", platform: "1", side: "Right", note: "Request stop", delayMinutes: 0 },
    { time: "04:13", name: "Goulburn", platform: "1", side: "Right", delayMinutes: 0 },
    { time: "05:01", name: "Moss Vale", platform: "1", side: "Right", delayMinutes: 0 },
    { time: "06:09", name: "Campbelltown", platform: "2", side: "Right", note: "Drop off only", delayMinutes: 0 },
    { time: "06:47", name: "Sydney Central", platform: "1", side: "Right", delayMinutes: 0 },
  ],
};

function getRegionalServiceProfile(vehicle: LiveTrain, snapshot?: ConsistSnapshot): RegionalServiceProfile | null {
  const joined = `${vehicle.line} ${vehicle.destination} ${vehicle.serviceDescription ?? ""}`.toLowerCase();

  if (/(xpt|nsw trainlink|sydney central|albury|wagga|cootamundra)/.test(joined)) {
    return {
      ...XPT_SYDNEY_PROFILE,
      origin: snapshot?.current_trip?.origin ?? XPT_SYDNEY_PROFILE.origin,
      destination: snapshot?.current_trip?.destination ?? XPT_SYDNEY_PROFILE.destination,
      window:
        snapshot?.current_trip
          ? `${formatRouteWindow(snapshot.current_trip.departs)} - ${formatRouteWindow(snapshot.current_trip.arrives)}`
          : XPT_SYDNEY_PROFILE.window,
    };
  }

  if (joined.includes("traralgon")) {
    return {
      ...TRARALGON_REGIONAL_PROFILE,
      origin: snapshot?.current_trip?.origin ?? TRARALGON_REGIONAL_PROFILE.origin,
      destination: snapshot?.current_trip?.destination ?? TRARALGON_REGIONAL_PROFILE.destination,
      window:
        snapshot?.current_trip
          ? `${formatRouteWindow(snapshot.current_trip.departs)} - ${formatRouteWindow(snapshot.current_trip.arrives)}`
          : TRARALGON_REGIONAL_PROFILE.window,
    };
  }

  if (joined.includes("waurn ponds")) {
    return {
      ...WAURN_PONDS_REGIONAL_PROFILE,
      origin: snapshot?.current_trip?.origin ?? WAURN_PONDS_REGIONAL_PROFILE.origin,
      destination: snapshot?.current_trip?.destination ?? WAURN_PONDS_REGIONAL_PROFILE.destination,
      window:
        snapshot?.current_trip
          ? `${formatRouteWindow(snapshot.current_trip.departs)} - ${formatRouteWindow(snapshot.current_trip.arrives)}`
          : WAURN_PONDS_REGIONAL_PROFILE.window,
    };
  }

  return null;
}

function getRegionalStopDelayLabel(delayMinutes?: number) {
  if (typeof delayMinutes !== "number") return "0";
  if (delayMinutes === 0) return "0";
  return `${delayMinutes}`;
}

function formatRegionalServiceDate(timestamp?: string) {
  if (!timestamp) return new Date().toLocaleDateString("en-AU");
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return new Date().toLocaleDateString("en-AU");
  return parsed.toLocaleDateString("en-AU");
}

function getDistanceInMetres(from: [number, number], to: [number, number]) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const lat1 = toRadians(from[0]);
  const lat2 = toRadians(to[0]);
  const dLat = toRadians(to[0] - from[0]);
  const dLng = toRadians(to[1] - from[1]);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistanceLabel(distanceMetres: number) {
  if (distanceMetres < 1000) {
    return `${Math.round(distanceMetres)} m away`;
  }

  return `${(distanceMetres / 1000).toFixed(1)} km away`;
}

function isGenericRegionalPlaceholder(value?: string | null) {
  const normalised = value?.trim().toLowerCase() ?? "";
  return !normalised || normalised === "v/line" || normalised === "vline" || normalised === "unknown";
}

function getPolylinePointDistanceMetres(position: [number, number], line: [number, number][]) {
  return line.reduce((closest, point) => Math.min(closest, getDistanceInMetres(position, point)), Number.POSITIVE_INFINITY);
}

function getRegionalFallbackMeta(
  vehicle: Pick<LiveTrain, "lat" | "lng" | "line" | "destination" | "serviceDescription" | "direction">,
) {
  if (!isVlineLiveTrain(vehicle)) {
    return null;
  }

  const joined = `${vehicle.line} ${vehicle.destination} ${vehicle.serviceDescription ?? ""}`.toLowerCase();
  const cityBound =
    vehicle.direction === "city-bound" ||
    vehicle.direction === "up" ||
    /southern cross|flinders street|melbourne central|flagstaff|parliament|city/i.test(vehicle.destination);

  const explicitMetas = [
    { match: /(xpt|nsw trainlink|sydney central|campbelltown|goulburn|albury)/, outbound: "Sydney Central", inbound: "Southern Cross", serviceLabel: "NSW TrainLink XPT" },
    { match: /(waurn ponds|geelong|warrnambool)/, outbound: "Waurn Ponds", inbound: "Southern Cross", serviceLabel: "Geelong line" },
    { match: /(ballarat|wendouree|ararat|maryborough)/, outbound: "Ballarat", inbound: "Southern Cross", serviceLabel: "Ballarat line" },
    { match: /(bendigo|castlemaine|echuca|swan hill)/, outbound: "Bendigo", inbound: "Southern Cross", serviceLabel: "Bendigo line" },
    { match: /(seymour|shepparton|albury|wallan|broadford|tallarook)/, outbound: "Seymour", inbound: "Southern Cross", serviceLabel: "Seymour line" },
    { match: /(traralgon|bairnsdale|sale|morwell|moe)/, outbound: "Bairnsdale", inbound: "Southern Cross", serviceLabel: "Gippsland line" },
  ] as const;

  for (const meta of explicitMetas) {
    if (meta.match.test(joined)) {
      return {
        ...meta,
        origin: cityBound ? meta.outbound : meta.inbound,
        destination: cityBound ? meta.inbound : meta.outbound,
      };
    }
  }

  const position: [number, number] = [vehicle.lat, vehicle.lng];
  const inferredMetas = [
    {
      outbound: "Sydney Central",
      inbound: "Southern Cross",
      serviceLabel: "NSW TrainLink XPT",
      distance: getPolylinePointDistanceMetres(position, XPT_INTERSTATE_LINE),
    },
    {
      outbound: "Waurn Ponds",
      inbound: "Southern Cross",
      serviceLabel: "Geelong line",
      distance: getPolylinePointDistanceMetres(position, GEELONG_LINE),
    },
    {
      outbound: "Bairnsdale",
      inbound: "Southern Cross",
      serviceLabel: "Gippsland line",
      distance: getPolylinePointDistanceMetres(position, GIPPSLAND_LINE),
    },
    {
      outbound: "Ballarat / Bendigo / Seymour",
      inbound: "Southern Cross",
      serviceLabel: "Regional west line",
      distance: getPolylinePointDistanceMetres(position, BALLARAT_SHARED_VLINE_TRUNK),
    },
  ];

  const closest = inferredMetas.sort((left, right) => left.distance - right.distance)[0];
  if (!closest) {
    return null;
  }

  return {
    ...closest,
    origin: cityBound ? closest.outbound : closest.inbound,
    destination: cityBound ? closest.inbound : closest.outbound,
  };
}

function getVehicleServiceSummary(vehicle: LiveTrain) {
  const route = vehicle.serviceDescription?.trim();
  if (route) {
    return route;
  }

  if (isGenericRegionalPlaceholder(vehicle.line) || isGenericRegionalPlaceholder(vehicle.destination)) {
    const regionalMeta = getRegionalFallbackMeta(vehicle);
    if (regionalMeta) {
      return `${regionalMeta.serviceLabel} service to ${regionalMeta.destination}`;
    }
  }

  return `${vehicle.line} to ${vehicle.destination}`.trim();
}

function getVehicleOriginFallback(vehicle: LiveTrain) {
  const summary = getVehicleServiceSummary(vehicle);
  const match = summary.match(/^(.*?)\s+to\s+(.*)$/i);
  if (match?.[1]?.trim()) {
    return match[1].trim();
  }

  const normalizedLine = vehicle.line.trim().toLowerCase();
  const headingToCity = /city|flinders street|southern cross|parliament|melbourne central|flagstaff|town hall|state library/i.test(
    vehicle.destination,
  );

  if (headingToCity) {
    switch (normalizedLine) {
      case "lilydale":
        return "Lilydale";
      case "belgrave":
        return "Belgrave";
      case "glen waverley":
        return "Glen Waverley";
      case "alamein":
        return "Alamein";
      case "mernda":
        return "Mernda";
      case "hurstbridge":
        return "Hurstbridge";
      case "frankston":
        return "Frankston";
      case "sandringham":
        return "Sandringham";
      case "williamstown":
        return "Williamstown";
      case "werribee":
        return "Werribee";
      case "sunbury":
        return "Sunbury";
      case "cranbourne":
        return "Cranbourne";
      case "pakenham":
        return "Pakenham";
      case "traralgon":
        return "Traralgon";
      case "craigieburn":
        return "Craigieburn";
      case "upfield":
        return "Upfield";
      case "metro tunnel":
        return "Cranbourne / Pakenham";
      case "v/line":
        return getRegionalFallbackMeta(vehicle)?.origin ?? "Regional origin";
      default:
        return `${vehicle.line} origin`;
    }
  }

  switch (normalizedLine) {
    case "metro tunnel":
      return "Sunbury / Watergardens";
    case "v/line":
      return getRegionalFallbackMeta(vehicle)?.origin ?? "Southern Cross";
    case "traralgon":
      return "Southern Cross";
    default:
      return "Flinders Street";
  }
}

function getVehicleStoppingPattern(vehicle: LiveTrain) {
  const summary = getVehicleServiceSummary(vehicle);
  if (/ to /i.test(summary)) {
    return summary;
  }

  if (/(xpt|nsw trainlink|sydney central|albury|wagga|cootamundra)/i.test(`${vehicle.line} ${vehicle.destination}`)) {
    return "NSW TrainLink XPT interstate service to Sydney Central";
  }

  if (/traralgon/i.test(`${vehicle.line} ${vehicle.destination}`)) {
    return "Traralgon express service to Southern Cross";
  }

  if (isGenericRegionalPlaceholder(vehicle.line) || isGenericRegionalPlaceholder(vehicle.destination)) {
    const regionalMeta = getRegionalFallbackMeta(vehicle);
    if (regionalMeta) {
      return `${regionalMeta.serviceLabel} service to ${regionalMeta.destination}`;
    }
  }

  return `${vehicle.line} line service to ${vehicle.destination}`;
}

function getRegionalRestrictionSummary(profile?: RegionalServiceProfile | null) {
  if (!profile) return "";
  const notes = Array.from(
    new Set(
      profile.stops
        .map((stop) => stop.note?.trim())
        .filter((note): note is string => Boolean(note) && !/^express$/i.test(note)),
    ),
  );
  return notes.join(" · ");
}

function getVehicleWindowLabel(snapshot: ConsistSnapshot | undefined, vehicle: LiveTrain) {
  if (snapshot?.current_trip) {
    return `${formatRouteWindow(snapshot.current_trip.departs)}-${formatRouteWindow(snapshot.current_trip.arrives)}`;
  }

  if (snapshot?.next_trip) {
    return `${formatRouteWindow(snapshot.next_trip.departs)}-${formatRouteWindow(snapshot.next_trip.arrives)}`;
  }

  return vehicle.timestamp ? "Live now" : "Waiting";
}

function normaliseVehicleLineText(vehicle: Pick<LiveTrain, "line" | "destination" | "serviceDescription">) {
  return `${vehicle.line} ${vehicle.destination} ${vehicle.serviceDescription ?? ""}`.toLowerCase();
}

function getRegionalLayerVisibility(
  vehicle: Pick<LiveTrain, "line" | "destination" | "serviceDescription">,
  layers: LayerState,
) {
  const joined = normaliseVehicleLineText(vehicle);

  if (/(waurn ponds|geelong|warrnambool)/i.test(joined)) return layers.geelongRegional;
  if (/(ballarat|wendouree|ararat|maryborough)/i.test(joined)) return layers.ballaratRegional;
  if (/(bendigo|castlemaine|echuca|swan hill)/i.test(joined)) return layers.bendigoRegional;
  if (/(seymour|shepparton|albury|wallan|broadford|tallarook)/i.test(joined)) return layers.seymourRegional;
  if (/(traralgon|traralgon|bairnsdale|sale|morwell|moe)/i.test(joined)) return layers.traralgonRegional;

  return true;
}

function getVehicleLayerVisibility(
  vehicle: Pick<LiveTrain, "line" | "destination" | "serviceDescription" | "trainType">,
  layers: LayerState,
) {
  const joined = normaliseVehicleLineText(vehicle);
  const line = vehicle.line.trim().toLowerCase();

  if (isVlineLiveTrain(vehicle)) {
    return getRegionalLayerVisibility(vehicle, layers);
  }

  if (/(frankston|stony point)/i.test(joined)) return layers.frankstonLine;
  if (/(mernda)/i.test(joined)) return layers.merndaLine;
  if (/(hurstbridge)/i.test(joined)) return layers.hurstbridgeLine;
  if (/(craigieburn)/i.test(joined)) return layers.craigieburnLine;
  if (/(upfield)/i.test(joined)) return layers.upfieldLine;
  if (/(lilydale)/i.test(joined)) return layers.lilydaleLine;
  if (/(belgrave)/i.test(joined)) return layers.belgraveLine;
  if (/(alamein)/i.test(joined)) return layers.alameinLine;
  if (/(glen waverley)/i.test(joined)) return layers.glenWaverleyLine;
  if (/(sandringham)/i.test(joined)) return layers.sandringhamLine;
  if (/(werribee|williamstown|altona|newport|laverton)/i.test(joined)) return layers.werribeeLine;
  if (/(sunbury|watergardens)/i.test(joined)) return layers.sunburyLine || layers.metroTunnel;
  if (/(cranbourne)/i.test(joined)) return layers.cranbourneLine || layers.metroTunnel;
  if (/(pakenham|east pakenham)/i.test(joined)) return layers.pakenhamLine || layers.metroTunnel;
  if (/(metro tunnel|town hall|state library|anzac|arden|parkville)/i.test(joined)) return layers.metroTunnel;

  return true;
}

function isRouteIdentifier(value: string) {
  return /^aus:vic:vic-02-[A-Z0-9]+:/i.test(value) || /^vic-02-[A-Z0-9]+:/i.test(value);
}

function isValidConsistPart(part: string) {
  return /^\d{2,4}[A-Z]?$/i.test(part);
}

function normaliseDisplayedConsistParts(consist: string) {
  const trimmed = consist.trim();
  if (!trimmed || isRouteIdentifier(trimmed)) {
    return [];
  }

  const rawParts = trimmed
    .split(/[\s-]+/)
    .map((part) => part.trim())
    .filter((part) => Boolean(part) && !isRouteIdentifier(part) && isValidConsistPart(part));

  const looksLikeHcmt =
    rawParts.length >= 2 &&
    rawParts.every((part) => /^\d{4}M?$/i.test(part));

  const parts = looksLikeHcmt ? rawParts.map((part) => part.replace(/M$/i, "")) : rawParts;
  const trailerCars = parts.filter((part) => /\d+T$/i.test(part));
  const motorCars = parts.filter((part) => /\d+M$/i.test(part));
  const trailersLead =
    trailerCars.length > 0 &&
    parts.slice(0, trailerCars.length).every((part) => /\d+T$/i.test(part)) &&
    parts.slice(trailerCars.length).every((part) => /\d+M$/i.test(part));

  if (trailersLead && motorCars.length === trailerCars.length * 2) {
    const arrangedParts: string[] = [];

    for (let index = 0; index < trailerCars.length; index += 1) {
      const motorOffset = index * 2;
      arrangedParts.push(motorCars[motorOffset], trailerCars[index], motorCars[motorOffset + 1]);
    }

    return arrangedParts.filter(Boolean);
  }

  return parts;
}

function formatDisplayedConsist(parts: string[]) {
  if (parts.length === 6 && parts[1]?.endsWith("T") && parts[4]?.endsWith("T")) {
    return `${parts.slice(0, 3).join("-")}, ${parts.slice(3).join("-")}`;
  }

  if (parts.length === 3 && parts[1]?.endsWith("T")) {
    return parts.join("-");
  }

  return parts.join("-");
}

function getDisplayConsist(consist: string) {
  const trimmed = consist.trim();
  if (!trimmed || /^unknown$/i.test(trimmed) || isRouteIdentifier(trimmed)) {
    return null;
  }

  const parts = normaliseDisplayedConsistParts(trimmed);
  if (parts.length === 0) {
    return null;
  }

  return formatDisplayedConsist(parts);
}

function getSnapshotConsistId(consist: string) {
  const trimmed = consist.trim();
  if (!trimmed || /^unknown$/i.test(trimmed) || isRouteIdentifier(trimmed)) {
    return null;
  }

  const parts = normaliseDisplayedConsistParts(trimmed);
  return parts.length > 0 ? parts.join("-") : null;
}

function normaliseConsistLookupValue(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function splitConsistCars(consist: string) {
  const displayConsist = getDisplayConsist(consist);
  if (!displayConsist) {
    return [];
  }

  if (displayConsist === "430M") {
    return ["369M", "1035T", "370M", "429M", "1065T", "430M"];
  }
  return normaliseDisplayedConsistParts(displayConsist);
}

// Saved layout presets for future TransitAlert consist visualisation work.
// These keep the rough carriage-slot shape we want for Metro 6-car and
// non-Metro-Tunnel 7-car style capacity mockups.
const CONSIST_LAYOUT_PRESETS = {
  metroSixCar: {
    label: "Metro 6-car",
    slotCount: 6,
    activeSlots: [0, 1, 2, 3, 4, 5],
    blockedSlots: [],
    endCars: [0, 5],
  },
  regionalSevenCar: {
    label: "Regional / 7-car",
    slotCount: 10,
    activeSlots: [4, 5, 6, 7, 8, 9],
    blockedSlots: [0, 1, 2, 3],
    endCars: [9],
  },
} as const;

function inferComengVariant(vehicle: LiveTrain) {
  const joined = `${vehicle.line} ${vehicle.destination} ${vehicle.serviceDescription ?? ""}`.toLowerCase();
  if (/(craigieburn|upfield|sunbury|northern|mernda|hurstbridge|clifton hill)/i.test(joined)) {
    return "North-side Comeng";
  }
  return "South-side Comeng";
}

function sortVehiclesByViewportDistance<T extends { lat: number; lng: number }>(
  vehicles: T[],
  bounds: L.LatLngBounds,
) {
  const center = bounds.getCenter();
  return [...vehicles].sort((left, right) => {
    const leftDistance = center.distanceTo(L.latLng(left.lat, left.lng));
    const rightDistance = center.distanceTo(L.latLng(right.lat, right.lng));
    return leftDistance - rightDistance;
  });
}

function normaliseMetroLineGroup(vehicle: LiveTrain) {
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

function resolveVehicleFamilyForLine(vehicle: LiveTrain, explicitFamily: string | null) {
  switch (normaliseMetroLineGroup(vehicle)) {
    case "metro-tunnel":
    case "hcmt-corridor":
    case "sunbury":
      return "HCMT";
    case "clifton-hill":
    case "burnley":
      return "Xâ€™Trapolis 100";
    case "northern":
      return explicitFamily === "Xâ€™Trapolis 100" ? explicitFamily : "North-side Comeng";
    case "bayside":
      if (explicitFamily === "South-side Comeng" || explicitFamily === "Siemens Nexas") {
        return explicitFamily;
      }
      return "Siemens Nexas";
    default:
      return explicitFamily;
  }
}

function getVehicleFormation(vehicle: LiveTrain) {
  const cars = splitConsistCars(vehicle.consist);
  const trailerCars = cars.filter((car) => /\d+T$/i.test(car));
  const inferredCarCount =
    trailerCars.length > 0
      ? trailerCars.length * 3
      : cars.length >= 6
        ? 6
        : cars.length >= 3
          ? 3
          : Math.max(cars.length, 0);

  const upperTrainType = vehicle.trainType.toUpperCase();
  const upperConsist = vehicle.consist.toUpperCase();
  const joinedCars = cars.join(" ").toUpperCase();

  let family: string | null = null;

  const hasXtrapolisTrailer = /12\d{2}T|13\d{2}T|14\d{2}T|15\d{2}T|16\d{2}T/.test(joinedCars);
  const hasSiemensTrailer = /25\d{2}T/.test(joinedCars);
  const hasComengTrailer = /10\d{2}T|11\d{2}T/.test(joinedCars);

  if (/HCMT/.test(upperTrainType) || /HCMT/.test(upperConsist) || /HCMT/.test(joinedCars)) {
    family = "HCMT";
  } else if (/X['’]?TRAPOLIS|XTRAPOLIS/.test(upperTrainType) || hasXtrapolisTrailer) {
    family = "X’Trapolis 100";
  } else if (/SIEMENS/.test(upperTrainType) || hasSiemensTrailer) {
    family = "Siemens Nexas";
  } else if (/COMENG/.test(upperTrainType) || hasComengTrailer || /3\d{2}M|4\d{2}M|5\d{2}M|6\d{2}M/.test(joinedCars)) {
    family = inferComengVariant(vehicle);
  }
  family = resolveVehicleFamilyForLine(vehicle, family);
  return {
    family,
    cars: inferredCarCount,
  };
}

function getVehicleDisplayType(vehicle: LiveTrain) {
  if (isVlineLiveTrain(vehicle)) {
    return getRegionalTrainTypeLabel(vehicle);
  }

  const formation = getVehicleFormation(vehicle);

  if (formation.family && formation.cars >= 3) {
    return `${formation.family} (${formation.cars}-car)`;
  }

  if (formation.family) {
    return formation.family;
  }

  return vehicle.trainType;
}

function getVehicleTypeIcon(vehicle: LiveTrain) {
  const joined = `${vehicle.line} ${vehicle.destination} ${vehicle.trainType} ${vehicle.consist}`.toLowerCase();
  if (/(xpt|nsw trainlink)/.test(joined)) {
    return "/images/xpt.svg";
  }
  const formation = getVehicleFormation(vehicle);

  switch (formation.family) {
    case "HCMT":
      return hcmtIcon;
    case "Siemens Nexas":
      return siemensIcon;
    case "Xâ€™Trapolis 100":
      return xtrapolisIcon;
    case "South-side Comeng":
      return southsideComengIcon;
    case "North-side Comeng":
      return northsideComengIcon;
    default:
      return null;
  }
}

function getVehicleFocusKey(vehicle: Pick<LiveTrain, "consist" | "tdn">) {
  return `${vehicle.consist}::${vehicle.tdn}`;
}

function getDistanceInKm(a: [number, number], b: [number, number]) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(b[0] - a[0]);
  const deltaLng = toRadians(b[1] - a[1]);
  const lat1 = toRadians(a[0]);
  const lat2 = toRadians(b[0]);

  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function createEditorMarkerIcon(isSelected: boolean) {
  return L.divIcon({
    html: `<div style="
      width:26px;
      height:26px;
      border-radius:9999px;
      background:${isSelected ? "#f59e0b" : "#60a5fa"};
      border:3px solid white;
      box-shadow:0 6px 18px rgba(0,0,0,0.55);
      outline:${isSelected ? "6px solid rgba(245, 158, 11, 0.18)" : "4px solid rgba(96, 165, 250, 0.14)"};
    "></div>`,
    className: "bg-transparent border-none",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function createCustomIcon(report: Report) {
  const emoji = TRANSPORT_EMOJI[report.transportType] ?? "📍";
  const color = REPORT_COLOR[report.reportType] ?? "#6b7280";
  const isInspector = report.reportType === "inspector";

  const html = `
    <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
      ${
        isInspector
          ? `<div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.35;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>`
          : ""
      }
      <div style="
        width:36px;
        height:36px;
        border-radius:50%;
        background:${color};
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:18px;
        border:2px solid rgba(255,255,255,0.35);
        box-shadow:0 4px 14px rgba(0,0,0,0.6);
        position:relative;
        z-index:1;
      ">${emoji}</div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "bg-transparent border-none",
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -24],
  });
}

// =========================
// Small Components
// =========================
function LocationCenterer({ loc }: { loc: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (loc) {
      map.setView(loc, 13, { animate: true });
    }
  }, [loc, map]);

  return null;
}

function ViewportListener({
  onViewportChange,
}: {
  onViewportChange: (zoom: number, bounds: L.LatLngBounds) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const updateViewport = () => onViewportChange(map.getZoom(), map.getBounds());
    updateViewport();
    map.on("zoomend", updateViewport);
    map.on("moveend", updateViewport);

    return () => {
      map.off("zoomend", updateViewport);
      map.off("moveend", updateViewport);
    };
  }, [map, onViewportChange]);

  return null;
}

function LayerControl({
  layers,
  onChange,
}: {
  layers: LayerState;
  onChange: (key: keyof LayerState) => void;
}) {
  const [open, setOpen] = useState(false);

  const controls: {
    key: keyof LayerState;
    label: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    
    {
      key: "werribeeLine",
label: "Werribee / Williamstown / Altona",
      icon: <Train className="w-3.5 h-3.5" />,
      color: "#F178AF",
    },
    {
      key: "frankstonLine",
      label: "Frankston Line",
      icon: <Train className="w-3.5 h-3.5" />,
      color: "#22c55e",
    },
    {
  key: "merndaLine",
  label: "Mernda Line",
  icon: <Train className="w-3.5 h-3.5" />,
  color: "#BE1014",
},
{
  key: "hurstbridgeLine",
  label: "Hurstbridge Line",
  icon: <Train className="w-3.5 h-3.5" />,
  color: "#BE1014",
},
{
  key: "cliftonHillLoop",
  label: "Clifton Hill Loop",
  icon: <Train className="w-3.5 h-3.5" />,
  color: "#BE1014",
},
    {
      key: "cranbourneLine",
      label: "Cranbourne Line",
      icon: <Train className="w-3.5 h-3.5" />,
      color: "#279FD5",
    },
    {
      key: "pakenhamLine",
      label: "Pakenham Line",
      icon: <Train className="w-3.5 h-3.5" />,
      color: "#279FD5",
    },
    {
      key: "sunburyLine",
      label: "Sunbury Line",
      icon: <Train className="w-3.5 h-3.5" />,
      color: "#279FD5",
    },
    {
      key: "northernLoop",
      label: "Northern Loop",
      icon: <Train className="w-3.5 h-3.5" />,
      color: "#FFD200",
    },
    {
      key: "metroTunnel",
      label: "Metro Tunnel",
      icon: <Train className="w-3.5 h-3.5" />,
      color: "#279FD5",
    },
    {
      key: "sandringhamLine",
      label: "Sandringham Line",
      icon: <Train className="w-3.5 h-3.5" />,
      color: "#F178AF",
    },
    {
  key: "craigieburnLine",
  label: "Craigieburn Line",
  icon: <Train className="w-3.5 h-3.5" />,
  color: "#FFD200",
},
{
  key: "upfieldLine",
  label: "Upfield Line",
  icon: <Train className="w-3.5 h-3.5" />,
  color: "#FFD200",
},
{
  key: "lilydaleLine",
  label: "Lilydale Line",
  icon: <Train className="w-3.5 h-3.5" />,
  color: "#279FD5",
},
{
  key: "belgraveLine",
  label: "Belgrave Line",
  icon: <Train className="w-3.5 h-3.5" />,
  color: "#279FD5",
},
{
  key: "alameinLine",
  label: "Alamein Line",
  icon: <Train className="w-3.5 h-3.5" />,
  color: "#279FD5",
},
{
  key: "glenWaverleyLine",
  label: "Glen Waverley Line",
  icon: <Train className="w-3.5 h-3.5" />,
  color: "#279FD5",
},
{
  key: "burnleyLoop",
  label: "Burnley Loop",
  icon: <Train className="w-3.5 h-3.5" />,
  color: "#279FD5",
},
    {
      key: "inspectors",
      label: "Inspectors",
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      color: "#e11d48",
    },
    {
      key: "delays",
      label: "Delays",
      icon: <Clock className="w-3.5 h-3.5" />,
      color: "#f59e0b",
    },
    {
      key: "incidents",
      label: "Incidents",
      icon: <Info className="w-3.5 h-3.5" />,
      color: "#3b82f6",
    },
    {
      key: "heatCircles",
      label: "Hotspot Glow",
      icon: <MapPin className="w-3.5 h-3.5" />,
      color: "#f43f5e",
    },
  ];

  return (
    <div className="absolute top-20 right-3 z-[1000] flex flex-col items-end gap-2">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-10 h-10 rounded-full bg-gray-900/90 border border-white/10 shadow-xl flex items-center justify-center text-white hover:bg-gray-800 transition-colors"
        title="Map Layers"
      >
        <Layers className="w-5 h-5" />
      </button>

      {open && (
        <div className="bg-gray-900/95 border border-white/10 rounded-2xl p-3 shadow-2xl flex flex-col gap-1.5 min-w-[170px]">
          <p className="text-[10px] uppercase tracking-widest text-white/40 px-1 mb-1">
            Map Layers
          </p>

          {controls.map(({ key, label, icon, color }) => (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                layers[key]
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/60 hover:bg-white/5"
              }`}
            >
              <span style={{ color: layers[key] ? color : undefined }}>
                {icon}
              </span>
              <span>{label}</span>
              <span className="ml-auto">
                {layers[key] ? (
                  <Eye className="w-3.5 h-3.5 text-white/50" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-white/20" />
                )}
              </span>
            </button>
          ))}

          <div className="border-t border-white/10 mt-1 pt-2">
            <p className="text-[10px] text-white/30 px-1">Filter by Transport</p>
            <div className="flex gap-1.5 mt-1.5 flex-wrap px-1">
              {Object.entries(TRANSPORT_EMOJI).map(([type, emoji]) => (
                <span
                  key={type}
                  title={type}
                  className="text-base cursor-default select-none"
                >
                  {emoji}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================
// Main Component
// =========================
export function Map({
  journeyRoute = [],
  splitCrossCityGroup = false,
  transportModes = [...DEFAULT_TRANSPORT_MODES],
  onTransportModesChange,
  persistedLayerState,
  onLayerStateChange,
  isAdmin = false,
  isGuest = false,
  isPremium = false,
  premiumPaypalLink = "",
  favouriteConsists = [],
  onToggleFavouriteConsist,
  showFilterRail = true,
  focusedVehicleKey = null,
  onFocusedVehicleHandled,
  debugLineKey = "none",
  mobilePerformanceMode = "auto",
}: MapProps = {}) {
  const isMobile = useIsMobile();
  const isIos =
    typeof navigator !== "undefined" && /iPad|iPhone|iPod/i.test(navigator.userAgent);
  const mobilePerformanceEnabled =
    mobilePerformanceMode === "on" || (mobilePerformanceMode === "auto" && isMobile);
  const aggressiveMobileProtectionEnabled = mobilePerformanceEnabled || isIos;
  const mapRef = useRef<L.Map | null>(null);
  const lastEmittedLayerStateRef = useRef<LayerState | null>(null);
  const consistData = { active: false } as any;
  const [trainLookupQuery, setTrainLookupQuery] = useState("");
  const [trainLookupMessage, setTrainLookupMessage] = useState("");
  const [activeSurfaceRouteFilters, setActiveSurfaceRouteFilters] = useState<string[]>(
    () => SURFACE_ROUTE_FILTERS.map((filter) => filter.key),
  );
  const [mapZoom, setMapZoom] = useState(13);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const viewportBoundsQuery = useMemo(() => {
    const sourceBounds = mapBounds?.pad(aggressiveMobileProtectionEnabled ? 0.14 : 0.35) ?? L.latLngBounds([-38.25, 144.35], [-37.45, 145.55]);
    return {
      minLat: Number(sourceBounds.getSouth().toFixed(5)),
      maxLat: Number(sourceBounds.getNorth().toFixed(5)),
      minLng: Number(sourceBounds.getWest().toFixed(5)),
      maxLng: Number(sourceBounds.getEast().toFixed(5)),
    };
  }, [aggressiveMobileProtectionEnabled, mapBounds]);
  const allowMobileHeavySurfaceTracking = !aggressiveMobileProtectionEnabled || mapZoom >= 14.4;
  const allowMobileHeavyTrainTracking = !aggressiveMobileProtectionEnabled || mapZoom >= 13.1;
  const visibleViewportBounds = useMemo(
    () =>
      L.latLngBounds(
        [viewportBoundsQuery.minLat, viewportBoundsQuery.minLng],
        [viewportBoundsQuery.maxLat, viewportBoundsQuery.maxLng],
      ),
    [viewportBoundsQuery],
  );
  const selectedAdminDebugOverlay = useMemo(() => {
    switch (debugLineKey) {
      case "glenWaverleyLine":
        return renderTrackDebugMarkers("GLEN_WAVERLEY_LINE", GLEN_WAVERLEY_DEBUG_TRACK_POINTS, "#93c5fd");
      case "bairnsdaleLine":
        return renderTrackDebugMarkers("BAIRNSDALE_LINE", BAIRNSDALE_DEBUG_TRACK_POINTS, "#c4b5fd");
      case "cliftonHillLoop":
        return renderTrackDebugMarkers("CLIFTON_HILL_LOOP", CLIFTON_HILL_DEBUG_TRACK_POINTS, "#fda4af");
      case "northernLoop":
        return renderTrackDebugMarkers("NORTHERN_LOOP", NORTHERN_DEBUG_TRACK_POINTS, "#fde68a");
      case "caulfieldLoop":
        return renderTrackDebugMarkers("CAULFIELD_LOOP", CAULFIELD_DEBUG_TRACK_POINTS, "#86efac");
      default:
        return null;
    }
  }, [debugLineKey]);

  const { data } = useGetReports({
    query: { refetchInterval: 30000 },
  });

  const {
    data: liveVehicles = [],
    isLoading: isLiveTrainsLoading,
    error: liveTrainsError,
  } = useQuery({
    queryKey: ["/api/ptv/live-trains", viewportBoundsQuery],
    queryFn: () => fetchLiveTrains(viewportBoundsQuery),
    enabled: !isGuest && allowMobileHeavyTrainTracking && (transportModes.includes("train") || transportModes.includes("vline")),
    refetchInterval: aggressiveMobileProtectionEnabled ? 40_000 : 15_000,
    staleTime: aggressiveMobileProtectionEnabled ? 25_000 : 5_000,
    retry: false,
  });
  const {
    data: liveBuses = [],
    isLoading: isLiveBusesLoading,
  } = useQuery({
    queryKey: ["/api/ptv/live-buses", viewportBoundsQuery],
    queryFn: () => fetchLiveBuses(viewportBoundsQuery),
    enabled: !isGuest && transportModes.includes("bus") && allowMobileHeavySurfaceTracking,
    refetchInterval: aggressiveMobileProtectionEnabled ? 45_000 : 15_000,
    staleTime: aggressiveMobileProtectionEnabled ? 30_000 : 5_000,
    retry: false,
  });
  const {
    data: liveTrams = [],
    isLoading: isLiveTramsLoading,
  } = useQuery({
    queryKey: ["/api/ptv/live-trams", viewportBoundsQuery],
    queryFn: () => fetchLiveTrams(viewportBoundsQuery),
    enabled: !isGuest && transportModes.includes("tram") && allowMobileHeavySurfaceTracking,
    refetchInterval: aggressiveMobileProtectionEnabled ? 45_000 : 15_000,
    staleTime: aggressiveMobileProtectionEnabled ? 30_000 : 5_000,
    retry: false,
  });
  const { data: featuredConsistSnapshot } = useQuery({
    queryKey: ["consist-snapshot", FEATURED_CONSIST, "featured-marker"],
    queryFn: () => fetchConsistSnapshot(FEATURED_CONSIST),
    enabled: !isGuest,
    refetchInterval: 30000,
    retry: false,
  });

  const reports = Array.isArray(data) ? data : [];
  const [selectedDetail, setSelectedDetail] = useState<
    | { type: "station"; station: Station }
    | { type: "vehicle"; vehicle: LiveTrain }
    | { type: "surfaceStop"; stop: SurfaceStop }
    | { type: "report"; report: Report }
    | null
  >(null);
  const [selectedBoardServiceContext, setSelectedBoardServiceContext] = useState<{
    vehicleKey: string;
    tdn: string;
  } | null>(null);
  const selectedVehicle = selectedDetail?.type === "vehicle" ? selectedDetail.vehicle : null;
  const selectedVehicleKey = selectedVehicle ? getVehicleFocusKey(selectedVehicle) : null;
  const selectedSurfaceStop = selectedDetail?.type === "surfaceStop" ? selectedDetail.stop : null;
  const selectedVehicleSnapshotConsist = selectedVehicle ? getSnapshotConsistId(selectedVehicle.consist) : null;
  const { data: selectedVehicleSnapshot } = useQuery({
    queryKey: ["consist-snapshot", selectedVehicleSnapshotConsist],
    queryFn: () => fetchConsistSnapshot(selectedVehicleSnapshotConsist!),
    enabled: !isGuest && Boolean(selectedVehicleSnapshotConsist),
    refetchInterval: 30000,
    retry: false,
  });
  const selectedRegionalProfile = selectedVehicle
    ? getRegionalServiceProfile(selectedVehicle, selectedVehicleSnapshot)
    : null;
  const selectedVehicleOriginLabel = selectedVehicle
    ? selectedVehicleSnapshot?.current_trip?.origin ??
      selectedRegionalProfile?.origin ??
      selectedVehicleSnapshot?.next_trip?.origin ??
      getVehicleOriginFallback(selectedVehicle)
    : "";
  const selectedVehicleDestinationLabel = selectedVehicle
    ? selectedVehicleSnapshot?.current_trip?.destination ??
      selectedRegionalProfile?.destination ??
      selectedVehicleSnapshot?.next_trip?.destination ??
      (isGenericRegionalPlaceholder(selectedVehicle.destination)
        ? getRegionalFallbackMeta(selectedVehicle)?.destination ?? selectedVehicle.destination
        : selectedVehicle.destination)
    : "";
  const selectedVehiclePatternLabel = selectedVehicle
    ? selectedVehicleSnapshot?.current_trip
      ? `${selectedVehicleSnapshot.current_trip.origin} to ${selectedVehicleSnapshot.current_trip.destination}`
      : selectedRegionalProfile
        ? `${selectedRegionalProfile.origin} to ${selectedRegionalProfile.destination}`
      : selectedVehicleSnapshot?.next_trip
        ? `Next: ${selectedVehicleSnapshot.next_trip.origin} to ${selectedVehicleSnapshot.next_trip.destination}`
        : getVehicleStoppingPattern(selectedVehicle)
    : "";
  const selectedVehiclePositionEstimateLabel = selectedVehicle
    ? selectedVehicleSnapshot?.position
      ? selectedVehicleSnapshot.position.vehicle_stop_status === "STOPPED_AT"
        ? `Stopped at ${selectedVehicleSnapshot.position.current_stop} at ${formatRouteWindow(selectedVehicleSnapshot.position.current_stop_time)}`
        : `Between ${selectedVehicleSnapshot.position.current_stop} and ${selectedVehicleSnapshot.position.next_stop ?? "the next stop"}`
      : selectedVehicleSnapshot?.current_trip
        ? `Running ${selectedVehicleSnapshot.current_trip.origin} to ${selectedVehicleSnapshot.current_trip.destination}`
        : selectedVehicleSnapshot?.next_trip
          ? `Waiting to form ${selectedVehicleSnapshot.next_trip.origin} to ${selectedVehicleSnapshot.next_trip.destination}`
          : `Following ${selectedVehicleOriginLabel} to ${selectedVehicleDestinationLabel}`
    : "";
  const selectedRegionalRestrictionSummary = getRegionalRestrictionSummary(selectedRegionalProfile);
  const selectedVehicleAccent = selectedVehicle ? getLiveLineColor(selectedVehicle.line) : "#3b82f6";
  const selectedVehicleIsRegional = Boolean(selectedVehicle && isVlineLiveTrain(selectedVehicle));
  const selectedVehicleDelayMinutes = selectedRegionalProfile?.stops[selectedRegionalProfile.stops.length - 1]?.delayMinutes ?? 0;
  const selectedVehicleWindowLabel = selectedRegionalProfile?.window ?? (selectedVehicle ? getVehicleWindowLabel(selectedVehicleSnapshot, selectedVehicle) : "");
  const selectedVehicleDurationLabel = selectedRegionalProfile?.duration ?? "Live trip";
  const selectedVehicleDateLabel = selectedVehicle ? formatRegionalServiceDate(selectedVehicle.timestamp) : "";
  const selectedVehicleServiceTypeLabel = selectedRegionalProfile?.serviceType ?? (selectedVehicleIsRegional ? "Regional Service" : "Metro Service");
  const selectedVehicleHeadingLabel = selectedVehicle
    ? selectedVehicleSnapshot?.current_trip
      ? `${selectedVehicleSnapshot.current_trip.origin} to ${selectedVehicleSnapshot.current_trip.destination}`
      : selectedVehicleSnapshot?.next_trip
        ? `${selectedVehicleSnapshot.next_trip.origin} to ${selectedVehicleSnapshot.next_trip.destination}`
        : selectedVehicleIsRegional
          ? `${getRegionalFallbackMeta(selectedVehicle)?.serviceLabel ?? "Regional"} service`
          : `${selectedDetail?.vehicle.line ?? selectedVehicle.line} service`
    : "";
  const selectedVehicleJourneyId = selectedVehicle
    ? (selectedBoardServiceContext?.vehicleKey === selectedVehicleKey ? selectedBoardServiceContext.tdn : null) ??
      selectedVehicleSnapshot?.current_trip?.id ??
      selectedVehicleSnapshot?.next_trip?.id ??
      (isRegionalSetIdentifier(selectedVehicle.tdn) ? "" : selectedVehicle.tdn)
    : "";
  const selectedVehicleJourneyLabel = selectedVehicle
    ? isPremium
      ? (selectedVehicleJourneyId ? `TDN ${selectedVehicleJourneyId}` : "")
      : getPublicServiceReference(selectedVehicle.destination, getMarkerServiceTime(selectedVehicle.timestamp))
    : "";
  const selectedVehicleRegionalSetLabel = selectedVehicleIsRegional && selectedVehicle
    ? getRegionalAllocatedSetLabel(selectedVehicle)
    : "";
  const selectedVehicleTypeLabel = selectedVehicle
    ? (selectedVehicleIsRegional ? getRegionalTrainTypeLabel(selectedVehicle) : getVehicleDisplayType(selectedVehicle))
    : "";
  const selectedVehicleDisplayConsist = selectedVehicle ? getDisplayConsist(selectedVehicle.consist) : "";
  const selectedVehicleIsFavouriteConsist = Boolean(
    selectedVehicleDisplayConsist &&
      favouriteConsists.some(
        (consist) => normaliseConsistLookupValue(consist) === normaliseConsistLookupValue(selectedVehicleDisplayConsist),
      ),
  );
  const selectedVehicleRelevantAlerts = useMemo(() => {
    if (!selectedVehicleSnapshot?.network_alerts?.length || !selectedVehicle) {
      return [];
    }

    const keywords = getVehicleAlertKeywords(selectedVehicle, selectedVehicleSnapshot);
    if (keywords.length === 0) {
      return [];
    }

    return selectedVehicleSnapshot.network_alerts.filter((alert) => {
      const searchable = normaliseServiceMatchText(alert);
      return keywords.some((keyword) => searchable.includes(keyword));
    });
  }, [selectedVehicle, selectedVehicleSnapshot]);
  useEffect(() => {
    if (!isGuest) return;
    setSelectedDetail((current) => (current?.type === "vehicle" ? null : current));
  }, [isGuest]);
  const featuredConsistLiveVehicle = useMemo(
    () => liveVehicles.find((vehicle) => vehicle.consist === FEATURED_CONSIST) ?? null,
    [liveVehicles],
  );
  const featuredConsistPosition = useMemo<[number, number]>(
    () =>
      featuredConsistLiveVehicle
        ? [featuredConsistLiveVehicle.lat, featuredConsistLiveVehicle.lng]
        : resolveConsistSnapshotCoordinate(featuredConsistSnapshot) ?? SOUTHERN_CROSS_POSITION,
    [featuredConsistLiveVehicle, featuredConsistSnapshot],
  );
  const featuredConsistIsLive = Boolean(
    featuredConsistLiveVehicle ||
      featuredConsistSnapshot?.status === "active" ||
      featuredConsistSnapshot?.position,
  );
  const [layers, setLayers] = useState<LayerState>({
    merndaLine: true,
    hurstbridgeLine: true,
    cliftonHillLoop: true,
    frankstonLine: true,
    cranbourneLine: true,
    pakenhamLine: true,
    sunburyLine: true,
    craigieburnLine: true,
    upfieldLine: true,
    lilydaleLine: true,
    belgraveLine: true,
    alameinLine: true,
    glenWaverleyLine: true,
    northernLoop: true,
    burnleyLoop: true,
    metroTunnel: true,
    werribeeLine: true,
    sandringhamLine: true,
    geelongRegional: true,
    ballaratRegional: true,
    bendigoRegional: true,
    seymourRegional: true,
    traralgonRegional: true,
    inspectors: true,
    delays: true,
    incidents: true,
    heatCircles: !aggressiveMobileProtectionEnabled,
  });
  const regularLiveVehicles = useMemo(
    () => {
      const filtered = liveVehicles.filter((vehicle) => vehicle.consist !== FEATURED_CONSIST);
      if (!aggressiveMobileProtectionEnabled) {
        return filtered;
      }

      const limited = sortVehiclesByViewportDistance(filtered, visibleViewportBounds);
      const cap = mapZoom >= 14.4 ? 28 : mapZoom >= 13.5 ? 14 : 0;
      return limited.slice(0, cap);
    },
    [aggressiveMobileProtectionEnabled, liveVehicles, mapZoom, visibleViewportBounds],
  );
  const metroLiveVehicles = useMemo(
    () =>
      regularLiveVehicles.filter(
        (vehicle) =>
          !isVlineLiveTrain(vehicle) &&
          getVehicleLayerVisibility(vehicle, layers) &&
          (visibleViewportBounds.contains(L.latLng(vehicle.lat, vehicle.lng)) ||
            getVehicleFocusKey(vehicle) === focusedVehicleKey),
      ),
    [focusedVehicleKey, layers, regularLiveVehicles, visibleViewportBounds],
  );
  const vlineLiveVehicles = useMemo(
    () =>
      regularLiveVehicles.filter(
        (vehicle) =>
          isVlineLiveTrain(vehicle) &&
          getVehicleLayerVisibility(vehicle, layers) &&
          (visibleViewportBounds.contains(L.latLng(vehicle.lat, vehicle.lng)) ||
            getVehicleFocusKey(vehicle) === focusedVehicleKey),
      ),
    [focusedVehicleKey, layers, regularLiveVehicles, visibleViewportBounds],
  );
  const focusVehicleOnMap = useCallback((vehicle: LiveTrain) => {
    setSelectedDetail({ type: "vehicle", vehicle });
    mapRef.current?.flyTo([vehicle.lat, vehicle.lng], Math.max(mapRef.current?.getZoom() ?? 13, 14), {
      animate: true,
      duration: 0.85,
    });
  }, []);
  const handleTrainLookup = useCallback(() => {
    if (!isPremium) {
      setTrainLookupMessage("Premium unlocks live TDN and consist lookup.");
      return;
    }

    const rawQuery = trainLookupQuery.trim();
    if (!rawQuery) {
      setTrainLookupMessage("Enter a TDN or consist to find a live service.");
      return;
    }

    const normalisedQuery = normaliseConsistLookupValue(rawQuery);
    const allVehicles = [...metroLiveVehicles, ...vlineLiveVehicles];
    const matchedByTdn =
      allVehicles.find((vehicle) => {
        const rawTdn = stripTdnPrefix(vehicle.tdn);
        const tdnCandidates = [vehicle.tdn, rawTdn]
          .filter(Boolean)
          .map((value) => normaliseConsistLookupValue(value));
        return tdnCandidates.some(
          (candidate) =>
            candidate === normalisedQuery ||
            candidate.startsWith(normalisedQuery) ||
            normalisedQuery.startsWith(candidate),
        );
      }) ?? null;

    if (matchedByTdn) {
      focusVehicleOnMap(matchedByTdn);
      setTrainLookupMessage(`Jumped to TDN ${stripTdnPrefix(matchedByTdn.tdn)}.`);
      return;
    }

    const matchedByConsist =
      allVehicles.find((vehicle) => {
        const consistCandidates = [vehicle.consist, getDisplayConsist(vehicle.consist), getSnapshotConsistId(vehicle.consist) ?? ""]
          .filter(Boolean)
          .map((value) => normaliseConsistLookupValue(value));
        return consistCandidates.some(
          (candidate) =>
            candidate === normalisedQuery ||
            candidate.startsWith(normalisedQuery) ||
            normalisedQuery.startsWith(candidate),
        );
      }) ?? null;

    if (matchedByConsist) {
      focusVehicleOnMap(matchedByConsist);
      setTrainLookupMessage(`Jumped to consist ${getDisplayConsist(matchedByConsist.consist)}.`);
      return;
    }

    setTrainLookupMessage("No live train matched that TDN or consist right now.");
  }, [focusVehicleOnMap, isPremium, metroLiveVehicles, trainLookupQuery, vlineLiveVehicles]);
  const handleFavouriteConsistClick = useCallback(
    (consist: string) => {
      if (!isPremium || !onToggleFavouriteConsist) {
        setTrainLookupMessage("Premium is required to favourite train consists.");
        return;
      }

      onToggleFavouriteConsist(consist);
      const isSaved = favouriteConsists.some(
        (item) => normaliseConsistLookupValue(item) === normaliseConsistLookupValue(consist),
      );
      setTrainLookupMessage(isSaved ? `Removed ${consist} from favourite consists.` : `Saved ${consist} as a favourite consist.`);
    },
    [favouriteConsists, isPremium, onToggleFavouriteConsist],
  );
  const handlePlatformBoardServiceClick = useCallback(
    (
      stationName: string,
      platform: PlatformBoardEntry,
      service: PlatformBoardEntry["services"][number],
    ) => {
      const tdnCandidates = extractServiceTdnCandidates(service.tdnLabel);
      const display = getPlatformServiceDisplay(stationName, platform.label, service);
      const destinationCandidates = [
        service.destination,
        display.destination,
        display.originLabel?.replace(/^Origin\s+/i, ""),
      ]
        .filter((value): value is string => Boolean(value && value.trim()))
        .map((value) => normaliseServiceMatchText(value));
      const lineHints = getPlatformLineHints(stationName, platform, service);

      const matchedVehicle =
        liveVehicles.find((vehicle) =>
          tdnCandidates.some((candidate) => vehicle.tdn.trim().toUpperCase() === candidate),
        ) ??
        liveVehicles.find((vehicle) => {
          const destinationText = normaliseServiceMatchText(vehicle.destination);
          const lineText = normaliseServiceMatchText(vehicle.line);
          const descriptionText = normaliseServiceMatchText(vehicle.serviceDescription ?? "");
          const destinationMatches = destinationCandidates.some(
            (candidate) =>
              candidate.length > 0 &&
              (destinationText.includes(candidate) ||
                candidate.includes(destinationText) ||
                lineText.includes(candidate) ||
                descriptionText.includes(candidate)),
          );
          const lineHintMatches =
            lineHints.length === 0 ||
            lineHints.some(
              (hint) =>
                lineText.includes(normaliseServiceMatchText(hint)) ||
                descriptionText.includes(normaliseServiceMatchText(hint)),
            );

          return destinationMatches && lineHintMatches;
        });

      if (!matchedVehicle) {
        return;
      }

      setSelectedBoardServiceContext({
        vehicleKey: getVehicleFocusKey(matchedVehicle),
        tdn: stripTdnPrefix(service.tdnLabel),
      });
      setSelectedDetail({ type: "vehicle", vehicle: matchedVehicle });
      mapRef.current?.flyTo([matchedVehicle.lat, matchedVehicle.lng], Math.max(mapRef.current.getZoom(), 14), {
        animate: true,
        duration: 0.85,
      });
    },
    [liveVehicles],
  );
  useEffect(() => {
    if (!selectedBoardServiceContext) {
      return;
    }

    if (!selectedVehicleKey || selectedBoardServiceContext.vehicleKey !== selectedVehicleKey) {
      setSelectedBoardServiceContext(null);
    }
  }, [selectedBoardServiceContext, selectedVehicleKey]);
  const [isMarkerEditMode, setIsMarkerEditMode] = useState(false);
  const [draftMarkerOverrides, setDraftMarkerOverrides] = useState<Record<string, MarkerOverride>>({});
  const [hoveredVehicleKey, setHoveredVehicleKey] = useState<string | null>(null);
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);

  const { data: markerOverrides = [], refetch: refetchMarkerOverrides } = useQuery({
    queryKey: ["admin-marker-overrides"],
    queryFn: fetchMarkerOverrides,
    enabled: isAdmin,
    retry: false,
  });

  useEffect(() => {
    if (persistedLayerState && !areLayerStatesEqual(layers, { ...layers, ...persistedLayerState })) {
      setLayers((prev) => ({ ...prev, ...persistedLayerState }));
    }
  }, [layers, persistedLayerState]);

  useEffect(() => {
    if (!onLayerStateChange) return;
    if (lastEmittedLayerStateRef.current && areLayerStatesEqual(lastEmittedLayerStateRef.current, layers)) {
      return;
    }
    lastEmittedLayerStateRef.current = layers;
    onLayerStateChange(layers);
  }, [layers, onLayerStateChange]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    if (isMarkerEditMode) {
      mapRef.current.dragging.disable();
      mapRef.current.doubleClickZoom.disable();
      mapRef.current.touchZoom.disable();
      mapRef.current.scrollWheelZoom.disable();
      mapRef.current.boxZoom.disable();
      mapRef.current.keyboard.disable();
      return () => {
        mapRef.current?.dragging.enable();
        mapRef.current?.doubleClickZoom.enable();
        mapRef.current?.touchZoom.enable();
        mapRef.current?.scrollWheelZoom.enable();
        mapRef.current?.boxZoom.enable();
        mapRef.current?.keyboard.enable();
      };
    }

    mapRef.current.dragging.enable();
    mapRef.current.doubleClickZoom.enable();
    mapRef.current.touchZoom.enable();
    mapRef.current.scrollWheelZoom.enable();
    mapRef.current.boxZoom.enable();
    mapRef.current.keyboard.enable();
  }, [isMarkerEditMode]);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLoc([position.coords.latitude, position.coords.longitude]);
      },
      () => {
        // Keep the location empty if GPS is unavailable instead of treating Melbourne as the user's fix.
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLoc([position.coords.latitude, position.coords.longitude]);
      },
      () => {
        // Ignore background watch errors and keep the last known valid location.
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 15000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    if (!focusedVehicleKey) return;

      const vehicle = liveVehicles.find((candidate) => getVehicleFocusKey(candidate) === focusedVehicleKey);
      if (!vehicle) return;

      if (vehicle.consist === FEATURED_CONSIST) {
        setSelectedDetail(null);
        mapRef.current?.flyTo(featuredConsistPosition, Math.max(mapRef.current.getZoom(), 14), {
          animate: true,
          duration: 0.85,
        });
        onFocusedVehicleHandled?.();
        return;
      }

      setSelectedDetail({ type: "vehicle", vehicle });
      mapRef.current?.flyTo([vehicle.lat, vehicle.lng], Math.max(mapRef.current.getZoom(), 14), {
        animate: true,
        duration: 0.85,
      });
      onFocusedVehicleHandled?.();
    }, [featuredConsistPosition, focusedVehicleKey, liveVehicles, onFocusedVehicleHandled]);

  const centerOnUserLocation = useCallback(() => {
    if (!mapRef.current) return;

    const moveToLocation = (location: [number, number]) => {
      setUserLoc(location);
      mapRef.current?.flyTo(location, Math.max(mapRef.current.getZoom(), 14), {
        animate: true,
        duration: 0.75,
      });
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          moveToLocation([position.coords.latitude, position.coords.longitude]);
        },
        () => {
          if (userLoc) {
            moveToLocation(userLoc);
            return;
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 12000,
        },
      );
      return;
    }

    if (userLoc) {
      moveToLocation(userLoc);
      return;
    }

    mapRef.current.flyTo(MELBOURNE_CENTER, Math.max(mapRef.current.getZoom(), 12), {
      animate: true,
      duration: 0.75,
    });
  }, [userLoc]);

  const toggleLayer = useCallback((key: keyof LayerState) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleStationPillLine = useCallback((station: Station) => {
    switch (station.name) {
      case "Frankston":
        setLayers((prev) => ({ ...prev, frankstonLine: !prev.frankstonLine }));
        return true;
      case "Pakenham":
        setLayers((prev) => ({ ...prev, pakenhamLine: !prev.pakenhamLine }));
        return true;
      case "Dandenong":
        setLayers((prev) => ({
          ...prev,
          pakenhamLine: !(prev.pakenhamLine || prev.cranbourneLine),
          cranbourneLine: !(prev.pakenhamLine || prev.cranbourneLine),
        }));
        return true;
      case "Caulfield":
      case "Malvern":
      case "Clayton":
        setLayers((prev) => {
          const nextValue = !(prev.frankstonLine || prev.pakenhamLine || prev.cranbourneLine);
          return {
            ...prev,
            frankstonLine: nextValue,
            pakenhamLine: nextValue,
            cranbourneLine: nextValue,
          };
        });
        return true;
      default:
        return false;
    }
  }, []);

  const renderedStationKeys = new Set<string>();

  const toggleServiceFilter = useCallback((filter: ServiceFilterKey) => {
    const shouldForceShowRegional = !transportModes.includes("vline") && (
      filter === "geelongRegionalGroup" ||
      filter === "ballaratRegionalGroup" ||
      filter === "bendigoRegionalGroup" ||
      filter === "seymourRegionalGroup" ||
      filter === "traralgonRegionalGroup"
    );
    if (shouldForceShowRegional) {
      onTransportModesChange?.([...transportModes, "vline"]);
    }
    setLayers((prev) => {
      switch (filter) {
        case "geelongRegionalGroup":
          return { ...prev, geelongRegional: shouldForceShowRegional ? true : !prev.geelongRegional };
        case "ballaratRegionalGroup":
          return { ...prev, ballaratRegional: shouldForceShowRegional ? true : !prev.ballaratRegional };
        case "bendigoRegionalGroup":
          return { ...prev, bendigoRegional: shouldForceShowRegional ? true : !prev.bendigoRegional };
        case "seymourRegionalGroup":
          return { ...prev, seymourRegional: shouldForceShowRegional ? true : !prev.seymourRegional };
        case "traralgonRegionalGroup":
          return { ...prev, traralgonRegional: shouldForceShowRegional ? true : !prev.traralgonRegional };
        case "metroTunnelServices":
          return {
            ...prev,
            metroTunnel: !prev.metroTunnel,
            sunburyLine: !prev.metroTunnel,
            cranbourneLine: !prev.metroTunnel,
            pakenhamLine: !prev.metroTunnel,
          };
        case "crossCityPink":
          return {
            ...prev,
            werribeeLine: !prev.werribeeLine,
            sandringhamLine: !prev.sandringhamLine,
          };
        case "werribeeWilliamstownGroup":
          return {
            ...prev,
            werribeeLine: !prev.werribeeLine,
          };
        case "sandringhamGroup":
          return {
            ...prev,
            sandringhamLine: !prev.sandringhamLine,
          };
        case "burnleyGroup": {
          const nextValue = !(prev.belgraveLine || prev.lilydaleLine || prev.glenWaverleyLine || prev.alameinLine || prev.burnleyLoop);
          return {
            ...prev,
            belgraveLine: nextValue,
            lilydaleLine: nextValue,
            glenWaverleyLine: nextValue,
            alameinLine: nextValue,
            burnleyLoop: nextValue,
          };
        }
        case "cliftonHillGroup": {
          const nextValue = !(prev.merndaLine || prev.hurstbridgeLine || prev.cliftonHillLoop);
          return {
            ...prev,
            merndaLine: nextValue,
            hurstbridgeLine: nextValue,
            cliftonHillLoop: nextValue,
          };
        }
        case "caulfieldGroup":
        case "frankstonGroup": {
          const nextValue = !prev.frankstonLine;
          return {
            ...prev,
            frankstonLine: nextValue,
          };
        }
        case "upfieldCraigieburn":
          return {
            ...prev,
            upfieldLine: !prev.upfieldLine,
            craigieburnLine: !prev.craigieburnLine,
          };
        case "upfieldCraigieburnCityLoop":
          return { ...prev, northernLoop: !prev.northernLoop };
        default:
          return prev;
      }
    });
  }, [onTransportModesChange, transportModes]);

  const isSurfaceRouteFilterActive = useCallback(
    (filter: SurfaceRouteFilter) =>
      transportModes.includes(filter.mode) && activeSurfaceRouteFilters.includes(filter.key),
    [activeSurfaceRouteFilters, transportModes],
  );

  const toggleSurfaceRouteFilter = useCallback(
    (filter: SurfaceRouteFilter) => {
      if (!transportModes.includes(filter.mode)) {
        onTransportModesChange?.([...transportModes, filter.mode]);
      }

      setActiveSurfaceRouteFilters((prev) =>
        prev.includes(filter.key) ? prev.filter((key) => key !== filter.key) : [...prev, filter.key],
      );
    },
    [onTransportModesChange, transportModes],
  );

  const isSurfaceRouteVisible = useCallback(
    (mode: Extract<TransportMode, "tram" | "bus">, routeLabel: string) => {
      const matchingFilter = SURFACE_ROUTE_FILTERS.find(
        (filter) => filter.mode === mode && filter.route === routeLabel,
      );

      if (!matchingFilter) {
        const modeFilterKeys = SURFACE_ROUTE_FILTERS.filter((filter) => filter.mode === mode).map((filter) => filter.key);
        return modeFilterKeys.every((key) => activeSurfaceRouteFilters.includes(key));
      }

      return activeSurfaceRouteFilters.includes(matchingFilter.key);
    },
    [activeSurfaceRouteFilters],
  );

  const visibleLiveBuses = useMemo(
    () => {
      const filtered = liveBuses.filter(
        (bus) =>
          isSurfaceRouteVisible("bus", bus.route) &&
          visibleViewportBounds.contains(L.latLng(bus.lat, bus.lng)),
      );

      if (!isMobile) {
        return filtered;
      }

      const cap = mapZoom >= 14 ? 90 : mapZoom >= 13.25 ? 50 : 0;
      return sortVehiclesByViewportDistance(filtered, visibleViewportBounds).slice(0, cap);
    },
    [isMobile, isSurfaceRouteVisible, liveBuses, mapZoom, visibleViewportBounds],
  );
  const visibleLiveTrams = useMemo(
    () => {
      const filtered = liveTrams.filter(
        (tram) =>
          isSurfaceRouteVisible("tram", tram.route) &&
          visibleViewportBounds.contains(L.latLng(tram.lat, tram.lng)),
      );

      if (!isMobile) {
        return filtered;
      }

      const cap = mapZoom >= 14 ? 110 : mapZoom >= 13.25 ? 60 : 0;
      return sortVehiclesByViewportDistance(filtered, visibleViewportBounds).slice(0, cap);
    },
    [isMobile, isSurfaceRouteVisible, liveTrams, mapZoom, visibleViewportBounds],
  );
  const selectedSurfaceStopLiveBuses = useMemo(() => {
    if (!selectedSurfaceStop || !selectedSurfaceStop.modes.includes("bus")) {
      return [];
    }

    return visibleLiveBuses
      .map((bus) => ({
        bus,
        distanceMetres: getDistanceInMetres(selectedSurfaceStop.position, [bus.lat, bus.lng]),
      }))
      .filter(({ bus, distanceMetres }) => bus.route === selectedSurfaceStop.routeLabel && distanceMetres <= 3000)
      .sort((left, right) => left.distanceMetres - right.distanceMetres)
      .slice(0, 4);
  }, [selectedSurfaceStop, visibleLiveBuses]);
  const selectedSurfaceBusRouteStops = useMemo(() => {
    if (!selectedSurfaceStop || !selectedSurfaceStop.modes.includes("bus")) {
      return [];
    }

    return getOrderedSurfaceRouteStops(selectedSurfaceStop);
  }, [selectedSurfaceStop]);
  const selectedSurfaceBusLeadVehicle = useMemo(() => {
    if (selectedSurfaceStopLiveBuses.length === 0) {
      return null;
    }

    return (
      selectedSurfaceStopLiveBuses.find(({ bus }) => {
        const destination = bus.destination?.trim().toLowerCase();
        return destination && destination === getPrimarySurfaceDestination(selectedSurfaceStop!).trim().toLowerCase();
      }) ?? selectedSurfaceStopLiveBuses[0]
    );
  }, [selectedSurfaceStop, selectedSurfaceStopLiveBuses]);
  const selectedSurfaceBusCurrentStopIndex = useMemo(() => {
    if (selectedSurfaceBusRouteStops.length === 0) {
      return -1;
    }

    if (selectedSurfaceBusLeadVehicle) {
      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      selectedSurfaceBusRouteStops.forEach((stop, index) => {
        const distance = getDistanceInMetres(stop.position, [
          selectedSurfaceBusLeadVehicle.bus.lat,
          selectedSurfaceBusLeadVehicle.bus.lng,
        ]);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });

      return bestIndex;
    }

    return selectedSurfaceBusRouteStops.findIndex((stop) => stop.id === selectedSurfaceStop?.id);
  }, [selectedSurfaceBusLeadVehicle, selectedSurfaceBusRouteStops, selectedSurfaceStop]);
  const selectedSurfaceBusTrackingStops = useMemo(() => {
    if (selectedSurfaceBusRouteStops.length === 0) {
      return [];
    }

    const currentIndex =
      selectedSurfaceBusCurrentStopIndex >= 0
        ? selectedSurfaceBusCurrentStopIndex
        : Math.max(
            0,
            selectedSurfaceBusRouteStops.findIndex((stop) => stop.id === selectedSurfaceStop?.id),
          );

    return selectedSurfaceBusRouteStops.slice(currentIndex, currentIndex + 6);
  }, [selectedSurfaceBusCurrentStopIndex, selectedSurfaceBusRouteStops, selectedSurfaceStop]);
  const selectedSurfaceStopLiveTrams = useMemo(() => {
    if (!selectedSurfaceStop || !selectedSurfaceStop.modes.includes("tram")) {
      return [];
    }

    return visibleLiveTrams
      .map((tram) => ({
        tram,
        distanceMetres: getDistanceInMetres(selectedSurfaceStop.position, [tram.lat, tram.lng]),
      }))
      .filter(({ tram, distanceMetres }) => tram.route === selectedSurfaceStop.routeLabel && distanceMetres <= 3000)
      .sort((left, right) => left.distanceMetres - right.distanceMetres)
      .slice(0, 4);
  }, [selectedSurfaceStop, visibleLiveTrams]);

  const isServiceFilterActive = useCallback((filter: ServiceFilterKey) => {
    switch (filter) {
      case "geelongRegionalGroup":
        return transportModes.includes("vline") && layers.geelongRegional;
      case "ballaratRegionalGroup":
        return transportModes.includes("vline") && layers.ballaratRegional;
      case "bendigoRegionalGroup":
        return transportModes.includes("vline") && layers.bendigoRegional;
      case "seymourRegionalGroup":
        return transportModes.includes("vline") && layers.seymourRegional;
      case "traralgonRegionalGroup":
        return transportModes.includes("vline") && layers.traralgonRegional;
      case "metroTunnelServices":
        return layers.metroTunnel || layers.sunburyLine || layers.cranbourneLine || layers.pakenhamLine;
      case "crossCityPink":
        return layers.werribeeLine || layers.sandringhamLine;
      case "werribeeWilliamstownGroup":
        return layers.werribeeLine;
      case "sandringhamGroup":
        return layers.sandringhamLine;
      case "burnleyGroup":
        return layers.belgraveLine || layers.lilydaleLine || layers.glenWaverleyLine || layers.alameinLine || layers.burnleyLoop;
      case "cliftonHillGroup":
        return layers.merndaLine || layers.hurstbridgeLine || layers.cliftonHillLoop;
      case "caulfieldGroup":
      case "frankstonGroup":
        return layers.frankstonLine;
      case "upfieldCraigieburn":
        return layers.upfieldLine || layers.craigieburnLine;
      case "upfieldCraigieburnCityLoop":
        return layers.northernLoop;
      default:
        return false;
    }
  }, [layers, transportModes]);

  const visibleReports = reports.filter((report) => {
    if (report.reportType === "inspector" && !layers.inspectors) return false;
    if (report.reportType === "delay" && !layers.delays) return false;
    if (report.reportType === "incident" && !layers.incidents) return false;
    if (report.transportType === "train" && !transportModes.includes("train")) return false;
    if (report.transportType === "tram" && !transportModes.includes("tram")) return false;
    if (report.transportType === "bus" && !transportModes.includes("bus")) return false;
    return true;
  });

  const inspectorReports = reports.filter(
    (report) => report.reportType === "inspector" && report.lat && report.lng
  );

  const liveTrainsErrorMessage =
    liveTrainsError instanceof Error ? liveTrainsError.message : null;
  const hasLiveTrainFeedError = Boolean(liveTrainsErrorMessage);
  const liveTrainStatusTone = hasLiveTrainFeedError
    ? "text-amber-200 border-amber-400/30 bg-amber-500/12"
    : liveVehicles.length > 0
      ? "text-emerald-200 border-emerald-400/30 bg-emerald-500/12"
      : "text-white/75 border-white/10 bg-slate-950/70";
  const liveTrainStatusLabel = hasLiveTrainFeedError
    ? "Live tracker needs attention"
    : mobilePerformanceEnabled && !allowMobileHeavyTrainTracking
      ? "Zoom in to load live trains"
    : isLiveTrainsLoading
      ? "Loading live trains"
      : liveVehicles.length > 0
        ? `${liveVehicles.length} live train${liveVehicles.length === 1 ? "" : "s"} on map`
        : "No active trains returned right now";
  const liveTrainStatusDetail = hasLiveTrainFeedError
    ? liveTrainsErrorMessage
    : mobilePerformanceEnabled && !allowMobileHeavyTrainTracking
      ? "Mobile mode delays train tracking until you zoom in a little further, which helps keep iPhone stable."
    : "Tap a train marker or use the planner live list to jump straight into trip tracking.";
  const visibleServiceFilters = SERVICE_FILTERS.filter((filter) => {
    if (filter.key === "crossCityPink") {
      return !splitCrossCityGroup;
    }
    if (filter.key === "werribeeWilliamstownGroup" || filter.key === "sandringhamGroup") {
      return splitCrossCityGroup;
    }
    if (filter.key === "upfieldCraigieburnCityLoop") {
      return false;
    }
    if (filter.key === "frankstonGroup") {
      return false;
    }
    return true;
  });
  const visibleTramRouteFilters = SURFACE_ROUTE_FILTERS.filter((filter) => filter.mode === "tram");
  const visibleBusRouteFilters = SURFACE_ROUTE_FILTERS.filter((filter) => filter.mode === "bus");
  const modeIsTrainVisible = transportModes.includes("train");
  const modeIsBusVisible = transportModes.includes("bus");
  const modeIsTramVisible = transportModes.includes("tram");
  const modeIsVlineVisible = transportModes.includes("vline");
  const markerOverrideMap = useMemo(
    () =>
      Object.fromEntries(
        [...markerOverrides, ...Object.values(draftMarkerOverrides)].map((override) => [override.markerName, override]),
      ),
    [draftMarkerOverrides, markerOverrides],
  );
  const resolveStation = useCallback(
    (station: Station): Station => {
      if (station.name === "Flagstaff") {
        return { ...station, position: FLAGSTAFF_POSITION };
      }
      if (station.name === "Melbourne Central") {
        return { ...station, position: MELBOURNE_CENTRAL_POSITION };
      }
      const override = markerOverrideMap[station.name];
      if (!override) return station;
      if (!isMarkerEditMode && getDistanceInKm(station.position, [override.lat, override.lng]) > 0.75) {
        return station;
      }
      return { ...station, position: [override.lat, override.lng] };
    },
    [isMarkerEditMode, markerOverrideMap],
  );
  const editableStations = useMemo(() => {
    const seen = new Set<string>();
    return ALL_STATIONS.filter((station) => {
      if (seen.has(station.name)) return false;
      seen.add(station.name);
      return true;
    }).map(resolveStation);
  }, [resolveStation]);

  const toggleTransportMode = (mode: TransportMode) => {
    const nextModes = transportModes.includes(mode)
      ? transportModes.filter((item) => item !== mode)
      : [...transportModes, mode];
    onTransportModesChange?.(nextModes.length > 0 ? nextModes : [...DEFAULT_TRANSPORT_MODES]);
  };

  const saveEditedMarkers = async () => {
    const overrides = Object.values(draftMarkerOverrides);
    if (overrides.length === 0) {
      setIsMarkerEditMode(false);
      return;
    }
    await saveMarkerOverrides(overrides);
    setDraftMarkerOverrides({});
    await refetchMarkerOverrides();
    setIsMarkerEditMode(false);
  };

  const cancelEditedMarkers = () => {
    setDraftMarkerOverrides({});
    setIsMarkerEditMode(false);
  };

  const resetSavedMarkers = async () => {
    await saveMarkerOverrides([]);
    setDraftMarkerOverrides({});
    await refetchMarkerOverrides();
    setSelectedDetail(null);
    setIsMarkerEditMode(false);
  };

  return (
    <div className="absolute inset-0 z-0">
      <style>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        .leaflet-popup-content-wrapper {
          background: rgba(15,23,42,0.97) !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          border-radius: 16px !important;
          color: white !important;
          box-shadow: 0 20px 60px rgba(0,0,0,0.8) !important;
          padding: 0 !important;
        }

        .leaflet-popup-content {
          margin: 0 !important;
        }

        .leaflet-popup-tip {
          background: rgba(15,23,42,0.97) !important;
        }

        .leaflet-container {
          background: #0f172a;
        }

        .leaflet-control-zoom,
        .leaflet-control-attribution {
          display: none;
        }
      `}</style>

      <MapContainer
        center={MELBOURNE_CENTER}
        zoom={13}
        zoomControl={false}
        preferCanvas={mobilePerformanceEnabled}
        zoomAnimation={!mobilePerformanceEnabled}
        fadeAnimation={!mobilePerformanceEnabled}
        markerZoomAnimation={!mobilePerformanceEnabled}
        dragging={!isMarkerEditMode}
        doubleClickZoom={!isMarkerEditMode}
        touchZoom={!isMarkerEditMode}
        scrollWheelZoom={!isMarkerEditMode}
        boxZoom={!isMarkerEditMode}
        keyboard={!isMarkerEditMode}
        className="w-full h-full"
        style={{ background: "#0f172a" }}
        ref={(mapInstance) => {
          if (mapInstance) mapRef.current = mapInstance;
        }}
      >
        <ViewportListener
          onViewportChange={(zoom, bounds) => {
            setMapZoom(zoom);
            setMapBounds(bounds);
          }}
        />
        <Pane name="stationPane" style={{ zIndex: 950 }} />
        {consistData?.active && consistData.currentTrip?.estimatedPos && (
          <Marker
            position={consistData.currentTrip.estimatedPos as [number, number]}
            icon={L.divIcon({
              html: `
                <div style="position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center;">
                  <div style="position:absolute;inset:0;border-radius:50%;background:#3b82f6;opacity:0.2;animation:ping 2s infinite;"></div>
                  <div style="width:38px;height:38px;border-radius:12px;background:#1e293b;border:2px solid #3b82f6;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.5);position:relative;">
                    <span style="font-size:18px;">🚂</span>
                    <div style="position:absolute;top:-8px;right:-8px;background:#3b82f6;color:white;font-size:9px;font-weight:bold;padding:2px 4px;border-radius:4px;border:1px solid rgba(255,255,255,0.2);">430M</div>
                  </div>
                </div>
              `,
              className: "bg-transparent border-none",
              iconSize: [48, 48],
              iconAnchor: [24, 24],
            })}
          >
            <Popup>
              <div className="p-3 w-64">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                  <span className="text-xl">🚂</span>
                  <div>
                    <p className="font-bold text-white text-sm">Consist 430M</p>
                    <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">
                      Live Tracking
                    </p>
                  </div>
                  <div className="ml-auto bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    ACTIVE
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">
                      Current Trip
                    </p>
                    <p className="text-sm text-white/90 font-medium">
                      {consistData.currentTrip.route}
                    </p>
                    <p className="text-xs text-white/60">
                      to {consistData.currentTrip.destination}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">
                      Progress
                    </p>
                    <p className="text-xs text-blue-400 font-bold">
                      {Math.round(consistData.currentTrip.progress * 100)}%
                    </p>
                  </div>

                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full transition-all duration-1000"
                      style={{ width: `${consistData.currentTrip.progress * 100}%` }}
                    />
                  </div>

                  {consistData.alerts.length > 0 && (
                    <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-[10px] text-yellow-500 font-bold flex items-center gap-1 uppercase tracking-wider">
                        <AlertTriangle className="w-3 h-3" />
                        Alert
                      </p>
                      <p className="text-[11px] text-yellow-200/80 leading-tight mt-1">
                        {consistData.alerts[0]}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='© <a href="https://carto.com">CARTO</a> © <a href="https://openstreetmap.org">OSM</a>'
          maxZoom={19}
        />

{modeIsTrainVisible && layers.frankstonLine && (
  <>
  <Polyline
      positions={CAUFIELD_LOOP}
      pathOptions={{ color: "#22c55e", weight: 5, opacity: 0.9 }}
 />
    <Polyline
      positions={FRANKSTON_TRACK}
      pathOptions={{ color: "#22c55e", weight: 5, opacity: 0.9 }}
    />
    {renderStationMarkers(renderedStationKeys, FRANKSTON_STATIONS, "#22c55e", "#16a34a", resolveStation, (station) => setSelectedDetail({ type: "station", station }), toggleStationPillLine)}
  </>
)}
{modeIsTrainVisible && layers.merndaLine && (
  <>
    <Polyline
      positions={MERNDA_BRANCH_LINE}
      pathOptions={{ color: "#BE1014", weight: 5, opacity: 0.85 }}
    />
    {renderStationMarkers(renderedStationKeys, MERNDA_STATIONS, "#BE1014", "#BE1014", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
  </>
)}

{modeIsTrainVisible && layers.hurstbridgeLine && (
  <>
    <Polyline
      positions={HURSTBRIDGE_BRANCH_LINE}
      pathOptions={{ color: "#BE1014", weight: 5, opacity: 0.85 }}
    />
    {renderStationMarkers(renderedStationKeys, HURSTBRIDGE_STATIONS, "#BE1014", "#BE1014", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
  </>
)}

{modeIsTrainVisible && layers.cliftonHillLoop && (
  <>
  <Polyline
  positions={JOLIMONT_TO_WEST_RICHMOND}
  pathOptions={{
    color: "#BE1014",
    weight: 5,
    opacity: 0.95,
  }}
/>
    <Polyline
      positions={CLIFTONHILL_LOOP}
      pathOptions={{ color: "#BE1014", weight: 5, opacity: 0.85 }}
    />
    {renderStationMarkers(renderedStationKeys, CLIFTONHILLGROUPLOOP_STATIONS, "#BE1014", "#BE1014", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
  </>
)}
{modeIsTrainVisible && (layers.sunburyLine || layers.craigieburnLine || layers.upfieldLine || layers.northernLoop) && (
  <>
    {layers.craigieburnLine ? (
      <>
        <Polyline
          positions={offsetPolylineCoordinates(NORTHERN_LOOP, "left", 0.42)}
          pathOptions={{ color: "#FFD200", weight: 4.5, opacity: 0.88 }}
        />
        <Polyline
          positions={offsetPolylineCoordinates(NORTHERN_LOOP, "right", 0.42)}
          pathOptions={{ color: "#7c3aed", weight: 4.5, opacity: 0.84 }}
        />
      </>
    ) : (
      <Polyline
        positions={NORTHERN_LOOP}
        pathOptions={{ color: "#FFD200", weight: 5, opacity: 0.85 }}
      />
    )}
    {renderStationMarkers(renderedStationKeys, NORTHERNGROUPLOOP_STATIONS, "#FFD200", "#cca700", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
  </>
)}

{modeIsTrainVisible && (layers.lilydaleLine || layers.belgraveLine || layers.alameinLine || layers.glenWaverleyLine || layers.burnleyLoop) && (
  <>
    <Polyline
      positions={offsetPolylineCoordinates(BURNLEY_LOOP, "left", 0.45)}
  pathOptions={{ color: "#003A8F", weight: 3, opacity: 0.6 }}
    />
    {renderStationMarkers(renderedStationKeys, BURNLEYGROUPLOOP_STATIONS, "#003A8F", "#003A8F", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
  </>
)}
{modeIsTrainVisible && layers.lilydaleLine && (
  <>
    <Polyline
      positions={LILYDALE_LINE}
      pathOptions={{
        color: "#003A8F",
        weight: 5,
        opacity: 0.85,
      }}
    />
    {renderStationMarkers(renderedStationKeys, LILYDALE_STATIONS, "#003A8F", "#003A8F", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
  </>
)}

{modeIsTrainVisible && layers.belgraveLine && (
  <>
    <Polyline
      positions={BELGRAVE_LINE}
      pathOptions={{
        color: "#003A8F",
        weight: 5,
        opacity: 0.85,
      }}
    />
    {renderStationMarkers(renderedStationKeys, BELGRAVE_STATIONS, "#003A8F", "#003A8F", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
  </>
)}

{modeIsTrainVisible && layers.alameinLine && (
  <>
    <Polyline
      positions={ALAMEIN_LINE}
      pathOptions={{
        color: "#003A8F",
        weight: 5,
        opacity: 0.85,
      }}
    />
    {renderStationMarkers(renderedStationKeys, ALAMEIN_STATIONS, "#003A8F", "#003A8F", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
  </>
)}

{modeIsTrainVisible && layers.glenWaverleyLine && (
  <>
    <Polyline
      positions={GLEN_WAVERLEY_LINE}
      pathOptions={{
        color: "#003A8F",
        weight: 5,
        opacity: 0.85,
      }}
    />
    {renderStationMarkers(renderedStationKeys, GLEN_WAVERLEY_STATIONS, "#003A8F", "#003A8F", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
  </>
)}
{modeIsTrainVisible && layers.craigieburnLine && (
  <>
    <Polyline
      positions={offsetPolylineCoordinates(CRAIGIEBURN_LINE, "left", 0.45)}
      pathOptions={{
        color: "#FFD200",
        weight: 4.75,
        opacity: 0.88,
      }}
    />
    <Polyline
      positions={offsetPolylineCoordinates(CRAIGIEBURN_LINE, "right", 0.45)}
      pathOptions={{
        color: "#7c3aed",
        weight: 4.75,
        opacity: 0.84,
      }}
    />
    {renderStationMarkers(renderedStationKeys, CRAIGIEBURN_STATIONS, "#FFD200", "#cca700", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
  </>
)}

{modeIsTrainVisible && layers.upfieldLine && (
  <>
    <Polyline
      positions={UPFIELD_LINE}
      pathOptions={{
        color: "#FFD200",
        weight: 5,
        opacity: 0.85,
      }}
    />
    {renderStationMarkers(renderedStationKeys, UPFIELD_STATIONS, "#FFD200", "#cca700", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
  </>
)}
        {modeIsTrainVisible && layers.cranbourneLine && (
          <>
            <Polyline
              positions={offsetPolylineCoordinates(CRANBOURNE_LINE, "left", 0.6)}
              pathOptions={{ color: "#279FD5", weight: 5, opacity: 0.85 }}
            />
            <Polyline
              positions={offsetPolylineCoordinates(
                CRANBOURNE_LINE,
                "right",
                0.6
              )}
              pathOptions={{ color: "#279FD5", weight: 5, opacity: 0.85 }}
            />
            {renderStationMarkers(renderedStationKeys, CRANBOURNE_STATIONS, "#279FD5", "#1e7ba8", resolveStation, (station) => setSelectedDetail({ type: "station", station }), toggleStationPillLine)}
          </>
        )}

        {modeIsTrainVisible && layers.pakenhamLine && (
          <>
            <Polyline
              positions={offsetPolylineCoordinates(PAKENHAM_PRE_HAWKSBURN_LINE, "left", 0.6)}
              pathOptions={{ color: "#279FD5", weight: 5, opacity: 0.85 }}
            />
            <Polyline
              positions={offsetPolylineCoordinates(PAKENHAM_PRE_HAWKSBURN_LINE, "right", 0.6)}
              pathOptions={{ color: "#279FD5", weight: 5, opacity: 0.85 }}
            />
            <Polyline
              positions={PAKENHAM_HAWKSBURN_TO_CARNEGIE_LINE}
              pathOptions={{ color: "#279FD5", weight: 5, opacity: 0.85 }}
            />
            <Polyline
              positions={offsetPolylineCoordinates(PAKENHAM_POST_CARNEGIE_LINE, "left", 0.38)}
              pathOptions={{ color: "#279FD5", weight: 5, opacity: 0.85 }}
            />
            {renderStationMarkers(renderedStationKeys, PAKENHAM_STATIONS, "#279FD5", "#1e7ba8", resolveStation, (station) => setSelectedDetail({ type: "station", station }), toggleStationPillLine)}
          </>
        )}

        {modeIsTrainVisible && layers.sunburyLine && (
          <>
            <Polyline
              positions={offsetPolylineCoordinates(SUNBURY_LINE, "left", 0.6)}
              pathOptions={{ color: "#279FD5", weight: 5, opacity: 0.85 }}
            />
            <Polyline
              positions={offsetPolylineCoordinates(SUNBURY_LINE, "right", 0.6)}
              pathOptions={{ color: "#279FD5", weight: 5, opacity: 0.85 }}
            />
            {renderStationMarkers(renderedStationKeys, SUNBURY_STATIONS, "#279FD5", "#1e7ba8", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
          </>
        )}

        {modeIsTrainVisible && layers.metroTunnel && (
          <>
            <Polyline
              positions={offsetPolylineCoordinates(METRO_TUNNEL_LINE, "left", 0.6)}
              pathOptions={{ color: "#279FD5", weight: 5, opacity: 0.85 }}
            />
            <Polyline
              positions={offsetPolylineCoordinates(METRO_TUNNEL_LINE, "right", 0.6)}
              pathOptions={{ color: "#279FD5", weight: 5, opacity: 0.85 }}
            />
            {renderStationMarkers(renderedStationKeys, METRO_TUNNEL_STATIONS, "#279FD5", "#1e7ba8", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
          </>
        )}
{modeIsTrainVisible && layers.werribeeLine && (
  <>
    {/* Werribee main line */}
    <Polyline
      positions={offsetPolylineCoordinates(WERRIBEE_LINE, "left", 0.5)}
      pathOptions={{
        color: "#F178AF",
        weight: 5,
        opacity: 0.85,
      }}
    />


    {/* Williamstown branch */}
    <Polyline
      positions={offsetPolylineCoordinates(WILLIAMSTOWN_LINE, "left", 0.35)}
      pathOptions={{
        color: "#F178AF",
        weight: 5,
        opacity: 0.85,
      }}
    />
    <Polyline
      positions={offsetPolylineCoordinates(WILLIAMSTOWN_LINE, "right", 0.35)}
      pathOptions={{
        color: "#F178AF",
        weight: 5,
        opacity: 0.85,
      }}
    />

    {/* Altona loop branch */}
    <Polyline
      positions={offsetPolylineCoordinates(ALTONA_LOOP_LINE, "left", 0.35)}
      pathOptions={{
        color: "#F178AF",
        weight: 5,
        opacity: 0.85,
      }}
    />
    <Polyline
      positions={offsetPolylineCoordinates(ALTONA_LOOP_LINE, "right", 0.35)}
      pathOptions={{
        color: "#F178AF",
        weight: 5,
        opacity: 0.85,
      }}
    />

    {renderStationMarkers(renderedStationKeys, WERRIBEE_STATIONS, "#F178AF", "#9f5d7c", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
    {renderStationMarkers(renderedStationKeys, WILLIAMSTOWN_STATIONS, "#F178AF", "#9f5d7c", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
    {renderStationMarkers(renderedStationKeys, ALTONA_LOOP_STATIONS, "#F178AF", "#9f5d7c", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
  </>
)}
        {modeIsTrainVisible && layers.sandringhamLine && (
          <>
            <Polyline
              positions={offsetPolylineCoordinates(
                SANDRINGHAM_LINE,
                "right",
                0.5
              )}
              pathOptions={{ color: "#F178AF", weight: 5, opacity: 0.85 }}
            />
            {renderStationMarkers(renderedStationKeys, RENDERED_SANDRINGHAM_STATIONS, "#F178AF", "#9f5d7c", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
          </>
        )}

        {modeIsVlineVisible && (
          <>
            {(layers.geelongRegional || layers.ballaratRegional || layers.bendigoRegional) && (
              <>
                <Polyline
                  positions={BALLARAT_SHARED_VLINE_TRUNK}
                  pathOptions={{ color: "#7c3aed", weight: 5, opacity: 0.92 }}
                />
                <Polyline
                  positions={SUNSHINE_VLINE_EXPRESS_OVERLAY}
                  pathOptions={{ color: "#7c3aed", weight: 5, opacity: 0.96 }}
                />
                <Polyline
                  positions={SUNSHINE_VLINE_STOPPING_OVERLAY}
                  pathOptions={{ color: "#7c3aed", weight: 4, opacity: 0.9 }}
                />
              </>
            )}
            {layers.ballaratRegional && (
              <>
                <Polyline
                  positions={BALLARAT_LINE}
                  pathOptions={{ color: "#7c3aed", weight: 5, opacity: 0.92 }}
                />
                <Polyline
                  positions={ARARAT_BRANCH_LINE}
                  pathOptions={{ color: "#7c3aed", weight: 4, opacity: 0.82, dashArray: "9 7" }}
                />
                <Polyline
                  positions={MARYBOROUGH_BRANCH_LINE}
                  pathOptions={{ color: "#7c3aed", weight: 4, opacity: 0.82, dashArray: "9 7" }}
                />
              </>
            )}
            {layers.geelongRegional && (
              <Polyline
                positions={GEELONG_LINE}
                pathOptions={{ color: "#7c3aed", weight: 5, opacity: 0.92 }}
              />
            )}
            {layers.seymourRegional && (
              <>
                <Polyline
                  positions={
                    layers.craigieburnLine
                      ? offsetPolylineCoordinates(SEYMOUR_REGIONAL_LINE, "right", 0.45)
                      : SEYMOUR_REGIONAL_LINE
                  }
                  pathOptions={{ color: "#7c3aed", weight: 4.75, opacity: 0.92 }}
                />
                {renderStationMarkers(
                  renderedStationKeys,
                  SEYMOUR_REGIONAL_STATIONS,
                  "#7c3aed",
                  "#5b21b6",
                  resolveStation,
                  (station) => setSelectedDetail({ type: "station", station }),
                  toggleStationPillLine,
                )}
              </>
            )}
            {layers.traralgonRegional && (
              <>
                <Polyline
                  positions={GIPPSLAND_PRE_CARNEGIE_LINE}
                  pathOptions={{ color: "#7c3aed", weight: 5, opacity: 0.92 }}
                />
                <Polyline
                  positions={offsetPolylineCoordinates(GIPPSLAND_POST_CARNEGIE_LINE, "right", 0.38)}
                  pathOptions={{ color: "#7c3aed", weight: 5, opacity: 0.92 }}
                />
                {renderStationMarkers(
                  renderedStationKeys,
                  GIPPSLAND_STATIONS,
                  "#7c3aed",
                  "#5b21b6",
                  resolveStation,
                  (station) => setSelectedDetail({ type: "station", station }),
                  toggleStationPillLine,
                )}
              </>
            )}
            <Polyline
              positions={XPT_INTERSTATE_LINE}
              pathOptions={{ color: "#d9480f", weight: 4, opacity: 0.9, dashArray: "10 7" }}
            />
            {renderRouteStopMarkers(
              XPT_INTERSTATE_STOPS,
              "#d9480f",
              "#d9480f",
              "NSW TrainLink XPT standard-gauge interstate route",
              visibleViewportBounds,
            )}
          </>
        )}

        {(modeIsTrainVisible || modeIsVlineVisible) && (
          <>
            <Polyline
              positions={FREIGHT_PORT_TERMINAL_LINE}
              pathOptions={{ color: FREIGHT_BROWN, weight: 4, opacity: 0.9 }}
            />
            <Polyline
              positions={FREIGHT_WESTERN_CORRIDOR_LINE}
              pathOptions={{ color: FREIGHT_BROWN, weight: 4, opacity: 0.82 }}
            />
            <Polyline
              positions={FREIGHT_NORTH_CORRIDOR_LINE}
              pathOptions={{ color: FREIGHT_BROWN, weight: 4, opacity: 0.82 }}
            />
            {renderFreightLocationMarkers(FREIGHT_LOCATIONS, visibleViewportBounds)}
          </>
        )}

        {journeyRoute && journeyRoute.length > 1 && (
          <>
            <Polyline
              positions={journeyRoute.map((station) => station.position)}
              pathOptions={{
                color: "#facc15",
                weight: 6,
                opacity: 0.95,
                dashArray: "8 6",
              }}
            />

            {[journeyRoute[0], journeyRoute[journeyRoute.length - 1]].map(
              (station, index) => (
                <CircleMarker
                  key={`journey-${station.name}-${index}`}
                  center={station.position}
                  radius={8}
                  pathOptions={{
                    color: "#f59e0b",
                    fillColor: index === 0 ? "#fb923c" : "#facc15",
                    fillOpacity: 1,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="p-3 w-48">
                      <p className="font-semibold text-white">
                        {index === 0 ? "Origin" : "Destination"}
                      </p>
                      <p className="text-xs text-white/60 mt-1">{station.name}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              )
            )}
          </>
        )}

        {layers.heatCircles &&
          inspectorReports.map((report) => (
            <Circle
              key={`heat-${report.id}`}
              center={[report.lat!, report.lng!]}
              radius={600}
              pathOptions={{
                color: "transparent",
                fillColor: "#e11d48",
                fillOpacity: 0.12,
              }}
            />
          ))}

        {userLoc && (
          <Circle
            center={userLoc}
            radius={80}
            pathOptions={{
              color: "#60a5fa",
              fillColor: "#3b82f6",
              fillOpacity: 0.7,
              weight: 2,
            }}
          />
        )}

        {userLoc && <LocationCenterer loc={userLoc} />}
        {!isGuest && modeIsTrainVisible && (
          <Marker
            position={featuredConsistPosition}
            icon={createFeaturedConsistIcon(featuredConsistIsLive)}
            zIndexOffset={2800}
            riseOnHover
          >
            <Popup>
              <div className="w-64 p-3">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
                  <div>
                    <p className="text-sm font-bold text-white">Consist {FEATURED_CONSIST}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/80">
                      Starred map marker
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${featuredConsistIsLive ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700/70 text-slate-200"}`}>
                    {featuredConsistIsLive ? "Live" : "Approx"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-white/85">
                  {featuredConsistSnapshot?.current_trip
                    ? `${featuredConsistSnapshot.current_trip.origin} to ${featuredConsistSnapshot.current_trip.destination}`
                    : featuredConsistSnapshot?.next_trip
                      ? `Next run: ${featuredConsistSnapshot.next_trip.origin} to ${featuredConsistSnapshot.next_trip.destination}`
                      : "No active trip right now, so this is a rough placeholder on the map."}
                </p>
                <p className="mt-2 text-xs text-white/55">
                  {featuredConsistSnapshot?.position?.vehicle_stop_status === "STOPPED_AT"
                    ? `Last known stop: ${featuredConsistSnapshot.position.current_stop}`
                    : featuredConsistSnapshot?.position?.current_stop
                      ? `Approx near ${featuredConsistSnapshot.position.current_stop}`
                      : "Pinned near the city until a better estimate is available."}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
        {modeIsTrainVisible &&
          metroLiveVehicles.map((vehicle) => {
            const vehicleKey = getVehicleFocusKey(vehicle);
            const isSelected = selectedVehicleKey === vehicleKey;
            const isHovered = hoveredVehicleKey === vehicleKey;
            const priority = getTrainLabelPriority(vehicle);
            const isZoomedOut = mapZoom <= 13;
            const hideSecondaryLabel = isZoomedOut && priority !== "high" && !isSelected && !isHovered;

            return (
              <Marker
                key={`${vehicle.consist}-${vehicle.tdn}`}
                position={[vehicle.lat, vehicle.lng]}
                icon={createLiveTrainIcon(vehicle, {
                  expanded: isSelected || isHovered,
                  selected: isSelected,
                  dimmed: isZoomedOut && priority !== "high" && !isSelected && !isHovered,
                  hideSecondaryLabel,
                })}
                zIndexOffset={isSelected ? 4600 : isHovered ? 4200 : hideSecondaryLabel ? 3600 : 3900}
                riseOnHover
                eventHandlers={{
                  mouseover: () => setHoveredVehicleKey(vehicleKey),
                  mouseout: () => setHoveredVehicleKey((current) => (current === vehicleKey ? null : current)),
                  mousedown: () => setSelectedDetail({ type: "vehicle", vehicle }),
                  touchstart: () => setSelectedDetail({ type: "vehicle", vehicle }),
                  click: () => setSelectedDetail({ type: "vehicle", vehicle }),
                  popupopen: () => setSelectedDetail({ type: "vehicle", vehicle }),
                }}
              />
            );
          })}
        {modeIsVlineVisible &&
          vlineLiveVehicles.map((vehicle) => {
            const vehicleKey = getVehicleFocusKey(vehicle);
            const isSelected = selectedVehicleKey === vehicleKey;
            const isHovered = hoveredVehicleKey === vehicleKey;
            const isZoomedOut = mapZoom <= 13;

            return (
              <Marker
                key={`${vehicle.consist}-${vehicle.tdn}`}
                position={[vehicle.lat, vehicle.lng]}
                icon={createLiveTrainIcon(vehicle, {
                  expanded: isSelected || isHovered || mapZoom >= 14.5,
                  selected: isSelected,
                  dimmed: false,
                  hideSecondaryLabel: isZoomedOut && !isSelected && !isHovered,
                })}
                zIndexOffset={isSelected ? 4700 : isHovered ? 4300 : 4000}
                riseOnHover
                eventHandlers={{
                  mouseover: () => setHoveredVehicleKey(vehicleKey),
                  mouseout: () => setHoveredVehicleKey((current) => (current === vehicleKey ? null : current)),
                  mousedown: () => setSelectedDetail({ type: "vehicle", vehicle }),
                  touchstart: () => setSelectedDetail({ type: "vehicle", vehicle }),
                  click: () => setSelectedDetail({ type: "vehicle", vehicle }),
                  popupopen: () => setSelectedDetail({ type: "vehicle", vehicle }),
                }}
              />
            );
          })}
        {modeIsBusVisible &&
          visibleLiveBuses.map((bus) => (
            <Marker
              key={bus.id}
              position={[bus.lat, bus.lng]}
              icon={createLiveBusIcon(bus)}
              zIndexOffset={1000}
              riseOnHover
            >
              <Popup>
                <div className="w-56 p-3">
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
                    <div>
                      <p className="text-sm font-bold text-white">
                        {bus.route === "Bus" ? "Live bus" : `Route ${bus.route}`}
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-300/80">
                        {bus.operator ?? "PTV Bus"}
                      </p>
                    </div>
                    <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold text-orange-200">
                      Live
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/85">{bus.destination ?? "Live vehicle position"}</p>
                  <p className="mt-2 text-xs text-white/55">
                    {bus.timestamp
                      ? `Last reported ${formatDistanceToNow(new Date(bus.timestamp), { addSuffix: true })}`
                      : "Live feed timestamp unavailable"}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        {modeIsTramVisible &&
          visibleLiveTrams.map((tram) => (
            <Marker
              key={tram.id}
              position={[tram.lat, tram.lng]}
              icon={createLiveTramIcon(tram)}
              zIndexOffset={1100}
              riseOnHover
            >
              <Popup>
                <div className="w-56 p-3">
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
                    <div>
                      <p className="text-sm font-bold text-white">
                        {tram.route === "Tram" ? "Live tram" : `Route ${tram.route}`}
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
                        {tram.operator ?? "Yarra Trams"}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                      Live
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/85">{tram.destination ?? "Live vehicle position"}</p>
                  <p className="mt-2 text-xs text-white/55">
                    {tram.timestamp
                      ? `Last reported ${formatDistanceToNow(new Date(tram.timestamp), { addSuffix: true })}`
                      : "Live feed timestamp unavailable"}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        {modeIsBusVisible &&
          renderSurfaceStops(
            ANYTRIP_SURFACE_STOPS.filter(
              (stop) => stop.modes.includes("bus") && isSurfaceRouteVisible("bus", stop.routeLabel),
            ),
            "#FF8200",
            "#FF8200",
            (stop) => setSelectedDetail({ type: "surfaceStop", stop }),
            visibleViewportBounds,
            "bus",
          )}
        {modeIsTramVisible &&
          renderSurfaceStops(
            ANYTRIP_SURFACE_STOPS.filter(
              (stop) => stop.modes.includes("tram") && isSurfaceRouteVisible("tram", stop.routeLabel),
            ),
            "#78BE20",
            "#78BE20",
            (stop) => setSelectedDetail({ type: "surfaceStop", stop }),
            visibleViewportBounds,
            "tram",
          )}
        {visibleReports.map((report) => {
          if (!report.lat || !report.lng) return null;

          return (
            <Marker
              key={report.id}
              position={[report.lat, report.lng]}
              icon={createCustomIcon(report)}
              eventHandlers={{
                click: () => setSelectedDetail({ type: "report", report }),
              }}
            >
              <Popup>
                <div className="p-4 w-64">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                    <span className="text-2xl">
                      {TRANSPORT_EMOJI[report.transportType]}
                    </span>
                    <div>
                      <p className="font-bold text-white text-sm capitalize">
                        {REPORT_LABEL[report.reportType]}
                      </p>
                      <p className="text-[11px] text-white/40">
                        {formatDistanceToNow(new Date(report.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <span
                      className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide"
                      style={{
                        background: `${REPORT_COLOR[report.reportType]}33`,
                        color: REPORT_COLOR[report.reportType],
                      }}
                    >
                      {report.transportType}
                    </span>
                  </div>

                  {(report.lineNumber || report.direction) && (
                    <div className="flex items-center gap-2 mb-2">
                      {report.lineNumber && (
                        <span className="bg-white/10 text-white text-xs font-bold px-2 py-1 rounded-lg">
                          Line {report.lineNumber}
                        </span>
                      )}
                      {report.direction && report.direction !== "unknown" && (
                        <span className="text-xs text-white/60">
                          {DIRECTION_LABEL[report.direction]}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mb-2">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">
                      Location
                    </p>
                    <p className="text-sm text-white/90 font-medium">
                      {report.locationName}
                    </p>
                  </div>

                  {report.notes && (
                    <div className="bg-white/5 border border-white/5 rounded-xl p-2 text-xs text-white/70 italic mb-2">
                      "{report.notes}"
                    </div>
                  )}

                  <p className="text-right text-[10px] text-white/30">
                    by{" "}
                    <span className="text-white/50 font-medium">
                      {report.username}
                    </span>
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {isAdmin ? selectedAdminDebugOverlay : null}

        {isAdmin &&
          isMarkerEditMode &&
          editableStations.map((station) => {
            const override = draftMarkerOverrides[station.name];
            const markerPosition: [number, number] = override ? [override.lat, override.lng] : station.position;
            const isSelected = selectedDetail?.type === "station" && selectedDetail.station.name === station.name;

            return (
              <Marker
                key={`editor-${station.name}`}
                position={markerPosition}
                draggable
                zIndexOffset={5000}
                riseOnHover
                icon={createEditorMarkerIcon(isSelected)}
                eventHandlers={{
                  click: () => setSelectedDetail({ type: "station", station: { ...station, position: markerPosition } }),
                  dragend: (event) => {
                    const latlng = event.target.getLatLng();
                    setDraftMarkerOverrides((prev) => ({
                      ...prev,
                      [station.name]: {
                        markerName: station.name,
                        markerType: "station",
                        lat: latlng.lat,
                        lng: latlng.lng,
                      },
                    }));
                    setSelectedDetail({
                      type: "station",
                      station: { ...station, position: [latlng.lat, latlng.lng] },
                    });
                  },
                }}
              />
            );
          })}
      </MapContainer>

      <LayerControl layers={layers} onChange={toggleLayer} />

      {modeIsTrainVisible && (
      <div className="pointer-events-none absolute left-3 top-[8.6rem] z-[1000] max-w-[7.2rem] sm:left-4 sm:top-28 sm:max-w-xs">
        <div className={`rounded-2xl border px-3 py-2.5 shadow-xl backdrop-blur-xl ${liveTrainStatusTone}`}>
          <div className="flex items-center gap-2">
            <Train className="h-3.5 w-3.5" />
            <p className="text-xs font-semibold leading-tight sm:text-sm">Live train tracking</p>
          </div>
          <p className="mt-1.5 text-xs leading-tight sm:text-sm">{liveTrainStatusLabel}</p>
          <p className="mt-1 text-[11px] leading-4 opacity-80 sm:text-xs">{liveTrainStatusDetail}</p>
        </div>
      </div>
      )}

        {!isGuest && (modeIsTrainVisible || modeIsVlineVisible) && (
      <div className="pointer-events-auto absolute left-3 top-[14.45rem] z-[1000] w-[12.5rem] sm:left-4 sm:top-[12.7rem] sm:w-[18.75rem]">
        <div className="rounded-2xl border border-white/10 bg-slate-950/88 p-3 shadow-xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                {isPremium ? "Premium train lookup" : "Premium train lookup"}
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {isPremium ? "Search by consist or TDN" : "Upgrade to search by TDN or consist"}
              </p>
            </div>
            <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200">
              Premium
            </span>
          </div>

          <div className="mt-3 flex gap-2">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
              <input
                value={trainLookupQuery}
                onChange={(event) => {
                  setTrainLookupQuery(event.target.value);
                  if (trainLookupMessage) {
                    setTrainLookupMessage("");
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleTrainLookup();
                  }
                }}
                placeholder={isPremium ? "430M or UFD11" : "Premium required"}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white outline-none transition focus:border-blue-400/40 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!isPremium}
              />
            </label>
            <button
              type="button"
              onClick={handleTrainLookup}
              className="rounded-xl border border-blue-400/30 bg-blue-500/15 px-3 py-2 text-xs font-semibold text-blue-100 transition hover:bg-blue-500/25"
              disabled={!isPremium}
            >
              Find
            </button>
          </div>

          {trainLookupMessage ? (
            <p className="mt-2 text-xs leading-4 text-white/60">{trainLookupMessage}</p>
          ) : (
            <p className="mt-2 text-xs leading-4 text-white/50">
              {isPremium
                ? "Premium members can jump straight to live consists and save favourites."
                : "Public and standard accounts only see generic service labels like 22:57 FSS Service until premium is enabled."}
            </p>
          )}

          {isPremium && favouriteConsists.length > 0 ? (
            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Favourite consists</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {favouriteConsists.slice(0, 8).map((consist) => (
                  <button
                    key={consist}
                    type="button"
                    onClick={() => {
                      setTrainLookupQuery(consist);
                      setTrainLookupMessage("");
                      const liveMatch = [...metroLiveVehicles, ...vlineLiveVehicles].find(
                        (vehicle) =>
                          normaliseConsistLookupValue(getDisplayConsist(vehicle.consist)) === normaliseConsistLookupValue(consist),
                      );
                      if (liveMatch) {
                        focusVehicleOnMap(liveMatch);
                        setTrainLookupMessage(`Jumped to favourite consist ${consist}.`);
                        return;
                      }
                      setTrainLookupMessage(`${consist} is saved, but no live match is showing right now.`);
                    }}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/75 transition hover:bg-white/10"
                  >
                    {consist}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      )}

      {showFilterRail && (
      <div className="absolute right-3 top-[8.55rem] z-[1000] w-[7.3rem] sm:right-6 sm:top-32 sm:w-[11.5rem]">
        <div className="max-h-[44vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/82 p-2 shadow-xl backdrop-blur-xl sm:max-h-[68vh] sm:p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
            Transport Modes
          </p>
          <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:mt-3 sm:gap-2">
              {([
                { key: "train", label: "Trains", icon: "train" },
                { key: "vline", label: "V/Line", icon: "vline" },
                { key: "tram", label: "Trams", icon: "tram" },
                { key: "bus", label: "Buses", icon: "bus" },
              ] as Array<{ key: TransportMode; label: string; icon: "train" | "tram" | "bus" | "vline" }>).map((mode) => {
              const active = transportModes.includes(mode.key);
              return (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => toggleTransportMode(mode.key)}
                  className={`rounded-xl border px-2 py-1.5 text-left text-[11px] font-semibold leading-tight transition sm:px-3 sm:py-2 sm:text-xs ${
                    active
                      ? "border-blue-400/40 bg-blue-500/12 text-blue-100"
                      : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10"
                  }`}
                >
                  <span className="flex items-center gap-1.5 sm:gap-2">
                    {mode.icon === "train" ? (
                      <img src={trainIcon} alt="" className="h-3.5 w-3.5 shrink-0 object-contain opacity-90 sm:h-4 sm:w-4" />
                    ) : mode.icon === "bus" ? (
                      <img
                        src={smartbusIcon}
                        alt=""
                        className={`h-3.5 w-3.5 shrink-0 object-contain opacity-90 sm:h-4 sm:w-4 ${active ? "" : "grayscale brightness-75 opacity-55"}`}
                      />
                    ) : mode.icon === "tram" ? (
                      <img
                        src={tramIcon}
                        alt=""
                        className={`h-3.5 w-3.5 shrink-0 object-contain opacity-90 sm:h-4 sm:w-4 ${active ? "" : "grayscale brightness-75 opacity-55"}`}
                      />
                    ) : (
                      <span className="inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full border border-current/25 px-1 text-[8px] font-bold leading-none sm:h-4 sm:min-w-4 sm:text-[9px]">
                        V
                      </span>
                    )}
                    <span className="truncate">{mode.label}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {isAdmin && (
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setIsMarkerEditMode((value) => !value)}
                className={`rounded-xl border px-2 py-1.5 text-left text-[11px] font-semibold transition sm:px-3 sm:py-2 sm:text-xs ${
                  isMarkerEditMode
                    ? "border-amber-400/40 bg-amber-500/12 text-amber-100"
                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                {isMarkerEditMode ? "Marker edit mode on" : "Edit markers"}
              </button>
              {isMarkerEditMode && (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => void saveEditedMarkers()}
                  className="rounded-xl border border-emerald-400/30 bg-emerald-500/12 px-2 py-1.5 text-[11px] font-semibold text-emerald-100 sm:px-3 sm:py-2 sm:text-xs"
                  >
                    Save edits
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditedMarkers}
                  className="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-semibold text-white/70 sm:px-3 sm:py-2 sm:text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void resetSavedMarkers()}
                  className="rounded-xl border border-red-400/25 bg-red-500/10 px-2 py-1.5 text-[11px] font-semibold text-red-100 sm:px-3 sm:py-2 sm:text-xs"
                  >
                    Reset all
                  </button>
                </div>
              )}
            </div>
          )}

          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
            Service Filters
          </p>
          <div className="mt-2.5 flex flex-col gap-1.5 sm:mt-3 sm:gap-2">
            {visibleServiceFilters.map((filter) => {
              const active = isServiceFilterActive(filter.key);
              const chips = getFilterChips(filter.key);
              return (
                <div key={filter.key} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => toggleServiceFilter(filter.key)}
                    className={`rounded-xl border px-2 py-1.5 text-left transition sm:px-3 sm:py-2 ${
                      active
                        ? filter.tone
                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <div className="text-[11px] font-semibold leading-tight sm:text-xs">{filter.label}</div>
                    {filter.description && (
                      <div className="mt-0.5 text-[9px] font-medium leading-3.5 text-current/75 sm:text-[10px] sm:leading-4">
                        {filter.description}
                      </div>
                    )}
                    {chips.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {chips.map((chip) => (
                          <span
                            key={`${filter.key}-${chip}`}
                            className="rounded-full border border-current/20 bg-black/15 px-1.5 py-0.5 text-[9px] font-semibold text-current/85 sm:px-2 sm:text-[10px]"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Tram Routes
              </p>
              <div className="mt-2.5 flex flex-col gap-1.5 sm:mt-3 sm:gap-2">
                {visibleTramRouteFilters.map((filter) => {
                  const active = isSurfaceRouteFilterActive(filter);
                  return (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => toggleSurfaceRouteFilter(filter)}
                      className={`rounded-xl border px-2 py-1.5 text-left transition sm:px-3 sm:py-2 ${
                        active
                          ? filter.tone
                          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      <div className="text-[11px] font-semibold leading-tight sm:text-xs">{filter.label}</div>
                      {filter.description && (
                        <div className="mt-0.5 text-[9px] font-medium leading-3.5 text-current/75 sm:text-[10px] sm:leading-4">
                          {filter.description}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Bus Routes
              </p>
              <div className="mt-2.5 flex flex-col gap-1.5 sm:mt-3 sm:gap-2">
                {visibleBusRouteFilters.map((filter) => {
                  const active = isSurfaceRouteFilterActive(filter);
                  return (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => toggleSurfaceRouteFilter(filter)}
                      className={`rounded-xl border px-2 py-1.5 text-left transition sm:px-3 sm:py-2 ${
                        active
                          ? filter.tone
                          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      <div className="text-[11px] font-semibold leading-tight sm:text-xs">{filter.label}</div>
                      {filter.description && (
                        <div className="mt-0.5 text-[9px] font-medium leading-3.5 text-current/75 sm:text-[10px] sm:leading-4">
                          {filter.description}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

        <div
          className={`absolute bottom-[8.5rem] right-4 z-[1001] flex flex-col gap-2 sm:bottom-20 sm:right-6 ${
            selectedDetail?.type === "vehicle" ? "md:left-auto md:right-[26rem]" : "md:left-auto md:right-6"
          }`}
        >
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          className="rounded-xl border border-white/20 bg-slate-950/78 p-2.5 shadow-lg backdrop-blur-md transition-colors hover:bg-white/20"
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4 text-white" />
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          className="rounded-xl border border-white/20 bg-slate-950/78 p-2.5 shadow-lg backdrop-blur-md transition-colors hover:bg-white/20"
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4 text-white" />
        </button>
        <button
          type="button"
          onClick={centerOnUserLocation}
          className="rounded-xl border border-white/20 bg-slate-950/78 p-2.5 shadow-lg backdrop-blur-md transition-colors hover:bg-white/20"
          title="Center on my location"
        >
          <Navigation className="h-4 w-4 text-white" />
        </button>
      </div>

      {selectedDetail?.type === "vehicle" && (
        <div className="absolute inset-x-3 bottom-28 z-[1001] mx-auto w-auto max-w-[calc(100%-1.5rem)] rounded-[1.6rem] border border-white/10 bg-slate-950/96 p-3 shadow-2xl backdrop-blur-2xl max-md:max-h-[44vh] max-md:overflow-y-auto md:inset-x-auto md:bottom-6 md:right-4 md:top-24 md:max-h-[calc(100%-7rem)] md:w-[24rem] md:p-3.5 md:overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.24em]"
                style={{ color: `${selectedVehicleAccent}cc` }}
              >
                {selectedVehicleIsRegional ? "Regional tracker" : "Train tracker"}
              </p>
              <p className="mt-1.5 text-[1.35rem] font-semibold leading-tight text-white">
                {selectedVehicleHeadingLabel}
              </p>
              {selectedVehicleJourneyLabel && (
                <p className="mt-1 text-xs text-white/55">
                  {selectedVehicleJourneyLabel}
                </p>
              )}
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Stopping pattern</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {selectedVehiclePatternLabel}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDetail(null)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-white/70"
            >
              ×
            </button>
          </div>

          <div
            className="mt-3 rounded-[1.35rem] border p-3.5"
            style={{
              borderColor: selectedVehicleIsRegional ? "rgba(124,58,237,0.28)" : "rgba(34,211,238,0.15)",
              background: selectedVehicleIsRegional
                ? "linear-gradient(90deg, rgba(124,58,237,0.16), rgba(168,85,247,0.08))"
                : "linear-gradient(90deg, rgba(6,182,212,0.10), rgba(16,185,129,0.08))",
            }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
              {selectedVehicleIsRegional ? "Regional service" : "Running service"}
            </p>
            <p className="mt-1.5 text-lg font-semibold leading-tight text-white">
              {selectedVehiclePatternLabel}
            </p>
            <p className="mt-1.5 text-xs text-white/65">
              {selectedVehicleSnapshot?.current_trip
                ? `Running now from ${formatRouteWindow(selectedVehicleSnapshot.current_trip.departs)} to ${formatRouteWindow(selectedVehicleSnapshot.current_trip.arrives)}`
                : selectedRegionalProfile
                  ? `${selectedVehicleServiceTypeLabel} · Platform ${selectedRegionalProfile.platform} · Updated live`
                : selectedVehicleSnapshot?.next_trip
                  ? `Departs ${formatRouteWindow(selectedVehicleSnapshot.next_trip.departs)} and arrives ${formatRouteWindow(selectedVehicleSnapshot.next_trip.arrives)}`
                  : "Using the live feed fallback while trip-level timing is unavailable."}
            </p>
            {selectedRegionalRestrictionSummary ? (
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200">
                Stop restrictions: {selectedRegionalRestrictionSummary}
              </p>
            ) : null}
          </div>

          {selectedRegionalProfile && (
            <div
              className="mt-3 rounded-[1.35rem] border p-3.5"
              style={{
                borderColor: "rgba(124,58,237,0.28)",
                background: "rgba(76,29,149,0.18)",
              }}
            >
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Final delay</p>
                  <p className="mt-1 text-sm font-semibold text-white">{selectedVehicleDelayMinutes} min</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Type</p>
                  <p className="mt-1 text-sm font-semibold text-white">{selectedVehicleTypeLabel}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Window</p>
                  <p className="mt-1 text-sm font-semibold text-white">{selectedVehicleWindowLabel}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Duration</p>
                  <p className="mt-1 text-sm font-semibold text-white">{selectedVehicleDurationLabel}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Date</p>
                  <p className="mt-1 text-sm font-semibold text-white">{selectedVehicleDateLabel}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Journey</p>
                  <p className="mt-1 text-sm font-semibold text-white">{selectedVehicleJourneyLabel || "Live"}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-3.5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
                  Origin
                </p>
                <p className="mt-1.5 text-[1.9rem] font-semibold leading-none text-white">
                  {selectedVehicleOriginLabel}
                </p>
              </div>
              <div className="mt-6 flex items-center gap-2 text-emerald-300/80">
                <div className="h-px w-5 bg-emerald-400/30" />
                <ArrowRight className="h-4 w-4" />
                <div className="h-px w-5 bg-emerald-400/30" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
                  Destination
                </p>
                <p className="mt-1.5 text-[1.9rem] font-semibold leading-none text-white">
                  {selectedVehicleDestinationLabel}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  border: `1px solid ${selectedVehicleIsRegional ? "rgba(196,181,253,0.30)" : "rgba(52,211,153,0.20)"}`,
                  background: selectedVehicleIsRegional ? "rgba(124,58,237,0.18)" : "rgba(16,185,129,0.10)",
                  color: selectedVehicleIsRegional ? "#ede9fe" : "#d1fae5",
                }}
              >
                {selectedVehicleSnapshot?.position?.vehicle_stop_status === "STOPPED_AT"
                  ? `Stopped at ${selectedVehicleSnapshot.position.current_stop}`
                  : getVehicleStoppingPattern(selectedDetail.vehicle)}
              </span>
              {selectedVehicleSnapshot?.current_trip?.url && (
                <a
                  href={selectedVehicleSnapshot.current_trip.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/70"
                >
                  Open source
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-white/10 pt-3.5 text-sm text-white/70">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Type</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {selectedVehicleTypeLabel}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Operator</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {isVlineLiveTrain(selectedDetail.vehicle) ? "V/Line" : "Metro Trains Melbourne"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Window</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {getVehicleWindowLabel(selectedVehicleSnapshot, selectedDetail.vehicle)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                {getVehicleTypeIcon(selectedDetail.vehicle) && (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-2">
                    <img
                      src={getVehicleTypeIcon(selectedDetail.vehicle) ?? undefined}
                      alt={`${getVehicleDisplayType(selectedDetail.vehicle)} icon`}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}

                <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
                  Train type
                </p>
                <p className="mt-2.5 text-xl font-semibold leading-tight text-white">
                  {selectedVehicleTypeLabel}
                </p>
                </div>
              </div>
            </div>

            {(selectedVehicleRegionalSetLabel || getDisplayConsist(selectedDetail.vehicle.consist)) && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                      {selectedVehicleIsRegional ? "Allocated set" : "Consist"}
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-white">
                      {selectedVehicleRegionalSetLabel || selectedVehicleDisplayConsist}
                    </p>
                  </div>

                  {selectedVehicleDisplayConsist ? (
                    isPremium ? (
                      <button
                        type="button"
                        onClick={() => handleFavouriteConsistClick(selectedVehicleDisplayConsist)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition ${
                          selectedVehicleIsFavouriteConsist
                            ? "border-amber-400/30 bg-amber-500/15 text-amber-100"
                            : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                        }`}
                      >
                        <Star className="h-3 w-3" />
                        {selectedVehicleIsFavouriteConsist ? "Saved" : "Favourite"}
                      </button>
                    ) : (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                        Premium only
                      </span>
                    )
                  ) : null}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
                Position estimate
              </p>
              <p className="mt-2.5 text-sm text-white/85">
                {selectedVehiclePositionEstimateLabel}
              </p>
              {selectedVehicleRelevantAlerts.length ? (
                <div className="mt-3 rounded-[1.1rem] border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-50/95">
                  {selectedVehicleRelevantAlerts[0]}
                </div>
              ) : null}
          </div>

          {selectedRegionalProfile && (
            <div
              className="mt-3 rounded-[1.35rem] border p-3.5"
              style={{
                borderColor: "rgba(124,58,237,0.28)",
                background: "rgba(30,22,59,0.92)",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200/70">
                    Journey
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">{selectedVehicleJourneyLabel || "Live"}</p>
                  {selectedRegionalRestrictionSummary ? (
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200">
                      {selectedRegionalRestrictionSummary}
                    </p>
                  ) : null}
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white"
                  style={{ background: "rgba(124,58,237,0.25)", border: "1px solid rgba(196,181,253,0.22)" }}
                >
                  {selectedRegionalProfile.serviceType}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {selectedRegionalProfile.stops.map((stop, index) => (
                  <div
                    key={`${stop.time}-${stop.name}`}
                    className="grid grid-cols-[56px_minmax(0,1fr)_38px] items-start gap-3 rounded-2xl border border-white/6 bg-white/[0.025] px-3 py-2.5"
                  >
                    <p className="text-sm font-semibold text-white">{stop.time}</p>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight text-white">{stop.name}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
                        {stop.platform && <span>{`Pl ${stop.platform}`}</span>}
                        {stop.side && <span>{stop.side}</span>}
                        {stop.note && <span>{stop.note}</span>}
                        {!stop.platform && !stop.side && !stop.note && index !== 0 && index !== selectedRegionalProfile.stops.length - 1 && (
                          <span>Regional</span>
                        )}
                      </div>
                    </div>
                    <p className="text-right text-sm font-semibold text-violet-200">
                      {getRegionalStopDelayLabel(stop.delayMinutes)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedDetail && selectedDetail.type !== "vehicle" && (
        <div className="absolute inset-x-3 bottom-32 z-[1001] mx-auto max-h-[52vh] w-full max-w-[95vw] overflow-y-auto rounded-[1.8rem] border border-white/10 bg-slate-950/90 p-3.5 shadow-2xl backdrop-blur-2xl sm:bottom-24 sm:p-4 lg:max-w-[980px]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-300/75">
                {selectedDetail.type === "station"
                  ? "Station"
                  : selectedDetail.type === "surfaceStop"
                    ? "Stop"
                    : "Service report"}
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {selectedDetail.type === "station"
                  ? selectedDetail.station.name
                  : selectedDetail.type === "surfaceStop"
                    ? selectedDetail.stop.name
                    : selectedDetail.report.locationName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDetail(null)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70"
            >
              Close
            </button>
          </div>

          {selectedDetail.type === "station" && (
            <div className="mt-3 space-y-3 text-sm text-white/70">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">{getStationDetails(selectedDetail.station)}</div>
              {renderStationBoardingGuide(selectedDetail.station.name)}

              {selectedDetail.station.name === "Southern Cross" && (
                <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-300/75">
                        Departure board
                      </p>
                      <p className="mt-1 text-xs text-white/55">
                        Styled like the concourse screens for a quick glance.
                      </p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                        Updated {new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      Southern Cross
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
                    <div className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-slate-900/90 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                      <div className="border-b border-white/10 bg-slate-950/80 px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                          Southern Cross
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <img
                            src="/images/xpt.svg"
                            alt="XPT icon"
                            className="h-8 w-8 rounded-md object-contain"
                          />
                          <p className="text-lg font-semibold text-white">Platform 1 · XPT</p>
                        </div>
                        <p className="mt-1 text-xs text-white/55">NSW TrainLink long-distance services. Check station displays for final boarding advice.</p>
                      </div>

                      <div className="divide-y divide-slate-800/90">
                        {SOUTHERN_CROSS_PLATFORM_1_SERVICES.map((service) => (
                          <div
                            key={`${service.runId}-${service.departureLabel}-${service.dayLabel}`}
                            className="bg-white px-4 py-3 text-slate-950"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="rounded-md bg-slate-950 px-2 py-1 text-xs font-bold text-white">
                                    {service.runId}
                                  </span>
                                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                    Plt 1
                                  </span>
                                </div>
                                <p className="mt-2 text-lg font-semibold leading-tight">{service.destination}</p>
                                <p className="mt-1 text-sm text-slate-700">{service.lineLabel} • {service.consist}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-slate-950">{service.departureLabel}</p>
                                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{service.dayLabel}</p>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                                {service.statusLabel}
                              </span>
                              <span className="rounded-md bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white">
                                Platform 1
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                      {SOUTHERN_CROSS_DEPARTURE_BOARD.map((column) => (
                        <div
                          key={column.title}
                          className="min-w-0 overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#202020] shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
                        >
                          <div className={`h-1.5 w-full ${column.accent}`} />
                          <div className="bg-[#202020] px-5 py-4 text-white">
                            <div className="flex items-start justify-between gap-4">
                              <p className="min-w-0 flex-1 pr-2 text-[1.15rem] font-semibold leading-[1.12] text-white [overflow-wrap:anywhere]">{column.title}</p>
                              <div className="shrink-0 rounded-sm bg-white px-2 py-1 text-[1rem] font-bold leading-none text-slate-950">
                                {column.platform}
                              </div>
                            </div>
                            <div className="mt-4 grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_auto] gap-4 border-t border-white/10 pt-3 text-left text-[8px] font-semibold uppercase tracking-[0.04em] text-white/70">
                              <div>
                                <p>Scheduled</p>
                                <p className="mt-2 text-[1.15rem] font-semibold tracking-normal text-white">{column.scheduledTime}</p>
                              </div>
                              <div>
                                <p>Departing</p>
                                <p className="mt-2 text-[1.15rem] font-semibold tracking-normal text-white">{column.departingTime}</p>
                              </div>
                              <div>
                                <p>Platform</p>
                                <p className="mt-2 text-[1.15rem] font-semibold tracking-normal text-white">{column.platform}</p>
                              </div>
                            </div>
                            <div className="mt-4 border-t border-white/10 pt-3">
                              <p className="text-[1.05rem] font-semibold text-white">{column.status}</p>
                              {column.via ? <p className="mt-1.5 text-sm text-white/70">{column.via}</p> : null}
                            </div>
                            <div className="mt-4 space-y-1.5 text-[1.05rem] leading-snug text-white/95">
                              {column.stops.map((stop) => (
                                <p key={`${column.title}-${stop}`}>{stop}</p>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedDetail.station.name !== "Southern Cross" && (
                (() => {
                  const isMetroTunnelConnectorStation =
                    selectedDetail.station.name === "Melbourne Central" ||
                    selectedDetail.station.name === "State Library";
                  const platformBoard = buildPlatformBoard(selectedDetail.station);
                  const freightMovements = getFreightMovements(selectedDetail.station.name);
                  const connectedStationName =
                    selectedDetail.station.name === "Melbourne Central"
                      ? "State Library"
                      : selectedDetail.station.name === "State Library"
                        ? "Melbourne Central"
                        : null;

                  return (
                    <div className={isMetroTunnelConnectorStation ? "w-[min(980px,95vw)] rounded-[1.45rem] border border-white/10 bg-white/[0.03] p-3" : ""}>
                      <div
                        className={
                          isMetroTunnelConnectorStation
                            ? "grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]"
                            : ""
                        }
                      >
                      {isMetroTunnelConnectorStation && (
                        <div className="min-w-[320px] max-w-[320px] rounded-[1.2rem] border border-[#279FD5]/20 bg-[#279FD5]/[0.08] p-3 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7cd9ff]">
                            Station
                          </p>
                          <p className="mt-1 text-2xl font-semibold leading-tight text-white">
                            {connectedStationName ?? selectedDetail.station.name}
                          </p>
                          <div className="mt-3 rounded-[1rem] border border-white/10 bg-black/15 p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7cd9ff]">
                              Metro Tunnel interchange
                            </p>
                            <p className="mt-1 text-lg font-semibold leading-tight text-white">
                              {selectedDetail.station.name}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-white/65">
                              Platforms 1 and 2 with direct CBD interchange access.
                            </p>
                          </div>
                          <div className="mt-3">
                            {renderPlatformBoardCard(
                              selectedDetail.station.name,
                              METRO_TUNNEL_CONNECTION_BOARD,
                              100,
                              isPremium,
                              handlePlatformBoardServiceClick,
                            )}
                          </div>
                        </div>
                      )}

                      <div className={isMetroTunnelConnectorStation ? "min-w-0 rounded-[1.2rem] border border-white/10 bg-black/10 p-3" : "rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-3"}>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-300/75">
                          Next services
                        </p>
                        <p className="mt-1 text-xs text-white/55">
                          {isMetroTunnelConnectorStation
                            ? `${selectedDetail.station.name} loop platforms and connected CBD services.`
                            : `The next two services showing on each platform at ${selectedDetail.station.name}.`}
                        </p>

                        <div className={`mt-2.5 grid gap-2 ${isMetroTunnelConnectorStation ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
                          {platformBoard.map((platform, index) =>
                            renderPlatformBoardCard(selectedDetail.station.name, platform, index, isPremium, handlePlatformBoardServiceClick),
                          )}
                        </div>

                        {freightMovements.length > 0 && isPremium && (
                          <div className="mt-3 rounded-[1.1rem] border border-[#8b5e34]/30 bg-[#8b5e34]/10 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e8c9a7]">
                                  Freight movements
                                </p>
                                <p className="mt-1 max-w-[48ch] text-xs leading-relaxed text-white/55">
                                  Indicative freight paths through {selectedDetail.station.name}. These are corridor timings, not passenger departures.
                                </p>
                              </div>
                              <span className="rounded-full border border-[#8b5e34]/35 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f0dcc3]">
                                Through corridor
                              </span>
                            </div>

                            <div className="mt-3 grid gap-2 lg:grid-cols-2">
                              {freightMovements.map((movement) => (
                                <div
                                  key={`${selectedDetail.station.name}-${movement.serviceId}-${movement.timeLabel}`}
                                  className="rounded-[0.95rem] border border-white/10 bg-black/20 p-3"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-md bg-[#8b5e34]/25 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f0dcc3]">
                                          {movement.serviceId}
                                        </span>
                                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
                                          {movement.operator}
                                        </span>
                                      </div>
                                      <p className="mt-2 text-sm font-semibold leading-snug text-white">
                                        {movement.movement}
                                      </p>
                                      <p className="mt-1 text-xs leading-relaxed text-white/60">{movement.lineLabel}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-base font-semibold text-white">{movement.timeLabel}</p>
                                      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#e8c9a7]/90">
                                        {movement.statusLabel}
                                      </p>
                                    </div>
                                  </div>
                                  {movement.note ? (
                                    <p className="mt-2 border-t border-white/10 pt-2 text-xs leading-relaxed text-white/55">{movement.note}</p>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {freightMovements.length > 0 && !isPremium && (
                          <div className="mt-3 rounded-[1.1rem] border border-white/10 bg-white/[0.04] p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e8c9a7]">
                                  Premium
                                </p>
                                <p className="mt-1 text-sm font-semibold text-white">
                                  Freight tracking is part of TransitAlert Premium.
                                </p>
                                <p className="mt-1 max-w-[48ch] text-xs leading-relaxed text-white/60">
                                  Unlock corridor freight timing panels and advanced path visibility for major junction stations.
                                </p>
                              </div>
                              <span className="rounded-full border border-[#8b5e34]/35 bg-[#8b5e34]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f0dcc3]">
                                Locked
                              </span>
                            </div>
                            {premiumPaypalLink ? (
                              <a
                                href={premiumPaypalLink}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 inline-flex rounded-full border border-[#8b5e34]/35 bg-[#8b5e34]/10 px-3 py-1.5 text-[11px] font-semibold text-[#f0dcc3] transition hover:bg-[#8b5e34]/15"
                              >
                                Unlock with PayPal
                              </a>
                            ) : (
                              <p className="mt-3 text-xs text-white/50">Add a PayPal premium link in Settings to unlock this feature.</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {selectedDetail.type === "report" && (
            <div className="mt-3 grid gap-2 text-sm text-white/70 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">Mode {selectedDetail.report.transportType}</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">Type {selectedDetail.report.reportType}</div>
              {selectedDetail.report.lineNumber && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">Route {selectedDetail.report.lineNumber}</div>
              )}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">By {selectedDetail.report.username}</div>
              {selectedDetail.report.notes && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:col-span-2">
                  {selectedDetail.report.notes}
                </div>
              )}
            </div>
          )}

          {selectedDetail.type === "surfaceStop" && (
            <div className="mt-3 space-y-3 text-sm text-white/70">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold text-white">{selectedDetail.stop.locality}</p>
                <p className="mt-1 text-xs text-white/60">{selectedDetail.stop.subtitle}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedDetail.stop.modes.map((mode) => (
                    <span
                      key={`${selectedDetail.stop.id}-${mode}`}
                      className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75"
                    >
                      {mode}
                    </span>
                  ))}
                  <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-100/85">
                    Route {selectedDetail.stop.routeLabel}
                  </span>
                </div>
              </div>

              {isPremium ? (
              <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-300/75">
                      Schedules
                    </p>
                    <p className="mt-1 text-xs text-white/55">
                      Next scheduled departures for this stop in the app.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                    {selectedDetail.stop.departures.length} listed
                  </span>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {selectedDetail.stop.departures.map((departure) => (
                    <div
                      key={`${selectedDetail.stop.id}-${departure.route}-${departure.destination}-${departure.departureLabel}`}
                      className="rounded-2xl border border-white/10 bg-black/15 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/75">
                            Route {departure.route}
                          </p>
                          <p className="mt-1 text-base font-semibold leading-tight text-white">
                            {departure.destination}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/85">
                          {departure.departureLabel}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-white/55">
                        {departure.note ?? departure.statusLabel}
                      </p>
                      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/75">
                        {departure.statusLabel}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              ) : (
              <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-yellow-200/85">
                      Premium
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">Advanced stop schedules are locked.</p>
                    <p className="mt-1 text-xs text-white/55">
                      Premium unlocks the next scheduled departures panel for bus and tram stops.
                    </p>
                  </div>
                  <span className="rounded-full border border-yellow-300/20 bg-yellow-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-yellow-100/85">
                    Locked
                  </span>
                </div>
                {premiumPaypalLink ? (
                  <a
                    href={premiumPaypalLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex rounded-full border border-yellow-300/20 bg-yellow-500/10 px-3 py-1.5 text-[11px] font-semibold text-yellow-100 transition hover:bg-yellow-500/15"
                  >
                    Unlock with PayPal
                  </a>
                ) : (
                  <p className="mt-3 text-xs text-white/50">Add a PayPal premium link in Settings to unlock this feature.</p>
                )}
              </div>
              )}

              {selectedDetail.stop.modes.includes("bus") && (
                <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/75">
                        Live track buses
                      </p>
                      <p className="mt-1 text-xs text-white/55">
                        Nearby live buses on route {selectedDetail.stop.routeLabel}.
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      {selectedSurfaceStopLiveBuses.length > 0 ? `${selectedSurfaceStopLiveBuses.length} live` : "No live buses"}
                    </span>
                  </div>

                  {selectedSurfaceBusTrackingStops.length > 0 ? (
                    <div className="mt-3 overflow-hidden rounded-[1.25rem] border border-sky-300/15 bg-slate-950/70">
                      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-sky-500/10 px-3 py-2">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-200/80">
                            Onboard stop view
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            Route {selectedDetail.stop.routeLabel} to {getPrimarySurfaceDestination(selectedDetail.stop)}
                          </p>
                        </div>
                        <span className="rounded-full border border-sky-300/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-100/85">
                          {selectedSurfaceBusLeadVehicle
                            ? `Live ${selectedSurfaceBusLeadVehicle.bus.route}`
                            : "Stop list"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
                        <span>
                          {selectedSurfaceBusLeadVehicle?.bus.timestamp
                            ? getMarkerServiceTime(selectedSurfaceBusLeadVehicle.bus.timestamp)
                            : "Live now"}
                        </span>
                        <span>
                          {selectedSurfaceBusLeadVehicle
                            ? selectedSurfaceBusLeadVehicle.bus.destination ?? getPrimarySurfaceDestination(selectedDetail.stop)
                            : getPrimarySurfaceDestination(selectedDetail.stop)}
                        </span>
                      </div>

                      <div className="max-h-64 overflow-y-auto px-3 py-2">
                        {selectedSurfaceBusTrackingStops.map((stop, stopIndex) => {
                          const absoluteIndex =
                            (selectedSurfaceBusCurrentStopIndex >= 0 ? selectedSurfaceBusCurrentStopIndex : 0) + stopIndex;
                          const isCurrent = absoluteIndex === selectedSurfaceBusCurrentStopIndex;
                          const isSelectedStop = stop.id === selectedDetail.stop.id;

                          return (
                            <div
                              key={`${selectedDetail.stop.id}-bus-sequence-${stop.id}`}
                              className={`flex items-center gap-3 border-b border-white/5 py-2 last:border-b-0 ${
                                isCurrent ? "bg-sky-400/8" : ""
                              }`}
                            >
                              <div
                                className={`min-w-[54px] rounded-full border px-2 py-1 text-center text-[10px] font-bold ${
                                  isCurrent
                                    ? "border-sky-300/30 bg-sky-400 text-slate-950"
                                    : isSelectedStop
                                      ? "border-emerald-300/30 bg-emerald-400/20 text-emerald-100"
                                      : "border-white/10 bg-white/5 text-white/70"
                                }`}
                              >
                                {isCurrent ? "Now" : `Stop ${absoluteIndex + 1}`}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={`truncate text-sm font-semibold ${isCurrent ? "text-white" : "text-white/88"}`}>
                                  {stop.name}
                                </p>
                                <p className="mt-0.5 truncate text-[11px] text-white/45">
                                  {stop.locality}
                                  {isCurrent
                                    ? selectedSurfaceBusLeadVehicle?.bus.timestamp
                                      ? ` · Updated ${formatDistanceToNow(new Date(selectedSurfaceBusLeadVehicle.bus.timestamp), {
                                          addSuffix: true,
                                        })}`
                                      : " · Live position"
                                    : isSelectedStop
                                      ? " · Selected stop"
                                      : ""}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {selectedSurfaceStopLiveBuses.length > 0 ? (
                    <div className="mt-3 grid gap-2">
                      {selectedSurfaceStopLiveBuses.map(({ bus, distanceMetres }) => (
                        <div
                          key={`${selectedDetail.stop.id}-${bus.id}`}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/15 p-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">
                              Route {bus.route} to {bus.destination ?? "Live bus"}
                            </p>
                            <p className="mt-1 text-xs text-white/55">
                              {formatDistanceLabel(distanceMetres)}
                              {bus.timestamp
                                ? ` · Updated ${formatDistanceToNow(new Date(bus.timestamp), { addSuffix: true })}`
                                : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              mapRef.current?.flyTo([bus.lat, bus.lng], Math.max(mapRef.current?.getZoom() ?? 14, 14), {
                                animate: true,
                                duration: 0.85,
                              });
                              setSelectedDetail(null);
                            }}
                            className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-500/15"
                          >
                            Jump to bus
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-black/10 p-3 text-sm text-white/55">
                      No route {selectedDetail.stop.routeLabel} buses are reporting live near this stop right now.
                    </div>
                  )}
                </div>
              )}

              {selectedDetail.stop.modes.includes("tram") && (
                <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/75">
                        Live track trams
                      </p>
                      <p className="mt-1 text-xs text-white/55">
                        Nearby live trams on route {selectedDetail.stop.routeLabel}.
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      {selectedSurfaceStopLiveTrams.length > 0 ? `${selectedSurfaceStopLiveTrams.length} live` : "No live trams"}
                    </span>
                  </div>

                  {selectedSurfaceStopLiveTrams.length > 0 ? (
                    <div className="mt-3 grid gap-2">
                      {selectedSurfaceStopLiveTrams.map(({ tram, distanceMetres }) => (
                        <div
                          key={`${selectedDetail.stop.id}-${tram.id}`}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/15 p-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">
                              Route {tram.route} to {tram.destination ?? "Live tram"}
                            </p>
                            <p className="mt-1 text-xs text-white/55">
                              {formatDistanceLabel(distanceMetres)}
                              {tram.timestamp
                                ? ` · Last reported ${formatDistanceToNow(new Date(tram.timestamp), { addSuffix: true })}`
                                : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              mapRef.current?.flyTo([tram.lat, tram.lng], Math.max(mapRef.current?.getZoom() ?? 14, 14), {
                                animate: true,
                                duration: 0.85,
                              });
                              setSelectedDetail(null);
                            }}
                            className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-500/15"
                          >
                            Jump to tram
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-black/10 p-3 text-sm text-white/55">
                      No route {selectedDetail.stop.routeLabel} trams are reporting live near this stop right now.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-28 left-3 z-[1000] max-w-[17rem] sm:bottom-32 sm:left-4 sm:max-w-[20rem]">
        <div className="rounded-2xl border border-white/10 bg-slate-950/88 p-3 shadow-xl backdrop-blur-xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
            Map key
          </p>

          <div className="mt-3 space-y-2.5 text-[11px] leading-4 text-white/72">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-5 w-8 items-center justify-center rounded-full border-2 border-slate-950 bg-white shadow-[0_2px_6px_rgba(0,0,0,0.25)]">
                <div className="h-[3px] w-5 rounded-full bg-slate-900/20" />
              </div>
              <p>
                <span className="font-semibold text-white">Interchange station</span>
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md bg-blue-600/90 text-white">
                <Accessibility className="h-3.5 w-3.5" />
              </div>
              <p>
                <span className="font-semibold text-white">Lift or ramp access</span> where accessible station access is available.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 inline-flex h-5 items-center gap-1 rounded-md bg-black/70 px-1.5 text-white">
                <BusFront className="h-3 w-3 text-red-300" />
                <Plane className="h-3 w-3 text-white" />
              </div>
              <p>
                <span className="font-semibold text-white">SkyBus / airport shuttle</span> interchange point or airport coach access.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-950">
                <Info className="h-3.5 w-3.5" />
              </div>
              <p>
                <span className="font-semibold text-white">Stations staffed</span> from first to last train where full-time staffing applies.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="mt-[9px] h-0 w-8 border-t-2 border-dotted border-white/55" />
              <p>
                <span className="font-semibold text-white">Zone 1 and 2 boundary</span>
              </p>
            </div>
          </div>

          <p className="mt-3 border-t border-white/10 pt-2 text-[10px] leading-4 text-white/45">
            Metro staffed-station hours vary by station. Regional station staffing can vary more widely again.
          </p>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_120px_rgba(10,10,20,0.7)] z-[500]" />
    </div>
  );
}

export function getFilterChips(filterKey: ServiceFilterKey) {
  switch (filterKey) {
    case "geelongRegionalGroup":
      return ["Waurn Ponds", "Warrnambool"];
    case "ballaratRegionalGroup":
      return ["Ararat", "Maryborough"];
    case "bendigoRegionalGroup":
      return ["Swan Hill", "Echuca"];
    case "seymourRegionalGroup":
      return ["Shepparton", "Albury"];
    case "traralgonRegionalGroup":
      return ["Bairnsdale"];
    case "metroTunnelServices":
      return [new Date().getMinutes() % 4 === 0 ? "Munnel" : "Metro Tunnel"];
    case "burnleyGroup":
      return ["Via Burnley Loop"];
    case "cliftonHillGroup":
      return ["Via Clifton Hill Loop"];
    case "caulfieldGroup":
      return ["Via Caulfield Loop", "Continues to Stony Point (shuttle)"];
    case "frankstonGroup":
      return ["Branch off Frankston"];
    case "upfieldCraigieburn":
      return ["Via Northern Loop"];
    default:
      return [];
  }
}










