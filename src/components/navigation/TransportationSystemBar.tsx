/**
 * PlatformI - Transportation Systems & Consolidated Hubs Bar
 * Displays icons, symbols, and live status indicators of all transit systems
 * divided into groups and sub-groups, with high-volume networks consolidated into
 * physical buildings (Terminals, Airports, Ports).
 *
 * Rules: Zero raw emojis, strict Lucide SVG icons, strict TypeScript typing (no 'any').
 */

"use client";

import React from "react";
import {
  Train,
  TrainTrack,
  Zap,
  Bus,
  Car,
  Building2,
  CarTaxiFront,
  Plane,
  PlaneTakeoff,
  Ship,
  Anchor,
  Check,
  Compass,
  Layers,
  ChevronRight,
} from "lucide-react";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TransitMode, TransitCategory } from "@/types/transit";
import { TRANSIT_MODE_CONFIG, TRANSIT_CATEGORY_CONFIG } from "@/lib/constants/modes";

interface TransitSystemItem {
  id: string;
  name: string;
  shortCode: string;
  type: "mode" | "building_hub";
  mode?: TransitMode;
  targetStopId?: string;
  targetCoordinates?: [number, number];
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  brandColor: string;
  badgeLabel: string;
  description: string;
}

interface TransitSystemGroup {
  category: TransitCategory;
  title: string;
  shortTitle: string;
  groupIcon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accentColor: string;
  items: TransitSystemItem[];
}

const SYSTEM_GROUPS: TransitSystemGroup[] = [
  // 1. LAND - RAIL
  {
    category: "RAIL",
    title: "Land — Urban & Regional Rail",
    shortTitle: "Rail",
    groupIcon: Train,
    accentColor: "#3b82f6",
    items: [
      {
        id: "sys-mrt",
        name: "MRT Jakarta (Ratangga)",
        shortCode: "MRT",
        type: "mode",
        mode: "MRT_JAKARTA",
        icon: Train,
        brandColor: "#E11924",
        badgeLabel: "Metro",
        description: "Lebak Bulus — Bundaran HI",
      },
      {
        id: "sys-lrt-jb",
        name: "LRT Jabodebek",
        shortCode: "LRT JB",
        type: "mode",
        mode: "LRT_JABODEBEK_CIBUBUR",
        icon: TrainTrack,
        brandColor: "#0055A5",
        badgeLabel: "GoA3",
        description: "Dukuh Atas — Harjamukti / Jatimulya",
      },
      {
        id: "sys-lrt-jkt",
        name: "LRT Jakarta",
        shortCode: "LRT JKT",
        type: "mode",
        mode: "LRT_JAKARTA",
        icon: TrainTrack,
        brandColor: "#ED1B24",
        badgeLabel: "Light Rail",
        description: "Pegangsaan Dua — Velodrome",
      },
      {
        id: "sys-krl",
        name: "KRL Commuter Line",
        shortCode: "KRL",
        type: "mode",
        mode: "KRL_BOGOR",
        icon: Train,
        brandColor: "#ED1C24",
        badgeLabel: "Commuter",
        description: "Bogor, Cikarang, Rangkas, Tangerang",
      },
      {
        id: "sys-whoosh",
        name: "Whoosh High-Speed Rail",
        shortCode: "WHOOSH",
        type: "mode",
        mode: "WHOOSH_HSR",
        icon: Zap,
        brandColor: "#C41230",
        badgeLabel: "350 km/h",
        description: "Halim — Padalarang — Tegalluar",
      },
      {
        id: "sys-kai-bandara",
        name: "KAI Bandara SHIA",
        shortCode: "ARL",
        type: "mode",
        mode: "KAI_BANDARA",
        icon: Train,
        brandColor: "#008080",
        badgeLabel: "Airport Rail",
        description: "Manggarai — BNI City — SHIA",
      },
      {
        id: "sys-kai-jj",
        name: "KAI Antarkota",
        shortCode: "KAI JJ",
        type: "mode",
        mode: "KAI_INTERCITY",
        icon: Train,
        brandColor: "#F26522",
        badgeLabel: "Intercity",
        description: "Gambir & Pasar Senen Express",
      },
    ],
  },

  // 2. LAND - BUS & ROAD
  {
    category: "BUS",
    title: "Land — Bus & Roadway Transit",
    shortTitle: "Bus & Hubs",
    groupIcon: Bus,
    accentColor: "#f59e0b",
    items: [
      {
        id: "sys-tj-brt",
        name: "TransJakarta BRT",
        shortCode: "BRT 1-14",
        type: "mode",
        mode: "TRANSJAKARTA_BRT",
        icon: Bus,
        brandColor: "#D9252A",
        badgeLabel: "Dedicated",
        description: "Trunk Corridors 1–14 Dedicated Busways",
      },
      {
        id: "sys-tj-feeder",
        name: "TJ Non-BRT & RoyalTrans",
        shortCode: "FEEDER",
        type: "mode",
        mode: "TRANSJAKARTA_NON_BRT",
        icon: Bus,
        brandColor: "#F58220",
        badgeLabel: "Feeder",
        description: "Low-entry & Premium Suburban Coaches",
      },
      {
        id: "sys-mikrotrans",
        name: "MikroTrans (JakLingko)",
        shortCode: "MIKRO",
        type: "mode",
        mode: "MIKROTRANS",
        icon: Car,
        brandColor: "#00A39D",
        badgeLabel: "Rp 0 Tap",
        description: "JakLingko Subsidized Angkot Feeders",
      },
      // Consolidated High-Volume AKAP Building Hub
      {
        id: "sys-akap-terminals",
        name: "AKAP Bus Terminals",
        shortCode: "TERMINAL",
        type: "building_hub",
        mode: "AKAP_INTERCITY_BUS",
        targetStopId: "stop-akap-pgb",
        targetCoordinates: [-6.2128, 106.9525],
        icon: Building2,
        brandColor: "#6366F1",
        badgeLabel: "Consolidated Hub",
        description: "Pulo Gebang, Kp. Rambutan, Kalideres",
      },
      // Consolidated High-Volume Executive Shuttle Hub
      {
        id: "sys-shuttle-hubs",
        name: "Executive Shuttle Hubs",
        shortCode: "SHUTTLE HUB",
        type: "building_hub",
        mode: "EXECUTIVE_SHUTTLE",
        targetStopId: "stop-shuttle-fx",
        targetCoordinates: [-6.2251, 106.8038],
        icon: CarTaxiFront,
        brandColor: "#06B6D4",
        badgeLabel: "Pool-to-Pool",
        description: "DayTrans, Cititrans, Baraya (HiAce/Sprinter)",
      },
    ],
  },

  // 3. AVIATION
  {
    category: "AVIATION",
    title: "Aviation — International Airports",
    shortTitle: "Airports",
    groupIcon: Plane,
    accentColor: "#0ea5e9",
    items: [
      {
        id: "sys-airports",
        name: "Airport Terminals & Kalayang",
        shortCode: "AIRPORT",
        type: "building_hub",
        mode: "AIRPORT_COMMERCIAL",
        targetStopId: "stop-shia-t3",
        targetCoordinates: [-6.1256, 106.6558],
        icon: PlaneTakeoff,
        brandColor: "#0EA5E9",
        badgeLabel: "CGK & HLP",
        description: "Soekarno-Hatta T1/T2/T3 + Halim Megahub",
      },
    ],
  },

  // 4. MARITIME
  {
    category: "MARITIME",
    title: "Maritime — Sea Ports & Ferry Harbors",
    shortTitle: "Ports & Sea",
    groupIcon: Ship,
    accentColor: "#06b6d4",
    items: [
      {
        id: "sys-harbors",
        name: "Ferry Harbors & PELNI Ports",
        shortCode: "PORTS",
        type: "building_hub",
        mode: "MARITIME_SPEEDBOAT",
        targetStopId: "stop-maritime-angke",
        targetCoordinates: [-6.1086, 106.7725],
        icon: Anchor,
        brandColor: "#0284C7",
        badgeLabel: "Sea Port",
        description: "Muara Angke, Marina Ancol & Tanjung Priok",
      },
    ],
  },
];

export function TransportationSystemBar() {
  const selectedModes = useTransitStore((state) => state.selectedModes);
  const toggleMode = useTransitStore((state) => state.toggleMode);
  const toggleCategory = useTransitStore((state) => state.toggleCategory);
  const isCategoryActive = useTransitStore((state) => state.isCategoryActive);
  const simulatedVehicles = useTransitStore((state) => state.simulatedVehicles);
  const selectStop = useTransitStore((state) => state.selectStop);
  const setViewport = useTransitStore((state) => state.setViewport);

  const handleItemClick = (item: TransitSystemItem) => {
    if (item.type === "building_hub" && item.targetStopId) {
      // 1. Focus map viewport to building coordinates
      if (item.targetCoordinates) {
        setViewport(item.targetCoordinates, 14);
      }
      // 2. Open Hub Detail Inspector Sheet
      selectStop(item.targetStopId);
    } else if (item.mode) {
      // Toggle mode in cartography layer
      toggleMode(item.mode);
    }
  };

  return (
    <div className="w-full bg-[#080c14]/90 backdrop-blur-xl border-b border-white/10 z-20 shrink-0 overflow-hidden shadow-lg select-none">
      <div className="flex items-center gap-4 px-3 sm:px-6 py-2 overflow-x-auto no-scrollbar">
        {SYSTEM_GROUPS.map((group) => {
          const GroupIcon = group.groupIcon;
          const isCatActive = isCategoryActive(group.category);

          return (
            <div
              key={group.category}
              className="flex items-center gap-2 shrink-0 pr-3 border-r border-white/10 last:border-r-0"
            >
              {/* Group Category Header Badge */}
              <button
                onClick={() => toggleCategory(group.category)}
                title={`Toggle all ${group.title}`}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition ${
                  isCatActive
                    ? "bg-slate-900/90 text-white border-white/20 shadow-sm"
                    : "bg-slate-950/60 text-slate-400 border-white/5 hover:text-slate-200"
                }`}
                style={{
                  borderLeftColor: isCatActive ? group.accentColor : undefined,
                  borderLeftWidth: isCatActive ? "3px" : undefined,
                }}
              >
                <GroupIcon className="w-3.5 h-3.5" style={{ color: group.accentColor }} />
                <span className="text-[11px] uppercase tracking-wider">{group.shortTitle}</span>
              </button>

              {/* Sub-group System Items */}
              <div className="flex items-center gap-1.5">
                {group.items.map((item) => {
                  const ItemIcon = item.icon;
                  const isModeSelected = item.mode ? selectedModes.includes(item.mode) : true;
                  const activeFleetCount = item.mode
                    ? simulatedVehicles.filter((v) => v.mode === item.mode).length
                    : 0;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      title={`${item.name} — ${item.description}`}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs transition-all transform active:scale-95 ${
                        item.type === "building_hub"
                          ? "bg-slate-900/90 border-cyan-500/40 text-slate-100 hover:border-cyan-400 hover:bg-slate-850 shadow-md shadow-cyan-950/20"
                          : isModeSelected
                          ? "bg-slate-900/80 border-slate-700 text-white hover:border-slate-600 shadow-sm"
                          : "bg-slate-950/50 border-slate-800/60 text-slate-400 opacity-60 hover:opacity-100"
                      }`}
                    >
                      {/* Icon with Brand Glow */}
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `${item.brandColor}25`,
                          border: `1px solid ${item.brandColor}60`,
                        }}
                      >
                        <ItemIcon className="w-3 h-3" style={{ color: item.brandColor }} />
                      </div>

                      {/* Labels & Counts */}
                      <div className="flex items-center gap-1.5 text-left">
                        <span className="font-semibold text-[11px] whitespace-nowrap">
                          {item.shortCode}
                        </span>

                        {item.type === "building_hub" ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono font-bold">
                            HUB
                          </span>
                        ) : activeFleetCount > 0 ? (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                            {activeFleetCount}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
