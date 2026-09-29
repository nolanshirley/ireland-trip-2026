// =============================================================
//  Component: Sights & Driving Matrix (Unified Logistics Hub)
// =============================================================

const SightsDrives = {
  name: 'SightsDrives',
  emits: ['switch-tab'],
  props: {
    regions: { type: Array, required: true },
    attractions: { type: Object, required: true },
    distances: { type: Array, required: true }
  },
  components: {
    'heat-map': HeatMap,
    'distances-view': Distances
  },
  data() {
    return {
      activeSubTab: 'heatmap' // 'heatmap' or 'distances'
    };
  },
  template: `
    <div class="space-y-6">
      <!-- Sub-view navigation buttons -->
      <div class="flex items-center gap-2 border-b border-[var(--border)] pb-2 overflow-x-auto">
        <button
          @click="activeSubTab = 'heatmap'"
          :class="[
            'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
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
            'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
            activeSubTab === 'distances'
              ? 'bg-[var(--accent)] text-white shadow-sm'
              : 'bg-[var(--card)] hover:bg-[var(--card-hover)] text-[var(--muted-foreground)]'
          ]"
        >
          <span>🚗</span>
          <span>Driving Distances & Turn-by-Turn Routes</span>
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
    </div>
  `
};
