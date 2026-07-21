import {
  getVerifiedBusTrip,
  getVerifiedStationDepartures,
} from "../_lib/ptv-timetable.js";

export default async function handler(req, res) {
  try {
    const type = String(req.query?.type || "").trim();
    if (type === "station") {
      const stationName = String(req.query?.station || "").trim();
      if (!stationName) {
        res.status(400).json({ error: "Station name is required." });
        return;
      }
      if (stationName.length > 100) {
        res.status(400).json({ error: "Station name is too long." });
        return;
      }
      res.status(200).json(await getVerifiedStationDepartures(stationName));
      return;
    }
    if (type === "bus-trip") {
      const tripId = String(req.query?.tripId || "").trim();
      res.status(200).json(await getVerifiedBusTrip(tripId));
      return;
    }
    res.status(400).json({ error: "Unknown timetable request type." });
  } catch (error) {
    res.status(503).json({
      error: error instanceof Error ? error.message : "Verified timetable data is unavailable.",
    });
  }
}
