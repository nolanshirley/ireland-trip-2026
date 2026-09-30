// =============================================================
//  Component: Hiking & Nature Locations
//  (Mobile-First, 1-Tap Maps, Rain Backups & Deep Links)
// =============================================================

const HikingNature = {
  name: 'HikingNature',
  props: {
    trails: { type: Array, required: true },
    targetSearchQuery: { type: String, default: '' }
  },
  emits: ['switch-tab'],
  data() {
    return {
      searchQuery: '',
      regionFilter: 'all',
      statusFilter: 'all', // 'all', 'favorites', 'completed', 'Suggested', 'Planned', 'Optional'
      difficultyFilter: 'all', // 'all', 'Easy', 'Moderate', 'Strenuous'
      sortBy: 'itinerary', // 'itinerary', 'difficulty', 'elevation', 'duration', 'completion', 'name'
      userTrailData: {}, // { [trailId]: { completed: false, notes: '', favorite: false } }
      isMobileFiltersCollapsed: (typeof window !== 'undefined' && window.innerWidth < 768)
    };
  },
  watch: {
    targetSearchQuery: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          this.searchQuery = newVal;
          this.regionFilter = 'all';
          this.statusFilter = 'all';
          this.difficultyFilter = 'all';
        }
      }
    }
  },
  created() {
    this.loadUserTrailData();
  },
  computed: {
    completedCount() {
      return this.trails.filter(t => this.isCompleted(t)).length;
    },
    favoritesCount() {
      return this.trails.filter(t => this.isFavorite(t)).length;
    },
    filteredTrails() {
      const list = this.trails.filter(t => {
        // Region
        if (this.regionFilter !== 'all' && t.region !== this.regionFilter) return false;

        // Status
        if (this.statusFilter === 'favorites' && !this.isFavorite(t)) return false;
        if (this.statusFilter === 'completed' && !this.isCompleted(t)) return false;
        if (this.statusFilter !== 'all' && this.statusFilter !== 'favorites' && this.statusFilter !== 'completed' && t.status !== this.statusFilter) return false;

        // Difficulty
        if (this.difficultyFilter !== 'all' && !t.difficulty.toLowerCase().includes(this.difficultyFilter.toLowerCase())) return false;

        // Search
        if (!this.searchQuery.trim()) return true;
        const q = this.searchQuery.toLowerCase();
        const userNotes = this.getTrailNotes(t).toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.regionName.toLowerCase().includes(q) ||
          t.highlights.toLowerCase().includes(q) ||
          t.gear.toLowerCase().includes(q) ||
          t.base.toLowerCase().includes(q) ||
          (t.rainBackup && t.rainBackup.toLowerCase().includes(q)) ||
          userNotes.includes(q)
        );
      });

      return list.sort((a, b) => {
        if (this.sortBy === 'difficulty') {
          const diffScore = (d) => {
            const low = d.toLowerCase();
            if (low.includes('strenuous')) return 3;
            if (low.includes('moderate')) return 2;
            return 1;
          };
          return diffScore(b.difficulty) - diffScore(a.difficulty);
        }
        if (this.sortBy === 'elevation') {
          const parseElev = (e) => parseInt((e || '0').replace(/[^0-9]/g, '')) || 0;
          return parseElev(b.elevGain) - parseElev(a.elevGain);
        }
        if (this.sortBy === 'duration') {
          const parseDur = (d) => {
            const matches = (d || '').match(/([0-9.]+)/g);
            return matches ? parseFloat(matches[matches.length - 1]) : 0;
          };
          return parseDur(b.duration) - parseDur(a.duration);
        }
        if (this.sortBy === 'completion') {
          const aComp = this.isCompleted(a) ? 1 : 0;
          const bComp = this.isCompleted(b) ? 1 : 0;
          if (aComp !== bComp) return aComp - bComp; // Uncompleted first
        }
        if (this.sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        // Default: 'itinerary' (Day 1 -> Day 13)
        const aDay = a.dayNumber || 99;
        const bDay = b.dayNumber || 99;
        if (aDay !== bDay) return aDay - bDay;
        return (a.name || '').localeCompare(b.name || '');
      });
    },
    suggestedCount() {
      return this.trails.filter(t => t.status === 'Suggested' || t.status === 'Confirmed').length;
    }
  },
  methods: {
    loadUserTrailData() {
      try {
        const saved = localStorage.getItem('ireland_trail_user_data');
        if (saved) {
          this.userTrailData = JSON.parse(saved);
        }
      } catch (e) {
        console.error('Error loading user trail data', e);
      }
    },
    saveUserTrailData() {
      localStorage.setItem('ireland_trail_user_data', JSON.stringify(this.userTrailData));
    },
    ensureTrailData(trail) {
      const id = trail.id || trail.name;
      if (!this.userTrailData[id]) {
        this.userTrailData[id] = { completed: false, notes: '', favorite: false };
      }
      return id;
    },
    toggleCompleted(trail) {
      const id = this.ensureTrailData(trail);
      this.userTrailData[id].completed = !this.userTrailData[id].completed;
      this.userTrailData = { ...this.userTrailData };
      this.saveUserTrailData();
    },
    isCompleted(trail) {
      const id = trail.id || trail.name;
      return Boolean(this.userTrailData[id] && this.userTrailData[id].completed);
    },
    toggleFavorite(trail) {
      const id = this.ensureTrailData(trail);
      this.userTrailData[id].favorite = !this.userTrailData[id].favorite;
      this.userTrailData = { ...this.userTrailData };
      this.saveUserTrailData();
    },
    isFavorite(trail) {
      const id = trail.id || trail.name;
      return Boolean(this.userTrailData[id] && this.userTrailData[id].favorite);
    },
    saveTrailNotes(trail, text) {
      const id = this.ensureTrailData(trail);
      this.userTrailData[id].notes = text;
      this.userTrailData = { ...this.userTrailData };
      this.saveUserTrailData();
    },
    getTrailNotes(trail) {
      const id = trail.id || trail.name;
      return (this.userTrailData[id] && this.userTrailData[id].notes) || '';
    },
    getStatusBadge(status) {
      if (status === 'Suggested' || status === 'Confirmed') {
        return {
          label: '💡 Suggested on Itinerary',
          class: 'bg-emerald-200 dark:bg-emerald-300 text-emerald-950 border border-emerald-400 font-extrabold shadow-sm'
        };
      }
      if (status === 'Planned') {
        return {
          label: '📍 Planned Day Activity',
          class: 'bg-blue-200 dark:bg-blue-300 text-blue-950 border border-blue-400 font-extrabold shadow-sm'
        };
      }
      return {
        label: '🌱 Optional / Weather Permitting',
        class: 'bg-amber-200 dark:bg-amber-300 text-amber-950 border border-amber-400 font-extrabold shadow-sm'
      };
    },
    getDifficultyBadge(diff) {
      const d = diff.toLowerCase();
      if (d.includes('strenuous')) {
        return 'bg-red-200 dark:bg-red-300 text-red-950 border border-red-400 font-extrabold shadow-sm';
      }
      if (d.includes('moderate')) {
        return 'bg-amber-200 dark:bg-amber-300 text-amber-950 border border-amber-400 font-extrabold shadow-sm';
      }
      return 'bg-emerald-200 dark:bg-emerald-300 text-emerald-950 border border-emerald-400 font-extrabold shadow-sm';
    },
    openMap(query) {
      if (window.TravelApp && window.TravelApp.triggerMap) {
        window.TravelApp.triggerMap(query || 'Ireland');
      } else {
        const clean = (query || 'Ireland').replace(/\+/g, ' ');
        window.open(`https://maps.apple.com/?q=${encodeURIComponent(clean)}`, '_blank');
      }
    },
    openCalendar(trail) {
      if (window.TravelApp && window.TravelApp.triggerCalendar) {
        window.TravelApp.triggerCalendar({
          title: trail.name + ' Hike',
          day: trail.date || 'Oct 2',
          time: '9:30 AM',
          location: (trail.mapsQuery || trail.name) + ', ' + trail.regionName + ', Ireland',
          notes: `Distance: ${trail.distance} | Elevation: ${trail.elevGain} | Duration: ${trail.duration} | Gear: ${trail.gear} | Rain Backup: ${trail.rainBackup || 'N/A'}`
        });
      }
    },
    jumpToSchedule(trail) {
      this.$emit('switch-tab', {
        tab: 'planner',
        dayIndex: trail.dayIndex !== undefined ? trail.dayIndex : (trail.dayNumber ? trail.dayNumber - 1 : 0),
        dayNumber: trail.dayNumber,
        targetId: 'day-card-' + (trail.dayNumber || 1),
        trailId: trail.id
      });
    },
    openAddTrail() {
      if (window.TravelApp) {
        window.TravelApp.openCreator('trail');
      }
    },
    getVotes(id) {
      if (window.TravelApp) {
        return window.TravelApp.getItemVotes(id);
      }
      return { up: 0, down: 0, userVoted: null };
    },
    vote(id, type) {
      if (window.TravelApp) {
        window.TravelApp.voteItem(id, type);
        this.$forceUpdate();
      }
    },
    isVoted(id, type) {
      const v = this.getVotes(id);
      return v && v.userVoted === type;
    },
    deleteCustomTrail(id) {
      if (window.TravelApp) {
        window.TravelApp.deleteCustomItem('trail', id);
      }
    },
    resetAllFilters() {
      this.searchQuery = '';
      this.regionFilter = 'all';
      this.statusFilter = 'all';
      this.difficultyFilter = 'all';
      this.sortBy = 'itinerary';
    },
    removeTrail(trail) {
      if (!trail) return;
      const label = trail.name || 'this trail';
      if (!confirm(`Remove "${label}" from your trail guide? (You can restore it anytime in Settings/Notes)`)) return;
      if (trail.isCustom) {
        if (window.TravelApp && window.TravelApp.deleteCustomItem) {
          window.TravelApp.deleteCustomItem('trail', trail.id);
        }
      } else {
        const id = trail.id || trail.name;
        if (window.TravelApp && window.TravelApp.hideItem) {
          window.TravelApp.hideItem('trail', id);
        }
      }
    }
  },
  template: `
    <div class="space-y-6">
      <!-- Top Overview Header -->
      <div class="card p-4 sm:p-5">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-2xl">🥾</span>
              <h2 class="text-xl font-bold tracking-tight">Hiking & Nature Trails Guide</h2>
            </div>
            <p class="text-xs text-[var(--muted-foreground)] mt-0.5">
              Curated trail network across 4 regions with elevation gain, terrain, rain contingencies & 1-tap Google Maps directions.
            </p>
          </div>

          <!-- Status Summary Badges -->
          <div class="flex items-center gap-2 text-xs flex-wrap">
            <button
              @click="openAddTrail"
              class="px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--accent)] hover:opacity-90 text-white flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
            >
              <span>➕ Add Trail</span>
            </button>
            <span class="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-500/20 font-bold">
              💡 {{ suggestedCount }} Suggested Trails
            </span>
            <span class="px-3 py-1.5 rounded-xl bg-[var(--background)] border border-[var(--border)] font-semibold">
              🏔️ {{ trails.length }} Total Routes
            </span>
          </div>
        </div>

        <!-- Mobile Filter Toggle Button -->
        <div class="md:hidden mb-3">
          <button
            @click="isMobileFiltersCollapsed = !isMobileFiltersCollapsed"
            class="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[var(--background)] hover:bg-[var(--card-hover)] text-[var(--foreground)] border border-[var(--border)] flex items-center justify-between shadow-sm transition-all"
          >
            <span class="flex items-center gap-1.5">
              <span>⚙️</span>
              <span>Filter & Sort Trails</span>
              <span v-if="regionFilter !== 'all' || statusFilter !== 'all' || difficultyFilter !== 'all' || searchQuery.trim()" class="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--accent)] text-white font-bold">Active</span>
            </span>
            <span>{{ isMobileFiltersCollapsed ? '▼ Show Filters' : '▲ Hide Filters' }}</span>
          </button>
        </div>

        <!-- Filter Controls (Collapsible on Mobile) -->
        <div :class="{'hidden md:block': isMobileFiltersCollapsed}" class="space-y-3">
          <!-- Filter Row 1: Region -->
          <div class="flex flex-wrap items-center gap-2">
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
                { id: 'favorites', label: '❤️ Favorites (' + favoritesCount + ')' },
                { id: 'completed', label: '✅ Completed (' + completedCount + '/' + trails.length + ')' },
                { id: 'Suggested', label: '💡 Suggested' },
                { id: 'Planned', label: '📍 Planned' },
                { id: 'Optional', label: '🌱 Optional' }
              ]"
              :key="st.id"
              @click="statusFilter = st.id"
              :class="[
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                statusFilter === st.id
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'bg-[var(--card-hover)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
                st.id === 'favorites' && statusFilter !== 'favorites' ? 'text-rose-700 dark:text-rose-400 border border-rose-500/30' : '',
                st.id === 'completed' && statusFilter !== 'completed' ? 'text-emerald-800 dark:text-emerald-400 border border-emerald-500/30' : ''
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

          <!-- Filter Row 3: Sort By Controls -->
          <div class="flex items-center gap-2 flex-wrap mb-4 pt-3 border-t border-[var(--border)]">
            <span class="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Sort By:</span>
            <button
              v-for="s in [
                { id: 'itinerary', label: '🗓️ Route Sequence (Day 1→13)' },
                { id: 'difficulty', label: '🔴 Difficulty (Strenuous First)' },
                { id: 'elevation', label: '⛰️ Elevation Gain' },
                { id: 'duration', label: '⏱️ Longest Duration' },
                { id: 'completion', label: '⏳ To Hike First' },
                { id: 'name', label: '🔤 A–Z' }
              ]"
              :key="s.id"
              @click="sortBy = s.id"
              :class="[
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border',
                sortBy === s.id
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                  : 'bg-[var(--card)] hover:bg-[var(--card-hover)] text-[var(--muted-foreground)] border-[var(--border)]'
              ]"
            >
              {{ s.label }}
            </button>
          </div>

          <!-- Search Bar & Active Reset -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[var(--border)]">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="🔍 Search trails by name, terrain, highlights (e.g. 'Diamond Hill', 'Cliffs', 'Waterfall', 'Basalt')..."
              class="w-full sm:max-w-md px-3.5 py-2 text-sm rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)]"
            />
            <button
              v-if="regionFilter !== 'all' || statusFilter !== 'all' || difficultyFilter !== 'all' || sortBy !== 'itinerary' || searchQuery.trim()"
              @click="resetAllFilters"
              class="text-xs text-rose-700 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 font-semibold self-start sm:self-auto"
            >
              ✕ Reset All Filters
            </button>
          </div>
        </div>
      </div>

      <!-- Active Search Filter Banner -->
      <div
        v-if="searchQuery.trim()"
        class="p-3 rounded-xl bg-[var(--card)] border border-[var(--accent)] flex items-center justify-between text-xs animate-fadeIn"
      >
        <div class="flex items-center gap-2">
          <span class="text-base">🔍</span>
          <span>Showing results for <strong class="text-[var(--accent)]">"{{ searchQuery }}"</strong> ({{ filteredTrails.length }} {{ filteredTrails.length === 1 ? 'trail' : 'trails' }} found)</span>
        </div>
        <button
          @click="searchQuery = ''"
          class="px-2.5 py-1 rounded-lg bg-[var(--card-hover)] hover:bg-[var(--border)] text-[var(--foreground)] font-bold text-xs"
        >
          Clear ✕
        </button>
      </div>

      <!-- Trails Grid -->
      <div v-if="filteredTrails.length > 0" class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div
          v-for="trail in filteredTrails"
          :key="trail.name"
          :id="'trail-' + trail.id"
          class="card p-5 space-y-4 hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
          :class="[
            isCompleted(trail)
              ? 'ring-2 ring-emerald-500/60 bg-emerald-500/[0.03]'
              : (isFavorite(trail) ? 'ring-1 ring-rose-500/50 bg-rose-500/[0.02]' : (trail.status === 'Suggested' || trail.status === 'Confirmed' ? 'ring-1 ring-emerald-500/30' : ''))
          ]"
        >
          <div class="space-y-3">
            <!-- Header: Trail Name, 1-Tap Maps & Status -->
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-1.5">
                <button
                  @click.stop="toggleFavorite(trail)"
                  class="text-base transition-transform active:scale-125 hover:scale-110 mt-0.5"
                  :title="isFavorite(trail) ? 'Remove from favorites' : 'Add to favorites'"
                >
                  {{ isFavorite(trail) ? '❤️' : '🤍' }}
                </button>
                <div>
                  <h3 class="font-extrabold text-base text-[var(--foreground)] leading-snug">{{ trail.name }}</h3>
                  <div class="text-xs text-[var(--muted-foreground)] flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span>📍 {{ trail.regionName }}</span>
                    <span>·</span>
                    <span>🏠 {{ trail.base }}</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-1.5 flex-wrap justify-end">
                <!-- Consensus Status Badge if custom -->
                <span v-if="trail.status === 'confirmed'" class="consensus-badge-confirmed">
                  🟢 Confirmed
                </span>
                <span v-else-if="trail.status === 'proposed'" class="consensus-badge-proposed">
                  🟡 Proposed
                </span>
                <!-- Voting buttons -->
                <button
                  @click.stop="vote(trail.id || trail.name, 'up')"
                  :class="['vote-btn', isVoted(trail.id || trail.name, 'up') ? 'active-up' : '']"
                  title="Upvote this trail"
                >
                  👍 {{ getVotes(trail.id || trail.name).up }}
                </button>
                <button
                  @click.stop="vote(trail.id || trail.name, 'down')"
                  :class="['vote-btn', isVoted(trail.id || trail.name, 'down') ? 'active-down' : '']"
                  title="Downvote this trail"
                >
                  👎 {{ getVotes(trail.id || trail.name).down }}
                </button>
                <!-- Delete/Remove trail button -->
                <button
                  @click.stop="removeTrail(trail)"
                  class="text-[11px] text-rose-700 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 font-bold px-1 transition-transform hover:scale-110"
                  :title="trail.isCustom ? 'Delete this custom trail' : 'Remove trail from guide (can be restored anytime)'"
                >
                  🗑️
                </button>
                <button
                  @click.stop="toggleCompleted(trail)"
                  :class="[
                    'px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 border',
                    isCompleted(trail)
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                      : 'bg-[var(--card)] hover:bg-[var(--card-hover)] text-[var(--muted-foreground)] border-[var(--border)]'
                  ]"
                  :title="isCompleted(trail) ? 'Mark as not completed' : 'Mark as hiked/completed'"
                >
                  <span>{{ isCompleted(trail) ? '✓ Hiked' : '○ To Hike' }}</span>
                </button>
                <button
                  v-if="trail.mapsQuery"
                  @click.stop="openMap(trail.mapsQuery)"
                  class="maps-btn text-xs py-1 px-2.5"
                  title="Open Trailhead in Apple Maps or Google Maps"
                >
                  <span>📍 Map</span>
                </button>
                <button
                  @click.stop="openCalendar(trail)"
                  class="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-200 dark:bg-purple-300 text-purple-950 border border-purple-400 shadow-sm hover:opacity-90 transition-all flex items-center gap-1"
                  title="Add this hike to Apple / Google Calendar"
                >
                  <span>📅 Cal</span>
                </button>
                <span :class="['px-2.5 py-1 rounded-full text-xs whitespace-nowrap border', getStatusBadge(trail.status).class]">
                  {{ getStatusBadge(trail.status).label }}
                </span>
              </div>
            </div>

            <!-- Stats Bar (Distance, Elev, Duration, Difficulty) -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div class="p-2 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                <div class="text-[10px] text-[var(--muted-foreground)]">Distance</div>
                <div class="font-mono font-bold text-[var(--foreground)]">{{ trail.distance }}</div>
              </div>
              <div class="p-2 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                <div class="text-[10px] text-[var(--muted-foreground)]">Elevation</div>
                <div class="font-mono font-bold text-emerald-800 dark:text-emerald-400">{{ trail.elevGain }}</div>
              </div>
              <div class="p-2 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                <div class="text-[10px] text-[var(--muted-foreground)]">Duration</div>
                <div class="font-mono font-bold text-blue-800 dark:text-blue-400">{{ trail.duration }}</div>
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
              <div><strong>🥾 Required Footwear & Gear:</strong> <span class="text-emerald-800 dark:text-emerald-400 font-medium">{{ trail.gear }}</span></div>
            </div>

            <!-- Rain Backup Callout -->
            <div v-if="trail.rainBackup" class="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-200/95 border border-amber-400 text-xs text-amber-950 font-bold shadow-sm">
              <strong>🌧️ Rainy Day Contingency:</strong> {{ trail.rainBackup }}
            </div>

            <!-- Split Option Callout -->
            <div v-if="trail.splitOption" class="text-xs text-[var(--muted-foreground)] italic">
              👥 <strong>Group Split Option:</strong> {{ trail.splitOption }}
            </div>

            <!-- Field Notes (Saved Offline) -->
            <div class="pt-2 border-t border-[var(--border)]/60">
              <input
                :value="getTrailNotes(trail)"
                @input="saveTrailNotes(trail, $event.target.value)"
                type="text"
                placeholder="📝 Field notes (e.g. Trailhead gate code, scenic viewpoint spot, photo notes)..."
                class="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none"
              />
            </div>
          </div>

          <!-- Bottom Actions / Alerts -->
          <div class="space-y-2 pt-2 border-t border-[var(--border)]/50">
            <div v-if="trail.weatherAlert" class="p-2 rounded-lg bg-red-100 dark:bg-red-200/95 border border-red-400 text-xs text-red-950 font-extrabold flex items-center gap-2 shadow-sm">
              <span>⚠️</span>
              <span>{{ trail.weatherAlert }}</span>
            </div>
            <div class="flex items-center justify-between text-xs pt-1 flex-wrap gap-2">
              <span class="text-[var(--muted-foreground)]">
                📅 Suggested for <strong>Day {{ trail.dayNumber }} ({{ trail.date }})</strong>
              </span>
              <button
                @click="jumpToSchedule(trail)"
                class="px-3 py-1.5 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] hover:bg-[var(--accent)]/25 border border-[var(--accent)]/30 font-bold flex items-center gap-1.5 transition-all text-xs"
                :title="'Open Day ' + trail.dayNumber + ' in schedule'"
              >
                <span>📅 View on Day {{ trail.dayNumber }} Schedule →</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="card p-8 text-center space-y-3">
        <span class="text-3xl">🥾</span>
        <h4 class="font-bold text-sm text-[var(--foreground)]">No hiking trails match your search or filter criteria</h4>
        <p class="text-xs text-[var(--muted-foreground)]">Try clearing active search keywords, region filters, or status selections.</p>
        <div class="pt-2">
          <button
            @click="resetAllFilters"
            class="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] hover:opacity-90 text-white shadow-sm transition-all"
          >
            Show All {{ trails.length }} Trails
          </button>
        </div>
      </div>
    </div>
  `
};

