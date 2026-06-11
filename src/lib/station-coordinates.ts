const STATION_COORDINATES: Record<string, [number, number]> = {
  "Flinders Street": [-37.8184161, 144.9664779],
  "Southern Cross": [-37.8176, 144.9522],
  "North Melbourne": [-37.8073, 144.9426],
  Richmond: [-37.82359625345165, 144.9891977969667],
  Newport: [-37.8426, 144.8833],
  Williamstown: [-37.8673, 144.9006],
  "North Williamstown": [-37.8573, 144.8872],
  "Williamstown Beach": [-37.8636, 144.8994],
  Sandringham: [-37.95036297669773, 145.00454952822133],
  Frankston: [-38.1426676, 145.1262003],
  Werribee: [-37.8999, 144.6602],
};

const STATION_NAME_ALIASES: Record<string, string> = {
  fss: "Flinders Street",
  "flinders street station": "Flinders Street",
  scs: "Southern Cross",
  "southern cross station": "Southern Cross",
  thl: "Town Hall",
  "town hall station": "Town Hall",
  mce: "Melbourne Central",
  "melbourne central station": "Melbourne Central",
  sll: "State Library",
  "state library station": "State Library",
  fla: "Flagstaff",
  "flagstaff station": "Flagstaff",
  par: "Parliament",
  "parliament station": "Parliament",
  nme: "North Melbourne",
  "north melbourne station": "North Melbourne",
  rmd: "Richmond",
  "richmond station": "Richmond",
};

function normaliseStationName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function resolveStationAliasName(name?: string | null): string | null {
  if (!name) {
    return null;
  }

  const normalised = normaliseStationName(name);
  return STATION_NAME_ALIASES[normalised] ?? name.trim();
}

export function findStationCoordinate(name?: string | null): [number, number] | null {
  if (!name) {
    return null;
  }

  const canonicalName = resolveStationAliasName(name) ?? name;
  const normalised = normaliseStationName(canonicalName);
  const match = Object.entries(STATION_COORDINATES).find(
    ([stationName]) => normaliseStationName(stationName) === normalised,
  );

  return match ? match[1] : null;
}
