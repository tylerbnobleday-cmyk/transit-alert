import { planJourney } from "../_lib/journey-graph.js";

function readText(value) {
  const text = String(value ?? "").trim();
  return text.length > 0 && text.length <= 200 ? text : undefined;
}

function readCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export default async function handler(req, res) {
  try {
    const query = req.query || {};
    const originName = readText(query.originName);
    const destinationName = readText(query.destinationName);
    const originLat = readCoordinate(query.originLat);
    const originLng = readCoordinate(query.originLng);
    const destinationLat = readCoordinate(query.destinationLat);
    const destinationLng = readCoordinate(query.destinationLng);

    if (!originName && (originLat === undefined || originLng === undefined)) {
      res.status(400).json({ error: "An origin name or coordinates are required." });
      return;
    }
    if (!destinationName && (destinationLat === undefined || destinationLng === undefined)) {
      res.status(400).json({ error: "A destination name or coordinates are required." });
      return;
    }

    const plan = await planJourney({
      originName,
      originLat,
      originLng,
      destinationName,
      destinationLat,
      destinationLng,
    });
    res.status(200).json(plan);
  } catch (error) {
    res.status(503).json({
      error: error instanceof Error ? error.message : "Journey planning is unavailable right now.",
      found: false,
    });
  }
}
