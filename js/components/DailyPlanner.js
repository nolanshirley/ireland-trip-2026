// =============================================================
//  Component: Daily Planner & Hourly Calendar Time-Block View
//  (Mobile-First, Deep Interlinking, Maps & Rain Backups)
// =============================================================

const DailyPlanner = {
  name: 'DailyPlanner',
  props: {
    timeline: { type: Array, required: true },
    trails: { type: Array, default: () => [] },
    restaurants: { type: Array, default: () => [] },
    targetDayIndex: { type: Number, default: null }
  },
  emits: ['open-detail', 'switch-tab'],
  data() {
    return {
      expandedDays: {},
      viewMode: 'calendar', // 'calendar' (Hourly) or 'agenda' (Step-by-step list)
      activeBaseCampFilter: 'all', // 'all', 'ni', 'galway', 'kerry', 'dublin', 'birthdays', 'transfers'
      activeTypeFilter: 'all', // 'all', 'reserved', 'drive', 'dining', 'housing', 'sight'
      activeEnergyFilter: 'all', // 'all', 'chill', 'moderate', 'strenuous'
      searchQuery: '',
      activeDayFilter: null,
      dayStartHour: 6, // 6:00 AM
      dayEndHour: 24, // 12:00 AM (Midnight)
      showRainBackups: {}, // Toggle state per day
      globalRainMode: false, // Global master switch
      dailyNotes: {}, // { [dayIndex]: string }
      savingNoteDay: null
    };
  },
  created() {
    // Days start collapsed by default unless targetDayIndex is set
    this.expandedDays = {};
    if (this.targetDayIndex !== null && this.targetDayIndex !== undefined) {
      this.expandedDays[this.targetDayIndex] = true;
    }
    this.showRainBackups = {};
    this.loadDailyNotes();
  },
  watch: {
    targetDayIndex: {
      immediate: true,
      handler(newVal) {
        if (newVal !== null && newVal !== undefined) {
          this.expandedDays[newVal] = true;
          this.activeDayFilter = null;
        }
      }
    }
  },
  computed: {
    hoursScale() {
      const hours = [];
      for (let h = this.dayStartHour; h < this.dayEndHour; h++) {
        hours.push(h);
      }
      return hours;
    },
    filteredDays() {
      return this.timeline.filter((day, idx) => {
        if (this.activeDayFilter !== null && idx !== this.activeDayFilter) {
          return false;
        }
        if (this.activeBaseCampFilter === 'birthdays' && !day.special) {
          return false;
        }
        if (this.activeBaseCampFilter === 'transfers' && !day.isTransfer) {
          return false;
        }
        if (this.activeBaseCampFilter !== 'all' && this.activeBaseCampFilter !== 'birthdays' && this.activeBaseCampFilter !== 'transfers') {
          if (day.region !== this.activeBaseCampFilter) return false;
        }
        if (!this.searchQuery.trim() && this.activeTypeFilter === 'all' && this.activeEnergyFilter === 'all') return true;

        const q = this.searchQuery.toLowerCase();
        return day.items.some(item => {
          // Type filter
          const matchesType = this.activeTypeFilter === 'all' ||
            (this.activeTypeFilter === 'reserved' && (item.reserved || item.anchor)) ||
            (this.activeTypeFilter === 'drive' && item.type === 'drive') ||
            (this.activeTypeFilter === 'dining' && item.type === 'dining') ||
            (this.activeTypeFilter === 'housing' && item.type === 'housing') ||
            (this.activeTypeFilter === 'sight' && item.type === 'sight');

          if (!matchesType) return false;

          // Energy filter
          if (this.activeEnergyFilter !== 'all' && item.energyLevel !== this.activeEnergyFilter) return false;

          // Search query
          if (!this.searchQuery.trim()) return true;
          return (
            item.activity.toLowerCase().includes(q) ||
            item.time.toLowerCase().includes(q) ||
            (item.desc && item.desc.toLowerCase().includes(q)) ||
            (item.tag && item.tag.toLowerCase().includes(q)) ||
            (item.rainBackup && item.rainBackup.toLowerCase().includes(q)) ||
            (item.splitOption && item.splitOption.toLowerCase().includes(q)) ||
            day.title.toLowerCase().includes(q) ||
            day.base.toLowerCase().includes(q)
          );
        });
      });
    }
  },
  methods: {
    setBaseCampFilter(campId) {
      this.activeBaseCampFilter = campId;
      this.activeDayFilter = null;
      if (campId !== 'all') {
        this.timeline.forEach((day, idx) => {
          if (
            (campId === 'birthdays' && day.special) ||
            (campId === 'transfers' && day.isTransfer) ||
            (day.region === campId)
          ) {
            this.expandedDays[idx] = true;
          }
        });
      }
    },
    toggleDay(idx) {
      this.expandedDays[idx] = !this.expandedDays[idx];
    },
    expandAll() {
      this.timeline.forEach((_, idx) => {
        this.expandedDays[idx] = true;
      });
    },
    collapseAll() {
      this.expandedDays = {};
    },
    filterDay(idx) {
      if (this.activeDayFilter === idx) {
        this.activeDayFilter = null;
      } else {
        this.activeDayFilter = idx;
        this.expandedDays[idx] = true;
      }
    },
    isRainActive(idx) {
      return this.globalRainMode || !!this.showRainBackups[idx];
    },
    toggleDayRainBackup(idx) {
      this.showRainBackups[idx] = !this.isRainActive(idx);
    },
    toggleGlobalRainMode() {
      this.globalRainMode = !this.globalRainMode;
      this.timeline.forEach((_, idx) => {
        this.showRainBackups[idx] = this.globalRainMode;
      });
    },
    formatHour(h) {
      if (h === 0 || h === 24) return '12 AM';
      if (h === 12) return '12 PM';
      if (h < 12) return `${h} AM`;
      return `${h - 12} PM`;
    },
    getRibbonBlockStyle(item) {
      const totalSpan = this.dayEndHour - this.dayStartHour; // 18 hours
      const start = Math.max(this.dayStartHour, item.startHour || this.dayStartHour);
      const end = Math.min(this.dayEndHour, item.endHour || (start + 1));
      const leftPercent = ((start - this.dayStartHour) / totalSpan) * 100;
      const widthPercent = Math.max(3.0, ((end - start) / totalSpan) * 100);

      return {
        left: `${leftPercent}%`,
        width: `${widthPercent}%`
      };
    },
    getBlockColorClass(item) {
      if (item.reserved) return 'block-reserved';
      if (item.anchor) return 'block-anchor';
      if (item.type === 'drive') return 'block-drive';
      if (item.type === 'dining') return 'block-dining';
      if (item.type === 'housing') return 'block-housing';
      if (item.type === 'sight') return 'block-sight';
      return 'block-free';
    },
    getEnergyBadge(energy) {
      switch (energy) {
        case 'strenuous':
          return { label: '🔴 Strenuous Hike', class: 'energy-strenuous' };
        case 'moderate':
          return { label: '🟡 Moderate Walk', class: 'energy-moderate' };
        case 'chill':
        default:
          return { label: '🟢 Chill / Accessible', class: 'energy-chill' };
      }
    },
    getItemsInHour(day, hour) {
      return day.items.filter(item => {
        const start = item.startHour || this.dayStartHour;
        const end = item.endHour || (start + 1);
        return hour >= Math.floor(start) && hour < Math.ceil(end);
      });
    },
    isFirstHourOfItem(item, hour) {
      const start = item.startHour || this.dayStartHour;
      return hour === Math.floor(start);
    },
    getBudgetColor(hours) {
      if (hours <= 2.5) return 'bg-emerald-500';
      if (hours <= 4.0) return 'bg-amber-500';
      return 'bg-rose-500';
    },
    getBudgetPercent(hours) {
      return Math.min(100, (hours / 6.0) * 100);
    },
    getReservedCount(day) {
      return day.items.filter(i => i.reserved || i.anchor).length;
    },
    hasRainBackups(day) {
      return day.items.some(i => i.rainBackup);
    },
    getGoogleMapsUrl(query) {
      if (!query) return '#';
      const clean = query.replace(/\+/g, ' ');
      return `https://maps.apple.com/?q=${encodeURIComponent(clean)}`;
    },
    getAppleMapsUrl(query) {
      if (!query) return '#';
      const clean = query.replace(/\+/g, ' ');
      return `https://maps.apple.com/?q=${encodeURIComponent(clean)}`;
    },
    onItemClick(item, day) {
      this.$emit('open-detail', { item, day });
    },
    jumpToTrail(trailId) {
      this.$emit('switch-tab', { tab: 'hiking', targetId: trailId });
    },
    jumpToRestaurant(restaurantId) {
      this.$emit('switch-tab', { tab: 'restaurants', targetId: restaurantId });
    },
    loadDailyNotes() {
      try {
        const saved = localStorage.getItem('ireland_daily_notes');
        if (saved) {
          this.dailyNotes = JSON.parse(saved);
        }
      } catch (e) {
        console.error('Error loading daily notes', e);
      }
    },
    saveDailyNote(idx, text) {
      this.dailyNotes = { ...this.dailyNotes, [idx]: text };
      localStorage.setItem('ireland_daily_notes', JSON.stringify(this.dailyNotes));
      this.savingNoteDay = idx;
      setTimeout(() => {
        if (this.savingNoteDay === idx) {
          this.savingNoteDay = null;
        }
      }, 1200);
    },
    hasNote(idx) {
      return Boolean(this.dailyNotes && this.dailyNotes[idx] && this.dailyNotes[idx].trim().length > 0);
    },
    clearDailyNote(idx) {
      if (confirm('Clear note for Day ' + (idx + 1) + '?')) {
        const copy = { ...this.dailyNotes };
        delete copy[idx];
        this.dailyNotes = copy;
        localStorage.setItem('ireland_daily_notes', JSON.stringify(this.dailyNotes));
      }
    },
    isNorthernIreland(dayNumber) {
      return dayNumber <= 4;
    },
    getDayTrails(dayNumber) {
      if (!this.trails) return [];
      return this.trails.filter(t => t.dayNumber === dayNumber);
    },
    getDayRestaurants(dayNumber) {
      if (!this.restaurants) return [];
      if (dayNumber === 6) {
        return this.restaurants.filter(r => r.name.includes('Ruibin') || r.name.includes('Dough Bros') || r.name.includes('Moran'));
      }
      if (dayNumber === 12) {
        return this.restaurants.filter(r => r.name.includes('Mister S') || r.name.includes('Fade Street'));
      }
      if (dayNumber === 1) {
        return this.restaurants.filter(r => r.name.includes('Mourne Seafood'));
      }
      if (dayNumber === 3) {
        return this.restaurants.filter(r => r.name.includes('Harry\'s Shack'));
      }
      if (dayNumber === 4) {
        return this.restaurants.filter(r => r.name.includes('Holohans'));
      }
      if (dayNumber === 8) {
        return this.restaurants.filter(r => r.name.includes('Mad Monk') || r.name.includes('Bricín'));
      }
      return [];
    }
  },
  template: `
    <div class="space-y-6">

      <!-- Top Controls & Mobile View Selector -->
      <div class="card p-4 sm:p-5">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 class="text-xl font-bold tracking-tight">📅 Daily Itinerary & Time-Blocks</h2>
            <p class="text-sm text-[var(--muted-foreground)]">
              Interactive 18-hour ribbon, suggested timeline & one-tap mobile navigation
            </p>
          </div>

          <!-- View Mode & Expansion & Rain Mode Controls -->
          <div class="flex items-center gap-2 flex-wrap">
            <!-- Global Rainy Day Mode Switcher -->
            <button
              @click="toggleGlobalRainMode"
              :class="[
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm',
                globalRainMode
                  ? 'bg-amber-500 text-slate-950 border-amber-400 ring-2 ring-amber-400/40 font-extrabold'
                  : 'bg-[var(--card)] hover:bg-[var(--card-hover)] text-amber-400 border-amber-500/40'
              ]"
              title="Toggle Rain Contingency Plans for all 13 days"
            >
              <span>🌧️</span>
              <span>{{ globalRainMode ? '🌧️ Rain Mode: ON (All Days)' : '🌧️ Rainy Day Mode' }}</span>
            </button>

            <!-- View Mode Switcher -->
            <div class="flex items-center bg-[var(--background)] p-1 rounded-xl border border-[var(--border)]">
              <button
                @click="viewMode = 'calendar'"
                :class="[
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                  viewMode === 'calendar'
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                ]"
              >
                <span>📊</span>
                <span>Hour Grid</span>
              </button>
              <button
                @click="viewMode = 'agenda'"
                :class="[
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                  viewMode === 'agenda'
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                ]"
              >
                <span>📋</span>
                <span>Agenda List</span>
              </button>
            </div>

            <!-- Expand / Collapse All -->
            <div class="flex items-center gap-1">
              <button
                @click="expandAll"
                class="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--card-hover)] hover:bg-[var(--border)] text-[var(--foreground)] transition-colors"
                title="Expand all days"
              >
                Expand All
              </button>
              <button
                @click="collapseAll"
                class="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--card-hover)] hover:bg-[var(--border)] text-[var(--foreground)] transition-colors"
                title="Collapse all days"
              >
                Collapse All
              </button>
            </div>
          </div>
        </div>

        <!-- Color Legend Ribbon -->
        <div class="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs mb-4">
          <span class="font-bold text-[var(--foreground)] text-[11px] uppercase tracking-wider">Time Block Key:</span>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded block-reserved"></span>
            <span class="font-semibold text-rose-400">💡 Suggested Schedule & Bookings</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded block-anchor"></span>
            <span class="font-semibold text-indigo-400">🌟 Key Anchor Events</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded block-drive"></span>
            <span class="text-blue-400">🚗 Car & Base Moves</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded block-dining"></span>
            <span class="text-amber-400">🍽️ Dining & Food</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded block-housing"></span>
            <span class="text-purple-400">🏡 Housing Windows</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded block-sight"></span>
            <span class="text-emerald-400">🌲 Sights & Nature</span>
          </div>
        </div>

        <!-- Filter Category Tabs (Type & Energy) -->
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <!-- Type Filter -->
          <div class="flex flex-wrap items-center gap-1.5">
            <button
              v-for="flt in [
                { id: 'all', label: 'All Activities' },
                { id: 'reserved', label: '💡 Suggested & Bookings' },
                { id: 'drive', label: '🚗 Driving & Transfers' },
                { id: 'dining', label: '🍽️ Dinners & Food' },
                { id: 'housing', label: '🏡 Housing Windows' },
                { id: 'sight', label: '🌲 Sights & Nature' }
              ]"
              :key="flt.id"
              @click="activeTypeFilter = flt.id"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeTypeFilter === flt.id
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'bg-[var(--card-hover)] hover:bg-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              ]"
            >
              {{ flt.label }}
            </button>
          </div>

          <!-- Energy Level Filter -->
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-bold uppercase text-[var(--muted-foreground)]">Pacing:</span>
            <button
              v-for="e in [
                { id: 'all', label: 'All' },
                { id: 'chill', label: '🟢 Chill' },
                { id: 'moderate', label: '🟡 Moderate' },
                { id: 'strenuous', label: '🔴 Strenuous' }
              ]"
              :key="e.id"
              @click="activeEnergyFilter = e.id"
              :class="[
                'px-2 py-1 rounded-md text-[11px] font-semibold transition-all',
                activeEnergyFilter === e.id
                  ? 'bg-[var(--foreground)] text-[var(--background)] shadow-sm'
                  : 'bg-[var(--card-hover)] text-[var(--muted-foreground)]'
              ]"
            >
              {{ e.label }}
            </button>
          </div>
        </div>

        <!-- Base Camp & Milestone Hub Filters -->
        <div class="space-y-2 mb-4 pt-3 border-t border-[var(--border)]">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Base Camp:</span>
            <button
              v-for="camp in [
                { id: 'all', label: 'All Bases (13 Days)' },
                { id: 'ni', label: '🏠 Belfast Base (D1–4)' },
                { id: 'galway', label: '🏠 Galway Base (D5–7)' },
                { id: 'kerry', label: '🏠 Killarney Base (D8–10)' },
                { id: 'dublin', label: '🏠 Navan / Dublin (D11–13)' },
                { id: 'birthdays', label: '🎂 Birthday Days' },
                { id: 'transfers', label: '🔄 Base Move Days' }
              ]"
              :key="camp.id"
              @click="setBaseCampFilter(camp.id)"
              :class="[
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border',
                activeBaseCampFilter === camp.id
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                  : 'bg-[var(--card)] hover:bg-[var(--card-hover)] text-[var(--muted-foreground)] border-[var(--border)]',
                camp.id === 'birthdays' && activeBaseCampFilter !== 'birthdays' ? 'text-pink-400 border-pink-500/30' : '',
                camp.id === 'transfers' && activeBaseCampFilter !== 'transfers' ? 'text-blue-400 border-blue-500/30' : ''
              ]"
            >
              {{ camp.label }}
            </button>
          </div>

          <!-- Day Selector Quick Jump -->
          <div class="flex flex-wrap items-center gap-1.5 pt-1">
            <span class="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mr-1">Day Jump:</span>
            <button
              @click="activeDayFilter = null"
              :class="[
                'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                activeDayFilter === null
                  ? 'bg-[var(--accent)] text-white shadow'
                  : 'bg-[var(--card-hover)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              ]"
            >
              All
            </button>
            <button
              v-for="(day, idx) in timeline"
              :key="idx"
              @click="filterDay(idx)"
              :class="[
                'px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1',
                activeDayFilter === idx
                  ? 'bg-[var(--accent)] text-white shadow'
                  : 'bg-[var(--card-hover)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
                day.special ? 'ring-1 ring-pink-500/60 font-bold text-pink-400' : ''
              ]"
            >
              <span>D{{ day.dayNumber }}</span>
              <span v-if="day.special">🎂</span>
              <span v-if="day.isTransfer && !day.special">🔄</span>
            </button>
          </div>
        </div>

        <!-- Search Input -->
        <div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="🔍 Search schedule (e.g. 'Mister S', 'Guinness', 'Rain backup', 'Diamond Hill', 'Belfast')..."
            class="w-full sm:max-w-md px-3.5 py-2 text-sm rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)]"
          />
        </div>
      </div>

      <!-- Day Cards Accordion List -->
      <div class="space-y-5">
        <div
          v-for="(day, idx) in filteredDays"
          :key="day.date"
          :id="'day-card-' + day.dayNumber"
          class="card overflow-hidden transition-all duration-200"
          :class="{
            'ring-2 ring-pink-500/60 bg-pink-500/[0.02]': day.special,
            'ring-1 ring-blue-500/40': day.isTransfer && !day.special
          }"
        >
          <!-- Day Accordion Header -->
          <div
            @click="toggleDay(idx)"
            class="p-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--card-hover)]/40 hover:bg-[var(--card-hover)] transition-colors select-none"
          >
            <div class="flex items-start sm:items-center gap-3">
              <span class="w-9 h-9 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] font-extrabold flex items-center justify-center text-sm flex-shrink-0">
                D{{ day.dayNumber }}
              </span>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-extrabold text-base text-[var(--foreground)]">{{ day.date }}: {{ day.title }}</span>
                  <span v-if="day.special" class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-pink-200 dark:bg-pink-300 text-pink-950 border border-pink-400 shadow-sm">
                    🎂 {{ day.specialText || 'BIRTHDAY CELEBRATION' }}
                  </span>
                  <span v-if="day.isTransfer" class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-200 dark:bg-blue-300 text-blue-950 border border-blue-400 shadow-sm">
                    🔄 BASE TRANSFER
                  </span>
                  <span v-if="getReservedCount(day) > 0" class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-200 dark:bg-amber-300 text-amber-950 border border-amber-400 shadow-sm">
                    💡 {{ getReservedCount(day) }} SUGGESTED / BOOKED
                  </span>
                  <span v-if="hasNote(idx)" class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-200 dark:bg-emerald-300 text-emerald-950 border border-emerald-400 shadow-sm flex items-center gap-1">
                    <span>📝</span>
                    <span>Note</span>
                  </span>
                  <!-- Currency / Region Badge -->
                  <span v-if="isNorthernIreland(day.dayNumber)" class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-200 dark:bg-blue-300 text-blue-950 border border-blue-400 shadow-sm">
                    🇬🇧 NI (£ GBP · MPH)
                  </span>
                  <span v-else class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-200 dark:bg-emerald-300 text-emerald-950 border border-emerald-400 shadow-sm">
                    🇮🇪 Republic (€ EUR · KM/H)
                  </span>
                </div>
                <div class="text-xs text-[var(--muted-foreground)] mt-1 flex items-center gap-2 flex-wrap">
                  <span>🏠 <strong>Base:</strong> {{ day.base }}</span>
                  <span>·</span>
                  <span>🛣️ <strong>Route:</strong> {{ day.route }}</span>
                  <span v-if="day.weather" class="px-2 py-0.5 rounded-md bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] font-semibold">
                    {{ day.weather }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Driving Gauge, Rain Button & Arrow -->
            <div class="flex items-center gap-3 self-end md:self-auto flex-wrap justify-end">
              <!-- Direct Day Rain Button in Header -->
              <button
                v-if="hasRainBackups(day)"
                @click.stop="toggleDayRainBackup(idx)"
                :class="[
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm',
                  isRainActive(idx)
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold ring-1 ring-amber-400'
                    : 'bg-[var(--card)] hover:bg-[var(--card-hover)] text-amber-400 border-amber-500/30'
                ]"
                title="Toggle Rain Contingency for this day"
              >
                <span>🌧️</span>
                <span>{{ isRainActive(idx) ? 'Rain Plan: ON' : 'Rain Backup' }}</span>
              </button>

              <div class="text-right">
                <div class="text-xs font-semibold text-[var(--foreground)] flex items-center justify-end gap-1.5">
                  <span>🚗 {{ day.driveHours }}h car time</span>
                  <span class="text-[10px] text-[var(--muted-foreground)]">/ 11h budget</span>
                </div>
                <div class="w-28 h-2 rounded-full bg-[var(--border)] overflow-hidden mt-1">
                  <div
                    class="h-full rounded-full transition-all"
                    :class="getBudgetColor(day.driveHours)"
                    :style="{ width: getBudgetPercent(day.driveHours) + '%' }"
                  ></div>
                </div>
              </div>

              <span class="text-lg text-[var(--muted-foreground)] font-mono transition-transform duration-200">
                {{ expandedDays[idx] ? '▲' : '▼' }}
              </span>
            </div>
          </div>

          <!-- Day Body -->
          <div v-show="expandedDays[idx]" class="p-4 pt-3 border-t border-[var(--border)] space-y-4">
            
            <!-- Day Quick Hub Snapshot (Trails & Dining Linkages) -->
            <div v-if="getDayTrails(day.dayNumber).length > 0 || getDayRestaurants(day.dayNumber).length > 0" class="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-between gap-3 flex-wrap text-xs">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-bold text-[var(--foreground)]">🌟 Day {{ day.dayNumber }} Highlights:</span>
                <!-- Trail links -->
                <button
                  v-for="t in getDayTrails(day.dayNumber)"
                  :key="t.id"
                  @click.stop="jumpToTrail(t.id)"
                  class="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all font-semibold flex items-center gap-1"
                >
                  <span>🥾</span>
                  <span>{{ t.name }} ({{ t.difficulty }})</span>
                </button>
                <!-- Restaurant links -->
                <button
                  v-for="rest in getDayRestaurants(day.dayNumber)"
                  :key="rest.id"
                  @click.stop="jumpToRestaurant(rest.id)"
                  class="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all font-semibold flex items-center gap-1"
                >
                  <span>🍴</span>
                  <span>{{ rest.name }}</span>
                </button>
              </div>
            </div>
            
            <!-- What to Wear & Weather Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-blue-500/[0.08] border border-blue-500/25 text-xs">
              <div class="flex items-center gap-2">
                <span class="text-base">👔</span>
                <div>
                  <strong class="font-bold text-[var(--foreground)]">Recommended Outfits & Gear:</strong>
                  <span class="text-[var(--foreground)] ml-1">{{ day.outfit }}</span>
                </div>
              </div>

              <!-- Rainy Day Contingency Toggle Inside Day -->
              <div v-if="hasRainBackups(day)" class="flex items-center gap-2 self-start sm:self-auto">
                <button
                  @click.stop="toggleDayRainBackup(idx)"
                  :class="[
                    'px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border',
                    isRainActive(idx)
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-sm'
                      : 'bg-[var(--card)] hover:bg-[var(--card-hover)] text-amber-400 border-amber-500/30'
                  ]"
                >
                  <span>🌧️</span>
                  <span>{{ isRainActive(idx) ? '☀️ Switch to Standard Plan' : '🌧️ View Rainy Day Backups' }}</span>
                </button>
              </div>
            </div>

            <!-- Rainy Day Contingency Callout Box (if toggled on) -->
            <div
              v-if="isRainActive(idx)"
              class="p-4 rounded-xl bg-amber-500/[0.12] border-2 border-amber-500/50 space-y-2 animate-fadeIn shadow-sm"
            >
              <div class="flex items-center justify-between gap-2 flex-wrap text-amber-400 font-bold text-sm">
                <div class="flex items-center gap-2">
                  <span class="text-lg">🌧️</span>
                  <h4>Active Rainy Day & High-Wind Contingency for Day {{ day.dayNumber }}:</h4>
                </div>
                <button
                  @click.stop="toggleDayRainBackup(idx)"
                  class="text-xs underline text-amber-300 hover:text-amber-200 font-semibold"
                >
                  Close Rain Plan ✕
                </button>
              </div>
              <ul class="text-xs text-[var(--foreground)] space-y-1.5 pl-5 list-disc">
                <li v-for="item in day.items.filter(i => i.rainBackup)" :key="item.activity">
                  <strong>{{ item.activity }}:</strong> {{ item.rainBackup }}
                </li>
              </ul>
            </div>

            <!-- 18-Hour Visual Ribbon Strip (06:00 to 24:00) -->
            <div>
              <div class="flex items-center justify-between text-[11px] text-[var(--muted-foreground)] font-mono mb-1 px-1">
                <span>6 AM</span>
                <span>9 AM</span>
                <span>12 PM</span>
                <span>3 PM</span>
                <span>6 PM</span>
                <span>9 PM</span>
                <span>12 AM</span>
              </div>

              <!-- Strip Graphic -->
              <div class="timeline-strip-container">
                <div
                  v-for="(item, iIdx) in day.items"
                  :key="iIdx"
                  @click="onItemClick(item, day)"
                  :class="['timeline-strip-block', getBlockColorClass(item)]"
                  :style="getRibbonBlockStyle(item)"
                  :title="item.time + ' — ' + item.activity + (item.desc ? ': ' + item.desc : '')"
                >
                  <span class="truncate">{{ item.activity }}</span>
                </div>
              </div>
            </div>

            <!-- MODE 1: Hourly Calendar View Grid -->
            <div v-if="viewMode === 'calendar'" class="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--background)]">
              <div class="divide-y divide-[var(--border)]">
                <div
                  v-for="hour in hoursScale"
                  :key="hour"
                  class="hour-calendar-row"
                >
                  <!-- Hour Label -->
                  <div class="hour-marker">
                    {{ formatHour(hour) }}
                  </div>

                  <!-- Events within this hour slot -->
                  <div class="hour-events-slot">
                    <div
                      v-for="(item, itIdx) in getItemsInHour(day, hour)"
                      :key="itIdx"
                      v-show="isFirstHourOfItem(item, hour)"
                      @click="onItemClick(item, day)"
                      :class="[
                        'p-2.5 rounded-lg border text-xs transition-all cursor-pointer hover:shadow-sm hover:scale-[1.005]',
                        item.reserved ? 'bg-amber-500/10 border-amber-500/30' : '',
                        item.anchor && !item.reserved ? 'bg-indigo-500/10 border-indigo-500/30' : '',
                        item.type === 'drive' ? 'bg-blue-500/10 border-blue-500/25' : '',
                        item.type === 'dining' && !item.reserved ? 'bg-amber-500/10 border-amber-500/25' : '',
                        item.type === 'housing' ? 'bg-purple-500/10 border-purple-500/25' : '',
                        item.type === 'sight' && !item.reserved && !item.anchor ? 'bg-emerald-500/10 border-emerald-500/25' : '',
                        item.type === 'free' ? 'bg-zinc-500/10 border-zinc-500/20 text-[var(--muted-foreground)]' : ''
                      ]"
                    >
                      <div class="flex items-start justify-between gap-2 flex-wrap">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)]">
                            {{ item.time }}
                          </span>
                          <span class="font-bold text-sm text-[var(--foreground)]">{{ item.activity }}</span>
                          
                          <!-- Energy Pacing Badge -->
                          <span v-if="item.energyLevel" :class="['energy-badge', getEnergyBadge(item.energyLevel).class]">
                            {{ getEnergyBadge(item.energyLevel).label }}
                          </span>
                        </div>

                        <!-- Action Badges & Map Button -->
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <span v-if="item.reserved" class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-200 dark:bg-amber-300 text-amber-950 border border-amber-400 shadow-sm">
                            💡 SUGGESTED ITINERARY
                          </span>
                          <span v-if="item.tag" class="px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wide bg-emerald-100 dark:bg-emerald-300 text-emerald-950 border border-emerald-400 shadow-sm">
                            {{ item.tag }}
                          </span>
                          <span v-if="item.note" class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-300 text-amber-950 border border-amber-400 shadow-sm">
                            ⏱️ {{ item.note }}
                          </span>
                          <!-- 1-Tap Apple Maps Button -->
                          <a
                            v-if="item.mapsQuery"
                            :href="getGoogleMapsUrl(item.mapsQuery)"
                            target="_blank"
                            @click.stop
                            class="maps-btn text-[10px] py-0.5 px-2"
                            title="Open in Apple Maps Navigation"
                          >
                            <span>📍 Map</span>
                          </a>
                        </div>
                      </div>

                      <!-- Description -->
                      <p v-if="item.desc" class="mt-1.5 text-[var(--muted-foreground)] leading-relaxed text-xs">
                        {{ item.desc }}
                      </p>

                      <!-- Rainy Day or Split Option previews -->
                      <div v-if="item.rainBackup && isRainActive(idx)" class="mt-2 p-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-[11px] text-amber-300">
                        <strong>🌧️ Rain Backup Plan:</strong> {{ item.rainBackup }}
                      </div>
                      <div v-else-if="item.rainBackup" class="mt-1.5">
                        <button
                          @click.stop="toggleDayRainBackup(idx)"
                          class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 transition-colors"
                        >
                          <span>🌧️ Rain Backup Available</span>
                        </button>
                      </div>
                      <div v-if="item.splitOption" class="mt-1 text-[11px] text-[var(--muted-foreground)] italic">
                        👥 <strong>Split Option:</strong> {{ item.splitOption }}
                      </div>

                      <!-- Quick Links to Hike / Dining Profile -->
                      <div class="mt-2 pt-2 border-t border-[var(--border)]/50 flex items-center gap-2 flex-wrap">
                        <button
                          v-if="item.trailId"
                          @click.stop="jumpToTrail(item.trailId)"
                          class="text-[11px] font-bold text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <span>🥾</span>
                          <span>View Full Hike Details →</span>
                        </button>
                        <button
                          v-if="item.restaurantId"
                          @click.stop="jumpToRestaurant(item.restaurantId)"
                          class="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1"
                        >
                          <span>🍴</span>
                          <span>View Dining Card & Policy →</span>
                        </button>
                      </div>
                    </div>

                    <!-- Empty state marker if nothing in hour -->
                    <div v-if="getItemsInHour(day, hour).length === 0" class="h-4"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- MODE 2: Agenda / Itinerary List View -->
            <div v-if="viewMode === 'agenda'" class="space-y-2.5">
              <div
                v-for="(item, sIdx) in day.items"
                :key="sIdx"
                @click="onItemClick(item, day)"
                class="flex flex-col sm:flex-row sm:items-start gap-3 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--card-hover)] transition-all cursor-pointer"
                :class="{
                  'border-amber-500/30 bg-amber-500/[0.02]': item.reserved,
                  'border-blue-500/25': item.type === 'drive',
                  'border-purple-500/25': item.type === 'housing'
                }"
              >
                <!-- Time Badge -->
                <div class="sm:w-36 flex-shrink-0 flex sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-1">
                  <span class="font-mono text-xs font-bold text-[var(--foreground)] px-2 py-1 rounded bg-[var(--card)] border border-[var(--border)] inline-block">
                    {{ item.time }}
                  </span>
                  <div class="text-[10px] text-[var(--muted-foreground)]">
                    ⏱️ {{ item.dur }}
                  </div>
                </div>

                <!-- Activity Details -->
                <div class="flex-1">
                  <div class="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-bold text-sm text-[var(--foreground)]">{{ item.activity }}</span>
                      <span v-if="item.energyLevel" :class="['energy-badge', getEnergyBadge(item.energyLevel).class]">
                        {{ getEnergyBadge(item.energyLevel).label }}
                      </span>
                    </div>

                    <div class="flex items-center gap-1.5">
                      <span v-if="item.reserved" class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        💡 SUGGESTED ITINERARY
                      </span>
                      <span v-if="item.tag" class="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--card-hover)] text-[var(--foreground)] border border-[var(--border)]">
                        {{ item.tag }}
                      </span>
                      <!-- 1-Tap Apple Maps Button -->
                      <a
                        v-if="item.mapsQuery"
                        :href="getGoogleMapsUrl(item.mapsQuery)"
                        target="_blank"
                        @click.stop
                        class="maps-btn text-[10px] py-0.5 px-2"
                        title="Open in Apple Maps"
                      >
                        <span>📍 Map</span>
                      </a>
                    </div>
                  </div>

                  <p v-if="item.desc" class="text-xs text-[var(--muted-foreground)] leading-relaxed">
                    {{ item.desc }}
                  </p>

                  <div v-if="item.rainBackup && isRainActive(idx)" class="mt-2 p-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-[11px] text-amber-300">
                    <strong>🌧️ Rain Backup Plan:</strong> {{ item.rainBackup }}
                  </div>
                  <div v-else-if="item.rainBackup" class="mt-1.5">
                    <button
                      @click.stop="toggleDayRainBackup(idx)"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 transition-colors"
                    >
                      <span>🌧️ Rain Backup Available</span>
                    </button>
                  </div>
                  <div v-if="item.splitOption" class="mt-1 text-[11px] text-[var(--muted-foreground)] italic">
                    👥 <strong>Split Option:</strong> {{ item.splitOption }}
                  </div>

                  <!-- Deep Links -->
                  <div class="mt-2 pt-2 border-t border-[var(--border)]/50 flex items-center gap-3">
                    <button
                      v-if="item.trailId"
                      @click.stop="jumpToTrail(item.trailId)"
                      class="text-[11px] font-bold text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>🥾</span>
                      <span>View Trail Profile →</span>
                    </button>
                    <button
                      v-if="item.restaurantId"
                      @click.stop="jumpToRestaurant(item.restaurantId)"
                      class="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <span>🍴</span>
                      <span>View Restaurant Card →</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Day Notes & Offline Journal Box -->
            <div class="mt-4 pt-3 border-t border-[var(--border)] bg-[var(--card)]/40 p-3.5 rounded-xl border border-[var(--border)]/60 space-y-2">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5 text-xs font-bold text-[var(--foreground)]">
                  <span>📝</span>
                  <span>Day {{ day.dayNumber }} Personal Notes & Journal</span>
                  <span v-if="hasNote(idx)" class="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/15 text-emerald-400 font-semibold">Saved Offline</span>
                </div>
                <div class="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
                  <span v-if="savingNoteDay === idx" class="text-emerald-400 font-bold animate-pulse">💾 Saved!</span>
                  <button
                    v-if="hasNote(idx)"
                    @click.stop="clearDailyNote(idx)"
                    class="text-rose-400 hover:text-rose-300 transition-colors"
                    title="Clear this day's note"
                  >
                    Clear Note
                  </button>
                </div>
              </div>
              <textarea
                :value="dailyNotes[idx] || ''"
                @input="saveDailyNote(idx, $event.target.value)"
                @click.stop
                placeholder="Jot down parking spot, gate codes, gas mileage, departure time adjustments, or daily memories..."
                rows="2"
                class="w-full text-xs p-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none leading-relaxed resize-y"
              ></textarea>
            </div>

          </div>
        </div>
      </div>

    </div>
  `
};
