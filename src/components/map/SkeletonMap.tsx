/**
 * PlatformI - Skeleton Map Loading Placeholder
 * Glassmorphic loading screen shown while Leaflet client-only bundle is loaded.
 * Zero emojis, crisp Lucide SVG icons and Tailwind animations.
 */

"use client";

import React from "react";
import { Radar, Compass, Activity } from "lucide-react";

export function SkeletonMap() {
  return (
    <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center bg-[#090d16] relative overflow-hidden select-none">
      {/* Background Radar Grid Graphic */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.08)_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      {/* Rotating Radar Scanner Effect */}
      <div className="relative flex items-center justify-center">
        <div className="w-32 h-32 rounded-full border border-cyan-500/20 flex items-center justify-center relative">
          <div className="w-24 h-24 rounded-full border border-cyan-500/30 flex items-center justify-center relative">
            <div className="w-16 h-16 rounded-full bg-cyan-950/40 border border-cyan-400/40 flex items-center justify-center">
              <Radar className="w-8 h-8 text-cyan-400 animate-spin [animation-duration:4s]" />
            </div>
          </div>
          {/* Pulsing Outer Rings */}
          <div className="absolute inset-0 rounded-full border-2 border-cyan-400/20 animate-ping [animation-duration:3s]" />
        </div>
      </div>

      {/* Loading Status HUD */}
      <div className="mt-8 z-10 text-center space-y-2 max-w-sm px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Synchronizing Regional Cartography</span>
        </div>
        <h3 className="text-sm font-semibold text-slate-200 tracking-wide">
          Initializing Multimodal Cartography Engine
        </h3>
        <p className="text-xs text-slate-400">
          Loading Jabodetabek transit vector polylines, smart hub beacons, and real-time fleet telemetry...
        </p>
      </div>

      {/* Bottom Coordinates Indicator */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 text-[11px] font-mono text-slate-500">
        <Compass className="w-3.5 h-3.5 text-slate-500" />
        <span>DKI Jakarta &bull; Lat -6.2088 &bull; Lon 106.8456</span>
      </div>
    </div>
  );
}
