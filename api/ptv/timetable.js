import {
  getVerifiedBusTrip,
  getVerifiedStationDepartures,
  getVerifiedSurfaceStopDepartures,
  getVerifiedTramTrip,
  getVerifiedTrainTrip,
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
    if (type === "train-trip") {
      const tripId = String(req.query?.tripId || "").trim();
      res.status(200).json(await getVerifiedTrainTrip(tripId));
      return;
    }
    if (type === "tram-trip") {
      const tripId = String(req.query?.tripId || "").trim();
      res.status(200).json(await getVerifiedTramTrip(tripId));
      return;
    }
    if (type === "surface-stop") {
      const mode = String(req.query?.mode || "").trim();
      const route = String(req.query?.route || "").trim();
      const lat = Number(req.query?.lat);
      const lng = Number(req.query?.lng);
      // An empty route is deliberate for multi-route stops (e.g. a bus
      // interchange bay) — getVerifiedSurfaceStopDepartures already treats it
      // as "every route serving this exact stop", only the location is required.
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        res.status(400).json({ error: "A stop location is required." });
        return;
      }
      res.status(200).json(await getVerifiedSurfaceStopDepartures({ mode, route, lat, lng }));
      return;
    }
    res.status(400).json({ error: "Unknown timetable request type." });
  } catch (error) {
    res.status(503).json({
      error: error instanceof Error ? error.message : "Verified timetable data is unavailable.",
    });
  }
}
