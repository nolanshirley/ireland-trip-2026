// =============================================================
//  Component: Hiking & Nature Locations
// =============================================================

const HikingNature = {
  name: 'HikingNature',
  props: {
    trails: { type: Array, required: true }
  },
  data() {
    return {
      searchQuery: '',
      regionFilter: 'all',
      statusFilter: 'all', // 'all', 'Confirmed', 'Planned', 'Optional'
      difficultyFilter: 'all' // 'all', 'Easy', 'Moderate', 'Strenuous'
    };
  },
  computed: {
    filteredTrails() {
      return this.trails.filter(t => {
        // Region
        if (this.regionFilter !== 'all' && t.region !== this.regionFilter) return false;

        // Status
        if (this.statusFilter !== 'all' && t.status !== this.statusFilter) return false;

        // Difficulty
        if (this.difficultyFilter !== 'all' && !t.difficulty.toLowerCase().includes(this.difficultyFilter.toLowerCase())) return false;

        // Search
        if (!this.searchQuery.trim()) return true;
        const q = this.searchQuery.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.regionName.toLowerCase().includes(q) ||
          t.highlights.toLowerCase().includes(q) ||
          t.gear.toLowerCase().includes(q) ||
          t.base.toLowerCase().includes(q)
        );
      });
    },
    confirmedCount() {
      return this.trails.filter(t => t.status === 'Confirmed').length;
    }
  },
  methods: {
    getStatusBadge(status) {
      if (status === 'Confirmed') {
        return {
          label: '✅ Confirmed on Itinerary',
          class: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold'
        };
      }
      if (status === 'Planned') {
        return {
          label: '📍 Planned Day Activity',
          class: 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-semibold'
        };
      }
      return {
        label: '💡 Optional / Weather Permitting',
        class: 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium'
      };
    },
    getDifficultyBadge(diff) {
      const d = diff.toLowerCase();
      if (d.includes('strenuous')) {
        return 'bg-red-500/15 text-red-400 border border-red-500/30';
      }
      if (d.includes('moderate')) {
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
      }
      return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
    }
  },
  template: `
    <div class="space-y-6">
      <!-- Top Overview Header -->
      <div class="card p-5">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-2xl">🥾</span>
              <h2 class="text-xl font-bold tracking-tight">Hiking & Nature Trails Guide</h2>
            </div>
            <p class="text-xs text-[var(--muted-foreground)] mt-0.5">
              Curated trail network across 4 regions with elevation, distances, terrain, required footwear, and matching trip statuses.
            </p>
          </div>

          <!-- Status Summary Badges -->
          <div class="flex items-center gap-2 text-xs">
            <span class="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              ✅ {{ confirmedCount }} Confirmed Trails
            </span>
            <span class="px-3 py-1.5 rounded-xl bg-[var(--background)] border border-[var(--border)] font-semibold">
              🏔️ {{ trails.length }} Total Routes
            </span>
          </div>
        </div>

        <!-- Filter Row 1: Region & Status -->
        <div class="flex flex-wrap items-center gap-2 mb-3">
          <span class="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Region:</span>
          <button
            v-for="r in [
              { id: 'all', label: 'All Regions' },
              { id: 'ni', label: 'Northern Ireland' },
              { id: 'galway', label: 'Galway / Connemara' },
              { id: 'kerry', label: 'Kerry / Killarney' },
              { id: 'dublin', label: 'Dublin / Boyne' }
            ]"
            :key="r.id"
            @click="regionFilter = r.id"
            :class="[
              'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
              regionFilter === r.id
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'bg-[var(--card-hover)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            ]"
          >
            {{ r.label }}
          </button>
        </div>

        <!-- Filter Row 2: Status & Difficulty -->
        <div class="flex flex-wrap items-center gap-2 mb-4">
          <span class="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Status:</span>
          <button
            v-for="st in [
              { id: 'all', label: 'All Statuses' },
              { id: 'Confirmed', label: '✅ Confirmed' },
              { id: 'Planned', label: '📍 Planned' },
              { id: 'Optional', label: '💡 Optional' }
            ]"
            :key="st.id"
            @click="statusFilter = st.id"
            :class="[
              'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
              statusFilter === st.id
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'bg-[var(--card-hover)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            ]"
          >
            {{ st.label }}
          </button>

          <span class="mx-1 text-[var(--border)]">|</span>

          <span class="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Difficulty:</span>
          <button
            v-for="diff in [
              { id: 'all', label: 'All' },
              { id: 'Easy', label: 'Easy' },
              { id: 'Moderate', label: 'Moderate' },
              { id: 'Strenuous', label: 'Strenuous' }
            ]"
            :key="diff.id"
            @click="difficultyFilter = diff.id"
            :class="[
              'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
              difficultyFilter === diff.id
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'bg-[var(--card-hover)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            ]"
          >
            {{ diff.label }}
          </button>
        </div>

        <!-- Search Bar -->
        <div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="🔍 Search trails by name, terrain, highlights (e.g. 'Diamond Hill', 'Cliffs', 'Waterfall', 'Basalt')..."
            class="w-full sm:max-w-md px-3.5 py-2 text-sm rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)]"
          />
        </div>
      </div>

      <!-- Trails Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div
          v-for="trail in filteredTrails"
          :key="trail.name"
          class="card p-5 space-y-4 hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
          :class="trail.status === 'Confirmed' ? 'ring-1 ring-emerald-500/30' : ''"
        >
          <div class="space-y-3">
            <!-- Header: Trail Name & Status -->
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="font-extrabold text-base text-[var(--foreground)] leading-snug">{{ trail.name }}</h3>
                <div class="text-xs text-[var(--muted-foreground)] flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span>📍 {{ trail.regionName }}</span>
                  <span>·</span>
                  <span>🏠 {{ trail.base }}</span>
                </div>
              </div>
              <span :class="['px-2.5 py-1 rounded-full text-xs whitespace-nowrap border', getStatusBadge(trail.status).class]">
                {{ getStatusBadge(trail.status).label }}
              </span>
            </div>

            <!-- Stats Bar (Distance, Elev, Duration, Difficulty) -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div class="p-2 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                <div class="text-[10px] text-[var(--muted-foreground)]">Distance</div>
                <div class="font-mono font-bold text-[var(--foreground)]">{{ trail.distance }}</div>
              </div>
              <div class="p-2 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                <div class="text-[10px] text-[var(--muted-foreground)]">Elevation</div>
                <div class="font-mono font-bold text-emerald-400">{{ trail.elevGain }}</div>
              </div>
              <div class="p-2 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                <div class="text-[10px] text-[var(--muted-foreground)]">Duration</div>
                <div class="font-mono font-bold text-blue-400">{{ trail.duration }}</div>
              </div>
              <div class="p-2 rounded-lg bg-[var(--background)] border border-[var(--border)] flex flex-col justify-center">
                <div class="text-[10px] text-[var(--muted-foreground)]">Difficulty</div>
                <span :class="['px-1.5 py-0.5 rounded text-[11px] font-bold text-center mt-0.5 border', getDifficultyBadge(trail.difficulty)]">
                  {{ trail.difficulty }}
                </span>
              </div>
            </div>

            <!-- Trail Description & Highlights -->
            <p class="text-xs text-[var(--foreground)] leading-relaxed">
              <strong>✨ Highlights:</strong> {{ trail.highlights }}
            </p>

            <!-- Terrain Surface & Gear Info -->
            <div class="space-y-1.5 text-xs text-[var(--muted-foreground)] pt-2 border-t border-[var(--border)]">
              <div><strong>🪨 Surface:</strong> {{ trail.surface }}</div>
              <div><strong>🥾 Required Footwear & Gear:</strong> <span class="text-emerald-400 font-medium">{{ trail.gear }}</span></div>
            </div>
          </div>

          <!-- Weather / Safety Alert at Bottom -->
          <div v-if="trail.weatherAlert" class="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 font-medium flex items-center gap-2">
            <span>⚠️</span>
            <span>{{ trail.weatherAlert }}</span>
          </div>
        </div>
      </div>

      <div v-if="filteredTrails.length === 0" class="card p-8 text-center text-sm text-[var(--muted-foreground)]">
        No hiking trails match your search or filter criteria.
      </div>
    </div>
  `
};
