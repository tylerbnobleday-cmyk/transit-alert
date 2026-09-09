import crypto from "node:crypto";

const BASE_URL = "https://timetableapi.ptv.vic.gov.au";

function credentials() {
  const developerId = String(process.env.PTV_DEVELOPER_ID || "").trim();
  const apiKey = String(process.env.PTV_TIMETABLE_API_KEY || "").trim();
  if (!developerId || !apiKey) throw new Error("PTV Timetable v3 credentials are not configured.");
  return { developerId, apiKey };
}

export function isPtvV3Configured() {
  return Boolean(process.env.PTV_DEVELOPER_ID && process.env.PTV_TIMETABLE_API_KEY);
}

export function signedPtvV3Url(pathname, parameters = {}) {
  const { developerId, apiKey } = credentials();
  const url = new URL(pathname, BASE_URL);
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  url.searchParams.set("devid", developerId);
  const requestTarget = `${url.pathname}?${url.searchParams.toString()}`;
  const signature = crypto.createHmac("sha1", apiKey).update(requestTarget).digest("hex").toUpperCase();
  url.searchParams.set("signature", signature);
  return url;
}

export async function ptvV3Fetch(pathname, parameters = {}, timeoutMs = 20_000) {
  const response = await fetch(signedPtvV3Url(pathname, parameters), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.error || `PTV Timetable v3 failed (${response.status}).`);
  return data;
}

export async function verifyPtvV3() {
  const data = await ptvV3Fetch("/v3/route_types");
  return {
    ok: Array.isArray(data.route_types),
    routeTypes: Array.isArray(data.route_types) ? data.route_types.length : 0,
  };
}
