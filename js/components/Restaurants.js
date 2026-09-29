// =============================================================
//  Component: Restaurants & Dining Guide
// =============================================================

const Restaurants = {
  name: 'Restaurants',
  props: {
    restaurants: { type: Array, required: true }
  },
  data() {
    return {
      selectedCity: 'all',
      statusFilter: 'all', // 'all', 'booked', 'recommended'
      searchQuery: ''
    };
  },
  computed: {
    cities() {
      const set = new Set(this.restaurants.map(r => r.city));
      return ['all', ...Array.from(set)];
    },
    filteredRestaurants() {
      return this.restaurants.filter(r => {
        // City filter
        if (this.selectedCity !== 'all' && r.city !== this.selectedCity) return false;

        // Status filter
        if (this.statusFilter === 'booked' && !r.booked) return false;
        if (this.statusFilter === 'recommended' && r.booked) return false;

        // Search query
        if (!this.searchQuery.trim()) return true;
        const q = this.searchQuery.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q) ||
          r.cuisine.toLowerCase().includes(q) ||
          (r.notes && r.notes.toLowerCase().includes(q))
        );
      });
    }
  },
  methods: {
    getStatusBadge(r) {
      if (r.booked) {
        return {
          label: '✅ Booked',
          class: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold'
        };
      }
      return {
        label: '💡 Recommended',
        class: 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
      };
    },
    getPriceLabel(price) {
      if (!price) return '€€';
      return price;
    }
  },
  template: `
    <div class="space-y-6">
      <!-- Header & Filters -->
      <div class="card p-5">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 class="text-xl font-bold tracking-tight">🍴 Restaurants & Pubs Guide</h2>
            <p class="text-sm text-[var(--muted-foreground)]">Curated dining spots across all 4 regions</p>
          </div>

          <!-- Status Filter -->
          <div class="flex items-center gap-2">
            <button
              v-for="st in [
                { id: 'all', label: 'All Places' },
                { id: 'booked', label: '✅ Booked Only' },
                { id: 'recommended', label: '💡 Recommendations' }
              ]"
              :key="st.id"
              @click="statusFilter = st.id"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                statusFilter === st.id
                  ? 'bg-[var(--accent)] text-white shadow'
                  : 'bg-[var(--card-hover)] hover:bg-[var(--border)] text-[var(--foreground)]'
              ]"
            >
              {{ st.label }}
            </button>
          </div>
        </div>

        <!-- City Selector Pills -->
        <div class="flex flex-wrap gap-1.5 mb-4">
          <button
            v-for="city in cities"
            :key="city"
            @click="selectedCity = city"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
              selectedCity === city
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--card-hover)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            ]"
          >
            {{ city === 'all' ? 'All Locations' : city }}
          </button>
        </div>

        <!-- Search Input -->
        <div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="🔍 Search by restaurant name, cuisine, city, or special dish..."
            class="w-full sm:max-w-md px-3.5 py-2 text-sm rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)]"
          />
        </div>
      </div>

      <!-- Restaurant Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="r in filteredRestaurants"
          :key="r.name"
          class="card p-4 flex flex-col justify-between hover:shadow-md transition-all duration-150"
          :class="r.booked ? 'ring-1 ring-emerald-500/40 bg-emerald-500/[0.02]' : ''"
        >
          <div>
            <!-- Top Row: Name + Status Badge -->
            <div class="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 class="font-bold text-base text-[var(--foreground)] leading-snug">{{ r.name }}</h3>
                <div class="text-xs text-[var(--muted-foreground)] flex items-center gap-1.5 mt-0.5">
                  <span>📍 {{ r.city }}</span>
                  <span>·</span>
                  <span class="font-mono text-[var(--accent)]">{{ getPriceLabel(r.price) }}</span>
                </div>
              </div>
              <span :class="['px-2 py-0.5 rounded text-[11px] whitespace-nowrap', getStatusBadge(r).class]">
                {{ getStatusBadge(r).label }}
              </span>
            </div>

            <!-- Cuisine Badge -->
            <div class="mb-3">
              <span class="inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--card-hover)] text-[var(--foreground)] border border-[var(--border)]">
                🍽️ {{ r.cuisine }}
              </span>
            </div>

            <!-- Notes / Highlights -->
            <p class="text-xs text-[var(--muted-foreground)] leading-relaxed mb-3">
              {{ r.notes }}
            </p>
          </div>

          <!-- Bottom: Booking Time/Details if present -->
          <div v-if="r.bookingTime || r.booked" class="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-emerald-400 font-medium">
            <span>📅 {{ r.bookingTime || 'Reservation Active' }}</span>
            <span v-if="r.cancelPolicy" class="text-[10px] text-amber-400">⚠️ {{ r.cancelPolicy }}</span>
          </div>
        </div>
      </div>

      <div v-if="filteredRestaurants.length === 0" class="card p-8 text-center text-sm text-[var(--muted-foreground)]">
        No restaurants match your search or filter criteria.
      </div>
    </div>
  `
};
