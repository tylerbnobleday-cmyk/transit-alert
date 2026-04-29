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
import { fetchLiveTrains, type LiveTrain } from "@/lib/live-trains";
import { fetchLiveBuses, type LiveBus } from "@/lib/live-buses";
import { findStationCoordinate } from "@/lib/station-coordinates";
import { fetchConsistSnapshot, type ConsistSnapshot } from "@/lib/transportvic-bot";
import { fetchMarkerOverrides, saveMarkerOverrides, type MarkerOverride } from "@/lib/marker-overrides";
import { DEFAULT_TRANSPORT_MODES } from "@/lib/preferences";
import {
  Train,
  MapPin,
  Layers,
  AlertTriangle,
  Clock,
  Info,
  ZoomIn,
  ZoomOut,
  ArrowRight,
  ExternalLink,
  Navigation,
} from "lucide-react";

const MELBOURNE_CENTER: [number, number] = [-37.8136, 144.9631];
const SOUTHERN_CROSS_POSITION: [number, number] = [-37.818313906129944, 144.95218];
const FEATURED_CONSIST = "430M";
const FLAGSTAFF_POSITION: [number, number] = [-37.81145, 144.9562];
const MELBOURNE_CENTRAL_POSITION: [number, number] = [-37.80955, 144.96278];
const MELBOURNE_CENTRAL_STATE_LIBRARY_INTERCHANGE: [number, number] = [-37.80995575690716, 144.96286];
const STATE_LIBRARY_POSITION: [number, number] = [-37.80941962893699, 144.96324300865265];
const TOWN_HALL_POSITION: [number, number] = [-37.816897881552016, 144.96717135795797];
const CITY_LOOP_PILL_STATIONS = new Set([
  "Flinders Street",
  "Southern Cross",
  "Flagstaff",
  "Melbourne Central",
  "Parliament",
  "State Library",
  "Town Hall",
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

function createCityLoopPillIcon(strokeColor: string, stationName: string) {
  const isHorizontalPill =
    stationName === "Parliament" ||
    stationName === "Southern Cross" ||
    stationName === "State Library" ||
    stationName === "Town Hall";
  const isCompactHorizontalPill = stationName === "State Library";
  const isCombinedCentralLibrary = stationName === "Melbourne Central / State Library";

  if (isCombinedCentralLibrary) {
    return L.divIcon({
html: `
  <div style="position:relative;width:30px;height:58px; transform: rotate(-12deg); transform-origin: center;">
    
    <div style="position:absolute;left:11px;top:14px;width:8px;height:38px;border-radius:9999px;background:#f8fafc;border:2px solid rgba(15,23,42,0.96);box-shadow:0 3px 8px rgba(0,0,0,0.36);overflow:hidden;">
      <div style="position:absolute;top:3px;bottom:3px;left:2px;width:2px;border-radius:9999px;background:${strokeColor};opacity:0.95;"></div>
    </div>

    <div style="position:absolute;left:12px;top:9px;width:9px;height:9px;border-radius:9999px;background:#f8fafc;border:2px solid rgba(15,23,42,0.96);transform:rotate(45deg);box-shadow:0 3px 8px rgba(0,0,0,0.36);"></div>

    <div style="position:absolute;left:16px;top:0;width:14px;height:8px;border-radius:9999px;background:#f8fafc;border:2px solid rgba(15,23,42,0.96);box-shadow:0 3px 8px rgba(0,0,0,0.36);"></div>

  </div>
`,
      className: "bg-transparent border-none",
      iconSize: [30, 58],
      iconAnchor: [15, 29],
      popupAnchor: [0, -18],
    });
  }

  return L.divIcon({
    html: `
      <div style="display:flex;align-items:center;justify-content:center;width:${isHorizontalPill ? (isCompactHorizontalPill ? "28px" : "34px") : "14px"};height:${isHorizontalPill ? (isCompactHorizontalPill ? "14px" : "16px") : "34px"};">
        <div style="width:${isHorizontalPill ? (isCompactHorizontalPill ? "22px" : "28px") : "8px"};height:${isHorizontalPill ? (isCompactHorizontalPill ? "7px" : "8px") : "28px"};border-radius:9999px;background:#f8fafc;border:2px solid rgba(15,23,42,0.96);box-shadow:0 3px 8px rgba(0,0,0,0.36);position:relative;overflow:hidden;">
          <div style="position:absolute;${isHorizontalPill ? `left:${isCompactHorizontalPill ? "2px" : "3px"};right:${isCompactHorizontalPill ? "2px" : "3px"};top:1px;height:2px;` : "top:3px;bottom:3px;left:1px;width:2px;"}border-radius:9999px;background:${strokeColor};opacity:0.95;"></div>
        </div>
      </div>
    `,
    className: "bg-transparent border-none",
    iconSize: isHorizontalPill ? (isCompactHorizontalPill ? [28, 14] : [34, 16]) : [14, 34],
    iconAnchor: isHorizontalPill ? (isCompactHorizontalPill ? [14, 7] : [17, 8]) : [7, 17],
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

interface MapProps {
  journeyRoute?: Station[];
  splitCrossCityGroup?: boolean;
  transportModes?: TransportMode[];
  onTransportModesChange?: (modes: TransportMode[]) => void;
  persistedLayerState?: Partial<LayerState>;
  onLayerStateChange?: (layers: LayerState) => void;
  isAdmin?: boolean;
  showFilterRail?: boolean;
  focusedVehicleKey?: string | null;
  onFocusedVehicleHandled?: () => void;
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
  inspectors: boolean;
  delays: boolean;
  incidents: boolean;
  heatCircles: boolean;
}

export type ServiceFilterKey =
  | "vline"
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

function createLiveTrainIcon(vehicle: LiveTrain) {
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
  const outerSize = isTrackedConsist ? 68 : 54;
  const innerSize = isTrackedConsist ? 34 : 26;
  const badgeLabel = isTrackedConsist ? "430M" : getDisplayConsist(vehicle.tdn) ?? vehicle.tdn;
  const destinationLabel = vehicle.destination
    .replace(/\bStreet\b/gi, "St")
    .replace(/\bStation\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18);

  return L.divIcon({
    html: `
      <div style="position:relative;width:${outerSize}px;height:${outerSize}px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:${isTrackedConsist ? "0.28" : "0.22"};animation:ping 2s infinite;"></div>
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
          border:${isTrackedConsist ? "3px" : "2px"} solid white;
          box-shadow:${isTrackedConsist ? "0 6px 18px rgba(0,0,0,0.72)" : "0 4px 14px rgba(0,0,0,0.6)"};
          display:flex;
          align-items:center;
          justify-content:center;
          color:white;
          font-size:${isTrackedConsist ? "16px" : "13px"};
          font-weight:700;
          transform: rotate(${rotation}deg);
        ">
          ${arrow}
        </div>

        <div style="
          position:absolute;
          top:${isTrackedConsist ? "-10px" : "-8px"};
          left:50%;
          transform:translateX(-50%);
          background:#0f172a;
          color:white;
          font-size:${isTrackedConsist ? "10px" : "9px"};
          font-weight:700;
          padding:${isTrackedConsist ? "3px 6px" : "2px 5px"};
          border-radius:6px;
          border:1px solid rgba(255,255,255,0.15);
          box-shadow:0 4px 10px rgba(0,0,0,0.4);
          white-space:nowrap;
        ">
          ${badgeLabel}
        </div>
        <div style="
          position:absolute;
          left:50%;
          bottom:${isTrackedConsist ? "-18px" : "-16px"};
          transform:translateX(-50%);
          background:rgba(15,23,42,0.92);
          color:white;
          font-size:${isTrackedConsist ? "10px" : "9px"};
          font-weight:700;
          padding:${isTrackedConsist ? "3px 7px" : "2px 6px"};
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
    key: "vline",
    category: "regional",
    label: "V/Line",
    description: "Regional network",
    tone: "bg-purple-500/15 border-purple-400/30 text-purple-200",
  },
  {
    key: "metroTunnelServices",
    category: "special",
    label: "Metro Tunnel",
    description: "Sunbury, Cranbourne, Pakenham",
    tone: "bg-[#279FD5]/15 border-[#279FD5]/40 text-[#b8e7fb]",
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

// =========================
// Station Data
// =========================
const MERNDA_STATIONS: Station[] = [
  { name: "Flinders Street", position: [-37.8184161, 144.9664779] },
  { name: "Jolimont", position: [-37.8163, 144.9840] },
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
  { name: "Jolimont", position: [-37.8163, 144.9840] },
  { name: "Flinders Street", position: [-37.8184161, 144.9664779] },
  { name: "Southern Cross", position: [-37.8176, 144.9522] },
  { name: "Flagstaff", position: [-37.81196029877101, 144.9566610145156] },
  { name: "Melbourne Central", position: [-37.8101, 144.9626] },
  { name: "Parliament", position: [-37.81123787494798, 144.97303582934072] },
  { name: "Jolimont", position: [-37.8163, 144.9840] },
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

const UPFIELD_STATIONS: Station[] = [
  { name: "Upfield", position: [-37.6699, 144.9501] },
  { name: "Gowrie", position: [-37.7000, 144.9434] },
  { name: "Fawkner", position: [-37.7149, 144.9608] },
  { name: "Merlynston", position: [-37.7209, 144.9617] },
  { name: "Batman", position: [-37.7334, 144.9613] },
  { name: "Coburg", position: [-37.7428, 144.9638] },
  { name: "Moreland", position: [-37.7549, 144.9619] },
  { name: "Anstey", position: [-37.7614, 144.9608] },
  { name: "Brunswick", position: [-37.7677, 144.9587] },
  { name: "Jewell", position: [-37.7740, 144.9574] },
  { name: "Royal Park", position: [-37.7817, 144.9523] },
  { name: "Flemington Bridge", position: [-37.7888, 144.9390] },
  { name: "Macaulay", position: [-37.7943, 144.9364] },
  { name: "North Melbourne", position: [-37.8073, 144.9426] },
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
  { name: "East Richmond", position: [-37.8260, 145.0007] },
  { name: "Burnley", position: [-37.8270, 145.0074] },
  { name: "Heyington", position: [-37.8347, 145.0240] },
  { name: "Kooyong", position: [-37.8401, 145.0337] },
  { name: "Tooronga", position: [-37.8415, 145.0428] },
  { name: "Gardiner", position: [-37.8534, 145.0446] },
  { name: "Glen Iris", position: [-37.8597, 145.0501] },
  { name: "Darling", position: [-37.8675, 145.0604] },
  { name: "East Malvern", position: [-37.8761, 145.0695] },
  { name: "Holmesglen", position: [-37.8747, 145.0866] },
  { name: "Jordanville", position: [-37.8735, 145.1025] },
  { name: "Mount Waverley", position: [-37.8769, 145.1291] },
  { name: "Syndal", position: [-37.8756, 145.1472] },
  { name: "Glen Waverley", position: [-37.8794, 145.1633] },
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
const BURNLEY_LOOP: [number, number][] = [
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
  { name: "Flinders Street", position: [-37.8184161, 144.9664779] },
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

// =========================
// Polyline Data
// =========================
const MELBOURNE_CENTRAL_TO_STATE_LIBRARY: [number, number][] = [
  [-37.8101, 144.9626],
  [-37.8117, 144.9629],
];
const CLIFTON_HILL_POSITION: [number, number] = [-37.78831003762462, 144.9955664605472];

const CAUFIELD_LOOP: [number, number][] = [
  [-37.8181727321212, 144.9775078452675], // last point
  [-37.81768238193436, 144.9769297210735], //  richmond portal cfd 
  [-37.81746731800017, 144.97667222901444],
  [-37.81686605500994, 144.97604932173275],
  [-37.81623674589375, 144.97549946888685],
  [-37.81560107467396, 144.9750569043993],
  [-37.8146221302977, 144.9746103166069],
  [-37.8136177452875, 144.97416238769392],
  [-37.81266738107811, 144.97371982320394],
  [-37.81135153908839, 144.97310562093975], // parliment station 
  [-37.8097774115991, 144.9723515455121],
  [-37.808744134445945, 144.97188076367107],
  [-37.80832878772909, 144.97139260164244],
  [-37.807998203978606, 144.9706362187189],
  [-37.807934630000915, 144.96947213999889], // cureve 12
  [-37.80854493784609, 144.9671010672232],
  [-37.8098884449785, 144.96247693886204], //  Melbourne Centreral Stzatiopn
  [-37.81174049518193, 144.9561415611667], // FLAGstaff station 
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
[-37.819702844842155, 144.96130771961023], // Southern Cross Via Duct Curve 12
[-37.819561944810225, 144.96199034180128], // Southern Cross Via Duct Curve 13
[-37.81938608424239, 144.96263273086195], // Southern Cross Via Duct Curve 14
[-37.819158312401186, 144.96355675186595], // Southern Cross Via Duct Curve 15
[-37.81896761915805, 144.96448747839776],
[-37.81871971720591, 144.96543429817373],
[-37.81857139939793, 144.9660082909082], // Flinders Street 
];
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
  [-37.81335215689385, 144.9507340157454], // Flagstaff area

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
  [-37.81778485426324, 144.96826388056115], // Jolimont / MCG side
  [-37.8184161, 144.9664779], // eastern portal (toward Richmond / Flinders)

  // swing back west toward Flinders Street
  [-37.819578159795725, 144.9610791331353], // viaduct toward Flinders

  // continue west back toward Southern Cross
  [-37.82109536715535, 144.95707701757522], // Flinders → Southern Cross curve
 [-37.821328429885675, 144.95581637936937],
  [-37.8211906937223, 144.95500906362312], // viaduct mid-section
   [-37.82098307302916, 144.95440017298998],
  [-37.81973721503802, 144.95279892337976], // approaching Southern Cross
  [-37.81934099941143, 144.9524609650515], // Southern Cross approach
  [-37.816853698443914, 144.95049612250577],
  [-37.81621957350685, 144.94995894904764], // last plit off of cfd and nrthn 
[-37.81219780049446, 144.9464798395072],
];
const SANDRINGHAM_LINE: [number, number][] = [
  [-37.818821008246935, 144.96515822429285], // Flinders Street
  [-37.81835676092435, 144.96680614367563],
  [-37.81818831342351, 144.96738684195435],
  [-37.81760105905219, 144.9693011010421],
  [-37.817251447015174, 144.97037800795056],
  [-37.81701469145709, 144.97145403934510],
  [-37.81689547670335, 144.97178214437636],
  [-37.81680860273319, 144.97319298632365],
  [-37.81709253191024, 144.97503700501213],
  [-37.81755762249785, 144.9762976432565],
  [-37.817884985183525, 144.9769521022641],
  [-37.81840304161592, 144.97781711467150],
  [-37.81914992638664, 144.97898924001413],
  [-37.820086435044686, 144.9804389739665],
  [-37.820795612786206, 144.98150645039166],
  [-37.82134372863181, 144.98236427924510],
  [-37.82233635555369, 144.9841989101896],
  [-37.82239792870241, 144.9843463614976],
  [-37.82285451103584, 144.98566198503144],
  [-37.8232686852728, 144.9869941790775],
  [-37.82381954341726, 144.9891573806168], // Richmond

  // South Yarra → Richmond curves
  [-37.825565758588816, 144.99270326773168], // Richmond to South Yarra curve
  [-37.82548101345592, 144.99258525053799], // Richmond to South Yarra curve 2
  [-37.827184389560315, 144.99390491980614], // Richmond to South Yarra curve 3
  [-37.83209166656431, 144.9935008513864], // Richmond to South Yarra curve 4
  [-37.83444244894703, 144.9930213092438], // Richmond to South Yarra curve 5
  [-37.83566353672182, 144.9928552912536], // Richmond to South Yarra curve 6
  [-37.83874201898154, 144.99204952288912], // South Yarra
  [-37.839008708445924, 144.99201319177607], // South Yarra bridge
  [-37.83922265048852, 144.9919246788808], // South Yarra entrance curve
  [-37.83981681301816, 144.99176776965538], // South Yarra entrance curve 2
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
  [-37.8163, 144.9840], // Jolimont
    [-37.815808751063095, 144.9778546912331],
    [-37.815624405906064, 144.9750759227291],// exiting Parliament
  [-37.815743064919, 144.97438123057663], 
  [-37.81632152482936, 144.97277458741638], // Parliament -> Jolimont curve
  [-37.81778485426324, 144.96826388056115], // Jolimont / MCG side
  [-37.8184161, 144.9664779], // Flinders Street
  [-37.81962871794242, 144.96119376026797],
  [-37.82032716362383, 144.9590835338242],
  [-37.82129915764358, 144.95648876990828],
  [-37.8212396948123, 144.95500037577344],
  [-37.820114282704075, 144.95311576000708],
  [-37.819330859301594, 144.95242620896954], // Southern Cross
  [-37.81764785079244, 144.95110717843116],
  [-37.81599729363393, 144.94993645307727],
  [-37.814110931438485, 144.94997936721836],
  [-37.81335866395033, 144.9505774926714],
  [-37.81336091942794, 144.950829264709],
  [-37.811699102585074, 144.95654834454922], // Flagstaff
  [-37.809961702457514, 144.9625342832056], // Melbourne Central
  [-37.80852193098466, 144.96753397933662],
  [-37.808050963795516, 144.96916411750817],
  [-37.80799744851422, 144.96995772619195],
  [-37.808358272498175, 144.9713049058432],
  [-37.80874077936197, 144.97177965092897],
  [-37.809237048952674, 144.97205260610428],
  [-37.81138709188395, 144.97306243861945], // Parliament
  [-37.81418344412575, 144.97439498748966],
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
[-37.8413712064182, 144.99381416666222],
[-37.84074027756291, 144.99277197708855],
[-37.84014541175312, 144.9924065225265],
[-37.839508877221995, 144.9922573545601],
[-37.83900452634713, 144.99223852217295],
[-37.83848509035401, 144.99226495747362], // South Yarra

// smooth northbound run after South Yarra
[-37.837600, 144.992620],
[-37.836700, 144.992780],
[-37.835700, 144.992950],
[-37.834600, 144.993100],
[-37.833300, 144.993280],
[-37.83209166656431, 144.993450],
[-37.830200, 144.993680],
[-37.828400, 144.993900],
[-37.827184389560315, 144.994050],

// gentle curve into Richmond
[-37.826300, 144.993700],
[-37.825600, 144.993200],
[-37.824800, 144.992100],
[-37.824200, 144.990700],
[-37.82381492722702, 144.989400], // Richmond

[-37.823516110116486, 144.98802759456223],
[-37.82230421180452, 144.98414375600464],
[-37.82112098337264, 144.9820521293735],
[-37.8196908100639, 144.97988356338206],
[-37.818742642858254, 144.9783909140706],
[-37.818423759304906, 144.97790945754892],
[-37.81817605752223, 144.9775121630495],
[-37.81794590442121, 144.97726539063947], // end of tight curve

// continue smooth toward Flinders
[-37.81755762249785, 144.9762976432565],
[-37.81709253191024, 144.97503700501213],
[-37.81680860273319, 144.97319298632365],
[-37.81701469145709, 144.97145403934510],
[-37.817251447015174, 144.97037800795056],
[-37.81760105905219, 144.9693011010421],
[-37.81818831342351, 144.96738684195435],
[-37.81835676092435, 144.96680614367563],

[-37.818821008246935, 144.96515822429285], // Flinders Street

];
const CRANBOURNE_LINE = CRANBOURNE_STATIONS.map((station) => station.position);
const PAKENHAM_LINE = PAKENHAM_STATIONS.map((station) => station.position);
const PAKENHAM_PRE_HAWKSBURN_LINE = PAKENHAM_STATIONS.slice(
  0,
  PAKENHAM_STATIONS.findIndex((station) => station.name === "Hawksburn") + 1,
).map((station) => station.position);
const PAKENHAM_POST_HAWKSBURN_LINE = PAKENHAM_STATIONS.slice(
  PAKENHAM_STATIONS.findIndex((station) => station.name === "Hawksburn"),
).map((station) => station.position);
const SUNBURY_LINE = SUNBURY_STATIONS.map((station) => station.position);
const LILYDALE_LINE = LILYDALE_STATIONS.map((station) => station.position);
const BELGRAVE_LINE = BELGRAVE_STATIONS.map((station) => station.position);
const ALAMEIN_LINE = ALAMEIN_STATIONS.map((station) => station.position);
const GLEN_WAVERLEY_LINE = GLEN_WAVERLEY_STATIONS.map((station) => station.position);
const METRO_TUNNEL_LINE = METRO_TUNNEL_STATIONS.map((station) => station.position);
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
].filter(
  (station, index, array) =>
    array.findIndex((item) => item.name === station.name) === index
);

const ANYTRIP_SURFACE_STOPS: SurfaceStop[] = [
  {
    id: "au3:6204",
    name: "Hawthorn Rd/North Rd",
    locality: "Caulfield South",
    position: [-37.90128, 145.01994],
    subtitle: "630 bus stop",
    modes: ["bus"],
    routeLabel: "630",
    departures: [
      { route: "630", destination: "Monash University", departureLabel: "3 min", statusLabel: "Scheduled", note: "Via Ormond" },
      { route: "630", destination: "Elwood", departureLabel: "14 min", statusLabel: "Scheduled", note: "Local stopping" },
      { route: "630", destination: "Monash University", departureLabel: "27 min", statusLabel: "Scheduled", note: "Via North Rd" },
    ],
  },
  {
    id: "au3:7148",
    name: "Hawthorn Rd/North Rd",
    locality: "Brighton East",
    position: [-37.90141, 145.01875],
    subtitle: "630 bus stop",
    modes: ["bus"],
    routeLabel: "630",
    departures: [
      { route: "630", destination: "Elwood", departureLabel: "4 min", statusLabel: "Scheduled", note: "Via Hawthorn Rd" },
      { route: "630", destination: "Monash University", departureLabel: "12 min", statusLabel: "Scheduled", note: "Cross-town service" },
      { route: "630", destination: "Elwood", departureLabel: "24 min", statusLabel: "Scheduled", note: "Local stopping" },
    ],
  },
  {
    id: "au3:19004",
    name: "North Rd/Hawthorn Rd #63",
    locality: "Caulfield South",
    position: [-37.9012, 145.01933],
    subtitle: "Route 64 tram stop",
    modes: ["tram"],
    routeLabel: "64",
    departures: [
      { route: "64", destination: "Melbourne University", departureLabel: "2 min", statusLabel: "Tram due", note: "Northbound" },
      { route: "64", destination: "East Brighton", departureLabel: "9 min", statusLabel: "Scheduled", note: "Southbound" },
      { route: "64", destination: "Melbourne University", departureLabel: "15 min", statusLabel: "Scheduled", note: "Via St Kilda Rd" },
    ],
  },
  {
    id: "au3:18417",
    name: "North Rd/Hawthorn Rd #63",
    locality: "Brighton East",
    position: [-37.90157, 145.01907],
    subtitle: "Route 64 tram stop",
    modes: ["tram"],
    routeLabel: "64",
    departures: [
      { route: "64", destination: "East Brighton", departureLabel: "1 min", statusLabel: "Tram due", note: "Southbound" },
      { route: "64", destination: "Melbourne University", departureLabel: "7 min", statusLabel: "Scheduled", note: "Northbound" },
      { route: "64", destination: "East Brighton", departureLabel: "13 min", statusLabel: "Scheduled", note: "Via Hawthorn Rd" },
    ],
  },
  {
    id: "au3:19003",
    name: "Taylor St/Hawthorn Rd #64",
    locality: "Brighton East",
    position: [-37.90378, 145.01881],
    subtitle: "Route 64 tram stop",
    modes: ["tram"],
    routeLabel: "64",
    departures: [
      { route: "64", destination: "East Brighton", departureLabel: "5 min", statusLabel: "Scheduled", note: "Southbound" },
      { route: "64", destination: "Melbourne University", departureLabel: "11 min", statusLabel: "Scheduled", note: "Northbound" },
      { route: "64", destination: "East Brighton", departureLabel: "19 min", statusLabel: "Scheduled", note: "Local stopping" },
    ],
  },
];

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
  services: Array<{
    scheduledTime: string;
    destination: string;
    via: string;
    minuteBadge: string;
  }>;
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
    title: "Metro outbound",
    accent: "bg-blue-500",
    services: [
      {
        scheduledTime: "09:42",
        destination: "Williamstown",
        via: "Stops all via Newport",
        minuteBadge: "3 min",
      },
      {
        scheduledTime: "09:47",
        destination: "Craigieburn",
        via: "Stops all via North Melbourne",
        minuteBadge: "8 min",
      },
      {
        scheduledTime: "09:52",
        destination: "Sandringham",
        via: "Stops all via Flinders Street",
        minuteBadge: "13 min",
      },
      {
        scheduledTime: "09:56",
        destination: "Sunbury",
        via: "Metro Tunnel service",
        minuteBadge: "17 min",
      },
    ],
  },
  {
    title: "Regional & coaches",
    accent: "bg-[#7d5cff]",
    services: [
      {
        scheduledTime: "09:52",
        destination: "Traralgon",
        via: "V/Line via Pakenham corridor",
        minuteBadge: "13 min",
      },
      {
        scheduledTime: "10:12",
        destination: "Southern Cross coach bay",
        via: "Coach connection boarding",
        minuteBadge: "33 min",
      },
      {
        scheduledTime: "10:18",
        destination: "Albury / Sydney XPT",
        via: "Long-distance platform call",
        minuteBadge: "39 min",
      },
      {
        scheduledTime: "Live",
        destination: "Replacement buses",
        via: "Check active disruptions and coach bays",
        minuteBadge: "Now",
      },
    ],
  },
];

const SOUTHERN_CROSS_PLATFORM_1_SERVICES = [
  {
    runId: "622",
    destination: "Central",
    lineLabel: "7(X)",
    consist: "ST22",
    departureLabel: "7:50pm",
    dayLabel: "Tonight",
    statusLabel: "Timetabled",
  },
  {
    runId: "624",
    destination: "Central",
    lineLabel: "7(X)",
    consist: "ST24",
    departureLabel: "8:30am",
    dayLabel: "Tomorrow",
    statusLabel: "Timetabled",
  },
  {
    runId: "622",
    destination: "Central",
    lineLabel: "7(X)",
    consist: "ST22",
    departureLabel: "7:50pm",
    dayLabel: "Tomorrow",
    statusLabel: "Timetabled",
  },
];

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
    inboundServices: ["City Loop", "Flinders Street"],
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

  return details.length ? details.join(" · ") : "Metro station";
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
              <div className="min-w-0">
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
                  {primaryService.tdnLabel && (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 font-semibold text-slate-700">
                      {primaryService.tdnLabel}
                    </span>
                  )}
                  <span>{primaryService.statusLabel ?? "Scheduled"}</span>
                </div>
              </div>
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
                <div
                  key={`${platform.platform}-${service.destination}-${index}`}
                  className="grid gap-3 border-l-[6px] border-l-[#279FD5] border-t border-black/15 pt-3 first:border-t-0 first:pt-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
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
                      {service.tdnLabel && (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 font-semibold text-slate-700">
                          {service.tdnLabel}
                        </span>
                      )}
                      <span>{service.statusLabel ?? "Scheduled"}</span>
                    </div>
                  </div>
                  <div className="shrink-0 bg-black px-4 py-2 text-[2rem] font-semibold leading-none text-white shadow-[0_6px_16px_rgba(0,0,0,0.25)]">
                    {formatMetroTunnelCountdown(service, index === 0 ? "13 min" : "24 min")}
                  </div>
                </div>
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
                      {service.tdnLabel}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/85">
                  {service.etaLabel}
                </span>
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
) {
  return stations.map((station) => {
    const resolvedStation = resolveStation(station);
    const isCityLoopPill = CITY_LOOP_PILL_STATIONS.has(resolvedStation.name);
    const isSharedCaulfieldMetroStation = CAULFIELD_METRO_SHARED_STATIONS.has(resolvedStation.name);
    const shouldRenderOnce =
      SINGLE_RENDER_STATIONS.has(resolvedStation.name) || isSharedCaulfieldMetroStation;
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
          zIndexOffset={900}
          eventHandlers={{
            click: () => onSelectStation(resolvedStation),
          }}
        >
          <Popup>
            <div className="p-3 w-48">
              <p className="font-semibold text-white">{markerName}</p>
              <p className="text-xs text-white/60 mt-1">
                {getStationDetails(resolvedStation)}
              </p>
            </div>
          </Popup>
        </Marker>
      );
    }

    return (
      <CircleMarker
        key={`${station.name}-${station.position[0]}-${station.position[1]}`}
        center={resolvedStation.position}
        radius={5}
        pathOptions={{
          color: isSharedCaulfieldMetroStation ? "#0f172a" : strokeColor,
          fillColor: isSharedCaulfieldMetroStation ? "#ffffff" : fillColor,
          fillOpacity: 1,
          weight: isSharedCaulfieldMetroStation ? 3 : 2,
        }}
        eventHandlers={{
          click: () => onSelectStation(resolvedStation),
        }}
      >
        <Popup>
          <div className="p-3 w-48">
            <p className="font-semibold text-white">{resolvedStation.name}</p>
            <p className="text-xs text-white/60 mt-1">
              {getStationDetails(resolvedStation)}
            </p>
          </div>
        </Popup>
      </CircleMarker>
    );
  });
}

function renderRouteStopMarkers(
  stops: Array<{ name: string; position: [number, number] }>,
  fillColor: string,
  strokeColor: string,
  subtitle: string,
) {
  return stops.map((stop) => (
    <CircleMarker
      key={`${stop.name}-${stop.position[0]}-${stop.position[1]}`}
      center={stop.position}
      radius={4}
      pathOptions={{
        color: strokeColor,
        fillColor,
        fillOpacity: 0.95,
        weight: 2,
      }}
    >
      <Popup>
        <div className="p-3 w-48">
          <p className="font-semibold text-white">{stop.name}</p>
          <p className="text-xs text-white/60 mt-1">{subtitle}</p>
        </div>
      </Popup>
    </CircleMarker>
  ));
}

function renderSurfaceStops(
  stops: SurfaceStop[],
  fillColor: string,
  strokeColor: string,
  onSelect: (stop: SurfaceStop) => void,
) {
  return stops.map((stop) => (
    <CircleMarker
      key={stop.id}
      center={stop.position}
      radius={5}
      pathOptions={{
        color: strokeColor,
        fillColor,
        fillOpacity: 0.98,
        weight: 2,
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

function formatRouteWindow(time?: string | null) {
  if (!time) {
    return "Unknown";
  }

  return time.slice(0, 5);
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

function getVehicleServiceSummary(vehicle: LiveTrain) {
  const route = vehicle.serviceDescription?.trim();
  if (route) {
    return route;
  }

  return `${vehicle.line} to ${vehicle.destination}`.trim();
}

function getVehicleOriginFallback(vehicle: LiveTrain) {
  const summary = getVehicleServiceSummary(vehicle);
  const match = summary.match(/^(.*?)\s+to\s+(.*)$/i);
  if (match?.[1]?.trim()) {
    return match[1].trim();
  }

  if (/city|flinders street|southern cross/i.test(vehicle.destination)) {
    return `${vehicle.line} line`;
  }

  return "Live position";
}

function getVehicleStoppingPattern(vehicle: LiveTrain) {
  const summary = getVehicleServiceSummary(vehicle);
  if (/ to /i.test(summary)) {
    return summary;
  }

  return `${vehicle.line} line service to ${vehicle.destination}`;
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

  if (/HCMT/.test(upperTrainType) || /HCMT/.test(upperConsist) || /HCMT/.test(joinedCars)) {
    family = "HCMT";
  } else if (/SIEMENS/.test(upperTrainType) || /25\d{2}T/.test(joinedCars) || /7\d{2}M|8\d{2}M/.test(joinedCars)) {
    family = "Siemens Nexas";
  } else if (/X['’]?TRAPOLIS|XTRAPOLIS/.test(upperTrainType) || /13\d{2}T|14\d{2}T|16\d{2}T/.test(joinedCars)) {
    family = "X’Trapolis 100";
  } else if (/COMENG/.test(upperTrainType) || /10\d{2}T|11\d{2}T/.test(joinedCars) || /3\d{2}M|4\d{2}M|5\d{2}M|6\d{2}M/.test(joinedCars)) {
    family = inferComengVariant(vehicle);
  }

  return {
    family,
    cars: inferredCarCount,
  };
}

function getVehicleDisplayType(vehicle: LiveTrain) {
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
  showFilterRail = true,
  focusedVehicleKey = null,
  onFocusedVehicleHandled,
}: MapProps = {}) {
  const mapRef = useRef<L.Map | null>(null);
  const lastEmittedLayerStateRef = useRef<LayerState | null>(null);
  const consistData = { active: false } as any;

  const { data } = useGetReports({
    query: { refetchInterval: 30000 },
  });

  const {
    data: liveVehicles = [],
    isLoading: isLiveTrainsLoading,
    error: liveTrainsError,
  } = useQuery({
    queryKey: ["/api/ptv/live-trains"],
    queryFn: fetchLiveTrains,
    refetchInterval: 15000,
    retry: false,
  });
  const {
    data: liveBuses = [],
    isLoading: isLiveBusesLoading,
  } = useQuery({
    queryKey: ["/api/ptv/live-buses"],
    queryFn: fetchLiveBuses,
    refetchInterval: 15000,
    retry: false,
  });
  const { data: featuredConsistSnapshot } = useQuery({
    queryKey: ["consist-snapshot", FEATURED_CONSIST, "featured-marker"],
    queryFn: () => fetchConsistSnapshot(FEATURED_CONSIST),
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
  const selectedVehicle = selectedDetail?.type === "vehicle" ? selectedDetail.vehicle : null;
  const selectedSurfaceStop = selectedDetail?.type === "surfaceStop" ? selectedDetail.stop : null;
  const selectedVehicleSnapshotConsist = selectedVehicle ? getSnapshotConsistId(selectedVehicle.consist) : null;
  const { data: selectedVehicleSnapshot } = useQuery({
    queryKey: ["consist-snapshot", selectedVehicleSnapshotConsist],
    queryFn: () => fetchConsistSnapshot(selectedVehicleSnapshotConsist!),
    enabled: Boolean(selectedVehicleSnapshotConsist),
    refetchInterval: 30000,
    retry: false,
  });
  const selectedVehicleOriginLabel = selectedVehicle
    ? selectedVehicleSnapshot?.current_trip?.origin ??
      selectedVehicleSnapshot?.next_trip?.origin ??
      getVehicleOriginFallback(selectedVehicle)
    : "";
  const selectedVehicleDestinationLabel = selectedVehicle
    ? selectedVehicleSnapshot?.current_trip?.destination ??
      selectedVehicleSnapshot?.next_trip?.destination ??
      selectedVehicle.destination
    : "";
  const selectedVehiclePatternLabel = selectedVehicle
    ? selectedVehicleSnapshot?.current_trip
      ? `${selectedVehicleSnapshot.current_trip.origin} to ${selectedVehicleSnapshot.current_trip.destination}`
      : selectedVehicleSnapshot?.next_trip
        ? `Next: ${selectedVehicleSnapshot.next_trip.origin} to ${selectedVehicleSnapshot.next_trip.destination}`
        : getVehicleStoppingPattern(selectedVehicle)
    : "";
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
  const regularLiveVehicles = useMemo(
    () => liveVehicles.filter((vehicle) => vehicle.consist !== FEATURED_CONSIST),
    [liveVehicles],
  );
  const selectedSurfaceStopLiveBuses = useMemo(() => {
    if (!selectedSurfaceStop || !selectedSurfaceStop.modes.includes("bus")) {
      return [];
    }

    return liveBuses
      .map((bus) => ({
        bus,
        distanceMetres: getDistanceInMetres(selectedSurfaceStop.position, [bus.lat, bus.lng]),
      }))
      .filter(({ bus, distanceMetres }) => bus.route === selectedSurfaceStop.routeLabel && distanceMetres <= 3000)
      .sort((left, right) => left.distanceMetres - right.distanceMetres)
      .slice(0, 4);
  }, [liveBuses, selectedSurfaceStop]);
  const [isMarkerEditMode, setIsMarkerEditMode] = useState(false);
  const [draftMarkerOverrides, setDraftMarkerOverrides] = useState<Record<string, MarkerOverride>>({});

  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
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
  inspectors: true,
  delays: true,
  incidents: true,
  heatCircles: true,
});

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

  const renderedStationKeys = new Set<string>();

  const toggleServiceFilter = useCallback((filter: ServiceFilterKey) => {
    setLayers((prev) => {
      switch (filter) {
        case "vline":
          return prev;
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
  }, []);

  const isServiceFilterActive = useCallback((filter: ServiceFilterKey) => {
    switch (filter) {
      case "vline":
        return false;
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
  }, [layers]);

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
    : isLiveTrainsLoading
      ? "Loading live trains"
      : liveVehicles.length > 0
        ? `${liveVehicles.length} live train${liveVehicles.length === 1 ? "" : "s"} on map`
        : "No active trains returned right now";
  const liveTrainStatusDetail = hasLiveTrainFeedError
    ? liveTrainsErrorMessage
    : "Tap a train marker or use the planner live list to jump straight into trip tracking.";
  const shouldShowBusStopFallback = !isLiveBusesLoading && liveBuses.length === 0;
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
      positions={offsetPolylineCoordinates(CAUFIELD_LOOP, "right", 0.72)}
      pathOptions={{ color: "#22c55e", weight: 5, opacity: 0.9 }}
 />
    <Polyline
      positions={FRANKSTON_TRACK}
      pathOptions={{ color: "#22c55e", weight: 5, opacity: 0.9 }}
    />
    {renderStationMarkers(renderedStationKeys, FRANKSTON_STATIONS, "#22c55e", "#16a34a", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
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
      positions={offsetPolylineCoordinates(HURSTBRIDGE_BRANCH_LINE, "left", 0.45)}
      pathOptions={{ color: "#BE1014", weight: 5, opacity: 0.85 }}
    />
    <Polyline
      positions={offsetPolylineCoordinates(HURSTBRIDGE_BRANCH_LINE, "right", 0.45)}
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
      positions={offsetPolylineCoordinates(CLIFTONHILL_LOOP, "left", 0.14)}
      pathOptions={{ color: "#BE1014", weight: 5, opacity: 0.85 }}
    />
    {renderStationMarkers(renderedStationKeys, CLIFTONHILLGROUPLOOP_STATIONS, "#BE1014", "#BE1014", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
  </>
)}
{modeIsTrainVisible && (layers.sunburyLine || layers.craigieburnLine || layers.upfieldLine || layers.northernLoop) && (
  <>
    <Polyline
      positions={NORTHERN_LOOP}
      pathOptions={{ color: "#FFD200", weight: 5, opacity: 0.85 }}
    />
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
      positions={offsetPolylineCoordinates(LILYDALE_LINE, "left", 0.5)}
      pathOptions={{
        color: "#003A8F",
        weight: 5,
        opacity: 0.85,
      }}
    />
    <Polyline
      positions={offsetPolylineCoordinates(LILYDALE_LINE, "right", 0.5)}
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
      positions={offsetPolylineCoordinates(BELGRAVE_LINE, "left", 0.45)}
      pathOptions={{
        color: "#003A8F",
        weight: 5,
        opacity: 0.85,
      }}
    />
    <Polyline
      positions={offsetPolylineCoordinates(BELGRAVE_LINE, "right", 0.45)}
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
      positions={offsetPolylineCoordinates(ALAMEIN_LINE, "left", 0.3)}
      pathOptions={{
        color: "#003A8F",
        weight: 5,
        opacity: 0.85,
      }}
    />
    <Polyline
      positions={offsetPolylineCoordinates(ALAMEIN_LINE, "right", 0.3)}
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
      positions={offsetPolylineCoordinates(GLEN_WAVERLEY_LINE, "left", 0.35)}
      pathOptions={{
        color: "#003A8F",
        weight: 5,
        opacity: 0.85,
      }}
    />
    <Polyline
      positions={offsetPolylineCoordinates(GLEN_WAVERLEY_LINE, "right", 0.35)}
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
      positions={offsetPolylineCoordinates(CRAIGIEBURN_LINE, "left", 0.55)}
      pathOptions={{
        color: "#FFD200",
        weight: 5,
        opacity: 0.85,
      }}
    />
    <Polyline
      positions={offsetPolylineCoordinates(CRAIGIEBURN_LINE, "right", 0.55)}
      pathOptions={{
        color: "#FFD200",
        weight: 5,
        opacity: 0.85,
      }}
    />
    {renderStationMarkers(renderedStationKeys, CRAIGIEBURN_STATIONS, "#FFD200", "#cca700", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
  </>
)}

{modeIsTrainVisible && layers.upfieldLine && (
  <>
    <Polyline
      positions={offsetPolylineCoordinates(UPFIELD_LINE, "left", 0.45)}
      pathOptions={{
        color: "#FFD200",
        weight: 5,
        opacity: 0.85,
      }}
    />
    <Polyline
      positions={offsetPolylineCoordinates(UPFIELD_LINE, "right", 0.45)}
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
            {renderStationMarkers(renderedStationKeys, CRANBOURNE_STATIONS, "#279FD5", "#1e7ba8", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
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
              positions={PAKENHAM_POST_HAWKSBURN_LINE}
              pathOptions={{ color: "#279FD5", weight: 5, opacity: 0.85 }}
            />
            {renderStationMarkers(renderedStationKeys, PAKENHAM_STATIONS, "#279FD5", "#1e7ba8", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
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
        {modeIsTrainVisible && (
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
          regularLiveVehicles.map((vehicle) => (
            <Marker
              key={`${vehicle.consist}-${vehicle.tdn}`}
              position={[vehicle.lat, vehicle.lng]}
              icon={createLiveTrainIcon(vehicle)}
              zIndexOffset={1200}
              riseOnHover
              eventHandlers={{
                mousedown: () => setSelectedDetail({ type: "vehicle", vehicle }),
                touchstart: () => setSelectedDetail({ type: "vehicle", vehicle }),
                click: () => setSelectedDetail({ type: "vehicle", vehicle }),
                popupopen: () => setSelectedDetail({ type: "vehicle", vehicle }),
              }}
            />
          ))}
        {modeIsBusVisible &&
          liveBuses.map((bus) => (
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
                      ? `Updated ${formatDistanceToNow(new Date(bus.timestamp), { addSuffix: true })}`
                      : "Live feed timestamp unavailable"}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        {modeIsBusVisible &&
          shouldShowBusStopFallback &&
          renderSurfaceStops(
            ANYTRIP_SURFACE_STOPS.filter((stop) => stop.modes.includes("bus")),
            "#FF8200",
            "#FF8200",
            (stop) => setSelectedDetail({ type: "surfaceStop", stop }),
          )}
        {modeIsTramVisible &&
          renderSurfaceStops(
            ANYTRIP_SURFACE_STOPS.filter((stop) => stop.modes.includes("tram")),
            "#78BE20",
            "#78BE20",
            (stop) => setSelectedDetail({ type: "surfaceStop", stop }),
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
                      <img src={smartbusIcon} alt="" className="h-3.5 w-3.5 shrink-0 object-contain opacity-90 sm:h-4 sm:w-4" />
                    ) : mode.icon === "tram" ? (
                      <img src={tramIcon} alt="" className="h-3.5 w-3.5 shrink-0 object-contain opacity-90 sm:h-4 sm:w-4" />
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
              const isDisabled = filter.key === "vline";
              const chips = getFilterChips(filter.key);
              return (
                <div key={filter.key} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isDisabled) toggleServiceFilter(filter.key);
                    }}
                    disabled={isDisabled}
                    className={`rounded-xl border px-2 py-1.5 text-left transition sm:px-3 sm:py-2 ${
                      isDisabled
                        ? "cursor-not-allowed border-purple-400/20 bg-purple-500/8 text-purple-200/55 opacity-70"
                        : active
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
                    {isDisabled && (
                      <div className="mt-1 text-[9px] font-medium leading-3.5 text-current/65 sm:text-[10px] sm:leading-4">
                        Unavailable right now while live V/Line is still being debugged.
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-300/75">
                Train tracker
              </p>
              <p className="mt-1.5 text-[1.35rem] font-semibold leading-tight text-white">
                {selectedVehicleSnapshot?.current_trip
                  ? `${selectedVehicleSnapshot.current_trip.origin} to ${selectedVehicleSnapshot.current_trip.destination}`
                  : selectedVehicleSnapshot?.next_trip
                    ? `${selectedVehicleSnapshot.next_trip.origin} to ${selectedVehicleSnapshot.next_trip.destination}`
                    : `${selectedDetail.vehicle.line} service`}
              </p>
              <p className="mt-1 text-xs text-white/55">
                TDN {selectedVehicleSnapshot?.current_trip?.id ?? selectedVehicleSnapshot?.next_trip?.id ?? selectedDetail.vehicle.tdn}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDetail(null)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-white/70"
            >
              ×
            </button>
          </div>

          <div className="mt-3 rounded-[1.35rem] border border-cyan-400/15 bg-gradient-to-r from-cyan-500/10 to-emerald-500/8 p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
              Running service
            </p>
            <p className="mt-1.5 text-lg font-semibold leading-tight text-white">
              {selectedVehiclePatternLabel}
            </p>
            <p className="mt-1.5 text-xs text-white/65">
              {selectedVehicleSnapshot?.current_trip
                ? `Running now from ${formatRouteWindow(selectedVehicleSnapshot.current_trip.departs)} to ${formatRouteWindow(selectedVehicleSnapshot.current_trip.arrives)}`
                : selectedVehicleSnapshot?.next_trip
                  ? `Departs ${formatRouteWindow(selectedVehicleSnapshot.next_trip.departs)} and arrives ${formatRouteWindow(selectedVehicleSnapshot.next_trip.arrives)}`
                  : "Using the live feed fallback while trip-level timing is unavailable."}
            </p>
          </div>

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
              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-100">
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
                <p className="mt-1 text-sm font-semibold text-white">{getVehicleDisplayType(selectedDetail.vehicle)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Stopping pattern</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {selectedVehiclePatternLabel}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Operator</p>
                <p className="mt-1 text-sm font-semibold text-white">Metro Trains Melbourne</p>
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
                  {getVehicleDisplayType(selectedDetail.vehicle)}
                </p>
                </div>
              </div>
            </div>

            {getDisplayConsist(selectedDetail.vehicle.consist) && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                  Consist
                </p>
                <p className="mt-1.5 text-sm font-semibold text-white">
                  {getDisplayConsist(selectedDetail.vehicle.consist)}
                </p>
              </div>
            )}
          </div>

          <div className="mt-3 rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
                Position estimate
              </p>
              <p className="mt-2.5 text-sm text-white/85">
                {selectedVehicleSnapshot?.position
                  ? selectedVehicleSnapshot.position.vehicle_stop_status === "STOPPED_AT"
                    ? `Stopped at ${selectedVehicleSnapshot.position.current_stop} at ${formatRouteWindow(selectedVehicleSnapshot.position.current_stop_time)}`
                    : `Between ${selectedVehicleSnapshot.position.current_stop} and ${selectedVehicleSnapshot.position.next_stop ?? "the next stop"}`
                  : "No stop-level estimate available right now."}
              </p>
              {selectedVehicleSnapshot?.network_alerts?.length ? (
                <div className="mt-3 rounded-[1.1rem] border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-50/95">
                  {selectedVehicleSnapshot.network_alerts[0]}
                </div>
              ) : null}
          </div>
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
                        <p className="mt-1 text-lg font-semibold text-white">Platform 1</p>
                        <p className="mt-1 text-xs text-white/55">Regional departures can vary. Check platform displays.</p>
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

                    <div className="grid gap-3 lg:grid-cols-2">
                      {SOUTHERN_CROSS_DEPARTURE_BOARD.map((column) => (
                        <div
                          key={column.title}
                          className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-slate-900/85 shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
                        >
                          <div className={`h-1.5 w-full ${column.accent}`} />
                          <div className="divide-y divide-slate-800/90">
                            {column.services.map((service) => (
                              <div
                                key={`${column.title}-${service.destination}-${service.scheduledTime}`}
                                className="flex items-start justify-between gap-3 bg-white px-4 py-3 text-slate-950"
                              >
                                <div className="min-w-0">
                                  <p className="text-lg font-semibold leading-tight">{service.destination}</p>
                                  <p className="mt-1 text-sm text-slate-700">{service.via}</p>
                                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                                    {service.scheduledTime}
                                  </p>
                                </div>
                                <span className="shrink-0 rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white shadow-sm">
                                  {service.minuteBadge}
                                </span>
                              </div>
                            ))}
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
                            renderPlatformBoardCard(selectedDetail.station.name, platform, index),
                          )}
                        </div>
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
            </div>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_120px_rgba(10,10,20,0.7)] z-[500]" />
    </div>
  );
}

export function getFilterChips(filterKey: ServiceFilterKey) {
  switch (filterKey) {
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










