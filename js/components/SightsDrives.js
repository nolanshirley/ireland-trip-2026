// =============================================================
//  Component: Sights & Driving Matrix (Unified Logistics Hub)
//  Includes Regional Heat Map, Driving Routes, and City Shopping
// =============================================================

const SightsDrives = {
  name: 'SightsDrives',
  emits: ['switch-tab'],
  props: {
    regions: { type: Array, required: true },
    attractions: { type: Object, required: true },
    distances: { type: Array, required: true },
    shoppingVenues: {
      type: Array,
      default: () => (typeof shoppingVenuesData !== 'undefined' ? shoppingVenuesData : [])
    }
  },
  components: {
    'heat-map': HeatMap,
    'distances-view': Distances
  },
  data() {
    return {
      activeSubTab: 'heatmap', // 'heatmap', 'distances', 'shopping'
      shoppingCategoryFilter: 'all', // 'all', 'pianos', 'art', 'jewelry', 'books', 'wool', 'trinkets'
      shoppingCityFilter: 'all', // 'all', 'Dublin', 'Galway', 'Dingle', 'Belfast'
      shoppingSearchQuery: ''
    };
  },
  computed: {
    venueList() {
      if (this.shoppingVenues && this.shoppingVenues.length > 0) {
        return this.shoppingVenues;
      }
      return typeof shoppingVenuesData !== 'undefined' ? shoppingVenuesData : [];
    },
    filteredShoppingVenues() {
      return this.venueList.filter(item => {
        if (this.shoppingCategoryFilter !== 'all' && item.category !== this.shoppingCategoryFilter) return false;
        if (this.shoppingCityFilter !== 'all' && item.city !== this.shoppingCityFilter) return false;
        if (!this.shoppingSearchQuery.trim()) return true;
        const q = this.shoppingSearchQuery.toLowerCase();
        return (
          (item.name && item.name.toLowerCase().includes(q)) ||
          (item.highlight && item.highlight.toLowerCase().includes(q)) ||
          (item.desc && item.desc.toLowerCase().includes(q)) ||
          (item.address && item.address.toLowerCase().includes(q)) ||
          (item.city && item.city.toLowerCase().includes(q)) ||
          (item.tags && item.tags.some(t => t.toLowerCase().includes(q)))
        );
      });
    },
    shoppingCategoryCounts() {
      const counts = { all: this.venueList.length, pianos: 0, art: 0, jewelry: 0, books: 0, wool: 0, trinkets: 0 };
      this.venueList.forEach(v => {
        if (counts[v.category] !== undefined) counts[v.category]++;
      });
      return counts;
    }
  },
  methods: {
    setSubTab(tab) {
      this.activeSubTab = tab;
    }
  },
  template: `
    <div class="space-y-6">
      <!-- Sub-view navigation buttons -->
      <div class="flex items-center gap-2 border-b border-[var(--border)] pb-2 overflow-x-auto no-scrollbar">
        <button
          @click="activeSubTab = 'heatmap'"
          :class="[
            'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap',
            activeSubTab === 'heatmap'
              ? 'bg-[var(--accent)] text-white shadow-sm'
              : 'bg-[var(--card)] hover:bg-[var(--card-hover)] text-[var(--muted-foreground)]'
          ]"
        >
          <span>🗺️</span>
          <span>Regional Heat Map & Attractions</span>
        </button>

        <button
          @click="activeSubTab = 'distances'"
          :class="[
            'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap',
            activeSubTab === 'distances'
              ? 'bg-[var(--accent)] text-white shadow-sm'
              : 'bg-[var(--card)] hover:bg-[var(--card-hover)] text-[var(--muted-foreground)]'
          ]"
        >
          <span>🚗</span>
          <span>Driving Distances & Turn-by-Turn Routes</span>
        </button>

        <button
          @click="activeSubTab = 'shopping'"
          :class="[
            'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap',
            activeSubTab === 'shopping'
              ? 'bg-[var(--accent)] text-white shadow-sm'
              : 'bg-[var(--card)] hover:bg-[var(--card-hover)] text-[var(--muted-foreground)]'
          ]"
        >
          <span>🛍️</span>
          <span>City Shopping, Trinkets & Piano Stores</span>
        </button>
      </div>

      <!-- Sub-view 1: Heat Map & Attractions -->
      <div v-show="activeSubTab === 'heatmap'">
        <heat-map
          :regions="regions"
          :attractions="attractions"
          @switch-tab="$emit('switch-tab', $event)"
        />
      </div>

      <!-- Sub-view 2: Driving Matrix -->
      <div v-show="activeSubTab === 'distances'">
        <distances-view
          :distances="distances"
        />
      </div>

      <!-- Sub-view 3: City Shopping, Trinkets & Piano Stores -->
      <div v-show="activeSubTab === 'shopping'" class="space-y-6 animate-fadeIn">
        <!-- Header Banner -->
        <div class="card p-5 sm:p-6 border-2 border-[var(--border)] bg-[var(--card)] shadow-md space-y-4">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-2xl">🛍️</span>
                <h2 class="text-xl sm:text-2xl font-black text-[var(--foreground)] tracking-tight">
                  City Shopping, Trinkets &amp; Artistic Shops
                </h2>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                  {{ venueList.length }} Curated Spots
                </span>
              </div>
              <p class="text-xs text-[var(--muted-foreground)]">
                Handpicked guide to Dublin piano showrooms, world instrument galleries, original Claddagh ring jewelers, quirky trinkets, and artisan Irish crafts across Dublin, Galway, Dingle, and Belfast.
              </p>
            </div>
          </div>

          <!-- Filter Controls -->
          <div class="space-y-3">
            <!-- Category Pills -->
            <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
              <button
                @click="shoppingCategoryFilter = 'all'"
                :class="['px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap', shoppingCategoryFilter === 'all' ? 'bg-[var(--accent)] text-white shadow-sm' : 'bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)]']"
              >
                All ({{ shoppingCategoryCounts.all }})
              </button>
              <button
                @click="shoppingCategoryFilter = 'pianos'"
                :class="['px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap', shoppingCategoryFilter === 'pianos' ? 'bg-[var(--accent)] text-white shadow-sm' : 'bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)]']"
              >
                🎹 Piano Stores &amp; Music ({{ shoppingCategoryCounts.pianos }})
              </button>
              <button
                @click="shoppingCategoryFilter = 'art'"
                :class="['px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap', shoppingCategoryFilter === 'art' ? 'bg-[var(--accent)] text-white shadow-sm' : 'bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)]']"
              >
                🎨 Artistic Crafts &amp; Pottery ({{ shoppingCategoryCounts.art }})
              </button>
              <button
                @click="shoppingCategoryFilter = 'jewelry'"
                :class="['px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap', shoppingCategoryFilter === 'jewelry' ? 'bg-[var(--accent)] text-white shadow-sm' : 'bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)]']"
              >
                💍 Claddagh Rings &amp; Gold ({{ shoppingCategoryCounts.jewelry }})
              </button>
              <button
                @click="shoppingCategoryFilter = 'books'"
                :class="['px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap', shoppingCategoryFilter === 'books' ? 'bg-[var(--accent)] text-white shadow-sm' : 'bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)]']"
              >
                📚 Vintage Bookshops ({{ shoppingCategoryCounts.books }})
              </button>
              <button
                @click="shoppingCategoryFilter = 'wool'"
                :class="['px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap', shoppingCategoryFilter === 'wool' ? 'bg-[var(--accent)] text-white shadow-sm' : 'bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)]']"
              >
                🧶 Irish Wool &amp; Weaving ({{ shoppingCategoryCounts.wool }})
              </button>
              <button
                @click="shoppingCategoryFilter = 'trinkets'"
                :class="['px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap', shoppingCategoryFilter === 'trinkets' ? 'bg-[var(--accent)] text-white shadow-sm' : 'bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)]']"
              >
                🛍️ Victorian Markets &amp; Trinkets ({{ shoppingCategoryCounts.trinkets }})
              </button>
            </div>

            <!-- City Filters & Search Bar -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[var(--border)]">
              <!-- City Pills -->
              <div class="flex items-center gap-1.5 flex-wrap text-xs">
                <span class="text-[11px] font-bold text-[var(--muted-foreground)]">City:</span>
                <button
                  v-for="c in ['all', 'Dublin', 'Galway', 'Dingle', 'Belfast']"
                  :key="c"
                  @click="shoppingCityFilter = c"
                  :class="[
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition-all',
                    shoppingCityFilter === c
                      ? 'bg-[var(--foreground)] text-[var(--background)] shadow-sm'
                      : 'bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)]'
                  ]"
                >
                  {{ c === 'all' ? 'All Cities' : c }}
                </button>
              </div>

              <!-- Search Input -->
              <div class="relative w-full sm:w-64">
                <input
                  v-model="shoppingSearchQuery"
                  type="text"
                  placeholder="Search stores, pianos, crafts..."
                  class="w-full p-2 pl-8 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:ring-1 focus:ring-[var(--accent)]"
                />
                <span class="absolute left-2.5 top-2.5 text-xs text-[var(--muted-foreground)]">🔍</span>
                <button
                  v-if="shoppingSearchQuery"
                  @click="shoppingSearchQuery = ''"
                  class="absolute right-2.5 top-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Venue Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="store in filteredShoppingVenues"
            :key="store.id"
            class="p-4 sm:p-5 rounded-2xl bg-[var(--card)] border-2 border-[var(--border)] hover:border-[var(--accent)] transition-all hover:shadow-lg flex flex-col justify-between space-y-3"
          >
            <div class="space-y-2">
              <!-- Top Category & City Badges -->
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)]">
                  {{ store.categoryLabel }}
                </span>
                <span class="font-mono text-xs font-extrabold text-[var(--accent)]">
                  📍 {{ store.city }}
                </span>
              </div>

              <!-- Store Name & Highlight -->
              <div>
                <h3 class="font-black text-base text-[var(--foreground)] leading-snug">
                  {{ store.name }}
                </h3>
                <div class="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                  ★ {{ store.highlight }}
                </div>
              </div>

              <!-- Description -->
              <p class="text-xs text-[var(--foreground)]/85 leading-relaxed">
                {{ store.desc }}
              </p>

              <!-- Tags -->
              <div class="flex items-center gap-1.5 flex-wrap pt-1">
                <span
                  v-for="tag in store.tags"
                  :key="tag"
                  class="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--muted)] text-[var(--foreground)]"
                >
                  #{{ tag }}
                </span>
              </div>
            </div>

            <!-- Bottom Address & Actions -->
            <div class="pt-3 border-t border-[var(--border)] space-y-2 text-xs">
              <div class="text-[11px] font-medium text-[var(--muted-foreground)] flex items-center justify-between gap-2">
                <span class="truncate">📍 {{ store.address }}</span>
                <a
                  v-if="store.phone"
                  :href="'tel:' + store.phone.replace(/[^0-9+]/g, '')"
                  class="text-[11px] font-mono font-bold text-sky-700 dark:text-sky-400 hover:underline flex-shrink-0"
                >
                  📞 {{ store.phone }}
                </a>
              </div>

              <div class="pt-1">
                <a
                  :href="'https://www.google.com/maps/search/?api=1&query=' + store.mapsQuery"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="w-full py-2 px-3 rounded-xl text-xs font-bold bg-[var(--background)] hover:bg-[var(--accent)] hover:text-white border border-[var(--border)] text-[var(--foreground)] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>📍</span>
                  <span>Open in Google Maps</span>
                  <span>↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty Results -->
        <div v-if="filteredShoppingVenues.length === 0" class="card p-8 text-center space-y-2 border-2 border-dashed border-[var(--border)]">
          <span class="text-3xl">🔍</span>
          <div class="font-bold text-sm text-[var(--foreground)]">No shopping spots found</div>
          <p class="text-xs text-[var(--muted-foreground)]">
            Try adjusting your search terms or selecting a different city or category.
          </p>
        </div>
      </div>
    </div>
  `
};
