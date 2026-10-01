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
    'reservations-view': Reservations,
    'budget-tracker': BudgetTracker
  },
  setup() {
    const trip = ref(TRIP);
    const regionList = ref(regions);
    const attractionMap = ref(attractions);
    const distanceList = ref(distances);
    const weatherInfo = ref(weatherData);
    const outfitList = ref(outfitGuides);
    const shoppingVenues = ref(typeof shoppingVenuesData !== 'undefined' ? shoppingVenuesData : []);
    const sightsDrivesRef = ref(null);

    const openShoppingView = () => {
      activeTab.value = 'sights';
      if (sightsDrivesRef.value && sightsDrivesRef.value.setSubTab) {
        sightsDrivesRef.value.setSubTab('shopping');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ── Reactive Custom Entities & Local Database ─────────────
    const customActivities = ref([]);
    const customRestaurants = ref([]);
    const customTrails = ref([]);
    const customReservations = ref([]);
    const customNotes = ref([]);
    const itemVotes = ref({});
    const userSenderName = ref(localStorage.getItem('ireland_user_sender_name') || 'Family Member');
    const hiddenItemIds = ref([]);
    const onHoldItemIds = ref([]);
    const showHeaderHelp = ref(false);
    const targetSearchQuery = ref('');

    const loadCustomStorageData = () => {
      try {
        customActivities.value = JSON.parse(localStorage.getItem('ireland_custom_activities') || '[]');
        customRestaurants.value = JSON.parse(localStorage.getItem('ireland_custom_restaurants') || '[]');
        customTrails.value = JSON.parse(localStorage.getItem('ireland_custom_trails') || '[]');
        customReservations.value = JSON.parse(localStorage.getItem('ireland_custom_reservations') || '[]');
        customNotes.value = JSON.parse(localStorage.getItem('ireland_custom_notes') || '[]');
        itemVotes.value = JSON.parse(localStorage.getItem('ireland_item_votes') || '{}');
        hiddenItemIds.value = JSON.parse(localStorage.getItem('ireland_hidden_item_ids') || '[]');
        onHoldItemIds.value = JSON.parse(localStorage.getItem('ireland_on_hold_item_ids') || '[]');
      } catch (e) {
        console.error('Error loading custom trip data from storage', e);
      }
    };

    const saveCustomActivities = () => {
      localStorage.setItem('ireland_custom_activities', JSON.stringify(customActivities.value));
    };
    const saveCustomRestaurants = () => {
      localStorage.setItem('ireland_custom_restaurants', JSON.stringify(customRestaurants.value));
    };
    const saveCustomTrails = () => {
      localStorage.setItem('ireland_custom_trails', JSON.stringify(customTrails.value));
    };
    const saveCustomReservations = () => {
      localStorage.setItem('ireland_custom_reservations', JSON.stringify(customReservations.value));
    };
    const saveItemVotes = () => {
      localStorage.setItem('ireland_item_votes', JSON.stringify(itemVotes.value));
    };
    const saveHiddenItemIds = () => {
      localStorage.setItem('ireland_hidden_item_ids', JSON.stringify(hiddenItemIds.value));
    };
    const saveOnHoldItemIds = () => {
      localStorage.setItem('ireland_on_hold_item_ids', JSON.stringify(onHoldItemIds.value));
    };
    const saveSenderName = (name) => {
      userSenderName.value = name;
      localStorage.setItem('ireland_user_sender_name', name);
    };

    // Helper to generate canonical stable ID for items if not present
    const getItemId = (item, prefix = 'item') => {
      if (!item) return prefix + '_unknown';
      if (item.id) return item.id;
      const key = (item.activity || item.name || item.title || item.time || 'stop').toLowerCase().replace(/[^a-z0-9]/g, '_');
      return prefix + '_' + key;
    };

    const hideItem = (category, id) => {
      if (!id) return;
      if (!hiddenItemIds.value.includes(id)) {
        hiddenItemIds.value = [...hiddenItemIds.value, id];
        saveHiddenItemIds();
        showToast('Item hidden from itinerary', '🗑️', {
          actionText: 'Undo',
          actionFn: () => restoreItem(id)
        });
      }
    };

    const restoreItem = (id) => {
      if (!id) return;
      hiddenItemIds.value = hiddenItemIds.value.filter(h => h !== id);
      saveHiddenItemIds();
      showToast('Item restored to itinerary', '↩️');
    };

    const restoreAllHiddenItems = () => {
      hiddenItemIds.value = [];
      saveHiddenItemIds();
    };

    const isItemHidden = (id) => hiddenItemIds.value.includes(id);

    const holdItem = (category, id, item = null) => {
      if (!id) return;
      if (!onHoldItemIds.value.includes(id)) {
        onHoldItemIds.value = [...onHoldItemIds.value, id];
        saveOnHoldItemIds();
        const label = (item && (item.activity || item.title || item.name)) || 'Activity';
        showToast(`Moved "${label}" to Suggestions Box (On Hold)`, '💡', {
          actionText: 'Undo',
          actionFn: () => unholdItem(id)
        });
      }
    };

    const unholdItem = (id) => {
      if (!id) return;
      onHoldItemIds.value = onHoldItemIds.value.filter(h => h !== id);
      saveOnHoldItemIds();
      showToast('Activity restored to schedule', '✅');
    };

    const isOnHold = (id) => onHoldItemIds.value.includes(id);

    // ── Dynamic Computed Merged Lists ─────────────────────────
    const timelineList = computed(() => {
      const baseTimeline = JSON.parse(JSON.stringify(timeline));
      
      // Ensure all base items have stable IDs & filter out hidden and held items
      baseTimeline.forEach(day => {
        const allItems = (day.items || []).map(item => {
          const id = item.id || getItemId(item, 'day' + day.dayNumber);
          return { ...item, id };
        });
        day.items = allItems.filter(item => !hiddenItemIds.value.includes(item.id) && !onHoldItemIds.value.includes(item.id));
        day.onHoldItems = allItems.filter(item => !hiddenItemIds.value.includes(item.id) && onHoldItemIds.value.includes(item.id));
      });

      customActivities.value.forEach(act => {
        if (hiddenItemIds.value.includes(act.id)) return;
        const dIdx = act.dayIndex !== undefined ? parseInt(act.dayIndex) : (act.dayNumber ? parseInt(act.dayNumber) - 1 : 0);
        if (baseTimeline[dIdx]) {
          const actCopy = { ...act };
          const startH = parseTimeToHour(actCopy.time || actCopy.startHour);
          const dur = parseFloat(actCopy.durHours) || (parseFloat(actCopy.dur) || 1.5);
          actCopy.startHour = startH;
          actCopy.endHour = startH + Math.max(0.5, dur);

          if (onHoldItemIds.value.includes(actCopy.id) || actCopy.status === 'on_hold') {
            baseTimeline[dIdx].onHoldItems = baseTimeline[dIdx].onHoldItems || [];
            const existingIdx = baseTimeline[dIdx].onHoldItems.findIndex(i => i.id === actCopy.id);
            if (existingIdx >= 0) {
              baseTimeline[dIdx].onHoldItems[existingIdx] = actCopy;
            } else {
              baseTimeline[dIdx].onHoldItems.push(actCopy);
            }
          } else {
            const existingIdx = baseTimeline[dIdx].items.findIndex(i => i.id === actCopy.id);
            if (existingIdx >= 0) {
              baseTimeline[dIdx].items[existingIdx] = actCopy;
            } else {
              baseTimeline[dIdx].items.push(actCopy);
            }
          }
        }
      });

      // Sort items within each day chronologically by startHour
      baseTimeline.forEach(day => {
        day.items.sort((a, b) => {
          const aStart = parseTimeToHour(a.time || a.startHour);
          const bStart = parseTimeToHour(b.time || b.startHour);
          return aStart - bStart;
        });
        if (day.onHoldItems) {
          day.onHoldItems.sort((a, b) => {
            const aStart = parseTimeToHour(a.time || a.startHour);
            const bStart = parseTimeToHour(b.time || b.startHour);
            return aStart - bStart;
          });
        }
      });

      return baseTimeline;
    });

    const restaurantList = computed(() => {
      const baseList = JSON.parse(JSON.stringify(restaurants)).map(r => ({ ...r, id: r.id || getItemId(r, 'rest') }));
      const customList = customRestaurants.value;
      return [...baseList, ...customList].filter(r => !hiddenItemIds.value.includes(r.id));
    });

    const trailList = computed(() => {
      const baseList = JSON.parse(JSON.stringify(hikingTrails)).map(t => ({ ...t, id: t.id || getItemId(t, 'trail') }));
      const customList = customTrails.value;
      return [...baseList, ...customList].filter(t => !hiddenItemIds.value.includes(t.id));
    });

    const reservationList = computed(() => {
      const baseList = JSON.parse(JSON.stringify(reservations)).map(b => ({ ...b, id: b.id || getItemId(b, 'res') }));
      const customList = customReservations.value;
      return [...baseList, ...customList].filter(b => !hiddenItemIds.value.includes(b.id));
    });

    // Active Tab State (default to planner)
    const activeTab = ref('planner');

    // Collapsible State for Trip Command Center (collapsed by default on mobile)
    const isCommandCenterCollapsed = ref(
      localStorage.getItem('ireland_command_center_collapsed') !== null
        ? localStorage.getItem('ireland_command_center_collapsed') === 'true'
        : (typeof window !== 'undefined' && window.innerWidth < 768)
    );

    const toggleCommandCenter = () => {
      isCommandCenterCollapsed.value = !isCommandCenterCollapsed.value;
      try {
        localStorage.setItem('ireland_command_center_collapsed', isCommandCenterCollapsed.value.toString());
      } catch (e) {}
    };

    // Interactive Top Dashboard Lens State
    const topDashboardLens = ref(localStorage.getItem('ireland_top_dashboard_lens') || 'milestones');
    const setTopDashboardLens = (lens) => {
      if (lens === 'budget') {
        handleSwitchTab({ tab: 'budget' });
        return;
      }
      topDashboardLens.value = lens;
      localStorage.setItem('ireland_top_dashboard_lens', lens);
    };

    const dashboardLenses = [
      { id: 'milestones', label: '🎯 Critical Milestones', icon: '🎯' },
      { id: 'bases', label: '🏠 4 Base Camps & Currency', icon: '🏠' },
      { id: 'budget', label: '💶 Budget & Splits', icon: '💶' },
      { id: 'deadlines', label: '⚠️ Bookings & Deadlines', icon: '⚠️' },
      { id: 'weather', label: '🌦️ Weather & Outfits', icon: '🌦️' },
      { id: 'nature', label: '⛰️ Scenic Wonders & Trails', icon: '⛰️' },
      { id: 'sos', label: '🆘 SOS & Emergency', icon: '🆘' }
    ];

    const packingProgress = computed(() => {
      try {
        const saved = localStorage.getItem('ireland_packing_checklist_v2');
        if (saved) {
          const list = JSON.parse(saved);
          const packed = list.filter(i => i.packed).length;
          const total = list.length || 18;
          return { packed, total, percent: Math.round((packed / total) * 100) };
        }
      } catch (e) {}
      return { packed: 0, total: 18, percent: 0 };
    });

    const confirmedBookingsCount = computed(() => {
      return reservationList.value.filter(r => (r.status || '').toLowerCase().includes('confirmed') || (r.status || '').toLowerCase().includes('booked')).length;
    });

    const strictDeadlinesCount = computed(() => {
      return reservationList.value.filter(r => r.cancelPolicy && (r.cancelPolicy.includes('48hr') || r.cancelPolicy.includes('24hr'))).length;
    });

    const totalDriveHours = computed(() => {
      return timelineList.value.reduce((sum, d) => sum + (parseFloat(d.driveHours) || 0), 0).toFixed(1);
    });

    const tabs = [
      { id: 'planner', label: '📅 Daily Schedule', shortLabel: 'Schedule', icon: '📅' },
      { id: 'budget', label: '💶 Budget & Splits', shortLabel: 'Budget', icon: '💶' },
      { id: 'weather', label: '🌦️ Weather & Outfits', shortLabel: 'Weather', icon: '🌦️' },
      { id: 'hiking', label: '🥾 Trails & Nature', shortLabel: 'Trails', icon: '🥾' },
      { id: 'restaurants', label: '🍴 Food & Pubs', shortLabel: 'Food', icon: '🍴' },
      { id: 'sights', label: '🗺️ Sights', shortLabel: 'Sights', icon: '🗺️' },
      { id: 'reservations', label: '📋 Bookings & Passes', shortLabel: 'Bookings', icon: '📋' }
    ];

    // Mobile Bottom Navigation Tabs (excludes budget, SOS, and notes to prevent crowding)
    const mobileTabs = computed(() => {
      return tabs.filter(t => t.id !== 'budget');
    });

    // ── Global Action & Creation Notifications (Toast) ─────────
    const toast = ref({
      show: false,
      message: '',
      icon: '✨',
      actionText: null,
      actionFn: null,
      timeoutId: null
    });

    const showToast = (message, icon = '✨', options = {}) => {
      if (toast.value.timeoutId) {
        clearTimeout(toast.value.timeoutId);
      }
      toast.value = {
        show: true,
        message,
        icon,
        actionText: options.actionText || null,
        actionFn: options.actionFn || null,
        timeoutId: setTimeout(() => {
          toast.value.show = false;
        }, options.duration || 3200)
      };
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(12); } catch (e) {}
      }
    };

    const hideToast = () => {
      if (toast.value.timeoutId) {
        clearTimeout(toast.value.timeoutId);
      }
      toast.value.show = false;
    };

    const triggerToastAction = () => {
      if (typeof toast.value.actionFn === 'function') {
        toast.value.actionFn();
      }
      hideToast();
    };

    // Detail Modal / Bottom Sheet Reactive State
    const selectedDetailItem = ref(null);
    const selectedDetailDay = ref(null);
    const isDetailModalOpen = ref(false);
    const isEditingDetailActivity = ref(false);
    const selectedTargetDayIndex = ref(null);

    const detailEditForm = ref({
      id: '',
      activity: '',
      startTime24: '10:00',
      durHours: 1.5,
      type: 'sight',
      energyLevel: 'chill',
      tag: '',
      desc: '',
      note: '',
      rainBackup: '',
      mapsQuery: '',
      splitOption: '',
      optional: false,
      isCustom: false
    });

    const initDetailEditForm = (item, day) => {
      if (!item) return;
      const range = (typeof getItemTimeRange === 'function')
        ? getItemTimeRange(item)
        : { start: parseTimeToHour(item.time || item.startHour), end: 11.5, dur: 1.5 };
      
      const isItemOpt = Boolean(
        item.optional ||
        item.isOptional ||
        item.status === 'Optional' ||
        (item.tag && (item.tag.includes('OPTIONAL') || item.tag.includes('SUGGESTED') || item.tag.includes('FLEXIBLE')))
      );

      detailEditForm.value = {
        id: item.id || getItemId(item, 'day' + (day ? day.dayNumber : 1)),
        activity: item.activity || item.title || '',
        startTime24: formatHourTo24Time(range.start),
        durHours: Math.max(0.25, parseFloat(range.dur.toFixed(2))),
        type: item.type || 'sight',
        energyLevel: item.energyLevel || 'chill',
        tag: item.tag || '',
        desc: item.desc || '',
        note: item.note || '',
        rainBackup: item.rainBackup || '',
        mapsQuery: item.mapsQuery || '',
        splitOption: item.splitOption || '',
        optional: isItemOpt,
        isCustom: Boolean(item.isCustom)
      };
    };

    const openDetailModal = (payload) => {
      if (!payload || !payload.item) return;
      selectedDetailItem.value = payload.item;
      selectedDetailDay.value = payload.day || null;
      initDetailEditForm(payload.item, payload.day);
      isEditingDetailActivity.value = Boolean(payload.editMode);
      isDetailModalOpen.value = true;
      document.body.style.overflow = 'hidden';
    };

    const closeDetailModal = () => {
      isDetailModalOpen.value = false;
      isEditingDetailActivity.value = false;
      selectedDetailItem.value = null;
      selectedDetailDay.value = null;
      document.body.style.overflow = '';
    };

    const startEditingDetailActivity = () => {
      if (selectedDetailItem.value) {
        initDetailEditForm(selectedDetailItem.value, selectedDetailDay.value);
        isEditingDetailActivity.value = true;
      }
    };

    const cancelEditingDetailActivity = () => {
      if (selectedDetailItem.value) {
        initDetailEditForm(selectedDetailItem.value, selectedDetailDay.value);
      }
      isEditingDetailActivity.value = false;
    };

    const detailEditStartHour = computed(() => {
      if (!detailEditForm.value || !detailEditForm.value.startTime24) return 10;
      return parseTimeToHour(detailEditForm.value.startTime24);
    });

    const detailEditEndHour = computed(() => {
      const start = detailEditStartHour.value;
      const dur = parseFloat(detailEditForm.value.durHours) || 0.25;
      return start + Math.max(0.0167, dur); // allow down to 1 minute (0.0167h)
    });

    const adjustDetailStartTime = (minuteDelta) => {
      if (!detailEditForm.value || !detailEditForm.value.startTime24) return;
      const currentStart = parseTimeToHour(detailEditForm.value.startTime24);
      const newStart = Math.min(23.983, Math.max(0, currentStart + (minuteDelta / 60)));
      detailEditForm.value.startTime24 = formatHourTo24Time(newStart);
    };

    const adjustDetailDuration = (minuteDelta) => {
      if (!detailEditForm.value) return;
      const currentMins = Math.round((parseFloat(detailEditForm.value.durHours) || 1.5) * 60);
      const newMins = Math.max(1, currentMins + minuteDelta);
      detailEditForm.value.durHours = parseFloat((newMins / 60).toFixed(3));
    };

    const detailEditFormattedTime = computed(() => {
      return `${formatHourToTime(detailEditStartHour.value)} – ${formatHourToTime(detailEditEndHour.value)}`;
    });

    const detailScheduleConflicts = computed(() => {
      if (!selectedDetailDay.value || !detailEditForm.value || !isEditingDetailActivity.value) return [];
      const currentId = detailEditForm.value.id;
      const dayIdx = selectedDetailDay.value.dayNumber ? selectedDetailDay.value.dayNumber - 1 : 0;
      const day = timelineList.value[dayIdx];
      if (!day || !day.items) return [];

      const newStart = detailEditStartHour.value;
      const newEnd = detailEditEndHour.value;

      const conflicts = [];
      day.items.forEach(other => {
        if (other.id === currentId) return;
        const range = (typeof getItemTimeRange === 'function')
          ? getItemTimeRange(other)
          : { start: parseTimeToHour(other.time || other.startHour), end: parseTimeToHour(other.time || other.startHour) + 1.5, dur: 1.5 };
        const otherStart = range.start;
        const otherEnd = range.end;

        // Times meeting back-to-back (e.g. otherEnd === newStart or newEnd === otherStart):
        // 2:00 PM and 2:00 PM is NOT a conflict.
        // True conflict exists only if incoming extends into upcoming (e.g. 2:01 PM incoming and 2:00 PM upcoming):
        const overlapStart = Math.max(newStart, otherStart);
        const overlapEnd = Math.min(newEnd, otherEnd);
        const overlapHours = overlapEnd - overlapStart;

        // Epsilon of 0.001 hr (~3.6 sec) prevents float imprecision false positives while catching any actual overlap (even 1 min = 0.0167 hr)
        if (overlapHours > 0.001) {
          const overlapMins = Math.max(1, Math.round(overlapHours * 60));
          const isOtherAfter = otherStart >= newStart;
          conflicts.push({
            otherId: other.id,
            otherActivity: other.activity || other.title || 'Stop',
            otherStart,
            otherEnd,
            overlapMins,
            isOtherAfter,
            message: `"${other.activity || 'Activity'}" (${formatHourToTime(otherStart)} – ${formatHourToTime(otherEnd)}) overlaps by ${overlapMins} min${overlapMins === 1 ? '' : 's'}`
          });
        }
      });

      return conflicts;
    });

    const isDetailSunsetHazard = computed(() => {
      if (!selectedDetailDay.value || !detailEditForm.value) return false;
      const dNum = selectedDetailDay.value.dayNumber || 1;
      const dl = (typeof daylightData !== 'undefined' && daylightData[dNum]) || { sunsetHour: 18.58, sunset: '18:35' };
      const endH = detailEditEndHour.value;
      return endH > dl.sunsetHour;
    });

    const autoShiftFollowingStops = () => {
      if (!selectedDetailDay.value || !detailEditForm.value) return;
      const currentId = detailEditForm.value.id;
      const dayIdx = selectedDetailDay.value.dayNumber ? selectedDetailDay.value.dayNumber - 1 : 0;
      const day = timelineList.value[dayIdx];
      if (!day || !day.items) return;

      const myEnd = detailEditEndHour.value;
      let nextTargetStart = myEnd;

      const sortedOthers = [...day.items]
        .filter(item => item.id !== currentId)
        .sort((a, b) => {
          const rA = typeof getItemTimeRange === 'function' ? getItemTimeRange(a) : { start: 0 };
          const rB = typeof getItemTimeRange === 'function' ? getItemTimeRange(b) : { start: 0 };
          return rA.start - rB.start;
        });

      let shiftCount = 0;
      sortedOthers.forEach(other => {
        const { start: oStart, dur: oDur } = typeof getItemTimeRange === 'function'
          ? getItemTimeRange(other)
          : { start: parseTimeToHour(other.time), dur: 1.5 };
        
        // If other stop is scheduled after or overlapping our edited activity:
        if (oStart < nextTargetStart && oStart >= detailEditStartHour.value - 0.001) {
          const updatedOStart = nextTargetStart;
          const updatedOEnd = updatedOStart + oDur;
          const updatedTimeStr = `${formatHourToTime(updatedOStart)} – ${formatHourToTime(updatedOEnd)}`;
          const durStr = oDur >= 1 ? (oDur % 1 === 0 ? `${oDur}h` : `${oDur} hrs`) : `${Math.round(oDur * 60)}m`;
          
          const updatedOther = {
            ...other,
            time: updatedTimeStr,
            startHour: updatedOStart,
            endHour: updatedOEnd,
            dur: durStr,
            durHours: oDur,
            dayIndex: dayIdx,
            dayNumber: dayIdx + 1,
            isCustom: true
          };
          
          const existingIdx = customActivities.value.findIndex(a => a.id === other.id);
          if (existingIdx >= 0) {
            customActivities.value[existingIdx] = updatedOther;
          } else {
            customActivities.value.push(updatedOther);
          }
          
          nextTargetStart = updatedOEnd;
          shiftCount++;
        } else if (oStart >= nextTargetStart) {
          nextTargetStart = Math.max(nextTargetStart, oStart + oDur);
        }
      });

      saveCustomActivities();
      showToast(`Auto-shifted ${shiftCount} subsequent stop${shiftCount === 1 ? '' : 's'} on Day ${dayIdx + 1}`, '⚡');
    };

    const snapToNextFreeSlot = () => {
      if (!selectedDetailDay.value || !detailEditForm.value) return;
      const currentId = detailEditForm.value.id;
      const dayIdx = selectedDetailDay.value.dayNumber ? selectedDetailDay.value.dayNumber - 1 : 0;
      const day = timelineList.value[dayIdx];
      if (!day || !day.items) return;

      const dur = parseFloat(detailEditForm.value.durHours) || 1.5;
      const sortedOthers = [...day.items]
        .filter(item => item.id !== currentId)
        .sort((a, b) => {
          const rA = typeof getItemTimeRange === 'function' ? getItemTimeRange(a) : { start: 0 };
          const rB = typeof getItemTimeRange === 'function' ? getItemTimeRange(b) : { start: 0 };
          return rA.start - rB.start;
        });

      let candidateStart = 8.5; // Default morning slot 8:30 AM
      for (const other of sortedOthers) {
        const { start: oStart, end: oEnd } = typeof getItemTimeRange === 'function'
          ? getItemTimeRange(other)
          : { start: parseTimeToHour(other.time), end: parseTimeToHour(other.time) + 1.5 };

        // If candidate activity ends before or meets this stop (candidateStart + dur <= oStart + 0.001)
        if (candidateStart + dur <= oStart + 0.001) {
          break; // Gap found before this stop!
        } else {
          candidateStart = Math.max(candidateStart, oEnd); // Meet right after this stop
        }
      }

      detailEditForm.value.startTime24 = formatHourTo24Time(candidateStart);
      showToast(`Aligned start time to open slot: ${formatHourToTime(candidateStart)}`, '⏱️');
    };

    const saveDetailActivity = () => {
      if (!selectedDetailDay.value || !detailEditForm.value) return;
      if (!detailEditForm.value.activity.trim()) {
        alert('Please enter an activity name');
        return;
      }

      const dayIdx = selectedDetailDay.value.dayNumber ? selectedDetailDay.value.dayNumber - 1 : 0;
      const startH = detailEditStartHour.value;
      const durH = parseFloat(detailEditForm.value.durHours) || 1.5;
      const endH = startH + durH;
      const timeStr = `${formatHourToTime(startH)} – ${formatHourToTime(endH)}`;
      const durStr = durH >= 1 ? (durH % 1 === 0 ? `${durH}h` : `${durH} hrs`) : `${Math.round(durH * 60)}m`;

      const updatedItem = {
        ...selectedDetailItem.value,
        id: detailEditForm.value.id,
        dayIndex: dayIdx,
        dayNumber: dayIdx + 1,
        activity: detailEditForm.value.activity.trim(),
        time: timeStr,
        startHour: startH,
        endHour: endH,
        dur: durStr,
        durHours: durH,
        type: detailEditForm.value.type,
        energyLevel: detailEditForm.value.energyLevel,
        tag: detailEditForm.value.tag.trim(),
        desc: detailEditForm.value.desc.trim(),
        note: detailEditForm.value.note.trim(),
        rainBackup: detailEditForm.value.rainBackup.trim(),
        mapsQuery: detailEditForm.value.mapsQuery.trim(),
        splitOption: detailEditForm.value.splitOption.trim(),
        optional: Boolean(detailEditForm.value.optional),
        isCustom: true
      };

      const existingIdx = customActivities.value.findIndex(a => a.id === updatedItem.id);
      if (existingIdx >= 0) {
        customActivities.value[existingIdx] = updatedItem;
      } else {
        customActivities.value.push(updatedItem);
      }
      saveCustomActivities();

      selectedDetailItem.value = updatedItem;
      isEditingDetailActivity.value = false;
      showToast(`Updated "${updatedItem.activity}" (${updatedItem.time})`, '💾');
    };

    const isDetailItemOnHold = computed(() => {
      if (!selectedDetailItem.value) return false;
      const item = selectedDetailItem.value;
      const day = selectedDetailDay.value;
      const id = item.id || ('day' + (day ? day.dayNumber : 1) + '_' + (item.activity || item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '_'));
      return onHoldItemIds.value.includes(id) || item.status === 'on_hold';
    });

    const isDetailItemLocked = computed(() => {
      if (!selectedDetailItem.value) return false;
      const item = selectedDetailItem.value;
      if (item.tag === 'FLIGHT ARRIVAL' || item.tag === 'RETURN FLIGHT' || item.type === 'housing') return true;
      return false;
    });

    const holdDetailItem = () => {
      if (!selectedDetailItem.value) return;
      const item = selectedDetailItem.value;
      const day = selectedDetailDay.value;
      const id = item.id || ('day' + (day ? day.dayNumber : 1) + '_' + (item.activity || item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '_'));
      holdItem('schedule', id, item);
      closeDetailModal();
    };

    const unholdDetailItem = () => {
      if (!selectedDetailItem.value) return;
      const item = selectedDetailItem.value;
      const day = selectedDetailDay.value;
      const id = item.id || ('day' + (day ? day.dayNumber : 1) + '_' + (item.activity || item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '_'));
      unholdItem(id);
      closeDetailModal();
    };

    const deleteDetailItem = () => {
      if (!selectedDetailItem.value) return;
      const item = selectedDetailItem.value;
      const day = selectedDetailDay.value;
      const label = item.activity || item.title || 'stop';
      if (!confirm(`Remove "${label}" from your trip itinerary? (You can restore it anytime in Settings/Notes)`)) return;
      if (item.isCustom) {
        deleteCustomItem('schedule', item.id);
      } else {
        const id = item.id || ('day' + (day ? day.dayNumber : 1) + '_' + (item.activity || item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '_'));
        hideItem('schedule', id);
      }
      closeDetailModal();
    };

    // Deep jump between tabs & scroll to target element
    const handleSwitchTab = (payload, event) => {
      if (!payload) return;
      if (event && event.currentTarget && event.currentTarget.scrollIntoView) {
        event.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
      const { tab, targetId, dayIndex, dayNumber, trailId, searchQuery } = payload;
      if (tab) {
        activeTab.value = tab;
      }
      if (payload.subTab && tab === 'sights') {
        if (sightsDrivesRef.value && sightsDrivesRef.value.setSubTab) {
          sightsDrivesRef.value.setSubTab(payload.subTab);
        }
      }
      if (searchQuery !== undefined) {
        targetSearchQuery.value = searchQuery;
      }
      if (dayIndex !== undefined && dayIndex !== null) {
        selectedTargetDayIndex.value = parseInt(dayIndex);
      } else if (dayNumber !== undefined && dayNumber !== null) {
        selectedTargetDayIndex.value = parseInt(dayNumber) - 1;
      }
      if (isDetailModalOpen.value) {
        closeDetailModal();
      }
      nextTick(() => {
        setTimeout(() => {
          const cleanId = (targetId || trailId || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
          let el = null;
          if (cleanId) {
            el = document.getElementById(cleanId) ||
                 document.getElementById('trail-' + cleanId) ||
                 document.getElementById('restaurant-' + cleanId) ||
                 document.getElementById('res-' + cleanId);
          } else if (tab === 'planner') {
            const dayNum = dayNumber || (dayIndex !== undefined ? parseInt(dayIndex) + 1 : null);
            const idx = dayNum ? dayNum - 1 : (dayIndex !== undefined ? parseInt(dayIndex) : null);

            // Horizontally center the day strip card in the horizontal scroll container
            if (idx !== null) {
              const stripCard = document.getElementById('day-strip-card-' + idx);
              const container = document.getElementById('day-strip-scroll-container');
              if (stripCard && container) {
                const cardLeft = stripCard.offsetLeft;
                const cardWidth = stripCard.offsetWidth;
                const containerWidth = container.clientWidth;
                container.scrollTo({
                  left: Math.max(0, cardLeft - (containerWidth / 2) + (cardWidth / 2)),
                  behavior: 'smooth'
                });
              }
            }

            if (dayNum) el = document.getElementById('day-card-' + dayNum) || document.getElementById('active-day-focus-card');
            else if (dayIndex !== undefined) el = document.getElementById('day-' + dayIndex) || document.getElementById('active-day-focus-card');
            else el = document.getElementById('active-day-focus-card');
          }

          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            el.classList.add('card-highlight');
            setTimeout(() => el.classList.remove('card-highlight'), 2200);
          } else {
            // Scroll to the main tab navigation if no specific item target was requested (e.g. Budget)
            const mainNav = document.getElementById('main-tab-nav');
            if (mainNav) {
              mainNav.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        }, 150);
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
      { id: 'monochrome', name: 'Monochrome & Ice', desc: 'Crisp High-Contrast Slate & Ice Blue', color: '#0284c7', icon: '❄️' },
      { id: 'shamrock', name: 'Emerald & Celtic Forest', desc: 'Calming Forest Green & High-Contrast Pine', color: '#047857', icon: '☘️' },
      { id: 'navy', name: 'Royal Atlantic Navy', desc: 'Deep Navy & Ocean Blue (Easy on the Eyes)', color: '#1d4ed8', icon: '🌊' },
      { id: 'pure-black', name: 'Pure OLED High Contrast', desc: '100% Black & Pure White (Maximum Contrast)', color: '#18181b', icon: '⚪' }
    ];

    const selectedPalette = ref('monochrome');

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

    // ── Universal Trip Notes & Local Storage CRUD Manager ─────────
    const isScratchpadOpen = ref(false);
    const notesModalTab = ref('all'); // 'all', 'general', 'planner', 'reservations', 'hiking', 'restaurants', 'custom'
    const notesSearchQuery = ref('');
    const allNotesList = ref([]);
    const isAddingNewNote = ref(false);
    const newNoteForm = ref({
      tab: 'general',
      targetName: '',
      content: '',
      code: ''
    });
    const copiedNoteId = ref(null);
    const backupStats = ref({ daily: 0, bookings: 0, restaurants: 0, trails: 0, custom: 0, total: 0 });

    const openScratchpad = () => {
      loadAllNotesFromStorage();
      isScratchpadOpen.value = true;
      document.body.style.overflow = 'hidden';
    };

    const closeScratchpad = () => {
      isScratchpadOpen.value = false;
      document.body.style.overflow = '';
    };

    const loadAllNotesFromStorage = () => {
      const list = [];

      // 1. General Scratchpad
      const scratchpadText = localStorage.getItem('ireland_trip_scratchpad') || '';
      if (scratchpadText.trim()) {
        list.push({
          id: 'scratchpad-main',
          type: 'scratchpad',
          tab: 'general',
          tabLabel: 'General Scratchpad',
          targetName: 'Universal Travel Clipboard & Notes',
          targetId: null,
          date: 'Trip-wide',
          content: scratchpadText,
          code: '',
          isEditing: false,
          editBuffer: scratchpadText,
          codeBuffer: ''
        });
      }

      // 2. Daily Schedule Notes (Day 1 to 13)
      try {
        const daily = JSON.parse(localStorage.getItem('ireland_daily_notes') || '{}');
        Object.entries(daily).forEach(([dayIdxStr, text]) => {
          if (text && text.trim()) {
            const idx = parseInt(dayIdxStr);
            const dayObj = timeline[idx] || { dayNumber: idx + 1, date: 'Oct ' + (idx + 2), title: 'Day ' + (idx + 1) };
            list.push({
              id: 'daily-' + idx,
              type: 'daily',
              key: idx,
              tab: 'planner',
              tabLabel: 'Daily Schedule',
              targetName: `Day ${dayObj.dayNumber}: ${dayObj.title}`,
              targetId: 'day-card-' + dayObj.dayNumber,
              dayNumber: dayObj.dayNumber,
              date: dayObj.date,
              content: text,
              code: '',
              isEditing: false,
              editBuffer: text,
              codeBuffer: ''
            });
          }
        });
      } catch (e) {
        console.error('Error loading daily notes', e);
      }

      // 3. Reservation Notes & Confirmation Codes
      try {
        const bookings = JSON.parse(localStorage.getItem('ireland_reservation_notes') || '{}');
        Object.entries(bookings).forEach(([resName, data]) => {
          if ((data.notes && data.notes.trim()) || (data.code && data.code.trim())) {
            const resObj = reservations.find(r => r.name.toLowerCase() === resName.toLowerCase()) || { location: 'Ireland', date: 'Oct 2–14' };
            list.push({
              id: 'reservation-' + resName,
              type: 'reservation',
              key: resName,
              tab: 'reservations',
              tabLabel: 'Bookings & Lodgings',
              targetName: resName,
              targetId: resObj.restaurantId ? 'restaurant-' + resObj.restaurantId : 'tab-btn-reservations',
              date: resObj.date || 'Booking',
              location: resObj.location,
              content: data.notes || '',
              code: data.code || '',
              isEditing: false,
              editBuffer: data.notes || '',
              codeBuffer: data.code || ''
            });
          }
        });
      } catch (e) {
        console.error('Error loading reservation notes', e);
      }

      // 4. Trail & Hiking Notes
      try {
        const trails = JSON.parse(localStorage.getItem('ireland_trail_user_data') || '{}');
        Object.entries(trails).forEach(([trailId, data]) => {
          if (data && ((data.notes && data.notes.trim()) || data.completed || data.favorite)) {
            const trailObj = hikingTrails.find(t => t.id === trailId || t.name === trailId) || { name: trailId, regionName: 'Ireland' };
            list.push({
              id: 'trail-' + trailId,
              type: 'trail',
              key: trailId,
              tab: 'hiking',
              tabLabel: 'Trails & Nature',
              targetName: trailObj.name,
              targetId: 'trail-' + trailId,
              trailId: trailObj.id,
              date: trailObj.date || 'Hike',
              content: data.notes || (data.completed ? 'Marked as completed.' : ''),
              isCompleted: Boolean(data.completed),
              isFavorite: Boolean(data.favorite),
              code: '',
              isEditing: false,
              editBuffer: data.notes || '',
              codeBuffer: ''
            });
          }
        });
      } catch (e) {
        console.error('Error loading trail notes', e);
      }

      // 5. Restaurant & Dining Notes & Ratings
      try {
        const rest = JSON.parse(localStorage.getItem('ireland_restaurant_user_data') || '{}');
        Object.entries(rest).forEach(([restId, data]) => {
          if (data && ((data.notes && data.notes.trim()) || data.rating > 0 || data.favorite)) {
            const restObj = restaurants.find(r => r.id === restId || r.name === restId) || { name: restId, city: 'Ireland' };
            list.push({
              id: 'restaurant-' + restId,
              type: 'restaurant',
              key: restId,
              tab: 'restaurants',
              tabLabel: 'Dining & Pubs',
              targetName: restObj.name,
              targetId: 'restaurant-' + restId,
              restaurantId: restObj.id,
              date: restObj.city || 'Dining',
              rating: data.rating || 0,
              isFavorite: Boolean(data.favorite),
              content: data.notes || (data.rating > 0 ? `Rated ${data.rating} ★` : ''),
              code: '',
              isEditing: false,
              editBuffer: data.notes || '',
              codeBuffer: ''
            });
          }
        });
      } catch (e) {
        console.error('Error loading restaurant notes', e);
      }

      // 6. Custom User Standalone Notes
      try {
        const custom = JSON.parse(localStorage.getItem('ireland_custom_notes') || '[]');
        custom.forEach((item) => {
          list.push({
            id: item.id || ('custom-' + Math.random()),
            type: 'custom',
            key: item.id,
            tab: item.tab || 'custom',
            tabLabel: 'Custom Note',
            targetName: item.title || 'Personal Note',
            targetId: null,
            date: item.date || new Date().toLocaleDateString(),
            content: item.content || item.text || '',
            code: item.code || '',
            isEditing: false,
            editBuffer: item.content || item.text || '',
            codeBuffer: item.code || ''
          });
        });
      } catch (e) {
        console.error('Error loading custom notes', e);
      }

      allNotesList.value = list;

      // Update backup stats
      backupStats.value = {
        daily: list.filter(n => n.tab === 'planner').length,
        bookings: list.filter(n => n.tab === 'reservations').length,
        trails: list.filter(n => n.tab === 'hiking').length,
        restaurants: list.filter(n => n.tab === 'restaurants').length,
        custom: list.filter(n => n.tab === 'custom' || n.tab === 'general').length,
        total: list.length
      };
    };

    const filteredNotesList = computed(() => {
      return allNotesList.value.filter(n => {
        // Tab grouping filter
        if (notesModalTab.value !== 'all' && n.tab !== notesModalTab.value) {
          return false;
        }
        // Search query filter
        if (!notesSearchQuery.value.trim()) return true;
        const q = notesSearchQuery.value.toLowerCase();
        return (
          (n.targetName && n.targetName.toLowerCase().includes(q)) ||
          (n.content && n.content.toLowerCase().includes(q)) ||
          (n.code && n.code.toLowerCase().includes(q)) ||
          (n.date && n.date.toLowerCase().includes(q)) ||
          (n.tabLabel && n.tabLabel.toLowerCase().includes(q))
        );
      });
    });

    // CRUD: Create Note
    const createNewNote = () => {
      const form = newNoteForm.value;
      if (!form.content.trim() && !form.targetName.trim()) {
        alert('Please enter some note content or a title.');
        return;
      }

      if (form.tab === 'general') {
        const existing = localStorage.getItem('ireland_trip_scratchpad') || '';
        const updated = existing ? existing + '\n\n' + (form.targetName ? `[${form.targetName}]\n` : '') + form.content : form.content;
        localStorage.setItem('ireland_trip_scratchpad', updated);
      } else {
        const custom = JSON.parse(localStorage.getItem('ireland_custom_notes') || '[]');
        custom.unshift({
          id: 'note-' + Date.now(),
          tab: form.tab,
          title: form.targetName || 'Note (' + new Date().toLocaleDateString() + ')',
          content: form.content,
          code: form.code || '',
          date: new Date().toLocaleDateString()
        });
        localStorage.setItem('ireland_custom_notes', JSON.stringify(custom));
      }

      newNoteForm.value = { tab: 'general', targetName: '', content: '', code: '' };
      isAddingNewNote.value = false;
      loadAllNotesFromStorage();
      showToast('Note saved offline', '📝');
    };

    // CRUD: Update Note
    const saveNoteEdit = (note) => {
      const newText = note.editBuffer;
      const newCode = note.codeBuffer;

      if (note.type === 'scratchpad') {
        localStorage.setItem('ireland_trip_scratchpad', newText);
      } else if (note.type === 'daily') {
        const daily = JSON.parse(localStorage.getItem('ireland_daily_notes') || '{}');
        daily[note.key] = newText;
        localStorage.setItem('ireland_daily_notes', JSON.stringify(daily));
      } else if (note.type === 'reservation') {
        const bookings = JSON.parse(localStorage.getItem('ireland_reservation_notes') || '{}');
        if (!bookings[note.key]) bookings[note.key] = { code: '', notes: '' };
        bookings[note.key].notes = newText;
        bookings[note.key].code = newCode;
        localStorage.setItem('ireland_reservation_notes', JSON.stringify(bookings));
      } else if (note.type === 'trail') {
        const trails = JSON.parse(localStorage.getItem('ireland_trail_user_data') || '{}');
        if (!trails[note.key]) trails[note.key] = { completed: false, notes: '', favorite: false };
        trails[note.key].notes = newText;
        localStorage.setItem('ireland_trail_user_data', JSON.stringify(trails));
      } else if (note.type === 'restaurant') {
        const rest = JSON.parse(localStorage.getItem('ireland_restaurant_user_data') || '{}');
        if (!rest[note.key]) rest[note.key] = { rating: 0, notes: '', favorite: false };
        rest[note.key].notes = newText;
        localStorage.setItem('ireland_restaurant_user_data', JSON.stringify(rest));
      } else if (note.type === 'custom') {
        const custom = JSON.parse(localStorage.getItem('ireland_custom_notes') || '[]');
        const idx = custom.findIndex(c => c.id === note.key);
        if (idx !== -1) {
          custom[idx].content = newText;
          custom[idx].code = newCode;
          localStorage.setItem('ireland_custom_notes', JSON.stringify(custom));
        }
      }

      note.content = newText;
      note.code = newCode;
      note.isEditing = false;
      loadAllNotesFromStorage();
      showToast('Note updated', '💾');
    };

    // CRUD: Delete Note
    const deleteNote = (note) => {
      if (!confirm(`Are you sure you want to delete this note for "${note.targetName}"?`)) return;

      if (note.type === 'scratchpad') {
        localStorage.removeItem('ireland_trip_scratchpad');
      } else if (note.type === 'daily') {
        const daily = JSON.parse(localStorage.getItem('ireland_daily_notes') || '{}');
        delete daily[note.key];
        localStorage.setItem('ireland_daily_notes', JSON.stringify(daily));
      } else if (note.type === 'reservation') {
        const bookings = JSON.parse(localStorage.getItem('ireland_reservation_notes') || '{}');
        delete bookings[note.key];
        localStorage.setItem('ireland_reservation_notes', JSON.stringify(bookings));
      } else if (note.type === 'trail') {
        const trails = JSON.parse(localStorage.getItem('ireland_trail_user_data') || '{}');
        if (trails[note.key]) {
          trails[note.key].notes = '';
          localStorage.setItem('ireland_trail_user_data', JSON.stringify(trails));
        }
      } else if (note.type === 'restaurant') {
        const rest = JSON.parse(localStorage.getItem('ireland_restaurant_user_data') || '{}');
        if (rest[note.key]) {
          rest[note.key].notes = '';
          localStorage.setItem('ireland_restaurant_user_data', JSON.stringify(rest));
        }
      } else if (note.type === 'custom') {
        let custom = JSON.parse(localStorage.getItem('ireland_custom_notes') || '[]');
        custom = custom.filter(c => c.id !== note.key);
        localStorage.setItem('ireland_custom_notes', JSON.stringify(custom));
      }

      loadAllNotesFromStorage();
      showToast('Note deleted', '🗑️');
    };

    const copyNoteContent = (note) => {
      const fullText = (note.code ? `Code: ${note.code}\n` : '') + note.content;
      navigator.clipboard.writeText(fullText).then(() => {
        copiedNoteId.value = note.id;
        setTimeout(() => {
          if (copiedNoteId.value === note.id) copiedNoteId.value = null;
        }, 1800);
      });
    };

    const jumpFromNoteToTarget = (note) => {
      closeScratchpad();
      if (note.tab === 'planner') {
        handleSwitchTab({ tab: 'planner', dayNumber: note.dayNumber });
      } else if (note.tab === 'reservations') {
        handleSwitchTab({ tab: 'reservations', targetId: note.targetId });
      } else if (note.tab === 'hiking') {
        handleSwitchTab({ tab: 'hiking', targetId: note.trailId });
      } else if (note.tab === 'restaurants') {
        handleSwitchTab({ tab: 'restaurants', targetId: note.restaurantId });
      }
    };

    // ── Group Consensus & Voting Engine ────────────────────────
    const getItemVotes = (id) => {
      if (!id) return { up: 0, down: 0, userVoted: null };
      return itemVotes.value[id] || { up: 0, down: 0, userVoted: null };
    };

    const voteItem = (id, type) => {
      if (!id) return;
      const current = itemVotes.value[id] || { up: 0, down: 0, userVoted: null };
      let newUp = current.up || 0;
      let newDown = current.down || 0;
      let newUserVoted = current.userVoted;

      if (type === 'up') {
        if (newUserVoted === 'up') {
          newUp = Math.max(0, newUp - 1);
          newUserVoted = null;
        } else {
          newUp += 1;
          if (newUserVoted === 'down') newDown = Math.max(0, newDown - 1);
          newUserVoted = 'up';
        }
      } else if (type === 'down') {
        if (newUserVoted === 'down') {
          newDown = Math.max(0, newDown - 1);
          newUserVoted = null;
        } else {
          newDown += 1;
          if (newUserVoted === 'up') newUp = Math.max(0, newUp - 1);
          newUserVoted = 'down';
        }
      }

      itemVotes.value = {
        ...itemVotes.value,
        [id]: { up: newUp, down: newDown, userVoted: newUserVoted }
      };
      saveItemVotes();
      if (newUserVoted === 'up') {
        showToast('Upvoted for family sync', '👍');
      } else if (newUserVoted === 'down') {
        showToast('Downvote recorded for family sync', '👎');
      }
    };

    const setItemStatus = (category, id, newStatus) => {
      if (category === 'schedule') {
        const idx = customActivities.value.findIndex(a => a.id === id);
        if (idx >= 0) {
          customActivities.value[idx].status = newStatus;
          saveCustomActivities();
        }
      } else if (category === 'dining') {
        const idx = customRestaurants.value.findIndex(r => r.id === id);
        if (idx >= 0) {
          customRestaurants.value[idx].status = newStatus;
          saveCustomRestaurants();
        }
      } else if (category === 'trail') {
        const idx = customTrails.value.findIndex(t => t.id === id);
        if (idx >= 0) {
          customTrails.value[idx].status = newStatus;
          saveCustomTrails();
        }
      } else if (category === 'booking') {
        const idx = customReservations.value.findIndex(b => b.id === id);
        if (idx >= 0) {
          customReservations.value[idx].status = newStatus;
          saveCustomReservations();
        }
      }
    };

    const deleteCustomItem = (category, id) => {
      if (!confirm('Are you sure you want to delete this custom item?')) return;
      if (category === 'schedule') {
        customActivities.value = customActivities.value.filter(a => a.id !== id);
        saveCustomActivities();
      } else if (category === 'dining') {
        customRestaurants.value = customRestaurants.value.filter(r => r.id !== id);
        saveCustomRestaurants();
      } else if (category === 'trail') {
        customTrails.value = customTrails.value.filter(t => t.id !== id);
        saveCustomTrails();
      } else if (category === 'booking') {
        customReservations.value = customReservations.value.filter(b => b.id !== id);
        saveCustomReservations();
      }
      showToast('Custom item deleted', '🗑️');
    };

    // ── Universal Trip Creator & Importer Modal ────────────────
    const isCreatorModalOpen = ref(false);
    const creatorTab = ref('schedule'); // 'schedule', 'dining', 'trail', 'booking', 'bulk'

    const newScheduleForm = ref({
      dayIndex: 0,
      time: '11:00 AM',
      dur: '1.5 hrs',
      durHours: 1.5,
      activity: '',
      type: 'sight',
      energyLevel: 'moderate',
      tag: 'GROUP IDEA',
      desc: '',
      location: '',
      rainBackup: '',
      splitOption: '',
      status: 'proposed'
    });

    const newDiningForm = ref({
      name: '',
      city: 'Galway',
      cuisine: 'Traditional Irish & Seafood',
      cuisineType: 'Seafood',
      price: '€€',
      mustOrder: '',
      notes: '',
      resAdvice: 'Walk-ins or call ahead',
      status: 'proposed',
      menuFileName: '',
      menuData: null,
      menuFileType: ''
    });

    const handleCreatorMenuUpload = (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      if (file.size > 15 * 1024 * 1024) {
        alert('File size exceeds 15MB. Please choose a smaller file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        newDiningForm.value.menuFileName = file.name;
        newDiningForm.value.menuFileType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
        newDiningForm.value.menuData = e.target.result;
      };
      reader.readAsDataURL(file);
    };

    const newTrailForm = ref({
      name: '',
      region: 'galway',
      regionName: 'Connemara, Co. Galway',
      distance: '5.0 km',
      elevation: '250 m',
      duration: '2.0 hrs',
      difficulty: 'Moderate',
      highlights: '',
      gear: 'Hiking boots & waterproof jacket',
      parkingTip: '',
      rainBackup: '',
      status: 'proposed'
    });

    const newBookingForm = ref({
      name: '',
      date: 'Oct 5, 2026',
      time: '10:00 AM',
      location: 'Galway',
      type: 'activity',
      cost: '€30',
      status: 'Proposed',
      cancelPolicy: '24hr free cancellation',
      notes: ''
    });

    const openCreator = (tab = 'schedule', initialData = null) => {
      creatorTab.value = tab;
      if (tab === 'schedule' && initialData) {
        if (initialData.dayIndex !== undefined) {
          newScheduleForm.value.dayIndex = initialData.dayIndex;
        }
        if (initialData.onHold) {
          newScheduleForm.value.status = 'on_hold';
        }
      }
      isCreatorModalOpen.value = true;
      document.body.style.overflow = 'hidden';
    };

    const closeCreator = () => {
      isCreatorModalOpen.value = false;
      document.body.style.overflow = '';
    };

    const saveScheduleStop = () => {
      if (!newScheduleForm.value.activity.trim()) {
        alert('Please enter an activity name.');
        return;
      }
      const timeStr = newScheduleForm.value.time || '10:00 AM';
      const dayIdx = parseInt(newScheduleForm.value.dayIndex) || 0;
      const durH = parseFloat(newScheduleForm.value.durHours) || 1.5;
      const startH = parseTimeToHour(timeStr);
      const endH = startH + durH;

      const newStop = {
        id: 'cust_act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        dayIndex: dayIdx,
        dayNumber: dayIdx + 1,
        time: timeStr,
        dur: newScheduleForm.value.dur || `${durH} hrs`,
        durHours: durH,
        startHour: startH,
        endHour: endH,
        activity: newScheduleForm.value.activity.trim(),
        type: newScheduleForm.value.type || 'sight',
        energyLevel: newScheduleForm.value.energyLevel || 'moderate',
        tag: newScheduleForm.value.tag.trim() || 'PROPOSED',
        desc: newScheduleForm.value.desc.trim(),
        mapsQuery: newScheduleForm.value.location.trim() || newScheduleForm.value.activity.trim() + ', Ireland',
        location: newScheduleForm.value.location.trim(),
        rainBackup: newScheduleForm.value.rainBackup.trim(),
        splitOption: newScheduleForm.value.splitOption.trim(),
        status: newScheduleForm.value.status || 'proposed',
        isCustom: true,
        createdBy: userSenderName.value || 'Family Member',
        createdAt: new Date().toISOString()
      };

      const isHold = newScheduleForm.value.status === 'on_hold';
      if (isHold) {
        onHoldItemIds.value.push(newStop.id);
        saveOnHoldItemIds();
      }

      customActivities.value.push(newStop);
      saveCustomActivities();

      // Initialize vote
      voteItem(newStop.id, 'up');

      const savedActivityName = newStop.activity;
      const targetDay = dayIdx + 1;

      // Reset form
      newScheduleForm.value.activity = '';
      newScheduleForm.value.desc = '';
      newScheduleForm.value.location = '';
      newScheduleForm.value.rainBackup = '';
      newScheduleForm.value.splitOption = '';
      newScheduleForm.value.status = 'proposed';

      closeCreator();
      handleSwitchTab({ tab: 'planner', dayIndex: dayIdx });
      if (isHold) {
        showToast(`Added "${savedActivityName}" to Day ${targetDay} Suggestions Box (On Hold)`, '💡');
      } else {
        showToast(`Added "${savedActivityName}" to Day ${targetDay}`, '✨');
      }
    };

    const saveDiningSpot = () => {
      if (!newDiningForm.value.name.trim()) {
        alert('Please enter a restaurant or pub name.');
        return;
      }
      const newRest = {
        id: 'cust_rest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        name: newDiningForm.value.name.trim(),
        city: newDiningForm.value.city,
        cuisine: newDiningForm.value.cuisine.trim() || 'Irish & Seafood',
        cuisineType: newDiningForm.value.cuisineType || 'Modern Irish',
        price: newDiningForm.value.price || '€€',
        mustOrder: newDiningForm.value.mustOrder.trim(),
        notes: newDiningForm.value.notes.trim(),
        resAdvice: newDiningForm.value.resAdvice.trim() || 'Walk-in or call ahead',
        status: newDiningForm.value.status || 'proposed',
        isCustom: true,
        createdBy: userSenderName.value || 'Family Member',
        createdAt: new Date().toISOString()
      };

      if (newDiningForm.value.menuData) {
        newRest.menu = {
          fileName: newDiningForm.value.menuFileName,
          fileType: newDiningForm.value.menuFileType,
          data: newDiningForm.value.menuData,
          uploadedAt: new Date().toISOString()
        };
        try {
          const menus = JSON.parse(localStorage.getItem('ireland_restaurant_menus') || '{}');
          menus[newRest.id] = newRest.menu;
          localStorage.setItem('ireland_restaurant_menus', JSON.stringify(menus));
        } catch (e) {}
      }

      customRestaurants.value.push(newRest);
      saveCustomRestaurants();
      voteItem(newRest.id, 'up');

      const savedRestName = newRest.name;

      newDiningForm.value.name = '';
      newDiningForm.value.mustOrder = '';
      newDiningForm.value.notes = '';
      newDiningForm.value.menuFileName = '';
      newDiningForm.value.menuData = null;
      newDiningForm.value.menuFileType = '';

      closeCreator();
      handleSwitchTab({ tab: 'restaurants' });
      showToast(`Added "${savedRestName}" to Food & Pubs`, '🍴');
    };

    const saveHikingTrail = () => {
      if (!newTrailForm.value.name.trim()) {
        alert('Please enter a trail name.');
        return;
      }
      const newTrail = {
        id: 'cust_trail_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        name: newTrailForm.value.name.trim(),
        region: newTrailForm.value.region,
        regionName: newTrailForm.value.regionName.trim() || newTrailForm.value.region.toUpperCase(),
        distance: newTrailForm.value.distance.trim() || '5.0 km',
        elevation: newTrailForm.value.elevation.trim() || '200 m',
        duration: newTrailForm.value.duration.trim() || '2 hrs',
        difficulty: newTrailForm.value.difficulty || 'Moderate',
        highlights: newTrailForm.value.highlights.trim(),
        gear: newTrailForm.value.gear.trim() || 'Sturdy boots & waterproof shell',
        parkingTip: newTrailForm.value.parkingTip.trim(),
        rainBackup: newTrailForm.value.rainBackup.trim(),
        base: newTrailForm.value.region === 'ni' ? 'Belfast' : (newTrailForm.value.region === 'galway' ? 'Galway' : (newTrailForm.value.region === 'kerry' ? 'Killarney' : 'Dublin')),
        status: newTrailForm.value.status || 'proposed',
        isCustom: true,
        createdBy: userSenderName.value || 'Family Member',
        createdAt: new Date().toISOString()
      };

      customTrails.value.push(newTrail);
      saveCustomTrails();
      voteItem(newTrail.id, 'up');

      const savedTrailName = newTrail.name;

      newTrailForm.value.name = '';
      newTrailForm.value.highlights = '';
      newTrailForm.value.parkingTip = '';

      closeCreator();
      handleSwitchTab({ tab: 'hiking' });
      showToast(`Added "${savedTrailName}" to Hiking guide`, '🥾');
    };

    const saveBookingPass = () => {
      if (!newBookingForm.value.name.trim()) {
        alert('Please enter a booking or pass name.');
        return;
      }
      const newBooking = {
        id: 'cust_res_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        name: newBookingForm.value.name.trim(),
        date: newBookingForm.value.date.trim(),
        time: newBookingForm.value.time.trim(),
        location: newBookingForm.value.location.trim(),
        type: newBookingForm.value.type || 'activity',
        cost: newBookingForm.value.cost.trim() || '€0',
        status: newBookingForm.value.status || 'Proposed',
        cancelPolicy: newBookingForm.value.cancelPolicy.trim() || 'Check with vendor',
        notes: newBookingForm.value.notes.trim(),
        isCustom: true,
        createdBy: userSenderName.value || 'Family Member',
        createdAt: new Date().toISOString()
      };

      customReservations.value.push(newBooking);
      saveCustomReservations();
      voteItem(newBooking.id, 'up');

      const savedBookingName = newBooking.name;

      newBookingForm.value.name = '';
      newBookingForm.value.notes = '';

      closeCreator();
      handleSwitchTab({ tab: 'reservations' });
      showToast(`Added "${savedBookingName}" to Bookings`, '📋');
    };

    // ── Bulk Smart Importer Engine ─────────────────────────────
    const bulkImportText = ref('');
    const bulkImportPreview = ref([]);
    const bulkImportStatus = ref('');

    const parseBulkImport = () => {
      bulkImportPreview.value = [];
      const text = bulkImportText.value.trim();
      if (!text) {
        bulkImportStatus.value = 'Please paste some text or JSON first.';
        return;
      }

      // 1. Try parsing as JSON first
      if (text.startsWith('{') || text.startsWith('[')) {
        try {
          const parsed = JSON.parse(text);
          const list = Array.isArray(parsed) ? parsed : (parsed.items || parsed.activities || parsed.customActivities || []);
          list.forEach(item => {
            bulkImportPreview.value.push({
              category: item.category || (item.dayIndex !== undefined ? 'schedule' : (item.cuisine ? 'dining' : (item.difficulty ? 'trail' : 'schedule'))),
              name: item.activity || item.name || item.title || 'Imported Item',
              detail: item.desc || item.notes || item.cuisine || `${item.time || ''} · ${item.location || ''}`,
              raw: item,
              selected: true
            });
          });
          bulkImportStatus.value = `✅ Successfully parsed ${bulkImportPreview.value.length} items from JSON!`;
          return;
        } catch (e) {
          // Fall through to plain text parser
        }
      }

      // 2. Intelligent Plain Text / Bullet Line Parser
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      lines.forEach((line, idx) => {
        // Match Day X prefix
        const dayMatch = line.match(/(?:Day\s*(\d+)|Oct\s*(\d+))/i);
        const timeMatch = line.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))/);
        const dayNum = dayMatch ? parseInt(dayMatch[1] || dayMatch[2]) : null;
        const timeStr = timeMatch ? timeMatch[1].toUpperCase() : '12:00 PM';

        let category = 'schedule';
        if (line.toLowerCase().includes('pub') || line.toLowerCase().includes('restaurant') || line.toLowerCase().includes('dinner') || line.toLowerCase().includes('lunch') || line.toLowerCase().includes('seafood') || line.toLowerCase().includes('food')) {
          category = 'dining';
        } else if (line.toLowerCase().includes('trail') || line.toLowerCase().includes('hike') || line.toLowerCase().includes('mountain') || line.toLowerCase().includes('loop') || line.toLowerCase().includes('walk')) {
          category = 'trail';
        } else if (line.toLowerCase().includes('booking') || line.toLowerCase().includes('ferry') || line.toLowerCase().includes('tour') || line.toLowerCase().includes('hotel') || line.toLowerCase().includes('pass')) {
          category = 'booking';
        }

        // Clean line
        const cleanedTitle = line.replace(/^(?:[-*•]|\d+\.|\d+\))\s*/, '').replace(/^(?:Day\s*\d+:?|Oct\s*\d+:?)\s*/i, '').trim();

        bulkImportPreview.value.push({
          category: category,
          name: cleanedTitle.split(/[-–|;:]/)[0].trim(),
          detail: cleanedTitle.includes('-') || cleanedTitle.includes('|') ? cleanedTitle : `Imported line #${idx + 1}`,
          dayIndex: dayNum && dayNum >= 1 && dayNum <= 13 ? dayNum - 1 : 0,
          time: timeStr,
          rawText: line,
          selected: true
        });
      });

      bulkImportStatus.value = `✨ Smart-detected ${bulkImportPreview.value.length} items from text! Review below and tap Import.`;
    };

    const applyBulkImport = () => {
      const selected = bulkImportPreview.value.filter(i => i.selected);
      if (selected.length === 0) {
        alert('No items selected for import.');
        return;
      }

      let count = 0;
      selected.forEach(item => {
        const id = 'bulk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        if (item.category === 'schedule') {
          customActivities.value.push({
            id: id,
            dayIndex: item.dayIndex || 0,
            dayNumber: (item.dayIndex || 0) + 1,
            time: item.time || '12:00 PM',
            dur: '1.5 hrs',
            durHours: 1.5,
            activity: item.name,
            type: 'sight',
            energyLevel: 'moderate',
            tag: 'BULK IMPORT',
            desc: item.detail,
            mapsQuery: item.name + ', Ireland',
            status: 'proposed',
            isCustom: true,
            createdBy: userSenderName.value || 'Family Member',
            createdAt: new Date().toISOString()
          });
          voteItem(id, 'up');
          count++;
        } else if (item.category === 'dining') {
          customRestaurants.value.push({
            id: id,
            name: item.name,
            city: 'Galway',
            cuisine: 'Irish & Casual',
            cuisineType: 'Modern Irish',
            price: '€€',
            notes: item.detail,
            resAdvice: 'Walk-ins or call ahead',
            status: 'proposed',
            isCustom: true,
            createdBy: userSenderName.value || 'Family Member',
            createdAt: new Date().toISOString()
          });
          voteItem(id, 'up');
          count++;
        } else if (item.category === 'trail') {
          customTrails.value.push({
            id: id,
            name: item.name,
            region: 'galway',
            regionName: 'Connemara, Co. Galway',
            distance: '5.0 km',
            elevation: '200 m',
            duration: '2 hrs',
            difficulty: 'Moderate',
            highlights: item.detail,
            gear: 'Sturdy boots & waterproof shell',
            base: 'Galway',
            status: 'proposed',
            isCustom: true,
            createdBy: userSenderName.value || 'Family Member',
            createdAt: new Date().toISOString()
          });
          voteItem(id, 'up');
          count++;
        } else if (item.category === 'booking') {
          customReservations.value.push({
            id: id,
            name: item.name,
            date: 'Oct 5, 2026',
            time: item.time || '10:00 AM',
            location: 'Ireland',
            type: 'activity',
            cost: '€0',
            status: 'Proposed',
            cancelPolicy: 'Check booking terms',
            notes: item.detail,
            isCustom: true,
            createdBy: userSenderName.value || 'Family Member',
            createdAt: new Date().toISOString()
          });
          voteItem(id, 'up');
          count++;
        }
      });

      saveCustomActivities();
      saveCustomRestaurants();
      saveCustomTrails();
      saveCustomReservations();

      bulkImportText.value = '';
      bulkImportPreview.value = [];
      bulkImportStatus.value = '';
      closeCreator();
      showToast(`Successfully imported ${count} items!`, '📦');
    };

    const clearBulkImport = () => {
      bulkImportText.value = '';
      bulkImportPreview.value = [];
      bulkImportStatus.value = '';
    };

    // ── Zero-Cost Share Link & QR Code Live Sync ───────────────
    const isShareSyncModalOpen = ref(false);
    const shareSyncUrl = ref('');
    const shareSyncQrUrl = ref('');
    const shareCopied = ref(false);

    const openShareSync = () => {
      const baseUrl = (typeof window !== 'undefined' && window.location && window.location.href ? window.location.href.split('#')[0] : 'https://nolanshirley.github.io/ireland-trip-2026/');
      const payload = {
        v: 1,
        sender: userSenderName.value || 'Family Traveler',
        time: new Date().toISOString(),
        activities: customActivities.value || [],
        restaurants: customRestaurants.value || [],
        trails: customTrails.value || [],
        reservations: customReservations.value || [],
        votes: itemVotes.value || {},
        notes: customNotes.value || [],
        scratchpad: localStorage.getItem('ireland_trip_scratchpad') || '',
        hiddenItemIds: hiddenItemIds.value || [],
        menus: JSON.parse(localStorage.getItem('ireland_restaurant_menus') || '{}')
      };

      try {
        const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(payload)))));
        const url = baseUrl + '#sync=' + encoded;
        shareSyncUrl.value = url;
        shareSyncQrUrl.value = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(url)}`;
      } catch (e) {
        console.error('Error generating sync url', e);
        shareSyncUrl.value = baseUrl;
        shareSyncQrUrl.value = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(baseUrl)}`;
      }

      isShareSyncModalOpen.value = true;
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.overflow = 'hidden';
      }
    };

    const closeShareSync = () => {
      isShareSyncModalOpen.value = false;
      document.body.style.overflow = '';
    };

    const copyShareLink = () => {
      navigator.clipboard.writeText(shareSyncUrl.value).then(() => {
        shareCopied.value = true;
        showToast('Trip sync link copied to clipboard', '🔗');
        setTimeout(() => { shareCopied.value = false; }, 2500);
      }).catch(() => {
        const input = document.createElement('textarea');
        input.value = shareSyncUrl.value;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        shareCopied.value = true;
        showToast('Trip sync link copied to clipboard', '🔗');
        setTimeout(() => { shareCopied.value = false; }, 2500);
      });
    };

    const shareToWhatsApp = () => {
      const text = `🍀 Check out our updated Ireland 2026 Trip Itinerary!\nTap here to sync all new stops, restaurants & votes:\n${shareSyncUrl.value}`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    };

    const shareToEmail = () => {
      const subject = `🍀 Ireland 2026 Trip Itinerary Updates & Consensus Votes`;
      const body = `Hey everyone,\n\nHere is our updated Ireland 2026 trip schedule, dining list, and group votes:\n\n${shareSyncUrl.value}\n\nTap the link above on your phone or computer to automatically merge all new recommendations and votes into your trip dashboard!`;
      window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    };

    // ── Incoming URL Sync Detector & Non-Destructive Merge ──────
    const incomingSyncPayload = ref(null);
    const isIncomingSyncModalOpen = ref(false);

    const incomingSummary = computed(() => {
      if (!incomingSyncPayload.value) return { stops: 0, dining: 0, trails: 0, bookings: 0, votes: 0, menus: 0, sender: 'Family' };
      const p = incomingSyncPayload.value;
      return {
        stops: (p.activities && p.activities.length) || 0,
        dining: (p.restaurants && p.restaurants.length) || 0,
        trails: (p.trails && p.trails.length) || 0,
        bookings: (p.reservations && p.reservations.length) || 0,
        votes: (p.votes && Object.keys(p.votes).length) || 0,
        menus: (p.menus && Object.keys(p.menus).length) || 0,
        sender: p.sender || 'Family Member'
      };
    });

    const checkUrlSyncPayload = () => {
      try {
        const hash = window.location.hash;
        if (hash && hash.startsWith('#sync=')) {
          const payloadStr = hash.slice(6);

          // Strip hash immediately from browser address bar to prevent modal reappearing on refresh
          try {
            history.replaceState(null, '', window.location.pathname + window.location.search);
          } catch (e) {}

          // Ensure sync prompt is only shown once per session for this payload
          const alreadyPrompted = sessionStorage.getItem('ireland_last_synced_hash');
          if (alreadyPrompted === payloadStr) {
            return;
          }
          try {
            sessionStorage.setItem('ireland_last_synced_hash', payloadStr);
          } catch (e) {}

          if (payloadStr) {
            const decoded = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(payloadStr)))));
            if (decoded && (decoded.activities || decoded.restaurants || decoded.trails || decoded.reservations || decoded.votes || decoded.notes || decoded.hiddenItemIds || decoded.menus)) {
              incomingSyncPayload.value = decoded;
              isIncomingSyncModalOpen.value = true;
            }
          }
        }
      } catch (e) {
        console.warn('Could not parse sync payload from URL hash', e);
      }
    };

    const applyIncomingSync = (mode = 'merge') => {
      if (!incomingSyncPayload.value) return;
      const p = incomingSyncPayload.value;
      let firstMergedDayIndex = null;
      let mergedStopsCount = 0;

      if (mode === 'replace') {
        if (p.activities && Array.isArray(p.activities)) {
          customActivities.value = p.activities.map(act => {
            const startH = parseTimeToHour(act.time || act.startHour);
            const dur = parseFloat(act.durHours) || (parseFloat(act.dur) || 1.5);
            return { ...act, startHour: startH, endHour: startH + Math.max(0.5, dur) };
          });
          if (customActivities.value.length > 0 && customActivities.value[0].dayIndex !== undefined) {
            firstMergedDayIndex = parseInt(customActivities.value[0].dayIndex);
          }
          mergedStopsCount = customActivities.value.length;
        } else {
          customActivities.value = [];
        }
        customRestaurants.value = Array.isArray(p.restaurants) ? [...p.restaurants] : [];
        customTrails.value = Array.isArray(p.trails) ? [...p.trails] : [];
        customReservations.value = Array.isArray(p.reservations) ? [...p.reservations] : [];
        itemVotes.value = (p.votes && typeof p.votes === 'object') ? { ...p.votes } : {};
        hiddenItemIds.value = Array.isArray(p.hiddenItemIds) ? [...p.hiddenItemIds] : [];
        saveHiddenItemIds();
        if (p.menus && typeof p.menus === 'object') {
          localStorage.setItem('ireland_restaurant_menus', JSON.stringify(p.menus));
        }
        if (p.notes && Array.isArray(p.notes)) {
          customNotes.value = [...p.notes];
          localStorage.setItem('ireland_custom_notes', JSON.stringify(customNotes.value));
        }
        if (p.scratchpad !== undefined) localStorage.setItem('ireland_trip_scratchpad', p.scratchpad);
      } else {
        // Non-destructive Merge
        if (p.activities && Array.isArray(p.activities)) {
          const current = [...customActivities.value];
          p.activities.forEach(incoming => {
            const startH = parseTimeToHour(incoming.time || incoming.startHour);
            const dur = parseFloat(incoming.durHours) || (parseFloat(incoming.dur) || 1.5);
            const preparedIncoming = {
              ...incoming,
              dayIndex: incoming.dayIndex !== undefined ? parseInt(incoming.dayIndex) : (incoming.dayNumber ? parseInt(incoming.dayNumber) - 1 : 0),
              startHour: startH,
              endHour: startH + Math.max(0.5, dur)
            };
            const idx = current.findIndex(a => a.id === preparedIncoming.id || (a.activity === preparedIncoming.activity && parseInt(a.dayIndex) === preparedIncoming.dayIndex));
            if (idx >= 0) {
              current[idx] = { ...current[idx], ...preparedIncoming };
            } else {
              current.push(preparedIncoming);
              mergedStopsCount++;
              if (firstMergedDayIndex === null && preparedIncoming.dayIndex !== undefined) {
                firstMergedDayIndex = preparedIncoming.dayIndex;
              }
            }
          });
          customActivities.value = current;
        }

        if (p.restaurants && Array.isArray(p.restaurants)) {
          const current = [...customRestaurants.value];
          p.restaurants.forEach(incoming => {
            const idx = current.findIndex(r => r.id === incoming.id || (r.name.toLowerCase() === incoming.name.toLowerCase() && r.city === incoming.city));
            if (idx >= 0) {
              current[idx] = { ...current[idx], ...incoming };
            } else {
              current.push(incoming);
            }
          });
          customRestaurants.value = current;
        }

        if (p.trails && Array.isArray(p.trails)) {
          const current = [...customTrails.value];
          p.trails.forEach(incoming => {
            const idx = current.findIndex(t => t.id === incoming.id || t.name.toLowerCase() === incoming.name.toLowerCase());
            if (idx >= 0) {
              current[idx] = { ...current[idx], ...incoming };
            } else {
              current.push(incoming);
            }
          });
          customTrails.value = current;
        }

        if (p.reservations && Array.isArray(p.reservations)) {
          const current = [...customReservations.value];
          p.reservations.forEach(incoming => {
            const idx = current.findIndex(b => b.id === incoming.id || (b.name.toLowerCase() === incoming.name.toLowerCase() && b.date === incoming.date));
            if (idx >= 0) {
              current[idx] = { ...current[idx], ...incoming };
            } else {
              current.push(incoming);
            }
          });
          customReservations.value = current;
        }

        if (p.votes && typeof p.votes === 'object') {
          const mergedVotes = { ...itemVotes.value };
          Object.keys(p.votes).forEach(k => {
            if (!mergedVotes[k]) {
              mergedVotes[k] = p.votes[k];
            } else {
              mergedVotes[k] = {
                up: Math.max(mergedVotes[k].up || 0, p.votes[k].up || 0),
                down: Math.max(mergedVotes[k].down || 0, p.votes[k].down || 0),
                userVoted: mergedVotes[k].userVoted || p.votes[k].userVoted
              };
            }
          });
          itemVotes.value = mergedVotes;
        }

        if (p.hiddenItemIds && Array.isArray(p.hiddenItemIds)) {
          hiddenItemIds.value = Array.from(new Set([...hiddenItemIds.value, ...p.hiddenItemIds]));
          saveHiddenItemIds();
        }

        if (p.menus && typeof p.menus === 'object') {
          try {
            const existingMenus = JSON.parse(localStorage.getItem('ireland_restaurant_menus') || '{}');
            const mergedMenus = { ...existingMenus, ...p.menus };
            localStorage.setItem('ireland_restaurant_menus', JSON.stringify(mergedMenus));
          } catch (e) {}
        }

        if (p.notes && Array.isArray(p.notes)) {
          const currentNotes = [...customNotes.value];
          p.notes.forEach(incNote => {
            const idx = currentNotes.findIndex(n => n.id === incNote.id);
            if (idx >= 0) {
              currentNotes[idx] = { ...currentNotes[idx], ...incNote };
            } else {
              currentNotes.push(incNote);
            }
          });
          customNotes.value = currentNotes;
          localStorage.setItem('ireland_custom_notes', JSON.stringify(customNotes.value));
        }

        if (p.scratchpad && !localStorage.getItem('ireland_trip_scratchpad')) {
          localStorage.setItem('ireland_trip_scratchpad', p.scratchpad);
        }
      }

      saveCustomActivities();
      saveCustomRestaurants();
      saveCustomTrails();
      saveCustomReservations();
      saveItemVotes();
      saveHiddenItemIds();

      try {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      } catch (e) {}

      isIncomingSyncModalOpen.value = false;
      incomingSyncPayload.value = null;

      // Automatically jump to the merged day on the planner tab so the user sees the new stops immediately!
      if (firstMergedDayIndex !== null) {
        handleSwitchTab({ tab: 'planner', dayIndex: firstMergedDayIndex });
      }

      alert('🎉 Trip updates successfully synced! All new stops, dining spots, menus, removals, and family votes are live in your view.');
    };

    const dismissIncomingSync = () => {
      try {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      } catch (e) {}
      isIncomingSyncModalOpen.value = false;
      incomingSyncPayload.value = null;
    };

    const nudgeActivity = (item, dayNumber, minuteDelta) => {
      if (!item) return;
      if (item.anchor || item.mandatory || item.reserved) {
        showToast(`"${item.activity}" is a confirmed mandatory booking and cannot be shifted.`, '🔒');
        return;
      }
      const tag = (item.tag || '').toUpperCase();
      if (tag.includes('CONFIRMED') || tag.includes('FLIGHT') || tag.includes('CHECK-IN') || tag.includes('CHECK-OUT') || tag.includes('CAR RETURN') || tag.includes('HOUSING') || tag.includes('BASE MOVE')) {
        showToast(`"${item.activity}" is fixed logistics and cannot be shifted.`, '🔒');
        return;
      }

      const range = (typeof getItemTimeRange === 'function')
        ? getItemTimeRange(item)
        : { start: parseTimeToHour(item.time || item.startHour), end: 11.5, dur: 1.5 };
      
      const currentStart = range.start;
      const currentDur = range.dur;
      const deltaHours = minuteDelta / 60;
      const newStart = Math.min(23.75, Math.max(6.0, parseFloat((currentStart + deltaHours).toFixed(3))));
      const newEnd = Math.min(24.0, parseFloat((newStart + currentDur).toFixed(3)));

      const durStr = currentDur >= 1
        ? (currentDur % 1 === 0 ? `${currentDur}h` : `${currentDur.toFixed(1)} hrs`)
        : `${Math.round(currentDur * 60)}m`;
      const timeStr = `${formatHourToTime(newStart)} – ${formatHourToTime(newEnd)}`;

      const dayIdx = dayNumber ? dayNumber - 1 : (item.dayIndex !== undefined ? item.dayIndex : 0);

      const updatedItem = {
        ...item,
        id: item.id || getItemId(item, 'day' + (dayIdx + 1)),
        dayIndex: dayIdx,
        dayNumber: dayIdx + 1,
        startHour: newStart,
        endHour: newEnd,
        time: timeStr,
        dur: durStr,
        durHours: currentDur,
        isCustom: true
      };

      const existingIdx = customActivities.value.findIndex(a => a.id === updatedItem.id);
      if (existingIdx >= 0) {
        customActivities.value[existingIdx] = updatedItem;
      } else {
        customActivities.value.push(updatedItem);
      }
      saveCustomActivities();

      // Directly update in-memory item for instantaneous Vue reactivity
      item.startHour = newStart;
      item.endHour = newEnd;
      item.time = timeStr;
      item.dur = durStr;
      item.durHours = currentDur;
      item.isCustom = true;

      const direction = minuteDelta > 0 ? `+${minuteDelta}m (${formatHourToTime(newStart)})` : `${minuteDelta}m (${formatHourToTime(newStart)})`;
      showToast(`Shifted "${item.activity}" ${direction}`, '⏱️');
    };

    // Attach extended API to window.TravelApp for cross-component calls
    window.TravelApp = {
      nudgeActivity,
      triggerMap,
      triggerRoute,
      triggerCalendar,
      openProviderSettings,
      getUserProvider: () => userProvider.value,
      openCreator,
      openShareSync,
      voteItem,
      getItemVotes,
      setItemStatus,
      deleteCustomItem,
      hideItem,
      restoreItem,
      restoreAllHiddenItems,
      isItemHidden,
      getHiddenItemIds: () => hiddenItemIds.value,
      holdItem,
      unholdItem,
      isOnHold,
      getOnHoldItemIds: () => onHoldItemIds.value,
      saveRestaurantMenu: (id, menu) => {
        try {
          const existing = JSON.parse(localStorage.getItem('ireland_restaurant_menus') || '{}');
          existing[id] = menu;
          localStorage.setItem('ireland_restaurant_menus', JSON.stringify(existing));
        } catch (e) {}
      },
      deleteRestaurantMenu: (id) => {
        try {
          const existing = JSON.parse(localStorage.getItem('ireland_restaurant_menus') || '{}');
          delete existing[id];
          localStorage.setItem('ireland_restaurant_menus', JSON.stringify(existing));
        } catch (e) {}
      },
      notify: showToast,
      showToast,
      hideToast
    };

    const exportAllTripNotes = () => {
      const backupData = {
        exportDate: new Date().toISOString(),
        tripTitle: 'Ireland Vacation October 2026',
        senderName: userSenderName.value,
        scratchpad: localStorage.getItem('ireland_trip_scratchpad') || '',
        dailyNotes: JSON.parse(localStorage.getItem('ireland_daily_notes') || '{}'),
        reservationNotes: JSON.parse(localStorage.getItem('ireland_reservation_notes') || '{}'),
        restaurantUserData: JSON.parse(localStorage.getItem('ireland_restaurant_user_data') || '{}'),
        restaurantMenus: JSON.parse(localStorage.getItem('ireland_restaurant_menus') || '{}'),
        trailUserData: JSON.parse(localStorage.getItem('ireland_trail_user_data') || '{}'),
        customNotes: JSON.parse(localStorage.getItem('ireland_custom_notes') || '[]'),
        customActivities: customActivities.value,
        customRestaurants: customRestaurants.value,
        customTrails: customTrails.value,
        customReservations: customReservations.value,
        hiddenItemIds: hiddenItemIds.value,
        onHoldItemIds: onHoldItemIds.value,
        itemVotes: itemVotes.value,
        packingChecklist: JSON.parse(localStorage.getItem('ireland_packing_checklist_v2') || '[]'),
        theme: localStorage.getItem('ireland_theme') || 'dark',
        palette: localStorage.getItem('ireland_palette') || 'emerald',
        fontScale: localStorage.getItem('ireland_font_scale') || 'md'
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `ireland_trip_notes_backup_${new Date().toISOString().slice(0, 10)}.json`);
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
          if (data.restaurantMenus || data.menus) localStorage.setItem('ireland_restaurant_menus', JSON.stringify(data.restaurantMenus || data.menus));
          if (data.trailUserData) localStorage.setItem('ireland_trail_user_data', JSON.stringify(data.trailUserData));
          if (data.customNotes) localStorage.setItem('ireland_custom_notes', JSON.stringify(data.customNotes));
          if (data.hiddenItemIds) {
            hiddenItemIds.value = data.hiddenItemIds;
            saveHiddenItemIds();
          }
          if (data.onHoldItemIds) {
            onHoldItemIds.value = data.onHoldItemIds;
            saveOnHoldItemIds();
          }
          if (data.customActivities) {
            customActivities.value = data.customActivities;
            saveCustomActivities();
          }
          if (data.customRestaurants) {
            customRestaurants.value = data.customRestaurants;
            saveCustomRestaurants();
          }
          if (data.customTrails) {
            customTrails.value = data.customTrails;
            saveCustomTrails();
          }
          if (data.customReservations) {
            customReservations.value = data.customReservations;
            saveCustomReservations();
          }
          if (data.itemVotes) {
            itemVotes.value = data.itemVotes;
            saveItemVotes();
          }
          if (data.senderName) saveSenderName(data.senderName);
          if (data.packingChecklist) localStorage.setItem('ireland_packing_checklist_v2', JSON.stringify(data.packingChecklist));
          if (data.palette) setPalette(data.palette);
          if (data.fontScale) setFontScale(data.fontScale);

          alert('✅ Trip notes, stops, menus, and custom data successfully imported! Refreshing view...');
          window.location.reload();
        } catch (err) {
          alert('⚠️ Failed to import backup file: Invalid JSON format.');
        }
      };
      reader.readAsText(file);
    };

    const hiddenItemsDetails = computed(() => {
      if (!hiddenItemIds.value || hiddenItemIds.value.length === 0) return [];
      const list = [];
      const hiddenSet = new Set(hiddenItemIds.value);
      
      // Look in timeline base items
      if (typeof timeline !== 'undefined' && Array.isArray(timeline)) {
        timeline.forEach(day => {
          (day.items || []).forEach(item => {
            const id = item.id || getItemId(item, 'day' + day.dayNumber);
            if (hiddenSet.has(id)) {
              list.push({ id, label: `Day ${day.dayNumber}: ${item.activity}`, type: 'schedule' });
              hiddenSet.delete(id);
            }
          });
        });
      }
      // Look in custom activities
      customActivities.value.forEach(act => {
        if (hiddenSet.has(act.id)) {
          list.push({ id: act.id, label: `Custom Stop: ${act.activity}`, type: 'schedule' });
          hiddenSet.delete(act.id);
        }
      });
      // Look in restaurants
      if (typeof restaurants !== 'undefined' && Array.isArray(restaurants)) {
        restaurants.forEach(r => {
          const id = r.id || getItemId(r, 'rest');
          if (hiddenSet.has(id)) {
            list.push({ id, label: `Dining: ${r.name}`, type: 'dining' });
            hiddenSet.delete(id);
          }
        });
      }
      // Look in hiking trails
      if (typeof hikingTrails !== 'undefined' && Array.isArray(hikingTrails)) {
        hikingTrails.forEach(t => {
          const id = t.id || getItemId(t, 'trail');
          if (hiddenSet.has(id)) {
            list.push({ id, label: `Trail: ${t.name}`, type: 'trail' });
            hiddenSet.delete(id);
          }
        });
      }
      // Remaining unknown IDs
      hiddenSet.forEach(id => {
        list.push({ id, label: `Item (${id})`, type: 'item' });
      });
      return list;
    });

    // ── Multi-Currency Expense & Budget Tracker ───────────────
    const isExpenseModalOpen = ref(false);
    const familyCount = ref(4);
    const customExpenses = ref([]);

    const loadCustomExpenses = () => {
      try {
        customExpenses.value = JSON.parse(localStorage.getItem('ireland_custom_expenses') || '[]');
      } catch (e) {
        customExpenses.value = [];
      }
    };

    const saveCustomExpenses = () => {
      localStorage.setItem('ireland_custom_expenses', JSON.stringify(customExpenses.value));
    };

    const allExpenses = computed(() => {
      const base = (typeof tripExpenseData !== 'undefined' ? tripExpenseData : []);
      return [...base, ...customExpenses.value];
    });

    const expenseSummary = computed(() => {
      let totalEUR = 0;
      let totalGBP = 0;
      allExpenses.value.forEach(e => {
        const amt = parseFloat(e.amount) || 0;
        if (e.currency === 'GBP') totalGBP += amt;
        else totalEUR += amt;
      });
      const totalUSD = (totalEUR * 1.08) + (totalGBP * 1.30);
      const count = Math.max(1, familyCount.value);
      return {
        totalEUR: totalEUR.toFixed(0),
        totalGBP: totalGBP.toFixed(0),
        totalUSD: totalUSD.toFixed(0),
        perPersonEUR: (totalEUR / count).toFixed(0),
        perPersonGBP: (totalGBP / count).toFixed(0),
        perPersonUSD: (totalUSD / count).toFixed(0)
      };
    });

    const newExpenseForm = ref({
      category: 'Dining',
      title: '',
      currency: 'EUR',
      amount: '',
      payer: 'Split',
      notes: ''
    });

    const openExpenseModal = () => {
      activeTab.value = 'budget';
      isExpenseModalOpen.value = false;
    };

    const closeExpenseModal = () => {
      isExpenseModalOpen.value = false;
      document.body.style.overflow = '';
    };

    const addCustomExpense = () => {
      if (!newExpenseForm.value.title.trim() || !newExpenseForm.value.amount) return;
      const exp = {
        id: 'exp_custom_' + Date.now(),
        category: newExpenseForm.value.category,
        title: newExpenseForm.value.title.trim(),
        currency: newExpenseForm.value.currency,
        amount: parseFloat(newExpenseForm.value.amount) || 0,
        payer: newExpenseForm.value.payer || 'Split',
        notes: newExpenseForm.value.notes.trim(),
        isCustom: true
      };
      customExpenses.value = [exp, ...customExpenses.value];
      saveCustomExpenses();
      newExpenseForm.value = { category: 'Dining', title: '', currency: 'EUR', amount: '', payer: 'Split', notes: '' };
    };

    const deleteCustomExpense = (id) => {
      customExpenses.value = customExpenses.value.filter(e => e.id !== id);
      saveCustomExpenses();
    };

    // ── Emergency & Glovebox Sheet ────────────────────────────
    const isGloveboxModalOpen = ref(false);
    const gloveboxInfo = ref(typeof emergencyGloveboxData !== 'undefined' ? emergencyGloveboxData : {});

    const openGloveboxModal = () => {
      isGloveboxModalOpen.value = true;
      document.body.style.overflow = 'hidden';
    };

    const closeGloveboxModal = () => {
      isGloveboxModalOpen.value = false;
      document.body.style.overflow = '';
    };

    const printGloveboxSheet = () => {
      window.print();
    };

    // ── Standalone Trip File Export & Import (.ireland / JSON) ──
    const exportTripFile = () => {
      const exportData = {
        appName: 'IrelandVacation2026',
        version: '2.0',
        exportedAt: new Date().toISOString(),
        sender: userSenderName.value || 'Family Member',
        customActivities: customActivities.value,
        customRestaurants: customRestaurants.value,
        customTrails: customTrails.value,
        customReservations: customReservations.value,
        customNotes: customNotes.value,
        customExpenses: customExpenses.value,
        itemVotes: itemVotes.value,
        hiddenItemIds: hiddenItemIds.value,
        preferredProvider: userProvider.value,
        palette: selectedPalette.value,
        userRestaurantData: JSON.parse(localStorage.getItem('ireland_restaurant_user_data') || '{}'),
        userMenus: JSON.parse(localStorage.getItem('ireland_restaurant_menus') || '{}')
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ireland_trip_backup_${new Date().toISOString().slice(0, 10)}.ireland`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };

    const importTripFile = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const payload = JSON.parse(evt.target.result);
          if (!payload || typeof payload !== 'object') {
            alert('Invalid trip file format.');
            return;
          }
          const shouldMerge = confirm('Merge with current trip (OK) or completely Overwrite (Cancel)?');
          if (shouldMerge) {
            if (payload.customActivities) {
              const existingIds = new Set(customActivities.value.map(a => a.id));
              const newItems = payload.customActivities.filter(a => !existingIds.has(a.id));
              customActivities.value = [...customActivities.value, ...newItems];
              saveCustomActivities();
            }
            if (payload.customRestaurants) {
              const existingIds = new Set(customRestaurants.value.map(r => r.id));
              const newItems = payload.customRestaurants.filter(r => !existingIds.has(r.id));
              customRestaurants.value = [...customRestaurants.value, ...newItems];
              saveCustomRestaurants();
            }
            if (payload.customTrails) {
              const existingIds = new Set(customTrails.value.map(t => t.id));
              const newItems = payload.customTrails.filter(t => !existingIds.has(t.id));
              customTrails.value = [...customTrails.value, ...newItems];
              saveCustomTrails();
            }
            if (payload.customReservations) {
              const existingIds = new Set(customReservations.value.map(b => b.id));
              const newItems = payload.customReservations.filter(b => !existingIds.has(b.id));
              customReservations.value = [...customReservations.value, ...newItems];
              saveCustomReservations();
            }
            if (payload.customExpenses) {
              const existingIds = new Set(customExpenses.value.map(x => x.id));
              const newItems = payload.customExpenses.filter(x => !existingIds.has(x.id));
              customExpenses.value = [...customExpenses.value, ...newItems];
              saveCustomExpenses();
            }
            if (payload.itemVotes) {
              itemVotes.value = { ...itemVotes.value, ...payload.itemVotes };
              saveItemVotes();
            }
            if (payload.userMenus) {
              const currentMenus = JSON.parse(localStorage.getItem('ireland_restaurant_menus') || '{}');
              localStorage.setItem('ireland_restaurant_menus', JSON.stringify({ ...currentMenus, ...payload.userMenus }));
            }
            alert('✅ Trip file merged successfully! All activities, notes, and menus are active.');
          } else {
            customActivities.value = payload.customActivities || [];
            customRestaurants.value = payload.customRestaurants || [];
            customTrails.value = payload.customTrails || [];
            customReservations.value = payload.customReservations || [];
            customExpenses.value = payload.customExpenses || [];
            itemVotes.value = payload.itemVotes || {};
            hiddenItemIds.value = payload.hiddenItemIds || [];
            saveCustomActivities();
            saveCustomRestaurants();
            saveCustomTrails();
            saveCustomReservations();
            saveCustomExpenses();
            saveItemVotes();
            saveHiddenItemIds();
            if (payload.userMenus) {
              localStorage.setItem('ireland_restaurant_menus', JSON.stringify(payload.userMenus));
            }
            alert('✅ Trip file restored completely!');
          }
        } catch (err) {
          alert('Failed to parse trip backup: ' + err.message);
        }
      };
      reader.readAsText(file);
    };

    onMounted(() => {
      try {
        initTheme();
        loadCustomStorageData();
        loadAllNotesFromStorage();
        loadCustomExpenses();
        checkUrlSyncPayload();
      } catch (err) {
        console.warn('Non-blocking initialization warning:', err);
      } finally {
        // Dismiss initial loading screen smoothly once Vue is mounted and active
        if (typeof window !== 'undefined' && typeof window.__dismissAppLoader === 'function') {
          window.__dismissAppLoader();
        } else {
          const loader = document.getElementById('app-loading-screen');
          if (loader) {
            loader.classList.add('app-loaded');
            setTimeout(() => {
              if (loader.parentNode) loader.remove();
            }, 350);
          }
          const appEl = document.getElementById('app');
          if (appEl && appEl.hasAttribute('v-cloak')) {
            appEl.removeAttribute('v-cloak');
          }
        }
      }
    });

    return {
      trip,
      regionList,
      attractionMap,
      distanceList,
      shoppingVenues,
      sightsDrivesRef,
      openShoppingView,
      timelineList,
      restaurantList,
      reservationList,
      weatherInfo,
      outfitList,
      trailList,
      activeTab,
      tabs,
      mobileTabs,
      toast,
      showToast,
      hideToast,
      triggerToastAction,
      isDark,
      toggleDark,
      selectedDetailItem,
      selectedDetailDay,
      selectedTargetDayIndex,
      isDetailModalOpen,
      isEditingDetailActivity,
      detailEditForm,
      detailEditStartHour,
      detailEditEndHour,
      detailEditFormattedTime,
      detailScheduleConflicts,
      isDetailSunsetHazard,
      autoShiftFollowingStops,
      snapToNextFreeSlot,
      adjustDetailStartTime,
      adjustDetailDuration,
      nudgeActivity,
      saveDetailActivity,
      startEditingDetailActivity,
      cancelEditingDetailActivity,
      formatHourToTime,
      openDetailModal,
      closeDetailModal,
      isDetailItemOnHold,
      isDetailItemLocked,
      holdDetailItem,
      unholdDetailItem,
      deleteDetailItem,
      handleSwitchTab,
      targetSearchQuery,
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
      showHeaderHelp,
      // Provider Manager (Apple vs Google)
      userProvider,
      isProviderModalOpen,
      rememberChoice,
      pendingAction,
      triggerMap,
      triggerRoute,
      triggerCalendar,
      selectProvider,
      // Provider Settings
      openProviderSettings,
      // Top Dashboard Lens & Dynamic Stats
      topDashboardLens,
      setTopDashboardLens,
      dashboardLenses,
      isCommandCenterCollapsed,
      toggleCommandCenter,
      packingProgress,
      confirmedBookingsCount,
      strictDeadlinesCount,
      totalDriveHours,
      // Notes & Storage CRUD Manager
      isScratchpadOpen,
      openScratchpad,
      closeScratchpad,
      notesModalTab,
      notesSearchQuery,
      allNotesList,
      filteredNotesList,
      isAddingNewNote,
      newNoteForm,
      copiedNoteId,
      createNewNote,
      saveNoteEdit,
      deleteNote,
      copyNoteContent,
      jumpFromNoteToTarget,
      backupStats,
      exportAllTripNotes,
      importNotesFromFile,
      // Group Consensus & Voting Engine
      customActivities,
      customRestaurants,
      customTrails,
      customReservations,
      hiddenItemIds,
      onHoldItemIds,
      hideItem,
      restoreItem,
      restoreAllHiddenItems,
      isItemHidden,
      holdItem,
      unholdItem,
      isOnHold,
      hiddenItemsDetails,
      itemVotes,
      userSenderName,
      saveSenderName,
      getItemVotes,
      voteItem,
      setItemStatus,
      deleteCustomItem,
      // Universal Trip Creator & Importer
      isCreatorModalOpen,
      creatorTab,
      newScheduleForm,
      newDiningForm,
      handleCreatorMenuUpload,
      newTrailForm,
      newBookingForm,
      openCreator,
      closeCreator,
      saveScheduleStop,
      saveDiningSpot,
      saveHikingTrail,
      saveBookingPass,
      bulkImportText,
      bulkImportPreview,
      bulkImportStatus,
      parseBulkImport,
      applyBulkImport,
      clearBulkImport,
      // Zero-Cost Share Link & QR Code Live Sync
      isShareSyncModalOpen,
      shareSyncUrl,
      shareSyncQrUrl,
      shareCopied,
      openShareSync,
      closeShareSync,
      copyShareLink,
      shareToWhatsApp,
      shareToEmail,
      // Incoming URL Sync Detector & Non-Destructive Merge
      incomingSyncPayload,
      isIncomingSyncModalOpen,
      incomingSummary,
      checkUrlSyncPayload,
      applyIncomingSync,
      dismissIncomingSync,
      // Multi-Currency Expense & Budget Tracker
      isExpenseModalOpen,
      openExpenseModal,
      closeExpenseModal,
      familyCount,
      customExpenses,
      allExpenses,
      expenseSummary,
      newExpenseForm,
      addCustomExpense,
      deleteCustomExpense,
      // Emergency & Glovebox Sheet
      isGloveboxModalOpen,
      openGloveboxModal,
      closeGloveboxModal,
      gloveboxInfo,
      printGloveboxSheet,
      // Standalone Trip File Export & Import
      exportTripFile,
      importTripFile
    };
  }
});

try {
  app.mount('#app');
} catch (mountErr) {
  console.error('App mount error:', mountErr);
} finally {
  if (typeof window !== 'undefined' && typeof window.__dismissAppLoader === 'function') {
    setTimeout(window.__dismissAppLoader, 150);
  }
}
