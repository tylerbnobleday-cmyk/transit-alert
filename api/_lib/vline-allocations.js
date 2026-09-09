import fs from "node:fs/promises";

// Provider adapter contract: dated, complete, service-linked allocations only.
// A vehicle label or TDN is not evidence of a complete coupled formation.
export function resolveVlineAllocation(service, records, now = Date.now()) {
  const matches = records.filter((record) => record.tripId === service.tripId &&
    record.serviceDate === service.serviceDate && record.complete === true &&
    record.stockType === "VLocity" && typeof record.source === "string" && record.source.trim() &&
    Date.parse(record.observedAt) <= now && Date.parse(record.validUntil) > now &&
    now - Date.parse(record.observedAt) <= 24 * 60 * 60 * 1000 &&
    (!record.vehicleId || record.vehicleId === service.vehicleId));
  matches.sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
  const latest = matches[0];
  if (!latest || (matches[1]?.observedAt === latest.observedAt)) return null;
  if (!Array.isArray(latest.setIds) || !latest.setIds.length ||
      !latest.setIds.every((id) => /^VL\d{1,3}$/i.test(id))) return null;
  const setIds = [...new Set(latest.setIds.map((id) => id.toUpperCase()))];
  if (setIds.length > 3) return null;
  return { tripId: service.tripId, serviceDate: service.serviceDate, vehicleId: service.vehicleId,
    stockType: "VLocity", setIds, carCount: setIds.length * 3,
    source: latest.source, observedAt: latest.observedAt, validUntil: latest.validUntil };
}

export async function loadVlineAllocations() {
  if (!process.env.VLINE_ALLOCATIONS_PATH) return [];
  try {
    const records = JSON.parse(await fs.readFile(process.env.VLINE_ALLOCATIONS_PATH, "utf8"));
    return Array.isArray(records) ? records : [];
  } catch { return []; }
}
