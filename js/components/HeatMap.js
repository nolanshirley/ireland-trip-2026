// =============================================================
//  Component: HeatMap & Attractions Explorer
// =============================================================

const HeatMap = {
  name: 'HeatMap',
  props: {
    regions: { type: Array, required: true },
    attractions: { type: Object, required: true }
  },
  data() {
    return {
      selectedRegionId: 'ni',
      searchQuery: '',
      categories: [
        { key: 'nature', label: '🌿 Nature' },
        { key: 'city', label: '🏙️ City' },
        { key: 'history', label: '🏰 History' },
        { key: 'culture', label: '🎭 Culture' },
        { key: 'food', label: '🍴 Food' },
        { key: 'activities', label: '🎯 Activities' },
        { key: 'sport', label: '⚽ Sport' },
        { key: 'scenic', label: '📸 Scenic' }
      ]
    };
  },
  computed: {
    selectedRegion() {
      return this.regions.find(r => r.id === this.selectedRegionId) || this.regions[0];
    },
    filteredAttractions() {
      const list = this.attractions[this.selectedRegionId] || [];
      if (!this.searchQuery.trim()) return list;
      const q = this.searchQuery.toLowerCase();
      return list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.dist && a.dist.toLowerCase().includes(q))
      );
    }
  },
  methods: {
    calcAverage(ratings) {
      const vals = Object.values(ratings);
      if (!vals.length) return '0.0';
      const sum = vals.reduce((a, b) => a + b, 0);
      return (sum / vals.length).toFixed(1);
    },
    getHeatClass(val) {
      if (val >= 9) return 'heat-9';
      if (val >= 7) return 'heat-7';
      if (val >= 5) return 'heat-5';
      if (val >= 3) return 'heat-3';
      return 'heat-1';
    },
    getAttractionScoreBadge(score) {
      if (score >= 9) return 'bg-emerald-500/20 text-emerald-400 font-bold';
      if (score >= 7) return 'bg-blue-500/20 text-blue-400 font-semibold';
      if (score >= 5) return 'bg-amber-500/20 text-amber-400';
      return 'text-zinc-500';
    }
  },
  template: `
    <div class="space-y-6">
      <!-- Heat Map Overview Card -->
      <div class="card p-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 class="text-xl font-bold tracking-tight">🗺️ Regional Experience Heat Map</h2>
            <p class="text-sm text-[var(--muted-foreground)]">Rating across 8 core trip dimensions (1–10)</p>
          </div>
          <div class="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
            <span class="inline-block w-3 h-3 rounded bg-zinc-800 border border-zinc-700"></span> 1-2
            <span class="inline-block w-3 h-3 rounded bg-amber-950/60 border border-amber-800"></span> 3-4
            <span class="inline-block w-3 h-3 rounded bg-amber-900/60 border border-amber-700"></span> 5-6
            <span class="inline-block w-3 h-3 rounded bg-emerald-950/70 border border-emerald-800"></span> 7-8
            <span class="inline-block w-3 h-3 rounded bg-emerald-800/80 border border-emerald-600"></span> 9-10
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-[var(--border)] text-[var(--muted-foreground)] text-xs uppercase tracking-wider">
                <th class="text-left py-2.5 px-3">Region & Base</th>
                <th v-for="cat in categories" :key="cat.key" class="text-center py-2.5 px-2">{{ cat.label }}</th>
                <th class="text-center py-2.5 px-3 font-semibold text-[var(--foreground)]">Overall</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--border)]">
              <tr
                v-for="r in regions"
                :key="r.id"
                @click="selectedRegionId = r.id"
                :class="['cursor-pointer transition-colors', selectedRegionId === r.id ? 'bg-[var(--card-hover)] ring-1 ring-[var(--accent)]' : 'hover:bg-[var(--card-hover)]']"
              >
                <td class="py-3 px-3">
                  <div class="font-semibold flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: r.color }"></span>
                    {{ r.name }}
                  </div>
                  <div class="text-xs text-[var(--muted-foreground)]">{{ r.sub }}</div>
                </td>
                <td v-for="cat in categories" :key="cat.key" class="text-center py-2 px-1">
                  <span :class="['heat-cell inline-block w-8 h-8 leading-8 rounded text-center text-xs font-bold', getHeatClass(r.ratings[cat.key])]">
                    {{ r.ratings[cat.key] }}
                  </span>
                </td>
                <td class="text-center py-3 px-3">
                  <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-[var(--accent)]/15 text-[var(--accent)]">
                    {{ calcAverage(r.ratings) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Attraction Explorer Card -->
      <div class="card p-5">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full" :style="{ backgroundColor: selectedRegion.color }"></span>
              <h3 class="text-lg font-bold">{{ selectedRegion.name }} Attractions</h3>
            </div>
            <p class="text-xs text-[var(--muted-foreground)] mt-0.5">{{ selectedRegion.notes }}</p>
          </div>

          <!-- Region Pills -->
          <div class="flex flex-wrap gap-2">
            <button
              v-for="r in regions"
              :key="r.id"
              @click="selectedRegionId = r.id"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                selectedRegionId === r.id
                  ? 'bg-[var(--accent)] text-white shadow'
                  : 'bg-[var(--card-hover)] hover:bg-[var(--border)] text-[var(--foreground)]'
              ]"
            >
              {{ r.name }}
            </button>
          </div>
        </div>

        <!-- Filter Input -->
        <div class="mb-4">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="🔍 Search attractions in this region..."
            class="w-full sm:max-w-md px-3.5 py-2 text-sm rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)]"
          />
        </div>

        <!-- Attraction Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-[var(--border)] text-[var(--muted-foreground)] text-xs uppercase tracking-wider">
                <th class="text-left py-2.5 px-3">Attraction</th>
                <th class="text-center py-2.5 px-2">Nature</th>
                <th class="text-center py-2.5 px-2">History</th>
                <th class="text-center py-2.5 px-2">Culture</th>
                <th class="text-center py-2.5 px-2">Activity</th>
                <th class="text-center py-2.5 px-3">Duration</th>
                <th class="text-left py-2.5 px-3">Distance from Base</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--border)]">
              <tr v-for="att in filteredAttractions" :key="att.name" class="hover:bg-[var(--card-hover)] transition-colors">
                <td class="py-2.5 px-3 font-semibold text-[var(--foreground)]">{{ att.name }}</td>
                <td class="text-center py-2.5 px-2">
                  <span :class="['px-2 py-0.5 rounded text-xs', getAttractionScoreBadge(att.nature)]">{{ att.nature }}</span>
                </td>
                <td class="text-center py-2.5 px-2">
                  <span :class="['px-2 py-0.5 rounded text-xs', getAttractionScoreBadge(att.history)]">{{ att.history }}</span>
                </td>
                <td class="text-center py-2.5 px-2">
                  <span :class="['px-2 py-0.5 rounded text-xs', getAttractionScoreBadge(att.culture)]">{{ att.culture }}</span>
                </td>
                <td class="text-center py-2.5 px-2">
                  <span :class="['px-2 py-0.5 rounded text-xs', getAttractionScoreBadge(att.activity)]">{{ att.activity }}</span>
                </td>
                <td class="text-center py-2.5 px-3 text-xs text-[var(--muted-foreground)] whitespace-nowrap">{{ att.time }}</td>
                <td class="py-2.5 px-3 text-xs text-[var(--muted-foreground)]">{{ att.dist }}</td>
              </tr>
              <tr v-if="filteredAttractions.length === 0">
                <td colspan="7" class="text-center py-8 text-sm text-[var(--muted-foreground)]">
                  No attractions match "{{ searchQuery }}".
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
};
