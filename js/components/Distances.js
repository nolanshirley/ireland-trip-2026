// =============================================================
//  Component: Distances & Driving Matrix
// =============================================================

const Distances = {
  name: 'Distances',
  props: {
    distances: { type: Array, required: true }
  },
  data() {
    return {
      searchQuery: '',
      filterType: 'all', // 'all', 'transfers', 'daytrips', 'high'
      sortBy: 'route' // 'route', 'longest', 'shortest', 'alphabetical'
    };
  },
  computed: {
    filteredDistances() {
      const list = this.distances.filter(d => {
        // filter type
        if (this.filterType === 'transfers' && !d.transfer) return false;
        if (this.filterType === 'daytrips' && d.transfer) return false;
        if (this.filterType === 'high' && d.urgency !== 'high') return false;

        // search query
        if (!this.searchQuery.trim()) return true;
        const q = this.searchQuery.toLowerCase();
        return (
          d.from.toLowerCase().includes(q) ||
          d.to.toLowerCase().includes(q) ||
          (d.notes && d.notes.toLowerCase().includes(q)) ||
          (d.time && d.time.toLowerCase().includes(q))
        );
      });

      return list.sort((a, b) => {
        if (this.sortBy === 'longest') {
          return this.parseMinutes(b.time) - this.parseMinutes(a.time);
        }
        if (this.sortBy === 'shortest') {
          return this.parseMinutes(a.time) - this.parseMinutes(b.time);
        }
        if (this.sortBy === 'alphabetical') {
          return a.from.localeCompare(b.from);
        }
        // Default: 'route' (natural itinerary sequence)
        return 0;
      });
    },
    transferCount() {
      return this.distances.filter(d => d.transfer).length;
    },
    longDriveCount() {
      return this.distances.filter(d => d.urgency === 'high').length;
    }
  },
  methods: {
    parseMinutes(timeStr) {
      if (!timeStr) return 0;
      let total = 0;
      const hMatch = timeStr.match(/(\d+)\s*h/i);
      const mMatch = timeStr.match(/(\d+)\s*m/i);
      if (hMatch) total += parseInt(hMatch[1]) * 60;
      if (mMatch) total += parseInt(mMatch[1]);
      return total;
    },
    getUrgencyClass(urgency) {
      if (urgency === 'high') return 'bg-red-200 dark:bg-red-300 text-red-950 border border-red-400 font-extrabold shadow-sm';
      if (urgency === 'med') return 'bg-amber-200 dark:bg-amber-300 text-amber-950 border border-amber-400 font-extrabold shadow-sm';
      return 'bg-emerald-200 dark:bg-emerald-300 text-emerald-950 border border-emerald-400 font-extrabold shadow-sm';
    },
    getUrgencyLabel(urgency) {
      if (urgency === 'high') return '⚠️ Long Drive';
      if (urgency === 'med') return '⏱️ Moderate';
      return '✅ Easy';
    },
    openRoute(d) {
      if (window.TravelApp) {
        window.TravelApp.triggerRoute(d.from, d.to);
      } else {
        const origin = encodeURIComponent(`${(d.from || '').replace(/\+/g, ' ')}, Ireland`);
        const dest = encodeURIComponent(`${(d.to || '').replace(/\+/g, ' ')}, Ireland`);
        window.open(`https://maps.apple.com/?saddr=${origin}&daddr=${dest}&dirflg=d`, '_blank');
      }
    },
    getRouteMapsUrl(d) {
      const origin = encodeURIComponent(`${(d.from || '').replace(/\+/g, ' ')}, Ireland`);
      const dest = encodeURIComponent(`${(d.to || '').replace(/\+/g, ' ')}, Ireland`);
      return `https://maps.apple.com/?saddr=${origin}&daddr=${dest}&dirflg=d`;
    }
  },
  template: `
    <div class="space-y-6">
      <!-- Summary Callouts -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="card p-4 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-xl">🚗</div>
          <div>
            <div class="text-xs text-[var(--muted-foreground)]">Total Routes Logged</div>
            <div class="text-xl font-bold">{{ distances.length }} Legs</div>
          </div>
        </div>
        <div class="card p-4 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-xl">🔄</div>
          <div>
            <div class="text-xs text-[var(--muted-foreground)]">Base Transfers</div>
            <div class="text-xl font-bold">{{ transferCount }} Moves</div>
          </div>
        </div>
        <div class="card p-4 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-xl">⚠️</div>
          <div>
            <div class="text-xs text-[var(--muted-foreground)]">Heavy Driving Days (>2.5h)</div>
            <div class="text-xl font-bold">{{ longDriveCount }} Routes</div>
          </div>
        </div>
      </div>

      <!-- Main Distance Matrix Table -->
      <div class="card p-5 space-y-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold tracking-tight">📏 Driving Distances & Times</h2>
            <p class="text-sm text-[var(--muted-foreground)]">Plan driving breaks and tap any route to launch Google Maps turn-by-turn directions</p>
          </div>

          <!-- Quick Filters -->
          <div class="flex flex-wrap gap-2">
            <button
              v-for="btn in [
                { id: 'all', label: 'All Routes' },
                { id: 'transfers', label: '🔄 Base Transfers' },
                { id: 'daytrips', label: '📍 Day Trips' },
                { id: 'high', label: '⚠️ Long Drives' }
              ]"
              :key="btn.id"
              @click="filterType = btn.id"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                filterType === btn.id
                  ? 'bg-[var(--accent)] text-white shadow'
                  : 'bg-[var(--card-hover)] hover:bg-[var(--border)] text-[var(--foreground)]'
              ]"
            >
              {{ btn.label }}
            </button>
          </div>
        </div>

        <!-- Sort Controls & Search Bar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[var(--border)]">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Sort By:</span>
            <button
              v-for="s in [
                { id: 'route', label: '🗓️ Route Order' },
                { id: 'longest', label: '⏱️ Longest First' },
                { id: 'shortest', label: '⚡ Shortest First' },
                { id: 'alphabetical', label: '🔤 From A–Z' }
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

          <input
            v-model="searchQuery"
            type="text"
            placeholder="🔍 Search routes by origin, destination..."
            class="w-full sm:max-w-xs px-3.5 py-1.5 text-xs rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)]"
          />
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-[var(--border)] text-[var(--muted-foreground)] text-xs uppercase tracking-wider">
                <th class="text-left py-2.5 px-3">From</th>
                <th class="text-left py-2.5 px-3">To</th>
                <th class="text-center py-2.5 px-3">Driving Time</th>
                <th class="text-center py-2.5 px-3">Type / Urgency</th>
                <th class="text-left py-2.5 px-3">Notes & Highlights</th>
                <th class="text-right py-2.5 px-3">Directions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--border)]">
              <tr
                v-for="(d, idx) in filteredDistances"
                :key="idx"
                :class="['hover:bg-[var(--card-hover)] transition-colors', d.transfer ? 'bg-blue-500/[0.03]' : '']"
              >
                <td class="py-3 px-3 font-semibold text-[var(--foreground)]">{{ d.from }}</td>
                <td class="py-3 px-3 font-semibold text-[var(--foreground)]">{{ d.to }}</td>
                <td class="text-center py-3 px-3 whitespace-nowrap">
                  <span class="font-mono font-bold text-sm text-[var(--foreground)]">{{ d.time }}</span>
                </td>
                <td class="text-center py-3 px-3 whitespace-nowrap">
                  <span :class="['px-2.5 py-0.5 rounded-full text-xs font-medium', getUrgencyClass(d.urgency)]">
                    {{ getUrgencyLabel(d.urgency) }}
                  </span>
                </td>
                <td class="py-3 px-3 text-xs text-[var(--muted-foreground)]">
                  <div class="flex items-center gap-2">
                    <span v-if="d.transfer" class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-200 dark:bg-blue-300 text-blue-950 border border-blue-400 flex-shrink-0 shadow-sm">
                      TRANSFER
                    </span>
                    <span>{{ d.notes }}</span>
                  </div>
                </td>
                <td class="py-3 px-3 text-right whitespace-nowrap">
                  <button
                    @click="openRoute(d)"
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-800 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition-all shadow-sm"
                    title="Open Driving Directions"
                  >
                    <span>🚗 Route</span>
                    <span>↗</span>
                  </button>
                </td>
              </tr>
              <tr v-if="filteredDistances.length === 0">
                <td colspan="6" class="text-center py-8 text-sm text-[var(--muted-foreground)]">
                  No routes match current filters.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
};

