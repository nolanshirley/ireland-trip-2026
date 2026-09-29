// =============================================================
//  Component: Daily Planner & Interactive Calendar Time-Block View
//  (Mobile-First, Interactive Day Scrubber, 1-Tap Maps & Rain Backups)
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
      plannerLayoutMode: 'day-calendar', // 'day-calendar' (Interactive Day View) or 'accordion' (All Days Accordion)
      activeCalendarDayIndex: 0,
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
      savingNoteDay: null,
      isMobileFiltersCollapsed: (typeof window !== 'undefined' && window.innerWidth < 768)
    };
  },
  created() {
    if (this.targetDayIndex !== null && this.targetDayIndex !== undefined) {
      this.activeCalendarDayIndex = this.targetDayIndex;
      this.expandedDays[this.targetDayIndex] = true;
    } else {
      this.activeCalendarDayIndex = 0;
      this.expandedDays[0] = true;
    }
    this.showRainBackups = {};
    this.loadDailyNotes();
  },
  watch: {
    targetDayIndex: {
      immediate: true,
      handler(newVal) {
        if (newVal !== null && newVal !== undefined) {
          this.activeCalendarDayIndex = newVal;
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
    activeDay() {
      return this.timeline[this.activeCalendarDayIndex] || this.timeline[0];
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
    selectCalendarDay(idx) {
      this.activeCalendarDayIndex = idx;
      this.expandedDays[idx] = true;
      this.$nextTick(() => {
        const el = document.getElementById('active-day-focus-card');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    },
    prevCalendarDay() {
      if (this.activeCalendarDayIndex > 0) {
        this.selectCalendarDay(this.activeCalendarDayIndex - 1);
      }
    },
    nextCalendarDay() {
      if (this.activeCalendarDayIndex < this.timeline.length - 1) {
        this.selectCalendarDay(this.activeCalendarDayIndex + 1);
      }
    },
    jumpToMilestone(dayNumber) {
      const idx = this.timeline.findIndex(d => d.dayNumber === dayNumber);
      if (idx !== -1) {
        this.selectCalendarDay(idx);
      }
    },
    getMilestoneBadge(day) {
      if (day.dayNumber === 6) return '🎂 Dad & Erin';
      if (day.dayNumber === 11) return '🍺 Guinness VIP';
      if (day.dayNumber === 12) return '🎂 Mom\'s Bday';
      if (day.dayNumber === 13) return '✈️ Departure';
      if (day.isTransfer) return '🔄 Base Move';
      return null;
    },
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
    getItemStartHour(item) {
      if (!item) return this.dayStartHour;
      if (item.time) {
        return parseTimeToHour(item.time);
      }
      if (item.startHour !== undefined && item.startHour !== null && !isNaN(Number(item.startHour))) {
        return Number(item.startHour);
      }
      return this.dayStartHour;
    },
    getItemEndHour(item) {
      if (!item) return this.dayStartHour + 1.5;
      const start = this.getItemStartHour(item);
      let dur = typeof item.durHours === 'number' && !isNaN(item.durHours) ? item.durHours : 1.5;
      if (item.dur && typeof item.dur === 'string') {
        const dMatch = item.dur.match(/([\d.]+)\s*hr/i);
        if (dMatch) dur = parseFloat(dMatch[1]);
      }
      return start + Math.max(0.5, dur);
    },
    getRibbonBlockStyle(item) {
      const totalSpan = this.dayEndHour - this.dayStartHour; // 18 hours
      const start = Math.max(this.dayStartHour, this.getItemStartHour(item));
      const end = Math.min(this.dayEndHour, this.getItemEndHour(item));
      const leftPercent = ((start - this.dayStartHour) / totalSpan) * 100;
      const widthPercent = Math.max(3.5, ((end - start) / totalSpan) * 100);

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
    getItemsStartingInHour(day, hour) {
      if (!day || !day.items) return [];
      return day.items.filter(item => {
        const start = this.getItemStartHour(item);
        return Math.floor(start) === hour;
      });
    },
    hasItemsInHour(day, hour) {
      return this.getItemsStartingInHour(day, hour).length > 0;
    },
    getItemsInHour(day, hour) {
      return this.getItemsStartingInHour(day, hour);
    },
    isFirstHourOfItem(item, hour) {
      const start = this.getItemStartHour(item);
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
    openMap(query) {
      if (!query) return;
      if (window.TravelApp) {
        window.TravelApp.triggerMap(query);
      } else {
        window.open(`https://maps.apple.com/?q=${encodeURIComponent(query.replace(/\+/g, ' '))}`, '_blank');
      }
    },
    openCalendar(item, day) {
      if (!item) return;
      const eventData = {
        title: item.activity || item.title || 'Ireland Trip Activity',
        day: (day && day.date) || item.date || 'Oct 2',
        time: item.time || '',
        notes: (item.desc || item.note || '') + (item.rainBackup ? ' | Rain Backup: ' + item.rainBackup : ''),
        location: item.mapsQuery || (day && day.base) || 'Ireland'
      };
      if (window.TravelApp) {
        window.TravelApp.triggerCalendar(eventData);
      }
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
    },
    openAddStop(dayIndex) {
      if (window.TravelApp) {
        window.TravelApp.openCreator('schedule', { dayIndex: dayIndex !== undefined ? dayIndex : this.activeCalendarDayIndex });
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
    deleteCustomStop(id) {
      if (window.TravelApp) {
        window.TravelApp.deleteCustomItem('schedule', id);
      }
    },
    isItemMandatory(item, day) {
      if (!item) return false;
      if (item.reserved || item.anchor || item.special) return true;
      if (item.tag === 'FLIGHT ARRIVAL' || item.tag === 'RETURN FLIGHT' || item.type === 'housing') return true;
      const act = (item.activity || item.title || '').toLowerCase();
      if (act.includes('mister s') || act.includes('birthday') || act.includes('double bday') || act.includes('bday')) return true;
      if (day && day.special && item.type === 'dining' && item.reserved) return true;
      return false;
    },
    removeItem(item, day) {
      if (!item) return;
      const label = item.activity || item.title || 'this stop';
      if (!confirm(`Remove "${label}" from your trip itinerary? (You can restore it anytime in Settings/Notes)`)) return;
      if (item.isCustom) {
        if (window.TravelApp && window.TravelApp.deleteCustomItem) {
          window.TravelApp.deleteCustomItem('schedule', item.id);
        }
      } else {
        const id = item.id || ('day' + (day ? day.dayNumber : 1) + '_' + (item.activity || item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '_'));
        if (window.TravelApp && window.TravelApp.hideItem) {
          window.TravelApp.hideItem('schedule', id);
        }
      }
    }
  },
  template: `
    <div class="space-y-6">

      <!-- Top Controls & Mobile View Selector -->
      <div class="card p-4 sm:p-5">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 class="text-xl font-bold tracking-tight">📅 Daily Itinerary & Interactive Calendar</h2>
            <p class="text-sm text-[var(--muted-foreground)]">
              Interactive 13-day calendar selector, 18-hour time-blocks & 1-tap Apple / Google navigation
            </p>
          </div>

          <!-- Layout & View Mode Switcher -->
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
              <span>{{ globalRainMode ? '🌧️ Rain Mode: ON' : '🌧️ Rain Mode' }}</span>
            </button>

            <!-- Planner Layout Switcher: Day Calendar vs All Days Accordion -->
            <div class="flex items-center bg-[var(--background)] p-1 rounded-xl border border-[var(--border)]">
              <button
                @click="plannerLayoutMode = 'day-calendar'"
                :class="[
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                  plannerLayoutMode === 'day-calendar'
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                ]"
                title="Interactive Day Calendar (No accordion expansion needed!)"
              >
                <span>🗓️</span>
                <span>Day Calendar</span>
              </button>
              <button
                @click="plannerLayoutMode = 'accordion'"
                :class="[
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                  plannerLayoutMode === 'accordion'
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                ]"
                title="View all 13 days in expandable accordion list"
              >
                <span>📜</span>
                <span>All Days (Accordion)</span>
              </button>
            </div>

            <!-- Schedule Hour Grid vs Agenda Switcher -->
            <div class="flex items-center bg-[var(--background)] p-1 rounded-xl border border-[var(--border)]">
              <button
                @click="viewMode = 'calendar'"
                :class="[
                  'px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1',
                  viewMode === 'calendar'
                    ? 'bg-[var(--foreground)] text-[var(--background)] shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                ]"
              >
                <span>📊</span>
                <span>Hour Grid</span>
              </button>
              <button
                @click="viewMode = 'agenda'"
                :class="[
                  'px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1',
                  viewMode === 'agenda'
                    ? 'bg-[var(--foreground)] text-[var(--background)] shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                ]"
              >
                <span>📋</span>
                <span>Agenda</span>
              </button>
            </div>

            <!-- Expand / Collapse All (For Accordion Mode) -->
            <div v-if="plannerLayoutMode === 'accordion'" class="flex items-center gap-1">
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

        <!-- Interactive 13-Day Calendar Scrubber Bar -->
        <div class="space-y-2 mb-4 pt-3 border-t border-[var(--border)]">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">🗓️ Select Trip Day:</span>
              <span class="text-xs font-extrabold text-[var(--foreground)]">Oct 2 – Oct 14, 2026</span>
            </div>
            <!-- Milestone Quick Jumps -->
            <div class="hidden sm:flex items-center gap-1.5 text-xs">
              <span class="text-[10px] text-[var(--muted-foreground)] font-bold uppercase">Milestones:</span>
              <button
                @click="jumpToMilestone(6)"
                class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-200 dark:bg-blue-300 text-blue-950 border border-blue-400 hover:opacity-90"
              >
                🎂 Oct 7: Dad & Erin
              </button>
              <button
                @click="jumpToMilestone(11)"
                class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-200 dark:bg-amber-300 text-amber-950 border border-amber-400 hover:opacity-90"
              >
                🍺 Oct 12: Guinness
              </button>
              <button
                @click="jumpToMilestone(12)"
                class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-pink-200 dark:bg-pink-300 text-pink-950 border border-pink-400 hover:opacity-90"
              >
                🎂 Oct 13: Mom's Bday
              </button>
            </div>
          </div>

          <!-- Horizontal Scrollable Day Cards Strip -->
          <div class="day-strip-scroll pt-1 pb-2">
            <div
              v-for="(d, idx) in timeline"
              :key="d.dayNumber"
              @click="selectCalendarDay(idx)"
              :class="[
                'day-strip-card p-2.5 rounded-xl border flex flex-col justify-between gap-1.5 transition-all text-left shadow-sm',
                activeCalendarDayIndex === idx
                  ? 'active-day bg-[var(--accent)]/15 border-[var(--accent)] ring-2 ring-[var(--accent)] text-[var(--foreground)]'
                  : 'bg-[var(--card)] hover:bg-[var(--card-hover)] border-[var(--border)] text-[var(--foreground)]',
                d.special && activeCalendarDayIndex !== idx ? 'border-pink-500/50 bg-pink-500/[0.04]' : '',
                d.isTransfer && !d.special && activeCalendarDayIndex !== idx ? 'border-blue-500/40' : ''
              ]"
            >
              <!-- Top Row: Day # + Date -->
              <div class="flex items-center justify-between gap-1">
                <span :class="[
                  'px-1.5 py-0.5 rounded text-[10px] font-mono font-extrabold',
                  activeCalendarDayIndex === idx ? 'bg-[var(--accent)] text-white' : 'bg-[var(--card-hover)] text-[var(--muted-foreground)]'
                ]">
                  D{{ d.dayNumber }}
                </span>
                <span class="text-[11px] font-bold text-[var(--foreground)] whitespace-nowrap">{{ d.date }}</span>
              </div>

              <!-- Location / Base Tag -->
              <div class="text-[11px] font-semibold text-[var(--foreground)] truncate leading-tight">
                {{ d.base }}
              </div>

              <!-- Milestone Pill if applicable -->
              <div v-if="getMilestoneBadge(d)" class="truncate">
                <span :class="[
                  'px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-tight block truncate text-center',
                  d.special ? 'bg-pink-200 dark:bg-pink-300 text-pink-950 border border-pink-400' : 'bg-blue-200 dark:bg-blue-300 text-blue-950 border border-blue-400'
                ]">
                  {{ getMilestoneBadge(d) }}
                </span>
              </div>

              <!-- Drive Time & Activity count -->
              <div class="flex items-center justify-between text-[10px] text-[var(--muted-foreground)] pt-1 border-t border-[var(--border)]/50">
                <span>🚗 {{ d.driveHours }}h</span>
                <span>{{ d.items.length }} stops</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Mobile Collapsible Toggle Button for Filter/Pacing Panel -->
        <div class="md:hidden pt-2 border-t border-[var(--border)]">
          <button
            @click="isMobileFiltersCollapsed = !isMobileFiltersCollapsed"
            class="w-full py-2 px-3 rounded-xl text-xs font-bold bg-[var(--background)] hover:bg-[var(--card-hover)] text-[var(--foreground)] border border-[var(--border)] flex items-center justify-between transition-all"
          >
            <span class="flex items-center gap-1.5">
              <span>⚙️</span>
              <span>Filter & Pacing Panels</span>
              <span v-if="activeTypeFilter !== 'all' || activeEnergyFilter !== 'all'" class="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--accent)] text-white font-bold">Active</span>
            </span>
            <span>{{ isMobileFiltersCollapsed ? '▼ Show Filters' : '▲ Hide Filters' }}</span>
          </button>
        </div>

        <!-- Filter & Legend Container (Collapsed by Default on Mobile) -->
        <div :class="{'hidden md:block': isMobileFiltersCollapsed}" class="space-y-3 pt-1">
          <!-- Color Legend Ribbon -->
          <div class="flex flex-wrap items-center gap-3 p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs">
            <span class="font-bold text-[var(--foreground)] text-[11px] uppercase tracking-wider">Key:</span>
            <div class="flex items-center gap-1">
              <span class="w-2.5 h-2.5 rounded block-reserved"></span>
              <span class="font-semibold text-rose-400 text-[11px]">Bookings & Schedule</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="w-2.5 h-2.5 rounded block-anchor"></span>
              <span class="font-semibold text-indigo-400 text-[11px]">Anchor Events</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="w-2.5 h-2.5 rounded block-drive"></span>
              <span class="text-blue-400 text-[11px]">🚗 Drive</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="w-2.5 h-2.5 rounded block-dining"></span>
              <span class="text-amber-400 text-[11px]">🍽️ Dining</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="w-2.5 h-2.5 rounded block-housing"></span>
              <span class="text-purple-400 text-[11px]">🏡 Lodging</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="w-2.5 h-2.5 rounded block-sight"></span>
              <span class="text-emerald-400 text-[11px]">🌲 Sights</span>
            </div>
          </div>

          <!-- Filter Category Tabs (Type & Energy) -->
          <div class="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[var(--border)]">
            <!-- Type Filter -->
            <div class="flex flex-wrap items-center gap-1">
              <button
                v-for="flt in [
                  { id: 'all', label: 'All Stops' },
                  { id: 'reserved', label: '💡 Bookings' },
                  { id: 'drive', label: '🚗 Drives' },
                  { id: 'dining', label: '🍽️ Dinners' },
                  { id: 'sight', label: '🌲 Sights' }
                ]"
                :key="flt.id"
                @click="activeTypeFilter = flt.id"
                :class="[
                  'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                  activeTypeFilter === flt.id
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'bg-[var(--card-hover)] hover:bg-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                ]"
              >
                {{ flt.label }}
              </button>
            </div>

            <!-- Energy Level Filter -->
            <div class="flex items-center gap-1">
              <span class="text-[10px] font-bold uppercase text-[var(--muted-foreground)]">Pacing:</span>
              <button
                v-for="e in [
                  { id: 'all', label: 'All' },
                  { id: 'chill', label: '🟢 Chill' },
                  { id: 'moderate', label: '🟡 Mod' },
                  { id: 'strenuous', label: '🔴 Hard' }
                ]"
                :key="e.id"
                @click="activeEnergyFilter = e.id"
                :class="[
                  'px-2 py-0.5 rounded text-[11px] font-semibold transition-all',
                  activeEnergyFilter === e.id
                    ? 'bg-[var(--foreground)] text-[var(--background)] shadow-sm'
                    : 'bg-[var(--card-hover)] text-[var(--muted-foreground)]'
                ]"
              >
                {{ e.label }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ============================================================= -->
      <!-- VIEW 1: INTERACTIVE SINGLE-DAY FOCUS VIEW (No Accordion Needed) -->
      <!-- ============================================================= -->
      <div v-if="plannerLayoutMode === 'day-calendar'" id="active-day-focus-card" class="space-y-4">
        
        <!-- Day Navigation Bar -->
        <div class="card p-4 sm:p-5 border-2 border-[var(--accent)]/40 bg-[var(--card)] shadow-lg space-y-4">
          <!-- Navigation Controls: Prev / Day Title / Next -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
            <!-- Prev Day Button -->
            <button
              @click="prevCalendarDay"
              :disabled="activeCalendarDayIndex === 0"
              :class="[
                'nav-day-btn nav-day-btn-prev px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border shadow-sm',
                activeCalendarDayIndex === 0
                  ? 'opacity-40 cursor-not-allowed bg-[var(--background)] text-[var(--muted-foreground)] border-[var(--border)]'
                  : 'bg-[var(--card-hover)] hover:bg-[var(--accent)] hover:text-white text-[var(--foreground)] border-[var(--border)]'
              ]"
            >
              <span class="roll-arrow roll-arrow-left">◀</span>
              <span class="roll-text">Day {{ activeCalendarDayIndex > 0 ? activeCalendarDayIndex : 1 }}</span>
            </button>

            <!-- Center: Day Title & Date Badges -->
            <div class="text-center space-y-1">
              <div class="flex items-center justify-center gap-2 flex-wrap">
                <span class="w-8 h-8 rounded-xl bg-[var(--accent)] text-white font-extrabold flex items-center justify-center text-sm shadow-sm">
                  D{{ activeDay.dayNumber }}
                </span>
                <h3 class="text-lg sm:text-xl font-extrabold text-[var(--foreground)]">
                  {{ activeDay.date }}: {{ activeDay.title }}
                </h3>
                <span v-if="activeDay.special" class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-pink-200 dark:bg-pink-300 text-pink-950 border border-pink-400 shadow-sm">
                  🎂 {{ activeDay.specialText || 'BIRTHDAY CELEBRATION' }}
                </span>
                <span v-if="activeDay.isTransfer" class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-200 dark:bg-blue-300 text-blue-950 border border-blue-400 shadow-sm">
                  🔄 BASE TRANSFER
                </span>
                <!-- Currency Badge -->
                <span v-if="isNorthernIreland(activeDay.dayNumber)" class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-200 dark:bg-blue-300 text-blue-950 border border-blue-400 shadow-sm">
                  🇬🇧 NI (£ GBP · MPH)
                </span>
                <span v-else class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-200 dark:bg-emerald-300 text-emerald-950 border border-emerald-400 shadow-sm">
                  🇮🇪 Republic (€ EUR · KM/H)
                </span>
              </div>
              <div class="text-xs text-[var(--muted-foreground)] flex items-center justify-center gap-2 flex-wrap">
                <span>🏠 <strong>Base:</strong> {{ activeDay.base }}</span>
                <span>·</span>
                <span>🛣️ <strong>Route:</strong> {{ activeDay.route }}</span>
                <span>·</span>
                <span class="font-bold text-[var(--foreground)]">🚗 {{ activeDay.driveHours }}h car time</span>
                <span>·</span>
                <button
                  @click.stop="openAddStop(activeCalendarDayIndex)"
                  class="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[var(--accent)] hover:opacity-90 text-white flex items-center gap-1 shadow-sm transition-all"
                  title="Add custom stop to this day"
                >
                  <span>➕ Add Stop to Day {{ activeDay.dayNumber }}</span>
                </button>
              </div>
            </div>

            <!-- Next Day Button -->
            <button
              @click="nextCalendarDay"
              :disabled="activeCalendarDayIndex === timeline.length - 1"
              :class="[
                'nav-day-btn nav-day-btn-next px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-end gap-1.5 transition-all border shadow-sm',
                activeCalendarDayIndex === timeline.length - 1
                  ? 'opacity-40 cursor-not-allowed bg-[var(--background)] text-[var(--muted-foreground)] border-[var(--border)]'
                  : 'bg-[var(--card-hover)] hover:bg-[var(--accent)] hover:text-white text-[var(--foreground)] border-[var(--border)]'
              ]"
            >
              <span class="roll-text">Day {{ activeCalendarDayIndex < timeline.length - 1 ? activeCalendarDayIndex + 2 : 13 }}</span>
              <span class="roll-arrow roll-arrow-right">▶</span>
            </button>
          </div>

          <!-- Day Quick Hub Snapshot (Trails & Dining Linkages) -->
          <div v-if="getDayTrails(activeDay.dayNumber).length > 0 || getDayRestaurants(activeDay.dayNumber).length > 0" class="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-between gap-3 flex-wrap text-xs">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-bold text-[var(--foreground)]">🌟 Day {{ activeDay.dayNumber }} Highlights:</span>
              <!-- Trail links -->
              <button
                v-for="t in getDayTrails(activeDay.dayNumber)"
                :key="t.id"
                @click.stop="jumpToTrail(t.id)"
                class="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all font-semibold flex items-center gap-1"
              >
                <span>🥾</span>
                <span>{{ t.name }} ({{ t.difficulty }})</span>
              </button>
              <!-- Restaurant links -->
              <button
                v-for="rest in getDayRestaurants(activeDay.dayNumber)"
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
                <span class="text-[var(--foreground)] ml-1">{{ activeDay.outfit }}</span>
              </div>
            </div>

            <!-- Rainy Day Contingency Toggle -->
            <div v-if="hasRainBackups(activeDay)" class="flex items-center gap-2 self-start sm:self-auto">
              <button
                @click.stop="toggleDayRainBackup(activeCalendarDayIndex)"
                :class="[
                  'px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border',
                  isRainActive(activeCalendarDayIndex)
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-sm'
                    : 'bg-[var(--card)] hover:bg-[var(--card-hover)] text-amber-400 border-amber-500/30'
                ]"
              >
                <span>🌧️</span>
                <span>{{ isRainActive(activeCalendarDayIndex) ? '☀️ Standard Plan' : '🌧️ View Rain Backup' }}</span>
              </button>
            </div>
          </div>

          <!-- Rainy Day Contingency Callout Box (if toggled on) -->
          <div
            v-if="isRainActive(activeCalendarDayIndex)"
            class="p-4 rounded-xl bg-amber-500/[0.12] border-2 border-amber-500/50 space-y-2 animate-fadeIn shadow-sm"
          >
            <div class="flex items-center justify-between gap-2 flex-wrap text-amber-400 font-bold text-sm">
              <div class="flex items-center gap-2">
                <span class="text-lg">🌧️</span>
                <h4>Active Rainy Day Contingency for Day {{ activeDay.dayNumber }}:</h4>
              </div>
              <button
                @click.stop="toggleDayRainBackup(activeCalendarDayIndex)"
                class="text-xs underline text-amber-300 hover:text-amber-200 font-semibold"
              >
                Close Rain Plan ✕
              </button>
            </div>
            <ul class="text-xs text-[var(--foreground)] space-y-1.5 pl-5 list-disc">
              <li v-for="item in activeDay.items.filter(i => i.rainBackup)" :key="item.activity">
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
                v-for="(item, iIdx) in activeDay.items"
                :key="iIdx"
                @click="onItemClick(item, activeDay)"
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
                    v-for="(item, itIdx) in getItemsStartingInHour(activeDay, hour)"
                    :key="item.id || itIdx"
                    @click="onItemClick(item, activeDay)"
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
                        <!-- Consensus Status Badge -->
                        <span v-if="item.status === 'confirmed'" class="consensus-badge-confirmed">
                          🟢 Confirmed
                        </span>
                        <span v-else-if="item.status === 'proposed'" class="consensus-badge-proposed">
                          🟡 Proposed
                        </span>
                        <span v-else-if="item.status === 'pruned'" class="consensus-badge-pruned">
                          🔴 Backup
                        </span>
                        <!-- Consensus Voting Buttons -->
                        <button
                          @click.stop="vote(item.id || item.activity, 'up')"
                          :class="['vote-btn', isVoted(item.id || item.activity, 'up') ? 'active-up' : '']"
                          title="Upvote / Support this stop"
                        >
                          👍 {{ getVotes(item.id || item.activity).up }}
                        </button>
                        <button
                          @click.stop="vote(item.id || item.activity, 'down')"
                          :class="['vote-btn', isVoted(item.id || item.activity, 'down') ? 'active-down' : '']"
                          title="Downvote / Flag this stop"
                        >
                          👎 {{ getVotes(item.id || item.activity).down }}
                        </button>
                        <!-- Delete custom or non-mandatory base stop -->
                        <button
                          v-if="!isItemMandatory(item, activeDay)"
                          @click.stop="removeItem(item, activeDay)"
                          class="text-[11px] text-rose-400 hover:text-rose-300 font-bold px-1 transition-transform hover:scale-110"
                          :title="item.isCustom ? 'Delete this custom stop' : 'Remove activity from trip (can be restored in Notes/Settings)'"
                        >
                          🗑️
                        </button>
                        <!-- 1-Tap Maps & Calendar Buttons -->
                        <button
                          v-if="item.mapsQuery"
                          @click.stop="openMap(item.mapsQuery)"
                          class="maps-btn text-[10px] py-0.5 px-2"
                          title="Open in Apple Maps or Google Maps"
                        >
                          <span>📍 Map</span>
                        </button>
                        <button
                          @click.stop="openCalendar(item, activeDay)"
                          class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-200 dark:bg-purple-300 text-purple-950 border border-purple-400 shadow-sm hover:opacity-90 transition-all flex items-center gap-0.5"
                          title="Add event to Apple / Google Calendar"
                        >
                          <span>📅 Cal</span>
                        </button>
                      </div>
                    </div>

                    <!-- Description -->
                    <p v-if="item.desc" class="mt-1.5 text-[var(--muted-foreground)] leading-relaxed text-xs">
                      {{ item.desc }}
                    </p>

                    <!-- Rainy Day or Split Option previews -->
                    <div v-if="item.rainBackup && isRainActive(activeCalendarDayIndex)" class="mt-2 p-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-[11px] text-amber-300">
                      <strong>🌧️ Rain Backup Plan:</strong> {{ item.rainBackup }}
                    </div>
                    <div v-else-if="item.rainBackup" class="mt-1.5">
                      <button
                        @click.stop="toggleDayRainBackup(activeCalendarDayIndex)"
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
                  <div v-if="!hasItemsInHour(activeDay, hour)" class="h-4"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- MODE 2: Agenda / Itinerary List View -->
          <div v-if="viewMode === 'agenda'" class="space-y-2.5">
            <div
              v-for="(item, sIdx) in activeDay.items"
              :key="sIdx"
              @click="onItemClick(item, activeDay)"
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
                    <span v-if="item.reserved" class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-200 dark:bg-amber-300 text-amber-950 border border-amber-400 shadow-sm">
                      💡 SUGGESTED ITINERARY
                    </span>
                    <span v-if="item.tag" class="px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wide bg-emerald-100 dark:bg-emerald-300 text-emerald-950 border border-emerald-400 shadow-sm">
                      {{ item.tag }}
                    </span>
                    <!-- Consensus Status Badge -->
                    <span v-if="item.status === 'confirmed'" class="consensus-badge-confirmed">
                      🟢 Confirmed
                    </span>
                    <span v-else-if="item.status === 'proposed'" class="consensus-badge-proposed">
                      🟡 Proposed
                    </span>
                    <span v-else-if="item.status === 'pruned'" class="consensus-badge-pruned">
                      🔴 Backup
                    </span>
                    <!-- Consensus Voting Buttons -->
                    <button
                      @click.stop="vote(item.id || item.activity, 'up')"
                      :class="['vote-btn', isVoted(item.id || item.activity, 'up') ? 'active-up' : '']"
                      title="Upvote / Support this stop"
                    >
                      👍 {{ getVotes(item.id || item.activity).up }}
                    </button>
                    <button
                      @click.stop="vote(item.id || item.activity, 'down')"
                      :class="['vote-btn', isVoted(item.id || item.activity, 'down') ? 'active-down' : '']"
                      title="Downvote / Flag this stop"
                    >
                      👎 {{ getVotes(item.id || item.activity).down }}
                    </button>
                    <!-- Delete custom stop -->
                    <button
                      v-if="item.isCustom"
                      @click.stop="deleteCustomStop(item.id)"
                      class="text-[11px] text-rose-400 hover:text-rose-300 font-bold px-1"
                      title="Delete this custom stop"
                    >
                      🗑️
                    </button>
                    <!-- 1-Tap Maps & Calendar Buttons -->
                    <button
                      v-if="item.mapsQuery"
                      @click.stop="openMap(item.mapsQuery)"
                      class="maps-btn text-[10px] py-0.5 px-2"
                      title="Open in Apple Maps or Google Maps"
                    >
                      <span>📍 Map</span>
                    </button>
                    <button
                      @click.stop="openCalendar(item, activeDay)"
                      class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-200 dark:bg-purple-300 text-purple-950 border border-purple-400 shadow-sm hover:opacity-90 transition-all flex items-center gap-0.5"
                      title="Add event to Apple / Google Calendar"
                    >
                      <span>📅 Cal</span>
                    </button>
                  </div>
                </div>

                <p v-if="item.desc" class="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  {{ item.desc }}
                </p>

                <div v-if="item.rainBackup && isRainActive(activeCalendarDayIndex)" class="mt-2 p-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-[11px] text-amber-300">
                  <strong>🌧️ Rain Backup Plan:</strong> {{ item.rainBackup }}
                </div>
                <div v-else-if="item.rainBackup" class="mt-1.5">
                  <button
                    @click.stop="toggleDayRainBackup(activeCalendarDayIndex)"
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
          <div class="mt-4 pt-3 border-t border-[var(--border)] bg-[var(--background)] p-3.5 rounded-xl border border-[var(--border)]/60 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5 text-xs font-bold text-[var(--foreground)]">
                <span>📝</span>
                <span>Day {{ activeDay.dayNumber }} Personal Notes & Journal</span>
                <span v-if="hasNote(activeCalendarDayIndex)" class="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/15 text-emerald-400 font-semibold">Saved Offline</span>
              </div>
              <div class="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
                <span v-if="savingNoteDay === activeCalendarDayIndex" class="text-emerald-400 font-bold animate-pulse">💾 Saved!</span>
                <button
                  v-if="hasNote(activeCalendarDayIndex)"
                  @click.stop="clearDailyNote(activeCalendarDayIndex)"
                  class="text-rose-400 hover:text-rose-300 transition-colors"
                  title="Clear this day's note"
                >
                  Clear Note
                </button>
              </div>
            </div>
            <textarea
              :value="dailyNotes[activeCalendarDayIndex] || ''"
              @input="saveDailyNote(activeCalendarDayIndex, $event.target.value)"
              placeholder="Jot down parking spot, gate codes, gas mileage, departure time adjustments, or daily memories..."
              rows="2"
              class="w-full text-xs p-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none leading-relaxed resize-y"
            ></textarea>
          </div>

          <!-- Bottom Prev / Next Day Switcher Bar -->
          <div class="flex items-center justify-between gap-3 pt-3 border-t border-[var(--border)] text-xs">
            <button
              @click="prevCalendarDay"
              :disabled="activeCalendarDayIndex === 0"
              :class="[
                'nav-day-btn nav-day-btn-prev px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all border shadow-sm',
                activeCalendarDayIndex === 0
                  ? 'opacity-40 cursor-not-allowed bg-[var(--background)] text-[var(--muted-foreground)] border-[var(--border)]'
                  : 'bg-[var(--card-hover)] hover:bg-[var(--accent)] hover:text-white text-[var(--foreground)] border-[var(--border)]'
              ]"
            >
              <span class="roll-arrow roll-arrow-left">◀</span>
              <span class="roll-text">Prev Day (Day {{ activeCalendarDayIndex > 0 ? activeCalendarDayIndex : 1 }})</span>
            </button>

            <span class="text-[var(--muted-foreground)] font-mono font-bold">
              Day {{ activeDay.dayNumber }} of 13
            </span>

            <button
              @click="nextCalendarDay"
              :disabled="activeCalendarDayIndex === timeline.length - 1"
              :class="[
                'nav-day-btn nav-day-btn-next px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all border shadow-sm',
                activeCalendarDayIndex === timeline.length - 1
                  ? 'opacity-40 cursor-not-allowed bg-[var(--background)] text-[var(--muted-foreground)] border-[var(--border)]'
                  : 'bg-[var(--card-hover)] hover:bg-[var(--accent)] hover:text-white text-[var(--foreground)] border-[var(--border)]'
              ]"
            >
              <span class="roll-text">Next Day (Day {{ activeCalendarDayIndex < timeline.length - 1 ? activeCalendarDayIndex + 2 : 13 }})</span>
              <span class="roll-arrow roll-arrow-right">▶</span>
            </button>
          </div>

        </div>
      </div>

      <!-- ============================================================= -->
      <!-- VIEW 2: CLASSIC MULTI-DAY ACCORDION VIEW (Optional Mode)       -->
      <!-- ============================================================= -->
      <div v-else class="space-y-5">
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
                      v-for="(item, itIdx) in getItemsStartingInHour(day, hour)"
                      :key="item.id || itIdx"
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
                          <!-- Consensus Voting Buttons -->
                          <button
                            @click.stop="vote(item.id || item.activity, 'up')"
                            :class="['vote-btn', isVoted(item.id || item.activity, 'up') ? 'active-up' : '']"
                            title="Upvote / Support this stop"
                          >
                            👍 {{ getVotes(item.id || item.activity).up }}
                          </button>
                          <button
                            @click.stop="vote(item.id || item.activity, 'down')"
                            :class="['vote-btn', isVoted(item.id || item.activity, 'down') ? 'active-down' : '']"
                            title="Downvote / Flag this stop"
                          >
                            👎 {{ getVotes(item.id || item.activity).down }}
                          </button>
                          <!-- Remove stop if non-mandatory -->
                          <button
                            v-if="!isItemMandatory(item, day)"
                            @click.stop="removeItem(item, day)"
                            class="text-[11px] text-rose-400 hover:text-rose-300 font-bold px-1 transition-transform hover:scale-110"
                            :title="item.isCustom ? 'Delete this custom stop' : 'Remove activity from trip (can be restored in Notes/Settings)'"
                          >
                            🗑️
                          </button>
                          <!-- 1-Tap Maps & Calendar Buttons -->
                          <button
                            v-if="item.mapsQuery"
                            @click.stop="openMap(item.mapsQuery)"
                            class="maps-btn text-[10px] py-0.5 px-2"
                            title="Open in Apple Maps or Google Maps"
                          >
                            <span>📍 Map</span>
                          </button>
                          <button
                            @click.stop="openCalendar(item, day)"
                            class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-200 dark:bg-purple-300 text-purple-950 border border-purple-400 shadow-sm hover:opacity-90 transition-all flex items-center gap-0.5"
                            title="Add event to Apple / Google Calendar"
                          >
                            <span>📅 Cal</span>
                          </button>
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
                    <div v-if="!hasItemsInHour(day, hour)" class="h-4"></div>
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
                      <span v-if="item.reserved" class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-200 dark:bg-amber-300 text-amber-950 border border-amber-400 shadow-sm">
                        💡 SUGGESTED ITINERARY
                      </span>
                      <span v-if="item.tag" class="px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wide bg-emerald-100 dark:bg-emerald-300 text-emerald-950 border border-emerald-400 shadow-sm">
                        {{ item.tag }}
                      </span>
                      <!-- Delete/Remove button for non-mandatory items -->
                      <button
                        v-if="!isItemMandatory(item, day)"
                        @click.stop="removeItem(item, day)"
                        class="text-[11px] text-rose-400 hover:text-rose-300 font-bold px-1 transition-transform hover:scale-110"
                        :title="item.isCustom ? 'Delete this custom stop' : 'Remove activity from trip (can be restored in Notes/Settings)'"
                      >
                        🗑️
                      </button>
                      <!-- 1-Tap Maps & Calendar Buttons -->
                      <button
                        v-if="item.mapsQuery"
                        @click.stop="openMap(item.mapsQuery)"
                        class="maps-btn text-[10px] py-0.5 px-2"
                        title="Open in Apple Maps or Google Maps"
                      >
                        <span>📍 Map</span>
                      </button>
                      <button
                        @click.stop="openCalendar(item, day)"
                        class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-200 dark:bg-purple-300 text-purple-950 border border-purple-400 shadow-sm hover:opacity-90 transition-all flex items-center gap-0.5"
                        title="Add event to Apple / Google Calendar"
                      >
                        <span>📅 Cal</span>
                      </button>
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
