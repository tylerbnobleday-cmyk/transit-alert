export type LiveTrain = {
  tdn: string;
  lat: number;
  lng: number;
  line: string;
  destination: string;
  status?: "on_time" | "delayed" | "early";
  timestamp?: string;
  direction: "up" | "down" | "city-bound" | "outbound";
  heading?: number;
  trainType: string;
  consist: string;
  serviceDescription?: string;
};

type LiveTrainResponse =
  | LiveTrain[]
  | {
      trains?: LiveTrain[];
    };

function normaliseLiveTrain(raw: Partial<LiveTrain> & Record<string, unknown>, index: number): LiveTrain | null {
  if (typeof raw.lat !== "number" || typeof raw.lng !== "number") {
    return null;
  }

  return {
    tdn: typeof raw.tdn === "string" && raw.tdn.trim() ? raw.tdn : `train-${index}`,
    lat: raw.lat,
    lng: raw.lng,
    line: typeof raw.line === "string" && raw.line.trim() ? raw.line : "Metro",
    destination: typeof raw.destination === "string" && raw.destination.trim() ? raw.destination : "Unknown",
    status:
      raw.status === "on_time" || raw.status === "delayed" || raw.status === "early"
        ? raw.status
        : "on_time",
    timestamp: typeof raw.timestamp === "string" ? raw.timestamp : undefined,
    direction:
      raw.direction === "up" ||
      raw.direction === "down" ||
      raw.direction === "city-bound" ||
      raw.direction === "outbound"
        ? raw.direction
        : "down",
    heading: typeof raw.heading === "number" ? raw.heading : undefined,
    trainType: typeof raw.trainType === "string" && raw.trainType.trim() ? raw.trainType : "Metro Train",
    consist: typeof raw.consist === "string" && raw.consist.trim() ? raw.consist : "Unknown",
    serviceDescription: typeof raw.serviceDescription === "string" ? raw.serviceDescription : undefined,
  };
}

export async function fetchLiveTrains(): Promise<LiveTrain[]> {
  const response = await fetch("/api/ptv/live-trains");

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    let message = `Failed to load live trains (${response.status})`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload?.error) {
        message = payload.error;
      }
    } catch {
      // Keep the generic message if the endpoint did not return JSON.
    }
    throw new Error(message);
  }

  const payload = (await response.json()) as LiveTrainResponse;
  const trains = Array.isArray(payload) ? payload : payload.trains ?? [];

  return trains
    .map((train, index) => normaliseLiveTrain(train, index))
    .filter((train): train is LiveTrain => train !== null);
}
