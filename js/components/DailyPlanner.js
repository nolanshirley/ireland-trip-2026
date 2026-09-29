// =============================================================
//  Component: Daily Planner & Hourly Calendar Time-Block View
// =============================================================

const DailyPlanner = {
  name: 'DailyPlanner',
  props: {
    timeline: { type: Array, required: true }
  },
  data() {
    return {
      expandedDays: {},
      viewMode: 'calendar', // 'calendar' (Hourly) or 'agenda' (Step-by-step list)
      activeTypeFilter: 'all', // 'all', 'reserved', 'drive', 'dining', 'housing', 'sight'
      searchQuery: '',
      activeDayFilter: null,
      dayStartHour: 6, // 6:00 AM
      dayEndHour: 24 // 12:00 AM (Midnight)
    };
  },
  created() {
    // All days start collapsed by default
    this.expandedDays = {};
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
        if (!this.searchQuery.trim() && this.activeTypeFilter === 'all') return true;

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

          // Search query
          if (!this.searchQuery.trim()) return true;
          return (
            item.activity.toLowerCase().includes(q) ||
            item.time.toLowerCase().includes(q) ||
            (item.desc && item.desc.toLowerCase().includes(q)) ||
            (item.tag && item.tag.toLowerCase().includes(q)) ||
            day.title.toLowerCase().includes(q) ||
            day.base.toLowerCase().includes(q)
          );
        });
      });
    }
  },
  methods: {
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
      const widthPercent = Math.max(2.5, ((end - start) / totalSpan) * 100);

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
    getItemsInHour(day, hour) {
      return day.items.filter(item => {
        if (this.activeTypeFilter === 'reserved' && !item.reserved && !item.anchor) return false;
        if (this.activeTypeFilter === 'drive' && item.type !== 'drive') return false;
        if (this.activeTypeFilter === 'dining' && item.type !== 'dining') return false;
        if (this.activeTypeFilter === 'housing' && item.type !== 'housing') return false;
        if (this.activeTypeFilter === 'sight' && item.type !== 'sight') return false;

        const start = item.startHour;
        const end = item.endHour || (start + 0.75);
        return start < (hour + 1) && end > hour;
      });
    },
    isFirstHourOfItem(item, hour) {
      const startFloor = Math.floor(item.startHour);
      return hour === startFloor || (item.startHour < this.dayStartHour && hour === this.dayStartHour);
    },
    getBudgetPercent(hours) {
      const maxBudget = 11;
      return Math.min(100, Math.round((hours / maxBudget) * 100));
    },
    getBudgetColor(hours) {
      if (hours >= 4.5) return 'bg-red-500';
      if (hours >= 3.0) return 'bg-amber-500';
      return 'bg-emerald-500';
    },
    getReservedCount(day) {
      return day.items.filter(i => i.reserved).length;
    }
  },
  template: `
    <div class="space-y-6">
      <!-- Top Planner Control Bar -->
      <div class="card p-5">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-2xl">📅</span>
              <h2 class="text-xl font-bold tracking-tight">Daily Schedule & Time-Blocking Matrix</h2>
            </div>
            <p class="text-xs text-[var(--muted-foreground)] mt-0.5">
              Interactive hourly view with driving legs, confirmed dining reservations, and flexible activity windows.
            </p>
          </div>

          <!-- View Switcher & Expand/Collapse -->
          <div class="flex items-center gap-2 flex-wrap">
            <div class="bg-[var(--background)] border border-[var(--border)] rounded-xl p-1 flex items-center">
              <button
                @click="viewMode = 'calendar'"
                :class="[
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                  viewMode === 'calendar'
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                ]"
              >
                <span>🕒</span>
                <span>Hourly Calendar</span>
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
                <span>Itinerary List</span>
              </button>
            </div>

            <div class="flex items-center gap-1.5">
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
            <span class="font-semibold text-rose-400">📅 Confirmed Bookings</span>
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

        <!-- Filter Category Tabs -->
        <div class="flex flex-wrap items-center gap-1.5 mb-4">
          <button
            v-for="flt in [
              { id: 'all', label: 'All Activities' },
              { id: 'reserved', label: '📅 Reserved & Anchors' },
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

        <!-- Day Selector Quick Jump -->
        <div class="flex flex-wrap gap-1.5 mb-4">
          <button
            @click="activeDayFilter = null"
            :class="[
              'px-2.5 py-1 rounded text-xs font-medium transition-colors',
              activeDayFilter === null
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--card-hover)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            ]"
          >
            All 13 Days
          </button>
          <button
            v-for="(day, idx) in timeline"
            :key="idx"
            @click="filterDay(idx)"
            :class="[
              'px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1',
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

        <!-- Search Input -->
        <div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="🔍 Search schedule (e.g. 'Mister S', 'Guinness', 'Check out', 'Belfast', 'Ferry', 'Dinner')..."
            class="w-full sm:max-w-md px-3.5 py-2 text-sm rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)]"
          />
        </div>
      </div>

      <!-- Day Cards Accordion List -->
      <div class="space-y-5">
        <div
          v-for="(day, idx) in filteredDays"
          :key="day.date"
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
                  <span v-if="day.special" class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-pink-500/20 text-pink-300 border border-pink-500/50">
                    🎂 {{ day.specialText || 'BIRTHDAY CELEBRATION' }}
                  </span>
                  <span v-if="day.isTransfer" class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">
                    🔄 BASE TRANSFER
                  </span>
                  <span v-if="getReservedCount(day) > 0" class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                    📅 {{ getReservedCount(day) }} BOOKING{{ getReservedCount(day) > 1 ? 'S' : '' }}
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

            <!-- Driving Gauge & Arrow -->
            <div class="flex items-center gap-4 self-end md:self-auto">
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
            
            <!-- What to Wear & Outfit Recommendation Box -->
            <div v-if="day.outfit" class="p-3 rounded-xl bg-blue-500/[0.08] border border-blue-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div class="flex items-center gap-2">
                <span class="text-base">👔</span>
                <div>
                  <strong class="font-bold text-[var(--foreground)]">Recommended Outfits & Gear:</strong>
                  <span class="text-[var(--foreground)] ml-1">{{ day.outfit }}</span>
                </div>
              </div>
              <span class="text-[11px] font-mono text-emerald-400 font-bold whitespace-nowrap">{{ day.weather }}</span>
            </div>

            <!-- Note if any -->
            <div v-if="day.note" class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 flex items-center gap-2 font-medium">
              <span class="text-base">💡</span>
              <span>{{ day.note }}</span>
            </div>

            <!-- Proportional 18-Hour Time-Block Visual Ribbon Strip (06:00 to 24:00) -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between text-[11px] text-[var(--muted-foreground)] font-mono px-1">
                <span>06:00</span>
                <span>09:00</span>
                <span>12:00</span>
                <span>15:00</span>
                <span>18:00</span>
                <span>21:00</span>
                <span>24:00</span>
              </div>
              
              <div class="timeline-strip-container">
                <div
                  v-for="(item, iIdx) in day.items"
                  :key="iIdx"
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
                      :class="[
                        'p-2.5 rounded-lg border text-xs transition-all',
                        item.reserved ? 'bg-rose-500/10 border-rose-500/30' : '',
                        item.anchor && !item.reserved ? 'bg-indigo-500/10 border-indigo-500/30' : '',
                        item.type === 'drive' ? 'bg-blue-500/10 border-blue-500/25' : '',
                        item.type === 'dining' && !item.reserved ? 'bg-amber-500/10 border-amber-500/25' : '',
                        item.type === 'housing' ? 'bg-purple-500/10 border-purple-500/25' : '',
                        item.type === 'sight' && !item.reserved && !item.anchor ? 'bg-emerald-500/10 border-emerald-500/25' : '',
                        item.type === 'free' ? 'bg-zinc-500/10 border-zinc-500/20 text-[var(--muted-foreground)]' : ''
                      ]"
                    >
                      <div class="flex items-start justify-between gap-2 flex-wrap">
                        <div class="flex items-center gap-2">
                          <span class="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)]">
                            {{ item.time }}
                          </span>
                          <span class="font-bold text-sm text-[var(--foreground)]">{{ item.activity }}</span>
                        </div>

                        <!-- Tag & Cancellation Badges -->
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <span v-if="item.reserved" class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            📅 RESERVED
                          </span>
                          <span v-if="item.tag" class="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)]">
                            {{ item.tag }}
                          </span>
                          <span v-if="item.note" class="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            ⏱️ {{ item.note }}
                          </span>
                        </div>
                      </div>

                      <!-- Description -->
                      <p v-if="item.desc" class="mt-1.5 text-[var(--muted-foreground)] leading-relaxed text-xs">
                        {{ item.desc }}
                      </p>
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
                class="flex flex-col sm:flex-row sm:items-start gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--card-hover)] transition-colors"
                :class="{
                  'border-rose-500/30 bg-rose-500/[0.02]': item.reserved,
                  'border-blue-500/25': item.type === 'drive',
                  'border-purple-500/25': item.type === 'housing'
                }"
              >
                <!-- Time Badge -->
                <div class="sm:w-36 flex-shrink-0">
                  <span class="font-mono text-xs font-bold text-[var(--foreground)] px-2 py-1 rounded bg-[var(--card)] border border-[var(--border)] inline-block">
                    {{ item.time }}
                  </span>
                  <div class="text-[10px] text-[var(--muted-foreground)] mt-1">
                    ⏱️ {{ item.dur }}
                  </div>
                </div>

                <!-- Activity Details -->
                <div class="flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-bold text-sm text-[var(--foreground)]">{{ item.activity }}</span>
                    <span v-if="item.reserved" class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      📅 RESERVED
                    </span>
                    <span v-if="item.tag" class="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--card-hover)] text-[var(--foreground)] border border-[var(--border)]">
                      {{ item.tag }}
                    </span>
                    <span v-if="item.note" class="text-xs text-amber-400 font-medium">
                      ⏱️ {{ item.note }}
                    </span>
                  </div>
                  <p v-if="item.desc" class="text-xs text-[var(--muted-foreground)] mt-1 leading-relaxed">
                    {{ item.desc }}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div v-if="filteredDays.length === 0" class="card p-8 text-center text-sm text-[var(--muted-foreground)]">
          No activities match your search query "{{ searchQuery }}".
        </div>
      </div>
    </div>
  `
};
