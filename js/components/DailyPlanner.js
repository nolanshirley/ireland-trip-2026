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
      isMobileFiltersCollapsed: (typeof window !== 'undefined' && window.innerWidth < 768),
      useBoreenBuffer: false, // +20% Irish rural road buffer
      rainSwappedDays: {}, // { [dayIndex]: boolean }
      whoIsInFilter: 'all', // 'all', 'dad', 'mom', 'erin', 'hikers', 'casual'
      ambientTimeMode: 'auto', // 'auto', 'day', 'sunset', 'night'
      isRecapCollapsed: false,
      isRecapDismissed: false,
      isDayTransitioning: false,
      showMobileFabMenu: false,
      showDayPlanSummary: false,
      dayPlanSummaryDayIndex: null
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
  mounted() {
    this.scrollDayStripTo(this.activeCalendarDayIndex);
    this.$nextTick(() => {
      setTimeout(() => this.checkDayPlanPopup(), 600);
    });
  },
  watch: {
    targetDayIndex: {
      immediate: true,
      handler(newVal) {
        if (newVal !== null && newVal !== undefined) {
          this.activeCalendarDayIndex = newVal;
          this.expandedDays[newVal] = true;
          this.activeDayFilter = null;
          this.scrollDayStripTo(newVal);
          this.$nextTick(() => {
            setTimeout(() => {
              const el = document.getElementById('active-day-focus-card') || document.getElementById('day-card-' + (newVal + 1));
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }, 60);
          });
        }
      }
    }
  },
  computed: {
    tripProgressPercent() {
      if (!this.timeline || !this.timeline.length) return 0;
      return Math.round(((this.activeCalendarDayIndex + 1) / this.timeline.length) * 100);
    },
    totalTripDriveHours() {
      if (!this.timeline) return 0;
      return this.timeline.reduce((acc, d) => acc + parseFloat(d.driveHours || 0), 0).toFixed(1);
    },
    nextDayPreview() {
      if (this.activeCalendarDayIndex < this.timeline.length - 1) {
        return this.timeline[this.activeCalendarDayIndex + 1];
      }
      return null;
    },
    prevDayPreview() {
      if (this.activeCalendarDayIndex > 0) {
        return this.timeline[this.activeCalendarDayIndex - 1];
      }
      return null;
    },
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
    activeDaylight() {
      const dNum = (this.activeDay && this.activeDay.dayNumber) || 1;
      return (typeof daylightData !== 'undefined' && daylightData[dNum]) || {
        sunrise: '07:44', sunset: '18:50', goldenHour: '18:02', daylightHours: '11h 06m', dusk: '19:26', sunsetHour: 18.83, goldenHourStart: 18.03
      };
    },
    activeDayDriveHours() {
      const base = parseFloat((this.activeDay && this.activeDay.driveHours) || 0);
      return this.useBoreenBuffer ? (base * 1.2).toFixed(1) : base.toFixed(1);
    },
    isDayRainSwapped() {
      return Boolean(this.rainSwappedDays[this.activeCalendarDayIndex] || this.globalRainMode);
    },
    activeDayItems() {
      if (!this.activeDay || !this.activeDay.items) return [];
      let items = [...this.activeDay.items];
      if (this.isDayRainSwapped) {
        items = items.map(item => {
          if (item.rainBackup) {
            const backupSummary = item.rainBackup.includes('.') ? item.rainBackup.split('.')[0] : item.rainBackup;
            return {
              ...item,
              isRainSwapped: true,
              originalActivity: item.activity,
              activity: '🌧️ ' + backupSummary,
              desc: `[INDOOR RAIN CONTINGENCY for ${item.activity}] ${item.rainBackup}`,
              tag: 'Rain Alternate'
            };
          }
          return item;
        });
      }
      if (this.whoIsInFilter !== 'all') {
        const f = this.whoIsInFilter.toLowerCase();
        items = items.filter(item => {
          if (item.reserved || item.anchor || item.type === 'drive' || item.type === 'housing') return true;
          const text = ((item.attendees || '') + ' ' + (item.splitOption || '') + ' ' + (item.desc || '') + ' ' + item.activity).toLowerCase();
          if (f === 'hikers') return item.energyLevel === 'strenuous' || text.includes('hike') || text.includes('summit');
          if (f === 'casual') return item.energyLevel === 'chill' || text.includes('shop') || text.includes('walk') || text.includes('tea');
          return text.includes(f) || !item.splitOption;
        });
      }
      return items;
    },
    activeDaySuggestions() {
      if (!this.activeDay) return [];
      return this.activeDay.onHoldItems || [];
    },
    dayScheduleConflicts() {
      const items = [...this.activeDayItems].sort((a, b) => this.getItemStartHour(a) - this.getItemStartHour(b));
      const conflicts = [];
      for (let i = 1; i < items.length; i++) {
        const prev = items[i - 1];
        const curr = items[i];
        const prevEnd = this.getItemEndHour(prev);
        const currStart = this.getItemStartHour(curr);
        // Overlap only if current activity starts before previous finishes (e.g. 2:01 PM incoming and 2:00 PM upcoming).
        // Back-to-back times (e.g. 2:00 PM and 2:00 PM) are NOT a conflict.
        if (currStart < prevEnd - 0.001) {
          conflicts.push({
            itemA: prev,
            itemB: curr,
            message: `"${curr.activity}" (${curr.time || 'starts'}) overlaps with "${prev.activity}" (runs until ~${typeof formatHourToTime === 'function' ? formatHourToTime(prevEnd) : this.formatHour(Math.floor(prevEnd))})`
          });
        }
      }
      return conflicts;
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
    // ── Daily Action Plan Popup ──────────────────────────────────
    checkDayPlanPopup() {
      const dayIdx = this.activeCalendarDayIndex;
      if (!this.timeline || !this.timeline[dayIdx]) return;
      const day = this.timeline[dayIdx];
      const key = 'irelandTrip_dayPlanSeen_' + day.dayNumber;
      try {
        if (localStorage.getItem(key)) return; // Already dismissed
      } catch(e) {}
      this.dayPlanSummaryDayIndex = dayIdx;
      this.showDayPlanSummary = true;
    },
    dismissDayPlanPopup() {
      if (this.dayPlanSummaryDayIndex !== null && this.timeline && this.timeline[this.dayPlanSummaryDayIndex]) {
        const day = this.timeline[this.dayPlanSummaryDayIndex];
        const key = 'irelandTrip_dayPlanSeen_' + day.dayNumber;
        try { localStorage.setItem(key, '1'); } catch(e) {}
      }
      this.showDayPlanSummary = false;
      this.dayPlanSummaryDayIndex = null;
    },
    getDayPlanSummaryItems(dayIdx) {
      if (!this.timeline || !this.timeline[dayIdx]) return [];
      const day = this.timeline[dayIdx];
      return (day.items || []).filter(i => i.type !== 'free');
    },
    getDayMandatoryItems(dayIdx) {
      if (!this.timeline || !this.timeline[dayIdx]) return [];
      const day = this.timeline[dayIdx];
      return (day.items || []).filter(i => i.mandatory || i.anchor || i.reserved);
    },
    getDayDiningItems(dayIdx) {
      if (!this.timeline || !this.timeline[dayIdx]) return [];
      const day = this.timeline[dayIdx];
      return (day.items || []).filter(i => i.type === 'dining');
    },
    getDayDriveCount(dayIdx) {
      if (!this.timeline || !this.timeline[dayIdx]) return 0;
      return (this.timeline[dayIdx].items || []).filter(i => i.type === 'drive').length;
    },
    // ── Day Navigation ───────────────────────────────────────────
    selectCalendarDay(idx) {
      if (this.activeCalendarDayIndex === idx) return;
      this.isDayTransitioning = true;
      this.activeCalendarDayIndex = idx;
      this.expandedDays[idx] = true;
      this.scrollDayStripTo(idx);
      setTimeout(() => {
        this.isDayTransitioning = false;
      }, 350);
      this.$nextTick(() => {
        const el = document.getElementById('active-day-focus-card');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      // Check if day plan popup should show for this new day
      this.$nextTick(() => {
        setTimeout(() => this.checkDayPlanPopup(), 400);
      });
    },
    scrollToTop() {
      const el = document.getElementById('active-day-focus-card') || document.getElementById('main-tab-nav');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      this.showMobileFabMenu = false;
    },
    scrollDayStripTo(idx) {
      this.$nextTick(() => {
        setTimeout(() => {
          const card = document.getElementById('day-strip-card-' + idx);
          const container = document.getElementById('day-strip-scroll-container') || (this.$refs && this.$refs.dayStripContainer);
          if (card && container) {
            const cardLeft = card.offsetLeft;
            const cardWidth = card.offsetWidth;
            const containerWidth = container.clientWidth;
            const targetScroll = cardLeft - (containerWidth / 2) + (cardWidth / 2);
            container.scrollTo({
              left: Math.max(0, targetScroll),
              behavior: 'smooth'
            });
          }
        }, 50);
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
      const willBeActive = !this.isRainActive(idx);
      this.showRainBackups[idx] = willBeActive;
      if (window.TravelApp && window.TravelApp.notify) {
        window.TravelApp.notify(willBeActive ? `Day ${idx + 1}: Indoor rain backup mode active` : `Day ${idx + 1}: Outdoor schedule restored`, '☔');
      }
    },
    toggleGlobalRainMode() {
      this.globalRainMode = !this.globalRainMode;
      this.timeline.forEach((_, idx) => {
        this.showRainBackups[idx] = this.globalRainMode;
      });
      if (window.TravelApp && window.TravelApp.notify) {
        window.TravelApp.notify(this.globalRainMode ? 'All Days: Rain contingencies highlighted' : 'All Days: Standard outdoor itinerary restored', '☔');
      }
    },
    formatHour(h) {
      if (h === 0 || h === 24) return '12 AM';
      if (h === 12) return '12 PM';
      if (h < 12) return `${h} AM`;
      return `${h - 12} PM`;
    },
    getItemStartHour(item) {
      if (!item) return this.dayStartHour;
      if (typeof getItemTimeRange === 'function') {
        const range = getItemTimeRange(item);
        if (range && typeof range.start === 'number' && !isNaN(range.start)) {
          return range.start;
        }
      }
      if (typeof item.startHour === 'number' && !isNaN(item.startHour)) {
        return item.startHour;
      }
      if (item.time) {
        return parseTimeToHour(item.time);
      }
      return this.dayStartHour;
    },
    getItemEndHour(item) {
      if (!item) return this.dayStartHour + 1.5;
      if (typeof getItemTimeRange === 'function') {
        const range = getItemTimeRange(item);
        if (range && typeof range.end === 'number' && !isNaN(range.end)) {
          return range.end;
        }
      }
      if (typeof item.endHour === 'number' && !isNaN(item.endHour)) {
        return item.endHour;
      }
      const start = this.getItemStartHour(item);
      let dur = typeof item.durHours === 'number' && !isNaN(item.durHours) ? item.durHours : 1.5;
      if (item.dur && typeof item.dur === 'string') {
        const hMatch = item.dur.match(/([\d.]+)\s*h(?:r|ours?)?/i);
        const mMatch = item.dur.match(/([\d.]+)\s*m(?:in|inutes?)?/i);
        if (hMatch) dur = parseFloat(hMatch[1]);
        else if (mMatch) dur = parseFloat(mMatch[1]) / 60;
      }
      return start + Math.max(0.25, dur);
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
    getItemTimePeriod(item, dayNumber) {
      const dNum = dayNumber || (this.activeDay && this.activeDay.dayNumber) || 1;
      const dl = (typeof daylightData !== 'undefined' && daylightData[dNum]) || { sunsetHour: 18.83, goldenHourStart: 18.03, sunset: '18:50' };
      const start = this.getItemStartHour(item);
      if (start >= dl.sunsetHour) {
        return { period: 'night', label: '🌙 Evening / Night', class: 'badge-night', cardClass: 'time-period-night', icon: '🌙' };
      }
      if (start >= dl.goldenHourStart) {
        return { period: 'sunset', label: `🌅 Sunset / Golden Hour (${dl.sunset})`, class: 'badge-sunset', cardClass: 'time-period-sunset', icon: '🌅' };
      }
      return { period: 'day', label: '☀️ Daytime', class: 'time-period-day', cardClass: 'time-period-day', icon: '☀️' };
    },
    isSunsetHazard(item, dayNumber) {
      if (!item) return false;
      const dNum = dayNumber || (this.activeDay && this.activeDay.dayNumber) || 1;
      const dl = (typeof daylightData !== 'undefined' && daylightData[dNum]) || { sunsetHour: 18.83, sunset: '18:50' };
      const end = this.getItemEndHour(item);
      const title = ((item.activity || '') + ' ' + (item.desc || '')).toLowerCase();
      const isOutdoor = item.type === 'sight' || item.trailId || title.includes('hike') || title.includes('cliff') || title.includes('walk') || title.includes('causeway');
      return isOutdoor && end >= dl.sunsetHour;
    },
    toggleDayRainSwap(idx) {
      this.rainSwappedDays[idx] = !this.rainSwappedDays[idx];
      this.rainSwappedDays = { ...this.rainSwappedDays };
    },
    getItemsStartingInHour(day, hour) {
      if (!day) return [];
      const list = (day === this.activeDay) ? this.activeDayItems : (day.items || []);
      return list.filter(item => {
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
      this.$emit('open-detail', { item, day, editMode: true });
    },
    openEditItem(item, day) {
      this.$emit('open-detail', { item, day, editMode: true });
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
      if (dayNumber === 2) {
        return this.restaurants.filter(r => r.name.includes('Holohans'));
      }
      if (dayNumber === 3) {
        return this.restaurants.filter(r => r.name.includes('Harry\'s Shack'));
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
    isItemLocked(item) {
      if (!item) return false;
      if (item.tag === 'FLIGHT ARRIVAL' || item.tag === 'RETURN FLIGHT' || item.type === 'housing') return true;
      return false;
    },
    isItemMandatory(item, day) {
      return this.isItemLocked(item);
    },
    isItemOnHold(item) {
      if (!item) return false;
      if (item.status === 'on_hold') return true;
      if (window.TravelApp && window.TravelApp.isOnHold && item.id) {
        return window.TravelApp.isOnHold(item.id);
      }
      return false;
    },
    toggleHoldItem(item, day) {
      if (!item) return;
      const id = item.id || ('day' + (day ? day.dayNumber : 1) + '_' + (item.activity || item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '_'));
      if (this.isItemOnHold(item)) {
        if (window.TravelApp && window.TravelApp.unholdItem) {
          window.TravelApp.unholdItem(id);
        }
      } else {
        if (window.TravelApp && window.TravelApp.holdItem) {
          window.TravelApp.holdItem('schedule', id, item);
        }
      }
      this.$forceUpdate();
    },
    restoreSuggestion(item, day) {
      if (!item) return;
      const id = item.id || ('day' + (day ? day.dayNumber : 1) + '_' + (item.activity || item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '_'));
      if (window.TravelApp && window.TravelApp.unholdItem) {
        window.TravelApp.unholdItem(id);
      }
      this.$forceUpdate();
    },
    removeSuggestion(item, day) {
      this.removeItem(item, day);
    },
    openAddSuggestion(dayIndex) {
      const dIdx = dayIndex !== undefined ? dayIndex : this.activeCalendarDayIndex;
      if (window.TravelApp && window.TravelApp.openCreator) {
        window.TravelApp.openCreator('schedule', { dayIndex: dIdx, onHold: true });
      }
    },
    getDaySuggestions(day) {
      if (!day) return [];
      return day.onHoldItems || [];
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

      <!-- ============================================================= -->
      <!-- DAILY ACTION PLAN SUMMARY POPUP (Once per day, localStorage)  -->
      <!-- ============================================================= -->
      <div
        v-if="showDayPlanSummary && timeline && timeline[dayPlanSummaryDayIndex]"
        class="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6"
        @click.self="dismissDayPlanPopup"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="dismissDayPlanPopup"></div>
        
        <!-- Modal Card -->
        <div class="relative w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] overflow-y-auto rounded-2xl shadow-2xl border-2 border-[var(--accent)]/50 bg-[var(--card)] text-[var(--foreground)] animate-fadeIn pb-safe" style="animation: dayPlanSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);">
          
          <!-- Close Button -->
          <button
            @click="dismissDayPlanPopup"
            class="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-[var(--background)] hover:bg-[var(--card-hover)] border-2 border-[var(--border)] flex items-center justify-center text-sm font-black text-[var(--foreground)] transition-transform active:scale-90 shadow-md"
            title="Close daily plan"
            aria-label="Close daily action plan"
          >✕</button>

          <!-- Header -->
          <div class="p-4 sm:p-5 pb-3 border-b border-[var(--border)]" :style="{ borderTop: '5px solid ' + timeline[dayPlanSummaryDayIndex].color }">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-2xl">☀️</span>
              <span class="text-xs font-black uppercase tracking-wider text-[var(--accent)]">Daily Action Plan</span>
            </div>
            <h3 class="text-lg sm:text-xl font-black leading-snug text-[var(--foreground)]">
              Day {{ timeline[dayPlanSummaryDayIndex].dayNumber }} — {{ timeline[dayPlanSummaryDayIndex].date }}
            </h3>
            <p class="text-sm font-bold mt-0.5" :style="{ color: timeline[dayPlanSummaryDayIndex].color }">
              {{ timeline[dayPlanSummaryDayIndex].title }}
            </p>
          </div>

          <!-- Body -->
          <div class="p-4 sm:p-5 space-y-4 text-sm">

            <!-- Special Day Banner -->
            <div v-if="timeline[dayPlanSummaryDayIndex].special" class="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/20 border-2 border-amber-500/50 text-amber-950 dark:text-amber-200 text-xs sm:text-sm font-black shadow-xs">
              <span class="text-lg">🎂</span>
              <span>{{ timeline[dayPlanSummaryDayIndex].specialText || 'Special Day!' }}</span>
            </div>

            <!-- Quick Stats Row -->
            <div class="grid grid-cols-3 gap-2 text-center">
              <div class="rounded-xl bg-[var(--background)] p-2.5 border border-[var(--border)] shadow-xs">
                <div class="text-xl font-black text-[var(--accent)]">{{ (timeline[dayPlanSummaryDayIndex].items || []).length }}</div>
                <div class="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-wide">Stops</div>
              </div>
              <div class="rounded-xl bg-[var(--background)] p-2.5 border border-[var(--border)] shadow-xs">
                <div class="text-xl font-black text-blue-700 dark:text-blue-400">{{ timeline[dayPlanSummaryDayIndex].driveHours || 0 }}h</div>
                <div class="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-wide">Driving</div>
              </div>
              <div class="rounded-xl bg-[var(--background)] p-2.5 border border-[var(--border)] shadow-xs">
                <div class="text-xl font-black text-emerald-700 dark:text-emerald-400">{{ getDayDiningItems(dayPlanSummaryDayIndex).length }}</div>
                <div class="text-[10px] font-black text-[var(--muted-foreground)] uppercase tracking-wide">Meals</div>
              </div>
            </div>

            <!-- Base Camp & Route -->
            <div class="rounded-xl bg-[var(--background)] p-3 sm:p-3.5 border border-[var(--border)] space-y-1.5 shadow-xs">
              <div class="flex items-center gap-2 text-xs">
                <span class="text-base">🏡</span>
                <span class="font-bold text-[var(--foreground)]">Base:</span>
                <span class="font-medium text-[var(--foreground)]">{{ timeline[dayPlanSummaryDayIndex].base }}</span>
              </div>
              <div v-if="timeline[dayPlanSummaryDayIndex].route" class="flex items-center gap-2 text-xs">
                <span class="text-base">🗺️</span>
                <span class="font-bold text-[var(--foreground)]">Route:</span>
                <span class="font-medium text-[var(--muted-foreground)]">{{ timeline[dayPlanSummaryDayIndex].route }}</span>
              </div>
              <div class="flex items-center gap-2 text-xs">
                <span class="text-base">{{ timeline[dayPlanSummaryDayIndex].weather ? timeline[dayPlanSummaryDayIndex].weather.slice(0, 2) : '🌤️' }}</span>
                <span class="font-bold text-[var(--foreground)]">Weather:</span>
                <span class="font-medium text-[var(--foreground)]">{{ timeline[dayPlanSummaryDayIndex].weather || 'Check forecast' }}</span>
              </div>
            </div>

            <!-- ⭐ PROMINENT SHOWCASE: What to Wear Today & Outfit Guide ⭐ -->
            <div class="p-3.5 sm:p-4 rounded-xl border-2 border-indigo-400/60 dark:border-indigo-400/40 bg-indigo-50/80 dark:bg-indigo-950/30 text-[var(--foreground)] space-y-2 shadow-sm">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <div class="flex items-center gap-2">
                  <span class="text-2xl p-1 rounded-lg bg-indigo-200/80 dark:bg-indigo-900/50">👗</span>
                  <div>
                    <span class="text-[10px] font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300 block">
                      Recommended Daily Attire
                    </span>
                    <h4 class="text-sm sm:text-base font-black text-indigo-950 dark:text-indigo-100 leading-tight">
                      What to Wear Today
                    </h4>
                  </div>
                </div>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-200 dark:bg-indigo-900/70 text-indigo-950 dark:text-indigo-200 border border-indigo-300/80 shadow-xs">
                  Day {{ timeline[dayPlanSummaryDayIndex].dayNumber }} Outfit
                </span>
              </div>
              <div class="p-3 rounded-lg bg-[var(--background)] border border-indigo-200 dark:border-indigo-900/60 shadow-xs">
                <p class="text-xs sm:text-sm font-bold text-[var(--foreground)] leading-relaxed">
                  {{ timeline[dayPlanSummaryDayIndex].outfit || 'Comfortable walking layers, broken-in sturdy shoes, and waterproof shell.' }}
                </p>
              </div>
            </div>

            <!-- Mandatory / Confirmed Items -->
            <div v-if="getDayMandatoryItems(dayPlanSummaryDayIndex).length > 0" class="space-y-1.5">
              <div class="text-xs font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1">
                <span>📌</span> Mandatory / Confirmed
              </div>
              <div
                v-for="(item, mi) in getDayMandatoryItems(dayPlanSummaryDayIndex)"
                :key="'mand-' + mi"
                class="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20"
              >
                <span class="text-xs mt-0.5 font-mono font-bold text-rose-700 dark:text-rose-400 flex-shrink-0 w-24">{{ item.time ? item.time.split('–')[0].split('-')[0].trim() : '' }}</span>
                <span class="text-xs font-semibold text-[var(--foreground)]">{{ item.activity }}</span>
              </div>
            </div>

            <!-- Full Day Schedule -->
            <div class="space-y-1.5">
              <div class="text-xs font-extrabold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1">
                <span>📋</span> Full Schedule
              </div>
              <div class="space-y-1">
                <div
                  v-for="(item, si) in (timeline[dayPlanSummaryDayIndex].items || [])"
                  :key="'sched-' + si"
                  class="flex items-start gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--card-hover)] transition-colors"
                  :class="{
                    'bg-emerald-500/8 border border-emerald-500/15': item.type === 'dining',
                    'bg-blue-500/8 border border-blue-500/15': item.type === 'drive',
                    'bg-amber-500/8 border border-amber-500/15': item.type === 'sight',
                    'bg-[var(--background)] border border-[var(--border)]/40': item.type !== 'dining' && item.type !== 'drive' && item.type !== 'sight'
                  }"
                >
                  <span class="text-[11px] mt-0.5 font-mono font-bold text-[var(--muted-foreground)] flex-shrink-0 w-20 sm:w-24">{{ item.time ? item.time.split('–')[0].split('-')[0].trim() : '' }}</span>
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-semibold text-[var(--foreground)] truncate">{{ item.activity }}</div>
                    <div v-if="item.mandatory || item.anchor" class="text-[10px] font-bold text-rose-600 dark:text-rose-400">✅ Confirmed</div>
                  </div>
                  <span v-if="item.tag" class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[var(--card-hover)] text-[var(--muted-foreground)] flex-shrink-0 hidden sm:inline">{{ item.tag }}</span>
                </div>
              </div>
            </div>

            <!-- Day Note / Alert -->
            <div v-if="timeline[dayPlanSummaryDayIndex].note" class="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-800 dark:text-amber-300">
              <span class="mt-0.5">⚠️</span>
              <span class="font-semibold">{{ timeline[dayPlanSummaryDayIndex].note }}</span>
            </div>
          </div>

          <!-- Footer -->
          <div class="p-4 pt-2 border-t border-[var(--border)] flex items-center justify-between">
            <span class="text-[10px] font-semibold text-[var(--muted-foreground)]">Tap outside or press ✕ to close</span>
            <button
              @click="dismissDayPlanPopup"
              class="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:opacity-90 transition-opacity shadow-sm"
            >
              Got it, let's go! ☘️
            </button>
          </div>
        </div>
      </div>

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
                  : 'bg-[var(--card)] hover:bg-[var(--card-hover)] text-amber-800 dark:text-amber-400 border-amber-500/40'
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

        <!-- Interactive Trip Progress Bar -->
        <div class="mb-3 p-3 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xs space-y-2">
          <div class="flex items-center justify-between gap-3 flex-wrap text-xs">
            <div class="flex items-center gap-2 font-bold text-[var(--foreground)]">
              <span class="text-base">🏆</span>
              <span>Trip Progress:</span>
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-extrabold bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                Day {{ activeCalendarDayIndex + 1 }} of 13 ({{ tripProgressPercent }}%)
              </span>
            </div>
            <div class="flex items-center gap-3 text-[11px] text-[var(--muted-foreground)] font-semibold">
              <span>🚗 Total Drive: {{ totalTripDriveHours }}h</span>
              <span class="opacity-40">·</span>
              <span>📍 Current Base: <strong class="text-[var(--foreground)]">{{ activeDay.base }}</strong></span>
            </div>
          </div>
          <div class="w-full h-2 rounded-full bg-[var(--background)] border border-[var(--border)] overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-[var(--accent)] via-indigo-500 to-emerald-500 transition-all duration-500 shadow-sm"
              :style="{ width: tripProgressPercent + '%' }"
            ></div>
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
          <div class="day-strip-scroll pt-1 pb-2" id="day-strip-scroll-container" ref="dayStripContainer">
            <div
              v-for="(d, idx) in timeline"
              :key="d.dayNumber"
              :id="'day-strip-card-' + idx"
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
              <span class="font-semibold text-rose-800 dark:text-rose-400 text-[11px]">Bookings & Schedule</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="w-2.5 h-2.5 rounded block-anchor"></span>
              <span class="font-semibold text-indigo-800 dark:text-indigo-400 text-[11px]">Anchor Events</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="w-2.5 h-2.5 rounded block-drive"></span>
              <span class="font-semibold text-blue-800 dark:text-blue-400 text-[11px]">🚗 Drive</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="w-2.5 h-2.5 rounded block-dining"></span>
              <span class="font-semibold text-amber-800 dark:text-amber-400 text-[11px]">🍽️ Dining</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="w-2.5 h-2.5 rounded block-housing"></span>
              <span class="font-semibold text-purple-800 dark:text-purple-400 text-[11px]">🏡 Lodging</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="w-2.5 h-2.5 rounded block-sight"></span>
              <span class="font-semibold text-emerald-800 dark:text-emerald-400 text-[11px]">🌲 Sights</span>
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
      <div v-if="plannerLayoutMode === 'day-calendar'" id="active-day-focus-card" :class="['space-y-4', { 'day-fade-enter': isDayTransitioning }]">
        
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
                class="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all font-semibold flex items-center gap-1"
              >
                <span>🥾</span>
                <span>{{ t.name }} ({{ t.difficulty }})</span>
              </button>
              <!-- Restaurant links -->
              <button
                v-for="rest in getDayRestaurants(activeDay.dayNumber)"
                :key="rest.id"
                @click.stop="jumpToRestaurant(rest.id)"
                class="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all font-semibold flex items-center gap-1"
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

            <!-- Road Realism Buffer & Rain Swap Controls -->
            <div class="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <!-- Road Realism Buffer Toggle -->
              <button
                @click="useBoreenBuffer = !useBoreenBuffer"
                :class="[
                  'px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 border-2 shadow-sm',
                  useBoreenBuffer
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 border-emerald-500'
                    : 'bg-[var(--card)] hover:bg-[var(--card-hover)] text-[var(--foreground)] border-[var(--border)]'
                ]"
                title="Toggle +20% buffer on drive times for narrow Irish rural boreens, tour buses, and sheep"
              >
                <span>🚗</span>
                <span>{{ useBoreenBuffer ? '+20% Boreen Buffer: ON' : '+20% Road Buffer' }}</span>
              </button>

              <!-- Dynamic Rain Contingency Plan Swap Button -->
              <button
                v-if="hasRainBackups(activeDay)"
                @click.stop="toggleDayRainSwap(activeCalendarDayIndex)"
                :class="[
                  'px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 border-2 shadow-sm',
                  isDayRainSwapped
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                    : 'bg-amber-100/80 hover:bg-amber-200/80 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-950 dark:text-amber-200 border-amber-500/60'
                ]"
                title="Swap outdoor hikes/walks directly with indoor alternatives for this day"
              >
                <span>🌧️</span>
                <span>{{ isDayRainSwapped ? '🌧️ Rain Plan Active (Indoor Swapped)' : '🌧️ Swap to Rain Backup' }}</span>
              </button>
            </div>
          </div>

          <!-- October Daylight & Civil Sunset Tracker (High Contrast Div Under Road Buffer) -->
          <div class="p-4 rounded-xl bg-[var(--card)] border-2 border-[var(--border)] shadow-sm space-y-2.5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-lg">🌅</span>
                <span class="font-black text-sm text-[var(--foreground)] tracking-tight">
                  October Daylight: {{ activeDaylight.sunrise }} AM – {{ activeDaylight.sunset }} PM
                </span>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 border border-amber-400 shadow-xs">
                  {{ activeDaylight.daylightHours }}
                </span>
              </div>
              <div class="flex items-center gap-2.5 text-xs text-[var(--foreground)] font-bold flex-wrap">
                <span>Golden Hour: <strong class="text-amber-900 dark:text-amber-300 font-black">{{ activeDaylight.goldenHour }} PM</strong></span>
                <span class="opacity-40">·</span>
                <span>Civil Dusk: <strong class="text-[var(--foreground)] font-black">{{ activeDaylight.dusk }} PM</strong></span>
                <span v-if="useBoreenBuffer" class="opacity-40">·</span>
                <span v-if="useBoreenBuffer" class="text-emerald-900 dark:text-emerald-300 font-black">
                  🚗 Real Drive: {{ activeDayDriveHours }}h
                </span>
              </div>
            </div>

            <!-- Daylight Spectrum Gradient Track -->
            <div class="daylight-track" title="Daylight progression: Blue (Day) -> Amber (Golden Hour) -> Rose/Twilight (Sunset)">
              <div class="daylight-fill" style="width: 100%;"></div>
            </div>
            
            <div class="flex items-center justify-between text-xs text-[var(--foreground)] font-mono font-bold pt-0.5 flex-wrap gap-1">
              <span class="text-[var(--foreground)]">Dawn {{ activeDaylight.dawn || '07:00' }}</span>
              <span class="text-[var(--foreground)]">Sunrise {{ activeDaylight.sunrise }}</span>
              <span class="text-amber-900 dark:text-amber-300 font-black">Golden Hour {{ activeDaylight.goldenHour }}</span>
              <span class="text-rose-900 dark:text-rose-300 font-black">Sunset {{ activeDaylight.sunset }}</span>
              <span class="text-[var(--foreground)]">Dusk {{ activeDaylight.dusk }}</span>
            </div>
          </div>

          <!-- Who's In / Family Attendee Filter Strip -->
          <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xs flex-wrap">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">👥 Who's In:</span>
              <button
                v-for="who in [
                  { id: 'all', label: 'All Family' },
                  { id: 'dad', label: 'Dad' },
                  { id: 'mom', label: 'Mom' },
                  { id: 'erin', label: 'Erin' },
                  { id: 'hikers', label: '🥾 Hikers' },
                  { id: 'casual', label: '☕ Casual' }
                ]"
                :key="who.id"
                @click="whoIsInFilter = who.id"
                :class="[
                  'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                  whoIsInFilter === who.id
                    ? 'bg-[var(--accent)] text-white shadow-sm font-bold'
                    : 'bg-[var(--background)] hover:bg-[var(--card-hover)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)]'
                ]"
              >
                {{ who.label }}
              </button>
            </div>

            <span v-if="whoIsInFilter !== 'all'" class="text-[11px] text-[var(--accent)] font-semibold">
              Showing stops matching: <strong>{{ whoIsInFilter }}</strong>
            </span>
          </div>

          <!-- Potential Schedule Conflict / Overlap Alert Banner -->
          <div
            v-if="dayScheduleConflicts.length > 0"
            class="p-3.5 rounded-xl bg-rose-500/15 border-2 border-rose-500/40 text-xs text-rose-950 dark:text-rose-300 space-y-1.5 animate-fadeIn"
          >
            <div class="flex items-center gap-2 font-bold text-sm text-rose-950 dark:text-rose-200">
              <span class="text-base">⚠️</span>
              <span>Potential Itinerary Overlap Detected ({{ dayScheduleConflicts.length }} {{ dayScheduleConflicts.length === 1 ? 'conflict' : 'conflicts' }}):</span>
            </div>
            <ul class="list-disc pl-5 space-y-1 text-xs text-[var(--foreground)]">
              <li v-for="(cf, cIdx) in dayScheduleConflicts" :key="cIdx">
                {{ cf.message }}
              </li>
            </ul>
          </div>

          <!-- Rainy Day Contingency Callout Box (if toggled on) -->
          <div
            v-if="isDayRainSwapped"
            class="p-4 rounded-xl bg-amber-500/[0.15] border-2 border-amber-500/60 space-y-2 animate-fadeIn shadow-sm"
          >
            <div class="flex items-center justify-between gap-2 flex-wrap text-amber-950 dark:text-amber-300 font-black text-sm">
              <div class="flex items-center gap-2">
                <span class="text-lg">🌧️</span>
                <h4>Rain Contingency Active for Day {{ activeDay.dayNumber }}:</h4>
              </div>
              <button
                @click.stop="toggleDayRainSwap(activeCalendarDayIndex)"
                class="text-xs underline text-amber-950 dark:text-amber-300 hover:opacity-80 font-bold"
              >
                Revert to Standard Plan ✕
              </button>
            </div>
            <p class="text-xs text-[var(--muted-foreground)]">
              Outdoor activities have been substituted in-place with pre-curated indoor and low-wind backups:
            </p>
            <ul class="text-xs text-[var(--foreground)] space-y-1.5 pl-5 list-disc">
              <li v-for="item in activeDay.items.filter(i => i.rainBackup)" :key="item.activity">
                <strong>{{ item.activity }} →</strong> {{ item.rainBackup }}
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
                v-for="(item, iIdx) in activeDayItems"
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
                      getItemTimePeriod(item, activeDay.dayNumber).cardClass,
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

                        <!-- Time of Day Atmospheric Badge -->
                        <span :class="['px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 shadow-sm', getItemTimePeriod(item, activeDay.dayNumber).class]">
                          <span>{{ getItemTimePeriod(item, activeDay.dayNumber).icon }}</span>
                          <span>{{ getItemTimePeriod(item, activeDay.dayNumber).label }}</span>
                        </span>

                        <!-- Sunset Hazard Precaution Badge -->
                        <span v-if="isSunsetHazard(item, activeDay.dayNumber)" class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-200 dark:bg-rose-300 text-rose-950 border border-rose-400 shadow-sm animate-pulse flex items-center gap-1">
                          <span>⚠️ Finishes Near/After Sunset ({{ activeDaylight.sunset }})</span>
                        </span>
                        
                        <!-- Energy Pacing Badge -->
                        <span v-if="item.energyLevel" :class="['energy-badge', getEnergyBadge(item.energyLevel).class]">
                          {{ getEnergyBadge(item.energyLevel).label }}
                        </span>
                      </div>

                      <!-- Action Badges & Map Button -->
                      <div class="action-badges-row">
                        <span v-if="item.reserved" class="px-2.5 py-1 rounded-md text-[10.5px] font-black bg-amber-200 dark:bg-amber-300 text-amber-950 border border-amber-400 shadow-sm leading-none">
                          💡 SUGGESTED ITINERARY
                        </span>
                        <span v-if="item.tag" class="px-2.5 py-1 rounded-md text-[10.5px] font-black tracking-wide bg-emerald-100 dark:bg-emerald-300 text-emerald-950 border border-emerald-400 shadow-sm leading-none">
                          {{ item.tag }}
                        </span>
                        <span v-if="item.note" class="px-2.5 py-1 rounded-md text-[10.5px] font-bold bg-amber-100 dark:bg-amber-300 text-amber-950 border border-amber-400 shadow-sm leading-none">
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
                        <!-- 1-Tap Quick Edit Times & Details -->
                        <button
                          @click.stop="openEditItem(item, activeDay)"
                          class="px-2 py-1 rounded-md text-[10.5px] font-black bg-blue-500/15 hover:bg-blue-500/25 text-blue-950 dark:text-blue-200 border border-blue-500/40 shadow-sm transition-all flex items-center justify-center gap-1 leading-none"
                          title="Edit activity times and details"
                        >
                          <span>✏️</span>
                          <span class="hidden sm:inline">Edit</span>
                        </button>
                        <!-- Put on hold (move to suggestions) -->
                        <button
                          v-if="!isItemLocked(item)"
                          @click.stop="toggleHoldItem(item, activeDay)"
                          class="px-2.5 py-1 rounded-md text-[10.5px] font-black bg-amber-500/15 hover:bg-amber-500/25 text-amber-950 dark:text-amber-200 border border-amber-500/40 shadow-sm transition-all flex items-center justify-center gap-1 leading-none"
                          title="Put on hold (Move to Day Ideas & Suggestions Box)"
                        >
                          <span>⏸️</span>
                          <span class="hidden sm:inline">Hold</span>
                        </button>
                        <!-- Delete custom or non-mandatory base stop -->
                        <button
                          v-if="!isItemLocked(item)"
                          @click.stop="removeItem(item, activeDay)"
                          class="text-xs text-rose-600 dark:text-rose-500 hover:text-rose-800 dark:hover:text-rose-400 font-bold px-1.5 py-1 rounded hover:bg-rose-500/10 transition-transform hover:scale-110 flex items-center justify-center"
                          :title="item.isCustom ? 'Delete this custom stop' : 'Remove activity from trip (can be restored in Settings)'"
                        >
                          🗑️
                        </button>
                        <!-- 1-Tap Maps & Calendar Buttons -->
                        <button
                          v-if="item.mapsQuery"
                          @click.stop="openMap(item.mapsQuery)"
                          class="maps-btn maps-btn-compact"
                          title="Open in Apple Maps or Google Maps"
                        >
                          <span>📍 Map</span>
                        </button>
                        <button
                          @click.stop="openCalendar(item, activeDay)"
                          class="px-2.5 py-1 rounded-md text-[10.5px] font-black bg-purple-200 dark:bg-purple-300 text-purple-950 border border-purple-400 shadow-sm hover:opacity-90 transition-all flex items-center justify-center gap-1 leading-none"
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
                    <div v-if="item.rainBackup && isRainActive(activeCalendarDayIndex)" class="rain-backup-box mt-2.5 p-3 rounded-xl shadow-sm space-y-1">
                      <div class="flex items-center justify-between gap-2 text-xs font-black">
                        <span class="flex items-center gap-1.5">
                          <span>🌧️</span>
                          <span>Rain Backup Plan:</span>
                        </span>
                        <button
                          @click.stop="toggleDayRainBackup(activeCalendarDayIndex)"
                          class="text-[11px] font-black underline hover:opacity-80"
                        >
                          Hide ✕
                        </button>
                      </div>
                      <p class="text-xs font-bold leading-relaxed pl-5">
                        {{ item.rainBackup }}
                      </p>
                    </div>
                    <div v-else-if="item.rainBackup" class="mt-1.5">
                      <button
                        @click.stop="toggleDayRainBackup(activeCalendarDayIndex)"
                        class="rain-backup-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all shadow-sm active:scale-95"
                        title="Click to view rainy day backup plan for this activity"
                      >
                        <span class="text-xs">🌧️</span>
                        <span>Rain Backup Available</span>
                        <span class="text-[10px] font-black">▼</span>
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
                        class="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <span>🥾</span>
                        <span>View Full Hike Details →</span>
                      </button>
                      <button
                        v-if="item.restaurantId"
                        @click.stop="jumpToRestaurant(item.restaurantId)"
                        class="text-[11px] font-bold text-amber-800 dark:text-amber-400 hover:underline flex items-center gap-1"
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
              v-for="(item, sIdx) in activeDayItems"
              :key="sIdx"
              @click="onItemClick(item, activeDay)"
              class="flex flex-col sm:flex-row sm:items-start gap-3 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--card-hover)] transition-all cursor-pointer"
              :class="[
                getItemTimePeriod(item, activeDay.dayNumber).cardClass,
                item.reserved ? 'border-amber-500/30 bg-amber-500/[0.02]' : '',
                item.type === 'drive' ? 'border-blue-500/25' : '',
                item.type === 'housing' ? 'border-purple-500/25' : ''
              ]"
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

                    <!-- Time of Day Atmospheric Badge -->
                    <span :class="['px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 shadow-sm', getItemTimePeriod(item, activeDay.dayNumber).class]">
                      <span>{{ getItemTimePeriod(item, activeDay.dayNumber).icon }}</span>
                      <span>{{ getItemTimePeriod(item, activeDay.dayNumber).label }}</span>
                    </span>

                    <!-- Sunset Hazard Precaution Badge -->
                    <span v-if="isSunsetHazard(item, activeDay.dayNumber)" class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-200 dark:bg-rose-300 text-rose-950 border border-rose-400 shadow-sm animate-pulse flex items-center gap-1">
                      <span>⚠️ Finishes Near/After Sunset ({{ activeDaylight.sunset }})</span>
                    </span>

                    <span v-if="item.energyLevel" :class="['energy-badge', getEnergyBadge(item.energyLevel).class]">
                      {{ getEnergyBadge(item.energyLevel).label }}
                    </span>
                  </div>

                  <div class="action-badges-row">
                    <span v-if="item.reserved" class="px-2.5 py-1 rounded-md text-[10.5px] font-black bg-amber-200 dark:bg-amber-300 text-amber-950 border border-amber-400 shadow-sm leading-none">
                      💡 SUGGESTED ITINERARY
                    </span>
                    <span v-if="item.tag" class="px-2.5 py-1 rounded-md text-[10.5px] font-black tracking-wide bg-emerald-100 dark:bg-emerald-300 text-emerald-950 border border-emerald-400 shadow-sm leading-none">
                      {{ item.tag }}
                    </span>
                    <span v-if="item.note" class="px-2.5 py-1 rounded-md text-[10.5px] font-bold bg-amber-100 dark:bg-amber-300 text-amber-950 border border-amber-400 shadow-sm leading-none">
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
                    <!-- 1-Tap Quick Edit Times & Details -->
                    <button
                      @click.stop="openEditItem(item, activeDay)"
                      class="px-2 py-1 rounded-md text-[10.5px] font-black bg-blue-500/15 hover:bg-blue-500/25 text-blue-950 dark:text-blue-200 border border-blue-500/40 shadow-sm transition-all flex items-center justify-center gap-1 leading-none"
                      title="Edit activity times and details"
                    >
                      <span>✏️</span>
                      <span class="hidden sm:inline">Edit</span>
                    </button>
                    <!-- Put on hold (move to suggestions) -->
                    <button
                      v-if="!isItemLocked(item)"
                      @click.stop="toggleHoldItem(item, activeDay)"
                      class="px-2.5 py-1 rounded-md text-[10.5px] font-black bg-amber-500/15 hover:bg-amber-500/25 text-amber-950 dark:text-amber-200 border border-amber-500/40 shadow-sm transition-all flex items-center justify-center gap-1 leading-none"
                      title="Put on hold (Move to Day Ideas & Suggestions Box)"
                    >
                      <span>⏸️</span>
                      <span class="hidden sm:inline">Hold</span>
                    </button>
                    <!-- Delete/Remove button -->
                    <button
                      v-if="!isItemLocked(item)"
                      @click.stop="removeItem(item, activeDay)"
                      class="text-xs text-rose-600 dark:text-rose-500 hover:text-rose-800 dark:hover:text-rose-400 font-bold px-1.5 py-1 rounded hover:bg-rose-500/10 transition-transform hover:scale-110 flex items-center justify-center"
                      :title="item.isCustom ? 'Delete this custom stop' : 'Remove activity from trip (can be restored in Settings)'"
                    >
                      🗑️
                    </button>
                    <!-- 1-Tap Maps & Calendar Buttons -->
                    <button
                      v-if="item.mapsQuery"
                      @click.stop="openMap(item.mapsQuery)"
                      class="maps-btn maps-btn-compact"
                      title="Open in Apple Maps or Google Maps"
                    >
                      <span>📍 Map</span>
                    </button>
                    <button
                      @click.stop="openCalendar(item, activeDay)"
                      class="px-2.5 py-1 rounded-md text-[10.5px] font-black bg-purple-200 dark:bg-purple-300 text-purple-950 border border-purple-400 shadow-sm hover:opacity-90 transition-all flex items-center justify-center gap-1 leading-none"
                      title="Add event to Apple / Google Calendar"
                    >
                      <span>📅 Cal</span>
                    </button>
                  </div>
                </div>

                <p v-if="item.desc" class="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  {{ item.desc }}
                </p>

                <div v-if="item.rainBackup && isRainActive(activeCalendarDayIndex)" class="rain-backup-box mt-2.5 p-3 rounded-xl shadow-sm space-y-1">
                  <div class="flex items-center justify-between gap-2 text-xs font-black">
                    <span class="flex items-center gap-1.5">
                      <span>🌧️</span>
                      <span>Rain Backup Plan:</span>
                    </span>
                    <button
                      @click.stop="toggleDayRainBackup(activeCalendarDayIndex)"
                      class="text-[11px] font-black underline hover:opacity-80"
                    >
                      Hide ✕
                    </button>
                  </div>
                  <p class="text-xs font-bold leading-relaxed pl-5">
                    {{ item.rainBackup }}
                  </p>
                </div>
                <div v-else-if="item.rainBackup" class="mt-1.5">
                  <button
                    @click.stop="toggleDayRainBackup(activeCalendarDayIndex)"
                    class="rain-backup-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all shadow-sm active:scale-95"
                    title="Click to view rainy day backup plan for this activity"
                  >
                    <span class="text-xs">🌧️</span>
                    <span>Rain Backup Available</span>
                    <span class="text-[10px] font-black">▼</span>
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
                    class="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>🥾</span>
                    <span>View Trail Profile →</span>
                  </button>
                  <button
                    v-if="item.restaurantId"
                    @click.stop="jumpToRestaurant(item.restaurantId)"
                    class="text-[11px] font-bold text-amber-800 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <span>🍴</span>
                    <span>View Restaurant Card →</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- IDEAS & SUGGESTIONS BOX (ON HOLD & OPTIONAL STOPS) -->
          <div class="mt-5 rounded-2xl border-2 border-dashed border-amber-500/40 bg-amber-500/[0.03] dark:bg-amber-950/[0.12] p-4 sm:p-5 space-y-3.5 transition-all">
            <!-- Box Header -->
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <div class="flex items-center gap-2.5">
                <span class="text-xl">💡</span>
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="text-sm sm:text-base font-black tracking-tight text-[var(--foreground)]">
                      Day {{ activeDay.dayNumber }} Ideas & Suggestions Box
                    </h3>
                    <span
                      class="px-2 py-0.5 rounded-full text-[11px] font-black"
                      :class="activeDaySuggestions.length > 0 ? 'bg-amber-500 text-slate-950' : 'bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)]'"
                    >
                      {{ activeDaySuggestions.length }} {{ activeDaySuggestions.length === 1 ? 'idea' : 'ideas' }} on hold
                    </span>
                  </div>
                  <p class="text-xs text-[var(--muted-foreground)] mt-0.5">
                    Activities paused or brainstormed for this day without locking up your scheduled timeline.
                  </p>
                </div>
              </div>

              <!-- Action to add new suggestion -->
              <button
                @click="openAddSuggestion(activeCalendarDayIndex)"
                class="px-3 py-1.5 rounded-xl text-xs font-black bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-amber-200 border-2 border-amber-500/60 transition-all flex items-center gap-1.5 shadow-sm ml-auto"
                title="Add a new idea or suggestion for this day"
              >
                <span>➕ Add Idea / Suggestion</span>
              </button>
            </div>

            <!-- Empty State -->
            <div
              v-if="activeDaySuggestions.length === 0"
              class="p-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)]/50 text-center space-y-1"
            >
              <div class="text-xs font-bold text-[var(--foreground)]">No activities currently on hold</div>
              <p class="text-[11px] text-[var(--muted-foreground)] max-w-md mx-auto">
                Need to free up time on Day {{ activeDay.dayNumber }}? Click <strong>⏸️ Hold</strong> on any stop in your schedule above to pause it here as a flexible backup, or click <strong>➕ Add Idea</strong> to jot down a spot.
              </p>
            </div>

            <!-- List of Suggestions / On-Hold Items -->
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div
                v-for="sug in activeDaySuggestions"
                :key="sug.id || sug.activity"
                @click="onItemClick(sug, activeDay)"
                class="p-3.5 rounded-xl border-2 border-amber-500/40 bg-[var(--card)] hover:border-amber-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative group"
              >
                <div class="space-y-1.5">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-950 dark:text-amber-200 border border-amber-500/50">
                        ⏸️ ON HOLD
                      </span>
                      <span v-if="sug.tag" class="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)]">
                        {{ sug.tag }}
                      </span>
                      <span v-if="sug.time" class="text-[11px] font-mono text-[var(--muted-foreground)]">
                        Suggested: {{ sug.time }}
                      </span>
                    </div>

                    <!-- 1-Tap Maps button -->
                    <button
                      v-if="sug.mapsQuery"
                      @click.stop="openMap(sug.mapsQuery)"
                      class="maps-btn text-[10px] py-0.5 px-2"
                      title="Open in Maps"
                    >
                      📍 Map
                    </button>
                  </div>

                  <h4 class="font-bold text-sm text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
                    {{ sug.activity }}
                  </h4>

                  <p v-if="sug.desc" class="text-xs text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">
                    {{ sug.desc }}
                  </p>

                  <div v-if="sug.rainBackup" class="text-[11px] font-medium text-amber-950 dark:text-amber-300">
                    🌧️ Rain Plan: {{ sug.rainBackup }}
                  </div>
                </div>

                <!-- Suggestion Card Action Bar -->
                <div class="pt-2 border-t border-[var(--border)]/60 flex items-center justify-between gap-2">
                  <button
                    @click.stop="restoreSuggestion(sug, activeDay)"
                    class="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition-all flex items-center gap-1 shadow-sm"
                    title="Restore this activity back into the active daily schedule"
                  >
                    <span>➕ Re-add to Schedule</span>
                  </button>

                  <button
                    @click.stop="removeSuggestion(sug, activeDay)"
                    class="text-xs font-bold text-rose-600 dark:text-rose-500 hover:text-rose-800 dark:hover:text-rose-400 hover:underline px-2 py-1"
                    title="Permanently remove this suggestion"
                  >
                    🗑️ Remove
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
                <span v-if="hasNote(activeCalendarDayIndex)" class="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 font-semibold">Saved Offline</span>
              </div>
              <div class="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
                <span v-if="savingNoteDay === activeCalendarDayIndex" class="text-emerald-800 dark:text-emerald-400 font-bold animate-pulse">💾 Saved!</span>
                <button
                  v-if="hasNote(activeCalendarDayIndex)"
                  @click.stop="clearDailyNote(activeCalendarDayIndex)"
                  class="text-rose-700 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 font-medium transition-colors"
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

          <!-- Interactive Collapsible Daily Recap & Next Day Teaser Banner -->
          <div v-if="!isRecapDismissed" class="mt-4 p-4 rounded-2xl bg-gradient-to-br from-[var(--card)] to-[var(--background)] border-2 border-[var(--border)] shadow-md space-y-3 transition-all">
            <!-- Card Header with Title, Progress, and Collapse/Dismiss Controls -->
            <div class="flex items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
              <div class="flex items-center gap-2">
                <span class="text-xl">✨</span>
                <div>
                  <h3 class="font-extrabold text-sm text-[var(--foreground)] tracking-tight">
                    Day {{ activeDay.dayNumber }} Recap & Tomorrow's Teaser
                  </h3>
                  <p class="text-[11px] text-[var(--muted-foreground)] font-medium">
                    Base: {{ activeDay.base }} · {{ activeDayItems.length }} Planned Stops · Drive: {{ activeDayDriveHours }}h
                  </p>
                </div>
              </div>

              <!-- Toggle Controls: Collapse / Expand / Dismiss -->
              <div class="flex items-center gap-1.5 text-xs">
                <button
                  @click="isRecapCollapsed = !isRecapCollapsed"
                  class="px-2.5 py-1 rounded-lg bg-[var(--card-hover)] hover:bg-[var(--border)] text-[var(--foreground)] font-bold transition-all flex items-center gap-1 shadow-xs"
                  :title="isRecapCollapsed ? 'Expand recap & preview' : 'Collapse recap'"
                >
                  <span>{{ isRecapCollapsed ? '▼ Show Teaser' : '▲ Hide Teaser' }}</span>
                </button>
              </div>
            </div>

            <!-- Body Content (Collapsible) -->
            <div v-show="!isRecapCollapsed" class="space-y-3 pt-1 animate-fadeIn">
              <!-- Grid: Current Day Summary vs Tomorrow's Teaser -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <!-- Left Box: Current Day Summary -->
                <div class="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-2">
                  <div class="flex items-center justify-between font-bold text-[var(--foreground)]">
                    <span>📊 Day {{ activeDay.dayNumber }} Summary</span>
                    <span class="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 font-extrabold">
                      Active
                    </span>
                  </div>
                  <ul class="space-y-1 text-[var(--muted-foreground)] font-medium">
                    <li>🚗 <strong>Route:</strong> {{ activeDayDriveHours }} hrs ({{ activeDay.driveFromTo || 'Base Camp' }})</li>
                    <li>👔 <strong>Attire:</strong> {{ activeDay.outfit }}</li>
                    <li v-if="getDayTrails(activeDay.dayNumber).length > 0">
                      🥾 <strong>Hikes:</strong> {{ getDayTrails(activeDay.dayNumber).map(t => t.name).join(', ') }}
                    </li>
                    <li v-if="getDayRestaurants(activeDay.dayNumber).length > 0">
                      🍴 <strong>Dining:</strong> {{ getDayRestaurants(activeDay.dayNumber).map(r => r.name).join(', ') }}
                    </li>
                  </ul>
                </div>

                <!-- Right Box: Upcoming Day (Next Day) Teaser -->
                <div v-if="nextDayPreview" class="p-3 rounded-xl bg-[var(--accent)]/[0.06] border border-[var(--accent)]/30 space-y-2">
                  <div class="flex items-center justify-between font-bold text-[var(--foreground)]">
                    <span class="flex items-center gap-1 text-[var(--accent)]">
                      <span>⏩ Tomorrow: Day {{ nextDayPreview.dayNumber }}</span>
                    </span>
                    <span class="text-[11px] font-mono text-[var(--muted-foreground)]">{{ nextDayPreview.date }}</span>
                  </div>
                  <div class="font-extrabold text-sm text-[var(--foreground)]">
                    📍 Base: {{ nextDayPreview.base }}
                  </div>
                  <p class="text-[11px] text-[var(--muted-foreground)] leading-relaxed line-clamp-2">
                    👔 {{ nextDayPreview.outfit || 'Standard layers & rain shell' }}
                  </p>
                  <div class="flex items-center justify-between pt-1 text-[11px]">
                    <span class="font-semibold text-[var(--foreground)]">🚗 Drive: ~{{ nextDayPreview.driveHours }}h</span>
                    <button
                      @click="nextCalendarDay"
                      class="px-2.5 py-1 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white font-bold transition-all flex items-center gap-1 shadow-sm"
                    >
                      <span>Preview Day {{ nextDayPreview.dayNumber }} →</span>
                    </button>
                  </div>
                </div>
                <div v-else class="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-center text-purple-900 dark:text-purple-300 font-bold">
                  🎉 Grand Finalé! You've reached the final day of your Ireland adventure!
                </div>
              </div>
            </div>
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
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-950 dark:text-amber-200 border-2 border-amber-500/50'
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
                  class="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all font-semibold flex items-center gap-1"
                >
                  <span>🥾</span>
                  <span>{{ t.name }} ({{ t.difficulty }})</span>
                </button>
                <!-- Restaurant links -->
                <button
                  v-for="rest in getDayRestaurants(day.dayNumber)"
                  :key="rest.id"
                  @click.stop="jumpToRestaurant(rest.id)"
                  class="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all font-semibold flex items-center gap-1"
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
                      : 'bg-[var(--card)] hover:bg-[var(--card-hover)] text-amber-800 dark:text-amber-400 border-amber-500/30'
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
              class="p-4 rounded-xl bg-amber-500/[0.15] border-2 border-amber-500/60 space-y-2 animate-fadeIn shadow-sm"
            >
              <div class="flex items-center justify-between gap-2 flex-wrap text-amber-950 dark:text-amber-300 font-black text-sm">
                <div class="flex items-center gap-2">
                  <span class="text-lg">🌧️</span>
                  <h4>Active Rainy Day & High-Wind Contingency for Day {{ day.dayNumber }}:</h4>
                </div>
                <button
                  @click.stop="toggleDayRainBackup(idx)"
                  class="text-xs underline text-amber-950 dark:text-amber-300 hover:opacity-80 font-bold"
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
                        <div class="action-badges-row">
                          <span v-if="item.reserved" class="px-2.5 py-1 rounded-md text-[10.5px] font-black bg-amber-200 dark:bg-amber-300 text-amber-950 border border-amber-400 shadow-sm leading-none">
                            💡 SUGGESTED ITINERARY
                          </span>
                          <span v-if="item.tag" class="px-2.5 py-1 rounded-md text-[10.5px] font-black tracking-wide bg-emerald-100 dark:bg-emerald-300 text-emerald-950 border border-emerald-400 shadow-sm leading-none">
                            {{ item.tag }}
                          </span>
                          <span v-if="item.note" class="px-2.5 py-1 rounded-md text-[10.5px] font-bold bg-amber-100 dark:bg-amber-300 text-amber-950 border border-amber-400 shadow-sm leading-none">
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
                          <!-- 1-Tap Quick Edit Times & Details -->
                          <button
                            @click.stop="openEditItem(item, day)"
                            class="px-2 py-1 rounded-md text-[10.5px] font-black bg-blue-500/15 hover:bg-blue-500/25 text-blue-950 dark:text-blue-200 border border-blue-500/40 shadow-sm transition-all flex items-center justify-center gap-1 leading-none"
                            title="Edit activity times and details"
                          >
                            <span>✏️</span>
                            <span class="hidden sm:inline">Edit</span>
                          </button>
                          <!-- Put on hold (move to suggestions) -->
                          <button
                            v-if="!isItemLocked(item)"
                            @click.stop="toggleHoldItem(item, day)"
                            class="px-2.5 py-1 rounded-md text-[10.5px] font-black bg-amber-500/15 hover:bg-amber-500/25 text-amber-950 dark:text-amber-200 border border-amber-500/40 shadow-sm transition-all flex items-center justify-center gap-1 leading-none"
                            title="Put on hold (Move to Day Ideas & Suggestions Box)"
                          >
                            <span>⏸️</span>
                            <span class="hidden sm:inline">Hold</span>
                          </button>
                          <!-- Remove stop if non-mandatory -->
                          <button
                            v-if="!isItemLocked(item)"
                            @click.stop="removeItem(item, day)"
                            class="text-xs text-rose-600 dark:text-rose-500 hover:text-rose-800 dark:hover:text-rose-400 font-bold px-1.5 py-1 rounded hover:bg-rose-500/10 transition-transform hover:scale-110 flex items-center justify-center"
                            :title="item.isCustom ? 'Delete this custom stop' : 'Remove activity from trip (can be restored in Settings)'"
                          >
                            🗑️
                          </button>
                          <!-- 1-Tap Maps & Calendar Buttons -->
                          <button
                            v-if="item.mapsQuery"
                            @click.stop="openMap(item.mapsQuery)"
                            class="maps-btn maps-btn-compact"
                            title="Open in Apple Maps or Google Maps"
                          >
                            <span>📍 Map</span>
                          </button>
                          <button
                            @click.stop="openCalendar(item, day)"
                            class="px-2.5 py-1 rounded-md text-[10.5px] font-black bg-purple-200 dark:bg-purple-300 text-purple-950 border border-purple-400 shadow-sm hover:opacity-90 transition-all flex items-center justify-center gap-1 leading-none"
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
                      <div v-if="item.rainBackup && isRainActive(idx)" class="rain-backup-box mt-2.5 p-3 rounded-xl shadow-sm space-y-1">
                        <div class="flex items-center justify-between gap-2 text-xs font-black">
                          <span class="flex items-center gap-1.5">
                            <span>🌧️</span>
                            <span>Rain Backup Plan:</span>
                          </span>
                          <button
                            @click.stop="toggleDayRainBackup(idx)"
                            class="text-[11px] font-black underline hover:opacity-80"
                          >
                            Hide ✕
                          </button>
                        </div>
                        <p class="text-xs font-bold leading-relaxed pl-5">
                          {{ item.rainBackup }}
                        </p>
                      </div>
                      <div v-else-if="item.rainBackup" class="mt-1.5">
                        <button
                          @click.stop="toggleDayRainBackup(idx)"
                          class="rain-backup-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all shadow-sm active:scale-95"
                          title="Click to view rainy day backup plan for this activity"
                        >
                          <span class="text-xs">🌧️</span>
                          <span>Rain Backup Available</span>
                          <span class="text-[10px] font-black">▼</span>
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
                          class="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <span>🥾</span>
                          <span>View Full Hike Details →</span>
                        </button>
                        <button
                          v-if="item.restaurantId"
                          @click.stop="jumpToRestaurant(item.restaurantId)"
                          class="text-[11px] font-bold text-amber-800 dark:text-amber-400 hover:underline flex items-center gap-1"
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

                    <div class="action-badges-row">
                      <span v-if="item.reserved" class="px-2.5 py-1 rounded-md text-[10.5px] font-black bg-amber-200 dark:bg-amber-300 text-amber-950 border border-amber-400 shadow-sm leading-none">
                        💡 SUGGESTED ITINERARY
                      </span>
                      <span v-if="item.tag" class="px-2.5 py-1 rounded-md text-[10.5px] font-black tracking-wide bg-emerald-100 dark:bg-emerald-300 text-emerald-950 border border-emerald-400 shadow-sm leading-none">
                        {{ item.tag }}
                      </span>
                      <span v-if="item.note" class="px-2.5 py-1 rounded-md text-[10.5px] font-bold bg-amber-100 dark:bg-amber-300 text-amber-950 border border-amber-400 shadow-sm leading-none">
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
                      <!-- 1-Tap Quick Edit Times & Details -->
                      <button
                        @click.stop="openEditItem(item, day)"
                        class="px-2 py-1 rounded-md text-[10.5px] font-black bg-blue-500/15 hover:bg-blue-500/25 text-blue-950 dark:text-blue-200 border border-blue-500/40 shadow-sm transition-all flex items-center justify-center gap-1 leading-none"
                        title="Edit activity times and details"
                      >
                        <span>✏️</span>
                        <span class="hidden sm:inline">Edit</span>
                      </button>
                      <!-- Put on hold (move to suggestions) -->
                      <button
                        v-if="!isItemLocked(item)"
                        @click.stop="toggleHoldItem(item, day)"
                        class="px-2.5 py-1 rounded-md text-[10.5px] font-black bg-amber-500/15 hover:bg-amber-500/25 text-amber-950 dark:text-amber-200 border border-amber-500/40 shadow-sm transition-all flex items-center justify-center gap-1 leading-none"
                        title="Put on hold (Move to Day Ideas & Suggestions Box)"
                      >
                        <span>⏸️</span>
                        <span class="hidden sm:inline">Hold</span>
                      </button>
                      <!-- Delete/Remove button for non-mandatory items -->
                      <button
                        v-if="!isItemLocked(item)"
                        @click.stop="removeItem(item, day)"
                        class="text-xs text-rose-600 dark:text-rose-500 hover:text-rose-800 dark:hover:text-rose-400 font-bold px-1.5 py-1 rounded hover:bg-rose-500/10 transition-transform hover:scale-110 flex items-center justify-center"
                        :title="item.isCustom ? 'Delete this custom stop' : 'Remove activity from trip (can be restored in Settings)'"
                      >
                        🗑️
                      </button>
                      <!-- 1-Tap Maps & Calendar Buttons -->
                      <button
                        v-if="item.mapsQuery"
                        @click.stop="openMap(item.mapsQuery)"
                        class="maps-btn maps-btn-compact"
                        title="Open in Apple Maps or Google Maps"
                      >
                        <span>📍 Map</span>
                      </button>
                      <button
                        @click.stop="openCalendar(item, day)"
                        class="px-2.5 py-1 rounded-md text-[10.5px] font-black bg-purple-200 dark:bg-purple-300 text-purple-950 border border-purple-400 shadow-sm hover:opacity-90 transition-all flex items-center justify-center gap-1 leading-none"
                        title="Add event to Apple / Google Calendar"
                      >
                        <span>📅 Cal</span>
                      </button>
                    </div>
                  </div>

                  <p v-if="item.desc" class="text-xs text-[var(--muted-foreground)] leading-relaxed">
                    {{ item.desc }}
                  </p>

                  <!-- Rainy Day or Split Option previews -->
                  <div v-if="item.rainBackup && isRainActive(idx)" class="rain-backup-box mt-2.5 p-3 rounded-xl shadow-sm space-y-1">
                    <div class="flex items-center justify-between gap-2 text-xs font-black">
                      <span class="flex items-center gap-1.5">
                        <span>🌧️</span>
                        <span>Rain Backup Plan:</span>
                      </span>
                      <button
                        @click.stop="toggleDayRainBackup(idx)"
                        class="text-[11px] font-black underline hover:opacity-80"
                      >
                        Hide ✕
                      </button>
                    </div>
                    <p class="text-xs font-bold leading-relaxed pl-5">
                      {{ item.rainBackup }}
                    </p>
                  </div>
                  <div v-else-if="item.rainBackup" class="mt-1.5">
                    <button
                      @click.stop="toggleDayRainBackup(idx)"
                      class="rain-backup-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all shadow-sm active:scale-95"
                      title="Click to view rainy day backup plan for this activity"
                    >
                      <span class="text-xs">🌧️</span>
                      <span>Rain Backup Available</span>
                      <span class="text-[10px] font-black">▼</span>
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
                      class="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>🥾</span>
                      <span>View Trail Profile →</span>
                    </button>
                    <button
                      v-if="item.restaurantId"
                      @click.stop="jumpToRestaurant(item.restaurantId)"
                      class="text-[11px] font-bold text-amber-800 dark:text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <span>🍴</span>
                      <span>View Restaurant Card →</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Day Suggestions / On Hold Drawer in Accordion -->
            <div
              v-if="getDaySuggestions(day).length > 0"
              class="mt-4 p-3.5 rounded-xl border border-dashed border-amber-500/50 bg-amber-500/[0.04] space-y-2.5"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5 text-xs font-bold text-amber-950 dark:text-amber-300">
                  <span>💡</span>
                  <span>Day {{ day.dayNumber }} Suggestions & On-Hold Backlog ({{ getDaySuggestions(day).length }})</span>
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div
                  v-for="sug in getDaySuggestions(day)"
                  :key="sug.id || sug.activity"
                  class="p-2.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs flex items-center justify-between gap-2"
                >
                  <div class="truncate">
                    <span class="font-bold text-[var(--foreground)]">{{ sug.activity }}</span>
                    <span v-if="sug.time" class="text-[10px] text-[var(--muted-foreground)] block">Suggested: {{ sug.time }}</span>
                  </div>
                  <div class="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      @click.stop="restoreSuggestion(sug, day)"
                      class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30"
                      title="Re-add to active schedule"
                    >
                      ➕ Re-add
                    </button>
                    <button
                      @click.stop="removeSuggestion(sug, day)"
                      class="text-[10px] font-bold text-rose-700 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 px-1"
                      title="Permanently remove"
                    >
                      🗑️
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
                  <span v-if="hasNote(idx)" class="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 font-semibold">Saved Offline</span>
                </div>
                <div class="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
                  <span v-if="savingNoteDay === idx" class="text-emerald-800 dark:text-emerald-400 font-bold animate-pulse">💾 Saved!</span>
                  <button
                    v-if="hasNote(idx)"
                    @click.stop="clearDailyNote(idx)"
                    class="text-rose-700 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 transition-colors"
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

      <!-- Floating Quick Jump FAB (Mobile & Desktop) -->
      <div class="floating-quick-fab flex flex-col items-end gap-2">
        <!-- Expanded Menu Pills when FAB clicked -->
        <div v-if="showMobileFabMenu" class="flex flex-col items-end gap-2 mb-1 animate-fadeIn">
          <button
            @click="selectCalendarDay(0); showMobileFabMenu = false;"
            class="px-3 py-1.5 rounded-full text-xs font-bold bg-[var(--card)] hover:bg-[var(--card-hover)] text-[var(--foreground)] border border-[var(--border)] shadow-lg flex items-center gap-1.5 transition-transform hover:scale-105"
          >
            <span>⏮️</span>
            <span>Jump to Day 1</span>
          </button>
          <button
            v-if="prevDayPreview"
            @click="prevCalendarDay(); showMobileFabMenu = false;"
            class="px-3 py-1.5 rounded-full text-xs font-bold bg-[var(--card)] hover:bg-[var(--card-hover)] text-[var(--foreground)] border border-[var(--border)] shadow-lg flex items-center gap-1.5 transition-transform hover:scale-105"
          >
            <span>◀</span>
            <span>Prev (Day {{ activeCalendarDayIndex }})</span>
          </button>
          <button
            v-if="nextDayPreview"
            @click="nextCalendarDay(); showMobileFabMenu = false;"
            class="px-3 py-1.5 rounded-full text-xs font-bold bg-[var(--accent)] text-white shadow-lg flex items-center gap-1.5 transition-transform hover:scale-105"
          >
            <span>Next (Day {{ activeCalendarDayIndex + 2 }})</span>
            <span>▶</span>
          </button>
          <button
            @click="scrollToTop"
            class="px-3 py-1.5 rounded-full text-xs font-bold bg-[var(--card)] hover:bg-[var(--card-hover)] text-[var(--foreground)] border border-[var(--border)] shadow-lg flex items-center gap-1.5 transition-transform hover:scale-105"
          >
            <span>⬆️</span>
            <span>Back to Top</span>
          </button>
        </div>

        <!-- Main Toggle FAB Button -->
        <button
          @click="showMobileFabMenu = !showMobileFabMenu"
          class="w-11 h-11 rounded-full bg-[var(--accent)] hover:opacity-95 text-white font-extrabold shadow-xl border-2 border-white/20 flex items-center justify-center text-base transition-transform active:scale-95"
          :title="showMobileFabMenu ? 'Close quick jump menu' : 'Quick day jump menu'"
        >
          <span>{{ showMobileFabMenu ? '✕' : '🚀' }}</span>
        </button>
      </div>

    </div>
  `
};
