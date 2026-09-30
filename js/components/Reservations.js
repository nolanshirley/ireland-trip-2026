// =============================================================
//  Component: Reservations Tracker
//  (Mobile-First, 1-Tap Maps, Cancellation Windows & Deep Links)
// =============================================================

const Reservations = {
  name: 'Reservations',
  props: {
    reservations: { type: Array, required: true }
  },
  emits: ['switch-tab'],
  data() {
    return {
      searchQuery: '',
      statusFilter: 'all', // 'all', 'birthdays', 'confirmed', 'strict-cancellation', 'dining', 'activity', 'lodging'
      sortBy: 'chronological', // 'chronological', 'deadlines', 'type', 'name'
      userBookingData: {}, // { [name]: { code: '', notes: '' } }
      copiedCodeName: null
    };
  },
  created() {
    this.loadUserBookingData();
  },
  computed: {
    confirmedCount() {
      return this.reservations.filter(r => r.status.toLowerCase().includes('confirmed') || r.status.toLowerCase().includes('booked')).length;
    },
    birthdayCount() {
      return this.reservations.filter(r => r.special || (r.notes && r.notes.toLowerCase().includes('bday'))).length;
    },
    strictCancelCount() {
      return this.reservations.filter(r => r.cancelPolicy && (r.cancelPolicy.includes('48hr') || r.cancelPolicy.includes('24hr') || r.cancelPolicy.toLowerCase().includes('non-refundable'))).length;
    },
    filteredReservations() {
      const list = this.reservations.filter(r => {
        // Status & Type Filter
        if (this.statusFilter === 'birthdays' && !(r.special || (r.notes && r.notes.toLowerCase().includes('bday')))) return false;
        if (this.statusFilter === 'confirmed' && !(r.status.toLowerCase().includes('confirmed') || r.status.toLowerCase().includes('booked'))) return false;
        if (this.statusFilter === 'strict-cancellation' && !(r.cancelPolicy && (r.cancelPolicy.includes('48hr') || r.cancelPolicy.includes('24hr') || r.cancelPolicy.toLowerCase().includes('non-refundable')))) return false;
        if (this.statusFilter === 'dining' && r.type !== 'dining') return false;
        if (this.statusFilter === 'activity' && r.type !== 'activity') return false;
        if (this.statusFilter === 'lodging' && r.type !== 'lodging') return false;

        // Search Filter
        if (!this.searchQuery.trim()) return true;
        const q = this.searchQuery.toLowerCase();
        const userCode = this.getBookingCode(r.name).toLowerCase();
        const userNotes = this.getBookingNotes(r.name).toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.date.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          (r.notes && r.notes.toLowerCase().includes(q)) ||
          (r.cancelPolicy && r.cancelPolicy.toLowerCase().includes(q)) ||
          userCode.includes(q) ||
          userNotes.includes(q)
        );
      });

      return list.sort((a, b) => {
        if (this.sortBy === 'deadlines') {
          const getDeadlineRank = (res) => {
            const pol = (res.cancelPolicy || '').toLowerCase();
            if (pol.includes('24hr')) return 1;
            if (pol.includes('48hr')) return 2;
            if (pol.includes('non-refundable')) return 3;
            if (pol.includes('call') || pol.includes('modifying')) return 4;
            if (res.type === 'lodging') return 6;
            return 5;
          };
          const rankDiff = getDeadlineRank(a) - getDeadlineRank(b);
          if (rankDiff !== 0) return rankDiff;
        }

        if (this.sortBy === 'type') {
          const typeRank = { lodging: 1, dining: 2, activity: 3, transport: 4 };
          const tDiff = (typeRank[a.type] || 5) - (typeRank[b.type] || 5);
          if (tDiff !== 0) return tDiff;
        }

        if (this.sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }

        // Default: 'chronological' (Oct 2 -> Oct 14)
        const parseDateVal = (dateStr) => {
          const match = (dateStr || '').match(/Oct\s*(\d+)/i);
          if (!match) return 99;
          let val = parseInt(match[1]);
          if (dateStr.includes('–') || dateStr.includes('-')) {
            val += 0.05; // Lodgings span multiple days
          }
          return val;
        };
        const aVal = parseDateVal(a.date);
        const bVal = parseDateVal(b.date);
        if (aVal !== bVal) return aVal - bVal;
        return (a.time || '').localeCompare(b.time || '');
      });
    }
  },
  methods: {
    loadUserBookingData() {
      try {
        const saved = localStorage.getItem('ireland_reservation_notes');
        if (saved) {
          this.userBookingData = JSON.parse(saved);
        }
      } catch (e) {
        console.error('Error loading user booking data', e);
      }
    },
    saveBookingField(name, field, val) {
      if (!this.userBookingData[name]) {
        this.userBookingData[name] = { code: '', notes: '' };
      }
      this.userBookingData[name][field] = val;
      this.userBookingData = { ...this.userBookingData };
      localStorage.setItem('ireland_reservation_notes', JSON.stringify(this.userBookingData));
    },
    getBookingCode(name) {
      return (this.userBookingData[name] && this.userBookingData[name].code) || '';
    },
    getBookingNotes(name) {
      return (this.userBookingData[name] && this.userBookingData[name].notes) || '';
    },
    copyCode(code, name) {
      if (!code) return;
      navigator.clipboard.writeText(code).then(() => {
        this.copiedCodeName = name;
        setTimeout(() => {
          if (this.copiedCodeName === name) {
            this.copiedCodeName = null;
          }
        }, 1500);
      });
    },
    getStatusClass(status) {
      const s = status.toLowerCase();
      if (s.includes('confirmed') || s.includes('booked')) {
        return 'bg-emerald-200 dark:bg-emerald-300 text-emerald-950 border border-emerald-400 font-extrabold shadow-sm';
      }
      if (s.includes('pending') || s.includes('review') || s.includes('tentative')) {
        return 'bg-amber-200 dark:bg-amber-300 text-amber-950 border border-amber-400 font-extrabold shadow-sm';
      }
      return 'bg-blue-200 dark:bg-blue-300 text-blue-950 border border-blue-400 font-extrabold shadow-sm';
    },
    getTypeIcon(type) {
      switch (type) {
        case 'dining': return '🍴';
        case 'activity': return '🎟️';
        case 'lodging': return '🏡';
        case 'transport': return '🚗';
        default: return '📋';
      }
    },
    openMap(query) {
      if (window.TravelApp && window.TravelApp.triggerMap) {
        window.TravelApp.triggerMap(query || 'Ireland');
      } else {
        const clean = (query || 'Ireland').replace(/\+/g, ' ');
        window.open(`https://maps.apple.com/?q=${encodeURIComponent(clean)}`, '_blank');
      }
    },
    openCalendar(r) {
      if (window.TravelApp && window.TravelApp.triggerCalendar) {
        window.TravelApp.triggerCalendar({
          title: r.name + (r.type === 'lodging' ? ' (Stay)' : (r.type === 'dining' ? ' (Dinner/Dining)' : ' (Booking)')),
          day: r.date || 'Oct 2',
          time: r.time || (r.type === 'lodging' ? '3:00 PM' : '12:00 PM'),
          location: r.location || 'Ireland',
          notes: (r.notes || '') + (r.cancelPolicy ? ' | Cancel Policy: ' + r.cancelPolicy : '') + (this.getBookingCode(r.name) ? ' | Code: ' + this.getBookingCode(r.name) : '')
        });
      }
    },
    jumpToRestaurant(restaurantId) {
      this.$emit('switch-tab', { tab: 'restaurants', targetId: restaurantId });
    },
    openAddReservation() {
      if (window.TravelApp) {
        window.TravelApp.openCreator('booking');
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
    deleteCustomReservation(id) {
      if (window.TravelApp) {
        window.TravelApp.deleteCustomItem('booking', id);
      }
    }
  },
  template: `
    <div class="space-y-6">
      <!-- Critical Alerts / Highlight Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Dad & Erin Birthday Alert -->
        <div class="card p-4 border-l-4 border-blue-500 bg-blue-500/[0.04]">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xl">🎂</span>
            <h4 class="font-bold text-sm text-[var(--foreground)]">Dad & Erin's Birthday!</h4>
          </div>
          <p class="text-xs text-[var(--muted-foreground)]">
            <strong>Oct 7 (Wed) @ Galway</strong>. Double birthday celebration dinner at Ruibin / Dough Bros!
          </p>
        </div>

        <!-- Mom Birthday Dinner Alert -->
        <div class="card p-4 border-l-4 border-pink-500 bg-pink-500/[0.04]">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xl">🎂</span>
            <h4 class="font-bold text-sm text-[var(--foreground)]">Mom's Birthday Dinner</h4>
          </div>
          <p class="text-xs text-[var(--muted-foreground)]">
            <strong>Oct 13 @ 5:15 PM @ Mister S (Dublin)</strong>. Confirmed table. <span class="text-pink-900 dark:text-pink-300 font-bold">24h cancellation window.</span>
          </p>
        </div>

        <!-- Guinness Tour Alert -->
        <div class="card p-4 border-l-4 border-amber-500 bg-amber-500/[0.04]">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xl">🍺</span>
            <h4 class="font-bold text-sm text-[var(--foreground)]">Guinness VIP Tour</h4>
          </div>
          <p class="text-xs text-[var(--muted-foreground)]">
            <strong>Oct 12 @ 10:30 AM</strong>: Guinness Storehouse Bar Tour. Depart Navan base by 9:15 AM.
          </p>
        </div>

        <!-- Cancellation Summary -->
        <div class="card p-4 border-l-4 border-emerald-500 bg-emerald-500/[0.04]">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xl">🛡️</span>
            <h4 class="font-bold text-sm text-[var(--foreground)]">Cancellation Windows</h4>
          </div>
          <p class="text-xs text-[var(--muted-foreground)]">
            Holohans & Mad Monk have <strong>48hr</strong> cutoff; Mister S has <strong>24hr</strong> cutoff.
          </p>
        </div>
      </div>

      <!-- Main Tracker Card -->
      <div class="card p-4 sm:p-5">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-2xl">📋</span>
              <h2 class="text-xl font-bold tracking-tight">Trip Bookings & Reservations</h2>
            </div>
            <p class="text-xs text-[var(--muted-foreground)] mt-0.5">
              Showing {{ filteredReservations.length }} of {{ reservations.length }} entries · Status, door codes, maps & cancellation deadlines
            </p>
          </div>

          <!-- Summary Badges -->
          <div class="flex items-center gap-2 text-xs flex-wrap">
            <button
              @click="openAddReservation"
              class="px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--accent)] hover:opacity-90 text-white flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
            >
              <span>➕ Add Booking / Pass</span>
            </button>
            <span class="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              ✅ {{ confirmedCount }} Confirmed / Booked
            </span>
            <span class="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
              ⚠️ {{ strictCancelCount }} Strict Deadlines
            </span>
          </div>
        </div>

        <!-- Filter Row 1: Status & Type Pills -->
        <div class="flex flex-wrap items-center gap-2 mb-3">
          <span class="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Filter:</span>
          <button
            v-for="flt in [
              { id: 'all', label: 'All (' + reservations.length + ')' },
              { id: 'birthdays', label: '🎂 Birthday Anchors' },
              { id: 'confirmed', label: '✅ Booked Only' },
              { id: 'strict-cancellation', label: '⚠️ Strict Deadlines' },
              { id: 'dining', label: '🍴 Dining' },
              { id: 'activity', label: '🎟️ Activities' },
              { id: 'lodging', label: '🏡 Lodging' }
            ]"
            :key="flt.id"
            @click="statusFilter = flt.id"
            :class="[
              'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
              statusFilter === flt.id
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'bg-[var(--card-hover)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
              flt.id === 'birthdays' && statusFilter !== 'birthdays' ? 'text-pink-900 dark:text-pink-300 border border-pink-500/50 font-bold' : '',
              flt.id === 'strict-cancellation' && statusFilter !== 'strict-cancellation' ? 'text-amber-400 border border-amber-500/30' : ''
            ]"
          >
            {{ flt.label }}
          </button>
        </div>

        <!-- Filter Row 2: Sort Controls -->
        <div class="flex items-center gap-2 flex-wrap mb-4 pt-3 border-t border-[var(--border)]">
          <span class="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Sort By:</span>
          <button
            v-for="s in [
              { id: 'chronological', label: '🗓️ Chronological (Oct 2→14)' },
              { id: 'deadlines', label: '⚠️ Cancellation Deadlines First' },
              { id: 'type', label: '🏷️ Group by Type (Lodging→Dining)' },
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

        <!-- Search Bar -->
        <div class="mb-4">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="🔍 Search reservations by name, date, location, door code, or notes..."
            class="w-full sm:max-w-md px-3.5 py-2 text-sm rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)]"
          />
        </div>

        <!-- Reservations Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-[var(--border)] text-[var(--muted-foreground)] text-xs uppercase tracking-wider">
                <th class="text-left py-2.5 px-3">Date & Time</th>
                <th class="text-left py-2.5 px-3">Reservation / Place</th>
                <th class="text-left py-2.5 px-3">Location & Map</th>
                <th class="text-center py-2.5 px-3">Status</th>
                <th class="text-left py-2.5 px-3">Confirmation / Door Code</th>
                <th class="text-left py-2.5 px-3">Cancellation Policy & Notes</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--border)]">
              <tr
                v-for="(r, idx) in filteredReservations"
                :key="idx"
                class="hover:bg-[var(--card-hover)] transition-colors"
                :class="r.special ? 'bg-pink-500/[0.04]' : ''"
              >
                <!-- Date -->
                <td class="py-3 px-3 whitespace-nowrap align-top">
                  <div class="font-bold text-[var(--foreground)]">{{ r.date }}</div>
                  <div class="text-xs text-[var(--muted-foreground)] font-mono">{{ r.time || '—' }}</div>
                </td>

                <!-- Name & Type -->
                <td class="py-3 px-3 align-top">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span>{{ getTypeIcon(r.type) }}</span>
                    <span class="font-bold text-[var(--foreground)]">{{ r.name }}</span>
                    <span v-if="r.special" class="px-2 py-0.5 rounded text-[10px] bg-pink-200 dark:bg-pink-300 text-pink-950 font-extrabold border border-pink-400 shadow-sm">
                      🎂 MOM'S BDAY
                    </span>
                  </div>
                  <button
                    v-if="r.restaurantId"
                    @click="jumpToRestaurant(r.restaurantId)"
                    class="text-[11px] text-amber-400 hover:underline font-semibold mt-1 inline-block"
                  >
                    View Restaurant Profile →
                  </button>
                </td>

                <!-- Location & 1-Tap Maps & Calendar -->
                <td class="py-3 px-3 text-xs align-top">
                  <div class="space-y-1.5">
                    <div class="text-[var(--muted-foreground)]">📍 {{ r.location }}</div>
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <button
                        v-if="r.mapsQuery"
                        @click="openMap(r.mapsQuery)"
                        class="maps-btn text-[10px] py-0.5 px-2"
                        title="Open Map"
                      >
                        <span>📍 Map</span>
                      </button>
                      <button
                        @click="openCalendar(r)"
                        class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-200 dark:bg-purple-300 text-purple-950 border border-purple-400 shadow-sm hover:opacity-90 transition-all flex items-center gap-0.5"
                        title="Add this booking to Apple / Google Calendar"
                      >
                        <span>📅 Cal</span>
                      </button>
                    </div>
                  </div>
                </td>

                <!-- Status & Consensus Votes -->
                <td class="py-3 px-3 text-center whitespace-nowrap align-top space-y-1.5">
                  <span :class="['px-2.5 py-1 rounded-full text-xs font-semibold border inline-block', getStatusClass(r.status)]">
                    {{ r.status }}
                  </span>
                  <!-- Consensus Votes -->
                  <div class="flex items-center justify-center gap-1 mt-1">
                    <button
                      @click.stop="vote(r.id || r.name, 'up')"
                      :class="['vote-btn', isVoted(r.id || r.name, 'up') ? 'active-up' : '']"
                      title="Upvote this reservation"
                    >
                      👍 {{ getVotes(r.id || r.name).up }}
                    </button>
                    <button
                      @click.stop="vote(r.id || r.name, 'down')"
                      :class="['vote-btn', isVoted(r.id || r.name, 'down') ? 'active-down' : '']"
                      title="Downvote this reservation"
                    >
                      👎 {{ getVotes(r.id || r.name).down }}
                    </button>
                    <button
                      v-if="r.isCustom"
                      @click.stop="deleteCustomReservation(r.id)"
                      class="text-[11px] text-rose-400 hover:text-rose-300 font-bold px-1"
                      title="Delete this custom booking"
                    >
                      🗑️
                    </button>
                  </div>
                </td>

                <!-- Custom Confirmation / Lockbox Code -->
                <td class="py-3 px-3 align-top sm:w-48">
                  <div class="space-y-1">
                    <div class="flex items-center gap-1">
                      <input
                        :value="getBookingCode(r.name)"
                        @input="saveBookingField(r.name, 'code', $event.target.value)"
                        type="text"
                        placeholder="e.g. GY-9821 / PIN 4912"
                        class="w-full text-xs px-2 py-1 rounded-lg bg-[var(--background)] border border-[var(--border)] font-mono text-[var(--foreground)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none"
                      />
                      <button
                        v-if="getBookingCode(r.name)"
                        @click="copyCode(getBookingCode(r.name), r.name)"
                        class="px-1.5 py-1 rounded bg-[var(--card)] hover:bg-[var(--border)] border border-[var(--border)] text-[10px] font-bold text-[var(--foreground)]"
                        title="Copy code to clipboard"
                      >
                        {{ copiedCodeName === r.name ? '✓' : '📋' }}
                      </button>
                    </div>
                    <div v-if="copiedCodeName === r.name" class="text-[10px] text-emerald-400 font-bold">
                      Copied!
                    </div>
                  </div>
                </td>

                <!-- Cancellation Policy & User Notes -->
                <td class="py-3 px-3 text-xs space-y-1.5 align-top">
                  <div v-if="r.cancelPolicy" class="text-amber-400 font-medium">
                    ⚠️ {{ r.cancelPolicy }}
                  </div>
                  <div v-if="r.notes" class="text-[var(--muted-foreground)]">
                    {{ r.notes }}
                  </div>
                  <!-- Custom Personal Notes Input -->
                  <div>
                    <input
                      :value="getBookingNotes(r.name)"
                      @input="saveBookingField(r.name, 'notes', $event.target.value)"
                      type="text"
                      placeholder="📝 Personal note (e.g. Table requested upstairs)..."
                      class="w-full text-[11px] px-2 py-1 rounded bg-[var(--background)]/70 border border-[var(--border)] text-[var(--foreground)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none"
                    />
                  </div>
                </td>
              </tr>
              <tr v-if="filteredReservations.length === 0">
                <td colspan="6" class="text-center py-8 text-sm text-[var(--muted-foreground)]">
                  No reservations match the filter.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
};

