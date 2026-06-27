export default function handler(req, res) {
  const consist = Array.isArray(req.query?.consist) ? req.query.consist[0] : req.query?.consist;
  res.status(200).json({
    consist: consist || "430M",
    as_of: new Date().toISOString(),
    status: "idle",
    current_trip: null,
    position: null,
    next_trip: null,
    network_alerts: [],
    _meta: {
      source: "render-fallback",
      note: "Live consist tracking is not configured in this deployment. Using fallback response.",
    },
  });
}
