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

    // ── Global Provider Preference (Apple vs Google) ───────────
    const userProvider = ref(localStorage.getItem('ireland_preferred_provider') || null); // 'apple', 'google', or null
    const isProviderModalOpen = ref(false);
    const pendingAction = ref(null);
    const rememberChoice = ref(true);

    const parseTripEventDates = (event) => {
      const dateStr = event.date || 'Oct 2';
      const dayMatch = dateStr.match(/Oct\s*(\d+)/i);
      const day = dayMatch ? parseInt(dayMatch[1]) : 2;
      const year = 2026;
      const month = 10; // October

      let startH = 9, startM = 0;
      if (event.time) {
        const timeMatch = event.time.match(/(\d+):?(\d+)?\s*(AM|PM)?/i);
        if (timeMatch) {
          let h = parseInt(timeMatch[1]);
          const m = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          const ampm = timeMatch[3] ? timeMatch[3].toUpperCase() : '';
          if (ampm === 'PM' && h < 12) h += 12;
          if (ampm === 'AM' && h === 12) h = 0;
          startH = h;
          startM = m;
        }
      }

      const dur = event.durHours || 1.5;
      const endH = startH + Math.floor(dur);
      const endM = startM + Math.round((dur % 1) * 60);

      const pad = (n) => String(n).padStart(2, '0');
      const startISO = `${year}${pad(month)}${pad(day)}T${pad(startH)}${pad(startM)}00Z`;
      const endISO = `${year}${pad(month)}${pad(day)}T${pad(endH % 24)}${pad(endM % 60)}00Z`;

      return { startISO, endISO, startICS: startISO, endICS: endISO, day, startH, startM };
    };

    const executeMap = (query, provider) => {
      if (!query) return;
      let url = '';
      if (provider === 'google') {
        url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
      } else {
        const clean = query.replace(/\+/g, ' ');
        url = `https://maps.apple.com/?q=${encodeURIComponent(clean)}`;
      }
      window.open(url, '_blank');
    };

    const executeRoute = (from, to, provider) => {
      let url = '';
      if (provider === 'google') {
        const origin = encodeURIComponent(`${from}, Ireland`);
        const dest = encodeURIComponent(`${to}, Ireland`);
        url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`;
      } else {
        const origin = encodeURIComponent(`${(from || '').replace(/\+/g, ' ')}, Ireland`);
        const dest = encodeURIComponent(`${(to || '').replace(/\+/g, ' ')}, Ireland`);
        url = `https://maps.apple.com/?saddr=${origin}&daddr=${dest}&dirflg=d`;
      }
      window.open(url, '_blank');
    };

    const executeCalendar = (event, provider) => {
      const { startISO, endISO, startICS, endICS } = parseTripEventDates(event);
      if (provider === 'google') {
        const title = encodeURIComponent(event.title || event.activity || event.name || 'Ireland Trip Event');
        const details = encodeURIComponent(`${event.desc || event.notes || ''}\n\n🍀 Ireland Vacation 2026`);
        const location = encodeURIComponent(event.location || event.mapsQuery || 'Ireland');
        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startISO}/${endISO}&details=${details}&location=${location}`;
        window.open(url, '_blank');
      } else {
        // Apple Calendar (.ics file trigger)
        const summary = event.title || event.activity || event.name || 'Ireland Trip Event';
        const description = `${(event.desc || event.notes || '').replace(/\n/g, '\\n')}\\n\\n🍀 Ireland Vacation 2026`;
        const location = event.location || event.mapsQuery || 'Ireland';
        const icsContent = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//Ireland Trip 2026//EN',
          'CALSCALE:GREGORIAN',
          'METHOD:PUBLISH',
          'BEGIN:VEVENT',
          `SUMMARY:${summary}`,
          `DESCRIPTION:${description}`,
          `LOCATION:${location}`,
          `DTSTART:${startICS}`,
          `DTEND:${endICS}`,
          'STATUS:CONFIRMED',
          'END:VEVENT',
          'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${summary.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    };

    const triggerMap = (query) => {
      if (userProvider.value) {
        executeMap(query, userProvider.value);
      } else {
        pendingAction.value = { type: 'map', query };
        isProviderModalOpen.value = true;
      }
    };

    const triggerRoute = (from, to) => {
      if (userProvider.value) {
        executeRoute(from, to, userProvider.value);
      } else {
        pendingAction.value = { type: 'route', from, to };
        isProviderModalOpen.value = true;
      }
    };

    const triggerCalendar = (event) => {
      if (userProvider.value) {
        executeCalendar(event, userProvider.value);
      } else {
        pendingAction.value = { type: 'calendar', event };
        isProviderModalOpen.value = true;
      }
    };

    const selectProvider = (provider) => {
      if (rememberChoice.value) {
        userProvider.value = provider;
        localStorage.setItem('ireland_preferred_provider', provider);
      }
      isProviderModalOpen.value = false;

      // Execute pending action if present
      if (pendingAction.value) {
        const action = pendingAction.value;
        pendingAction.value = null;
        if (action.type === 'map') executeMap(action.query, provider);
        else if (action.type === 'route') executeRoute(action.from, action.to, provider);
        else if (action.type === 'calendar') executeCalendar(action.event, provider);
      }
    };

    const openProviderSettings = () => {
      isProviderModalOpen.value = true;
    };

    const setProviderPreference = (provider) => {
      userProvider.value = provider;
      if (provider) {
        localStorage.setItem('ireland_preferred_provider', provider);
      } else {
        localStorage.removeItem('ireland_preferred_provider');
      }
      isProviderModalOpen.value = false;
    };

    // Attach to window so all components can invoke directly
    window.TravelApp = {
      triggerMap,
      triggerRoute,
      triggerCalendar,
      openProviderSettings,
      getUserProvider: () => userProvider.value
    };

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
      // Provider Manager (Apple vs Google)
      userProvider,
      isProviderModalOpen,
      rememberChoice,
      pendingAction,
      triggerMap,
      triggerRoute,
      triggerCalendar,
      selectProvider,
      setProviderPreference,
      openProviderSettings,
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




