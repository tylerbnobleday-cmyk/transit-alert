import { isPtvV3Configured, verifyPtvV3 } from "../_lib/ptv-v3.js";

export default async function handler(_req, res) {
  if (!isPtvV3Configured()) {
    res.status(503).json({ configured: false, online: false, error: "PTV Timetable v3 credentials are not configured." });
    return;
  }
  try {
    const result = await verifyPtvV3();
    res.status(200).json({ configured: true, online: result.ok, routeTypes: result.routeTypes });
  } catch (error) {
    res.status(503).json({ configured: true, online: false, error: error instanceof Error ? error.message : "PTV Timetable v3 check failed." });
  }
}
