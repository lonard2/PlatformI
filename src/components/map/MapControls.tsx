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
import { TILE_LAYERS, JAKARTA_MAP_CENTER, JAKARTA_DEFAULT_ZOOM } from "@/lib/constants/modes";
import { useTranslation } from "@/lib/i18n";

interface MapControlsProps {
  map: L.Map | null;
}

export function MapControls({ map }: MapControlsProps) {
  const { t } = useTranslation();
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

  return (
    <>
      {/* 1. TOP-RIGHT: Basemap Tile Switcher Dropdown */}
      <div className="absolute top-4 right-4 z-[400]">
        <div className="relative">
          <button
            type="button"
            onClick={() => setTileMenuOpen(!tileMenuOpen)}
            aria-label={t.settings.basemapStyle}
            className="glass-panel rounded-xl p-2.5 flex items-center gap-2 text-xs font-medium text-slate-200 hover:text-white hover:border-cyan-500/40 transition-all shadow-xl shadow-black/40"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline font-mono capitalize">{activeTileLayer}</span>
          </button>

          {tileMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 glass-dropdown rounded-xl p-1.5 shadow-2xl border border-white/15 space-y-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-white/10">
                {t.settings.mapTileLayer}
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
            {t.navigation.simulationSpeed}
          </span>

          {/* 0x Pause */}
          <button
            type="button"
            onClick={() => setSimulationSpeed(0)}
            aria-label={t.navigation.paused}
            className={`p-2 rounded-lg text-xs font-mono font-bold transition-all ${
              simulationSpeed === 0
                ? "bg-amber-950/80 text-amber-400 border border-amber-500/40 shadow-lg shadow-amber-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Pause className="w-3.5 h-3.5" />
          </button>

          {/* 1x Real-time */}
          <button
            type="button"
            onClick={() => setSimulationSpeed(1)}
            aria-label="Real-Time Cruising Speed (1x)"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all ${
              simulationSpeed === 1
                ? "bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>1x</span>
          </button>

          {/* 2x Accelerated */}
          <button
            type="button"
            onClick={() => setSimulationSpeed(2)}
            aria-label="Accelerated Movement (2x)"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all ${
              simulationSpeed === 2
                ? "bg-blue-950/80 text-blue-300 border border-blue-500/40 shadow-lg shadow-blue-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>2x</span>
          </button>

          {/* 5x Fast-Forward */}
          <button
            type="button"
            onClick={() => setSimulationSpeed(5)}
            aria-label="High-Speed Schedule Preview (5x)"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all ${
              simulationSpeed === 5
                ? "bg-rose-950/80 text-rose-300 border border-rose-500/40 shadow-lg shadow-rose-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
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
            aria-label="Zoom In"
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>

          <div className="w-full h-px bg-white/10" />

          <button
            type="button"
            onClick={handleZoomOut}
            aria-label="Zoom Out"
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="w-full h-px bg-white/10" />

          <button
            type="button"
            onClick={handleRecenter}
            aria-label="Recenter Map to Jakarta Hub"
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/60 transition-colors"
          >
            <Navigation className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
