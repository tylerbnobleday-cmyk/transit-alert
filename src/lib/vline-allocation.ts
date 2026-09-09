import type { LiveTrain } from "./live-trains";

export function getCurrentVlineAllocation(vehicle: LiveTrain) {
  const allocation = vehicle.allocation;
  if (!allocation || allocation.tripId !== vehicle.tripId ||
      allocation.serviceDate !== vehicle.serviceDate || Date.parse(allocation.validUntil) <= Date.now() ||
      !Number.isFinite(Date.parse(allocation.validUntil))) return null;
  return allocation;
}
