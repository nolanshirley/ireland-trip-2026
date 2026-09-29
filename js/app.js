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
      toggleDark,
      selectedDetailItem,
      selectedDetailDay,
      isDetailModalOpen,
      openDetailModal,
      closeDetailModal,
      handleSwitchTab,
      getGoogleMapsUrl
    };
  }
});

app.mount('#app');

