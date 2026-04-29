const reportStore = [];
let nextReportId = 1;

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

function buildReportStats(reports) {
  const routeCounts = new Map();

  for (const report of reports) {
    const lineNumber = typeof report.lineNumber === "string" ? report.lineNumber.trim() : "";
    if (!lineNumber) continue;

    const key = `${report.transportType}:${lineNumber}`;
    const existing = routeCounts.get(key);
    if (existing) {
      existing.reportCount += 1;
      continue;
    }

    routeCounts.set(key, {
      lineNumber,
      transportType: report.transportType,
      reportCount: 1,
    });
  }

  return {
    alertsToday: reports.length,
    riskyRoutes: [...routeCounts.values()]
      .map((route) => ({
        ...route,
        riskLevel: route.reportCount >= 5 ? "high" : route.reportCount >= 3 ? "medium" : "low",
      }))
      .sort((left, right) => right.reportCount - left.reportCount)
      .slice(0, 8),
  };
}

export default async function handler(req, res) {
  const slug = Array.isArray(req.query?.slug) ? req.query.slug : req.query?.slug ? [req.query.slug] : [];
  const action = slug[0] || "";

  if (!action) {
    if (req.method === "GET") {
      sendJson(
        res,
        200,
        [...reportStore].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)),
      );
      return;
    }

    if (req.method === "POST") {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const report = {
        id: nextReportId,
        reportType:
          body.reportType === "delay" || body.reportType === "incident" ? body.reportType : "inspector",
        transportType:
          body.transportType === "tram" || body.transportType === "bus" || body.transportType === "stop"
            ? body.transportType
            : "train",
        lineNumber: typeof body.lineNumber === "string" && body.lineNumber.trim() ? body.lineNumber.trim() : null,
        direction:
          body.direction === "city_bound" || body.direction === "outbound" ? body.direction : "unknown",
        locationName:
          typeof body.locationName === "string" && body.locationName.trim()
            ? body.locationName.trim()
            : "Unknown location",
        notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
        username: typeof body.username === "string" && body.username.trim() ? body.username.trim() : "Guest",
        lat: typeof body.lat === "number" ? body.lat : null,
        lng: typeof body.lng === "number" ? body.lng : null,
        createdAt: new Date().toISOString(),
      };

      reportStore.unshift(report);
      nextReportId += 1;
      sendJson(res, 201, report);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (action === "stats" && req.method === "GET") {
    sendJson(res, 200, buildReportStats(reportStore));
    return;
  }

  sendJson(res, 404, { error: "Unknown reports action" });
}
