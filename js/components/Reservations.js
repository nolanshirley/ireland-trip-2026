// =============================================================
//  Component: Reservations Tracker
// =============================================================

const Reservations = {
  name: 'Reservations',
  props: {
    reservations: { type: Array, required: true }
  },
  data() {
    return {
      searchQuery: '',
      typeFilter: 'all' // 'all', 'dining', 'activity', 'lodging'
    };
  },
  computed: {
    confirmedCount() {
      return this.reservations.filter(r => r.status.toLowerCase().includes('confirmed') || r.status.toLowerCase().includes('booked')).length;
    },
    filteredReservations() {
      return this.reservations.filter(r => {
        if (this.typeFilter !== 'all' && r.type !== this.typeFilter) return false;
        if (!this.searchQuery.trim()) return true;
        const q = this.searchQuery.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.date.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          (r.notes && r.notes.toLowerCase().includes(q)) ||
          (r.cancelPolicy && r.cancelPolicy.toLowerCase().includes(q))
        );
      });
    }
  },
  methods: {
    getStatusClass(status) {
      const s = status.toLowerCase();
      if (s.includes('confirmed') || s.includes('booked')) {
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
      }
      if (s.includes('pending') || s.includes('review')) {
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/40';
      }
      return 'bg-blue-500/20 text-blue-400 border border-blue-500/40';
    },
    getTypeIcon(type) {
      switch (type) {
        case 'dining': return '🍴';
        case 'activity': return '🎟️';
        case 'lodging': return '🏡';
        case 'transport': return '🚗';
        default: return '📋';
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
            <strong>Oct 13 @ Mister S (Dublin)</strong>. Confirmed table. <span class="text-pink-400 font-semibold">24h cancellation window.</span>
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
            Holohans Pantry & Mad Monk have <strong>48hr</strong> cutoff; Mister S has <strong>24hr</strong> cutoff.
          </p>
        </div>
      </div>

      <!-- Main Tracker Card -->
      <div class="card p-5">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <h2 class="text-xl font-bold tracking-tight">📋 Trip Bookings & Reservations</h2>
            <p class="text-sm text-[var(--muted-foreground)]">Status, confirmation times, and cancellation deadlines</p>
          </div>

          <!-- Type filter -->
          <div class="flex flex-wrap gap-2">
            <button
              v-for="btn in [
                { id: 'all', label: 'All (' + reservations.length + ')' },
                { id: 'dining', label: '🍴 Dining' },
                { id: 'activity', label: '🎟️ Activities' },
                { id: 'lodging', label: '🏡 Lodging' }
              ]"
              :key="btn.id"
              @click="typeFilter = btn.id"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                typeFilter === btn.id
                  ? 'bg-[var(--accent)] text-white shadow'
                  : 'bg-[var(--card-hover)] hover:bg-[var(--border)] text-[var(--foreground)]'
              ]"
            >
              {{ btn.label }}
            </button>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="mb-4">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="🔍 Search reservations by name, date, location..."
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
                <th class="text-left py-2.5 px-3">Location</th>
                <th class="text-center py-2.5 px-3">Status</th>
                <th class="text-left py-2.5 px-3">Cancellation Policy</th>
                <th class="text-left py-2.5 px-3">Notes</th>
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
                <td class="py-3 px-3 whitespace-nowrap">
                  <div class="font-bold text-[var(--foreground)]">{{ r.date }}</div>
                  <div class="text-xs text-[var(--muted-foreground)] font-mono">{{ r.time || '—' }}</div>
                </td>

                <!-- Name & Type -->
                <td class="py-3 px-3">
                  <div class="flex items-center gap-2">
                    <span>{{ getTypeIcon(r.type) }}</span>
                    <span class="font-bold text-[var(--foreground)]">{{ r.name }}</span>
                    <span v-if="r.special" class="px-1.5 py-0.5 rounded text-[10px] bg-pink-500/20 text-pink-300 font-bold">
                      🎂 MOM'S BDAY
                    </span>
                  </div>
                </td>

                <!-- Location -->
                <td class="py-3 px-3 text-xs text-[var(--muted-foreground)]">
                  📍 {{ r.location }}
                </td>

                <!-- Status -->
                <td class="py-3 px-3 text-center whitespace-nowrap">
                  <span :class="['px-2.5 py-1 rounded-full text-xs font-semibold border', getStatusClass(r.status)]">
                    {{ r.status }}
                  </span>
                </td>

                <!-- Cancellation Policy -->
                <td class="py-3 px-3 text-xs">
                  <span v-if="r.cancelPolicy" class="text-amber-400 font-medium">
                    ⚠️ {{ r.cancelPolicy }}
                  </span>
                  <span v-else class="text-[var(--muted-foreground)]">—</span>
                </td>

                <!-- Notes -->
                <td class="py-3 px-3 text-xs text-[var(--muted-foreground)]">
                  {{ r.notes || '—' }}
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
