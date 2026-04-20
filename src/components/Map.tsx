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
import tramIcon from "@/assets/icons/tram.svg";
import { fetchLiveTrains, type LiveTrain } from "@/lib/live-trains";
import { fetchConsistSnapshot } from "@/lib/transportvic-bot";
import { fetchMarkerOverrides, saveMarkerOverrides, type MarkerOverride } from "@/lib/marker-overrides";
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

interface MapProps {
  journeyRoute?: Station[];
  splitCrossCityGroup?: boolean;
  transportModes?: TransportMode[];
  onTransportModesChange?: (modes: TransportMode[]) => void;
  persistedLayerState?: Partial<LayerState>;
  onLayerStateChange?: (layers: LayerState) => void;
  isAdmin?: boolean;
}

interface LayerState {
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

type ServiceFilterKey =
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

type TransportMode = "train" | "tram" | "bus" | "vline";

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
  const badgeLabel = isTrackedConsist ? "430M" : vehicle.tdn;
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

const SERVICE_FILTERS: Array<{
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
  { name: "West Richmond", position: [-37.8122, 144.9889] },
  { name: "North Richmond", position: [-37.8071, 144.9920] },
  { name: "Collingwood", position: [-37.8028, 144.9975] },
  { name: "Victoria Park", position: [-37.7991, 145.0042] },
  { name: "Clifton Hill", position: [-37.7881, 145.0015] },
  { name: "Rushall", position: [-37.7839, 145.0175] },
  { name: "Merri", position: [-37.7774, 145.0218] },
  { name: "Northcote", position: [-37.7698, 145.0248] },
  { name: "Croxton", position: [-37.7646, 145.0357] },
  { name: "Thornbury", position: [-37.7558, 145.0377] },
  { name: "Bell", position: [-37.7456, 145.0397] },
  { name: "Preston", position: [-37.7388, 145.0408] },
  { name: "Regent", position: [-37.7285, 145.0430] },
  { name: "Reservoir", position: [-37.7169, 145.0452] },
  { name: "Ruthven", position: [-37.7086, 145.0471] },
  { name: "Keon Park", position: [-37.6948, 145.0361] },
  { name: "Thomastown", position: [-37.6804, 145.0135] },
  { name: "Lalor", position: [-37.6669, 145.0172] },
  { name: "Epping", position: [-37.6521, 145.0198] },
  { name: "South Morang", position: [-37.6490, 145.0678] },
  { name: "Middle Gorge", position: [-37.6409, 145.0874] },
  { name: "Hawkstowe", position: [-37.6420, 145.1021] },
  { name: "Mernda", position: [-37.6006, 145.0958] },
];

const HURSTBRIDGE_STATIONS: Station[] = [
  { name: "Flinders Street", position: [-37.8184161, 144.9664779] },
  { name: "Jolimont", position: [-37.8163, 144.9840] },
  { name: "West Richmond", position: [-37.8122, 144.9889] },
  { name: "North Richmond", position: [-37.8071, 144.9920] },
  { name: "Collingwood", position: [-37.8028, 144.9975] },
  { name: "Victoria Park", position: [-37.7991, 145.0042] },
  { name: "Clifton Hill", position: [-37.7881, 145.0015] },
  { name: "Westgarth", position: [-37.7809, 145.0028] },
  { name: "Dennis", position: [-37.7699, 145.0050] },
  { name: "Fairfield", position: [-37.7788, 145.0176] },
  { name: "Alphington", position: [-37.7780, 145.0314] },
  { name: "Darebin", position: [-37.7749, 145.0385] },
  { name: "Ivanhoe", position: [-37.7698, 145.0457] },
  { name: "Eaglemont", position: [-37.7634, 145.0634] },
  { name: "Heidelberg", position: [-37.7570, 145.0705] },
  { name: "Rosanna", position: [-37.7429, 145.0673] },
  { name: "Macleod", position: [-37.7265, 145.0690] },
  { name: "Watsonia", position: [-37.7112, 145.0826] },
  { name: "Greensborough", position: [-37.7049, 145.1038] },
  { name: "Montmorency", position: [-37.7162, 145.1210] },
  { name: "Eltham", position: [-37.7149, 145.1482] },
  { name: "Diamond Creek", position: [-37.6718, 145.1570] },
  { name: "Wattle Glen", position: [-37.6644, 145.1872] },
  { name: "Hurstbridge", position: [-37.6404, 145.1925] },
];

const CLIFTONHILLGROUPLOOP_STATIONS: Station[] = [
  { name: "Clifton Hill", position: [-37.7881, 145.0015] },
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
const BURNLEY_LOOP: [number, number][] = [
  [-37.82359625345165, 144.9891977969667], // Richmond
  [-37.8205, 144.9750],
  [-37.8184161, 144.9664779], // Flinders Street
  [-37.819578159795725, 144.9610791331353],
  [-37.82104238088903, 144.95707972900598],
  [-37.8211906937223, 144.95500906362312],
  [-37.81973721503802, 144.95279892337976],
  [-37.8193066506804, 144.95240125386297], // Southern Cross
  [-37.81766430074989, 144.95108174796619],
  [-37.81602005179086, 144.94986938945834],
  [-37.81465546682327, 144.94969772810222],
  [-37.81335866395033, 144.9505774926714],
  [-37.81335215689385, 144.9507340157454],
  [-37.81196029877101, 144.9566610145156], // Flagstaff
  [-37.8101, 144.9626], // Melbourne Central
  [-37.80792668206212, 144.96937976627547],
  [-37.808079259516454, 144.97045264993122],
  [-37.80890995342101, 144.97193322934783],
  [-37.81031702586954, 144.97240529813624], // Parliament
  [-37.8147653441898, 144.97416778728817],
  [-37.815923183065, 144.97346658889202],
  [-37.81778485426324, 144.96826388056115],
  [-37.8184161, 144.9664779], // Flinders Street
  [-37.8205, 144.9750],
  [-37.82359625345165, 144.9891977969667], // Richmond
];

const PAKENHAM_STATIONS: Station[] = [
  { name: "Anzac", position: [-37.8315, 144.9795] },
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
  { name: "Arden", position: [-37.80093646751718, 144.94074635061708] },
  { name: "Parkville", position: [-37.79978943619289, 144.9595131752267] },
  { name: "State Library", position: [-37.8117, 144.9629] },
  { name: "Town Hall", position: [-37.8184161, 144.9656] },
  { name: "Anzac", position: [-37.8315, 144.9795] },
];

const METRO_TUNNEL_STATIONS: Station[] = [
  { name: "Arden", position: [-37.80093646751718, 144.94074635061708] },
  { name: "Parkville", position: [-37.79978943619289, 144.9595131752267] },
  { name: "State Library", position: [-37.8117, 144.9629] },
  { name: "Town Hall", position: [-37.8184161, 144.9656] },
  { name: "Anzac", position: [-37.8315, 144.9795] },
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
  { name: "Footscray", position: [-37.801696124765726, 144.90150029345793] },
  { name: "Seddon", position: [-37.80864624508298, 144.89540631027074] },
  { name: "Yarraville", position: [-37.8159245612344, 144.88935190525294] },
  { name: "Spotswood", position: [-37.8290, 144.8865] },
  { name: "Newport", position: [-37.8426, 144.8833] },
  { name: "Laverton", position: [-37.8627, 144.7698] },
  { name: "Aircraft", position: [-37.8676, 144.7524] },
  { name: "Williams Landing", position: [-37.8643, 144.7393] },
  { name: "Hoppers Crossing", position: [-37.8820, 144.7006] },
  { name: "Werribee", position: [-37.8981, 144.6606] },
];

const WILLIAMSTOWN_STATIONS: Station[] = [
  { name: "Newport", position: [-37.8426, 144.8833] },
  { name: "North Williamstown", position: [-37.8573, 144.8872] },
  { name: "Williamstown Beach", position: [-37.8636, 144.8994] },
  { name: "Williamstown", position: [-37.8673, 144.9006] },
];

const ALTONA_LOOP_STATIONS: Station[] = [
  { name: "Newport", position: [-37.8426, 144.8833] },
  { name: "Seaholme", position: [-37.8645, 144.8454] },
  { name: "Altona", position: [-37.8673, 144.8305] },
  { name: "Westona", position: [-37.8660, 144.8135] },
  { name: "Laverton", position: [-37.8627, 144.7698] },
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
    position: [-37.8518, 144.9932],
    staffed: false,
    barriers: false,
    metro: true,
    zone: "1",
  },
  {
    name: "Windsor",
    position: [-37.8561, 144.9924],
    staffed: false,
    barriers: false,
    metro: true,
    zone: "1",
  },
  {
    name: "Balaclava",
    position: [-37.8692, 144.9931],
    staffed: false,
    barriers: false,
    metro: true,
    zone: "1",
  },
  {
    name: "Ripponlea",
    position: [-37.8775, 144.9958],
    staffed: false,
    barriers: false,
    metro: true,
    zone: "1",
  },
  {
    name: "Elsternwick",
    position: [-37.8847, 144.9991],
    staffed: false,
    barriers: false,
    metro: true,
    zone: "1",
  },
  {
    name: "Gardenvale",
    position: [-37.9019, 145.0042],
    staffed: false,
    barriers: false,
    metro: true,
    zone: "1",
  },
  {
    name: "Brighton Beach",
    position: [-37.9269, 144.9992],
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

const CAUFIELD_LOOP: [number, number][] = [
  
  [-37.81934099941143, 144.9524609650515],
  [-37.81766430074989, 144.95108174796619],
  [-37.81602005179086, 144.94986938945834],
  [-37.81465546682327, 144.94969772810222],
  [-37.81335866395033, 144.9505774926714],
  [-37.81335215689385, 144.9507340157454],
  [-37.81196029877101, 144.9566610145156],
  [-37.8101, 144.9626],
  [-37.80792668206212, 144.96937976627547],
  [-37.808079259516454, 144.97045264993122],
  [-37.80890995342101, 144.97193322934783],
  [-37.81031702586954, 144.97240529813624],
  [-37.81794590442121, 144.97726539063947], // curve?? 
  [-37.816901671251536, 144.9743776743041], 
  [-37.81696275340265, 144.97150400581788],
  [-37.81697970439321, 144.97113922540086],
  [-37.81778485426324, 144.96826388056115],
  [-37.8184161, 144.9664779], // FLINDERTS  
  [-37.819578159795725, 144.9610791331353],
  [-37.82104238088903, 144.95707972900598],
  [-37.8211906937223, 144.95500906362312],
  [-37.81973721503802, 144.95279892337976],
  [-37.81934099941143, 144.9524609650515],
];

const NORTHERN_LOOP: [number, number][] = [
  [-37.8073, 144.9426],
  [-37.81247065691958, 144.94693600775102],
  [-37.81335215689385, 144.9507340157454],
  [-37.81196029877101, 144.9566610145156],
  [-37.8101, 144.9626],
  [-37.80792668206212, 144.96937976627547],
  [-37.808079259516454, 144.97045264993122],
  [-37.80890995342101, 144.97193322934783],
  [-37.81031702586954, 144.97240529813624],
  [-37.8147653441898, 144.97416778728817],
  [-37.815923183065, 144.97346658889202],
  [-37.81778485426324, 144.96826388056115],
  [-37.8184161, 144.9664779],
  [-37.819578159795725, 144.9610791331353],
  [-37.82104238088903, 144.95707972900598],
  [-37.8211906937223, 144.95500906362312],
  [-37.81973721503802, 144.95279892337976],
  [-37.81934099941143, 144.9524609650515],
  [-37.8073, 144.9426],
];

const SANDRINGHAM_LINE: [number, number][] = [
  [-37.81934099941143, 144.9524609650515],
  [-37.81973721503802, 144.95279892337976],
  [-37.8211906937223, 144.95500906362312],
  [-37.82104238088903, 144.95707972900598],
  [-37.819578159795725, 144.9610791331353],
  [-37.8184161, 144.9664779],
  [-37.8205, 144.975],
  [-37.8225, 144.9825],
  [-37.82359625345165, 144.9891977969667],
  [-37.8295, 144.9915],
  [-37.8345, 144.9925],
  [-37.8381009, 144.99237],
  [-37.8518, 144.9932],
  [-37.8561, 144.9924],
  [-37.8692, 144.9931],
  [-37.8775, 144.9958],
  [-37.8847, 144.9991],
  [-37.9019, 145.0042],
  [-37.9269, 144.9992],
  [-37.9378, 145.0028],
  [-37.9505, 145.0058],
];

// =========================
// Derived Data
// =========================
const MERNDA_LINE = MERNDA_STATIONS.map((s) => s.position);
const HURSTBRIDGE_LINE = HURSTBRIDGE_STATIONS.map((s) => s.position);
const CLIFTONHILL_LOOP: [number, number][] = [
  [-37.7881, 145.0015], // Clifton Hill
  [-37.8000, 144.9950],
  [-37.8163, 144.9840], // Jolimont
  [-37.8184161, 144.9664779], // Flinders Street
  [-37.819578159795725, 144.9610791331353],
  [-37.82104238088903, 144.95707972900598],
  [-37.8211906937223, 144.95500906362312],
  [-37.81973721503802, 144.95279892337976],
  [-37.819330859301594, 144.95242620896954], // Southern Cross
  [-37.81766430074989, 144.95108174796619],
  [-37.81602005179086, 144.94986938945834],
  [-37.81465546682327, 144.94969772810222],
  [-37.81335866395033, 144.9505774926714],
  [-37.81335215689385, 144.9507340157454],
  [-37.81196029877101, 144.9566610145156], // Flagstaff
  [-37.8101, 144.9626], // Melbourne Central
  [-37.8085, 144.9685],
  [-37.81031702586954, 144.97240529813624], // Parliament
  [-37.8145, 144.9740],
  [-37.8163, 144.9840], // Jolimont
  [-37.8000, 144.9950],
  [-37.7881, 145.0015], // back
];const CRAIGIEBURN_LINE = CRAIGIEBURN_STATIONS.map((station) => station.position);
const UPFIELD_LINE = UPFIELD_STATIONS.map((station) => station.position);
const WERRIBEE_LINE = WERRIBEE_STATIONS.map((station) => station.position);
const WILLIAMSTOWN_LINE = WILLIAMSTOWN_STATIONS.map((station) => station.position);
const ALTONA_LOOP_LINE = ALTONA_LOOP_STATIONS.map((station) => station.position);
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
  [-37.84074027756291, 144.99277197708855], // South Yarra Enterance Curve
  [-37.84014541175312, 144.9924065225265], // South Yarra Enterance Curve 2
  [-37.839508877221995, 144.9922573545601], // South Yarra Enterance Curve 3
  [-37.83900452634713, 144.99223852217295], // South Yarra Birdge 
  [-37.83851468142509, 144.99226132094938], // South Yarra
  [-37.83566353672182, 144.9928552912536] , // South yarra to Richmond curve 
  [-37.83444244894703, 144.9930213092438], // South yarra to Richmond curve 2 
  [-37.83209166656431, 144.9935008513864], // South yarra to Richmond curve 3
  [-37.827184389560315, 144.99390491980614], // South yarra to Richmond curve 4
[-37.82548101345592, 144.99258525053799], // South yarra to Richmond curve 5
[-37.825565758588816, 144.99270326773168], // South yarra to Richmond curve 6
  [-37.82359625345165, 144.9891977969667], // Richmond
  [-37.81817298581704, 144.97748903675006], 
[-37.81794590442121, 144.97726539063947], // curve?? 

];
const CRANBOURNE_LINE = CRANBOURNE_STATIONS.map((station) => station.position);
const PAKENHAM_LINE = PAKENHAM_STATIONS.map((station) => station.position);
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
// =========================
// Helpers
// =========================
function getStationDetails(station: Station): string {
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

function renderStationMarkers(
  stations: Station[],
  fillColor: string,
  strokeColor: string,
  resolveStation: (station: Station) => Station,
  onSelectStation: (station: Station) => void,
) {
  return stations.map((station) => (
    <CircleMarker
      key={`${station.name}-${station.position[0]}-${station.position[1]}`}
      center={resolveStation(station).position}
      radius={5}
      pathOptions={{
        color: strokeColor,
        fillColor,
        fillOpacity: 1,
        weight: 2,
      }}
      eventHandlers={{
        click: () => onSelectStation(resolveStation(station)),
      }}
    >
      <Popup>
        <div className="p-3 w-48">
          <p className="font-semibold text-white">{resolveStation(station).name}</p>
          <p className="text-xs text-white/60 mt-1">
            {getStationDetails(resolveStation(station))}
          </p>
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

function splitConsistCars(consist: string) {
  if (consist === "430M") {
    return ["369M", "1035T", "370M", "429M", "1065T", "430M"];
  }
  return consist
    .split(/[\s-]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

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
  transportModes = ["train"],
  onTransportModesChange,
  persistedLayerState,
  onLayerStateChange,
  isAdmin = false,
}: MapProps = {}) {
  const mapRef = useRef<L.Map | null>(null);
  const consistData = null as any;

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

  const reports = Array.isArray(data) ? data : [];
  const [selectedDetail, setSelectedDetail] = useState<
    | { type: "station"; station: Station }
    | { type: "vehicle"; vehicle: LiveTrain }
    | { type: "report"; report: Report }
    | null
  >(null);
  const selectedVehicle = selectedDetail?.type === "vehicle" ? selectedDetail.vehicle : null;
  const { data: selectedVehicleSnapshot } = useQuery({
    queryKey: ["consist-snapshot", selectedVehicle?.consist],
    queryFn: () => fetchConsistSnapshot(selectedVehicle!.consist),
    enabled: Boolean(selectedVehicle?.consist),
    refetchInterval: 30000,
    retry: false,
  });
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
    if (persistedLayerState) {
      setLayers((prev) => ({ ...prev, ...persistedLayerState }));
    }
  }, [persistedLayerState]);

  useEffect(() => {
    onLayerStateChange?.(layers);
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
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          setUserLoc([position.coords.latitude, position.coords.longitude]),
        () => setUserLoc(MELBOURNE_CENTER)
      );
    } else {
      setUserLoc(MELBOURNE_CENTER);
    }
  }, []);

  const toggleLayer = useCallback((key: keyof LayerState) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

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
    : "Source: TransportVic consist tracking, with PTV fallback when available";
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
    onTransportModesChange?.(nextModes.length > 0 ? nextModes : ["train"]);
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
  <Polyline positions={CAUFIELD_LOOP}
      pathOptions={{ color: "#22c55e", weight: 5, opacity: 0.9 }}
 />
    <Polyline
      positions={FRANKSTON_TRACK}
      pathOptions={{ color: "#22c55e", weight: 5, opacity: 0.9 }}
    />
    {renderStationMarkers(FRANKSTON_STATIONS, "#22c55e", "#16a34a", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
  </>
)}
{modeIsTrainVisible && layers.merndaLine && (
  <>
    <Polyline
      positions={MERNDA_LINE}
      pathOptions={{ color: "#BE1014", weight: 5, opacity: 0.85 }}
    />
    {renderStationMarkers(MERNDA_STATIONS, "#BE1014", "#BE1014", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
  </>
)}

{modeIsTrainVisible && layers.hurstbridgeLine && (
  <>
    <Polyline
      positions={offsetPolylineCoordinates(HURSTBRIDGE_LINE, "left", 0.45)}
      pathOptions={{ color: "#BE1014", weight: 5, opacity: 0.85 }}
    />
    <Polyline
      positions={offsetPolylineCoordinates(HURSTBRIDGE_LINE, "right", 0.45)}
      pathOptions={{ color: "#BE1014", weight: 5, opacity: 0.85 }}
    />
    {renderStationMarkers(HURSTBRIDGE_STATIONS, "#BE1014", "#BE1014", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
  </>
)}

{modeIsTrainVisible && layers.cliftonHillLoop && (
  <>
    <Polyline
      positions={offsetPolylineCoordinates(CLIFTONHILL_LOOP, "left", 0.4)}
      pathOptions={{ color: "#BE1014", weight: 5, opacity: 0.85 }}
    />
    {renderStationMarkers(CLIFTONHILLGROUPLOOP_STATIONS, "#BE1014", "#BE1014", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
  </>
)}
{modeIsTrainVisible && (layers.sunburyLine || layers.craigieburnLine || layers.upfieldLine || layers.northernLoop) && (
  <>
    <Polyline
      positions={NORTHERN_LOOP}
      pathOptions={{ color: "#FFD200", weight: 5, opacity: 0.85 }}
    />
    {renderStationMarkers(NORTHERNGROUPLOOP_STATIONS, "#FFD200", "#cca700", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
  </>
)}

{modeIsTrainVisible && (layers.lilydaleLine || layers.belgraveLine || layers.alameinLine || layers.glenWaverleyLine || layers.burnleyLoop) && (
  <>
    <Polyline
      positions={offsetPolylineCoordinates(BURNLEY_LOOP, "left", 0.45)}
  pathOptions={{ color: "#003A8F", weight: 3, opacity: 0.6 }}
    />
    {renderStationMarkers(BURNLEYGROUPLOOP_STATIONS, "#003A8F", "#003A8F", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
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
    {renderStationMarkers(LILYDALE_STATIONS, "#003A8F", "#003A8F", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
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
    {renderStationMarkers(BELGRAVE_STATIONS, "#003A8F", "#003A8F", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
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
    {renderStationMarkers(ALAMEIN_STATIONS, "#003A8F", "#003A8F", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
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
    {renderStationMarkers(GLEN_WAVERLEY_STATIONS, "#003A8F", "#003A8F", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
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
    {renderStationMarkers(CRAIGIEBURN_STATIONS, "#FFD200", "#cca700", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
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
    {renderStationMarkers(UPFIELD_STATIONS, "#FFD200", "#cca700", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
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
            {renderStationMarkers(CRANBOURNE_STATIONS, "#279FD5", "#1e7ba8", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
          </>
        )}

        {modeIsTrainVisible && layers.pakenhamLine && (
          <>
            <Polyline
              positions={offsetPolylineCoordinates(PAKENHAM_LINE, "left", 0.6)}
              pathOptions={{ color: "#279FD5", weight: 5, opacity: 0.85 }}
            />
            <Polyline
              positions={offsetPolylineCoordinates(PAKENHAM_LINE, "right", 0.6)}
              pathOptions={{ color: "#279FD5", weight: 5, opacity: 0.85 }}
            />
            {renderStationMarkers(PAKENHAM_STATIONS, "#279FD5", "#1e7ba8", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
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
            {renderStationMarkers(SUNBURY_STATIONS, "#279FD5", "#1e7ba8", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
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
            {renderStationMarkers(METRO_TUNNEL_STATIONS, "#279FD5", "#1e7ba8", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
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

    {renderStationMarkers(WERRIBEE_STATIONS, "#F178AF", "#9f5d7c", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
    {renderStationMarkers(WILLIAMSTOWN_STATIONS, "#F178AF", "#9f5d7c", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
    {renderStationMarkers(ALTONA_LOOP_STATIONS, "#F178AF", "#9f5d7c", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
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
            {renderStationMarkers(SANDRINGHAM_STATIONS, "#F178AF", "#9f5d7c", resolveStation, (station) => setSelectedDetail({ type: "station", station }))}
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
{modeIsTrainVisible && liveVehicles.map((vehicle) => (
  <Marker
    key={`${vehicle.consist}-${vehicle.tdn}`}
    position={[vehicle.lat, vehicle.lng]}
    icon={createLiveTrainIcon(vehicle)}
    zIndexOffset={vehicle.consist === "430M" ? 2500 : 1200}
    riseOnHover
    eventHandlers={{
      mousedown: () => setSelectedDetail({ type: "vehicle", vehicle }),
      touchstart: () => setSelectedDetail({ type: "vehicle", vehicle }),
      click: () => setSelectedDetail({ type: "vehicle", vehicle }),
      popupopen: () => setSelectedDetail({ type: "vehicle", vehicle }),
    }}
  />
))}
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
      <div className="pointer-events-none absolute left-4 top-28 z-[1000] max-w-xs">
        <div className={`rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-xl ${liveTrainStatusTone}`}>
          <div className="flex items-center gap-2">
            <Train className="h-4 w-4" />
            <p className="text-sm font-semibold">Live train tracking</p>
          </div>
          <p className="mt-2 text-sm">{liveTrainStatusLabel}</p>
          <p className="mt-1 text-xs opacity-80">{liveTrainStatusDetail}</p>
        </div>
      </div>
      )}

      <div className="absolute right-4 top-36 z-[1000] w-[11.5rem] sm:right-6 sm:top-32">
        <div className="max-h-[68vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/82 p-3 shadow-xl backdrop-blur-xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
            Transport Modes
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {([
              { key: "train", label: "Trains", icon: "train" },
              { key: "tram", label: "Trams", icon: "tram" },
              { key: "bus", label: "Buses", icon: "bus" },
              { key: "vline", label: "V/Line", icon: "vline" },
            ] as Array<{ key: TransportMode; label: string; icon: "train" | "tram" | "bus" | "vline" }>).map((mode) => {
              const active = transportModes.includes(mode.key);
              return (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => toggleTransportMode(mode.key)}
                  className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                    active
                      ? "border-blue-400/40 bg-blue-500/12 text-blue-100"
                      : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {mode.icon === "train" ? (
                      <img src={trainIcon} alt="" className="h-4 w-4 shrink-0 object-contain opacity-90" />
                    ) : mode.icon === "bus" ? (
                      <img src={smartbusIcon} alt="" className="h-4 w-4 shrink-0 object-contain opacity-90" />
                    ) : mode.icon === "tram" ? (
                      <img src={tramIcon} alt="" className="h-4 w-4 shrink-0 object-contain opacity-90" />
                    ) : (
                      <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-current/25 px-1 text-[9px] font-bold leading-none">
                        V
                      </span>
                    )}
                    <span>{mode.label}</span>
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
                className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
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
                    className="rounded-xl border border-emerald-400/30 bg-emerald-500/12 px-3 py-2 text-xs font-semibold text-emerald-100"
                  >
                    Save edits
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditedMarkers}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void resetSavedMarkers()}
                    className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100"
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
          <div className="mt-3 flex flex-col gap-2">
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
                    className={`rounded-xl border px-3 py-2 text-left transition ${
                      isDisabled
                        ? "cursor-not-allowed border-purple-400/20 bg-purple-500/8 text-purple-200/55 opacity-70"
                        : active
                          ? filter.tone
                          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <div className="text-xs font-semibold">{filter.label}</div>
                    {filter.description && (
                      <div className="mt-0.5 text-[10px] font-medium leading-4 text-current/75">
                        {filter.description}
                      </div>
                    )}
                    {chips.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {chips.map((chip) => (
                          <span
                            key={`${filter.key}-${chip}`}
                            className="rounded-full border border-current/20 bg-black/15 px-2 py-0.5 text-[10px] font-semibold text-current/85"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    )}
                    {isDisabled && (
                      <div className="mt-0.5 text-[10px] font-medium leading-4 text-current/65">
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

      <div
        className={`absolute bottom-24 z-[1001] flex flex-col gap-2 sm:bottom-20 ${
          selectedDetail?.type === "vehicle" ? "right-[25.5rem] sm:right-[26rem]" : "right-4 sm:right-6"
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
          onClick={() => {
            if (userLoc && mapRef.current) {
              mapRef.current.setView(userLoc, mapRef.current.getZoom());
            }
          }}
          className="rounded-xl border border-white/20 bg-slate-950/78 p-2.5 shadow-lg backdrop-blur-md transition-colors hover:bg-white/20"
          title="Center on my location"
        >
          <Navigation className="h-4 w-4 text-white" />
        </button>
      </div>

      {selectedDetail?.type === "vehicle" && (
        <div className="absolute inset-x-4 bottom-24 z-[1001] mx-auto w-auto max-w-[24rem] rounded-[1.6rem] border border-white/10 bg-slate-950/96 p-3.5 shadow-2xl backdrop-blur-2xl md:inset-x-auto md:bottom-6 md:right-4 md:top-24 md:max-h-[calc(100%-7rem)] md:w-[24rem] md:overflow-y-auto">
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
                TDN {selectedVehicleSnapshot?.current_trip?.id ?? selectedVehicleSnapshot?.next_trip?.id ?? selectedDetail.vehicle.tdn} / Consist {selectedDetail.vehicle.consist}
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
              {selectedVehicleSnapshot?.current_trip
                ? `${selectedVehicleSnapshot.current_trip.origin} to ${selectedVehicleSnapshot.current_trip.destination}`
                : selectedVehicleSnapshot?.next_trip
                  ? `Next: ${selectedVehicleSnapshot.next_trip.origin} to ${selectedVehicleSnapshot.next_trip.destination}`
                  : selectedDetail.vehicle.serviceDescription ?? "Waiting for next trip"}
            </p>
            <p className="mt-1.5 text-xs text-white/65">
              {selectedVehicleSnapshot?.current_trip
                ? `Running now from ${formatRouteWindow(selectedVehicleSnapshot.current_trip.departs)} to ${formatRouteWindow(selectedVehicleSnapshot.current_trip.arrives)}`
                : selectedVehicleSnapshot?.next_trip
                  ? `Departs ${formatRouteWindow(selectedVehicleSnapshot.next_trip.departs)} and arrives ${formatRouteWindow(selectedVehicleSnapshot.next_trip.arrives)}`
                  : "No active trip has been reported right now."}
            </p>
          </div>

          <div className="mt-3 rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
                Trip list
              </p>
              <p className="text-[10px] text-white/38">
                live snapshot
              </p>
            </div>

            <div className="mt-2.5 space-y-2.5">
              {selectedVehicleSnapshot?.current_trip && (
                <div className="rounded-[1.1rem] border border-emerald-400/15 bg-emerald-500/8 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200/70">
                    Running now
                  </p>
                  <p className="mt-1.5 text-[15px] font-semibold leading-tight text-white">
                    {selectedVehicleSnapshot.current_trip.origin} to {selectedVehicleSnapshot.current_trip.destination}
                  </p>
                  <p className="mt-1 text-xs text-white/65">
                    {formatRouteWindow(selectedVehicleSnapshot.current_trip.departs)} to{" "}
                    {formatRouteWindow(selectedVehicleSnapshot.current_trip.arrives)}
                  </p>
                </div>
              )}

              {selectedVehicleSnapshot?.next_trip && (
                <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                    Up next
                  </p>
                  <p className="mt-1.5 text-[15px] font-semibold leading-tight text-white">
                    {selectedVehicleSnapshot.next_trip.origin} to {selectedVehicleSnapshot.next_trip.destination}
                  </p>
                  <p className="mt-1 text-xs text-white/65">
                    {formatRouteWindow(selectedVehicleSnapshot.next_trip.departs)} to{" "}
                    {formatRouteWindow(selectedVehicleSnapshot.next_trip.arrives)}
                  </p>
                </div>
              )}

              {!selectedVehicleSnapshot?.current_trip && !selectedVehicleSnapshot?.next_trip && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-3 text-sm text-white/55">
                  No active or upcoming trip details are available for this consist right now.
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-3.5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
                  Origin
                </p>
                <p className="mt-1.5 text-[1.9rem] font-semibold leading-none text-white">
                  {selectedVehicleSnapshot?.current_trip?.origin ?? selectedVehicleSnapshot?.next_trip?.origin ?? "Unknown"}
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
                  {selectedVehicleSnapshot?.current_trip?.destination ?? selectedVehicleSnapshot?.next_trip?.destination ?? selectedDetail.vehicle.destination}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-100">
                {selectedVehicleSnapshot?.position?.vehicle_stop_status === "STOPPED_AT"
                  ? `Stopped at ${selectedVehicleSnapshot.position.current_stop}`
                  : selectedDetail.vehicle.serviceDescription ?? "Live tracked service"}
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
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Window</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {selectedVehicleSnapshot?.current_trip
                    ? `${formatRouteWindow(selectedVehicleSnapshot.current_trip.departs)}-${formatRouteWindow(selectedVehicleSnapshot.current_trip.arrives)}`
                    : selectedVehicleSnapshot?.next_trip
                      ? `${formatRouteWindow(selectedVehicleSnapshot.next_trip.departs)}-${formatRouteWindow(selectedVehicleSnapshot.next_trip.arrives)}`
                      : "Waiting"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Operator</p>
                <p className="mt-1 text-sm font-semibold text-white">Metro Trains Melbourne</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Updated</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {selectedVehicleSnapshot?.as_of
                    ? formatDistanceToNow(new Date(selectedVehicleSnapshot.as_of), { addSuffix: true })
                    : selectedDetail.vehicle.timestamp
                      ? formatDistanceToNow(new Date(selectedDetail.vehicle.timestamp), { addSuffix: true })
                      : "Unknown"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
                  Train type & consist
                </p>
                <p className="mt-2.5 text-xl font-semibold text-white">
                  {getVehicleDisplayType(selectedDetail.vehicle)}
                </p>
              </div>
              <div className="text-right text-xs text-white/60">
                <p>Allocated set</p>
                <p className="mt-1 font-semibold text-white">{selectedDetail.vehicle.consist}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {splitConsistCars(selectedDetail.vehicle.consist).map((car) => (
                <span
                  key={`${selectedDetail.vehicle.consist}-${car}`}
                  className="rounded-full border border-blue-300/20 bg-blue-400/10 px-2.5 py-1 text-[10px] font-semibold text-blue-100/90"
                >
                  {car}
                </span>
              ))}
            </div>
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
        <div className="absolute inset-x-4 bottom-24 z-[1001] mx-auto max-w-xl rounded-[1.8rem] border border-white/10 bg-slate-950/90 p-4 shadow-2xl backdrop-blur-2xl sm:bottom-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-300/75">
                {selectedDetail.type === "station" ? "Station" : "Service report"}
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {selectedDetail.type === "station"
                  ? selectedDetail.station.name
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
            <div className="mt-3 grid gap-2 text-sm text-white/70 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">{getStationDetails(selectedDetail.station)}</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                Marker position
                <div className="mt-1 text-white/90">
                  {selectedDetail.station.position[0].toFixed(5)}, {selectedDetail.station.position[1].toFixed(5)}
                </div>
              </div>
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
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_120px_rgba(10,10,20,0.7)] z-[500]" />
    </div>
  );
}

function getFilterChips(filterKey: ServiceFilterKey) {
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

