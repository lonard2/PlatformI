/**
 * PlatformI - Graphical Train Stringline Diagram (Marey Chart / GAPEKA Zugdiagramm)
 *
 * Interactive time-distance coordinate graph plotting train trajectory lines across stations.
 * Allows dispatchers and network planners to visually audit headways, detect crossing meets (persilangan),
 * and spot overtakes (penyusulan) along any corridor.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  TrendingUp,
  Clock,
  MapPin,
  Building2,
  SlidersHorizontal,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Moon,
  GitBranch,
  Filter,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Info,
  Layers,
  Edit2,
  CheckCircle2,
} from "lucide-react";
import { Line, Stop, TimetableRun } from "@/types/transit";
import {
  computeStationDistances,
  computeRunStringlineTrajectory,
  detectTrajectoryIntersections,
  StationDistance,
  StringlineTrajectory,
  TrajectoryIntersection,
  minutesToTimeString,
  timeStringToMinutes,
} from "@/lib/simulation/timetableMatrix";

export interface TimetableStringlineChartProps {
  selectedLine: Line;
  lineStops: Stop[];
  runs: TimetableRun[];
  onSelectRun?: (run: TimetableRun) => void;
  onEditRun?: (run: TimetableRun) => void;
}

type TimeWindowFilter = "ALL" | "PEAK_AM" | "OFF_PEAK" | "PEAK_PM" | "NIGHT";
type DirectionFilter = "ALL" | "OUTBOUND" | "INBOUND";
type ZoomLevel = "COMPACT" | "NORMAL" | "DETAILED";

interface TimeWindowPreset {
  id: TimeWindowFilter;
  label: string;
  startMinutes: number;
  endMinutes: number;
}

const TIME_WINDOWS: TimeWindowPreset[] = [
  { id: "ALL", label: "24 Jam (05:00 - 24:00)", startMinutes: 5 * 60, endMinutes: 24 * 60 },
  { id: "PEAK_AM", label: "Peak Pagi (06:00 - 09:30)", startMinutes: 6 * 60, endMinutes: 9 * 60 + 30 },
  { id: "OFF_PEAK", label: "Off-Peak (09:30 - 16:00)", startMinutes: 9 * 60 + 30, endMinutes: 16 * 60 },
  { id: "PEAK_PM", label: "Peak Sore (16:00 - 20:00)", startMinutes: 16 * 60, endMinutes: 20 * 60 },
  { id: "NIGHT", label: "Malam (20:00 - 24:00)", startMinutes: 20 * 60, endMinutes: 24 * 60 },
];

const ZOOM_CONFIGS: Record<ZoomLevel, { label: string; pxPerHour: number; tickMinutes: number }> = {
  COMPACT: { label: "Kompak", pxPerHour: 70, tickMinutes: 60 },
  NORMAL: { label: "Normal", pxPerHour: 120, tickMinutes: 30 },
  DETAILED: { label: "Detail", pxPerHour: 200, tickMinutes: 15 },
};

interface TooltipState {
  x: number;
  y: number;
  trajectory?: StringlineTrajectory;
  intersection?: TrajectoryIntersection;
}

export function TimetableStringlineChart({
  selectedLine,
  lineStops,
  runs,
  onSelectRun,
  onEditRun,
}: TimetableStringlineChartProps) {
  // Chart Display Controls
  const [timeWindow, setTimeWindow] = useState<TimeWindowFilter>("ALL");
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("ALL");
  const [useRealDistance, setUseRealDistance] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("NORMAL");
  const [hoveredRunId, setHoveredRunId] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Time window bounds
  const currentWindow = useMemo(() => {
    return TIME_WINDOWS.find((w) => w.id === timeWindow) || TIME_WINDOWS[0];
  }, [timeWindow]);

  const windowStartMinutes = currentWindow.startMinutes;
  const windowEndMinutes = currentWindow.endMinutes;
  const totalWindowMinutes = windowEndMinutes - windowStartMinutes;

  const zoom = ZOOM_CONFIGS[zoomLevel];
  const pxPerHour = zoom.pxPerHour;
  const pxPerMinute = pxPerHour / 60;

  // Station Distances
  const distances: StationDistance[] = useMemo(() => {
    return computeStationDistances(lineStops, useRealDistance);
  }, [lineStops, useRealDistance]);

  // Filter runs for selected line
  const corridorRuns = useMemo(() => {
    return runs.filter((r) => r.lineId === selectedLine.id);
  }, [runs, selectedLine.id]);

  // Compute all trajectories
  const allTrajectories: StringlineTrajectory[] = useMemo(() => {
    const list: StringlineTrajectory[] = [];
    for (const run of corridorRuns) {
      const traj = computeRunStringlineTrajectory({
        run,
        stops: lineStops,
        distances,
        lineColor: selectedLine.colorHex,
      });
      if (traj) {
        list.push(traj);
      }
    }
    return list;
  }, [corridorRuns, lineStops, distances, selectedLine.colorHex]);

  // Filter trajectories by time window and direction
  const visibleTrajectories = useMemo(() => {
    return allTrajectories.filter((traj) => {
      if (directionFilter !== "ALL" && traj.direction !== directionFilter) {
        return false;
      }
      // Overlaps with time window
      return traj.endTimeMinutes >= windowStartMinutes && traj.startTimeMinutes <= windowEndMinutes;
    });
  }, [allTrajectories, directionFilter, windowStartMinutes, windowEndMinutes]);

  // Detect intersections
  const allIntersections = useMemo(() => {
    return detectTrajectoryIntersections(allTrajectories, distances);
  }, [allTrajectories, distances]);

  const visibleIntersections = useMemo(() => {
    return allIntersections.filter(
      (int) => int.timeMinutes >= windowStartMinutes && int.timeMinutes <= windowEndMinutes
    );
  }, [allIntersections, windowStartMinutes, windowEndMinutes]);

  const overtakesCount = useMemo(() => {
    return visibleIntersections.filter((i) => i.type === "OVERTAKE").length;
  }, [visibleIntersections]);

  const crossingsCount = useMemo(() => {
    return visibleIntersections.filter((i) => i.type === "CROSSING_MEET").length;
  }, [visibleIntersections]);

  // SVG Dimension Calculations
  const stationAxisWidth = 200; // Left column width for station names
  const paddingTop = 40;
  const paddingBottom = 40;
  const paddingRight = 40;

  const minGraphHeight = Math.max(480, lineStops.length * 42);
  const usableHeight = minGraphHeight - paddingTop - paddingBottom;
  const svgHeight = minGraphHeight;

  const graphTimeWidth = Math.max(700, (totalWindowMinutes / 60) * pxPerHour);
  const totalSvgWidth = graphTimeWidth + paddingRight;

  // Coordinate transforms
  const timeToX = (timeMinutes: number): number => {
    return ((timeMinutes - windowStartMinutes) / totalWindowMinutes) * graphTimeWidth;
  };

  const fractionToY = (fraction: number): number => {
    return paddingTop + fraction * usableHeight;
  };

  // Time grid ticks generator
  const timeTicks = useMemo(() => {
    const ticks: { minutes: number; label: string; isHour: boolean }[] = [];
    const step = zoom.tickMinutes;
    const firstTick = Math.ceil(windowStartMinutes / step) * step;

    for (let m = firstTick; m <= windowEndMinutes; m += step) {
      ticks.push({
        minutes: m,
        label: minutesToTimeString(m % 1440),
        isHour: m % 60 === 0,
      });
    }
    return ticks;
  }, [windowStartMinutes, windowEndMinutes, zoom.tickMinutes]);

  // Current real-world time indicator
  const [currentMinutes, setCurrentMinutes] = useState<number | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      setCurrentMinutes(mins);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Center scroll around current time or first visible run on initial mount
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    let targetMinutes = windowStartMinutes;
    if (currentMinutes !== null && currentMinutes >= windowStartMinutes && currentMinutes <= windowEndMinutes) {
      targetMinutes = currentMinutes;
    } else if (visibleTrajectories.length > 0) {
      targetMinutes = visibleTrajectories[0].startTimeMinutes;
    }

    const targetX = timeToX(targetMinutes);
    scrollContainerRef.current.scrollLeft = Math.max(0, targetX - 250);
  }, [timeWindow]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper to build SVG polyline points string
  const buildSvgPath = (traj: StringlineTrajectory): string => {
    return traj.vertices
      .map((v, idx) => {
        const x = timeToX(v.timeMinutes);
        const y = fractionToY(v.fraction);
        return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  };

  // Trajectory hover handler
  const handleTrajectoryMouseEnter = (
    traj: StringlineTrajectory,
    e: React.MouseEvent<SVGElement>
  ) => {
    setHoveredRunId(traj.runId);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        trajectory: traj,
      });
    }
  };

  const handleIntersectionMouseEnter = (
    int: TrajectoryIntersection,
    e: React.MouseEvent<SVGElement>
  ) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        intersection: int,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredRunId(null);
    setTooltip(null);
  };

  if (lineStops.length < 2) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900/60 border border-white/10 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">Stasiun Belum Cukup untuk Grafik Stringline</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Grafik Stringline (Marey Chart) memerlukan minimal 2 stasiun berurutan di koridor ini. Tambahkan stasiun melalui Network Studio terlebih dahulu.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex flex-col space-y-4">
      {/* 1. Control Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-xl">
        {/* Left: Time Window Presets & Direction Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-white/10">
            <span className="px-2 text-[10px] font-mono text-slate-400 font-bold uppercase flex items-center gap-1">
              <Clock className="w-3 h-3 text-teal-400" />
              Window:
            </span>
            {TIME_WINDOWS.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setTimeWindow(w.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition btn-tactile ${
                  timeWindow === w.id
                    ? "bg-teal-500 text-teal-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {w.id === "ALL" ? "24 Jam" : w.label.split(" ")[0]}
              </button>
            ))}
          </div>

          {/* Direction Filter */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-white/10">
            <span className="px-2 text-[10px] font-mono text-slate-400 font-bold uppercase">Arah:</span>
            <button
              type="button"
              onClick={() => setDirectionFilter("ALL")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition btn-tactile ${
                directionFilter === "ALL"
                  ? "bg-teal-500 text-teal-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Dua Arah
            </button>
            <button
              type="button"
              onClick={() => setDirectionFilter("OUTBOUND")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition btn-tactile ${
                directionFilter === "OUTBOUND"
                  ? "bg-teal-500 text-teal-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Arah Hilir
            </button>
            <button
              type="button"
              onClick={() => setDirectionFilter("INBOUND")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition btn-tactile ${
                directionFilter === "INBOUND"
                  ? "bg-teal-500 text-teal-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Arah Mudik
            </button>
          </div>
        </div>

        {/* Right: Distance Mode, Zoom, and Conflict Summary Badges */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Spacing Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-white/10">
            <button
              type="button"
              onClick={() => setUseRealDistance(true)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition btn-tactile ${
                useRealDistance
                  ? "bg-cyan-500 text-cyan-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Jarak sebanding dengan kilometer riil Haversine (kecepatan nyata)"
            >
              Jarak Nyata (KM)
            </button>
            <button
              type="button"
              onClick={() => setUseRealDistance(false)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition btn-tactile ${
                !useRealDistance
                  ? "bg-cyan-500 text-cyan-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Spasi stasiun seragam untuk stasiun kota yang berdekatan"
            >
              Spasi Rata
            </button>
          </div>

          {/* Zoom Level */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-white/10">
            {(["COMPACT", "NORMAL", "DETAILED"] as const).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZoomLevel(z)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition btn-tactile ${
                  zoomLevel === z
                    ? "bg-slate-700 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {ZOOM_CONFIGS[z].label}
              </button>
            ))}
          </div>

          {/* Interlocking Stats Badges */}
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border ${
                crossingsCount > 0
                  ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                  : "bg-slate-950 text-slate-500 border-white/5"
              }`}
              title="Pertemuan silang antara KA Arah Hilir dan Arah Mudik"
            >
              <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
              <span>{crossingsCount} Persilangan</span>
            </span>

            <span
              className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border ${
                overtakesCount > 0
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                  : "bg-slate-950 text-slate-500 border-white/5"
              }`}
              title="Penyusulan kereta api searah (Express menyalip Regular)"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>{overtakesCount} Penyusulan</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Graph Viewport */}
      <div className="relative rounded-2xl bg-[#090d16] border border-white/10 overflow-hidden shadow-2xl flex">
        {/* Fixed Left Station Y-Axis Column */}
        <div
          style={{ width: `${stationAxisWidth}px`, height: `${svgHeight}px` }}
          className="shrink-0 bg-slate-950/95 border-r border-white/10 z-20 flex flex-col relative select-none shadow-lg"
        >
          {/* Header Corner */}
          <div
            style={{ height: `${paddingTop}px` }}
            className="px-3 border-b border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider bg-slate-900/90"
          >
            <span>Stasiun Lintasan</span>
            <span>KM</span>
          </div>

          {/* Station Labels mapped exactly to Y-fractions */}
          <div className="relative flex-1">
            {distances.map((d) => {
              const yPos = fractionToY(d.fraction) - paddingTop;
              return (
                <div
                  key={d.stopId}
                  style={{ top: `${yPos}px` }}
                  className="absolute left-0 right-0 -translate-y-1/2 px-3 py-1 flex items-center justify-between text-xs transition hover:bg-white/5"
                  title={`${d.stopName} (${d.code}) - ${d.cumulativeKm} KM`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 pr-2">
                    <span className="w-5 h-4.5 rounded bg-slate-800 text-[10px] font-mono font-bold text-teal-400 flex items-center justify-center shrink-0 border border-white/5">
                      {d.sequence}
                    </span>
                    <span className="font-semibold text-slate-200 truncate text-[11px]">
                      {d.stopName}
                    </span>
                    {d.isInterchange && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" title="Interchange Hub" />
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 shrink-0">
                    {d.cumulativeKm.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer Axis Label */}
          <div
            style={{ height: `${paddingBottom}px` }}
            className="px-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-400 bg-slate-900/90"
          >
            <span>Total: {distances[distances.length - 1]?.cumulativeKm.toFixed(1)} KM</span>
            <span>{distances.length} Halte/Stn</span>
          </div>
        </div>

        {/* Scrollable Stringline Chart Coordinate Canvas */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden relative select-none"
        >
          <svg
            width={totalSvgWidth}
            height={svgHeight}
            className="block"
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              {/* Drop shadow filter for hovered trajectories */}
              <filter id="stringline-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* A. Background Station Horizontal Gridlines */}
            {distances.map((d) => {
              const y = fractionToY(d.fraction);
              return (
                <g key={`grid-h-${d.stopId}`}>
                  <line
                    x1={0}
                    y1={y}
                    x2={totalSvgWidth}
                    y2={y}
                    stroke={d.isInterchange ? "rgba(20, 184, 166, 0.25)" : "rgba(255, 255, 255, 0.07)"}
                    strokeWidth={d.isInterchange ? 1.5 : 1}
                    strokeDasharray={d.isInterchange ? undefined : "3 3"}
                  />
                </g>
              );
            })}

            {/* B. Time Vertical Gridlines & Top/Bottom Rulers */}
            {timeTicks.map((tick) => {
              const x = timeToX(tick.minutes);
              if (x < 0 || x > totalSvgWidth) return null;
              return (
                <g key={`grid-v-${tick.minutes}`}>
                  <line
                    x1={x}
                    y1={paddingTop - 10}
                    x2={x}
                    y2={svgHeight - paddingBottom + 10}
                    stroke={tick.isHour ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.05)"}
                    strokeWidth={tick.isHour ? 1.2 : 0.8}
                  />
                  {/* Top Time Tick Label */}
                  {tick.isHour && (
                    <text
                      x={x}
                      y={paddingTop - 14}
                      fill="#94a3b8"
                      fontSize="11"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {tick.label}
                    </text>
                  )}
                  {/* Bottom Time Tick Label */}
                  {tick.isHour && (
                    <text
                      x={x}
                      y={svgHeight - paddingBottom + 24}
                      fill="#94a3b8"
                      fontSize="11"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {tick.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* C. Current Real Time Vertical Indicator ("NOW") */}
            {currentMinutes !== null &&
              currentMinutes >= windowStartMinutes &&
              currentMinutes <= windowEndMinutes && (
                <g>
                  {(() => {
                    const nowX = timeToX(currentMinutes);
                    return (
                      <>
                        <line
                          x1={nowX}
                          y1={paddingTop - 18}
                          x2={nowX}
                          y2={svgHeight - paddingBottom + 18}
                          stroke="#ef4444"
                          strokeWidth="2"
                          strokeDasharray="4 2"
                        />
                        <rect
                          x={nowX - 22}
                          y={paddingTop - 28}
                          width="44"
                          height="16"
                          rx="4"
                          fill="#ef4444"
                        />
                        <text
                          x={nowX}
                          y={paddingTop - 16}
                          fill="#ffffff"
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          SEKARANG
                        </text>
                      </>
                    );
                  })()}
                </g>
              )}

            {/* D. Trajectory Polylines */}
            {visibleTrajectories.map((traj) => {
              const isHovered = hoveredRunId === traj.runId;
              const isSelected = selectedRunId === traj.runId;
              const hasFocus = isHovered || isSelected;
              const isDimmed = hoveredRunId !== null && !isHovered;

              const pathData = buildSvgPath(traj);

              let strokeDasharray: string | undefined = undefined;
              if (traj.lineStyle === "DASHED_INDIGO") {
                strokeDasharray = "6 3";
              } else if (traj.lineStyle === "DASHED_ROSE") {
                strokeDasharray = "4 2";
              }

              const strokeWidth = hasFocus ? 3.5 : 2;
              const opacity = isDimmed ? 0.2 : hasFocus ? 1.0 : 0.85;

              const firstPoint = traj.vertices[0];
              const lastPoint = traj.vertices[traj.vertices.length - 1];
              const startX = timeToX(firstPoint.timeMinutes);
              const startY = fractionToY(firstPoint.fraction);
              const endX = timeToX(lastPoint.timeMinutes);
              const endY = fractionToY(lastPoint.fraction);

              return (
                <g key={`traj-${traj.runId}`} className="transition-opacity duration-150">
                  {/* Invisible wide hit area for easy hover/click */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={16}
                    className="cursor-pointer"
                    onMouseEnter={(e) => handleTrajectoryMouseEnter(traj, e)}
                    onClick={() => {
                      setSelectedRunId(traj.runId);
                      onSelectRun?.(traj.run);
                    }}
                  />

                  {/* Visible Trajectory Polyline */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={traj.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={opacity}
                    filter={hasFocus ? "url(#stringline-glow)" : undefined}
                    className="pointer-events-none transition-all duration-150"
                  />

                  {/* Station Dwell Dots on Polyline */}
                  {traj.vertices.map((v, vIdx) => {
                    const vx = timeToX(v.timeMinutes);
                    const vy = fractionToY(v.fraction);
                    return (
                      <circle
                        key={`v-${traj.runId}-${vIdx}`}
                        cx={vx}
                        cy={vy}
                        r={hasFocus ? 3.5 : 2}
                        fill={traj.color}
                        opacity={opacity}
                        className="pointer-events-none"
                      />
                    );
                  })}

                  {/* Trip Code Text Badge at Origin */}
                  {startX >= 0 && startX <= totalSvgWidth && (
                    <text
                      x={startX}
                      y={traj.direction === "OUTBOUND" ? startY - 7 : startY + 14}
                      fill={hasFocus ? "#ffffff" : traj.color}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                      opacity={opacity}
                      className="pointer-events-none select-none"
                    >
                      {traj.tripCode}
                    </text>
                  )}

                  {/* Trip Code Text Badge at Terminus */}
                  {endX >= 0 && endX <= totalSvgWidth && (
                    <text
                      x={endX}
                      y={traj.direction === "OUTBOUND" ? endY + 14 : endY - 7}
                      fill={hasFocus ? "#ffffff" : traj.color}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                      opacity={opacity}
                      className="pointer-events-none select-none"
                    >
                      {traj.tripCode}
                    </text>
                  )}
                </g>
              );
            })}

            {/* E. Trajectory Intersection Diamonds (Crossing Meets & Overtakes) */}
            {visibleIntersections.map((int, idx) => {
              const x = timeToX(int.timeMinutes);
              const y = fractionToY(int.fraction);
              if (x < 0 || x > totalSvgWidth) return null;

              const isOvertake = int.type === "OVERTAKE";
              const markerColor = isOvertake ? "#fbbf24" : "#22d3ee";
              const size = 6;

              return (
                <g
                  key={`${int.id}-${idx}`}
                  className="cursor-pointer group"
                  onMouseEnter={(e) => handleIntersectionMouseEnter(int, e)}
                  onClick={() => {
                    setSelectedRunId(int.runA.id);
                    onSelectRun?.(int.runA);
                  }}
                >
                  {/* Outer pulse circle */}
                  <circle
                    cx={x}
                    cy={y}
                    r={size + 3}
                    fill={markerColor}
                    fillOpacity="0.2"
                    className="animate-pulse"
                  />
                  {/* Diamond polygon */}
                  <polygon
                    points={`${x},${y - size} ${x + size},${y} ${x},${y + size} ${x - size},${y}`}
                    fill={markerColor}
                    stroke="#020617"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* 3. Floating Interactive Tooltip */}
      {tooltip && (
        <div
          style={{
            left: `${Math.min(window.innerWidth - 320, tooltip.x + 16)}px`,
            top: `${tooltip.y + 16}px`,
          }}
          className="absolute z-30 w-72 p-3.5 rounded-2xl bg-slate-900/95 border border-teal-500/40 shadow-2xl shadow-black/80 backdrop-blur-md pointer-events-none text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-100"
        >
          {tooltip.trajectory && (
            <>
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: tooltip.trajectory.color }}
                  />
                  <span className="font-bold font-mono text-white text-sm">
                    {tooltip.trajectory.tripCode}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${
                    tooltip.trajectory.direction === "OUTBOUND"
                      ? "bg-teal-500/10 text-teal-300 border-teal-500/30"
                      : "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                  }`}
                >
                  {tooltip.trajectory.direction === "OUTBOUND" ? "Arah Hilir" : "Arah Mudik"}
                </span>
              </div>

              <div className="space-y-1.5 text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Operator:</span>
                  <span className="font-medium text-white truncate max-w-[160px]">
                    {tooltip.trajectory.run.operatorName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Relasi:</span>
                  <span className="font-medium text-white truncate max-w-[160px]">
                    {tooltip.trajectory.originName} &rarr; {tooltip.trajectory.destinationName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Waktu Tempuh:</span>
                  <span className="font-mono font-bold text-teal-300">
                    {tooltip.trajectory.run.departureTime} &rarr; {tooltip.trajectory.run.arrivalTime} (
                    {tooltip.trajectory.totalDurationMinutes} min)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Kecepatan Rerata:</span>
                  <span className="font-mono text-cyan-300">
                    {tooltip.trajectory.averageSpeedKmh} km/h
                  </span>
                </div>
                {tooltip.trajectory.run.tripType && tooltip.trajectory.run.tripType !== "REGULAR" && (
                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <span className="text-slate-400">Tipologi:</span>
                    <span className="font-mono text-[10px] text-amber-300 uppercase">
                      {tooltip.trajectory.run.tripType}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
                <span>Klik untuk inspeksi jadwal</span>
                <span className="text-teal-400 font-bold">Pola Operasi</span>
              </div>
            </>
          )}

          {tooltip.intersection && (
            <>
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  {tooltip.intersection.type === "OVERTAKE" ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <GitBranch className="w-4 h-4 text-cyan-400" />
                  )}
                  <span className="font-bold text-white">
                    {tooltip.intersection.type === "OVERTAKE" ? "Penyusulan (Overtake)" : "Persilangan (Meet)"}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-slate-200">
                  {tooltip.intersection.timeString}
                </span>
              </div>

              <div className="space-y-1.5 text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Lokasi:</span>
                  <span className="font-medium text-white truncate max-w-[160px]">
                    {tooltip.intersection.approxLocationDescription}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Titik KM:</span>
                  <span className="font-mono text-cyan-300">
                    {tooltip.intersection.approxKm} KM
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/80 border border-white/5 text-[11px] text-slate-300 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-teal-400">{tooltip.intersection.runA.tripCode}</span>
                    <span className="text-slate-400">{tooltip.intersection.runA.departureTime} - {tooltip.intersection.runA.arrivalTime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-cyan-400">{tooltip.intersection.runB.tripCode}</span>
                    <span className="text-slate-400">{tooltip.intersection.runB.departureTime} - {tooltip.intersection.runB.arrivalTime}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 4. Legend & Operations Typology Guide */}
      <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-teal-400 rounded-full" />
            <span className="text-slate-300 font-medium">Layanan Reguler</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-indigo-400" />
            <span className="text-slate-300 font-medium">Stabling Depo Malam</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-rose-400" />
            <span className="text-slate-300 font-medium">Deviasi / Detour Rute</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-amber-400 rounded-full" />
            <span className="text-slate-300 font-medium">Putar Balik Cepat (Short-Turn)</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3" viewBox="0 0 12 12">
              <polygon points="6,2 10,6 6,10 2,6" fill="#22d3ee" />
            </svg>
            <span className="text-slate-300">Persilangan (Meet)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3" viewBox="0 0 12 12">
              <polygon points="6,2 10,6 6,10 2,6" fill="#fbbf24" />
            </svg>
            <span className="text-slate-300">Penyusulan (Overtake)</span>
          </div>
          {onEditRun && selectedRunId && (
            <button
              type="button"
              onClick={() => {
                const r = corridorRuns.find((x) => x.id === selectedRunId);
                if (r) onEditRun(r);
              }}
              className="px-2.5 py-1 rounded-lg bg-teal-500 text-teal-950 font-bold flex items-center gap-1.5 hover:bg-teal-400 transition"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit Perjalanan Terpilih</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
