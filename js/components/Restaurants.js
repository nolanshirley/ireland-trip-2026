// =============================================================
//  Component: Restaurants & Dining Guide (with Cuisine Breakdown)
// =============================================================

const Restaurants = {
  name: 'Restaurants',
  props: {
    restaurants: { type: Array, required: true }
  },
  data() {
    return {
      selectedCity: 'all',
      selectedCuisine: 'all',
      statusFilter: 'all', // 'all', 'favorites', 'birthday', 'booked', 'recommended'
      searchQuery: '',
      sortBy: 'route', // 'route', 'birthday', 'rating', 'price-asc', 'price-desc', 'name'
      userRestaurantData: {}, // { [id]: { rating: 0, notes: '', favorite: false } }
      activeNoteRestId: null
    };
  },
  created() {
    this.loadUserRestaurantData();
  },
  computed: {
    cities() {
      const set = new Set(this.restaurants.map(r => r.city));
      return ['all', ...Array.from(set)];
    },
    favoritesCount() {
      return this.restaurants.filter(r => this.isFavorite(r)).length;
    },
    cuisineStats() {
      const map = {};
      const icons = {
        'Seafood': '🦞',
        'Traditional Irish': '🥔',
        'Fine Dining & Steaks': '🥩',
        'Historic Pubs': '🍻',
        'Pizza & Casual': '🍕',
        'Modern Irish': '🍽️',
        'Casual & Street Food': '🌯',
        'Bakery & Brunch': '🥐'
      };

      this.restaurants.forEach(r => {
        const type = r.cuisineType || 'Other';
        if (!map[type]) {
          map[type] = {
            name: type,
            count: 0,
            icon: icons[type] || '🍴'
          };
        }
        map[type].count++;
      });
      return Object.values(map);
    },
    cuisinesList() {
      return ['all', ...this.cuisineStats.map(c => c.name)];
    },
    filteredRestaurants() {
      const cityOrder = { 'Belfast': 1, 'Galway': 2, 'Killarney': 3, 'Dingle': 4, 'Dublin': 5 };

      const list = this.restaurants.filter(r => {
        // City filter
        if (this.selectedCity !== 'all' && r.city !== this.selectedCity) return false;

        // Cuisine filter
        if (this.selectedCuisine !== 'all' && r.cuisineType !== this.selectedCuisine) return false;

        // Status filter
        if (this.statusFilter === 'favorites' && !this.isFavorite(r)) return false;
        if (this.statusFilter === 'booked' && !r.booked) return false;
        if (this.statusFilter === 'birthday' && !r.birthdayEvent && !r.special) return false;
        if (this.statusFilter === 'recommended' && r.booked) return false;

        // Search query
        if (!this.searchQuery.trim()) return true;
        const q = this.searchQuery.toLowerCase();
        const userNotes = this.getNotes(r).toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q) ||
          r.cuisine.toLowerCase().includes(q) ||
          (r.cuisineType && r.cuisineType.toLowerCase().includes(q)) ||
          (r.birthdayEvent && r.birthdayEvent.toLowerCase().includes(q)) ||
          (r.notes && r.notes.toLowerCase().includes(q)) ||
          userNotes.includes(q)
        );
      });

      return list.sort((a, b) => {
        if (this.sortBy === 'birthday') {
          const aBday = a.birthdayEvent || a.special ? 1 : 0;
          const bBday = b.birthdayEvent || b.special ? 1 : 0;
          if (aBday !== bBday) return bBday - aBday;
        }
        if (this.sortBy === 'rating') {
          const aFav = this.isFavorite(a) ? 1 : 0;
          const bFav = this.isFavorite(b) ? 1 : 0;
          const aRate = this.getRating(a);
          const bRate = this.getRating(b);
          if (aRate !== bRate) return bRate - aRate;
          if (aFav !== bFav) return bFav - aFav;
        }
        if (this.sortBy === 'price-asc') {
          const aP = (a.price || '€€').length;
          const bP = (b.price || '€€').length;
          return aP - bP;
        }
        if (this.sortBy === 'price-desc') {
          const aP = (a.price || '€€').length;
          const bP = (b.price || '€€').length;
          return bP - aP;
        }
        if (this.sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        // Default: 'route' (Itinerary Order: Belfast -> Galway -> Killarney -> Dublin)
        const aRank = cityOrder[a.city] || 99;
        const bRank = cityOrder[b.city] || 99;
        if (aRank !== bRank) return aRank - bRank;
        const aBday = a.birthdayEvent || a.special ? 1 : 0;
        const bBday = b.birthdayEvent || b.special ? 1 : 0;
        return bBday - aBday;
      });
    }
  },
  methods: {
    loadUserRestaurantData() {
      try {
        const saved = localStorage.getItem('ireland_restaurant_user_data');
        if (saved) {
          this.userRestaurantData = JSON.parse(saved);
        }
      } catch (e) {
        console.error('Error loading user restaurant data', e);
      }
    },
    saveUserRestaurantData() {
      localStorage.setItem('ireland_restaurant_user_data', JSON.stringify(this.userRestaurantData));
    },
    ensureRestData(r) {
      const id = r.id || r.name;
      if (!this.userRestaurantData[id]) {
        this.userRestaurantData[id] = { rating: 0, notes: '', favorite: false };
      }
      return id;
    },
    toggleFavorite(r) {
      const id = this.ensureRestData(r);
      this.userRestaurantData[id].favorite = !this.userRestaurantData[id].favorite;
      this.userRestaurantData = { ...this.userRestaurantData };
      this.saveUserRestaurantData();
    },
    isFavorite(r) {
      const id = r.id || r.name;
      return Boolean(this.userRestaurantData[id] && this.userRestaurantData[id].favorite);
    },
    setRating(r, stars) {
      const id = this.ensureRestData(r);
      if (this.userRestaurantData[id].rating === stars) {
        this.userRestaurantData[id].rating = 0; // Toggle off
      } else {
        this.userRestaurantData[id].rating = stars;
      }
      this.userRestaurantData = { ...this.userRestaurantData };
      this.saveUserRestaurantData();
    },
    getRating(r) {
      const id = r.id || r.name;
      return (this.userRestaurantData[id] && this.userRestaurantData[id].rating) || 0;
    },
    saveNotes(r, val) {
      const id = this.ensureRestData(r);
      this.userRestaurantData[id].notes = val;
      this.userRestaurantData = { ...this.userRestaurantData };
      this.saveUserRestaurantData();
    },
    getNotes(r) {
      const id = r.id || r.name;
      return (this.userRestaurantData[id] && this.userRestaurantData[id].notes) || '';
    },
    selectCuisineFilter(c) {
      this.selectedCuisine = this.selectedCuisine === c ? 'all' : c;
    },
    getCuisineIcon(type) {
      switch (type) {
        case 'Seafood': return '🦞';
        case 'Traditional Irish': return '🥔';
        case 'Fine Dining & Steaks': return '🥩';
        case 'Historic Pubs': return '🍻';
        case 'Pizza & Casual': return '🍕';
        case 'Modern Irish': return '🍽️';
        case 'Casual & Street Food': return '🌯';
        case 'Bakery & Brunch': return '🥐';
        default: return '🍴';
      }
    },
    getStatusBadge(r) {
      if (r.birthdayEvent || (r.special && r.name === 'Mister S')) {
        return {
          label: '🎂 Birthday Celebration',
          class: 'bg-pink-200 dark:bg-pink-300 text-pink-950 border border-pink-400 font-extrabold shadow-sm'
        };
      }
      if (r.booked) {
        return {
          label: '✅ Booked',
          class: 'bg-emerald-200 dark:bg-emerald-300 text-emerald-950 border border-emerald-400 font-extrabold shadow-sm'
        };
      }
      return {
        label: '💡 Recommended',
        class: 'bg-blue-200 dark:bg-blue-300 text-blue-950 border border-blue-400 font-extrabold shadow-sm'
      };
    },
    getPriceLabel(price) {
      if (!price) return '€€';
      return price;
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
          title: r.name + ' (Dining/Dinner)',
          day: r.date || 'Oct 2',
          time: r.bookingTime || '7:00 PM',
          location: (r.mapsQuery || r.name) + ', ' + r.city + ', Ireland',
          notes: `Cuisine: ${r.cuisineType} (${r.cuisine}) | Price: ${r.price || '€€'} | Notes: ${r.notes || ''} ${r.cancelPolicy ? '| Cancel Policy: ' + r.cancelPolicy : ''}`
        });
      }
    },
    resetFilters() {
      this.selectedCity = 'all';
      this.selectedCuisine = 'all';
      this.statusFilter = 'all';
      this.searchQuery = '';
    }
  },
  template: `
    <div class="space-y-6">
      <!-- Context Callouts: Birthday Anchors -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Dad & Erin Double Birthday Context -->
        <div class="card p-4 border-l-4 border-blue-500 bg-blue-500/[0.04] flex items-start gap-3">
          <span class="text-2xl">🎂</span>
          <div>
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-sm text-[var(--foreground)]">Oct 7 (Wed): Dad & Erin's Double Birthday</h4>
              <span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-200 dark:bg-blue-300 text-blue-950 border border-blue-400">Galway</span>
            </div>
            <p class="text-xs text-[var(--muted-foreground)] mt-1">
              Celebration dinner at <strong>Ruibin</strong> (modern seasonal dockside) or <strong>Dough Bros</strong> (Ireland's #1 pizza) + trad music pints in Latin Quarter.
            </p>
          </div>
        </div>

        <!-- Mom's Birthday Dinner Context -->
        <div class="card p-4 border-l-4 border-pink-500 bg-pink-500/[0.04] flex items-start gap-3">
          <span class="text-2xl">🎂</span>
          <div>
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-sm text-[var(--foreground)]">Oct 13 (Tue @ 5:15 PM): Mom's Birthday Dinner</h4>
              <span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-pink-200 dark:bg-pink-300 text-pink-950 border border-pink-400">Dublin</span>
            </div>
            <p class="text-xs text-[var(--muted-foreground)] mt-1">
              Confirmed anchor reservation at <strong>Mister S</strong> (Camden St). High-end wood-fired steaks. <span class="text-pink-600 dark:text-pink-300 font-bold">Strict 24hr cancellation window. Formal attire.</span>
            </p>
          </div>
        </div>
      </div>

      <!-- Cuisine Types Breakdown Grid (Clickable) -->
      <div>
        <div class="flex items-center justify-between mb-2.5">
          <h3 class="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Browse by Cuisine Type</h3>
          <button
            v-if="selectedCuisine !== 'all'"
            @click="selectedCuisine = 'all'"
            class="text-xs text-[var(--accent)] hover:underline font-semibold"
          >
            Clear Cuisine Filter (Showing: {{ selectedCuisine }})
          </button>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <div
            v-for="c in cuisineStats"
            :key="c.name"
            @click="selectCuisineFilter(c.name)"
            :class="[
              'card p-2.5 cursor-pointer text-center transition-all duration-150 flex flex-col items-center justify-center gap-1 hover:scale-[1.02]',
              selectedCuisine === c.name
                ? 'ring-2 ring-[var(--accent)] bg-[var(--accent)]/10 shadow-sm'
                : 'hover:bg-[var(--card-hover)]'
            ]"
          >
            <span class="text-xl">{{ c.icon }}</span>
            <div class="font-semibold text-xs text-[var(--foreground)] leading-tight truncate w-full">{{ c.name }}</div>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono text-[var(--muted-foreground)] bg-[var(--card-hover)]">
              {{ c.count }} {{ c.count === 1 ? 'place' : 'places' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Main Controls & Filters Bar -->
      <div class="card p-5 space-y-4">
        <!-- Row 1: Title & Status Filters -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold tracking-tight">🍴 Restaurants & Pubs Directory</h2>
            <p class="text-sm text-[var(--muted-foreground)]">
              Showing {{ filteredRestaurants.length }} of {{ restaurants.length }} places
            </p>
          </div>

          <!-- Status Filter -->
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="st in [
                { id: 'all', label: 'All Statuses' },
                { id: 'favorites', label: '❤️ Favorites (' + favoritesCount + ')' },
                { id: 'birthday', label: '🎂 Birthday Venues' },
                { id: 'booked', label: '✅ Booked Only' },
                { id: 'recommended', label: '💡 Recommendations' }
              ]"
              :key="st.id"
              @click="statusFilter = st.id"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                statusFilter === st.id
                  ? 'bg-[var(--accent)] text-white shadow'
                  : 'bg-[var(--card-hover)] hover:bg-[var(--border)] text-[var(--foreground)]',
                st.id === 'favorites' && statusFilter !== 'favorites' ? 'text-rose-400 border border-rose-500/30 font-semibold' : '',
                st.id === 'birthday' && statusFilter !== 'birthday' ? 'text-pink-400 border border-pink-500/30' : ''
              ]"
            >
              {{ st.label }}
            </button>
          </div>
        </div>

        <!-- Row 2: Location Pills -->
        <div>
          <div class="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">Filter by Location:</div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="city in cities"
              :key="city"
              @click="selectedCity = city"
              :class="[
                'px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors',
                selectedCity === city
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'bg-[var(--card-hover)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              ]"
            >
              {{ city === 'all' ? 'All Locations' : city }}
            </button>
          </div>
        </div>

        <!-- Row 3: Smart Sort By Controls -->
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Sort By:</span>
          <button
            v-for="s in [
              { id: 'route', label: '🗓️ Route Order' },
              { id: 'birthday', label: '🎂 Milestones First' },
              { id: 'rating', label: '⭐ Top Rated & Favs' },
              { id: 'price-asc', label: '💶 Price: Low → High' },
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

        <!-- Row 4: Search Bar & Reset -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[var(--border)]">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="🔍 Search by name, cuisine (e.g. 'seafood', 'boxty'), dish, or notes..."
            class="w-full sm:max-w-md px-3.5 py-2 text-sm rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)]"
          />

          <button
            v-if="selectedCity !== 'all' || selectedCuisine !== 'all' || statusFilter !== 'all' || sortBy !== 'route' || searchQuery.trim()"
            @click="resetFilters"
            class="text-xs text-rose-400 hover:text-rose-300 font-semibold self-start sm:self-auto"
          >
            ✕ Reset All Filters
          </button>
        </div>
      </div>

      <!-- Restaurant Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="r in filteredRestaurants"
          :key="r.name"
          :id="'restaurant-' + r.id"
          class="card p-4 flex flex-col justify-between hover:shadow-md transition-all duration-150"
          :class="[
            r.birthdayEvent || r.special
              ? 'ring-2 ring-pink-500/60 bg-pink-500/[0.03]'
              : (isFavorite(r) ? 'ring-1 ring-rose-500/50 bg-rose-500/[0.02]' : (r.booked ? 'ring-1 ring-emerald-500/40 bg-emerald-500/[0.02]' : ''))
          ]"
        >
          <div>
            <!-- Birthday Ribbon Badge if applicable -->
            <div
              v-if="r.birthdayEvent"
              class="mb-3 px-2.5 py-1 rounded-lg bg-pink-200 dark:bg-pink-300 border border-pink-400 text-pink-950 font-extrabold text-[11px] flex items-center gap-1.5 shadow-sm"
            >
              <span>🎂</span>
              <span>{{ r.birthdayEvent }}</span>
            </div>

            <!-- Top Row: Name + Favorite Heart + Status Badge -->
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="flex items-start gap-1.5">
                <button
                  @click.stop="toggleFavorite(r)"
                  class="text-base transition-transform active:scale-125 hover:scale-110 mt-0.5"
                  :title="isFavorite(r) ? 'Remove from favorites' : 'Add to favorites'"
                >
                  {{ isFavorite(r) ? '❤️' : '🤍' }}
                </button>
                <div>
                  <h3 class="font-bold text-base text-[var(--foreground)] leading-snug">{{ r.name }}</h3>
                  <div class="text-xs text-[var(--muted-foreground)] flex items-center gap-1.5 mt-0.5">
                    <span>📍 {{ r.city }}</span>
                    <span>·</span>
                    <span class="font-mono text-[var(--accent)]">{{ getPriceLabel(r.price) }}</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-1.5 flex-wrap justify-end">
                <button
                  v-if="r.mapsQuery"
                  @click.stop="openMap(r.mapsQuery)"
                  class="maps-btn text-[10px] py-0.5 px-2"
                  title="Open in Apple Maps or Google Maps"
                >
                  <span>📍 Map</span>
                </button>
                <button
                  @click.stop="openCalendar(r)"
                  class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-200 dark:bg-purple-300 text-purple-950 border border-purple-400 shadow-sm hover:opacity-90 transition-all flex items-center gap-0.5"
                  title="Add this dining/restaurant to Apple / Google Calendar"
                >
                  <span>📅 Cal</span>
                </button>
                <span :class="['px-2 py-0.5 rounded text-[11px] whitespace-nowrap', getStatusBadge(r).class]">
                  {{ getStatusBadge(r).label }}
                </span>
              </div>
            </div>

            <!-- Cuisine Type Tags -->
            <div class="flex items-center gap-1.5 flex-wrap mb-2.5">
              <span
                @click="selectCuisineFilter(r.cuisineType)"
                class="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent)]/25 transition-colors"
                :title="'Filter by ' + r.cuisineType"
              >
                <span>{{ getCuisineIcon(r.cuisineType) }}</span>
                <span>{{ r.cuisineType }}</span>
              </span>
              <span class="text-[11px] text-[var(--muted-foreground)]">· {{ r.cuisine }}</span>
            </div>

            <!-- Notes / Highlights -->
            <p class="text-xs text-[var(--muted-foreground)] leading-relaxed mb-3">
              {{ r.notes }}
            </p>

            <!-- Personal 5-Star Rating & Notes Box (Saved Offline) -->
            <div class="p-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] space-y-2 mb-2">
              <div class="flex items-center justify-between">
                <div class="text-[11px] font-semibold text-[var(--foreground)] flex items-center gap-1">
                  <span>⭐ Rating:</span>
                  <span class="text-amber-400 font-bold text-xs">
                    {{ getRating(r) > 0 ? getRating(r) + '/5' : 'Unrated' }}
                  </span>
                </div>
                <!-- 5 Interactive Stars -->
                <div class="flex items-center gap-0.5 text-sm cursor-pointer select-none">
                  <span
                    v-for="s in 5"
                    :key="s"
                    @click.stop="setRating(r, s)"
                    class="transition-transform hover:scale-125"
                    :class="s <= getRating(r) ? 'text-amber-400' : 'text-zinc-600 hover:text-amber-300'"
                    :title="'Rate ' + s + ' stars'"
                  >
                    ★
                  </span>
                </div>
              </div>

              <!-- Personal Dishes to Try / Order Notes -->
              <div>
                <input
                  :value="getNotes(r)"
                  @input="saveNotes(r, $event.target.value)"
                  type="text"
                  placeholder="📝 Dishes to try / table notes..."
                  class="w-full text-[11px] px-2 py-1 rounded bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <!-- Bottom: Booking Time/Details if present -->
          <div v-if="r.bookingTime || r.booked" class="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-emerald-400 font-medium">
            <span>📅 {{ r.bookingTime || 'Reservation Active' }}</span>
            <span v-if="r.cancelPolicy" class="text-[10px] text-amber-400 font-semibold">⚠️ {{ r.cancelPolicy }}</span>
          </div>
        </div>
      </div>

      <div v-if="filteredRestaurants.length === 0" class="card p-8 text-center text-sm text-[var(--muted-foreground)]">
        No restaurants match your search or filter criteria.
        <div class="mt-2">
          <button @click="resetFilters" class="text-xs text-[var(--accent)] underline font-semibold">
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  `
};
