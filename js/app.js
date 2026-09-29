// =============================================================
//  Vue 3 Ireland Trip App
// =============================================================

const { createApp, ref, computed, onMounted, watch, nextTick } = Vue;

const app = createApp({
  components: {
    'heat-map': HeatMap,
    'distances-view': Distances,
    'sights-drives': SightsDrives,
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
      { id: 'weather', label: '🌦️ Weather & Packing', shortLabel: 'Weather', icon: '🌦️' },
      { id: 'hiking', label: '🥾 Trails & Nature', shortLabel: 'Trails', icon: '🥾' },
      { id: 'restaurants', label: '🍴 Food & Pubs', shortLabel: 'Food', icon: '🍴' },
      { id: 'sights', label: '🗺️ Sights & Drives', shortLabel: 'Sights & Drives', icon: '🗺️' },
      { id: 'reservations', label: '📋 Bookings & Passes', shortLabel: 'Bookings', icon: '📋' }
    ];

    // Detail Modal / Bottom Sheet Reactive State
    const selectedDetailItem = ref(null);
    const selectedDetailDay = ref(null);
    const isDetailModalOpen = ref(false);
    const selectedTargetDayIndex = ref(null);

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
    const handleSwitchTab = (payload) => {
      if (!payload) return;
      const { tab, targetId, dayIndex, dayNumber, trailId } = payload;
      if (tab) {
        activeTab.value = tab;
      }
      if (dayIndex !== undefined && dayIndex !== null) {
        selectedTargetDayIndex.value = dayIndex;
      } else if (dayNumber !== undefined && dayNumber !== null) {
        selectedTargetDayIndex.value = dayNumber - 1;
      }
      if (isDetailModalOpen.value) {
        closeDetailModal();
      }
      nextTick(() => {
        setTimeout(() => {
          const el = document.getElementById(targetId) ||
                     (dayNumber ? document.getElementById('day-card-' + dayNumber) : null) ||
                     (dayIndex !== undefined ? document.getElementById('day-' + dayIndex) : null) ||
                     document.getElementById('trail-' + targetId) ||
                     document.getElementById('restaurant-' + targetId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('card-highlight');
            setTimeout(() => el.classList.remove('card-highlight'), 2200);
          }
        }, 180);
      });
    };

    // Auto-scroll the middle navigation bar to center the active tab
    const scrollToActiveTab = (tabId) => {
      nextTick(() => {
        setTimeout(() => {
          const tabBtn = document.getElementById('tab-btn-' + tabId);
          const navContainer = document.getElementById('main-tab-nav');
          if (tabBtn && navContainer) {
            const scrollLeftTarget = tabBtn.offsetLeft - (navContainer.clientWidth / 2) + (tabBtn.clientWidth / 2);
            navContainer.scrollTo({
              left: Math.max(0, scrollLeftTarget),
              behavior: 'smooth'
            });
            tabBtn.classList.add('tab-active-pulse');
            setTimeout(() => tabBtn.classList.remove('tab-active-pulse'), 600);
          }
        }, 60);
      });
    };

    watch(activeTab, (newTab) => {
      scrollToActiveTab(newTab);
    });

    const getGoogleMapsUrl = (query) => {
      if (!query) return '#';
      const clean = query.replace(/\+/g, ' ');
      return `https://maps.apple.com/?q=${encodeURIComponent(clean)}`;
    };

    const getAppleMapsUrl = (query) => {
      if (!query) return '#';
      const clean = query.replace(/\+/g, ' ');
      return `https://maps.apple.com/?q=${encodeURIComponent(clean)}`;
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

    // ── Universal Trip Scratchpad & Notes Backup / Export ────
    const isScratchpadOpen = ref(false);
    const tripScratchpad = ref('');
    const isCopiedScratchpad = ref(false);
    const backupStats = ref({ daily: 0, bookings: 0, restaurants: 0, trails: 0 });

    const openScratchpad = () => {
      loadTripScratchpad();
      calculateBackupStats();
      isScratchpadOpen.value = true;
      document.body.style.overflow = 'hidden';
    };

    const closeScratchpad = () => {
      isScratchpadOpen.value = false;
      document.body.style.overflow = '';
    };

    const loadTripScratchpad = () => {
      const saved = localStorage.getItem('ireland_trip_scratchpad');
      tripScratchpad.value = saved || '';
    };

    const saveTripScratchpad = (val) => {
      tripScratchpad.value = val;
      localStorage.setItem('ireland_trip_scratchpad', val);
      calculateBackupStats();
    };

    const copyScratchpad = () => {
      if (!tripScratchpad.value) return;
      navigator.clipboard.writeText(tripScratchpad.value).then(() => {
        isCopiedScratchpad.value = true;
        setTimeout(() => {
          isCopiedScratchpad.value = false;
        }, 1800);
      });
    };

    const calculateBackupStats = () => {
      try {
        const daily = JSON.parse(localStorage.getItem('ireland_daily_notes') || '{}');
        const bookings = JSON.parse(localStorage.getItem('ireland_reservation_notes') || '{}');
        const rest = JSON.parse(localStorage.getItem('ireland_restaurant_user_data') || '{}');
        const trails = JSON.parse(localStorage.getItem('ireland_trail_user_data') || '{}');
        backupStats.value = {
          daily: Object.values(daily).filter(v => v && v.trim()).length,
          bookings: Object.values(bookings).filter(v => (v.code && v.code.trim()) || (v.notes && v.notes.trim())).length,
          restaurants: Object.values(rest).filter(v => v.rating > 0 || (v.notes && v.notes.trim()) || v.favorite).length,
          trails: Object.values(trails).filter(v => v.completed || (v.notes && v.notes.trim()) || v.favorite).length
        };
      } catch (e) {
        console.error('Error calculating backup stats', e);
      }
    };

    const exportAllTripNotes = () => {
      const backupData = {
        exportDate: new Date().toISOString(),
        tripTitle: 'Ireland Vacation October 2026',
        scratchpad: localStorage.getItem('ireland_trip_scratchpad') || '',
        dailyNotes: JSON.parse(localStorage.getItem('ireland_daily_notes') || '{}'),
        reservationNotes: JSON.parse(localStorage.getItem('ireland_reservation_notes') || '{}'),
        restaurantUserData: JSON.parse(localStorage.getItem('ireland_restaurant_user_data') || '{}'),
        trailUserData: JSON.parse(localStorage.getItem('ireland_trail_user_data') || '{}'),
        packingChecklist: JSON.parse(localStorage.getItem('ireland_packing_checklist_v2') || '[]'),
        theme: localStorage.getItem('ireland_theme') || 'dark',
        palette: localStorage.getItem('ireland_palette') || 'emerald',
        fontScale: localStorage.getItem('ireland_font_scale') || 'md'
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `ireland_trip_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    };

    const importNotesFromFile = (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.scratchpad !== undefined) localStorage.setItem('ireland_trip_scratchpad', data.scratchpad);
          if (data.dailyNotes) localStorage.setItem('ireland_daily_notes', JSON.stringify(data.dailyNotes));
          if (data.reservationNotes) localStorage.setItem('ireland_reservation_notes', JSON.stringify(data.reservationNotes));
          if (data.restaurantUserData) localStorage.setItem('ireland_restaurant_user_data', JSON.stringify(data.restaurantUserData));
          if (data.trailUserData) localStorage.setItem('ireland_trail_user_data', JSON.stringify(data.trailUserData));
          if (data.packingChecklist) localStorage.setItem('ireland_packing_checklist_v2', JSON.stringify(data.packingChecklist));
          if (data.palette) setPalette(data.palette);
          if (data.fontScale) setFontScale(data.fontScale);

          alert('✅ Trip notes and custom data successfully imported! Refreshing view...');
          window.location.reload();
        } catch (err) {
          alert('⚠️ Failed to import backup file: Invalid JSON format.');
        }
      };
      reader.readAsText(file);
    };

    onMounted(() => {
      initTheme();
      loadTripScratchpad();
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
      selectedTargetDayIndex,
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
      closeSettingsModal,
      // Scratchpad & Backup
      isScratchpadOpen,
      tripScratchpad,
      isCopiedScratchpad,
      backupStats,
      openScratchpad,
      closeScratchpad,
      saveTripScratchpad,
      copyScratchpad,
      exportAllTripNotes,
      importNotesFromFile
    };
  }
});

app.mount('#app');




