// =============================================================
//  Component: Weather Patterns & Outfits / Packing Guide
// =============================================================

const WeatherPacking = {
  name: 'WeatherPacking',
  props: {
    weatherData: { type: Object, required: true },
    outfitGuides: { type: Array, required: true }
  },
  data() {
    return {
      selectedTab: 'forecast', // 'forecast', 'outfits', 'checklist'
      selectedRegionFilter: 'all',
      selectedChecklistCat: 'all',
      defaultChecklist: [
        { id: 'c1', cat: '🧥 Outerwear & Shells', item: 'Heavy-duty hooded waterproof shell (Gore-Tex / 15k+ mm rated)', packed: false },
        { id: 'c2', cat: '🧥 Outerwear & Shells', item: 'Packable lightweight rain pants (essential for Diamond Hill / Cliffs)', packed: false },
        { id: 'c3', cat: '🧥 Outerwear & Shells', item: 'Warm fleece or packable down mid-layer jacket', packed: false },
        { id: 'c4', cat: '🧥 Outerwear & Shells', item: 'Stylish city coat or waxed jacket for evenings & pubs', packed: false },
        { id: 'c5', cat: '🥾 Footwear', item: 'Broken-in waterproof hiking boots with deep traction tread', packed: false },
        { id: 'c6', cat: '🥾 Footwear', item: 'Comfortable water-resistant leather sneakers / Chelsea boots for walking towns', packed: false },
        { id: 'c7', cat: '🥾 Footwear', item: 'Fancy dress shoes / heels for Mom’s Birthday dinner at Mister S (Oct 13)', packed: false },
        { id: 'c8', cat: '🥾 Footwear', item: '6+ pairs of Merino wool hiking socks (cushioned & moisture wicking)', packed: false },
        { id: 'c9', cat: '👕 Base & Mid Layers', item: '3–4 moisture-wicking synthetic or merino thermal base layers', packed: false },
        { id: 'c10', cat: '👕 Base & Mid Layers', item: 'Quick-dry hiking trousers (avoid heavy cotton jeans on wet trails)', packed: false },
        { id: 'c11', cat: '👕 Base & Mid Layers', item: 'Knit sweaters, cardigans, or henleys for cozy pub crawls', packed: false },
        { id: 'c12', cat: '🎂 Celebrations & Dinners', item: 'Dad & Erin Bday Outfit: Smart casual (button-down/sweater + chinos/jeans) for Ruibin / Dough Bros (Oct 7)', packed: false },
        { id: 'c13', cat: '🎂 Celebrations & Dinners', item: 'Mom Bday Outfit: Cocktail dress, elegant jumpsuit, or tailored blazer + trousers for Mister S (Oct 13 @ 5:15 PM)', packed: false },
        { id: 'c14', cat: '🧤 Accessories', item: 'Fleece beanie / windproof earband & neck gaiter (for cliff winds)', packed: false },
        { id: 'c15', cat: '🧤 Accessories', item: 'Lightweight water-resistant windproof gloves', packed: false },
        { id: 'c16', cat: '🔌 Gear & Electronics', item: 'UK / Ireland Type G plug power adapters & portable 10,000mAh+ power bank', packed: false },
        { id: 'c17', cat: '🔌 Gear & Electronics', item: 'Small daypack with waterproof rain cover (20L–25L)', packed: false },
        { id: 'c18', cat: '🔌 Gear & Electronics', item: 'Ziploc bags / waterproof dry pouch for phones & passports on wet hikes', packed: false }
      ],
      checklist: []
    };
  },
  created() {
    this.initChecklist();
  },
  computed: {
    filteredDaily() {
      if (this.selectedRegionFilter === 'all') return this.weatherData.dailyForecast;
      return this.weatherData.dailyForecast.filter(d =>
        d.region.toLowerCase().includes(this.selectedRegionFilter.toLowerCase())
      );
    },
    checklistCategories() {
      const cats = new Set(this.checklist.map(c => c.cat));
      return ['all', ...Array.from(cats)];
    },
    filteredChecklist() {
      if (this.selectedChecklistCat === 'all') return this.checklist;
      return this.checklist.filter(c => c.cat === this.selectedChecklistCat);
    },
    packedCount() {
      return this.checklist.filter(c => c.packed).length;
    },
    packedPercentage() {
      if (!this.checklist.length) return 0;
      return Math.round((this.packedCount / this.checklist.length) * 100);
    }
  },
  methods: {
    initChecklist() {
      const saved = localStorage.getItem('ireland_packing_checklist_v2');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          this.checklist = this.defaultChecklist.map(item => {
            const found = parsed.find(p => p.id === item.id || p.item === item.item);
            return {
              ...item,
              packed: found ? Boolean(found.packed) : false
            };
          });
          return;
        } catch (e) {
          console.error('Error loading checklist', e);
        }
      }
      this.checklist = JSON.parse(JSON.stringify(this.defaultChecklist));
    },
    saveChecklist() {
      localStorage.setItem('ireland_packing_checklist_v2', JSON.stringify(this.checklist));
    },
    toggleItem(item) {
      item.packed = !item.packed;
      this.saveChecklist();
    },
    markAll(packedState) {
      this.checklist.forEach(item => {
        if (this.selectedChecklistCat === 'all' || item.cat === this.selectedChecklistCat) {
          item.packed = packedState;
        }
      });
      this.saveChecklist();
    },
    resetChecklist() {
      if (confirm('Reset all packing checklist items to unpacked?')) {
        this.checklist.forEach(i => (i.packed = false));
        this.saveChecklist();
      }
    }
  },
  template: `
    <div class="space-y-6">
      <!-- Top Overview Banner -->
      <div class="card p-6 bg-gradient-to-br from-blue-950/30 via-[var(--card)] to-emerald-950/30 border border-blue-500/20">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-2xl">🌦️</span>
              <h2 class="text-xl font-bold tracking-tight">October 2026 Weather Patterns & Outfit Guide</h2>
            </div>
            <p class="text-sm text-[var(--muted-foreground)]">
              Comprehensive meteorological forecast for the 2 weeks of October 2026 across Ireland, with location-specific dress codes.
            </p>
          </div>

          <!-- Quick Stat Badges -->
          <div class="flex items-center gap-3 flex-wrap text-xs">
            <div class="px-3 py-1.5 rounded-xl bg-[var(--background)] border border-[var(--border)] font-semibold">
              🌡️ Temps: <span class="text-emerald-400 font-bold">8°C – 15°C (46°F – 59°F)</span>
            </div>
            <div class="px-3 py-1.5 rounded-xl bg-[var(--background)] border border-[var(--border)] font-semibold">
              🌅 Daylight: <span class="text-amber-400 font-bold">~10.5 hrs (Sunrise 7:45 AM)</span>
            </div>
            <div class="px-3 py-1.5 rounded-xl bg-[var(--background)] border border-[var(--border)] font-semibold">
              💨 Winds: <span class="text-blue-400 font-bold">15–40 km/h (Gale gusts on cliffs)</span>
            </div>
          </div>
        </div>

        <!-- Weather Rule of Thumb Callout -->
        <div class="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2.5">
          <span class="text-lg">💡</span>
          <div>
            <strong class="font-bold">The Golden Rule for October in Ireland:</strong>
            "Four seasons in one day." Always layer: <em>Base layer (moisture wicking) + Mid layer (fleece/wool) + Outer shell (100% windproof & waterproof)</em>.
            <span class="text-rose-300 font-bold">Do not rely on umbrellas on coastal cliffs or mountains</span> — Atlantic gusts will invert them immediately!
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
        <button
          @click="selectedTab = 'checklist'"
          :class="[
            'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
            selectedTab === 'checklist'
              ? 'bg-[var(--accent)] text-white shadow-sm'
              : 'bg-[var(--card)] hover:bg-[var(--card-hover)] text-[var(--muted-foreground)]'
          ]"
        >
          <span>🧳</span>
          <span>Interactive Packing Checklist ({{ packedCount }}/{{ checklist.length }})</span>
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
            <div class="text-xs font-mono font-bold text-emerald-400">🌡️ {{ reg.highLow }}</div>
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
                  <td class="py-2.5 px-2 text-center font-mono text-xs font-semibold text-emerald-400 whitespace-nowrap">
                    {{ day.tempHigh }}
                    <span class="text-[10px] text-[var(--muted-foreground)] block">{{ day.tempLow }}</span>
                  </td>
                  <td class="py-2.5 px-2 text-center whitespace-nowrap">
                    <span
                      :class="[
                        'px-2 py-0.5 rounded-full text-[11px] font-bold',
                        parseInt(day.rainProb) >= 50
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-zinc-500/15 text-zinc-400'
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
                    <span :class="day.date.includes('Oct 13') ? 'text-pink-400 font-bold' : ''">
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
              <span class="text-emerald-400 font-bold mt-0.5">✓</span>
              <span :class="item.includes('⚠️') ? 'text-amber-300 font-semibold' : ''">{{ item }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- TAB 3: Interactive Packing Checklist with LocalStorage & Categories -->
      <div v-if="selectedTab === 'checklist'" class="card p-5 space-y-5">
        <!-- Header & Progress -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-2xl">🧳</span>
              <h3 class="text-lg font-bold">Interactive Packing Checklist</h3>
            </div>
            <p class="text-xs text-[var(--muted-foreground)] mt-0.5">
              Saved automatically on your device. Tap any item to check it off.
            </p>
          </div>

          <!-- Progress Bar & Count -->
          <div class="flex flex-col sm:items-end gap-1.5">
            <div class="flex items-center gap-2 text-xs">
              <span class="font-bold text-[var(--foreground)]">{{ packedCount }} of {{ checklist.length }} Packed</span>
              <span class="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {{ packedPercentage }}%
              </span>
            </div>
            <!-- Visual Progress Bar -->
            <div class="w-full sm:w-48 h-2.5 rounded-full bg-[var(--background)] border border-[var(--border)] overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-emerald-500 to-[var(--accent)] transition-all duration-300"
                :style="{ width: packedPercentage + '%' }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Filter Pills & Batch Action Buttons -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <!-- Category Filter Pills -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <button
              v-for="cat in checklistCategories"
              :key="cat"
              @click="selectedChecklistCat = cat"
              :class="[
                'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                selectedChecklistCat === cat
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'bg-[var(--card-hover)] hover:bg-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              ]"
            >
              {{ cat === 'all' ? '🎒 All Items' : cat }}
            </button>
          </div>

          <!-- Batch Action Controls -->
          <div class="flex items-center gap-2 self-start sm:self-auto text-xs">
            <button
              @click="markAll(true)"
              class="px-2.5 py-1 rounded-lg bg-[var(--card-hover)] hover:bg-[var(--border)] text-[var(--foreground)] font-medium transition-colors"
              title="Check all items in current view"
            >
              ✓ Check All
            </button>
            <button
              @click="markAll(false)"
              class="px-2.5 py-1 rounded-lg bg-[var(--card-hover)] hover:bg-[var(--border)] text-[var(--foreground)] font-medium transition-colors"
              title="Uncheck all items in current view"
            >
              ✗ Uncheck All
            </button>
            <button
              @click="resetChecklist"
              class="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-medium transition-colors"
              title="Reset entire checklist"
            >
              🔄 Reset
            </button>
          </div>
        </div>

        <!-- 100% Packed Congratulations Banner -->
        <div v-if="packedPercentage === 100" class="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-3">
          <span class="text-3xl">🎉</span>
          <div>
            <div class="font-bold text-sm">All Packed & Ready for Ireland!</div>
            <div class="text-xs opacity-90">You have checked off all items including birthday outfits and wet-weather gear. Have an amazing trip!</div>
          </div>
        </div>

        <!-- Checklist Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-for="item in filteredChecklist"
            :key="item.id"
            @click="toggleItem(item)"
            class="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--card-hover)] cursor-pointer transition-all flex items-center justify-between gap-3 select-none"
            :class="item.packed ? 'border-emerald-500/50 bg-emerald-500/[0.06]' : ''"
          >
            <div class="flex items-start gap-3">
              <div
                class="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold border transition-colors flex-shrink-0 mt-0.5"
                :class="item.packed ? 'bg-emerald-500 text-white border-emerald-500' : 'border-[var(--border)] bg-[var(--card)]'"
              >
                {{ item.packed ? '✓' : '' }}
              </div>
              <div>
                <div
                  class="text-xs font-semibold text-[var(--foreground)] leading-snug"
                  :class="item.packed ? 'line-through opacity-60' : ''"
                >
                  {{ item.item }}
                </div>
                <div class="text-[10px] text-[var(--muted-foreground)] mt-0.5 font-medium">{{ item.cat }}</div>
              </div>
            </div>
            <span v-if="item.packed" class="text-[10px] font-bold text-emerald-400 uppercase flex-shrink-0 px-2 py-0.5 rounded bg-emerald-500/15">
              Packed
            </span>
          </div>
        </div>
      </div>
    </div>
  `
};

