/**
 * PlatformI - Floating Glass Cartography Controls HUD
 * Multimodal Category Toggles, Basemap Tile Switcher, Simulation Speed Multipliers (0x, 1x, 2x, 5x),
 * Zoom Controls & Recenter Button.
 *
 * Rules: Zero emojis, strict Lucide React SVG icons, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState } from "react";
import L from "leaflet";
import {
  Train,
  Bus,
  Plane,
  Ship,
  Layers,
  Pause,
  Play,
  FastForward,
  Zap,
  Plus,
  Minus,
  Navigation,
  Check,
  RotateCcw,
} from "lucide-react";
import { useTransitStore, TileLayerId, SimulationSpeed } from "@/lib/stores/useTransitStore";
import { TRANSIT_CATEGORY_CONFIG, TILE_LAYERS, JAKARTA_MAP_CENTER, JAKARTA_DEFAULT_ZOOM } from "@/lib/constants/modes";
import { TransitCategory } from "@/types/transit";

interface MapControlsProps {
  map: L.Map | null;
}

export function MapControls({ map }: MapControlsProps) {
  const selectedCategories = useTransitStore((state) => state.selectedCategories);
  const toggleCategory = useTransitStore((state) => state.toggleCategory);
  const selectAllModes = useTransitStore((state) => state.selectAllModes);
  const clearAllModes = useTransitStore((state) => state.clearAllModes);
  const selectedModes = useTransitStore((state) => state.selectedModes);
  const simulationSpeed = useTransitStore((state) => state.simulationSpeed);
  const setSimulationSpeed = useTransitStore((state) => state.setSimulationSpeed);
  const activeTileLayer = useTransitStore((state) => state.activeTileLayer);
  const setTileLayer = useTransitStore((state) => state.setTileLayer);
  const resetViewport = useTransitStore((state) => state.resetViewport);

  const [tileMenuOpen, setTileMenuOpen] = useState(false);

  const handleZoomIn = () => {
    if (map) map.zoomIn();
  };

  const handleZoomOut = () => {
    if (map) map.zoomOut();
  };

  const handleRecenter = () => {
    if (map) {
      map.setView(JAKARTA_MAP_CENTER, JAKARTA_DEFAULT_ZOOM, { animate: true });
    }
    resetViewport();
  };

  const categoryIcons: Record<TransitCategory, React.ReactNode> = {
    RAIL: <Train className="w-4 h-4" />,
    BUS: <Bus className="w-4 h-4" />,
    AVIATION: <Plane className="w-4 h-4" />,
    MARITIME: <Ship className="w-4 h-4" />,
  };

  return (
    <>
      {/* 1. TOP-LEFT: Multimodal Category Filter Bar */}
      <div className="absolute top-4 left-4 z-[400] flex flex-wrap items-center gap-2 max-w-[calc(100vw-32px)] sm:max-w-none">
        <div className="glass-panel rounded-xl p-1.5 flex items-center gap-1 shadow-xl shadow-black/40">
          {(["RAIL", "BUS", "AVIATION", "MARITIME"] as TransitCategory[]).map((cat) => {
            const isSelected = selectedCategories.includes(cat);
            const meta = TRANSIT_CATEGORY_CONFIG[cat];
            const activeCount = meta.modes.filter((m) => selectedModes.includes(m)).length;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? `${meta.bgClass} ${meta.borderClass} ${meta.textClass} border shadow-sm`
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
                title={`Toggle ${meta.name}`}
              >
                {categoryIcons[cat]}
                <span className="hidden sm:inline">{meta.shortName}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? "bg-white/10 text-white" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {activeCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Select / Clear Actions */}
        <div className="hidden md:flex items-center gap-1 glass-panel rounded-xl p-1.5 shadow-xl shadow-black/40">
          <button
            type="button"
            onClick={selectAllModes}
            className="px-2 py-1 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors font-medium"
          >
            All
          </button>
          <span className="text-slate-600 text-xs">&bull;</span>
          <button
            type="button"
            onClick={clearAllModes}
            className="px-2 py-1 rounded-lg text-[11px] text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition-colors font-medium"
          >
            Clear
          </button>
        </div>
      </div>

      {/* 2. TOP-RIGHT: Basemap Tile Switcher Dropdown */}
      <div className="absolute top-4 right-4 z-[400]">
        <div className="relative">
          <button
            type="button"
            onClick={() => setTileMenuOpen(!tileMenuOpen)}
            className="glass-panel rounded-xl p-2.5 flex items-center gap-2 text-xs font-medium text-slate-200 hover:text-white hover:border-cyan-500/40 transition-all shadow-xl shadow-black/40"
            title="Basemap Layers"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline font-mono capitalize">{activeTileLayer}</span>
          </button>

          {tileMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 glass-dropdown rounded-xl p-1.5 shadow-2xl border border-white/15 space-y-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-white/10">
                Cartography Basemap
              </div>
              {(Object.keys(TILE_LAYERS) as TileLayerId[]).map((tileId) => {
                const isCurrent = activeTileLayer === tileId;
                const tile = TILE_LAYERS[tileId];

                return (
                  <button
                    key={tileId}
                    type="button"
                    onClick={() => {
                      setTileLayer(tileId);
                      setTileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      isCurrent
                        ? "bg-cyan-950/70 text-cyan-300 font-semibold border border-cyan-500/30"
                        : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                    }`}
                  >
                    <span>{tile.name}</span>
                    {isCurrent && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. BOTTOM-RIGHT: Simulation Speed Controller & Viewport Navigation */}
      <div className="absolute bottom-6 right-4 z-[400] flex flex-col items-end gap-3">
        {/* Simulation Speed Multiplier Controls */}
        <div className="glass-panel rounded-xl p-1.5 flex items-center gap-1 shadow-2xl shadow-black/50 border border-white/15">
          <span className="hidden sm:inline-block px-2 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Sim Speed
          </span>

          {/* 0x Pause */}
          <button
            type="button"
            onClick={() => setSimulationSpeed(0)}
            className={`p-2 rounded-lg text-xs font-mono font-bold transition-all ${
              simulationSpeed === 0
                ? "bg-amber-950/80 text-amber-400 border border-amber-500/40 shadow-lg shadow-amber-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
            title="Pause Simulation (0x)"
          >
            <Pause className="w-3.5 h-3.5" />
          </button>

          {/* 1x Real-time */}
          <button
            type="button"
            onClick={() => setSimulationSpeed(1)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all ${
              simulationSpeed === 1
                ? "bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
            title="Real-Time Cruising Speed (1x)"
          >
            <Play className="w-3.5 h-3.5" />
            <span>1x</span>
          </button>

          {/* 2x Accelerated */}
          <button
            type="button"
            onClick={() => setSimulationSpeed(2)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all ${
              simulationSpeed === 2
                ? "bg-blue-950/80 text-blue-300 border border-blue-500/40 shadow-lg shadow-blue-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
            title="Accelerated Movement (2x)"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>2x</span>
          </button>

          {/* 5x Fast-Forward */}
          <button
            type="button"
            onClick={() => setSimulationSpeed(5)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all ${
              simulationSpeed === 5
                ? "bg-rose-950/80 text-rose-300 border border-rose-500/40 shadow-lg shadow-rose-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
            title="High-Speed Schedule Preview (5x)"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>5x</span>
          </button>
        </div>

        {/* Viewport Zoom & Recenter Navigation Buttons */}
        <div className="glass-panel rounded-xl p-1 flex flex-col items-center gap-1 shadow-2xl shadow-black/50 border border-white/15">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>

          <div className="w-full h-px bg-white/10" />

          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="w-full h-px bg-white/10" />

          <button
            type="button"
            onClick={handleRecenter}
            className="p-2 rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/60 transition-colors"
            title="Recenter Map to Jakarta Hub"
          >
            <Navigation className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
