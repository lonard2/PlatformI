/**
 * PlatformI - Vehicle Detail Sheet (Armada & Telemetri Transportasi)
 * Responsive slide-up bottom sheet on mobile (< 640px) with Framer Motion drag gestures,
 * and docked glass telemetry side panel on desktop (> 1024px) and tablet.
 * Integrated photo gallery, technical dimension blueprints, and mode-specific cabin layouts.
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero raw emojis, Lucide SVG icons.
 */

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Gauge,
  Compass,
  Users,
  Wind,
  Clock,
  Radio,
  Layers,
  Wrench,
  Armchair,
  Camera,
  Activity,
  MapPin,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { Vehicle, TransitMode, CrowdDensityLevel, ACComfortRating } from "@/types/transit";
import { TRANSIT_MODE_CONFIG } from "@/lib/constants/modes";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useTranslation } from "@/lib/i18n";
import { VehicleTechnicalSpecs } from "./VehicleTechnicalSpecs";
import { VehicleSeatingDiagram } from "./VehicleSeatingDiagram";
import { VehiclePhotoGallery } from "./VehiclePhotoGallery";
import { VehicleCarriageSelector } from "./VehicleCarriageSelector";

interface VehicleDetailSheetProps {
  vehicleId: string | null;
  onClose?: () => void;
}

type TabType = "overview" | "specs" | "seating";

function getHeadingDirection(degrees: number, t: any): string {
  const normalized = (degrees % 360 + 360) % 360;
  const directions = [
    t.common.cardinalNorth,
    t.common.cardinalNorthEast,
    t.common.cardinalEast,
    t.common.cardinalSouthEast,
    t.common.cardinalSouth,
    t.common.cardinalSouthWest,
    t.common.cardinalWest,
    t.common.cardinalNorthWest,
  ];
  const index = Math.round(normalized / 45) % 8;
  return directions[index];
}

function getCrowdBadge(level: CrowdDensityLevel, t: any) {
  switch (level) {
    case "LEVEL_1_MANY_SEATS":
      return {
        label: t.crowdsource.densitySeatsAvailable,
        color: "text-emerald-400 bg-emerald-950/60 border-emerald-500/30",
      };
    case "LEVEL_2_FEW_SEATS":
      return {
        label: t.crowdsource.densityFewSeats,
        color: "text-amber-400 bg-amber-950/60 border-amber-500/30",
      };
    case "LEVEL_3_STANDING_ONLY":
      return {
        label: t.crowdsource.densityStandingOnly,
        color: "text-orange-400 bg-orange-950/60 border-orange-500/30",
      };
    case "LEVEL_4_FULL_CRUSH":
      return {
        label: t.crowdsource.densityFullCrowded,
        color: "text-rose-400 bg-rose-950/60 border-rose-500/30",
      };
    default:
      return {
        label: t.common.normal,
        color: "text-slate-300 bg-slate-900 border-slate-700",
      };
  }
}

function getACComfortBadge(ac: ACComfortRating, t: any) {
  switch (ac) {
    case "COLD":
      return { label: t.crowdsource.acCold, color: "text-cyan-300" };
    case "OPTIMAL":
      return { label: t.crowdsource.acComfortable, color: "text-emerald-300" };
    case "WARM":
      return { label: t.crowdsource.acWarm, color: "text-amber-300" };
    case "HOT":
      return { label: t.crowdsource.acHot, color: "text-rose-300" };
    default:
      return { label: t.common.normal, color: "text-slate-300" };
  }
}

export function VehicleDetailSheet({
  vehicleId,
  onClose,
}: VehicleDetailSheetProps) {
  const simulatedVehicles = useTransitStore((state) => state.simulatedVehicles);
  const allLines = useTransitStore((state) => state.allLines);
  const allStops = useTransitStore((state) => state.allStops);
  const clearSelection = useTransitStore((state) => state.clearSelection);
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<TabType>("overview");

  const vehicle = simulatedVehicles.find((v) => v.id === vehicleId);

  if (!vehicle) return null;

  const modeConfig = TRANSIT_MODE_CONFIG[vehicle.mode] || {
    name: vehicle.mode,
    colorHex: "#38bdf8",
    textColorHex: "#ffffff",
  };

  const line = allLines.find((l) => l.id === vehicle.lineId);
  const nextStop = allStops.find((s) => s.id === vehicle.nextStopId);
  const crowdBadge = getCrowdBadge(vehicle.crowdLevel, t);
  const acBadge = getACComfortBadge(vehicle.acComfort, t);
  const headingCompass = getHeadingDirection(vehicle.headingDegrees, t);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      clearSelection();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-end lg:justify-start lg:items-end p-0 lg:p-4">
        {/* Mobile Backdrop Tap Area */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto lg:hidden"
        />

        {/* The Detail Sheet Container */}
        <motion.aside
          initial={{ y: "100%", opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.5 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 140 || info.velocity.y > 400) {
              handleClose();
            }
          }}
          className="pointer-events-auto w-full lg:w-[480px] max-h-[85vh] lg:max-h-[calc(100vh-5rem)] flex flex-col bg-[#090d16]/95 backdrop-blur-2xl border border-white/15 rounded-t-3xl lg:rounded-2xl shadow-2xl shadow-black/80 overflow-hidden text-slate-100"
        >
          {/* Mobile Drag Handle */}
          <div className="w-full flex items-center justify-center pt-2.5 pb-1 lg:hidden">
            <div className="w-12 h-1.5 rounded-full bg-slate-700/80 cursor-grab" />
          </div>

          {/* 1. HEADER SECTION */}
          <div className="p-4 border-b border-slate-800/80 flex items-start justify-between gap-3 shrink-0">
            <div className="space-y-1">
              {/* Line & Mode Badges */}
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold tracking-tight shadow-sm"
                  style={{
                    backgroundColor: modeConfig.colorHex,
                    color: modeConfig.textColorHex,
                  }}
                >
                  {vehicle.vehicleCode}
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  {modeConfig.name}
                </span>
              </div>

              {/* Vehicle Title */}
              <h2 className="text-base font-bold text-white tracking-tight leading-tight">
                {vehicle.name}
              </h2>

              {/* Next Stop & Line Info */}
              {nextStop && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{t.vehicleInspector.nextStop}: <strong className="text-slate-200">{nextStop.name}</strong></span>
                  <span className="text-cyan-400 font-bold shrink-0">
                    ({vehicle.nextStopEtaSeconds} {t.common.seconds})
                  </span>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={handleClose}
              aria-label="Tutup detail kendaraan"
              className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 2. TAB NAVIGATION BAR */}
          <div className="px-4 pt-2 border-b border-slate-800/80 flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                activeTab === "overview"
                  ? "border-cyan-400 text-cyan-300 bg-cyan-950/30"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{t.common.details} & {t.vehicleInspector.tabPhotos}</span>
            </button>

            <button
              onClick={() => setActiveTab("specs")}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                activeTab === "specs"
                  ? "border-cyan-400 text-cyan-300 bg-cyan-950/30"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>{t.vehicleInspector.tabSpecs}</span>
            </button>

            <button
              onClick={() => setActiveTab("seating")}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                activeTab === "seating"
                  ? "border-cyan-400 text-cyan-300 bg-cyan-950/30"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Armchair className="w-3.5 h-3.5" />
              <span>{t.vehicleInspector.tabCarriages}</span>
            </button>
          </div>

          {/* 3. SCROLLABLE TAB CONTENT BODY */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {activeTab === "overview" && (
              <div className="space-y-4">
                {/* Live Speed & Heading Gauges */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Speedometer Card */}
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                      <span className="flex items-center gap-1">
                        <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                        {t.vehicleInspector.speed}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold uppercase">
                        {vehicle.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="pt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-black font-mono text-white">
                        {vehicle.speedKmh.toFixed(1)}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{t.common.speedUnit}</span>
                    </div>
                  </div>

                  {/* Heading Azimuth Card */}
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                      <span className="flex items-center gap-1">
                        <Compass className="w-3.5 h-3.5 text-cyan-400" />
                        {t.vehicleInspector.bearing}
                      </span>
                      <span className="text-[10px] text-cyan-400 font-bold font-mono">
                        {vehicle.headingDegrees.toFixed(0)}°
                      </span>
                    </div>
                    <div className="pt-2 flex items-baseline gap-1">
                      <span className="text-sm font-bold font-mono text-white">
                        {headingCompass}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live Crowdsource & Comfort Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Crowd Density Badge */}
                  <div className={`p-3 rounded-xl border flex items-center gap-3 ${crowdBadge.color}`}>
                    <Users className="w-5 h-5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider block opacity-70">
                        {t.vehicleInspector.passengerDensity}
                      </span>
                      <strong className="text-xs font-bold leading-tight">
                        {crowdBadge.label}
                      </strong>
                    </div>
                  </div>

                  {/* AC Comfort Rating */}
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                    <Wind className="w-5 h-5 text-cyan-400 shrink-0" />
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                        Suhu & Pendingin AC
                      </span>
                      <strong className={`text-xs font-bold ${acBadge.color}`}>
                        {acBadge.label}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Route Line Summary */}
                {line && (
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: line.colorHex }}
                        />
                        <span className="text-xs font-bold text-white tracking-tight">
                          {line.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {line.code}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300 font-mono flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <span>Tarif: {line.fareType.replace(/_/g, " ")}</span>
                      <span>Antara Kedatangan: ~{line.headwayMinutes} mnt</span>
                    </div>
                  </div>
                )}

                {/* Dedicated Run Details & Trainset Fleet Telemetry Card */}
                <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5 text-xs font-mono">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-cyan-400" />
                      {vehicle.category === "RAIL"
                        ? "Informasi Dinas & Rangkaian KA"
                        : "Informasi Dinas & Armada Operasional"}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                      {vehicle.operatorName || modeConfig.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {/* Run Number / Nomor Dinas */}
                    {vehicle.runNumber && (
                      <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">
                          {vehicle.category === "RAIL" ? "{t.common.runNumber}:" : "{t.common.runNumber}:"}
                        </span>
                        <strong className="text-cyan-300 text-xs font-bold">
                          {vehicle.runNumber}
                        </strong>
                      </div>
                    )}

                    {/* Trainset Number (Rail only) */}
                    {vehicle.trainsetNumber && (
                      <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">
                          {t.common.trainset}:
                        </span>
                        <strong className="text-white text-xs font-bold">
                          {vehicle.trainsetNumber}
                        </strong>
                      </div>
                    )}

                    {/* Total Trainsets on Line (Rail only) */}
                    {vehicle.totalTrainsets && (
                      <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">
                          Total Armada di Jalur:
                        </span>
                        <strong className="text-emerald-400 text-xs font-bold">
                          {vehicle.totalTrainsets} Trainset
                        </strong>
                      </div>
                    )}

                    {/* Car Formation (Rail only) */}
                    {vehicle.carFormation && (
                      <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">
                          {t.common.formation}:
                        </span>
                        <strong className="text-slate-200 text-xs font-bold truncate block">
                          {vehicle.carFormation}
                        </strong>
                      </div>
                    )}

                    {/* Bus Fleet Number (Bus only) */}
                    {vehicle.fleetNumber && (
                      <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">
                          {t.common.fleetNumber}:
                        </span>
                        <strong className="text-white text-xs font-bold">
                          {vehicle.fleetNumber}
                        </strong>
                      </div>
                    )}

                    {/* License Plate (Bus only) */}
                    {vehicle.licensePlate && (
                      <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">
                          {t.common.licensePlate}:
                        </span>
                        <strong className="text-amber-300 text-xs font-bold">
                          {vehicle.licensePlate}
                        </strong>
                      </div>
                    )}

                    {/* Home Depot */}
                    {vehicle.depotHome && (
                      <div className="col-span-2 p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">
                          {vehicle.category === "RAIL" ? "{t.common.depot}:" : "Pool / Pangkalan Operasi:"}
                        </span>
                        <strong className="text-slate-200 text-xs font-bold">
                          {vehicle.depotHome}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Coachbuilder Summary */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-mono text-[11px]">{t.vehicleInspector.coachbuilder}:</span>
                    <strong className="text-white">{vehicle.coachbuilder}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-mono text-[11px]">{t.vehicleInspector.chassis}:</span>
                    <strong className="text-white truncate max-w-[240px] text-right">
                      {vehicle.chassis}
                    </strong>
                  </div>
                </div>

                {/* Integrated Vehicle Photo Gallery in Overview Tab */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-cyan-400" />
                      {t.vehicleInspector.photoGalleryTitle}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{t.vehicleInspector.spotterCredit}</span>
                  </div>
                  <VehiclePhotoGallery vehicle={vehicle} />
                </div>
              </div>
            )}

            {activeTab === "specs" && <VehicleTechnicalSpecs vehicle={vehicle} />}

            {activeTab === "seating" && (
              <div className="space-y-4">
                {vehicle.carriages && vehicle.carriages.length > 0 && (
                  <VehicleCarriageSelector vehicle={vehicle} />
                )}
                <VehicleSeatingDiagram vehicle={vehicle} />
              </div>
            )}
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
}
