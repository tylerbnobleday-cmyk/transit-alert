// Static Melbourne bus fleet identity database — sourced from Australian Bus
// Fleet Lists (fleetlists.busaustralia.com), a real per-vehicle/per-operator
// registry (bus number, registration, chassis, VIN, body, seating, livery)
// used the same way Comeng's EDI/Alstom split uses VICSIG: real sourced
// records, never a fabricated guess. See scripts/build-bus-fleet-data.mjs for
// how data/bus-fleet/*.json is generated from the raw scrape, and
// .local-host/bus-raw/ for the source dumps this was built from (2026-09).
//
// Coverage today: CDC Melbourne (all 4 depots, full per-vehicle detail),
// Kinetic Melbourne (full detail for its battery-electric/hybrid fleet, plus
// chassis/body block classification — no individual rego — for the rest of
// its diesel fleet, since Fleet Summary only publishes fleet-number ranges
// per chassis, not per-vehicle rows), Dysons (Bundoora/Reservoir MET depots
// only — its much larger regional/charter fleet is excluded), Transit
// Systems Victoria (charter/school coaches excluded via seating code +
// livery), and Ventura Bus Lines (Heritage depot and charter coaches
// excluded). Other Melbourne PTV operators (Cranbourne Transit, Sunbury Bus
// Service, McKenzie's, Martyrs) aren't populated yet — a bus from one of
// those falls through to BUS_UNKNOWN below rather than guessing.
//
// CDC Melbourne, Dysons and Ventura also carry `active: false` records
// pulled from each operator's Disposal List (limited to 2010+ body dates —
// older withdrawals predate GTFS-RT entirely and could never match a real
// trip), kept rather than deleted so a historical trip naming an old
// registration still resolves to real vehicle info. Buses do get resold
// between these operators (several ex-Dysons units are now active CDC
// Melbourne vehicles) — the registration index below always prefers an
// active record over an inactive one for the same plate, regardless of
// which array happened to load first.
import cdcMelbourne from "../../data/bus-fleet/cdc-melbourne.json";
import kineticMelbourne from "../../data/bus-fleet/kinetic-melbourne.json";
import dysons from "../../data/bus-fleet/dysons.json";
import transitSystemsVictoria from "../../data/bus-fleet/transit-systems-victoria.json";
import ventura from "../../data/bus-fleet/ventura.json";
import type { LiveBus } from "@/lib/live-buses";

export type BusPowertrain = "diesel" | "hybrid" | "battery_electric" | "hydrogen_fuel_cell" | "unknown";

export type BusFleetRecord = {
  operator: string;
  fleetNumber: string;
  registration?: string;
  chassisManufacturer: string;
  chassisModel: string;
  bodyManufacturer: string;
  bodyModel?: string;
  powertrain: BusPowertrain;
  fuelType: string;
  vin?: string;
  bodyNumber?: string;
  bodyDate?: string;
  seating?: string;
  livery?: string;
  depot?: string;
  active: boolean;
  source: string;
  sourceUpdated: string;
};

const ALL_RECORDS: BusFleetRecord[] = [
  ...(cdcMelbourne as BusFleetRecord[]),
  ...(kineticMelbourne as BusFleetRecord[]),
  ...(dysons as BusFleetRecord[]),
  ...(transitSystemsVictoria as BusFleetRecord[]),
  ...(ventura as BusFleetRecord[]),
];

function normaliseRego(value: string) {
  return value.replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

// Registration is the only field guaranteed globally unique across the whole
// database (real-world number plates never collide) — fleet numbers are
// reused independently per depot even within one operator (confirmed: CDC
// Melbourne's "14" is three different physical buses), so registration is
// always tried first.
const BY_REGISTRATION = new Map<string, BusFleetRecord>();
// Fallback index for records with no registration on file (Kinetic's block-
// classified diesel fleet). Only safe because Kinetic's own numbering is
// confirmed company-wide unique, not per-depot — see build script comments.
const BY_OPERATOR_FLEET_NUMBER = new Map<string, BusFleetRecord>();

for (const record of ALL_RECORDS) {
  if (record.registration) {
    const key = normaliseRego(record.registration);
    const existing = BY_REGISTRATION.get(key);
    // A plate can legitimately appear twice — once withdrawn from its old
    // operator's disposal list, once current at whoever bought the bus next
    // (confirmed: several ex-Dysons buses are now active CDC Melbourne
    // vehicles). The active record always reflects reality; never let a
    // stale inactive one shadow it regardless of array/load order.
    if (!existing || (!existing.active && record.active)) {
      BY_REGISTRATION.set(key, record);
    }
  }
  BY_OPERATOR_FLEET_NUMBER.set(`${record.operator}::${record.fleetNumber}`, record);
}

/**
 * Identifies a live bus against the real fleet database. Matching order:
 * 1. Exact registration (globally unique, always correct when present).
 * 2. Operator + fleet number (only safe for operators with company-wide
 *    unique numbering — currently just Kinetic's block-classified diesel
 *    fleet; CDC's per-depot numbering is never looked up this way since
 *    every CDC record already carries a real registration).
 * Never matches on fleet number alone across operators — the same number
 * at two different operators is not the same bus.
 */
export function lookupBusFleetInfo(bus: Pick<LiveBus, "registration" | "operator" | "fleetNumber">): BusFleetRecord | null {
  if (bus.registration) {
    const byRego = BY_REGISTRATION.get(normaliseRego(bus.registration));
    if (byRego) return byRego;
  }
  if (bus.operator && bus.fleetNumber) {
    const byFleetNumber = BY_OPERATOR_FLEET_NUMBER.get(`${bus.operator}::${bus.fleetNumber}`);
    if (byFleetNumber) return byFleetNumber;
  }
  return null;
}

export function getBusPowertrainBadge(powertrain: BusPowertrain): { emoji: string; label: string } | null {
  switch (powertrain) {
    case "battery_electric":
      return { emoji: "⚡", label: "Electric" };
    case "hybrid":
      return { emoji: "♻️", label: "Hybrid" };
    case "diesel":
      return { emoji: "⛽", label: "Diesel" };
    case "hydrogen_fuel_cell":
      return { emoji: "💧", label: "Hydrogen" };
    default:
      return null;
  }
}
