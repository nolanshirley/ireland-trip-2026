// =============================================================
//  Component: Weather Patterns & Outfits Guide
// =============================================================

const WeatherPacking = {
  name: 'WeatherPacking',
  props: {
    weatherData: { type: Object, required: true },
    outfitGuides: { type: Array, required: true }
  },
  data() {
    return {
      selectedTab: 'forecast', // 'forecast', 'outfits'
      selectedRegionFilter: 'all'
    };
  },
  computed: {
    filteredDaily() {
      if (this.selectedRegionFilter === 'all') return this.weatherData.dailyForecast;
      return this.weatherData.dailyForecast.filter(d =>
        d.region.toLowerCase().includes(this.selectedRegionFilter.toLowerCase())
      );
    }
  },
  methods: {},
  template: `
    <div class="space-y-6">
      <!-- Top Overview Banner -->
      <div class="card p-5 sm:p-6 space-y-4">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-2xl">🌦️</span>
              <h2 class="text-xl font-bold tracking-tight text-[var(--foreground)]">October 2026 Weather Patterns & Outfit Guide</h2>
            </div>
            <p class="text-sm text-[var(--muted-foreground)]">
              Comprehensive meteorological forecast for the 2 weeks of October 2026 across Ireland, with location-specific dress codes.
            </p>
          </div>

          <!-- Quick Stat Badges -->
          <div class="flex items-center gap-2.5 flex-wrap text-xs">
            <div class="px-3 py-1.5 rounded-xl bg-[var(--background)] border border-[var(--border)] font-semibold shadow-sm">
              🌡️ Temps: <span class="text-emerald-700 dark:text-emerald-400 font-bold">8°C – 15°C (46°F – 59°F)</span>
            </div>
            <div class="px-3 py-1.5 rounded-xl bg-[var(--background)] border border-[var(--border)] font-semibold shadow-sm">
              🌅 Daylight: <span class="text-amber-700 dark:text-amber-400 font-bold">~10.5 hrs (Sunrise 7:45 AM)</span>
            </div>
            <div class="px-3 py-1.5 rounded-xl bg-[var(--background)] border border-[var(--border)] font-semibold shadow-sm">
              💨 Winds: <span class="text-blue-700 dark:text-blue-400 font-bold">15–40 km/h (Gale gusts on cliffs)</span>
            </div>
          </div>
        </div>

        <!-- Weather Rule of Thumb Callout -->
        <div class="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-500/60 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-3 shadow-sm">
          <span class="text-xl">💡</span>
          <div class="leading-relaxed">
            <strong class="font-black text-amber-950 dark:text-amber-300 block mb-0.5">The Golden Rule for October in Ireland:</strong>
            "Four seasons in one day." Always layer: <em>Base layer (moisture wicking) + Mid layer (fleece/wool) + Outer shell (100% windproof & waterproof)</em>.
            <span class="text-rose-700 dark:text-rose-400 font-extrabold block mt-1">⚠️ Do not rely on umbrellas on coastal cliffs or mountains — Atlantic gusts will invert them immediately!</span>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs for Weather Section -->
      <div class="flex items-center gap-2 border-b border-[var(--border)] pb-2 overflow-x-auto">
        <button
          @click="selectedTab = 'forecast'"
          :class="[
            'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
            selectedTab === 'forecast'
              ? 'bg-[var(--accent)] text-white shadow-sm'
              : 'bg-[var(--card)] hover:bg-[var(--card-hover)] text-[var(--muted-foreground)]'
          ]"
        >
          <span>📅</span>
          <span>14-Day October Forecast</span>
        </button>
        <button
          @click="selectedTab = 'outfits'"
          :class="[
            'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
            selectedTab === 'outfits'
              ? 'bg-[var(--accent)] text-white shadow-sm'
              : 'bg-[var(--card)] hover:bg-[var(--card-hover)] text-[var(--muted-foreground)]'
          ]"
        >
          <span>👗</span>
          <span>Outfit Guidelines by Location</span>
        </button>
      </div>

      <!-- TAB 1: 14-Day Daily Forecast & Regional Patterns -->
      <div v-if="selectedTab === 'forecast'" class="space-y-6">
        <!-- 4 Regional Climate Overview Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            v-for="reg in weatherData.regionalOverview"
            :key="reg.region"
            class="card p-4 space-y-2 border-t-4"
            :class="{
              'border-t-emerald-500': reg.region.includes('Northern'),
              'border-t-blue-500': reg.region.includes('Galway'),
              'border-t-purple-500': reg.region.includes('Kerry'),
              'border-t-amber-500': reg.region.includes('Dublin')
            }"
          >
            <h4 class="font-bold text-sm text-[var(--foreground)] leading-snug">{{ reg.region }}</h4>
            <div class="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-400">🌡️ {{ reg.highLow }}</div>
            <p class="text-xs text-[var(--muted-foreground)] leading-relaxed">
              {{ reg.conditions }}
            </p>
            <div class="pt-2 border-t border-[var(--border)] text-[11px] text-[var(--foreground)]">
              <strong>👔 Outfit:</strong> {{ reg.outfitRecommendation }}
            </div>
          </div>
        </div>

        <!-- Daily Forecast Table -->
        <div class="card p-5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 class="text-lg font-bold tracking-tight">📆 14-Day October 2026 Daily Forecast & Outfits</h3>
              <p class="text-xs text-[var(--muted-foreground)]">Day-by-day temperatures, wind speeds, rain probabilities, and recommended attire</p>
            </div>

            <!-- Region Filter -->
            <div class="flex items-center gap-1.5 flex-wrap">
              <button
                v-for="rFlt in [
                  { id: 'all', label: 'All Days' },
                  { id: 'Northern', label: 'Northern Ireland' },
                  { id: 'Galway', label: 'Galway / West' },
                  { id: 'Kerry', label: 'Kerry / South' },
                  { id: 'Dublin', label: 'Dublin / East' }
                ]"
                :key="rFlt.id"
                @click="selectedRegionFilter = rFlt.id"
                :class="[
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                  selectedRegionFilter === rFlt.id
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--card-hover)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                ]"
              >
                {{ rFlt.label }}
              </button>
            </div>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-[var(--border)] text-[var(--muted-foreground)] text-xs uppercase tracking-wider">
                  <th class="text-left py-2.5 px-3">Date</th>
                  <th class="text-left py-2.5 px-3">Region</th>
                  <th class="text-center py-2.5 px-2">High / Low</th>
                  <th class="text-center py-2.5 px-2">Rain %</th>
                  <th class="text-center py-2.5 px-2">Wind</th>
                  <th class="text-left py-2.5 px-3">Conditions</th>
                  <th class="text-left py-2.5 px-3">What to Wear</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--border)]">
                <tr
                  v-for="(day, idx) in filteredDaily"
                  :key="idx"
                  class="hover:bg-[var(--card-hover)] transition-colors"
                  :class="day.date.includes('Oct 13') ? 'bg-pink-500/[0.04]' : ''"
                >
                  <td class="py-2.5 px-3 whitespace-nowrap font-bold text-[var(--foreground)]">
                    <div class="flex items-center gap-1.5">
                      <span>{{ day.icon }}</span>
                      <span>{{ day.date }}</span>
                    </div>
                  </td>
                  <td class="py-2.5 px-3 text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                    {{ day.region }}
                  </td>
                  <td class="py-2.5 px-2 text-center font-mono text-xs font-semibold text-emerald-800 dark:text-emerald-400 whitespace-nowrap">
                    {{ day.tempHigh }}
                    <span class="text-[10px] text-[var(--muted-foreground)] block">{{ day.tempLow }}</span>
                  </td>
                  <td class="py-2.5 px-2 text-center whitespace-nowrap">
                    <span
                      :class="[
                        'px-2 py-0.5 rounded-full text-[11px] font-bold',
                        parseInt(day.rainProb) >= 50
                          ? 'bg-blue-500/20 text-blue-900 dark:text-blue-300'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200'
                      ]"
                    >
                      💧 {{ day.rainProb }}
                    </span>
                  </td>
                  <td class="py-2.5 px-2 text-center font-mono text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                    💨 {{ day.wind }}
                  </td>
                  <td class="py-2.5 px-3 text-xs text-[var(--foreground)]">
                    {{ day.condition }}
                  </td>
                  <td class="py-2.5 px-3 text-xs font-medium text-[var(--foreground)]">
                    <span :class="day.date.includes('Oct 13') ? 'text-pink-900 dark:text-pink-300 font-extrabold' : ''">
                      {{ day.outfit }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 2: Outfits by Location & Activity -->
      <div v-if="selectedTab === 'outfits'" class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div
          v-for="guide in outfitGuides"
          :key="guide.category"
          class="card p-5 space-y-3"
          :class="guide.category.includes('Birthday') ? 'ring-2 ring-pink-500/50 bg-pink-500/[0.02]' : ''"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-2xl">{{ guide.icon }}</span>
                <h3 class="font-extrabold text-base text-[var(--foreground)]">{{ guide.category }}</h3>
              </div>
              <div class="text-xs text-[var(--muted-foreground)] mt-1">
                📍 <strong>Locations:</strong> {{ guide.locations }}
              </div>
            </div>
          </div>

          <!-- Bulleted checklist -->
          <ul class="space-y-1.5 pt-2 border-t border-[var(--border)] text-xs">
            <li
              v-for="(item, itIdx) in guide.essentials"
              :key="itIdx"
              class="flex items-start gap-2 text-[var(--foreground)] leading-relaxed"
            >
              <span class="text-emerald-800 dark:text-emerald-400 font-bold mt-0.5">✓</span>
              <span :class="item.includes('⚠️') ? 'text-amber-900 dark:text-amber-300 font-bold' : ''">{{ item }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  `
};

