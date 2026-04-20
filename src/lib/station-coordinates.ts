const STATION_COORDINATES: Record<string, [number, number]> = {
  "Flinders Street": [-37.8184161, 144.9664779],
  "Southern Cross": [-37.8176, 144.9522],
  "North Melbourne": [-37.8073, 144.9426],
  Richmond: [-37.82359625345165, 144.9891977969667],
  Newport: [-37.8426, 144.8833],
  Williamstown: [-37.8673, 144.9006],
  "North Williamstown": [-37.8573, 144.8872],
  "Williamstown Beach": [-37.8636, 144.8994],
  Sandringham: [-37.9528, 145.0047],
  Frankston: [-38.1426676, 145.1262003],
  Werribee: [-37.8999, 144.6602],
};

function normaliseStationName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function findStationCoordinate(name?: string | null): [number, number] | null {
  if (!name) {
    return null;
  }

  const normalised = normaliseStationName(name);
  const match = Object.entries(STATION_COORDINATES).find(
    ([stationName]) => normaliseStationName(stationName) === normalised,
  );

  return match ? match[1] : null;
}
