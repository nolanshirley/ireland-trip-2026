# 🍀 Ireland Trip Dashboard — Vue 3 Edition (October 2026)

Interactive, reactive travel dashboard for the Ireland trip built with **Vue 3 (No-Build Standalone)**.

## Architecture

```
ireland-trip-vue/
├── index.html                  ← Open this in any browser
├── README.md
├── lib/
│   ├── tailwind.min.js         ← Local Tailwind CSS runtime
│   └── vue.global.prod.js      ← Local Vue 3 production runtime (no build step)
├── css/
│   └── styles.css              ← Custom theme tokens + dark mode styles
└── js/
    ├── data.js                 ← Trip data (schedule, weather, hikes, restaurants, bookings)
    ├── app.js                  ← Vue 3 app instance & reactivity
    └── components/
        ├── DailyPlanner.js     ← Hourly calendar matrix (06:00–24:00) & time-blocking
        ├── WeatherPacking.js   ← October 2026 14-day forecast, outfit rules & packing list
        ├── HikingNature.js     ← Trail network with elevation, gear & matching statuses
        ├── HeatMap.js          ← Region ratings & searchable attraction list
        ├── Distances.js        ← Driving matrix with urgency filters & transfer flags
        ├── Restaurants.js      ← City selector, booking status filter & food cards
        └── Reservations.js     ← Booking tracker with cancellation policy alerts
```

## Features

- 📅 **Hour-by-Hour Time Blocking**: Visual 18-hour ribbon strip (06:00 to 24:00) and full calendar matrix blocking mandatory scheduled activities, car transfers, and dinners.
- 🌦️ **October 2026 Weather & Outfits**:
  - 14-day daily forecast across Northern Ireland, Galway/West, Kerry/Southwest, and Dublin/East.
  - Location-specific dress codes (Wild Atlantic cliffs, mountain bogs, city pub crawls, and Mom's Birthday dinner at Mister S).
  - Interactive packing checklist with progress tracker.
- 🥾 **Hiking & Nature Trails**: 13 detailed trails with difficulty, elevation gain, distance, required footwear/gear, and matching statuses (*Confirmed*, *Planned*, *Optional*).
- 🌙 **Persistent Dark Mode**: Instant toggle with system preference detection and localStorage persistence.
- 📱 **Zero-Build & Self-Contained**: Runs directly off local files with no internet or Node.js required.

## Hosting on GitHub Pages

1. Push this directory to your GitHub repository.
2. In GitHub, go to **Settings → Pages**.
3. Select branch `main` and root `/`.
4. Share your public URL with trip companions!
