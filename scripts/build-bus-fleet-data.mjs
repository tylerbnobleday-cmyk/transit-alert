// Converts raw per-operator fleet data (scraped from Australian Bus Fleet
// Lists, fleetlists.busaustralia.com) into the structured per-operator files
// under data/bus-fleet/. The raw dumps this was built from lived in
// .local-host/bus-raw/ (gitignored scratch space) and are not kept around —
// to refresh a data/bus-fleet/*.json file, re-scrape that operator's Fleet
// Summary / Depot List / Full Fleet List tables into .local-host/bus-raw/
// in the same shape (see buildVehiclesFromRows/buildVehiclesFromSummary
// below for the exact column order each raw format expects), then re-run
// this script. It is the only place that needs to know those raw shapes.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAW_DIR = path.join(REPO_ROOT, ".local-host", "bus-raw");
const OUT_DIR = path.join(REPO_ROOT, "data", "bus-fleet");

// Chassis -> powertrain/fuel classification. This is the single authoritative
// list of known non-diesel Melbourne bus chassis: everything not listed here
// is diesel per the standing rule ("classify as diesel unless the exact
// vehicle/chassis proves otherwise") — never inferred from the body builder,
// since e.g. a Volgren Optimus body is fitted to diesel, hybrid, and electric
// chassis alike.
const CHASSIS_POWERTRAIN = [
  { match: /^Scania K320HB$/i, powertrain: "hybrid", fuelType: "diesel-electric" },
  { match: /^Scania K320UB Hybrid$/i, powertrain: "hybrid", fuelType: "diesel-electric" },
  { match: /^Volvo B5LH$/i, powertrain: "hybrid", fuelType: "diesel-electric" },
  // Volvo's own naming convention: B5R = rear-engine diesel, B5RH = rear-
  // engine hybrid, LE = low-entry — "H" here isn't decorative, so this is
  // read directly off the chassis code rather than guessed.
  { match: /^Volvo B5RHLE$/i, powertrain: "hybrid", fuelType: "diesel-electric" },
  { match: /^Volvo BZL$/i, powertrain: "battery_electric", fuelType: "electric" },
  { match: /^BYD D9RA$/i, powertrain: "battery_electric", fuelType: "electric" },
  { match: /^BYD BC12B1$/i, powertrain: "battery_electric", fuelType: "electric" },
  // Named by the source as a hydrogen fuel-cell model, not inferred from body
  // or livery — the two Transit Systems Victoria units (#174/#175) are the
  // first hydrogen buses in this database.
  { match: /^ARCC Viking Hydrogen$/i, powertrain: "hydrogen_fuel_cell", fuelType: "hydrogen" },
];

function classifyChassis(chassisModel) {
  const found = CHASSIS_POWERTRAIN.find((entry) => entry.match.test(chassisModel.trim()));
  if (found) return { powertrain: found.powertrain, fuelType: found.fuelType };
  return { powertrain: "diesel", fuelType: "diesel" };
}

function splitChassis(raw) {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\S+)\s+(.+)$/);
  if (!match) return { manufacturer: trimmed, model: "" };
  return { manufacturer: match[1], model: match[2] };
}

function splitBody(raw) {
  const cleaned = raw.replace(/[“”"]/g, "").trim();
  const match = cleaned.match(/^(\S+(?:\s+Benz|\s+Malaysia|\s+QLD)?)\s+(.+)$/);
  if (!match) return { manufacturer: cleaned, model: "" };
  // Single-word body builders (Optare, Fuso, Hino, Yutong, Autobus...) with no
  // separate model name in this source.
  if (!/\s/.test(cleaned)) return { manufacturer: cleaned, model: "" };
  return { manufacturer: match[1], model: match[2] };
}

function parseBodyDate(raw) {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d{1,2})\.(\d{4})$/);
  if (!match) return trimmed || undefined;
  return `${match[2]}-${match[1].padStart(2, "0")}`;
}

// Per-vehicle rows: [fleetNumber, registration, chassis, vin, body, bodyNumber, bodyDate, seating, livery, depot?]
// `active: false` marks rows sourced from an operator's Disposal List rather
// than its current Fleet/Depot List — kept (not deleted) so a historical
// trip that named this registration/fleet number can still resolve to real
// vehicle info, per the standing rule against deleting withdrawn vehicles.
function buildVehiclesFromRows(rows, operator, defaultDepot, { active = true } = {}) {
  return rows
    .filter((row) => row[0] && row[0] !== "Bus #")
    .map((row) => {
    const [fleetNumber, registration, chassis, vin, body, bodyNumber, bodyDate, seating, livery, depot] = row;
    const { manufacturer: chassisManufacturer, model: chassisModel } = splitChassis(chassis);
    const { manufacturer: bodyManufacturer, model: bodyModel } = splitBody(body);
    const { powertrain, fuelType } = classifyChassis(chassis);
    return {
      operator,
      fleetNumber,
      registration,
      chassisManufacturer,
      chassisModel,
      bodyManufacturer,
      bodyModel: bodyModel || undefined,
      powertrain,
      fuelType,
      vin: vin && vin !== "-" && vin !== "?" ? vin : undefined,
      bodyNumber: bodyNumber && bodyNumber !== "-" && bodyNumber !== "?" ? bodyNumber : undefined,
      bodyDate: parseBodyDate(bodyDate),
      seating: seating || undefined,
      livery: livery || undefined,
      depot: depot || defaultDepot,
      active,
      source: "Australian Bus Fleet Lists",
      sourceUpdated: "2026-09",
    };
  });
}

// Fleet Summary rows: [chassis, body, count, "n1,n2,n3..."] — used when we
// only have the chassis/body/fleet-number block, not individual rego/VIN.
function buildVehiclesFromSummary(rows, operator) {
  const vehicles = [];
  for (const [chassis, body, , fleetNumbersCsv] of rows) {
    if (!fleetNumbersCsv) continue;
    const { manufacturer: chassisManufacturer, model: chassisModel } = splitChassis(chassis);
    const { manufacturer: bodyManufacturer, model: bodyModel } = splitBody(body);
    const { powertrain, fuelType } = classifyChassis(chassis);
    const fleetNumbers = fleetNumbersCsv.split(",").map((value) => value.trim()).filter(Boolean);
    for (const fleetNumber of fleetNumbers) {
      vehicles.push({
        operator,
        fleetNumber,
        registration: undefined,
        chassisManufacturer,
        chassisModel,
        bodyManufacturer,
        bodyModel: bodyModel || undefined,
        powertrain,
        fuelType,
        active: true,
        source: "Australian Bus Fleet Lists",
        sourceUpdated: "2026-09",
      });
    }
  }
  return vehicles;
}

function readRaw(name) {
  const text = fs.readFileSync(path.join(RAW_DIR, name), "utf8");
  if (name.endsWith(".json")) return JSON.parse(text);
  // Tab-separated raw dump (one row per line, no header).
  return text
    .split("\n")
    .map((line) => line.replace(/\r$/, ""))
    .filter(Boolean)
    .map((line) => line.split("\t"));
}

// `depotScoped: true` for operators confirmed to reuse fleet numbers across
// depots (CDC Melbourne's "14" is three different physical buses across
// Oakleigh/Tullamarine/Wyndham) — there the identity key must include depot.
// `depotScoped: false` for operators with one company-wide numbering scheme
// (Kinetic's Fleet Summary lists disjoint number ranges per chassis with no
// depot split at all), where fleetNumber alone is the correct key — this is
// also what lets a richer per-vehicle row (with real rego) correctly replace
// the block-level Fleet Summary row for the same bus instead of duplicating it.
function dedupeVehicles(vehicles, { depotScoped } = { depotScoped: true }) {
  const byKey = new Map();
  for (const vehicle of vehicles) {
    const key = depotScoped
      ? vehicle.registration ?? `${vehicle.operator}::${vehicle.depot ?? ""}::${vehicle.fleetNumber}`
      : `${vehicle.operator}::${vehicle.fleetNumber}`;
    const existing = byKey.get(key);
    if (!existing || (!existing.registration && vehicle.registration)) {
      byKey.set(key, vehicle);
    }
  }
  return [...byKey.values()].sort((a, b) => Number(a.fleetNumber) - Number(b.fleetNumber) || a.fleetNumber.localeCompare(b.fleetNumber));
}

fs.mkdirSync(OUT_DIR, { recursive: true });

// Each operator's raw dumps live only in the gitignored .local-host/bus-raw/
// scratch space (see the file header) and can be missing between refreshes —
// skip an operator whose raw files aren't present instead of crashing the
// whole build, so unrelated operators can still be rebuilt.
function buildOperator(label, outFile, build) {
  try {
    const vehicles = build();
    fs.writeFileSync(path.join(OUT_DIR, outFile), JSON.stringify(vehicles, null, 2));
    return vehicles;
  } catch (error) {
    if (error.code === "ENOENT") {
      console.warn(`Skipping ${label}: raw data not found (${error.path}). Keeping existing ${outFile} untouched.`);
      return null;
    }
    throw error;
  }
}

// CDC Melbourne — all 4 depots, full per-vehicle detail, plus recently
// withdrawn Melbourne-depot vehicles (2010+ body date; older withdrawals
// predate GTFS-RT tracking entirely and would never match a real trip).
buildOperator("CDC Melbourne", "cdc-melbourne.json", () =>
  dedupeVehicles([
    ...buildVehiclesFromRows(readRaw("cdc-oakleigh.txt"), "CDC Melbourne", "Oakleigh"),
    ...buildVehiclesFromRows(readRaw("cdc-sunshine.txt"), "CDC Melbourne", "Sunshine"),
    ...buildVehiclesFromRows(readRaw("cdc-tullamarine.json"), "CDC Melbourne", "Tullamarine"),
    ...buildVehiclesFromRows(readRaw("cdc-wyndham.json"), "CDC Melbourne", "Wyndham"),
    ...buildVehiclesFromRows(readRaw("cdc-melbourne-withdrawn.json"), "CDC Melbourne", undefined, { active: false }),
  ]),
);

// Kinetic Melbourne — full per-vehicle detail for the electric/hybrid fleet,
// fleet-summary (block-level) detail for the rest of the diesel fleet.
buildOperator("Kinetic Melbourne", "kinetic-melbourne.json", () =>
  dedupeVehicles(
    [
      ...buildVehiclesFromSummary(readRaw("kinetic-fleet-summary.json"), "Kinetic Melbourne"),
      ...buildVehiclesFromRows(readRaw("kinetic-electric-hybrid.json"), "Kinetic Melbourne"),
    ],
    { depotScoped: false },
  ),
);

// Dysons, Transit Systems Victoria and Ventura — every row already carries a
// real registration, so the default depotScoped dedupe (keyed by
// registration when present) is safe without a special mode, same as CDC.
// Withdrawn vehicles are filtered the same way as each operator's current
// fleet (real Melbourne depot, non-charter seating/livery) and further
// limited to 2010+ body dates — Transit Systems Victoria's and Kinetic
// Melbourne's disposal lists had no rows meeting that bar, so they have no
// withdrawn file to include.
buildOperator("Dysons", "dysons.json", () =>
  dedupeVehicles([
    ...buildVehiclesFromRows(readRaw("dysons-met.json"), "Dysons"),
    ...buildVehiclesFromRows(readRaw("dysons-withdrawn.json"), "Dysons", undefined, { active: false }),
  ]),
);
buildOperator("Transit Systems Victoria", "transit-systems-victoria.json", () =>
  dedupeVehicles(buildVehiclesFromRows(readRaw("transit-systems.json"), "Transit Systems Victoria")),
);
buildOperator("Ventura Bus Lines", "ventura.json", () =>
  dedupeVehicles([
    ...buildVehiclesFromRows(readRaw("ventura.json"), "Ventura Bus Lines"),
    ...buildVehiclesFromRows(readRaw("ventura-withdrawn.json"), "Ventura Bus Lines", undefined, { active: false }),
  ]),
);

const powertrainBreakdown = (vehicles) => vehicles.reduce((acc, v) => { acc[v.powertrain] = (acc[v.powertrain] || 0) + 1; return acc; }, {});
for (const [label, outFile] of [
  ["CDC Melbourne", "cdc-melbourne.json"],
  ["Kinetic Melbourne", "kinetic-melbourne.json"],
  ["Dysons", "dysons.json"],
  ["Transit Systems Victoria", "transit-systems-victoria.json"],
  ["Ventura Bus Lines", "ventura.json"],
]) {
  const filePath = path.join(OUT_DIR, outFile);
  if (!fs.existsSync(filePath)) continue;
  const vehicles = JSON.parse(fs.readFileSync(filePath, "utf8"));
  console.log(`${label}: ${vehicles.length} vehicles`);
  console.log(`Powertrain breakdown (${label}):`, powertrainBreakdown(vehicles));
}
