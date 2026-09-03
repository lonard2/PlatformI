/**
 * PlatformI - Central Reactive Transit State Store (Zustand)
 * Manages cartography viewport, multimodal category & mode filters, entity selection,
 * simulation clock speed multiplier, basemap tile layers, dynamic UI drawers, and simulated fleet.
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero emojis, full functional implementation.
 */

import { create } from "zustand";
import {
  TransitMode,
  TransitCategory,
  Vehicle,
  Stop,
  Line,
} from "@/types/transit";
import {
  TRANSIT_MODE_CONFIG,
  TRANSIT_CATEGORY_CONFIG,
  JAKARTA_MAP_CENTER,
  JAKARTA_DEFAULT_ZOOM,
} from "@/lib/constants/modes";
import { TRANSIT_VEHICLES, TRANSIT_LINES, TRANSIT_STOPS } from "@/lib/data/jakarta-dataset";

export type TileLayerId = "dark" | "light" | "satellite" | "streets";
export type DrawerType = "vehicle" | "hub" | "tickets" | "crowdsource" | "alerts" | "ai" | "settings" | null;
export type DrawerSnapState = "collapsed" | "mid" | "expanded";
export type SimulationSpeed = 0 | 1 | 2 | 5;

export interface HoveredEntity {
  type: "vehicle" | "stop" | "line";
  id: string;
}

export interface TransitStoreState {
  // 1. Viewport State
  viewportCenter: [number, number];
  viewportZoom: number;
  setViewport: (center: [number, number], zoom: number) => void;
  resetViewport: () => void;

  // 2. Mode & Category Filters
  selectedModes: TransitMode[];
  selectedCategories: TransitCategory[];
  toggleMode: (mode: TransitMode) => void;
  setModes: (modes: TransitMode[]) => void;
  selectAllModes: () => void;
  clearAllModes: () => void;
  isModeActive: (mode: TransitMode) => boolean;
  toggleCategory: (category: TransitCategory) => void;
  isCategoryActive: (category: TransitCategory) => boolean;

  // 3. Entity Selection & Hovering
  selectedVehicleId: string | null;
  selectedStopId: string | null;
  selectedLineId: string | null;
  hoveredEntity: HoveredEntity | null;
  selectVehicle: (id: string | null) => void;
  selectStop: (id: string | null) => void;
  selectLine: (id: string | null) => void;
  setHoveredEntity: (entity: HoveredEntity | null) => void;
  clearSelection: () => void;

  // 4. Simulation Engine Clock
  simulationSpeed: SimulationSpeed;
  setSimulationSpeed: (speed: SimulationSpeed) => void;

  // 5. Basemap Tile Layer
  activeTileLayer: TileLayerId;
  setTileLayer: (layer: TileLayerId) => void;

  // 6. UI Drawers & Modals
  activeDrawer: DrawerType;
  drawerSnap: DrawerSnapState;
  setActiveDrawer: (drawer: DrawerType) => void;
  setDrawerSnap: (snap: DrawerSnapState) => void;

  // 7. Theme
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  toggleTheme: () => void;

  // 8. Simulated Fleet Telemetry
  simulatedVehicles: Vehicle[];
  updateSimulatedVehicles: (vehicles: Vehicle[]) => void;
  updateSingleVehicle: (vehicle: Vehicle) => void;

  // 9. Static Domain Data References
  allLines: Line[];
  allStops: Stop[];

  // 10. Search & Filter Query
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // 11. Alerts
  pinnedAlertId: string | null;
  setPinnedAlertId: (id: string | null) => void;

  // 12. Planned Journey Binding
  plannedJourney: PlannedJourney | null;
  setPlannedJourney: (journey: PlannedJourney | null) => void;
  clearPlannedJourney: () => void;
}

export interface PlannedJourney {
  originStop: Stop;
  destinationStop: Stop;
  directLines: Line[];
  transferOption?: {
    firstLine: Line;
    secondLine: Line;
    transferStop: Stop;
  };
  candidateLines: Line[];
  distanceKm: number;
  estimatedFareRp: number;
  estimatedDurationMinutes: number;
}

const ALL_MODES = Object.keys(TRANSIT_MODE_CONFIG) as TransitMode[];
const ALL_CATEGORIES: TransitCategory[] = ["RAIL", "BUS", "AVIATION", "MARITIME"];

export const useTransitStore = create<TransitStoreState>((set, get) => ({
  // 1. Viewport
  viewportCenter: JAKARTA_MAP_CENTER,
  viewportZoom: JAKARTA_DEFAULT_ZOOM,
  setViewport: (center, zoom) =>
    set({ viewportCenter: center, viewportZoom: zoom }),
  resetViewport: () =>
    set({
      viewportCenter: JAKARTA_MAP_CENTER,
      viewportZoom: JAKARTA_DEFAULT_ZOOM,
    }),

  // 2. Mode & Category Filters
  selectedModes: [...ALL_MODES],
  selectedCategories: [...ALL_CATEGORIES],
  toggleMode: (mode) => {
    const current = get().selectedModes;
    if (current.includes(mode)) {
      set({ selectedModes: current.filter((m) => m !== mode) });
    } else {
      set({ selectedModes: [...current, mode] });
    }
  },
  setModes: (modes) => set({ selectedModes: modes }),
  selectAllModes: () => set({ selectedModes: [...ALL_MODES] }),
  clearAllModes: () => set({ selectedModes: [] }),
  isModeActive: (mode) => get().selectedModes.includes(mode),
  toggleCategory: (category) => {
    const currentCategories = get().selectedCategories;
    const isCurrentlyActive = currentCategories.includes(category);
    const categoryModes = TRANSIT_CATEGORY_CONFIG[category].modes;

    if (isCurrentlyActive) {
      // Deactivate category and all its modes
      const newCategories = currentCategories.filter((c) => c !== category);
      const newModes = get().selectedModes.filter(
        (m) => !categoryModes.includes(m)
      );
      set({ selectedCategories: newCategories, selectedModes: newModes });
    } else {
      // Activate category and add all its modes
      const newCategories = [...currentCategories, category];
      const newModes = Array.from(
        new Set([...get().selectedModes, ...categoryModes])
      );
      set({ selectedCategories: newCategories, selectedModes: newModes });
    }
  },
  isCategoryActive: (category) => get().selectedCategories.includes(category),

  // 3. Selection & Hover
  selectedVehicleId: null,
  selectedStopId: null,
  selectedLineId: null,
  hoveredEntity: null,
  selectVehicle: (id) => {
    set({
      selectedVehicleId: id,
      selectedStopId: null,
      activeDrawer: id ? "vehicle" : get().activeDrawer === "vehicle" ? null : get().activeDrawer,
    });
  },
  selectStop: (id) => {
    set({
      selectedStopId: id,
      selectedVehicleId: null,
      activeDrawer: id ? "hub" : get().activeDrawer === "hub" ? null : get().activeDrawer,
    });
  },
  selectLine: (id) => set({ selectedLineId: id }),
  setHoveredEntity: (entity) => set({ hoveredEntity: entity }),
  clearSelection: () =>
    set({
      selectedVehicleId: null,
      selectedStopId: null,
      selectedLineId: null,
      activeDrawer: null,
    }),

  // 4. Simulation Speed
  simulationSpeed: 1,
  setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),

  // 5. Tile Layer
  activeTileLayer: "dark",
  setTileLayer: (layer) => set({ activeTileLayer: layer }),

  // 6. Drawers
  activeDrawer: null,
  drawerSnap: "mid",
  setActiveDrawer: (drawer) => set({ activeDrawer: drawer }),
  setDrawerSnap: (snap) => set({ drawerSnap: snap }),

  // 7. Theme
  theme: "dark",
  setTheme: (theme) => set({ theme }),
  toggleTheme: () =>
    set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),

  // 8. Simulated Fleet
  simulatedVehicles: TRANSIT_VEHICLES,
  updateSimulatedVehicles: (vehicles) => set({ simulatedVehicles: vehicles }),
  updateSingleVehicle: (vehicle) => {
    const list = get().simulatedVehicles;
    const index = list.findIndex((v) => v.id === vehicle.id);
    if (index >= 0) {
      const nextList = [...list];
      nextList[index] = vehicle;
      set({ simulatedVehicles: nextList });
    }
  },

  // 9. Static Domain Data
  allLines: TRANSIT_LINES,
  allStops: TRANSIT_STOPS,

  // 10. Search
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),

  // 11. Alerts
  pinnedAlertId: "alert-001",
  setPinnedAlertId: (id) => set({ pinnedAlertId: id }),

  // 12. Planned Journey
  plannedJourney: null,
  setPlannedJourney: (journey) => set({ plannedJourney: journey }),
  clearPlannedJourney: () => set({ plannedJourney: null }),
}));
