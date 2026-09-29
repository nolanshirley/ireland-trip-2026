// =============================================================
//  Vue 3 Ireland Trip App
// =============================================================

const { createApp, ref, computed, onMounted, watch, nextTick } = Vue;

const app = createApp({
  components: {
    'heat-map': HeatMap,
    'distances-view': Distances,
    'daily-planner': DailyPlanner,
    'weather-packing': WeatherPacking,
    'hiking-nature': HikingNature,
    'restaurants-view': Restaurants,
    'reservations-view': Reservations
  },
  setup() {
    const trip = ref(TRIP);
    const regionList = ref(regions);
    const attractionMap = ref(attractions);
    const distanceList = ref(distances);
    const timelineList = ref(timeline);
    const restaurantList = ref(restaurants);
    const reservationList = ref(reservations);
    const weatherInfo = ref(weatherData);
    const outfitList = ref(outfitGuides);
    const trailList = ref(hikingTrails);

    // Active Tab State (default to planner)
    const activeTab = ref('planner');

    const tabs = [
      { id: 'planner', label: '📅 Daily Schedule', shortLabel: 'Schedule', icon: '📅' },
      { id: 'weather', label: '🌦️ Weather & Outfits', shortLabel: 'Weather', icon: '🌦️' },
      { id: 'hiking', label: '🥾 Hiking & Trails', shortLabel: 'Trails', icon: '🥾' },
      { id: 'restaurants', label: '🍴 Restaurants', shortLabel: 'Food', icon: '🍴' },
      { id: 'heatmap', label: '🗺️ Map & Attractions', shortLabel: 'Map', icon: '🗺️' },
      { id: 'distances', label: '📏 Distances', shortLabel: 'Distances', icon: '📏' },
      { id: 'reservations', label: '📋 Reservations', shortLabel: 'Bookings', icon: '📋' }
    ];

    // Detail Modal / Bottom Sheet Reactive State
    const selectedDetailItem = ref(null);
    const selectedDetailDay = ref(null);
    const isDetailModalOpen = ref(false);

    const openDetailModal = (payload) => {
      if (!payload || !payload.item) return;
      selectedDetailItem.value = payload.item;
      selectedDetailDay.value = payload.day || null;
      isDetailModalOpen.value = true;
      document.body.style.overflow = 'hidden';
    };

    const closeDetailModal = () => {
      isDetailModalOpen.value = false;
      selectedDetailItem.value = null;
      selectedDetailDay.value = null;
      document.body.style.overflow = '';
    };

    // Deep jump between tabs & scroll to target element
    const handleSwitchTab = ({ tab, targetId }) => {
      if (tab) {
        activeTab.value = tab;
      }
      if (isDetailModalOpen.value) {
        closeDetailModal();
      }
      if (targetId) {
        nextTick(() => {
          setTimeout(() => {
            const el = document.getElementById(targetId) ||
                       document.getElementById('trail-' + targetId) ||
                       document.getElementById('restaurant-' + targetId);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('card-highlight');
              setTimeout(() => el.classList.remove('card-highlight'), 2200);
            }
          }, 150);
        });
      }
    };

    const getGoogleMapsUrl = (query) => {
      if (!query) return '#';
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    };

    // ── Color Palettes & Accessibility Tokens ──────────────────
    const palettes = [
      { id: 'emerald', name: 'Emerald Isle', desc: 'Shamrock & Forest Green', color: '#10b981', icon: '🍀' },
      { id: 'atlantic', name: 'Wild Atlantic', desc: 'Ocean Teal & Marine Blue', color: '#06b6d4', icon: '🌊' },
      { id: 'amber', name: 'Guinness & Whiskey', desc: 'Roasted Malt & Golden Amber', color: '#f59e0b', icon: '🍺' },
      { id: 'heather', name: 'Connemara Heather', desc: 'Twilight Violet & Lavender', color: '#a855f7', icon: '🪻' },
      { id: 'autumn', name: 'Killarney Autumn', desc: 'Burnt Russet & Foliage Copper', color: '#f97316', icon: '🍁' },
      { id: 'cyber', name: 'Midnight OLED', desc: 'Pitch Black & Electric Mint', color: '#00ff9d', icon: '⚡' }
    ];

    const selectedPalette = ref('emerald');

    const setPalette = (id) => {
      selectedPalette.value = id;
      localStorage.setItem('ireland_palette', id);
      applyPalette();
    };

    const applyPalette = () => {
      const el = document.documentElement;
      palettes.forEach(p => el.classList.remove(`theme-${p.id}`));
      el.classList.add(`theme-${selectedPalette.value}`);
    };

    // ── Font Size & Text Scaling ──────────────────────────────
    const fontScales = [
      { id: 'sm', label: 'Compact', scale: '90%', badge: 'A-' },
      { id: 'md', label: 'Standard', scale: '100%', badge: 'A' },
      { id: 'lg', label: 'Large', scale: '112%', badge: 'A+' },
      { id: 'xl', label: 'Extra Large', scale: '125%', badge: 'A++' }
    ];

    const fontScale = ref('md');

    const setFontScale = (scaleId) => {
      fontScale.value = scaleId;
      localStorage.setItem('ireland_font_scale', scaleId);
      applyFontScale();
    };

    const applyFontScale = () => {
      const el = document.documentElement;
      fontScales.forEach(s => el.classList.remove(`font-scale-${s.id}`));
      el.classList.add(`font-scale-${fontScale.value}`);
    };

    // Quick Stepper
    const increaseFontSize = () => {
      const currentIndex = fontScales.findIndex(s => s.id === fontScale.value);
      if (currentIndex < fontScales.length - 1) {
        setFontScale(fontScales[currentIndex + 1].id);
      }
    };

    const decreaseFontSize = () => {
      const currentIndex = fontScales.findIndex(s => s.id === fontScale.value);
      if (currentIndex > 0) {
        setFontScale(fontScales[currentIndex - 1].id);
      }
    };

    // ── Settings / Customization Modal ────────────────────────
    const isSettingsModalOpen = ref(false);

    const openSettingsModal = () => {
      isSettingsModalOpen.value = true;
      document.body.style.overflow = 'hidden';
    };

    const closeSettingsModal = () => {
      isSettingsModalOpen.value = false;
      document.body.style.overflow = '';
    };

    // ── Dark Mode Reactive State ──────────────────────────────
    const isDark = ref(false);

    const initTheme = () => {
      // Dark Mode
      const savedTheme = localStorage.getItem('ireland_theme');
      if (savedTheme) {
        isDark.value = savedTheme === 'dark';
      } else {
        isDark.value = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      applyTheme();

      // Palette
      const savedPalette = localStorage.getItem('ireland_palette');
      if (savedPalette && palettes.some(p => p.id === savedPalette)) {
        selectedPalette.value = savedPalette;
      }
      applyPalette();

      // Font Scale
      const savedFontScale = localStorage.getItem('ireland_font_scale');
      if (savedFontScale && fontScales.some(s => s.id === savedFontScale)) {
        fontScale.value = savedFontScale;
      }
      applyFontScale();
    };

    const toggleDark = () => {
      isDark.value = !isDark.value;
      localStorage.setItem('ireland_theme', isDark.value ? 'dark' : 'light');
      applyTheme();
    };

    const applyTheme = () => {
      if (isDark.value) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    onMounted(() => {
      initTheme();
    });

    return {
      trip,
      regionList,
      attractionMap,
      distanceList,
      timelineList,
      restaurantList,
      reservationList,
      weatherInfo,
      outfitList,
      trailList,
      activeTab,
      tabs,
      isDark,
      toggleDark,
      selectedDetailItem,
      selectedDetailDay,
      isDetailModalOpen,
      openDetailModal,
      closeDetailModal,
      handleSwitchTab,
      getGoogleMapsUrl,
      // Appearance & Accessibility
      palettes,
      selectedPalette,
      setPalette,
      fontScales,
      fontScale,
      setFontScale,
      increaseFontSize,
      decreaseFontSize,
      isSettingsModalOpen,
      openSettingsModal,
      closeSettingsModal
    };
  }
});

app.mount('#app');


