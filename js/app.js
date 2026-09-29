// =============================================================
//  Vue 3 Ireland Trip App
// =============================================================

const { createApp, ref, computed, onMounted, watch } = Vue;

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

    // Active Tab State (default to heatmap or planner)
    const activeTab = ref('planner');

    const tabs = [
      { id: 'planner', label: '📅 Daily Schedule & Time-Blocks' },
      { id: 'weather', label: '🌦️ October Weather & Outfits' },
      { id: 'hiking', label: '🥾 Hiking & Nature Trails' },
      { id: 'heatmap', label: '🗺️ Heat Map & Attractions' },
      { id: 'distances', label: '📏 Distances' },
      { id: 'restaurants', label: '🍴 Restaurants' },
      { id: 'reservations', label: '📋 Reservations' }
    ];

    // Dark Mode Reactive State
    const isDark = ref(false);

    const initTheme = () => {
      const saved = localStorage.getItem('ireland_theme');
      if (saved) {
        isDark.value = saved === 'dark';
      } else {
        isDark.value = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      applyTheme();
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
      toggleDark
    };
  }
});

app.mount('#app');
