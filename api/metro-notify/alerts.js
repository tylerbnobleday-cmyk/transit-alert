const METRO_ALERTS = [
  {
    id: "planned-works-southern-cross-escalator-2026-05-01",
    title: "Southern Cross escalator upgrade works",
    summary:
      "All lines: from Friday 1 May 2026 until Sunday 31 May 2026, there will be changes to the way you access and exit Southern Cross Station while escalator upgrade works continue.",
    lines: ["All lines", "Southern Cross Station"],
    status: "station detour",
    updatedAt: "2026-05-01T09:00:00+10:00",
    url: "https://www.metrotrains.com.au/planned-works/",
    addToCalendarUrl:
      "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Southern%20Cross%20escalator%20upgrade%20works&details=All%20lines%20access%20changes%20at%20Southern%20Cross%20Station%20while%20escalator%20upgrade%20works%20continue.&dates=20260501T000000Z/20260531T140000Z",
  },
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
    id: "planned-works-craigieburn-weekend-2026-05-01",
    title: "Buses replace trains between North Melbourne and Craigieburn",
    summary:
      "8.30pm Friday 1 May to last service Sunday 3 May. Buses replace trains between North Melbourne and Craigieburn while maintenance and renewal works take place.",
    lines: ["Craigieburn Line"],
    status: "planned works",
    updatedAt: "2026-05-01T08:30:00+10:00",
    url: "https://www.metrotrains.com.au/planned-works/",
    addToCalendarUrl:
      "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Buses%20replace%20trains%20between%20North%20Melbourne%20and%20Craigieburn&details=Buses%20replace%20trains%20between%20North%20Melbourne%20and%20Craigieburn%20from%208.30pm%20Friday%201%20May%20to%20last%20service%20Sunday%203%20May.&dates=20260501T103000Z/20260503T140000Z",
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
  {
    id: "planned-works-sandringham-night-2026-05-17",
    title: "Sandringham night works between Flinders Street and Sandringham",
    summary:
      "Night works between Flinders Street and Sandringham on Sunday 17 May and Monday 18 May. Maintenance works will take place along the Sandringham corridor overnight.",
    lines: ["Sandringham Line"],
    status: "planned works",
    updatedAt: "2026-05-02T09:15:00+10:00",
    url: "https://www.metrotrains.com.au/planned-works/",
    addToCalendarUrl:
      "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Sandringham%20night%20works%20between%20Flinders%20Street%20and%20Sandringham&details=Night%20works%20between%20Flinders%20Street%20and%20Sandringham%20on%20Sunday%2017%20May%20and%20Monday%2018%20May.&dates=20260517T110000Z/20260518T180000Z",
  },
];

export default function handler(_req, res) {
  res.status(200).json({ alerts: METRO_ALERTS });
}
