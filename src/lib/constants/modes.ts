/**
 * PlatformI - Multimodal Transit Mode Constants & Cartography Configurations
 * Color Tokens, Speed Profiles, Lucide Icon Mappings, Basemap Tile Definitions
 * Strictly Zero Emojis, Zero Placeholder Stubs, Full TypeScript Typing
 */

import { TransitMode, TransitCategory } from "@/types/transit";

export interface TransitSpeedProfile {
  cruisingSpeedKmh: number;
  cruisingSpeedMps: number;
  maxSpeedKmh: number;
  standardDwellSeconds: number;
}

export interface ModeMetadata {
  mode: TransitMode;
  category: TransitCategory;
  name: string;
  shortName: string;
  operator: string;
  colorHex: string;
  textColorHex: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  badgeClass: string;
  iconName: string; // Lucide icon identifier
  speedProfile: TransitSpeedProfile;
  fareDescription: string;
  isJakLingkoIntegrated: boolean;
}

export interface ModeCategoryMeta {
  category: TransitCategory;
  name: string;
  shortName: string;
  iconName: string;
  colorHex: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  modes: TransitMode[];
}

export interface TileLayerDefinition {
  id: "dark" | "light" | "satellite" | "streets";
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains: string;
}

// ==========================================
// 1. TRANSIT MODE CONFIGURATIONS
// ==========================================

export const TRANSIT_MODE_CONFIG: Record<TransitMode, ModeMetadata> = {
  MRT_JAKARTA: {
    mode: "MRT_JAKARTA",
    category: "RAIL",
    name: "MRT Jakarta (Ratangga)",
    shortName: "MRT",
    operator: "PT MRT Jakarta (Perseroda)",
    colorHex: "#E11924",
    textColorHex: "#FFFFFF",
    bgClass: "bg-red-950/60",
    borderClass: "border-red-500/30",
    textClass: "text-red-400",
    badgeClass: "bg-red-950/60 border-red-500/30 text-red-300",
    iconName: "Train",
    speedProfile: {
      cruisingSpeedKmh: 60,
      cruisingSpeedMps: 16.67,
      maxSpeedKmh: 100,
      standardDwellSeconds: 30,
    },
    fareDescription: "Rp 3.000 + Rp 1.000/km (Maks Rp 14.000)",
    isJakLingkoIntegrated: true,
  },
  LRT_JABODEBEK_CIBUBUR: {
    mode: "LRT_JABODEBEK_CIBUBUR",
    category: "RAIL",
    name: "LRT Jabodebek (Cibubur Line)",
    shortName: "LRT CB",
    operator: "PT Kereta Api Indonesia (Persero) - Divisi LRT",
    colorHex: "#0055A5",
    textColorHex: "#FFFFFF",
    bgClass: "bg-blue-950/60",
    borderClass: "border-blue-500/30",
    textClass: "text-blue-400",
    badgeClass: "bg-blue-950/60 border-blue-500/30 text-blue-300",
    iconName: "TrainTrack",
    speedProfile: {
      cruisingSpeedKmh: 50,
      cruisingSpeedMps: 13.89,
      maxSpeedKmh: 80,
      standardDwellSeconds: 30,
    },
    fareDescription: "Rp 5.000 (km 1) + Rp 700/km (Maks Rp 20.000 Peak / Rp 10.000 Off-Peak)",
    isJakLingkoIntegrated: true,
  },
  LRT_JABODEBEK_BEKASI: {
    mode: "LRT_JABODEBEK_BEKASI",
    category: "RAIL",
    name: "LRT Jabodebek (Bekasi Line)",
    shortName: "LRT BK",
    operator: "PT Kereta Api Indonesia (Persero) - Divisi LRT",
    colorHex: "#009A44",
    textColorHex: "#FFFFFF",
    bgClass: "bg-emerald-950/60",
    borderClass: "border-emerald-500/30",
    textClass: "text-emerald-400",
    badgeClass: "bg-emerald-950/60 border-emerald-500/30 text-emerald-300",
    iconName: "TrainTrack",
    speedProfile: {
      cruisingSpeedKmh: 50,
      cruisingSpeedMps: 13.89,
      maxSpeedKmh: 80,
      standardDwellSeconds: 30,
    },
    fareDescription: "Rp 5.000 (km 1) + Rp 700/km (Maks Rp 20.000 Peak / Rp 10.000 Off-Peak)",
    isJakLingkoIntegrated: true,
  },
  LRT_JAKARTA: {
    mode: "LRT_JAKARTA",
    category: "RAIL",
    name: "LRT Jakarta (Velodrome - Pegangsaan Dua)",
    shortName: "LRT JKT",
    operator: "PT LRT Jakarta (Jakpro)",
    colorHex: "#ED1B24",
    textColorHex: "#FFFFFF",
    bgClass: "bg-rose-950/60",
    borderClass: "border-rose-500/30",
    textClass: "text-rose-400",
    badgeClass: "bg-rose-950/60 border-rose-500/30 text-rose-300",
    iconName: "TrainTrack",
    speedProfile: {
      cruisingSpeedKmh: 45,
      cruisingSpeedMps: 12.5,
      maxSpeedKmh: 70,
      standardDwellSeconds: 30,
    },
    fareDescription: "Flat Rp 5.000 (JakLingko Integrasi)",
    isJakLingkoIntegrated: true,
  },
  KRL_BOGOR: {
    mode: "KRL_BOGOR",
    category: "RAIL",
    name: "KRL Commuter Line (Bogor - Jakarta Kota)",
    shortName: "KRL BGR",
    operator: "PT Kereta Commuter Indonesia (KAI Commuter)",
    colorHex: "#ED1C24",
    textColorHex: "#FFFFFF",
    bgClass: "bg-red-950/60",
    borderClass: "border-red-500/30",
    textClass: "text-red-400",
    badgeClass: "bg-red-950/60 border-red-500/30 text-red-300",
    iconName: "Train",
    speedProfile: {
      cruisingSpeedKmh: 55,
      cruisingSpeedMps: 15.28,
      maxSpeedKmh: 90,
      standardDwellSeconds: 45,
    },
    fareDescription: "Rp 3.000 (25 km pertama) + Rp 1.000/10 km",
    isJakLingkoIntegrated: false,
  },
  KRL_CIKARANG: {
    mode: "KRL_CIKARANG",
    category: "RAIL",
    name: "KRL Commuter Line (Cikarang - Manggarai - Angke)",
    shortName: "KRL CKR",
    operator: "PT Kereta Commuter Indonesia (KAI Commuter)",
    colorHex: "#0072CE",
    textColorHex: "#FFFFFF",
    bgClass: "bg-blue-950/60",
    borderClass: "border-blue-500/30",
    textClass: "text-blue-400",
    badgeClass: "bg-blue-950/60 border-blue-500/30 text-blue-300",
    iconName: "Train",
    speedProfile: {
      cruisingSpeedKmh: 55,
      cruisingSpeedMps: 15.28,
      maxSpeedKmh: 90,
      standardDwellSeconds: 45,
    },
    fareDescription: "Rp 3.000 (25 km pertama) + Rp 1.000/10 km",
    isJakLingkoIntegrated: false,
  },
  KRL_RANGKASBITUNG: {
    mode: "KRL_RANGKASBITUNG",
    category: "RAIL",
    name: "KRL Commuter Line (Tanah Abang - Rangkasbitung)",
    shortName: "KRL RKB",
    operator: "PT Kereta Commuter Indonesia (KAI Commuter)",
    colorHex: "#00A651",
    textColorHex: "#FFFFFF",
    bgClass: "bg-emerald-950/60",
    borderClass: "border-emerald-500/30",
    textClass: "text-emerald-400",
    badgeClass: "bg-emerald-950/60 border-emerald-500/30 text-emerald-300",
    iconName: "Train",
    speedProfile: {
      cruisingSpeedKmh: 55,
      cruisingSpeedMps: 15.28,
      maxSpeedKmh: 90,
      standardDwellSeconds: 45,
    },
    fareDescription: "Rp 3.000 (25 km pertama) + Rp 1.000/10 km",
    isJakLingkoIntegrated: false,
  },
  KRL_TANGERANG: {
    mode: "KRL_TANGERANG",
    category: "RAIL",
    name: "KRL Commuter Line (Duri - Tangerang)",
    shortName: "KRL TNG",
    operator: "PT Kereta Commuter Indonesia (KAI Commuter)",
    colorHex: "#A05EB5",
    textColorHex: "#FFFFFF",
    bgClass: "bg-purple-950/60",
    borderClass: "border-purple-500/30",
    textClass: "text-purple-400",
    badgeClass: "bg-purple-950/60 border-purple-500/30 text-purple-300",
    iconName: "Train",
    speedProfile: {
      cruisingSpeedKmh: 50,
      cruisingSpeedMps: 13.89,
      maxSpeedKmh: 80,
      standardDwellSeconds: 40,
    },
    fareDescription: "Rp 3.000 (25 km pertama) + Rp 1.000/10 km",
    isJakLingkoIntegrated: false,
  },
  KRL_TANJUNG_PRIOK: {
    mode: "KRL_TANJUNG_PRIOK",
    category: "RAIL",
    name: "KRL Commuter Line (Jakarta Kota - Tanjung Priok)",
    shortName: "KRL TPK",
    operator: "PT Kereta Commuter Indonesia (KAI Commuter)",
    colorHex: "#EC008C",
    textColorHex: "#FFFFFF",
    bgClass: "bg-pink-950/60",
    borderClass: "border-pink-500/30",
    textClass: "text-pink-400",
    badgeClass: "bg-pink-950/60 border-pink-500/30 text-pink-300",
    iconName: "Train",
    speedProfile: {
      cruisingSpeedKmh: 45,
      cruisingSpeedMps: 12.5,
      maxSpeedKmh: 75,
      standardDwellSeconds: 35,
    },
    fareDescription: "Rp 3.000 flat",
    isJakLingkoIntegrated: false,
  },
  WHOOSH_HSR: {
    mode: "WHOOSH_HSR",
    category: "RAIL",
    name: "Whoosh High-Speed Rail (Halim - Tegalluar)",
    shortName: "WHOOSH",
    operator: "PT Kereta Cepat Indonesia China (KCIC)",
    colorHex: "#C41230",
    textColorHex: "#FFFFFF",
    bgClass: "bg-rose-950/60",
    borderClass: "border-rose-500/30",
    textClass: "text-rose-400",
    badgeClass: "bg-rose-950/60 border-rose-500/30 text-rose-300",
    iconName: "Zap",
    speedProfile: {
      cruisingSpeedKmh: 350,
      cruisingSpeedMps: 97.22,
      maxSpeedKmh: 385,
      standardDwellSeconds: 120,
    },
    fareDescription: "Dynamic Tiered (Rp 150.000 - Rp 600.000)",
    isJakLingkoIntegrated: false,
  },
  KAI_BANDARA: {
    mode: "KAI_BANDARA",
    category: "RAIL",
    name: "KAI Bandara Soekarno-Hatta Rail Link",
    shortName: "AIRPORT RAIL",
    operator: "PT Kereta Api Indonesia (Persero) - Railink",
    colorHex: "#008080",
    textColorHex: "#FFFFFF",
    bgClass: "bg-teal-950/60",
    borderClass: "border-teal-500/30",
    textClass: "text-teal-400",
    badgeClass: "bg-teal-950/60 border-teal-500/30 text-teal-300",
    iconName: "Train",
    speedProfile: {
      cruisingSpeedKmh: 60,
      cruisingSpeedMps: 16.67,
      maxSpeedKmh: 90,
      standardDwellSeconds: 60,
    },
    fareDescription: "Flat Rp 50.000 (Premium) / Rp 70.000 (Executive)",
    isJakLingkoIntegrated: false,
  },
  KAI_INTERCITY: {
    mode: "KAI_INTERCITY",
    category: "RAIL",
    name: "KAI Antarkota (Gambir / Pasar Senen Ekspres)",
    shortName: "KAI JJ",
    operator: "PT Kereta Api Indonesia (Persero)",
    colorHex: "#F26522",
    textColorHex: "#FFFFFF",
    bgClass: "bg-orange-950/60",
    borderClass: "border-orange-500/30",
    textClass: "text-orange-400",
    badgeClass: "bg-orange-950/60 border-orange-500/30 text-orange-300",
    iconName: "Train",
    speedProfile: {
      cruisingSpeedKmh: 90,
      cruisingSpeedMps: 25.0,
      maxSpeedKmh: 120,
      standardDwellSeconds: 180,
    },
    fareDescription: "Tiered by Class (Ekonomi, Eksekutif, Luxury, Compartment)",
    isJakLingkoIntegrated: false,
  },
  TRANSJAKARTA_BRT: {
    mode: "TRANSJAKARTA_BRT",
    category: "BUS",
    name: "TransJakarta BRT (Dedicated Busway)",
    shortName: "TJ BRT",
    operator: "PT Transportasi Jakarta (BUMD)",
    colorHex: "#D9252A",
    textColorHex: "#FFFFFF",
    bgClass: "bg-amber-950/60",
    borderClass: "border-amber-500/30",
    textClass: "text-amber-400",
    badgeClass: "bg-amber-950/60 border-amber-500/30 text-amber-300",
    iconName: "Bus",
    speedProfile: {
      cruisingSpeedKmh: 28,
      cruisingSpeedMps: 7.78,
      maxSpeedKmh: 50,
      standardDwellSeconds: 20,
    },
    fareDescription: "Flat Rp 3.500 (Rp 2.000 Pk. 05:00-07:00, JakLingko Integrasi)",
    isJakLingkoIntegrated: true,
  },
  TRANSJAKARTA_NON_BRT: {
    mode: "TRANSJAKARTA_NON_BRT",
    category: "BUS",
    name: "TransJakarta Non-BRT & RoyalTrans",
    shortName: "TJ FEEDER",
    operator: "PT Transportasi Jakarta (BUMD)",
    colorHex: "#F58220",
    textColorHex: "#FFFFFF",
    bgClass: "bg-orange-950/60",
    borderClass: "border-orange-500/30",
    textClass: "text-orange-400",
    badgeClass: "bg-orange-950/60 border-orange-500/30 text-orange-300",
    iconName: "Bus",
    speedProfile: {
      cruisingSpeedKmh: 22,
      cruisingSpeedMps: 6.11,
      maxSpeedKmh: 60,
      standardDwellSeconds: 15,
    },
    fareDescription: "Flat Rp 3.500 / RoyalTrans Rp 20.000",
    isJakLingkoIntegrated: true,
  },
  MIKROTRANS: {
    mode: "MIKROTRANS",
    category: "BUS",
    name: "MikroTrans (JakLingko Angkot Feeder)",
    shortName: "MIKROTRANS",
    operator: "PT Transportasi Jakarta & Koperasi Angkutan",
    colorHex: "#00A39D",
    textColorHex: "#FFFFFF",
    bgClass: "bg-teal-950/60",
    borderClass: "border-teal-500/30",
    textClass: "text-teal-400",
    badgeClass: "bg-teal-950/60 border-teal-500/30 text-teal-300",
    iconName: "Car",
    speedProfile: {
      cruisingSpeedKmh: 18,
      cruisingSpeedMps: 5.0,
      maxSpeedKmh: 45,
      standardDwellSeconds: 15,
    },
    fareDescription: "Gratis Rp 0 (Wajib Tap Kartu JakLingko)",
    isJakLingkoIntegrated: true,
  },
  AKAP_INTERCITY_BUS: {
    mode: "AKAP_INTERCITY_BUS",
    category: "BUS",
    name: "Bus Antarkota AKAP (Executive & Sleeper)",
    shortName: "AKAP",
    operator: "PO Rosalia Indah, PO Sinar Jaya, PO Juragan 99",
    colorHex: "#6366F1",
    textColorHex: "#FFFFFF",
    bgClass: "bg-indigo-950/60",
    borderClass: "border-indigo-500/30",
    textClass: "text-indigo-400",
    badgeClass: "bg-indigo-950/60 border-indigo-500/30 text-indigo-300",
    iconName: "BusFront",
    speedProfile: {
      cruisingSpeedKmh: 68,
      cruisingSpeedMps: 18.89,
      maxSpeedKmh: 100,
      standardDwellSeconds: 300,
    },
    fareDescription: "Dynamic Tiered (Rp 180.000 - Rp 500.000)",
    isJakLingkoIntegrated: false,
  },
  EXECUTIVE_SHUTTLE: {
    mode: "EXECUTIVE_SHUTTLE",
    category: "BUS",
    name: "Executive Shuttle Pool-to-Pool (HiAce / Sprinter)",
    shortName: "SHUTTLE",
    operator: "DayTrans, CitiTrans, Baraya Travel",
    colorHex: "#06B6D4",
    textColorHex: "#FFFFFF",
    bgClass: "bg-cyan-950/60",
    borderClass: "border-cyan-500/30",
    textClass: "text-cyan-400",
    badgeClass: "bg-cyan-950/60 border-cyan-500/30 text-cyan-300",
    iconName: "CarTaxiFront",
    speedProfile: {
      cruisingSpeedKmh: 72,
      cruisingSpeedMps: 20.0,
      maxSpeedKmh: 110,
      standardDwellSeconds: 180,
    },
    fareDescription: "Flat Rp 110.000 - Rp 140.000",
    isJakLingkoIntegrated: false,
  },
  AIRPORT_COMMERCIAL: {
    mode: "AIRPORT_COMMERCIAL",
    category: "AVIATION",
    name: "Aviation Hub (Soekarno-Hatta CGK & Halim HLP)",
    shortName: "AIRPORT",
    operator: "PT Angkasa Pura Indonesia (InJourney)",
    colorHex: "#0EA5E9",
    textColorHex: "#FFFFFF",
    bgClass: "bg-sky-950/60",
    borderClass: "border-sky-500/30",
    textClass: "text-sky-400",
    badgeClass: "bg-sky-950/60 border-sky-500/30 text-sky-300",
    iconName: "Plane",
    speedProfile: {
      cruisingSpeedKmh: 800,
      cruisingSpeedMps: 222.22,
      maxSpeedKmh: 900,
      standardDwellSeconds: 2400,
    },
    fareDescription: "Domestic & International Airline Tariffs",
    isJakLingkoIntegrated: false,
  },
  MARITIME_SPEEDBOAT: {
    mode: "MARITIME_SPEEDBOAT",
    category: "MARITIME",
    name: "Speedboat Kepulauan Seribu (Muara Angke / Marina)",
    shortName: "SPEEDBOAT",
    operator: "Dishub DKI Jakarta & Operator Swasta",
    colorHex: "#0284C7",
    textColorHex: "#FFFFFF",
    bgClass: "bg-cyan-950/60",
    borderClass: "border-cyan-500/30",
    textClass: "text-cyan-400",
    badgeClass: "bg-cyan-950/60 border-cyan-500/30 text-cyan-300",
    iconName: "Ship",
    speedProfile: {
      cruisingSpeedKmh: 42,
      cruisingSpeedMps: 11.67,
      maxSpeedKmh: 65,
      standardDwellSeconds: 300,
    },
    fareDescription: "Flat Rp 54.000 - Rp 74.000 (Dishub KM Trans)",
    isJakLingkoIntegrated: false,
  },
  MARITIME_PELNI: {
    mode: "MARITIME_PELNI",
    category: "MARITIME",
    name: "Kapal Laut Nusantara (Pelabuhan Tanjung Priok)",
    shortName: "PELNI",
    operator: "PT Pelayaran Nasional Indonesia (Persero)",
    colorHex: "#0369A1",
    textColorHex: "#FFFFFF",
    bgClass: "bg-sky-950/60",
    borderClass: "border-sky-500/30",
    textClass: "text-sky-400",
    badgeClass: "bg-sky-950/60 border-sky-500/30 text-sky-300",
    iconName: "Ship",
    speedProfile: {
      cruisingSpeedKmh: 28,
      cruisingSpeedMps: 7.78,
      maxSpeedKmh: 40,
      standardDwellSeconds: 1800,
    },
    fareDescription: "Tiered by Destination Port & Class",
    isJakLingkoIntegrated: false,
  },
};

// ==========================================
// 2. TRANSIT CATEGORY CONFIGURATIONS
// ==========================================

export const TRANSIT_CATEGORY_CONFIG: Record<TransitCategory, ModeCategoryMeta> = {
  RAIL: {
    category: "RAIL",
    name: "Urban & Regional Rail",
    shortName: "Rail",
    iconName: "Train",
    colorHex: "#3B82F6",
    bgClass: "bg-blue-950/60",
    borderClass: "border-blue-500/30",
    textClass: "text-blue-300",
    modes: [
      "MRT_JAKARTA",
      "LRT_JABODEBEK_CIBUBUR",
      "LRT_JABODEBEK_BEKASI",
      "LRT_JAKARTA",
      "KRL_BOGOR",
      "KRL_CIKARANG",
      "KRL_RANGKASBITUNG",
      "KRL_TANGERANG",
      "KRL_TANJUNG_PRIOK",
      "WHOOSH_HSR",
      "KAI_BANDARA",
      "KAI_INTERCITY",
    ],
  },
  BUS: {
    category: "BUS",
    name: "Bus & Roadway Transit",
    shortName: "Bus",
    iconName: "Bus",
    colorHex: "#F59E0B",
    bgClass: "bg-amber-950/60",
    borderClass: "border-amber-500/30",
    textClass: "text-amber-300",
    modes: [
      "TRANSJAKARTA_BRT",
      "TRANSJAKARTA_NON_BRT",
      "MIKROTRANS",
      "AKAP_INTERCITY_BUS",
      "EXECUTIVE_SHUTTLE",
    ],
  },
  AVIATION: {
    category: "AVIATION",
    name: "Commercial Aviation",
    shortName: "Air",
    iconName: "Plane",
    colorHex: "#0EA5E9",
    bgClass: "bg-sky-950/60",
    borderClass: "border-sky-500/30",
    textClass: "text-sky-300",
    modes: ["AIRPORT_COMMERCIAL"],
  },
  MARITIME: {
    category: "MARITIME",
    name: "Maritime & Archipelago",
    shortName: "Sea",
    iconName: "Ship",
    colorHex: "#06B6D4",
    bgClass: "bg-cyan-950/60",
    borderClass: "border-cyan-500/30",
    textClass: "text-cyan-300",
    modes: ["MARITIME_SPEEDBOAT", "MARITIME_PELNI"],
  },
};

// ==========================================
// 3. BASEMAP TILE LAYER DEFINITIONS
// ==========================================

export const TILE_LAYERS: Record<"dark" | "light" | "satellite" | "streets", TileLayerDefinition> = {
  dark: {
    id: "dark",
    name: "CartoDB Dark Matter",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
    subdomains: "abcd",
  },
  light: {
    id: "light",
    name: "CartoDB Positron",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
    subdomains: "abcd",
  },
  satellite: {
    id: "satellite",
    name: "Esri World Imagery",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, DigitalGlobe, GeoEye, Earthstar Geographics',
    maxZoom: 18,
    subdomains: "a",
  },
  streets: {
    id: "streets",
    name: "OpenStreetMap Standard",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    subdomains: "abc",
  },
};

// ==========================================
// 4. SIMULATION SPEED OPTIONS
// ==========================================

export interface SimulationSpeedOption {
  value: 0 | 1 | 2 | 5;
  label: string;
  shortLabel: string;
  description: string;
}

export const SIMULATION_SPEED_OPTIONS: SimulationSpeedOption[] = [
  { value: 0, label: "Pause (0x)", shortLabel: "0x", description: "Freeze vector movement telemetry" },
  { value: 1, label: "Real-Time (1x)", shortLabel: "1x", description: "Standard real-world cruising speed" },
  { value: 2, label: "Accelerated (2x)", shortLabel: "2x", description: "Double-speed transit simulation" },
  { value: 5, label: "Fast-Forward (5x)", shortLabel: "5x", description: "High-speed schedule preview" },
];

// ==========================================
// 5. REGIONAL BOUNDS & GEOGRAPHIC CENTERS
// ==========================================

export const JAKARTA_MAP_CENTER: [number, number] = [-6.2088, 106.8456];
export const JAKARTA_DEFAULT_ZOOM = 12;

export const JABODETABEK_EXTENDED_BOUNDS = {
  north: -5.7,
  south: -6.9,
  west: 106.3,
  east: 107.8,
};
