const METRO_ALERTS = [
  {
    id: "planned-works-craigieburn-2026-04-28",
    title: "Craigieburn Line planned works",
    summary:
      "Buses replace trains from 8.30pm to last service on Tuesday 28 April 2026.",
    lines: ["Craigieburn Line"],
    status: "planned works",
    updatedAt: "2026-04-27T08:30:00+10:00",
    url: "https://www.ptv.vic.gov.au/disruptions/disruptions-information/",
    addToCalendarUrl:
      "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Craigieburn%20Line%20planned%20works&details=Buses%20replace%20trains%20from%208.30pm%20to%20last%20service%20on%20Tuesday%2028%20April%202026.&dates=20260428T103000Z/20260428T150000Z",
  },
  {
    id: "station-detour-southern-cross-2025-09-29",
    title: "Southern Cross Station detour",
    summary:
      "From 8.30pm Monday 29 September 2025 until August 2026, there will be changes to the way you access and exit the station due to escalator upgrade works.",
    lines: ["Southern Cross Station"],
    status: "station detour",
    updatedAt: "2026-04-27T08:35:00+10:00",
    url: "https://www.ptv.vic.gov.au/disruptions/disruptions-information/",
    addToCalendarUrl:
      "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Southern%20Cross%20Station%20detour&details=Changes%20to%20the%20way%20you%20access%20and%20exit%20Southern%20Cross%20Station%20due%20to%20escalator%20upgrade%20works.&dates=20250929T103000Z/20260831T120000Z",
  },
];

export default function handler(_req, res) {
  res.status(200).json({ alerts: METRO_ALERTS });
}
