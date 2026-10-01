// =============================================================
//  IRELAND TRIP DATA  –  October 2026 Edition (Interlinked Model)
// =============================================================

function parseTimeToHour(timeStr) {
  if (timeStr === undefined || timeStr === null) return 10;
  if (typeof timeStr === 'number' && !isNaN(timeStr)) {
    if (timeStr >= 0 && timeStr <= 24) return timeStr;
  }
  const str = timeStr.toString().trim().toUpperCase();
  if (!str) return 10;

  if (str.includes('MORNING')) return 9;
  if (str.includes('AFTERNOON') || str.includes('LUNCH')) return 13;
  if (str.includes('EVENING') || str.includes('DINNER')) return 18;
  if (str.includes('NIGHT')) return 20;

  const match = str.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) / 60 : 0;
    const meridian = match[3] ? match[3].toUpperCase() : null;

    if (meridian === 'PM') {
      if (hours < 12) hours += 12;
    } else if (meridian === 'AM') {
      if (hours === 12) hours = 0;
    } else {
      // If 1..7 without AM/PM, it's 1 PM..7 PM in daytime schedule (13..19)
      if (hours >= 1 && hours <= 7) {
        hours += 12;
      }
    }
    return Math.min(24, Math.max(0, hours + minutes));
  }
  return 10;
}

function formatHourToTime(decimalHour) {
  if (decimalHour === undefined || decimalHour === null || isNaN(decimalHour)) return '10:00 AM';
  let h = Math.floor(decimalHour);
  let m = Math.round((decimalHour - h) * 60);
  if (m >= 60) { h += 1; m = 0; }
  h = Math.min(24, Math.max(0, h));
  const meridian = (h >= 12 && h < 24) ? 'PM' : 'AM';
  let displayH = h % 12;
  if (displayH === 0) displayH = 12;
  const displayM = m < 10 ? '0' + m : m;
  return `${displayH}:${displayM} ${meridian}`;
}

function formatHourTo24Time(decimalHour) {
  if (decimalHour === undefined || decimalHour === null || isNaN(decimalHour)) return '10:00';
  let h = Math.floor(decimalHour);
  let m = Math.round((decimalHour - h) * 60);
  if (m >= 60) { h += 1; m = 0; }
  h = Math.min(23, Math.max(0, h));
  const hh = h < 10 ? '0' + h : h;
  const mm = m < 10 ? '0' + m : m;
  return `${hh}:${mm}`;
}

function getItemTimeRange(item) {
  if (!item) return { start: 10, end: 11.5, dur: 1.5 };
  let start = null;
  let end = null;

  // 1. Explicit numeric properties if present
  if (typeof item.startHour === 'number' && !isNaN(item.startHour)) {
    start = item.startHour;
  }
  if (typeof item.endHour === 'number' && !isNaN(item.endHour)) {
    end = item.endHour;
  }

  // 2. Parse from time string if start or end are missing
  if (item.time && typeof item.time === 'string') {
    const parts = item.time.split(/–|-|—|\bto\b/i);
    if (parts.length >= 2) {
      const parsedStart = parseTimeToHour(parts[0].trim());
      const parsedEnd = parseTimeToHour(parts[1].trim());
      if (start === null) start = parsedStart;
      if (end === null) end = parsedEnd;
    } else if (start === null) {
      start = parseTimeToHour(item.time);
    }
  }

  if (start === null) start = 10;

  // 3. Fallback end from duration if end is still undefined or <= start
  if (end === null || end <= start) {
    let dur = typeof item.durHours === 'number' && !isNaN(item.durHours) ? item.durHours : null;
    if (dur === null && item.dur && typeof item.dur === 'string') {
      const hMatch = item.dur.match(/([\d.]+)\s*h(?:r|ours?)?/i);
      if (hMatch) {
        dur = parseFloat(hMatch[1]);
      } else {
        const mMatch = item.dur.match(/(\d+)\s*m(?:in|inutes?)?/i);
        if (mMatch) {
          dur = parseFloat(mMatch[1]) / 60;
        }
      }
    }
    if (dur === null || isNaN(dur) || dur <= 0) {
      dur = 1.5;
    }
    end = start + dur;
  }

  const dur = Math.max(0.25, parseFloat((end - start).toFixed(2)));
  return { start, end, dur };
}

const TRIP = {
  title: '🍀 Ireland Trip',
  subtitle: 'October 2026 · 4 Regions · 12 Nights · Autumn Weather & Nature Trails',
  dates: { start: 'Oct 2', end: 'Oct 14' },
  housing: [
    {
      id: 'walnut-retreat',
      name: 'Walnut Retreat',
      region: 'ni',
      base: 'Newry',
      dates: 'Oct 2–5 (3 nights)',
      checkin: '11:30 AM Oct 2',
      checkout: '11:00 AM Oct 5',
      mapsQuery: 'Newry+Northern+Ireland',
      notes: 'Base #1 for Northern Ireland, Mourne Mountains & Causeway Coast.'
    },
    {
      id: 'spiddal-villa',
      name: 'Spiddal Villa',
      region: 'galway',
      base: 'Spiddal',
      dates: 'Oct 5–8 (3 nights)',
      checkin: '4:00 PM Oct 5',
      checkout: '11:00 AM Oct 8',
      mapsQuery: 'Spiddal+Galway+Ireland',
      notes: 'Base #2 for Connemara, Cliffs of Moher, Galway Latin Quarter & Dad & Erin Bday.'
    },
    {
      id: 'milltown-house',
      name: 'Milltown House',
      region: 'kerry',
      base: 'Killarney',
      dates: 'Oct 8–11 (3 nights)',
      checkin: '12:00 PM Oct 8',
      checkout: '8:00 AM Oct 11',
      mapsQuery: 'Milltown+Killarney+County+Kerry+Ireland',
      notes: 'Base #3 for Killarney National Park, Gap of Dunloe & Dingle Peninsula.'
    },
    {
      id: 'navan-home',
      name: 'Navan Home',
      region: 'dublin',
      base: 'Navan',
      dates: 'Oct 11–14 (3 nights)',
      checkin: '3:00 PM Oct 11',
      checkout: '11:00 AM Oct 14',
      mapsQuery: 'Navan+County+Meath+Ireland',
      notes: 'Base #4 for Boyne Valley, Guinness Storehouse, Dublin City & Mom Bday.'
    }
  ]
};

// ── Regions ──────────────────────────────────────────────────
const regions = [
  {
    id: 'ni',
    name: 'Northern Ireland',
    sub: 'Newry Base · Oct 2–5',
    color: '#10b981',
    ratings: { nature: 8, city: 7, history: 9, culture: 8, food: 8, activities: 8, sport: 7, scenic: 9 },
    notes: 'Giants Causeway, Belfast city, Titanic, Mourne Mountains, crisp coastal weather',
  },
  {
    id: 'galway',
    name: 'Galway / Connemara',
    sub: 'Spiddal Base · Oct 5–8',
    color: '#3b82f6',
    ratings: { nature: 10, city: 7, history: 7, culture: 9, food: 8, activities: 7, sport: 6, scenic: 10 },
    notes: 'Cliffs of Moher, wild Connemara hikes, Kylemore Abbey, vibrant Latin Quarter, The Burren',
  },
  {
    id: 'kerry',
    name: 'Kerry / Killarney',
    sub: 'Milltown Base · Oct 8–11',
    color: '#8b5cf6',
    ratings: { nature: 10, city: 5, history: 7, culture: 8, food: 9, activities: 9, sport: 8, scenic: 10 },
    notes: 'Killarney National Park, Dingle Peninsula, Slea Head, Gap of Dunloe, rich food scene',
  },
  {
    id: 'dublin',
    name: 'Dublin / East',
    sub: 'Navan Base · Oct 11–14',
    color: '#f59e0b',
    ratings: { nature: 4, city: 10, history: 9, culture: 9, food: 9, activities: 8, sport: 7, scenic: 3 },
    notes: "Temple Bar, Guinness, Newgrange, Kilkenny, lively pub scene, Mom's birthday!",
  },
];

// ── Attractions per region ────────────────────────────────────
const attractions = {
  ni: [
    { name: 'Giants Causeway',              nature: 10, history: 8,  culture: 7,  activity: 8,  time: '2–3h',   dist: '2h 15m from Newry', mapsQuery: "Giant's+Causeway+Visitor+Centre" },
    { name: 'Titanic Museum',               nature: 1,  history: 10, culture: 9,  activity: 7,  time: '2–3h',   dist: '1h (Belfast)', mapsQuery: 'Titanic+Belfast' },
    { name: 'Peace Wall + Black Cab Tour',  nature: 1,  history: 10, culture: 10, activity: 8,  time: '1.5–2h', dist: '1h (Belfast)', mapsQuery: 'Falls+Road+Belfast+Peace+Wall' },
    { name: "St. Anne's Cathedral",         nature: 1,  history: 8,  culture: 8,  activity: 4,  time: '30–45m', dist: '1h (Belfast)', mapsQuery: "St+Anne's+Cathedral+Belfast" },
    { name: "St. George's Market",          nature: 1,  history: 3,  culture: 9,  activity: 7,  time: '1–2h',   dist: '1h (Belfast)', mapsQuery: "St+George's+Market+Belfast" },
    { name: 'Carrick-a-Rede Rope Bridge',   nature: 9,  history: 5,  culture: 4,  activity: 9,  time: '1–1.5h', dist: '2h 20m from Newry', mapsQuery: 'Carrick-a-Rede+Rope+Bridge' },
    { name: 'Old Bushmills Distillery',     nature: 2,  history: 7,  culture: 8,  activity: 7,  time: '1.5h',   dist: '2h 10m from Newry', mapsQuery: 'Old+Bushmills+Distillery' },
    { name: 'Kilbroney Park Forest',        nature: 9,  history: 2,  culture: 2,  activity: 7,  time: '1.5–2h', dist: '15m from Newry', mapsQuery: 'Kilbroney+Park+Rostrevor' },
    { name: 'Slieve Gullion Forest',        nature: 9,  history: 4,  culture: 3,  activity: 8,  time: '2–3h',   dist: '20m from Newry', mapsQuery: 'Slieve+Gullion+Forest+Park' },
    { name: 'Mourne AONB',                  nature: 10, history: 3,  culture: 3,  activity: 9,  time: '3–5h',   dist: '30m from Newry', mapsQuery: 'Mourne+Mountains+Newcastle' },
    { name: 'Coastal Causeway Route',       nature: 9,  history: 5,  culture: 6,  activity: 6,  time: '4–6h',   dist: 'Belfast → Derry', mapsQuery: 'Causeway+Coastal+Route' },
    { name: "Bagenal's Castle",             nature: 1,  history: 8,  culture: 6,  activity: 4,  time: '1h',     dist: '5m (Newry)', mapsQuery: "Bagenal's+Castle+Newry" },
    { name: 'Derrymore House',              nature: 6,  history: 7,  culture: 5,  activity: 3,  time: '1h',     dist: '10m from Newry', mapsQuery: 'Derrymore+House+Bessbrook' },
    { name: 'Ballymacdermott Court Tomb',   nature: 5,  history: 8,  culture: 4,  activity: 3,  time: '30m',    dist: '10m from Newry', mapsQuery: 'Ballymacdermott+Court+Tomb' },
  ],
  galway: [
    { name: 'Cliffs of Moher',        nature: 10, history: 3, culture: 5,  activity: 7, time: '2–3h',  dist: '1h 10m south', mapsQuery: 'Cliffs+of+Moher' },
    { name: 'Connemara National Park',nature: 10, history: 2, culture: 3,  activity: 8, time: '3–4h',  dist: '50m', mapsQuery: 'Connemara+National+Park+Visitor+Centre' },
    { name: 'Kylemore Abbey',         nature: 8,  history: 8, culture: 7,  activity: 5, time: '2–3h',  dist: '1h 10m', mapsQuery: 'Kylemore+Abbey+Connemara' },
    { name: 'Dunguaire Castle',       nature: 5,  history: 8, culture: 7,  activity: 4, time: '1h',    dist: '35m', mapsQuery: 'Dunguaire+Castle+Kinvara' },
    { name: 'Galway City (explore)',  nature: 2,  history: 5, culture: 10, activity: 8, time: '3–5h',  dist: '20m', mapsQuery: 'Latin+Quarter+Galway' },
    { name: 'Burren National Park',   nature: 9,  history: 6, culture: 4,  activity: 7, time: '2–3h',  dist: '50m', mapsQuery: 'Burren+National+Park' },
    { name: 'Cong (Ashford Castle)',  nature: 7,  history: 8, culture: 6,  activity: 5, time: '2–3h',  dist: '1h 15m', mapsQuery: 'Ashford+Castle+Cong' },
  ],
  kerry: [
    { name: 'Killarney National Park',nature: 10, history: 5,  culture: 4, activity: 9,  time: '3–5h',  dist: '15m', mapsQuery: 'Killarney+National+Park' },
    { name: 'Ross Castle',            nature: 6,  history: 9,  culture: 7, activity: 5,  time: '1–1.5h',dist: '10m', mapsQuery: 'Ross+Castle+Killarney' },
    { name: 'Torc Waterfall',         nature: 9,  history: 1,  culture: 1, activity: 6,  time: '30–45m',dist: '15m', mapsQuery: 'Torc+Waterfall+Killarney' },
    { name: 'Muckross Abbey',         nature: 6,  history: 9,  culture: 7, activity: 4,  time: '45m–1h',dist: '10m', mapsQuery: 'Muckross+Abbey+Killarney' },
    { name: 'Gap of Dunloe',          nature: 10, history: 3,  culture: 4, activity: 9,  time: '3–4h',  dist: '25m', mapsQuery: "Kate+Kearney's+Cottage+Gap+of+Dunloe" },
    { name: 'Dingle Peninsula',       nature: 9,  history: 6,  culture: 9, activity: 7,  time: '4–6h',  dist: '1h 10m', mapsQuery: 'Dingle+Town+Marina' },
    { name: 'Slea Head Drive',        nature: 10, history: 5,  culture: 6, activity: 6,  time: '2–3h',  dist: '1h 20m (via Dingle)', mapsQuery: 'Slea+Head+Viewpoint' },
    { name: 'Cork (day trip)',         nature: 3,  history: 6,  culture: 8, activity: 7,  time: '4–6h',  dist: '1h 20m', mapsQuery: 'English+Market+Cork' },
    { name: 'Rock of Cashel',         nature: 3,  history: 10, culture: 8, activity: 5,  time: '1–1.5h',dist: '1h 50m (otw Dublin)', mapsQuery: 'Rock+of+Cashel' },
    { name: 'Strickeen Mountain',     nature: 10, history: 1,  culture: 1, activity: 10, time: '2–3h',  dist: '25m', mapsQuery: 'Strickeen+Mountain+Trailhead' },
  ],
  dublin: [
    { name: 'Newgrange Monument',      nature: 4, history: 10, culture: 8,  activity: 6, time: '2–3h',  dist: '20m from Navan', mapsQuery: 'Brú+na+Bóinne+Visitor+Centre+Newgrange' },
    { name: 'Kilkenny (pit stop)',     nature: 3, history: 9,  culture: 8,  activity: 7, time: '3–4h',  dist: '1h 45m from Navan', mapsQuery: 'Kilkenny+Castle' },
    { name: "Smithwick's Experience",  nature: 1, history: 7,  culture: 8,  activity: 7, time: '1.5h',  dist: 'In Kilkenny', mapsQuery: "Smithwick's+Experience+Kilkenny" },
    { name: 'Guinness Storehouse',     nature: 1, history: 8,  culture: 9,  activity: 8, time: '2–3h',  dist: '50m (Dublin)', mapsQuery: 'Guinness+Storehouse+Dublin' },
    { name: 'Temple Bar Crawl',        nature: 1, history: 5,  culture: 10, activity: 9, time: '3–5h',  dist: '50m (Dublin)', mapsQuery: 'The+Temple+Bar+Pub+Dublin' },
    { name: "St. Patrick's Cathedral", nature: 2, history: 9,  culture: 8,  activity: 4, time: '45m–1h',dist: '50m (Dublin)', mapsQuery: "Saint+Patrick's+Cathedral+Dublin" },
    { name: 'General Post Office',     nature: 1, history: 10, culture: 7,  activity: 4, time: '45m–1h',dist: '50m (Dublin)', mapsQuery: 'GPO+Museum+Dublin' },
    { name: 'Brazen Head (oldest pub)',nature: 1, history: 8,  culture: 9,  activity: 7, time: '1–2h',  dist: '50m (Dublin)', mapsQuery: 'The+Brazen+Head+Dublin' },
  ],
};

// ── October 2026 Weather Patterns & Forecast ─────────────────
const weatherData = {
  general: {
    title: 'Autumn in Ireland (October 2026)',
    tempRange: '8°C – 14°C (46°F – 58°F)',
    daylight: 'Sunrise ~7:45 AM · Sunset ~6:35 PM (10.5 hrs light)',
    rainfall: 'Typical Atlantic passing fronts (45–60% rain probability, light mist to brisk showers)',
    winds: 'Moderate to Fresh breeze (15–30 km/h, gusting to 45+ km/h on Atlantic cliffs)',
    advice: 'Layering is king: Waterproof breathable outer shell + warm fleece mid-layer + thermal base. Do not rely on umbrellas on coastal cliffs!'
  },
  regionalOverview: [
    {
      region: 'Northern Ireland (Newry & Causeway Coast)',
      highLow: '13°C / 7°C (55°F / 45°F)',
      conditions: 'Brisk coastal winds, passing showers, crisp morning sea air',
      outfitRecommendation: 'Windproof Gore-Tex shell, fleece jacket, waterproof hiking boots with grip, beanie for coastal cliffs.'
    },
    {
      region: 'Galway & Connemara (West Atlantic Coast)',
      highLow: '14°C / 8°C (57°F / 46°F)',
      conditions: 'Frequent Atlantic squalls, dramatic shifting light, gusty cliffs',
      outfitRecommendation: 'Heavy-duty waterproofs, rain pants for Diamond Hill/Cliffs of Moher, thermal layers, warm wool socks.'
    },
    {
      region: 'Kerry & Dingle Peninsula (Southwest)',
      highLow: '14°C / 9°C (57°F / 48°F)',
      conditions: 'Mild maritime breeze, lush humidity, damp mountain passes',
      outfitRecommendation: 'Waterproof trail boots, packable rain jacket, layered sweater, casual pub evening wear.'
    },
    {
      region: 'Dublin & East Coast (Navan / Kilkenny)',
      highLow: '15°C / 7°C (59°F / 45°F)',
      conditions: 'Driest region, crisp autumn evenings, cool mornings',
      outfitRecommendation: 'Smart casual layers, stylish walking boots/sneakers, warm coat for pub crawl, formal dinner attire for Mister S.'
    }
  ],
  dailyForecast: [
    { date: 'Oct 2 (Fri)', region: 'Northern Ireland', tempHigh: '13°C / 55°F', tempLow: '7°C / 45°F', rainProb: '40%', wind: '20 km/h', icon: '🌦️', condition: 'Passing showers & sun breaks', outfit: 'Layered travel wear, waterproof jacket for arrival & walk' },
    { date: 'Oct 3 (Sat)', region: 'Northern Ireland', tempHigh: '14°C / 57°F', tempLow: '8°C / 46°F', rainProb: '30%', wind: '18 km/h', icon: '⛅', condition: 'Partly sunny & crisp', outfit: 'Smart casual city layers, comfortable walking shoes for Belfast & Titanic' },
    { date: 'Oct 4 (Sun)', region: 'Northern Ireland', tempHigh: '12°C / 54°F', tempLow: '6°C / 43°F', rainProb: '55%', wind: '35 km/h', icon: '💨', condition: 'Windy with coastal squalls', outfit: 'Heavy windproof shell, thermal base, hiking boots, warm hat for Giant’s Causeway' },
    { date: 'Oct 5 (Mon)', region: 'Galway / West', tempHigh: '14°C / 57°F', tempLow: '8°C / 46°F', rainProb: '50%', wind: '25 km/h', icon: '🌧️', condition: 'Atlantic rain bands & breezy', outfit: 'Comfortable road-trip clothes, waterproof jacket for Galway City walk' },
    { date: 'Oct 6 (Tue)', region: 'Galway / Clare', tempHigh: '13°C / 55°F', tempLow: '7°C / 45°F', rainProb: '45%', wind: '40 km/h', icon: '💨', condition: 'High winds on coastal cliffs', outfit: 'NO UMBRELLAS. Windbreaker hooded jacket, sturdy boots, fleece for Cliffs of Moher' },
    { date: 'Oct 7 (Wed)', region: 'Galway / Connemara', tempHigh: '12°C / 54°F', tempLow: '6°C / 43°F', rainProb: '60%', wind: '22 km/h', icon: '🌦️', condition: 'Damp mist & mountain showers', outfit: 'Waterproof hiking pants & jacket, high-traction boots for Diamond Hill hike' },
    { date: 'Oct 8 (Thu)', region: 'Kerry / Killarney', tempHigh: '14°C / 57°F', tempLow: '9°C / 48°F', rainProb: '35%', wind: '18 km/h', icon: '⛅', condition: 'Mild with sunny intervals', outfit: 'Midweight fleece, water-resistant shoes, casual dinner outfit for Cronins' },
    { date: 'Oct 9 (Fri)', region: 'Kerry / Dingle', tempHigh: '13°C / 55°F', tempLow: '8°C / 46°F', rainProb: '50%', wind: '32 km/h', icon: '🌊', condition: 'Ocean breeze & scenic squalls', outfit: 'Windproof outer shell, knit beanie, wool socks, smart casual for Mad Monk dinner' },
    { date: 'Oct 10 (Sat)', region: 'Kerry / Dunloe', tempHigh: '14°C / 57°F', tempLow: '7°C / 45°F', rainProb: '25%', wind: '14 km/h', icon: '🌤️', condition: 'Bright & pleasant autumn day', outfit: 'Light hiking layers, trail boots for Gap of Dunloe & Strickeen Mountain' },
    { date: 'Oct 11 (Sun)', region: 'Dublin / Kilkenny', tempHigh: '15°C / 59°F', tempLow: '8°C / 46°F', rainProb: '30%', wind: '16 km/h', icon: '⛅', condition: 'Crisp autumn sunshine', outfit: 'Comfortable travel attire, warm sweater for Rock of Cashel & Kilkenny Castle' },
    { date: 'Oct 12 (Mon)', region: 'Dublin / Boyne', tempHigh: '14°C / 57°F', tempLow: '6°C / 43°F', rainProb: '20%', wind: '15 km/h', icon: '☀️', condition: 'Clear morning, cool night', outfit: 'Smart casual layers for 10:30 AM Guinness Tour & evening Dublin pub crawl' },
    { date: 'Oct 13 (Tue)', region: 'Dublin City', tempHigh: '15°C / 59°F', tempLow: '8°C / 46°F', rainProb: '25%', wind: '18 km/h', icon: '🎂', condition: 'Mild & celebration ready!', outfit: 'Day: Casual chic for brunch/shopping. Night: FANCY FORMAL / COCKTAIL for Mister S!' },
    { date: 'Oct 14 (Wed)', region: 'Dublin Airport', tempHigh: '13°C / 55°F', tempLow: '7°C / 45°F', rainProb: '35%', wind: '20 km/h', icon: '🛫', condition: 'Cool breeze & scattered clouds', outfit: 'Comfortable airport & airplane layers' }
  ]
};

// ── Outfits & Weather Clothing Guidelines ──────────────────────
const outfitGuides = [
  {
    id: 'coastal',
    category: 'Wild Coastal Cliffs & Bluffs',
    locations: 'Cliffs of Moher, Giant’s Causeway, Slea Head Drive, Carrick-a-Rede',
    icon: '🌊',
    essentials: [
      'Hooded Waterproof & Windproof Shell (Gore-Tex / DWR 15,000mm+)',
      'Thermal/Merino Base Layer (traps warmth, wicks sweat)',
      'Fleece or Packable Down Mid-Layer',
      'Wind-resistant Hiking Pants (Quick-dry; avoid heavy denim)',
      'Broken-in Waterproof Hiking Boots with deep rubber tread',
      'Fleece Beanie / Earband & Neck Gaiter (winds exceed 40 km/h)',
      '⚠️ Note: Do NOT use umbrellas near cliff edges — gale gusts will turn them inside out!'
    ]
  },
  {
    id: 'mountain',
    category: 'Mountain Trails & Bog Hikes',
    locations: 'Diamond Hill (Connemara), Gap of Dunloe, Strickeen Mountain, Slieve Gullion',
    icon: '🥾',
    essentials: [
      'High-ankle waterproof hiking boots (muddy & rocky terrain)',
      'Packable lightweight rain pants in backpack',
      'Breathable moisture-wicking athletic layers',
      'Merino wool hiking socks (plus an extra dry pair in daypack)',
      'Lightweight trekking poles (helpful for rocky descents)',
      'Waterproof daypack or dry sack for phone/cameras'
    ]
  },
  {
    id: 'city',
    category: 'City Walking & Historic Pub Crawls',
    locations: 'Belfast Cathedral Quarter, Galway Latin Quarter, Dublin Temple Bar, Kilkenny',
    icon: '🏙️',
    essentials: [
      'Smart casual dark jeans or chinos',
      'Stylish water-resistant leather sneakers or Chelsea boots',
      'Waxed cotton jacket or stylish wool overcoat',
      'Layerable knit sweaters or henleys (pubs are warm and cozy inside)',
      'Compact wind-resistant umbrella for city streets'
    ]
  },
  {
    id: 'dad-erin-bday',
    category: "Dad & Erin's Birthday Celebration Dinner",
    locations: 'Ruibin / Dough Bros (Galway) — Oct 7 (Wed)',
    icon: '🎂',
    essentials: [
      'Smart casual / celebratory dinner wear',
      'Clean button-down or knit sweater with chinos/jeans',
      'Comfortable dress shoes or clean leather boots for Galway cobblestones',
      'Warm jacket for walking between Latin Quarter venues'
    ]
  },
  {
    id: 'mom-bday',
    category: "Mom's Premier Birthday Dinner",
    locations: 'Mister S (Camden St, Dublin) — Oct 13 (Tue) @ 5:15 PM',
    icon: '🎂',
    essentials: [
      'Formal / Cocktail / Semi-Formal Dress Code',
      'Ladies: Elegant dinner dress, stylish jumpsuit, or chic blazer + trousers, dress heels/flats',
      'Gentlemen: Tailored blazer/sport coat, collared button-down shirt, dress trousers, leather dress shoes',
      'Warm wrap / coat for walking from vehicle to venue'
    ]
  }
];

// ── Hiking & Nature Locations (Interlinked Network) ───────────
const hikingTrails = [
  {
    id: 'giants-causeway',
    name: "Giant's Causeway Cliff Top & Causeway Walk",
    region: 'ni',
    regionName: 'Northern Ireland',
    base: 'Walnut Retreat (Newry)',
    dayNumber: 4,
    dayIndex: 3,
    date: 'Oct 5 (Mon)',
    status: 'Suggested',
    difficulty: 'Moderate',
    energyLevel: 'moderate',
    distance: '8.0 km / 5.0 mi',
    duration: '2.5–3.0 hrs',
    elevGain: '+160 m / 525 ft',
    surface: 'Basalt hexagonal steps, gravel path, cliff staircase',
    gear: 'Waterproof hiking boots, windshell, beanie',
    highlights: '40,000 interlocking volcanic basalt columns, Shepherd’s Steps, Amphitheatre, Atlantic ocean views',
    weatherAlert: 'Exposed to North Atlantic gales. High-traction boots mandatory on wet basalt.',
    rainBackup: "If severe squalls: Spend more time in Old Bushmills Distillery (tasting/tour) & Dunluce Castle visitor center.",
    splitOption: "Group Split: Leisure walkers can take the low accessible shuttle road directly to Grand Causeway, while hikers take the Clifftop Red Trail.",
    mapsQuery: "Giant's+Causeway+Visitor+Centre",
    linkAttraction: 'Giants Causeway'
  },
  {
    id: 'carrick-a-rede',
    name: 'Carrick-a-Rede Rope Bridge Coastal Path',
    region: 'ni',
    regionName: 'Northern Ireland',
    base: 'Walnut Retreat (Newry)',
    dayNumber: 4,
    dayIndex: 3,
    date: 'Oct 5 (Mon)',
    status: 'Suggested',
    difficulty: 'Easy–Moderate',
    energyLevel: 'moderate',
    distance: '2.0 km / 1.2 mi',
    duration: '1.0–1.5 hrs',
    elevGain: '+65 m / 213 ft',
    surface: 'Paved & stepped coastal trail, swinging rope bridge',
    gear: 'Sturdy walking shoes, windbreaker',
    highlights: 'Suspended rope bridge 100ft above roaring ocean, bird cliffs, Sheep Island views',
    weatherAlert: 'Bridge closes during winds > 35 knots (40 mph).',
    rainBackup: "If high winds close bridge: Coastal scenic drive through Ballintoy Harbour and Fullerton Arms pub lunch.",
    splitOption: "Anyone not wanting to cross the rope bridge can wait at the scenic cliff viewpoint with panoramic coastal views.",
    mapsQuery: 'Carrick-a-Rede+Rope+Bridge',
    linkAttraction: 'Carrick-a-Rede Rope Bridge'
  },
  {
    id: 'slieve-gullion',
    name: 'Slieve Gullion Forest & South Cairn Passage Tomb',
    region: 'ni',
    regionName: 'Northern Ireland',
    base: 'Walnut Retreat (Newry)',
    dayNumber: 1,
    dayIndex: 0,
    date: 'Oct 2 (Fri)',
    status: 'Optional',
    difficulty: 'Moderate',
    energyLevel: 'moderate',
    distance: '4.5 km / 2.8 mi',
    duration: '2.0 hrs',
    elevGain: '+290 m / 950 ft',
    surface: 'Forest road, gravel mountain trail, stone steps',
    gear: 'Trail runners or hiking boots, fleece layer',
    highlights: 'Highest peak in County Armagh, Neolithic passage tomb (Calliagh Birra’s House), Ring of Gullion AONB',
    weatherAlert: 'Mist can settle quickly on summit cairn.',
    rainBackup: "Slieve Gullion Forest scenic drive loop (paved 10-mile scenic road drive) + Courtyard Cafe.",
    splitOption: "Gentle Giant walking trail & walled garden for light walkers.",
    mapsQuery: 'Slieve+Gullion+Forest+Park',
    linkAttraction: 'Slieve Gullion Forest'
  },
  {
    id: 'kilbroney-park',
    name: 'Kilbroney Park & Cloughmore Stone Viewpoint',
    region: 'ni',
    regionName: 'Northern Ireland',
    base: 'Walnut Retreat (Newry)',
    dayNumber: 1,
    dayIndex: 0,
    date: 'Oct 2 (Fri)',
    status: 'Suggested',
    difficulty: 'Easy–Moderate',
    energyLevel: 'chill',
    distance: '3.5 km / 2.2 mi',
    duration: '1.5 hrs',
    elevGain: '+210 m / 690 ft',
    surface: 'Graded forest tracks and viewpoint boardwalk',
    gear: 'Comfortable walking shoes/sneakers, light jacket',
    highlights: 'Massive 50-ton glacial erratic granite boulder, panoramic vistas over Carlingford Lough and Mournes',
    weatherAlert: 'Pleasant wooded shelter from strong winds.',
    rainBackup: "Rostrevor village cafes & Carlingford Lough scenic drive.",
    splitOption: "Stay on lower riverside trail and fairy glen walk.",
    mapsQuery: 'Kilbroney+Park+Rostrevor',
    linkAttraction: 'Kilbroney Park Forest'
  },
  {
    id: 'cliffs-of-moher',
    name: 'Cliffs of Moher Coastal Cliff Path',
    region: 'galway',
    regionName: 'Galway / Clare',
    base: 'Spiddal Villa (Galway)',
    dayNumber: 5,
    dayIndex: 4,
    date: 'Oct 6 (Tue)',
    status: 'Suggested',
    difficulty: 'Moderate',
    energyLevel: 'moderate',
    distance: '8.5 km / 5.3 mi (Flexible)',
    duration: '2.0–3.0 hrs',
    elevGain: '+120 m / 395 ft',
    surface: 'Exposed dirt path, stone flagstones, clifftop edges',
    gear: 'Ankle-supporting waterproof boots, heavy windbreaker (NO umbrellas)',
    highlights: '702ft sheer ocean drop, O’Brien’s Tower, Aran Islands silhouettes, seabird nesting colonies',
    weatherAlert: 'Severe wind hazard. Always stay behind official safety barrier flagstones.',
    rainBackup: "If torrential: Underground Cliffs Exhibition + Doolin Cave (Great Stalactite) + Gus O'Connor's Pub in Doolin.",
    splitOption: "Paved viewing platforms near visitor center for flat viewing without walking the muddy outer trail.",
    mapsQuery: 'Cliffs+of+Moher+Visitor+Centre',
    linkAttraction: 'Cliffs of Moher'
  },
  {
    id: 'diamond-hill',
    name: 'Diamond Hill Upper & Lower Trail (Connemara National Park)',
    region: 'galway',
    regionName: 'Galway / Connemara',
    base: 'Spiddal Villa (Galway)',
    dayNumber: 6,
    dayIndex: 5,
    date: 'Oct 7 (Wed)',
    status: 'Suggested',
    difficulty: 'Moderate–Strenuous',
    energyLevel: 'strenuous',
    distance: '7.0 km / 4.3 mi',
    duration: '2.5–3.0 hrs',
    elevGain: '+400 m / 1,312 ft',
    surface: 'Timber boardwalk, stepped rocky ascent, stone ridge',
    gear: 'High-traction waterproof hiking boots, rain pants, windshell, water',
    highlights: '360° summit views over Kylemore Abbey turret, Ballynakill Harbour, and the rugged Twelve Bens peaks',
    weatherAlert: 'Exposed rocky ridge near summit. Wet rock can be slippery.',
    rainBackup: "If heavy mountain fog/rain: Tour Kylemore Abbey State Rooms, Gothic Church, and Victorian Walled Gardens tearoom.",
    splitOption: "Split Plan: Summit hikers do Upper Loop (400m climb); Leisure walkers take Lower Loop (Ellis Wood & Nature Trail) or relax at Letterfrack craft tearooms.",
    mapsQuery: 'Connemara+National+Park+Visitor+Centre',
    linkAttraction: 'Connemara National Park'
  },
  {
    id: 'burren',
    name: 'The Burren Karst Limestone & Mullaghmore Loop',
    region: 'galway',
    regionName: 'Galway / Clare',
    base: 'Spiddal Villa (Galway)',
    dayNumber: 5,
    dayIndex: 4,
    date: 'Oct 6 (Tue)',
    status: 'Suggested',
    difficulty: 'Easy–Moderate',
    energyLevel: 'moderate',
    distance: '5.0 km / 3.1 mi',
    duration: '2.0 hrs',
    elevGain: '+140 m / 460 ft',
    surface: 'Limestone pavement (clints & grykes), loose stone',
    gear: 'Stiff-soled hiking boots with deep ankle support',
    highlights: 'Otherworldly moonscape karst terrain, unique arctic-alpine flora growing between rock fissures, ancient stone walls',
    weatherAlert: 'Watch foot placement on wet limestone grykes.',
    rainBackup: "Burren Smokehouse & Visitor Experience (Lisdoonvarna) + Burren Perfumery tearooms.",
    splitOption: "Short 20m stroll on limestone edge near road vs 2h full Mullaghmore loop.",
    mapsQuery: 'Burren+National+Park',
    linkAttraction: 'Burren National Park'
  },
  {
    id: 'gap-of-dunloe',
    name: 'Gap of Dunloe Glacial Mountain Pass',
    region: 'kerry',
    regionName: 'Kerry / Killarney',
    base: 'Milltown House (Killarney)',
    dayNumber: 8,
    dayIndex: 7,
    date: 'Oct 9 (Fri)',
    status: 'Suggested',
    difficulty: 'Moderate',
    energyLevel: 'moderate',
    distance: '10.5 km / 6.5 mi (or partial)',
    duration: '3.0–3.5 hrs',
    elevGain: '+220 m / 720 ft',
    surface: 'Narrow mountain road, historic stone bridges, lakeside path',
    gear: 'Walking shoes or boots, light rain layer, camera',
    highlights: 'Wishing Bridge, five glacial lakes, soaring cliffs between Purple Mountain and MacGillycuddy’s Reeks',
    weatherAlert: 'Share path with occasional jaunting pony carts.',
    rainBackup: "Jaunting pony-trap cart ride through the pass with covered tartan blankets + fireside coffee at Kate Kearney's Cottage.",
    splitOption: "Walk the first 1.5 miles to the Wishing Bridge and return, or take horse carriage.",
    mapsQuery: "Kate+Kearney's+Cottage+Gap+of+Dunloe",
    linkAttraction: 'Gap of Dunloe'
  },
  {
    id: 'strickeen',
    name: 'Strickeen Mountain Summit Hike',
    region: 'kerry',
    regionName: 'Kerry / Killarney',
    base: 'Milltown House (Killarney)',
    dayNumber: 8,
    dayIndex: 7,
    date: 'Oct 9 (Fri)',
    status: 'Optional',
    difficulty: 'Moderate–Strenuous',
    energyLevel: 'strenuous',
    distance: '6.0 km / 3.7 mi',
    duration: '2.5 hrs',
    elevGain: '+340 m / 1,115 ft',
    surface: 'Rocky mountain track, grassy peat bog path',
    gear: 'Waterproof hiking boots with ankle support, trekking poles, warm mid-layer',
    highlights: 'Spectacular front-row panorama of Carrauntoohil (Ireland’s highest mountain) and Killarney valley',
    weatherAlert: 'Boggy sections after autumn rainfall.',
    rainBackup: "Muckross Traditional Farms & Crafts Workshop (covered indoor artisan experience).",
    splitOption: "Hikers climb Strickeen; non-hikers enjoy Kate Kearney's Cottage pub by the turf fire.",
    mapsQuery: 'Strickeen+Mountain+Trailhead',
    linkAttraction: 'Strickeen Mountain'
  },
  {
    id: 'torc-waterfall',
    name: 'Torc Waterfall & Torc Mountain Boardwalk Trail',
    region: 'kerry',
    regionName: 'Kerry / Killarney',
    base: 'Milltown House (Killarney)',
    dayNumber: 7,
    dayIndex: 6,
    date: 'Oct 8 (Thu)',
    status: 'Suggested',
    difficulty: 'Easy to Waterfall / Moderate to Summit',
    energyLevel: 'moderate',
    distance: '4.0 km / 2.5 mi',
    duration: '1.5–2.0 hrs',
    elevGain: '+260 m / 850 ft',
    surface: 'Wooden railway sleeper steps, stone steps, forest floor',
    gear: 'Waterproof shoes/boots, light layers',
    highlights: 'Roaring 66ft cascading waterfall surrounded by mossy woodlands, upper lake viewpoints',
    weatherAlert: 'Boardwalk sleepers have wire mesh for grip, but step carefully.',
    rainBackup: "The waterfall is actually even more dramatic in the rain! Forest canopy provides shelter.",
    splitOption: "5-minute flat walk to base waterfall for casual view vs 300-step climb to upper viewing deck.",
    mapsQuery: 'Torc+Waterfall+Killarney',
    linkAttraction: 'Torc Waterfall'
  },
  {
    id: 'muckross-abbey',
    name: 'Muckross Abbey & Lake Muckross Peninsula Loop',
    region: 'kerry',
    regionName: 'Kerry / Killarney',
    base: 'Milltown House (Killarney)',
    dayNumber: 7,
    dayIndex: 6,
    date: 'Oct 8 (Thu)',
    status: 'Suggested',
    difficulty: 'Easy',
    energyLevel: 'chill',
    distance: '5.5 km / 3.4 mi',
    duration: '1.5 hrs',
    elevGain: '+35 m / 115 ft',
    surface: 'Paved and smooth gravel estate walking paths',
    gear: 'Comfortable sneakers or walking shoes',
    highlights: '15th-century Franciscan abbey cloister with ancient yew tree, wild native red deer grazing on estate lawns',
    weatherAlert: 'Flat, well-drained trails suitable in all weather.',
    rainBackup: "Explore interior cloister corridors and covered abbey ruins + Muckross House state rooms.",
    splitOption: "Direct paved route to abbey is completely flat and accessible for all.",
    mapsQuery: 'Muckross+Abbey+Killarney',
    linkAttraction: 'Muckross Abbey'
  },
  {
    id: 'slea-head',
    name: 'Slea Head & Dunmore Head Coastal Bluffs Walk',
    region: 'kerry',
    regionName: 'Kerry / Dingle',
    base: 'Milltown House (Killarney)',
    dayNumber: 9,
    dayIndex: 8,
    date: 'Oct 10 (Sat)',
    status: 'Suggested',
    difficulty: 'Easy–Moderate',
    energyLevel: 'moderate',
    distance: '3.0 km / 1.9 mi',
    duration: '1.0 hr',
    elevGain: '+90 m / 295 ft',
    surface: 'Grassy coastal cliff paths, beach trail',
    gear: 'Windproof shell, sturdy shoes, camera',
    highlights: 'Westernmost point of mainland Ireland, Blasket Islands vista, Star Wars filming location, dramatic breakers',
    weatherAlert: 'Strong ocean headwinds common.',
    rainBackup: "Blasket Centre (Ionad an Bhlascaoid) — world-class interactive indoor cultural museum overlooking the ocean.",
    splitOption: "Stay in car/viewpoint pull-off for photos vs walking down to Dunmore Head point.",
    mapsQuery: 'Dunmore+Head+Viewpoint+Dingle',
    linkAttraction: 'Slea Head Drive'
  },
  {
    id: 'boyne-valley',
    name: 'Boyne Valley Historic River Trail & Newgrange Grounds',
    region: 'dublin',
    regionName: 'Dublin / Meath',
    base: 'Navan Home (Dublin area)',
    dayNumber: 11,
    dayIndex: 10,
    date: 'Oct 12 (Mon)',
    status: 'Suggested',
    difficulty: 'Easy',
    energyLevel: 'chill',
    distance: '4.0 km / 2.5 mi',
    duration: '1.5 hrs',
    elevGain: '+40 m / 130 ft',
    surface: 'Maintained gravel path, grass lawns',
    gear: 'Comfortable walking shoes, warm jacket',
    highlights: '5,200-year-old Stone Age megasite, River Boyne pastoral scenery',
    weatherAlert: 'Open countryside paths, bring light rain jacket.',
    rainBackup: "Brú na Bóinne Visitor Centre immersive indoor exhibition & reconstructed chamber.",
    splitOption: "Full guided shuttle to tomb entrance or self-paced grounds stroll.",
    mapsQuery: 'Brú+na+Bóinne+Visitor+Centre',
    linkAttraction: 'Newgrange Monument'
  }
];


// ── Day-by-day Rich Schedule with Blocked Time Ranges ──────────
const timeline = [
  {
    dayNumber: 1,
    date: 'Oct 2 (Fri)',
    region: 'ni',
    color: '#10b981',
    title: 'Arrival Day & Check-in Walnut Retreat',
    base: 'Walnut Retreat (Newry)',
    route: 'Dublin Airport → Newry → Belfast → Newry',
    isTransfer: true,
    driveHours: 3.0,
    special: false,
    weather: '🌦️ 13°C / 55°F · Passing showers & crisp air',
    outfit: '👟 Layered travel wear + packable rain jacket for fresh air walk',
    budget: { driving: 3.0, sightseeing: 4.5, dining: 3.0, free: 0.5 },
    items: [
      { time: '8:25 AM – 9:45 AM', startHour: 8.4, endHour: 9.75, dur: '1.25h', activity: '🛬 Arrive Dublin Airport & Baggage', type: 'sight', anchor: true, energyLevel: 'chill', tag: 'FLIGHT ARRIVAL', mapsQuery: 'Dublin+Airport+Terminal+2', desc: 'Land in Dublin, pass passport control, collect luggage and retrieve rental vehicle.' },
      { time: '10:00 AM – 11:30 AM', startHour: 10.0, endHour: 11.5, dur: '1.5h', activity: '🚗 Drive to Newry Base', type: 'drive', energyLevel: 'chill', tag: 'DRIVE', mapsQuery: 'Newry+Northern+Ireland', desc: '100 km / 62 mi highway drive up the M1/A1 corridor.' },
      { time: '11:30 AM – 12:00 PM', startHour: 11.5, endHour: 12.0, dur: '30m', activity: '🏡 Check in Walnut Retreat', type: 'housing', energyLevel: 'chill', tag: 'HOUSING WINDOW', mapsQuery: 'Newry+Northern+Ireland', desc: 'Unload bags, settle in at base #1 (Newry).' },
      { time: '12:00 PM – 2:00 PM', startHour: 12.0, endHour: 14.0, dur: '2h', activity: '🍽️ Lunch & Town Orientation', type: 'dining', energyLevel: 'chill', tag: 'CASUAL MEAL', mapsQuery: 'Cozy+Corner+Cafe+Newry', desc: 'Casual lunch in Newry (The Diner or Cozy Corner).' },
      { time: '2:00 PM – 4:30 PM', startHour: 14.0, endHour: 16.5, dur: '2.5h', activity: '🌳 Kilbroney Park or Slieve Gullion Forest', type: 'sight', energyLevel: 'moderate', trailId: 'kilbroney-park', tag: 'NATURE WALK', mapsQuery: 'Kilbroney+Park+Rostrevor', desc: 'Fresh air walk, scenic viewpoint overlooking Carlingford Lough.', rainBackup: 'Rostrevor village tearooms and Carlingford Lough scenic driving route.' },
      { time: '5:00 PM – 6:00 PM', startHour: 17.0, endHour: 18.0, dur: '1h', activity: "🏰 Bagenal's Castle (Newry)", type: 'sight', energyLevel: 'chill', tag: 'HISTORY', mapsQuery: "Bagenal's+Castle+Newry", desc: '16th-century fortified tower house & museum in downtown Newry.' },
      { time: '6:00 PM – 7:00 PM', startHour: 18.0, endHour: 19.0, dur: '1h', activity: '🚗 Drive Newry → Belfast', type: 'drive', energyLevel: 'chill', tag: 'DRIVE', mapsQuery: 'Belfast+Cathedral+Quarter', desc: 'Drive 39 mi north to Belfast for dinner.' },
      { time: '7:00 PM – 9:00 PM', startHour: 19.0, endHour: 21.0, dur: '2h', activity: '🍽️ Casual Belfast Dinner (Cathedral Quarter)', type: 'dining', energyLevel: 'chill', tag: 'DINNER', mapsQuery: 'Cathedral+Quarter+Belfast+Restaurants', desc: 'Relaxed first-night dinner in Belfast Cathedral Quarter. Great pub food options.' },
      { time: '9:00 PM – 10:00 PM', startHour: 21.0, endHour: 22.0, dur: '1h', activity: '🚗 Return Drive to Newry Base', type: 'drive', energyLevel: 'chill', tag: 'DRIVE', mapsQuery: 'Newry+Northern+Ireland', desc: 'Return drive back to Walnut Retreat.' },
    ],
  },
  {
    dayNumber: 2,
    date: 'Oct 3 (Sat)',
    region: 'ni',
    color: '#10b981',
    title: 'Belfast City & Titanic History',
    base: 'Walnut Retreat (Newry)',
    route: 'Newry → Belfast → Dundrum → Newry',
    isTransfer: false,
    driveHours: 2.5,
    special: false,
    weather: '⛅ 14°C / 57°F · Partly sunny & crisp',
    outfit: '🏙️ Smart casual city layers, comfortable walking shoes, light jacket',
    budget: { driving: 2.5, sightseeing: 6.0, dining: 3.0, free: 0.5 },
    items: [
      { time: '8:00 AM – 9:00 AM', startHour: 8.0, endHour: 9.0, dur: '1h', activity: '☕ Breakfast (Cozy Corner, Newry)', type: 'dining', energyLevel: 'chill', tag: 'BREAKFAST', mapsQuery: 'Cozy+Corner+Newry', desc: 'Full Irish breakfast before heading to Belfast.' },
      { time: '9:00 AM – 10:00 AM', startHour: 9.0, endHour: 10.0, dur: '1h', activity: '🚗 Drive Newry → Belfast Titanic Quarter', type: 'drive', energyLevel: 'chill', tag: 'DRIVE', mapsQuery: 'Titanic+Belfast', desc: 'Direct route on A1/M1 into Belfast.' },
      { time: '10:00 AM – 12:30 PM', startHour: 10.0, endHour: 12.5, dur: '2.5h', activity: '🚢 Titanic Belfast Experience', type: 'sight', energyLevel: 'chill', tag: 'PLANNED VISIT', mapsQuery: 'Titanic+Belfast', desc: 'World-leading maritime museum on the slipways where Titanic was built.' },
      { time: '12:30 PM – 1:00 PM', startHour: 12.5, endHour: 13.0, dur: '30m', activity: "⛪ St. Anne's Cathedral (Cathedral Quarter)", type: 'sight', energyLevel: 'chill', tag: 'CULTURE', mapsQuery: "St+Anne's+Cathedral+Belfast", desc: 'Walk through Belfast Cathedral Quarter.' },
      { time: '1:00 PM – 2:00 PM', startHour: 13.0, endHour: 14.0, dur: '1h', activity: '🍽️ Lunch: Common Market / Stacked', type: 'dining', restaurantId: 'common-market', energyLevel: 'chill', tag: 'LUNCH', mapsQuery: 'Common+Market+Belfast', desc: 'Artisan food court with various gourmet stalls.' },
      { time: '2:00 PM – 3:30 PM', startHour: 14.0, endHour: 15.5, dur: '1.5h', activity: '🧱 Peace Wall + Black Cab History Tour', type: 'sight', energyLevel: 'chill', tag: 'GUIDED TOUR', mapsQuery: 'Falls+Road+Murals+Belfast', desc: 'Guided black cab tour through Falls Road & Shankill Road murals.' },
      { time: '3:30 PM – 5:00 PM', startHour: 15.5, endHour: 17.0, dur: '1.5h', activity: "🛒 St. George's Market & City Centre Walk", type: 'sight', energyLevel: 'chill', tag: 'EXPLORE', mapsQuery: "St+George's+Market+Belfast", desc: 'Victorian covered market and downtown walking.' },
      { time: '5:00 PM – 6:15 PM', startHour: 17.0, endHour: 18.25, dur: '1.25h', activity: '🍺 Duke of York / Bittles Bar', type: 'dining', restaurantId: 'duke-of-york', energyLevel: 'chill', tag: 'PUB STOP', mapsQuery: 'The+Duke+of+York+Belfast', desc: 'Cobblestone alleyway pint in iconic Cathedral Quarter pub.' },
      { time: '6:15 PM – 7:00 PM', startHour: 18.25, endHour: 19.0, dur: '45m', activity: '🚶 Walk to Holohans Pantry (University Rd)', type: 'sight', energyLevel: 'chill', tag: 'WALK', mapsQuery: 'Holohans+Pantry+Belfast', desc: 'Stroll through Belfast streets to Holohans Pantry on University Road.' },
      { time: '7:15 PM – 9:15 PM', startHour: 19.25, endHour: 21.25, dur: '2h', activity: '🍽️ Holohans Pantry Dinner (Belfast)', type: 'dining', reserved: true, anchor: true, mandatory: true, restaurantId: 'holohans', energyLevel: 'chill', tag: 'CONFIRMED RESERVATION', note: '48hr cancellation window', mapsQuery: 'Holohans+Pantry+Belfast', desc: '✅ CONFIRMED MANDATORY: Reserved table for 7:15 PM. Famous traditional Irish boxty & seafood.' },
      { time: '9:15 PM – 10:00 PM', startHour: 21.25, endHour: 22.0, dur: '45m', activity: '🚗 Return Drive Belfast → Newry Base', type: 'drive', energyLevel: 'chill', tag: 'DRIVE', mapsQuery: 'Newry+Northern+Ireland', desc: 'Return drive from Belfast to Walnut Retreat.' },
    ],
  },
  {
    dayNumber: 3,
    date: 'Oct 4 (Sun)',
    region: 'ni',
    color: '#10b981',
    title: 'Causeway Coast & Giant’s Causeway',
    base: 'Walnut Retreat (Newry)',
    route: 'Newry → Causeway → Bushmills → Carrick-a-Rede → Newry',
    isTransfer: false,
    driveHours: 5.0,
    special: false,
    weather: '💨 12°C / 54°F · Windy (35 km/h) with coastal sea squalls',
    outfit: '🥾 Heavy windproof Gore-Tex shell, thermal layers, hiking boots with grip, beanie',
    budget: { driving: 5.0, sightseeing: 5.0, dining: 3.0, free: 0.0 },
    note: '⚠️ Heavy driving day (5h total in car). Pace stops based on weather.',
    items: [
      { time: '7:30 AM – 8:15 AM', startHour: 7.5, endHour: 8.25, dur: '45m', activity: '☕ Early Breakfast at Base', type: 'dining', energyLevel: 'chill', tag: 'BREAKFAST', mapsQuery: 'Newry+Northern+Ireland', desc: 'Fuel up for the longest day trip up north.' },
      { time: '8:15 AM – 10:30 AM', startHour: 8.25, endHour: 10.5, dur: '2.25h', activity: '🚗 Drive Newry → Giants Causeway', type: 'drive', energyLevel: 'chill', tag: 'LONG DRIVE', mapsQuery: "Giant's+Causeway+Visitor+Centre", desc: 'Scenic route heading north across Antrim.' },
      { time: '10:30 AM – 12:30 PM', startHour: 10.5, endHour: 12.5, dur: '2h', activity: '🪨 Giant’s Causeway UNESCO Site', type: 'sight', energyLevel: 'moderate', trailId: 'giants-causeway', tag: 'COASTAL HIKE', mapsQuery: "Giant's+Causeway+Visitor+Centre", desc: '40,000 interlocking basalt columns created by ancient volcanic action.', rainBackup: 'Indoor interactive visitor exhibition + Dunluce Castle ruins tearooms.', splitOption: 'Accessible shuttle bus to basalt stones vs Clifftop Red Trail hike.' },
      { time: '12:30 PM – 1:00 PM', startHour: 12.5, endHour: 13.0, dur: '30m', activity: '🚗 Drive to Bushmills', type: 'drive', energyLevel: 'chill', tag: 'DRIVE', mapsQuery: 'Old+Bushmills+Distillery', desc: 'Quick 10-minute jump to neighboring town.' },
      { time: '1:00 PM – 2:30 PM', startHour: 13.0, endHour: 14.5, dur: '1.5h', activity: '🥃 Old Bushmills Distillery + Lunch', type: 'sight', energyLevel: 'chill', tag: 'TASTING & LUNCH', mapsQuery: 'Old+Bushmills+Distillery', desc: "World's oldest licensed whiskey distillery (1608) and lunch stop." },
      { time: '2:30 PM – 3:00 PM', startHour: 14.5, endHour: 15.0, dur: '30m', activity: '🚗 Drive to Carrick-a-Rede', type: 'drive', energyLevel: 'chill', tag: 'DRIVE', mapsQuery: 'Carrick-a-Rede+Rope+Bridge', desc: 'Coastal drive east towards the rope bridge.' },
      { time: '3:00 PM – 4:15 PM', startHour: 15.0, endHour: 16.25, dur: '1.25h', activity: '🌉 Carrick-a-Rede Rope Bridge', type: 'sight', energyLevel: 'moderate', trailId: 'carrick-a-rede', tag: 'COASTAL WALK', mapsQuery: 'Carrick-a-Rede+Rope+Bridge', desc: 'Rope bridge walk 100ft above the crashing waves (weather permitting).', rainBackup: 'Ballintoy Harbour scenic coastal pull-off + Fullerton Arms cozy pub.' },
      { time: '4:15 PM – 6:45 PM', startHour: 16.25, endHour: 18.75, dur: '2.5h', activity: '🚗 Coastal Causeway Drive Return', type: 'drive', energyLevel: 'chill', tag: 'SCENIC DRIVE', mapsQuery: 'Glenariff+Forest+Park', desc: 'Stunning drive through the Glens of Antrim (Glenariff & Glenarm) back to Newry.' },
      { time: '7:00 PM – 9:00 PM', startHour: 19.0, endHour: 21.0, dur: '2h', activity: '🍽️ Dinner: The Oliver (Newry)', type: 'dining', reserved: true, anchor: true, mandatory: true, energyLevel: 'chill', tag: 'CONFIRMED RESERVATION', mapsQuery: 'The+Oliver+Newry', desc: '✅ CONFIRMED MANDATORY: Relaxing dinner at The Oliver in Newry town near our base.' },
    ],
  },
  {
    dayNumber: 4,
    date: 'Oct 5 (Mon)',
    region: 'galway',
    color: '#3b82f6',
    title: 'Base Transfer: Newry → Galway (Spiddal)',
    base: 'Spiddal Villa (Galway)',
    route: 'Newry → Navan/Athlone → Spiddal Villa → Galway City',
    isTransfer: true,
    driveHours: 3.5,
    special: false,
    weather: '🌧️ 14°C / 57°F · Atlantic rain bands & breezy',
    outfit: '🚗 Comfortable road-trip layers + rain shell for Galway city exploration',
    budget: { driving: 3.5, sightseeing: 4.0, dining: 3.0, free: 1.5 },
    items: [
      { time: '8:30 AM – 9:30 AM', startHour: 8.5, endHour: 9.5, dur: '1h', activity: '☕ Breakfast & House Pack-up', type: 'free', energyLevel: 'chill', tag: 'PACKING', desc: 'Pack bags and load vehicles at Walnut Retreat.' },
      { time: '9:30 AM – 10:00 AM', startHour: 9.5, endHour: 10.0, dur: '30m', activity: '🏡 Check out Walnut Retreat (Base #1)', type: 'housing', energyLevel: 'chill', tag: 'CHECK-OUT', note: 'Check out by 11 AM', mapsQuery: 'Newry+Northern+Ireland', desc: 'Depart Northern Ireland for the West Coast of Ireland.' },
      { time: '10:00 AM – 1:30 PM', startHour: 10.0, endHour: 13.5, dur: '3.5h', activity: '🚗 BASE TRANSFER: Newry → Galway (Spiddal)', type: 'drive', energyLevel: 'chill', tag: 'BASE MOVE', mapsQuery: 'Spiddal+Galway', desc: '260 km / 162 mi cross-country highway drive via M1/M6 corridor.' },
      { time: '1:30 PM – 2:30 PM', startHour: 13.5, endHour: 14.5, dur: '1h', activity: '🍽️ Road Trip Lunch (Athlone / Lough Ree)', type: 'dining', energyLevel: 'chill', tag: 'LUNCH', mapsQuery: "Sean's+Bar+Athlone", desc: "Pub lunch near the Shannon River / Sean's Bar (oldest pub in Europe)." },
      { time: '2:30 PM – 4:00 PM', startHour: 14.5, endHour: 16.0, dur: '1.5h', activity: '🚗 Arrive in Spiddal & Grocery Run', type: 'drive', energyLevel: 'chill', tag: 'DRIVE', mapsQuery: 'Spiddal+Galway', desc: 'Arrive at the Atlantic coast and pick up essentials.' },
      { time: '4:00 PM – 5:00 PM', startHour: 16.0, endHour: 17.0, dur: '1h', activity: '🏡 Check in Spiddal Villa (Base #2)', type: 'housing', energyLevel: 'chill', tag: 'CHECK-IN', mapsQuery: 'Spiddal+Galway', desc: 'Unpack at Base #2. Ocean views and Connemara coastline.' },
      { time: '5:00 PM – 7:00 PM', startHour: 17.0, endHour: 19.0, dur: '2h', activity: '🏘️ Galway City Latin Quarter Walk', type: 'sight', energyLevel: 'chill', tag: 'CITY EXPLORE', mapsQuery: 'Latin+Quarter+Galway', desc: 'Quay Street cobblestones, buskers, and Spanish Arch.' },
      { time: '7:00 PM – 9:00 PM', startHour: 19.0, endHour: 21.0, dur: '2h', activity: '🍽️ Dinner: Donnellys of Barna', type: 'dining', restaurantId: 'donnellys', energyLevel: 'chill', tag: 'DINNER', mapsQuery: 'Donnellys+of+Barna', desc: 'Historic 1892 pub with seafood overlooking the harbor.' },
    ],
  },
  {
    dayNumber: 5,
    date: 'Oct 6 (Tue)',
    region: 'galway',
    color: '#3b82f6',
    title: 'Cliffs of Moher & The Burren',
    base: 'Spiddal Villa (Galway)',
    route: 'Spiddal → Cliffs of Moher → Burren → Dunguaire → Spiddal',
    isTransfer: false,
    driveHours: 3.5,
    special: false,
    weather: '💨 13°C / 55°F · High coastal winds (40 km/h) & passing squalls',
    outfit: '🌊 Heavy hooded windbreaker, thermal base, hiking boots, warm socks. NO UMBRELLAS',
    budget: { driving: 3.5, sightseeing: 5.25, dining: 3.0, free: 0.25 },
    items: [
      { time: '8:00 AM – 9:00 AM', startHour: 8.0, endHour: 9.0, dur: '1h', activity: '☕ Breakfast at Spiddal Villa', type: 'dining', energyLevel: 'chill', tag: 'BREAKFAST', mapsQuery: 'Spiddal+Galway', desc: 'Breakfast with ocean view.' },
      { time: '9:00 AM – 10:15 AM', startHour: 9.0, endHour: 10.25, dur: '1.25h', activity: '🚗 Drive Spiddal → Cliffs of Moher', type: 'drive', energyLevel: 'chill', tag: 'DRIVE', mapsQuery: 'Cliffs+of+Moher+Visitor+Centre', desc: 'Drive south around Galway Bay into County Clare.' },
      { time: '10:15 AM – 12:30 PM', startHour: 10.25, endHour: 12.5, dur: '2.25h', activity: '🏔️ Cliffs of Moher Coastal Walk', type: 'sight', energyLevel: 'moderate', trailId: 'cliffs-of-moher', tag: 'HIGHLIGHT', mapsQuery: 'Cliffs+of+Moher+Visitor+Centre', desc: 'Towering 700ft cliffs over the wild Atlantic ocean & O’Brien’s Tower.', rainBackup: "Underground interactive exhibition center + Doolin Cave tour + Gus O'Connor's fireside chowder.", splitOption: 'Paved safe observation decks near visitor center vs outer coastal path.' },
      { time: '12:30 PM – 1:30 PM', startHour: 12.5, endHour: 13.5, dur: '1h', activity: '🚗 Drive through Burren + Pub Lunch', type: 'dining', energyLevel: 'chill', tag: 'LUNCH', mapsQuery: "Gus+O'Connor's+Pub+Doolin", desc: 'Stop in Ballyvaughan or Doolin for seafood chowder.' },
      { time: '1:30 PM – 3:30 PM', startHour: 13.5, endHour: 15.5, dur: '2h', activity: '🪨 Burren National Park Glaciated Karst', type: 'sight', energyLevel: 'moderate', trailId: 'burren', tag: 'NATURE TRAIL', mapsQuery: 'Burren+National+Park', desc: 'Dramatic limestone pavement landscape with rare flora.', rainBackup: 'Burren Perfumery tearooms & artisan organic soap workshop.' },
      { time: '3:30 PM – 4:15 PM', startHour: 15.5, endHour: 16.25, dur: '45m', activity: '🚗 Drive to Dunguaire Castle', type: 'drive', energyLevel: 'chill', tag: 'DRIVE', mapsQuery: 'Dunguaire+Castle+Kinvara', desc: 'Drive to Kinvara on the edge of Galway Bay.' },
      { time: '4:15 PM – 5:15 PM', startHour: 16.25, endHour: 17.25, dur: '1h', activity: '🏰 Dunguaire Castle (Kinvara)', type: 'sight', energyLevel: 'chill', tag: 'CASTLE', mapsQuery: 'Dunguaire+Castle+Kinvara', desc: '16th-century tower house rising dramatically from the bay.' },
      { time: '5:15 PM – 6:30 PM', startHour: 17.25, endHour: 18.5, dur: '1.25h', activity: '🚗 Return Drive to Spiddal + Freshen up', type: 'drive', energyLevel: 'chill', tag: 'DRIVE', mapsQuery: 'Spiddal+Galway', desc: 'Return to villa and get dressed for dinner.' },
      { time: '7:00 PM – 9:00 PM', startHour: 19.0, endHour: 21.0, dur: '2h', activity: '🍽️ Kirwans Seafood Dinner (Galway)', type: 'dining', reserved: true, restaurantId: 'kirwans', energyLevel: 'chill', tag: 'SUGGESTED RESERVATION', mapsQuery: 'Kirwans+Lane+Galway', desc: 'Reserved table for 7:00 PM. High-end seafood restaurant in Latin Quarter.' },
    ],
  },
  {
    dayNumber: 6,
    date: 'Oct 7 (Wed)',
    region: 'galway',
    color: '#3b82f6',
    title: "Connemara & DAD & ERIN'S BIRTHDAY! 🎂🎂",
    base: 'Spiddal Villa (Galway)',
    route: 'Spiddal → Kylemore → Connemara NP → Spiddal → Galway Celebration',
    isTransfer: false,
    driveHours: 2.5,
    special: true,
    specialText: "DAD & ERIN'S BDAY 🎂",
    weather: '🎂 12°C / 54°F · Mountain mist & double birthday cheer',
    outfit: '🥾 Day: Hiking boots & layers for Diamond Hill. Evening: Smart casual celebration outfit for Dad & Erin!',
    budget: { driving: 2.5, sightseeing: 4.5, dining: 4.0, free: 1.0 },
    items: [
      { time: '8:00 AM – 9:00 AM', startHour: 8.0, endHour: 9.0, dur: '1h', activity: '☕ Birthday Morning Breakfast at Villa', type: 'dining', energyLevel: 'chill', tag: 'BDAY MORNING', mapsQuery: 'Spiddal+Galway', desc: 'Birthday coffee and treats with ocean view at Spiddal Villa.' },
      { time: '9:00 AM – 10:15 AM', startHour: 9.0, endHour: 10.25, dur: '1.25h', activity: '🚗 Drive Spiddal → Kylemore Abbey', type: 'drive', energyLevel: 'chill', tag: 'DRIVE', mapsQuery: 'Kylemore+Abbey+Connemara', desc: 'Wild Connemara bog and mountain driving via Maam Cross.' },
      { time: '10:15 AM – 12:15 PM', startHour: 10.25, endHour: 12.25, dur: '2h', activity: '🏰 Kylemore Abbey & Victorian Walled Garden', type: 'sight', energyLevel: 'chill', tag: 'HISTORIC SITE', mapsQuery: 'Kylemore+Abbey+Connemara', desc: 'Fairytale lakeside castle estate run by Benedictine nuns.' },
      { time: '12:15 PM – 1:00 PM', startHour: 12.25, endHour: 13.0, dur: '45m', activity: '🚗 Drive to Connemara NP (Letterfrack)', type: 'drive', energyLevel: 'chill', tag: 'DRIVE', mapsQuery: 'Connemara+National+Park+Visitor+Centre', desc: 'Short drive to national park visitor center.' },
      { time: '1:00 PM – 2:00 PM', startHour: 13.0, endHour: 14.0, dur: '1h', activity: '🍽️ Birthday Picnic / Cafe Lunch', type: 'dining', energyLevel: 'chill', tag: 'LUNCH', mapsQuery: 'Connemara+National+Park+Tea+Room', desc: 'Lunch at the national park tearoom / picnic area.' },
      { time: '2:00 PM – 4:30 PM', startHour: 14.0, endHour: 16.5, dur: '2.5h', activity: '🥾 Connemara NP Hike (Diamond Hill)', type: 'sight', energyLevel: 'strenuous', trailId: 'diamond-hill', tag: 'MOUNTAIN HIKE', mapsQuery: 'Diamond+Hill+Trailhead+Letterfrack', desc: 'Panoramic summit views across the Twelve Bens mountain range and Atlantic.', rainBackup: 'Letterfrack artisan craft center, Connemara heritage museum & Kylemore greenhouse walks.', splitOption: 'Summit climbers do Upper Diamond loop; leisure walkers do Lower Bog Loop and relax in Letterfrack.' },
      { time: '4:30 PM – 5:30 PM', startHour: 16.5, endHour: 17.5, dur: '1h', activity: '🚗 Return Drive to Spiddal', type: 'drive', energyLevel: 'chill', tag: 'DRIVE', mapsQuery: 'Spiddal+Galway', desc: 'Scenic mountain drive back to the house.' },
      { time: '5:30 PM – 7:00 PM', startHour: 17.5, endHour: 19.0, dur: '1.5h', activity: '🌅 Freshen Up for Birthday Celebration', type: 'free', anchor: true, energyLevel: 'chill', tag: 'GET READY', desc: 'Unwind at the villa and get ready for Dad & Erin’s double birthday dinner.' },
      { time: '7:00 PM – 9:30 PM', startHour: 19.0, endHour: 21.5, dur: '2.5h', activity: '🎂🎂🍽️ DAD & ERIN’S BIRTHDAY DINNER', type: 'dining', reserved: true, anchor: true, restaurantId: 'ruibin', energyLevel: 'chill', tag: 'SUGGESTED RESERVATION', mapsQuery: 'Ruibin+Galway', desc: 'Special celebration dinner at Ruibin / Dough Bros in Galway with pints and wine toast!' },
      { time: '9:30 PM+', startHour: 21.5, endHour: 23.0, dur: '1.5h', activity: '🍻 Birthday Drinks & Trad Music in Galway / Spiddal', type: 'dining', energyLevel: 'chill', tag: 'CELEBRATE', mapsQuery: 'Tigh+Neachtain+Galway', desc: 'Birthday cheers and live music session for Dad and Erin!' }
    ],
  },
  {
    dayNumber: 7,
    date: 'Oct 8 (Thu)',
    region: 'kerry',
    color: '#8b5cf6',
    title: 'Base Transfer: Galway → Killarney (Kerry)',
    base: 'Milltown House (Killarney)',
    route: 'Spiddal → Killarney/Milltown → Killarney NP',
    isTransfer: true,
    driveHours: 3.5,
    special: false,
    weather: '⛅ 14°C / 57°F · Mild & partly cloudy',
    outfit: '🚗 Travel layers + walking shoes for Ross Castle & Torc Waterfall; smart casual for Cronins',
    budget: { driving: 3.5, sightseeing: 3.5, dining: 3.0, free: 1.5 },
    items: [
      { time: '8:00 AM – 9:00 AM', startHour: 8.0, endHour: 9.0, dur: '1h', activity: '☕ Breakfast & Luggage Packing', type: 'free', energyLevel: 'chill', tag: 'PACKING', desc: 'Pack luggage and check out of Spiddal Villa.' },
      { time: '9:00 AM – 9:15 AM', startHour: 9.0, endHour: 9.25, dur: '15m', activity: '🏡 Check out Spiddal Villa', type: 'housing', energyLevel: 'chill', tag: 'CHECK-OUT', note: 'Check out window by 11 AM', mapsQuery: 'Spiddal+Galway', desc: 'Depart Galway for the Kingdom of Kerry.' },
      { time: '9:15 AM – 12:00 PM', startHour: 9.25, endHour: 12.0, dur: '2.75h', activity: '🚗 BASE TRANSFER: Galway → Killarney', type: 'drive', energyLevel: 'chill', tag: 'BASE MOVE', mapsQuery: 'Milltown+Killarney+Kerry', desc: '210 km / 130 mi drive south via Limerick / Shannon.' },
      { time: '12:00 PM – 12:30 PM', startHour: 12.0, endHour: 12.5, dur: '30m', activity: '🏡 Check in Milltown House (Killarney Base)', type: 'housing', energyLevel: 'chill', tag: 'CHECK-IN', mapsQuery: 'Milltown+Killarney+Kerry', desc: 'Unpack at Base #3 (Milltown) near Killarney town.' },
      { time: '12:30 PM – 1:30 PM', startHour: 12.5, endHour: 13.5, dur: '1h', activity: "🍽️ Lunch (Matt the Millers / Quinlans)", type: 'dining', energyLevel: 'chill', tag: 'LUNCH', mapsQuery: 'Quinlans+Seafood+Bar+Killarney', desc: 'Crispy fish & chips in Killarney town.' },
      { time: '1:30 PM – 3:00 PM', startHour: 13.5, endHour: 15.0, dur: '1.5h', activity: '🏰 Ross Castle & Lough Leane Walk', type: 'sight', energyLevel: 'chill', tag: 'CASTLE', mapsQuery: 'Ross+Castle+Killarney', desc: '15th-century O’Donoghue clan stronghold right on the lake.' },
      { time: '3:00 PM – 4:00 PM', startHour: 15.0, endHour: 16.0, dur: '1h', activity: '⛪ Muckross Abbey Ruins', type: 'sight', energyLevel: 'chill', trailId: 'muckross-abbey', tag: 'RUINS', mapsQuery: 'Muckross+Abbey+Killarney', desc: 'Remarkably intact 1448 Franciscan friary with ancient yew tree.' },
      { time: '4:00 PM – 5:00 PM', startHour: 16.0, endHour: 17.0, dur: '1h', activity: '💧 Torc Waterfall Forest Walk', type: 'sight', energyLevel: 'moderate', trailId: 'torc-waterfall', tag: 'WATERFALL', mapsQuery: 'Torc+Waterfall+Killarney', desc: 'Spectacular 20m cascade surrounded by lush Kerry mosses.' },
      { time: '5:30 PM – 7:15 PM', startHour: 17.5, endHour: 19.25, dur: '1.75h', activity: '🛁 Rest & Freshen Up at Base', type: 'free', energyLevel: 'chill', tag: 'FLEXIBLE TIME', desc: 'Shower and change for dinner reservation.' },
      { time: '7:30 PM – 9:30 PM', startHour: 19.5, endHour: 21.5, dur: '2h', activity: '🍽️ Cronins Restaurant Dinner', type: 'dining', reserved: true, restaurantId: 'cronins', energyLevel: 'chill', tag: 'SUGGESTED RESERVATION', mapsQuery: 'Cronins+Restaurant+Killarney', desc: 'Reserved table for 7:30 PM. Acclaimed traditional gastropub in Killarney.' },
    ],
  },
  {
    dayNumber: 8,
    date: 'Oct 9 (Fri)',
    region: 'kerry',
    color: '#8b5cf6',
    title: 'Dingle Peninsula & Slea Head Loop',
    base: 'Milltown House (Killarney)',
    route: 'Milltown → Dingle → Slea Head → Killarney',
    isTransfer: false,
    driveHours: 2.5,
    special: false,
    weather: '🌊 13°C / 55°F · Ocean breeze (32 km/h) & scenic bluffs',
    outfit: '🌊 Windproof jacket, warm sweater, comfortable shoes; nice casual for Mad Monk dinner',
    budget: { driving: 2.5, sightseeing: 5.0, dining: 3.0, free: 1.0 },
    items: [
      { time: '7:30 AM – 8:30 AM', startHour: 7.5, endHour: 8.5, dur: '1h', activity: '☕ Breakfast at House', type: 'dining', energyLevel: 'chill', tag: 'BREAKFAST', desc: 'Quick breakfast before driving west to the Atlantic edge.' },
      { time: '8:30 AM – 9:45 AM', startHour: 8.5, endHour: 9.75, dur: '1.25h', activity: '🚗 Drive Killarney → Dingle Town', type: 'drive', energyLevel: 'chill', tag: 'DRIVE', mapsQuery: 'Dingle+Marina', desc: 'Drive past Inch Beach along Dingle Bay.' },
      { time: '9:45 AM – 10:30 AM', startHour: 9.75, endHour: 10.5, dur: '45m', activity: '☕ Coffee & Harbor Walk in Dingle', type: 'dining', energyLevel: 'chill', tag: 'HARBOR WALK', mapsQuery: 'Bean+in+Dingle+Coffee', desc: 'Stroll around Dingle Marina and fishing boats.' },
      { time: '10:30 AM – 1:00 PM', startHour: 10.5, endHour: 13.0, dur: '2.5h', activity: '🏔️ Slea Head Coastal Drive & Beehive Huts', type: 'sight', energyLevel: 'moderate', trailId: 'slea-head', tag: 'SCENIC DRIVE', mapsQuery: 'Dunmore+Head+Viewpoint+Dingle', desc: 'One of Europe’s most dramatic coastline drives looking out at Blasket Islands.', rainBackup: 'Blasket Centre (Ionad an Bhlascaoid) interactive heritage museum overlooking the cliffs.' },
      { time: '1:00 PM – 2:00 PM', startHour: 13.0, endHour: 14.0, dur: '1h', activity: '🍽️ Lunch: Out of the Blue / Fishbox', type: 'dining', restaurantId: 'fishbox', energyLevel: 'chill', tag: 'LUNCH', mapsQuery: 'The+Fish+Box+Dingle', desc: 'World-famous fresh catch of the day in Dingle.' },
      { time: '2:00 PM – 3:30 PM', startHour: 14.0, endHour: 15.5, dur: '1.5h', activity: '🏘️ Dick Macks Pub & Dingle Town Shops', type: 'sight', restaurantId: 'dick-macks', energyLevel: 'chill', tag: 'PUB/CULTURE', mapsQuery: "Dick+Mack's+Pub+Dingle", desc: 'Legendary half-leather shop / half-whiskey pub.' },
      { time: '3:30 PM – 4:45 PM', startHour: 15.5, endHour: 16.75, dur: '1.25h', activity: '🚗 Drive Dingle → Killarney Base', type: 'drive', energyLevel: 'chill', tag: 'DRIVE', mapsQuery: 'Milltown+Killarney+Kerry', desc: 'Return drive to Milltown House.' },
      { time: '4:45 PM – 5:45 PM', startHour: 16.75, endHour: 17.75, dur: '1h', activity: '🛁 Rest & Freshen Up for Dinner', type: 'free', energyLevel: 'chill', tag: 'FLEXIBLE TIME', desc: 'Relax before the 6:00 PM booking.' },
      { time: '6:00 PM – 8:00 PM', startHour: 18.0, endHour: 20.0, dur: '2h', activity: '🍽️ Mad Monk Dinner (Killarney)', type: 'dining', reserved: true, restaurantId: 'mad-monk', energyLevel: 'chill', tag: 'SUGGESTED RESERVATION', note: '48hr cancellation window', mapsQuery: 'The+Mad+Monk+Killarney', desc: 'Reserved table for 6:00 PM. High-end gourmet seafood bar & kitchen.' },
    ],
  },
  {
    dayNumber: 9,
    date: 'Oct 10 (Sat)',
    region: 'kerry',
    color: '#8b5cf6',
    title: 'Gap of Dunloe & Killarney National Park',
    base: 'Milltown House (Killarney)',
    route: 'Milltown → Gap of Dunloe → Killarney NP → Milltown',
    isTransfer: false,
    driveHours: 0.5,
    special: false,
    weather: '🌤️ 14°C / 57°F · Bright, crisp & best nature day',
    outfit: '🥾 Trail hiking boots, lightweight breathable layers, fleece for mountain pass',
    budget: { driving: 0.5, sightseeing: 6.5, dining: 3.0, free: 1.5 },
    note: '🌟 Lightest driving day of the entire trip (only 30m total). Pure nature.',
    items: [
      { time: '7:30 AM – 8:30 AM', startHour: 7.5, endHour: 8.5, dur: '1h', activity: '☕ Breakfast at House', type: 'dining', energyLevel: 'chill', tag: 'BREAKFAST', desc: 'Hearty breakfast before mountain exploration.' },
      { time: '8:30 AM – 9:00 AM', startHour: 8.5, endHour: 9.0, dur: '30m', activity: '🚗 Drive to Kate Kearney’s Cottage', type: 'drive', energyLevel: 'chill', tag: 'DRIVE', mapsQuery: "Kate+Kearney's+Cottage+Gap+of+Dunloe", desc: 'Quick 20-minute drive to Gap of Dunloe entrance.' },
      { time: '9:00 AM – 12:00 PM', startHour: 9.0, endHour: 12.0, dur: '3h', activity: '⛰️ Gap of Dunloe Valley Pass & Strickeen', type: 'sight', energyLevel: 'moderate', trailId: 'gap-of-dunloe', tag: 'MOUNTAIN HIKE', mapsQuery: "Kate+Kearney's+Cottage+Gap+of+Dunloe", desc: 'Narrow mountain pass carved by glaciers between MacGillycuddy’s Reeks.', rainBackup: "Jaunting pony-trap carriage ride through the pass with covered blankets + fireside hot drinks.", splitOption: "Summit climbers can tackle Strickeen Mountain (2.5h climb) while rest of group walks the flat Gap of Dunloe pass to Wishing Bridge." },
      { time: '12:00 PM – 12:45 PM', startHour: 12.0, endHour: 12.75, dur: '45m', activity: '☕ Kate Kearney’s Pub Coffee & Snack', type: 'dining', energyLevel: 'chill', tag: 'COFFEE', mapsQuery: "Kate+Kearney's+Cottage+Gap+of+Dunloe", desc: 'Cozy pub stop at the foot of the mountain pass.' },
      { time: '12:45 PM – 2:00 PM', startHour: 12.75, endHour: 14.0, dur: '1.25h', activity: '🍽️ Lunch in Killarney', type: 'dining', energyLevel: 'chill', tag: 'LUNCH', mapsQuery: 'Killarney+Town+Centre', desc: 'Lunch at Tango or Matt the Millers.' },
      { time: '2:00 PM – 5:00 PM', startHour: 14.0, endHour: 17.0, dur: '3h', activity: '🌲 Deep Killarney National Park Trails', type: 'sight', energyLevel: 'moderate', trailId: 'muckross-abbey', tag: 'NATURE TRAIL', mapsQuery: 'Killarney+National+Park', desc: 'Lakeside walks, native oak forests, and red deer spotting.' },
      { time: '5:00 PM – 7:00 PM', startHour: 17.0, endHour: 19.0, dur: '2h', activity: '🛁 Relax & Pack Ahead for Base Move', type: 'free', energyLevel: 'chill', tag: 'FLEXIBLE TIME', desc: 'Free afternoon & pack some bags for the big move tomorrow.' },
      { time: '7:00 PM – 9:00 PM', startHour: 19.0, endHour: 21.0, dur: '2h', activity: '🍽️ Dinner: Hilliards / Mizu / JM Reidis', type: 'dining', energyLevel: 'chill', tag: 'DINNER', mapsQuery: 'Hilliards+Killarney', desc: 'Vibrant dinner in Killarney town followed by traditional live session.' },
    ],
  },
  {
    dayNumber: 10,
    date: 'Oct 11 (Sun)',
    region: 'dublin',
    color: '#f59e0b',
    title: 'Base Transfer: Killarney → Navan (via Rock of Cashel & Kilkenny)',
    base: 'Navan Home (Dublin area)',
    route: 'Killarney → Cashel → Kilkenny → Navan Home',
    isTransfer: true,
    driveHours: 4.5,
    special: false,
    weather: '⛅ 15°C / 59°F · Crisp autumn sunshine',
    outfit: '🚗 Comfortable road trip outfit, walking shoes, warm sweater for castle exploration',
    budget: { driving: 4.5, sightseeing: 3.75, dining: 2.5, free: 1.25 },
    items: [
      { time: '7:00 AM – 8:00 AM', startHour: 7.0, endHour: 8.0, dur: '1h', activity: '☕ Early Checkout & Car Loading', type: 'free', energyLevel: 'chill', tag: 'PACKING', desc: 'Pack all luggage and depart Milltown House.' },
      { time: '8:00 AM – 8:15 AM', startHour: 8.0, endHour: 8.25, dur: '15m', activity: '🏡 Check out Milltown House (Base #3)', type: 'housing', energyLevel: 'chill', tag: 'CHECK-OUT', note: 'Early checkout by 8 AM', mapsQuery: 'Milltown+Killarney+Kerry', desc: 'Depart Kerry for the midlands and Dublin area.' },
      { time: '8:15 AM – 10:15 AM', startHour: 8.25, endHour: 10.25, dur: '2h', activity: '🚗 Drive Killarney → Rock of Cashel', type: 'drive', energyLevel: 'chill', tag: 'TRANSFER LEG 1', mapsQuery: 'Rock+of+Cashel', desc: '145 km / 90 mi east through Tipperary golden vale.' },
      { time: '10:15 AM – 11:45 AM', startHour: 10.25, endHour: 11.75, dur: '1.5h', activity: '🏰 Rock of Cashel Fortress Tour', type: 'sight', energyLevel: 'chill', tag: 'HISTORIC SITE', mapsQuery: 'Rock+of+Cashel', desc: 'Spectacular limestone outcrop crowned by a 12th-century round tower and Cormac’s Chapel.' },
      { time: '11:45 AM – 12:45 PM', startHour: 11.75, endHour: 12.75, dur: '1h', activity: '🚗 Drive Cashel → Kilkenny Medieval City', type: 'drive', energyLevel: 'chill', tag: 'DRIVE', mapsQuery: 'Kilkenny+Castle', desc: 'Scenic countryside drive to Kilkenny.' },
      { time: '12:45 PM – 2:15 PM', startHour: 12.75, endHour: 14.25, dur: '1.5h', activity: '🍽️ Kilkenny Lunch: Marble City Tea Rooms', type: 'dining', energyLevel: 'chill', tag: 'LUNCH', mapsQuery: 'Marble+City+Tea+Rooms+Kilkenny', desc: 'Artisan lunch in the heart of the Medieval Mile.' },
      { time: '2:15 PM – 3:30 PM', startHour: 14.25, endHour: 15.5, dur: '1.25h', activity: "🏰 Kilkenny Castle & Smithwick's", type: 'sight', energyLevel: 'chill', tag: 'HERITAGE', mapsQuery: 'Kilkenny+Castle', desc: 'Anglo-Norman castle gardens and optional Smithwick’s brewery stop.' },
      { time: '3:30 PM – 5:15 PM', startHour: 15.5, endHour: 17.25, dur: '1.75h', activity: '🚗 Drive Kilkenny → Navan Home Base', type: 'drive', energyLevel: 'chill', tag: 'TRANSFER LEG 2', mapsQuery: 'Navan+Meath', desc: '128 km / 80 mi northward route on M9/M50 to Navan.' },
      { time: '5:15 PM – 6:00 PM', startHour: 17.25, endHour: 18.0, dur: '45m', activity: '🏡 Check in Navan Home', type: 'housing', energyLevel: 'chill', tag: 'CHECK-IN', note: 'Check-in open after 3 PM', mapsQuery: 'Navan+Meath', desc: 'Final base check-in (Navan house, 45m north of Dublin).' },
      { time: '6:00 PM – 7:30 PM', startHour: 18.0, endHour: 19.5, dur: '1.5h', activity: '🛁 Unpack & Settle In', type: 'free', energyLevel: 'chill', tag: 'FLEXIBLE TIME', desc: 'Unpack luggage for our 3-night stay at the final house.' },
      { time: '7:30 PM – 9:30 PM', startHour: 19.5, endHour: 21.5, dur: '2h', activity: '🍽️ Dinner in Navan / Local Pub', type: 'dining', energyLevel: 'chill', tag: 'DINNER', mapsQuery: 'Navan+Restaurants', desc: 'Relaxed dinner in Navan before tomorrow’s morning tour.' },
    ],
  },
  {
    dayNumber: 11,
    date: 'Oct 12 (Mon)',
    region: 'dublin',
    color: '#f59e0b',
    title: 'Guinness Storehouse (10:30 AM), Newgrange & Dublin Pub Crawl',
    base: 'Navan Home (Dublin area)',
    route: 'Navan → Dublin (Guinness 10:30 AM) → Boyne Valley (Newgrange) → Dublin (Pub Crawl) → Navan',
    isTransfer: false,
    driveHours: 2.25,
    special: false,
    weather: '☀️ 14°C / 57°F · Clear morning, brisk evening',
    outfit: '🍻 Smart casual layers for 10:30 AM Guinness Tour, comfortable shoes for pub crawl',
    budget: { driving: 2.25, sightseeing: 5.0, dining: 3.0, free: 0.75 },
    note: '🍺 10:30 AM Guinness Tour (depart Navan base by 9:15 AM).',
    items: [
      { time: '8:00 AM – 9:15 AM', startHour: 8.0, endHour: 9.25, dur: '1.25h', activity: '☕ Breakfast at Navan Base', type: 'dining', energyLevel: 'chill', tag: 'BREAKFAST', desc: 'Coffee, tea, and breakfast at the Navan house before heading to Dublin.' },
      { time: '9:15 AM – 10:15 AM', startHour: 9.25, endHour: 10.25, dur: '1h', activity: '🚗 Drive Navan → Dublin (Guinness)', type: 'drive', energyLevel: 'chill', tag: 'DRIVE', mapsQuery: 'Guinness+Storehouse+Dublin', desc: '45 km / 28 mi morning drive down M3 into Dublin Liberties.' },
      { time: '10:30 AM – 12:30 PM', startHour: 10.5, endHour: 12.5, dur: '2h', activity: '🍺 Guinness Storehouse Bar Tour (10:30 AM)', type: 'sight', reserved: true, anchor: true, energyLevel: 'chill', tag: 'SUGGESTED ITINERARY', note: '10:30 AM entry', mapsQuery: 'Guinness+Storehouse+Dublin', desc: 'Confirmed booking. Exclusive VIP bar tour, Guinness Academy & pint at 360° Gravity Bar.' },
      { time: '12:30 PM – 2:00 PM', startHour: 12.5, endHour: 14.0, dur: '1.5h', activity: '🍽️ Lunch in Liberties / The Brazen Head', type: 'dining', restaurantId: 'brazen-head', energyLevel: 'chill', tag: 'LUNCH', mapsQuery: 'The+Brazen+Head+Dublin', desc: 'Hearty lunch in the historic Liberties / Dublin’s oldest pub.' },
      { time: '2:00 PM – 3:00 PM', startHour: 14.0, endHour: 15.0, dur: '1h', activity: '🚗 Drive Dublin → Boyne Valley', type: 'drive', energyLevel: 'chill', tag: 'DRIVE', mapsQuery: 'Brú+na+Bóinne+Visitor+Centre', desc: 'Drive north to Newgrange World Heritage site.' },
      { time: '3:00 PM – 5:00 PM', startHour: 15.0, endHour: 17.0, dur: '2h', activity: '🪨 Newgrange UNESCO Passage Tomb', type: 'sight', energyLevel: 'chill', trailId: 'boyne-valley', tag: 'PLANNED VISIT', mapsQuery: 'Brú+na+Bóinne+Visitor+Centre', desc: '5,200-year-old Stone Age monument (older than Stonehenge & Pyramids).' },
      { time: '5:00 PM – 6:00 PM', startHour: 17.0, endHour: 18.0, dur: '1h', activity: '🚗 Drive to Dublin City Centre', type: 'drive', energyLevel: 'chill', tag: 'DRIVE', mapsQuery: 'Temple+Bar+Dublin', desc: 'Head back into central Dublin for dinner & pub evening.' },
      { time: '6:00 PM – 7:30 PM', startHour: 18.0, endHour: 19.5, dur: '1.5h', activity: '🍽️ The Old Storehouse Tavern Dinner', type: 'dining', reserved: true, restaurantId: 'old-storehouse', energyLevel: 'chill', tag: 'SUGGESTED RESERVATION', mapsQuery: 'The+Old+Storehouse+Dublin', desc: 'Classic Dublin tavern dinner before the music crawl in Temple Bar.' },
      { time: '7:30 PM – 11:00 PM', startHour: 19.5, endHour: 23.0, dur: '3.5h', activity: '🍻 DUBLIN PUB CRAWL (Temple Bar → Bad Bobs)', type: 'sight', energyLevel: 'chill', tag: 'PUB CRAWL', mapsQuery: 'The+Temple+Bar+Pub+Dublin', desc: 'Live music crawl through iconic historic pubs.' },
      { time: '11:00 PM – 11:45 PM', startHour: 23.0, endHour: 23.75, dur: '45m', activity: '🚗 Return Drive to Navan Base', type: 'drive', energyLevel: 'chill', tag: 'DRIVE', mapsQuery: 'Navan+Meath', desc: 'Night highway drive back to Navan house.' },
    ],
  },
  {
    dayNumber: 12,
    date: 'Oct 13 (Tue)',
    region: 'dublin',
    color: '#f59e0b',
    title: "MOM'S BIRTHDAY CELEBRATION! 🎂",
    base: 'Navan Home (Dublin area)',
    route: 'Navan → Dublin (Brunch & Shopping) → Navan (Dress Up) → Dublin (Mister S)',
    isTransfer: false,
    driveHours: 1.5,
    special: true,
    specialText: "MOM'S BIRTHDAY 🎂",
    weather: '🎂 15°C / 59°F · Mild & celebration ready',
    outfit: '👗 FANCY FORMAL / COCKTAIL for Mister S dinner; casual chic for daytime',
    budget: { driving: 1.5, sightseeing: 3.5, dining: 4.0, free: 2.0 },
    note: "🎂 Mom's Birthday! 👗 Fancy outfit for Mister S @ 5:15 PM (24hr cancellation window).",
    items: [
      { time: '9:00 AM – 10:00 AM', startHour: 9.0, endHour: 10.0, dur: '1h', activity: '☕ Sleep In & Morning Tea/Coffee', type: 'free', energyLevel: 'chill', tag: 'REST', desc: 'Relaxed morning at the Navan house.' },
      { time: '10:00 AM – 11:30 AM', startHour: 10.0, endHour: 11.5, dur: '1.5h', activity: '🍳 Mom’s Birthday Brunch: Bread 41 / Elliots', type: 'dining', anchor: true, restaurantId: 'bread-41', energyLevel: 'chill', tag: 'BDAY BRUNCH', mapsQuery: 'Bread+41+Dublin', desc: 'Famous Dublin pastries, sourdough, and birthday treats for Mom.' },
      { time: '11:30 AM – 1:45 PM', startHour: 11.5, endHour: 13.75, dur: '2.25h', activity: '🏙️ Grafton St Shopping & Trinity College', type: 'sight', energyLevel: 'chill', tag: 'CITY EXPLORE', mapsQuery: 'Grafton+Street+Dublin', desc: 'Grafton Street boutiques, Stephen’s Green, and Trinity campus walk.' },
      { time: '1:45 PM – 2:45 PM', startHour: 13.75, endHour: 14.75, dur: '1h', activity: '🚗 Drive back to Navan to Get Ready', type: 'drive', energyLevel: 'chill', tag: 'DRIVE', mapsQuery: 'Navan+Meath', desc: 'Head back to Navan base to shower and change into evening wear.' },
      { time: '2:45 PM – 4:15 PM', startHour: 14.75, endHour: 16.25, dur: '1.5h', activity: '👗 Get Ready in FANCY Birthday Outfits!', type: 'free', anchor: true, energyLevel: 'chill', tag: 'DRESS UP', desc: 'Formal/cocktail attire for Mom’s premier birthday dinner!' },
      { time: '4:15 PM – 5:00 PM', startHour: 16.25, endHour: 17.0, dur: '45m', activity: '🚗 Drive Navan → Mister S (Camden St, Dublin)', type: 'drive', energyLevel: 'chill', tag: 'DRIVE', mapsQuery: 'Mister+S+Camden+St+Dublin', desc: 'Drive in to Camden Street dining quarter to arrive by 5:00/5:05 PM.' },
      { time: '5:15 PM – 7:45 PM', startHour: 17.25, endHour: 19.75, dur: '2.5h', activity: '🎂🍽️ MISTER S BIRTHDAY DINNER (5:15 PM)', type: 'dining', reserved: true, anchor: true, mandatory: true, restaurantId: 'mister-s', energyLevel: 'chill', tag: 'CONFIRMED RESERVATION', note: '5:15 PM table · 24hr cancellation cutoff', mapsQuery: 'Mister+S+Camden+St+Dublin', desc: '✅ CONFIRMED MANDATORY: Table for 5:15 PM. High-end wood-fired cuisine, steaks, wine toast & birthday celebration!' },
      { time: '7:45 PM – 10:30 PM', startHour: 19.75, endHour: 22.5, dur: '2.75h', activity: '🥂 Birthday Cocktails & Drinks in Dublin', type: 'dining', energyLevel: 'chill', tag: 'CELEBRATE', mapsQuery: 'Vintage+Cocktail+Club+Dublin', desc: 'Post-dinner cocktails at Vintage Cocktail Club / Camden St toast to Mom!' },
      { time: '10:30 PM – 11:15 PM', startHour: 22.5, endHour: 23.25, dur: '45m', activity: '🚗 Return Drive to Navan Base', type: 'drive', energyLevel: 'chill', tag: 'DRIVE', mapsQuery: 'Navan+Meath', desc: 'Return drive to Navan house.' },
    ],
  },
  {
    dayNumber: 13,
    date: 'Oct 14 (Wed)',
    region: 'dublin',
    color: '#f59e0b',
    title: 'Departure & Flight Home 🛫',
    base: 'Navan Home (Check-out)',
    route: 'Navan → Dublin Airport (DUB)',
    isTransfer: true,
    driveHours: 1.0,
    special: false,
    weather: '🛫 13°C / 55°F · Crisp autumn breeze',
    outfit: '👟 Airport & flight travel layers',
    budget: { driving: 1.0, sightseeing: 0.0, dining: 1.5, free: 2.0 },
    items: [
      { time: '8:00 AM – 9:30 AM', startHour: 8.0, endHour: 9.5, dur: '1.5h', activity: '☕ Final Irish Breakfast & Packing', type: 'free', energyLevel: 'chill', tag: 'PACKING', desc: 'Pack all souvenirs and check out of Navan Home.' },
      { time: '9:30 AM – 10:00 AM', startHour: 9.5, endHour: 10.0, dur: '30m', activity: '🏡 Check out Navan Home', type: 'housing', energyLevel: 'chill', tag: 'CHECK-OUT', note: 'Check out by 11:00 AM', mapsQuery: 'Navan+Meath', desc: 'Final house checkout and car loading.' },
      { time: '10:00 AM – 10:50 AM', startHour: 10.0, endHour: 10.83, dur: '50m', activity: '🚗 Drive Navan → Dublin Airport (DUB)', type: 'drive', energyLevel: 'chill', tag: 'AIRPORT DRIVE', mapsQuery: 'Dublin+Airport+Terminal+2', desc: 'Direct drive down M3/M50 to Dublin Airport Terminal.' },
      { time: '11:00 AM – 12:30 PM', startHour: 11.0, endHour: 12.5, dur: '1.5h', activity: '🚗 Return Rental Car & Check-in', type: 'housing', energyLevel: 'chill', tag: 'CAR RETURN', mapsQuery: 'Dublin+Airport+Car+Rental+Return', desc: 'Gas up car, return keys to rental depot, bag drop.' },
      { time: '1:00 PM+', startHour: 13.0, endHour: 16.0, dur: '3h', activity: '🛫 Departure Flight Home', type: 'sight', anchor: true, energyLevel: 'chill', tag: 'FLIGHT HOME', desc: 'Board flight home with memories of an incredible Ireland adventure!' },
    ],
  }
];

// ── Restaurants by city (Interlinked Entity Model) ────────────
const restaurants = [
  {
    id: 'holohans',
    name: 'Holohans Pantry',
    city: 'Belfast',
    cuisine: 'Fine Dining / Boxty',
    cuisineType: 'Traditional Irish',
    booked: true,
    bookingTime: 'Oct 3 @ 7:15 PM',
    cancelPolicy: '48hr cancellation',
    mapsQuery: 'Holohans+Pantry+Belfast',
    notes: 'Traditional Irish boxty & seafood on University Rd. Confirmed reservation for first night in Belfast.'
  },
  {
    id: 'common-market',
    name: 'Common Market',
    city: 'Belfast',
    cuisine: 'Street Food Hall',
    cuisineType: 'Casual & Street Food',
    booked: false,
    mapsQuery: 'Common+Market+Belfast',
    notes: 'Great casual lunch spot in Belfast with diverse artisan food vendors, burgers, tacos, and coffee.'
  },
  {
    id: 'duke-of-york',
    name: 'Duke of York',
    city: 'Belfast',
    cuisine: 'Historic Pub',
    cuisineType: 'Historic Pubs',
    booked: false,
    mapsQuery: 'The+Duke+of+York+Belfast',
    notes: 'Famous cobblestone beer garden in the Cathedral Quarter. Historic mirrors and memorabilia.'
  },
  {
    id: 'bittles-bar',
    name: 'Bittles Bar',
    city: 'Belfast',
    cuisine: 'Flatiron Pub',
    cuisineType: 'Historic Pubs',
    booked: false,
    mapsQuery: 'Bittles+Bar+Belfast',
    notes: 'Quirky triangular pub with great whiskeys and draft Guinness near Victoria Square.'
  },
  {
    id: 'mourne-seafood',
    name: 'Mourne Seafood',
    city: 'Dundrum',
    cuisine: 'Fresh Coastal Seafood',
    cuisineType: 'Seafood',
    booked: true,
    bookingTime: 'Oct 3 @ 7:15 PM (Tentative)',
    cancelPolicy: 'Table held',
    mapsQuery: 'Mourne+Seafood+Bar+Dundrum',
    notes: 'Fresh local coastal shellfish 35m from Newry base. Renowned oysters, mussels, and hake.'
  },
  {
    id: 'donnellys',
    name: 'Donnellys of Barna',
    city: 'Galway',
    cuisine: 'Seafood Pub',
    cuisineType: 'Seafood',
    booked: false,
    mapsQuery: 'Donnellys+of+Barna',
    notes: 'Pub by the beach in Barna village, fresh Atlantic oysters, crab claws, and cozy turf fireplace.'
  },
  {
    id: 'kirwans',
    name: 'Kirwans',
    city: 'Galway',
    cuisine: 'Seafood Bar',
    cuisineType: 'Seafood',
    booked: true,
    bookingTime: 'Oct 6 @ 7:00 PM',
    cancelPolicy: 'Confirmed',
    mapsQuery: 'Kirwans+Lane+Galway',
    notes: 'In the heart of Latin Quarter. Exceptional local wild fish dishes, scallops, and wine selection.'
  },
  {
    id: 'dough-bros',
    name: 'Dough Bros',
    city: 'Galway',
    cuisine: 'Neapolitan Pizza',
    cuisineType: 'Pizza & Casual',
    booked: false,
    special: true,
    birthdayEvent: "Dad & Erin's Bday Casual Option (Oct 7)",
    mapsQuery: 'The+Dough+Bros+Galway',
    notes: "Ranked #1 pizza in Ireland. Great casual celebration option for Dad & Erin's birthday with top-tier wood-fired craft pies."
  },
  {
    id: 'ruibin',
    name: 'Ruibin',
    city: 'Galway',
    cuisine: 'Modern Irish & Seafood',
    cuisineType: 'Modern Irish',
    booked: false,
    special: true,
    birthdayEvent: "Dad & Erin's Bday Dinner (Oct 7)",
    mapsQuery: 'Ruibin+Galway',
    notes: "Top choice for Dad & Erin's Double Birthday dinner! Stunning dockside restaurant with local seasonal produce & wine pairings."
  },
  {
    id: 'out-of-the-blue',
    name: 'Out of the Blue',
    city: 'Dingle',
    cuisine: 'Seafood Only',
    cuisineType: 'Seafood',
    booked: false,
    mapsQuery: 'Out+of+the+Blue+Dingle',
    notes: 'No chips, no meat, only whatever was caught that morning from Dingle fishing boats!'
  },
  {
    id: 'fishbox',
    name: 'Fishbox',
    city: 'Dingle',
    cuisine: 'Fish & Chips',
    cuisineType: 'Seafood',
    booked: false,
    mapsQuery: 'The+Fish+Box+Dingle',
    notes: 'Family-owned trawler-to-table casual seafood. Fresh monkfish goujons and calamari.'
  },
  {
    id: 'dick-macks',
    name: 'Dick Macks',
    city: 'Dingle',
    cuisine: 'Classic Pub',
    cuisineType: 'Historic Pubs',
    booked: false,
    mapsQuery: "Dick+Mack's+Pub+Dingle",
    notes: 'Historic pub + leather craftsman workshop on Green Street. Extraordinary Irish whiskey library.'
  },
  {
    id: 'cronins',
    name: 'Cronins',
    city: 'Killarney',
    cuisine: 'Trad Gastropub',
    cuisineType: 'Traditional Irish',
    booked: true,
    bookingTime: 'Oct 8 @ 7:30 PM',
    cancelPolicy: 'Confirmed',
    mapsQuery: 'Cronins+Restaurant+Killarney',
    notes: 'Beloved dining institution in Killarney. Traditional Kerry lamb, seafood chowder, and steaks.'
  },
  {
    id: 'mad-monk',
    name: 'Mad Monk',
    city: 'Killarney',
    cuisine: 'Seafood & Steaks',
    cuisineType: 'Fine Dining & Steaks',
    booked: true,
    bookingTime: 'Oct 9 @ 6:00 PM',
    cancelPolicy: '48hr cancellation',
    mapsQuery: 'The+Mad+Monk+Killarney',
    notes: 'High-end dining. Strict 48h cancellation policy. Superb steaks and Atlantic lobster.'
  },
  {
    id: 'mister-s',
    name: 'Mister S',
    city: 'Dublin',
    cuisine: 'Wood-fired Fine Dining',
    cuisineType: 'Fine Dining & Steaks',
    booked: true,
    bookingTime: 'Oct 13 @ 5:15 PM',
    cancelPolicy: '24hr cancellation',
    special: true,
    birthdayEvent: "Mom's Premier Birthday Celebration (Oct 13 @ 5:15 PM)",
    mapsQuery: 'Mister+S+Camden+St+Dublin',
    notes: "⭐ KEY ANCHOR EVENT: Mom's Birthday Dinner! High-end wood-fired cuisine & wine toasts on Camden St. 24hr cancellation cutoff. Dress code: Formal/Cocktail."
  },
  {
    id: 'old-storehouse',
    name: 'Old Storehouse',
    city: 'Dublin',
    cuisine: 'Traditional Pub',
    cuisineType: 'Traditional Irish',
    booked: true,
    bookingTime: 'Oct 12 @ 6:00 PM (Tentative)',
    cancelPolicy: 'Held',
    mapsQuery: 'The+Old+Storehouse+Dublin',
    notes: 'Hearty dinner in Temple Bar before the pub crawl. Live traditional music.'
  },
  {
    id: 'bread-41',
    name: 'Bread 41',
    city: 'Dublin',
    cuisine: 'Artisan Bakery',
    cuisineType: 'Bakery & Brunch',
    booked: false,
    special: true,
    birthdayEvent: "Mom's Birthday Morning Brunch (Oct 13)",
    mapsQuery: 'Bread+41+Dublin',
    notes: "Celebratory birthday morning pastries, cruffins, sourdough, and brunch for Mom."
  },
  {
    id: 'brazen-head',
    name: 'Brazen Head',
    city: 'Dublin',
    cuisine: 'Historic Pub',
    cuisineType: 'Historic Pubs',
    booked: false,
    mapsQuery: 'The+Brazen+Head+Dublin',
    notes: 'Oldest pub in Ireland (est. 1198) on Bridge Street. Great Guinness and fireside trad sessions.'
  }
];

// ── Confirmed & Tracked Reservations ───────────────────────────
const reservations = [
  { id: 'res-holohans', date: 'Oct 3', time: '7:15 PM', name: 'Holohans Pantry', location: 'Belfast', type: 'dining', restaurantId: 'holohans', status: 'Confirmed', mandatory: true, cancelPolicy: '48hr cancellation', mapsQuery: 'Holohans+Pantry+Belfast', notes: '✅ CONFIRMED MANDATORY: Second night dinner in Belfast. Traditional Irish boxty & seafood.' },
  { id: 'res-oliver', date: 'Oct 4', time: '7:00 PM', name: 'The Oliver', location: 'Newry', type: 'dining', status: 'Confirmed', mandatory: true, mapsQuery: 'The+Oliver+Newry', notes: '✅ CONFIRMED MANDATORY: Relaxing dinner at The Oliver near Newry base.' },
  { id: 'res-mourne', date: 'Oct 3', time: '7:15 PM', name: 'Mourne Seafood', location: 'Dundrum', type: 'dining', restaurantId: 'mourne-seafood', status: 'Tentative', cancelPolicy: 'Call if modifying', mapsQuery: 'Mourne+Seafood+Bar+Dundrum', notes: 'Fresh local coastal seafood.' },
  { id: 'res-kirwans', date: 'Oct 6', time: '7:00 PM', name: 'Kirwans Seafood Bar', location: 'Galway', type: 'dining', restaurantId: 'kirwans', status: 'Confirmed', cancelPolicy: 'Standard', mapsQuery: 'Kirwans+Lane+Galway', notes: 'Latin Quarter fine seafood.' },
  { id: 'res-cronins', date: 'Oct 8', time: '7:30 PM', name: 'Cronins Restaurant', location: 'Killarney', type: 'dining', restaurantId: 'cronins', status: 'Confirmed', cancelPolicy: 'Standard', mapsQuery: 'Cronins+Restaurant+Killarney', notes: 'Killarney town centre.' },
  { id: 'res-mad-monk', date: 'Oct 9', time: '6:00 PM', name: 'Mad Monk', location: 'Killarney', type: 'dining', restaurantId: 'mad-monk', status: 'Confirmed', cancelPolicy: '48hr cancellation', mapsQuery: 'The+Mad+Monk+Killarney', notes: 'Strict 48hr cancellation cutoff. High-end dining.' },
  { id: 'res-guinness', date: 'Oct 12', time: '10:30 AM', name: 'Guinness Storehouse Bar Tour', location: 'Dublin', type: 'activity', status: 'Confirmed', cancelPolicy: 'Non-refundable', mapsQuery: 'Guinness+Storehouse+Dublin', notes: 'Leave Navan by 9:15 AM. 10:30 AM reserved VIP bar tour & Gravity Bar.' },
  { id: 'res-old-storehouse', date: 'Oct 12', time: '6:00 PM', name: 'Old Storehouse', location: 'Dublin', type: 'dining', restaurantId: 'old-storehouse', status: 'Tentative', cancelPolicy: 'Standard', mapsQuery: 'The+Old+Storehouse+Dublin', notes: 'Pre-crawl dinner in Temple Bar.' },
  { id: 'res-mister-s', date: 'Oct 13', time: '5:15 PM', name: 'Mister S (Mom’s Bday Dinner)', location: 'Dublin', type: 'dining', restaurantId: 'mister-s', status: 'Confirmed', mandatory: true, cancelPolicy: '24hr cancellation', special: true, mapsQuery: 'Mister+S+Camden+St+Dublin', notes: "✅ CONFIRMED MANDATORY: Mom's Birthday Premier Celebration! 5:15 PM confirmed table. Fancy outfits required." },
  { id: 'res-base-1', date: 'Oct 2–5', time: 'Check-in 11:30 AM', name: 'Walnut Retreat', location: 'Newry', type: 'lodging', status: 'Confirmed', cancelPolicy: 'Booked', mapsQuery: 'Newry+Northern+Ireland', notes: 'Base #1 (3 nights). Check-out Oct 5 by 11:00 AM.' },
  { id: 'res-base-2', date: 'Oct 5–8', time: 'Check-in 4:00 PM', name: 'Spiddal Villa', location: 'Spiddal (Galway)', type: 'lodging', status: 'Confirmed', cancelPolicy: 'Booked', mapsQuery: 'Spiddal+Galway', notes: 'Base #2 (3 nights). Check-out Oct 8 by 11:00 AM.' },
  { id: 'res-base-3', date: 'Oct 8–11', time: 'Check-in 12:00 PM', name: 'Milltown House', location: 'Killarney', type: 'lodging', status: 'Confirmed', cancelPolicy: 'Booked', mapsQuery: 'Milltown+Killarney+Kerry', notes: 'Base #3 (3 nights). Check-out Oct 11 by 8:00 AM.' },
  { id: 'res-base-4', date: 'Oct 11–14', time: 'Check-in 3:00 PM', name: 'Navan Home', location: 'Navan (Dublin)', type: 'lodging', status: 'Confirmed', cancelPolicy: 'Booked', mapsQuery: 'Navan+Meath', notes: 'Base #4 (3 nights). Check-out Oct 14 by 11:00 AM.' }
];

// ── Distances Matrix ──────────────────────────────────────────
const distances = [
  { from: 'Dublin Airport', to: 'Newry (Walnut Retreat)', time: '1h 10m', urgency: 'low', transfer: true, notes: 'M1/A1 highway corridor to Base #1.' },
  { from: 'Newry Base', to: 'Belfast Titanic Quarter', time: '50m', urgency: 'low', transfer: false, notes: 'Straight up A1.' },
  { from: 'Newry Base', to: "Giant's Causeway", time: '2h 15m', urgency: 'high', transfer: false, notes: 'Antrim coast day trip.' },
  { from: 'Newry Base', to: 'Mourne Seafood (Dundrum)', time: '40m', urgency: 'low', transfer: false, notes: 'Coastal drive.' },
  { from: 'Newry Base', to: 'Spiddal (Galway Base)', time: '3h 30m', urgency: 'high', transfer: true, notes: 'Base #1 → Base #2 cross-country transfer.' },
  { from: 'Spiddal Base', to: 'Cliffs of Moher', time: '1h 15m', urgency: 'medium', transfer: false, notes: 'Drive around Galway Bay.' },
  { from: 'Spiddal Base', to: 'Kylemore Abbey / Connemara NP', time: '1h 10m', urgency: 'medium', transfer: false, notes: 'Through Maam Cross & Twelve Bens.' },
  { from: 'Spiddal Base', to: 'Galway City (Latin Quarter)', time: '20m', urgency: 'low', transfer: false, notes: 'Short coastal road run.' },
  { from: 'Spiddal Base', to: 'Milltown (Killarney Base)', time: '2h 45m', urgency: 'high', transfer: true, notes: 'Base #2 → Base #3 south transfer.' },
  { from: 'Killarney Base', to: 'Dingle Town', time: '1h 00m', urgency: 'medium', transfer: false, notes: 'Along Dingle Bay coastline.' },
  { from: 'Dingle Town', to: 'Slea Head Loop', time: '45m', urgency: 'low', transfer: false, notes: 'Dramatic narrow cliff drive.' },
  { from: 'Killarney Base', to: 'Gap of Dunloe (Kate Kearney)', time: '20m', urgency: 'low', transfer: false, notes: 'Quick mountain jump.' },
  { from: 'Killarney Base', to: 'Torc Waterfall / Muckross', time: '15m', urgency: 'low', transfer: false, notes: 'Direct inside National Park.' },
  { from: 'Killarney Base', to: 'Rock of Cashel', time: '2h 00m', urgency: 'medium', transfer: true, notes: 'First leg of Base #3 → Base #4 move.' },
  { from: 'Rock of Cashel', to: 'Kilkenny Castle', time: '55m', urgency: 'low', transfer: true, notes: 'Scenic midlands link.' },
  { from: 'Kilkenny Castle', to: 'Navan Home Base', time: '1h 45m', urgency: 'medium', transfer: true, notes: 'Final leg of transfer via M9/M50/M3.' },
  { from: 'Navan Home', to: 'Guinness Storehouse (Dublin)', time: '50m', urgency: 'low', transfer: false, notes: 'M3 motorway into city.' },
  { from: 'Navan Home', to: 'Newgrange (Boyne Valley)', time: '20m', urgency: 'low', transfer: false, notes: 'Short country jump.' },
  { from: 'Navan Home', to: 'Mister S (Camden St, Dublin)', time: '50m', urgency: 'medium', transfer: false, notes: 'Evening dinner drive into Dublin.' },
  { from: 'Navan Home', to: 'Dublin Airport (DUB)', time: '45m', urgency: 'low', transfer: true, notes: 'Direct highway corridor for flight departure.' }
];

// ── October Ireland Daylight & Civil Sunset Table (Oct 2–14) ───
const daylightData = {
  1:  { sunrise: '07:34', sunset: '19:03', goldenHour: '18:15', daylightHours: '11h 29m', dawn: '06:58', dusk: '19:39', sunsetHour: 19.05, goldenHourStart: 18.25 },
  2:  { sunrise: '07:36', sunset: '19:00', goldenHour: '18:12', daylightHours: '11h 24m', dawn: '07:00', dusk: '19:36', sunsetHour: 19.00, goldenHourStart: 18.20 },
  3:  { sunrise: '07:38', sunset: '18:58', goldenHour: '18:10', daylightHours: '11h 20m', dawn: '07:02', dusk: '19:34', sunsetHour: 18.96, goldenHourStart: 18.16 },
  4:  { sunrise: '07:40', sunset: '18:55', goldenHour: '18:07', daylightHours: '11h 15m', dawn: '07:04', dusk: '19:31', sunsetHour: 18.91, goldenHourStart: 18.11 },
  5:  { sunrise: '07:42', sunset: '18:53', goldenHour: '18:05', daylightHours: '11h 11m', dawn: '07:06', dusk: '19:29', sunsetHour: 18.88, goldenHourStart: 18.08 },
  6:  { sunrise: '07:44', sunset: '18:50', goldenHour: '18:02', daylightHours: '11h 06m', dawn: '07:08', dusk: '19:26', sunsetHour: 18.83, goldenHourStart: 18.03 },
  7:  { sunrise: '07:46', sunset: '18:48', goldenHour: '18:00', daylightHours: '11h 02m', dawn: '07:10', dusk: '19:24', sunsetHour: 18.80, goldenHourStart: 18.00 },
  8:  { sunrise: '07:48', sunset: '18:46', goldenHour: '17:58', daylightHours: '10h 58m', dawn: '07:12', dusk: '19:22', sunsetHour: 18.76, goldenHourStart: 17.96 },
  9:  { sunrise: '07:50', sunset: '18:43', goldenHour: '17:55', daylightHours: '10h 53m', dawn: '07:14', dusk: '19:19', sunsetHour: 18.71, goldenHourStart: 17.91 },
  10: { sunrise: '07:52', sunset: '18:41', goldenHour: '17:53', daylightHours: '10h 49m', dawn: '07:16', dusk: '19:17', sunsetHour: 18.68, goldenHourStart: 17.88 },
  11: { sunrise: '07:54', sunset: '18:38', goldenHour: '17:50', daylightHours: '10h 44m', dawn: '07:18', dusk: '19:14', sunsetHour: 18.63, goldenHourStart: 17.83 },
  12: { sunrise: '07:56', sunset: '18:36', goldenHour: '17:48', daylightHours: '10h 40m', dawn: '07:20', dusk: '19:12', sunsetHour: 18.60, goldenHourStart: 17.80 },
  13: { sunrise: '07:58', sunset: '18:34', goldenHour: '17:46', daylightHours: '10h 36m', dawn: '07:22', dusk: '19:10', sunsetHour: 18.56, goldenHourStart: 17.76 },
  14: { sunrise: '08:00', sunset: '18:31', goldenHour: '17:43', daylightHours: '10h 31m', dawn: '07:24', dusk: '19:07', sunsetHour: 18.51, goldenHourStart: 17.71 }
};

// ── Emergency & Offline Glovebox Dataset ────────────────────────
const emergencyGloveboxData = {
  general: {
    emergencyNumber: '999 or 112',
    breakdownAssistance: 'AA Ireland: 0818 66 77 88 (+353 1 617 9999)',
    policeGarda: 'Local Garda Station / 999',
    touristAssistance: 'Irish Tourist Assistance Service: +353 1 666 9354',
    usEmbassy: 'US Embassy Dublin: +353 1 668 8777 (42 Elgin Rd, Ballsbridge)'
  },
  hospitals: [
    { city: 'Belfast (NI)', name: 'Royal Victoria Hospital (A&E)', phone: '+44 28 9024 0503', address: '274 Grosvenor Rd, Belfast BT12 6BA', notes: 'Major regional trauma center' },
    { city: 'Galway', name: 'University Hospital Galway (UHG)', phone: '+353 91 544 544', address: 'Newcastle Rd, Galway H91 YR71', notes: '24/7 Full Emergency Department' },
    { city: 'Kerry', name: 'University Hospital Kerry (Tralee)', phone: '+353 66 718 4000', address: 'Ratass, Tralee, Co. Kerry V92 NX46', notes: 'Nearest major A&E for Kerry/Dingle' },
    { city: 'Dublin', name: 'St. James’s Hospital / Mater Hospital', phone: '+353 1 410 3000', address: 'James St, Dublin 8', notes: '24/7 Central Dublin Emergency' }
  ],
  lodgings: [
    { base: 'Base 1 (NI)', name: 'Walnut Retreat', dates: 'Oct 2–5 (3 nights)', phone: '+44 28 3026 8800', address: 'Newry, Co. Down, Northern Ireland' },
    { base: 'Base 2 (Galway)', name: 'Spiddal Coastal Villa', dates: 'Oct 5–8 (3 nights)', phone: '+353 91 553 111', address: 'Spiddal, Co. Galway, Ireland' },
    { base: 'Base 3 (Kerry)', name: 'Milltown / Killarney House', dates: 'Oct 8–11 (3 nights)', phone: '+353 64 663 2222', address: 'Milltown, Co. Kerry, Ireland' },
    { base: 'Base 4 (Dublin/Navan)', name: 'Navan Estate & Dublin Base', dates: 'Oct 11–14 (3 nights)', phone: '+353 46 902 3333', address: 'Navan, Co. Meath, Ireland' }
  ],
  drivingTips: [
    'Drive on the LEFT side of the road at all times.',
    'Speed limits: Republic of Ireland is in KM/H (White circle with red border); Northern Ireland is in MPH.',
    'M50 Dublin Toll is barrier-free video tolling. Pay by 8:00 PM next day at eFlow.ie or Payzone retail outlets.',
    'Narrow rural roads (boreens): Use designated passing spaces; reverse if the passing place is closer behind you.',
    'Roundabouts: Yield to traffic coming from your right. Signal left before exiting.'
  ]
};

// ── Multi-Currency Expense & Budget Tracker Dataset ─────────────
// Clean slate: all dummy money examples removed as requested so users can enter actual expenses
const tripExpenseData = [];

// ── City Shopping, Artistic Boutiques & Piano Stores ────────────
const shoppingVenuesData = [
  // 🎹 Piano Stores & Musical Instruments
  {
    id: 'precision-pianos',
    name: 'Precision Pianos Dublin',
    city: 'Dublin',
    category: 'pianos',
    categoryLabel: '🎹 Piano Showroom',
    highlight: 'Acoustic Grands, Uprights & Restored Steinways / Yamahas',
    desc: "Dublin's premier piano specialists with an expansive showroom of grand and upright acoustic pianos, digital instruments, and Japanese reconditioned Yamahas. Dedicated restoration, tuning, and regulation experts.",
    address: 'Harold’s Cross Road, Dublin 6W',
    mapsQuery: 'Precision+Pianos+Harold+Cross+Dublin',
    phone: '+353 1 496 4600',
    tags: ['Acoustic Pianos', 'Grand Pianos', 'Piano Showroom', 'Repairs']
  },
  {
    id: 'waltons-music',
    name: 'Waltons Music',
    city: 'Dublin',
    category: 'pianos',
    categoryLabel: '🎹 Musical Instruments & Pianos',
    highlight: 'Historic Irish Music Institution (Since 1922)',
    desc: 'Legendary Dublin musical institution for over a century. Features acoustic and digital keyboards, traditional Irish bodhráns, tin whistles, Celtic harps, and sheet music.',
    address: 'South Great George’s St / Blanchardstown, Dublin',
    mapsQuery: 'Waltons+Music+Dublin',
    phone: '+353 1 960 3232',
    tags: ['Traditional Instruments', 'Keyboards', 'Celtic Harps', 'Sheet Music']
  },
  {
    id: 'gandharva-loka',
    name: 'Gandharva Loka World Music',
    city: 'Dublin',
    category: 'pianos',
    categoryLabel: '🎵 Artistic World Instruments',
    highlight: 'Handpans, Singing Bowls, Celtic Harps & Flutes',
    desc: 'An enchanting musical sanctuary in the heart of Dublin offering rare acoustic instruments from Ireland and around the globe. Try out Irish harps, harmoniums, and hand-tuned chimes.',
    address: "George's Street Arcade, Dublin 2",
    mapsQuery: 'Gandharva+Loka+Georges+Street+Arcade+Dublin',
    phone: '+353 1 475 8710',
    tags: ['World Instruments', 'Celtic Harps', 'Boutique', 'Meditation']
  },
  {
    id: 'pianos-plus',
    name: 'Pianos Plus',
    city: 'Dublin',
    category: 'pianos',
    categoryLabel: '🎹 Piano Showroom',
    highlight: 'Acoustic & Digital Kawai / Roland Showroom',
    desc: 'Specialist piano showroom offering new and pre-owned uprights, grand pianos, and digital stage pianos, with expert advice and rental services.',
    address: 'Centrepoint Business Park, Oak Road, Dublin 12',
    mapsQuery: 'Pianos+Plus+Dublin',
    phone: '+353 1 405 0101',
    tags: ['Kawai Pianos', 'Digital Stage', 'Acoustic Uprights']
  },
  {
    id: 'obriain-pianos',
    name: 'O’Briain Pianos',
    city: 'Dublin',
    category: 'pianos',
    categoryLabel: '🎹 Vintage Piano Restoration',
    highlight: 'Restored Classic Uprights & Grand Pianos',
    desc: 'Master piano restorers offering hand-selected vintage and modern acoustic pianos, precision voicing, regulation, and restoration.',
    address: 'Lucan, County Dublin',
    mapsQuery: 'OBriain+Pianos+Dublin',
    phone: '+353 87 279 0743',
    tags: ['Vintage Pianos', 'Restoration', 'Tuning']
  },

  // 🎨 Artistic Shops, Prints & Creative Trinkets
  {
    id: 'jam-art-factory',
    name: 'Jam Art Factory',
    city: 'Dublin',
    category: 'art',
    categoryLabel: '🎨 Contemporary Irish Art & Trinkets',
    highlight: 'Original Dublin Prints, Pins, Ceramics & Quirky Gifts',
    desc: 'An independent gallery and design boutique spotlighting local Dublin illustrators, printmakers, and ceramicists. The best spot for modern artistic souvenirs and enamel trinkets.',
    address: '14 Crown Alley (Temple Bar) & 64 Patrick St, Dublin',
    mapsQuery: 'Jam+Art+Factory+Crown+Alley+Dublin',
    phone: '+353 1 679 8572',
    tags: ['Art Prints', 'Local Designers', 'Quirky Trinkets', 'Temple Bar']
  },
  {
    id: 'irish-design-shop',
    name: 'Irish Design Shop',
    city: 'Dublin',
    category: 'art',
    categoryLabel: '🏺 Authentic Irish Crafts',
    highlight: 'Handmade Jewelry, Ceramics, Textiles & Wooden Goods',
    desc: 'Curated boutique run by jewelers celebrating contemporary craftsmanship from all 32 counties of Ireland. Features hand-thrown pottery, woven blankets, and beeswax candles.',
    address: '41 Drury Street, Creative Quarter, Dublin 2',
    mapsQuery: 'Irish+Design+Shop+Drury+Street+Dublin',
    phone: '+353 1 679 8878',
    tags: ['Handmade Crafts', 'Jewelry', 'Creative Quarter', 'Textiles']
  },
  {
    id: 'article-powerscourt',
    name: 'Article @ Powerscourt Townhouse',
    city: 'Dublin',
    category: 'art',
    categoryLabel: '🏛️ Georgian Mansion Design Boutique',
    highlight: 'Eclectic Homewares, Stationery, Prints & Artistic Trinkets',
    desc: 'Housed inside Lord Powerscourt’s magnificent 18th-century Georgian townhouse. Filled with delightful stationery, artistic prints, and unusual decorative gifts.',
    address: 'Powerscourt Townhouse Centre, South William St, Dublin 2',
    mapsQuery: 'Article+Powerscourt+Townhouse+Dublin',
    phone: '+353 1 679 9268',
    tags: ['Georgian Townhouse', 'Stationery', 'Creative Quarter', 'Homewares']
  },
  {
    id: 'georges-street-arcade',
    name: 'George’s Street Arcade',
    city: 'Dublin',
    category: 'trinkets',
    categoryLabel: '🛍️ Victorian Indoor Market',
    highlight: 'Vintage Vinyl, Antiques, Tarot, Books & Quirky Trinkets',
    desc: 'Victorian covered red-brick arcade running since 1881. Packed with bohemian market stalls, retro souvenirs, vintage clothing, and specialty records.',
    address: 'South Great George’s Street, Dublin 2',
    mapsQuery: 'Georges+Street+Arcade+Dublin',
    tags: ['Victorian Market', 'Vintage Records', 'Trinkets', 'Antiques']
  },

  // 💍 Traditional Claddagh Rings & Heirloom Jewelry
  {
    id: 'thomas-dillons-claddagh',
    name: 'Thomas Dillon’s Claddagh Gold',
    city: 'Galway',
    category: 'jewelry',
    categoryLabel: '💍 The Original Claddagh Ring Maker',
    highlight: 'Oldest Jewelers in Ireland (Since 1750) & Mini Museum',
    desc: 'The original makers of the worldwide famous Irish Claddagh Ring (Love, Loyalty, Friendship). Includes the free Claddagh museum housing rings dating to the 1700s.',
    address: '1 Quay Street, Latin Quarter, Galway',
    mapsQuery: 'Thomas+Dillon+Claddagh+Gold+Galway',
    phone: '+353 91 566 365',
    tags: ['Claddagh Rings', 'Since 1750', 'Latin Quarter', 'Heirloom Gold']
  },
  {
    id: 'courtville-antiques',
    name: 'Courtville Antiques',
    city: 'Dublin',
    category: 'jewelry',
    categoryLabel: '💍 Antique Celtic & Vintage Jewelry',
    highlight: 'Victorian, Edwardian & Antique Irish Rings',
    desc: 'Premier family antique jeweler inside Powerscourt Townhouse. Unmatched collection of historic Celtic jewelry, antique gemstones, and vintage Irish rings.',
    address: 'Powerscourt Townhouse Centre, Dublin 2',
    mapsQuery: 'Courtville+Antiques+Powerscourt+Dublin',
    phone: '+353 1 679 4042',
    tags: ['Antique Jewelry', 'Estate Rings', 'Vintage Gold']
  },
  {
    id: 'brian-de-staic',
    name: 'Brian de Staic Jewellery',
    city: 'Dingle',
    category: 'jewelry',
    categoryLabel: '💍 Handcrafted Celtic & Ogham Jewelry',
    highlight: 'Personalized Ancient Ogham Script Silver & Gold',
    desc: 'Master Kerry silversmith crafting original Celtic jewelry engraved with the ancient Irish alphabet (Ogham). Handcrafted directly in Dingle town.',
    address: 'The Wood & Green Street, Dingle, Co. Kerry',
    mapsQuery: 'Brian+de+Staic+Jewellery+Dingle',
    phone: '+353 66 915 1298',
    tags: ['Ogham Script', 'Dingle Silversmith', 'Handcrafted']
  },

  // 📚 Literary Trinkets & Vintage Bookshops
  {
    id: 'winding-stair-books',
    name: 'The Winding Stair Bookshop',
    city: 'Dublin',
    category: 'books',
    categoryLabel: '📚 Historic Riverfront Bookshop',
    highlight: 'Irish Poetry, Vintage Paperbacks & Literary Gifts',
    desc: 'Iconic independent bookshop along the River Liffey by the Ha’penny Bridge. Features winding wooden staircases, local Irish literature, vintage prints, and cozy reading nooks.',
    address: '40 Lower Ormond Quay, Dublin 1',
    mapsQuery: 'The+Winding+Stair+Bookshop+Dublin',
    phone: '+353 1 873 3292',
    tags: ['Independent Bookstore', 'Ha’penny Bridge', 'Irish Literature']
  },
  {
    id: 'charlie-byrnes',
    name: 'Charlie Byrne’s Bookshop',
    city: 'Galway',
    category: 'books',
    categoryLabel: '📚 Legendary Labyrinth Bookshop',
    highlight: 'Over 100,000 New, Used, Rare & Irish Folklore Titles',
    desc: 'One of the world’s most beloved bookshops. A sprawling maze of rooms filled floor-to-ceiling with bargain Irish poetry, mythology, maps, and art books.',
    address: 'The Cornstore, Middle Street, Galway',
    mapsQuery: 'Charlie+Byrnes+Bookshop+Galway',
    phone: '+353 91 561 766',
    tags: ['100k Books', 'Galway Icon', 'Mythology & Maps']
  },

  // 🧶 Irish Wool, Aran Knitwear & Pottery
  {
    id: 'avoca-dublin',
    name: 'Avoca Flagship Store',
    city: 'Dublin',
    category: 'wool',
    categoryLabel: '🧶 Handwoven Woolens & Artisan Goods',
    highlight: 'Pure Wool Throws, Mohair Scarves & Ceramic Trinkets',
    desc: 'Ireland’s oldest handweaving mill (est. 1723). Four floors of vibrant rainbow wool blankets, artisanal Irish jams, ceramic gifts, and rooftop café.',
    address: '11–13 Suffolk Street, Dublin 2',
    mapsQuery: 'Avoca+Suffolk+Street+Dublin',
    phone: '+353 1 677 4215',
    tags: ['Handwoven Blankets', 'Since 1723', 'Artisan Treats']
  },
  {
    id: 'kilkenny-design',
    name: 'Kilkenny Design Centre',
    city: 'Dublin',
    category: 'wool',
    categoryLabel: '🛍️ National Showcase of Irish Craft',
    highlight: 'Waterford Crystal, Nicholas Mosse Pottery & Knitwear',
    desc: 'Facing the historic Trinity College gates. The national emporium for premium Irish craft, featuring pottery, Celtic scarves, crystal, and jewelry.',
    address: '6 Nassau Street, Dublin 2',
    mapsQuery: 'Kilkenny+Design+Centre+Nassau+Street+Dublin',
    phone: '+353 1 677 7066',
    tags: ['Pottery', 'Waterford Crystal', 'Aran Knitwear']
  },
  {
    id: 'louis-mulcahy-pottery',
    name: 'Louis Mulcahy Pottery Studio',
    city: 'Dingle',
    category: 'art',
    categoryLabel: '🏺 Master Ceramic Studio',
    highlight: 'Handmade Kerry Stoneware Glazed with Atlantic Hues',
    desc: 'The workshop of Ireland’s most revered master potter, perched near the tip of Slea Head. Watch pots being thrown on the wheel and browse artisanal lamps and tableware.',
    address: 'Clogher, Ballyferriter, Dingle Peninsula, Co. Kerry',
    mapsQuery: 'Louis+Mulcahy+Pottery+Ballyferriter+Dingle',
    phone: '+353 66 915 6229',
    tags: ['Studio Pottery', 'Slea Head Drive', 'Atlantic Glazes']
  },
  {
    id: 'st-georges-market',
    name: 'St George’s Historic Market',
    city: 'Belfast',
    category: 'trinkets',
    categoryLabel: '🛍️ Victorian Weekend Market',
    highlight: 'Local Northern Irish Crafts, Art, Antiques & Baked Goods',
    desc: 'Award-winning Victorian covered market open Fri–Sun. Browse handcrafted jewelry, Belfast art prints, live folk musicians, and delicious soda bread.',
    address: '12–20 East Bridge Street, Belfast',
    mapsQuery: 'St+Georges+Market+Belfast',
    phone: '+44 28 9043 5704',
    tags: ['Victorian Market', 'Live Music', 'Antiques', 'Weekend']
  }
];
