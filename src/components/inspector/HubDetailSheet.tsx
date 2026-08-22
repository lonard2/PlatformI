/**
 * PlatformI - Station, Hub, Terminal & Port Detail Sheet (Inspector)
 * Features real-time departure/arrival boards (On Time, Boarding, Delayed, Departed),
 * facilities and universal accessibility matrix, and integrated skybridge transfer guides.
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero emojis, Lucide SVG icons.
 */

"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MapPin,
  Clock,
  Navigation,
  Accessibility,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  DoorOpen,
  ArrowRight,
  Sparkles,
  Layers,
  Layers2,
  Compass,
  Train,
  Bus,
  Plane,
  Ship,
  Footprints,
  Baby,
  Heart,
  Bike,
  CreditCard,
  Coffee,
  HelpCircle,
} from "lucide-react";
import { Stop, Line, TransitMode, CrowdDensityLevel, DepartureBoardItem } from "@/types/transit";
import { TRANSIT_MODE_CONFIG } from "@/lib/constants/modes";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { SkybridgeTransferGuide, SKYBRIDGE_HUBS_DATA } from "./SkybridgeTransferGuide";

interface HubDetailSheetProps {
  stopId: string | null;
  onClose?: () => void;
}

type HubTabType = "departures" | "facilities" | "skybridge";

/**
 * Generates dynamic departure board items for any station in the network
 */
function generateDepartureBoard(stop: Stop, lines: Line[]): DepartureBoardItem[] {
  const departures: DepartureBoardItem[] = [];
  const connectedLines = lines.filter(
    (l) => l.id === stop.lineId || stop.connectedLineIds.includes(l.id)
  );

  const statuses: ("ON_TIME" | "BOARDING" | "DELAYED" | "DEPARTED")[] = [
    "BOARDING",
    "ON_TIME",
    "ON_TIME",
    "DELAYED",
    "ON_TIME",
    "DEPARTED",
  ];

  const now = new Date();

  connectedLines.forEach((line, lineIdx) => {
    // Generate 2-3 departures per line
    [0, 1, 2].forEach((offsetIdx) => {
      const minutesOffset = offsetIdx * line.headwayMinutes + (lineIdx * 3);
      const scheduledDate = new Date(now.getTime() + minutesOffset * 60000);
      const isDelayed = offsetIdx === 2 && lineIdx % 2 === 1;
      const estimatedDate = isDelayed
        ? new Date(scheduledDate.getTime() + 6 * 60000)
        : scheduledDate;

      const scheduledStr = scheduledDate.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta",
      });

      const estimatedStr = estimatedDate.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta",
      });

      const status =
        offsetIdx === 0
          ? "BOARDING"
          : isDelayed
          ? "DELAYED"
          : offsetIdx === 1
          ? "ON_TIME"
          : "ON_TIME";

      const platformNumber = ((lineIdx * 2 + offsetIdx) % 6) + 1;
      const platformStr =
        line.category === "AVIATION"
          ? `Gate ${platformNumber + 10}`
          : line.category === "MARITIME"
          ? `Dermaga ${platformNumber}`
          : line.category === "BUS"
          ? `Bay ${platformNumber}`
          : `Platform ${platformNumber}`;

      const crowdLevels: CrowdDensityLevel[] = [
        "LEVEL_1_MANY_SEATS",
        "LEVEL_2_FEW_SEATS",
        "LEVEL_3_STANDING_ONLY",
      ];

      departures.push({
        tripId: `trip-${line.code}-${offsetIdx}`,
        lineCode: line.code,
        lineName: line.name,
        destination: `Terminus / Central (${line.code})`,
        mode: line.mode,
        scheduledTime: scheduledStr,
        estimatedTime: estimatedStr,
        status,
        platform: platformStr,
        crowdLevel: crowdLevels[(lineIdx + offsetIdx) % crowdLevels.length],
      });
    });
  });

  return departures.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
}

/**
 * Maps stop ID to corresponding skybridge ID if available
 */
function getMatchingSkybridgeId(stop: Stop): string | null {
  const name = stop.name.toLowerCase();
  const id = stop.id.toLowerCase();

  if (name.includes("csw") || name.includes("asean") || id.includes("asn")) {
    return "csw-asean";
  }
  if (
    name.includes("dukuh atas") ||
    name.includes("sudirman") ||
    id.includes("dka")
  ) {
    return "dukuh-atas";
  }
  if (name.includes("halim") || id.includes("hlm")) {
    return "halim-hsr";
  }
  if (name.includes("manggarai") || id.includes("mgg")) {
    return "manggarai-hub";
  }

  return null;
}

export function HubDetailSheet({ stopId, onClose }: HubDetailSheetProps) {
  const allStops = useTransitStore((state) => state.allStops);
  const allLines = useTransitStore((state) => state.allLines);
  const clearSelection = useTransitStore((state) => state.clearSelection);

  const stop = allStops.find((s) => s.id === stopId);
  const skybridgeHubId = stop ? getMatchingSkybridgeId(stop) : null;

  const [activeTab, setActiveTab] = useState<HubTabType>("departures");

  const departureBoard = useMemo(() => {
    if (!stop) return [];
    return generateDepartureBoard(stop, allLines);
  }, [stop, allLines]);

  if (!stop) return null;

  const connectedLines = allLines.filter(
    (l) => l.id === stop.lineId || stop.connectedLineIds.includes(l.id)
  );

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
        {/* Mobile Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto lg:hidden"
        />

        {/* The Hub Detail Sheet Container */}
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
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-cyan-950/90 border border-cyan-500/40 text-cyan-300">
                  {stop.code}
                </span>
                {stop.isInterchange && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-950/80 border border-purple-500/40 text-purple-300">
                    Intermodal Hub
                  </span>
                )}
                {skybridgeHubId && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                    Skybridge TOD
                  </span>
                )}
              </div>

              <h2 className="text-base font-bold text-white tracking-tight leading-tight">
                {stop.name}
              </h2>

              {/* Coordinates & Platform Type */}
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>
                  {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                </span>
                {stop.platformType && (
                  <>
                    <span>&bull;</span>
                    <span className="text-slate-300">{stop.platformType}</span>
                  </>
                )}
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={handleClose}
              aria-label="Close station inspector"
              className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Connected Lines Badges */}
          <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider shrink-0 mr-1">
              Lines:
            </span>
            {connectedLines.map((line) => (
              <span
                key={line.id}
                className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold shrink-0"
                style={{
                  backgroundColor: `${line.colorHex}25`,
                  color: line.colorHex,
                  border: `1px solid ${line.colorHex}60`,
                }}
              >
                {line.code}
              </span>
            ))}
          </div>

          {/* 2. TAB NAVIGATION BAR */}
          <div className="px-4 pt-2 border-b border-slate-800/80 flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("departures")}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
                activeTab === "departures"
                  ? "border-cyan-400 text-cyan-300 bg-cyan-950/30"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Live Timetable</span>
            </button>

            <button
              onClick={() => setActiveTab("facilities")}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
                activeTab === "facilities"
                  ? "border-cyan-400 text-cyan-300 bg-cyan-950/30"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Accessibility className="w-3.5 h-3.5" />
              <span>Facilities & A11y</span>
            </button>

            {skybridgeHubId && (
              <button
                onClick={() => setActiveTab("skybridge")}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
                  activeTab === "skybridge"
                    ? "border-cyan-400 text-cyan-300 bg-cyan-950/30"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Footprints className="w-3.5 h-3.5" />
                <span>Skybridge Guide</span>
              </button>
            )}
          </div>

          {/* 3. SCROLLABLE TAB CONTENT BODY */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {/* TAB 1: REAL-TIME DEPARTURE BOARDS */}
            {activeTab === "departures" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    Real-Time Departures
                  </span>
                  <span className="text-[10px] text-emerald-400">● Live Feed</span>
                </div>

                {departureBoard.map((item, idx) => {
                  let statusBadge = {
                    label: "On Time",
                    color: "bg-emerald-950/80 border-emerald-500/40 text-emerald-400",
                    icon: CheckCircle2,
                  };

                  if (item.status === "BOARDING") {
                    statusBadge = {
                      label: "Boarding",
                      color: "bg-amber-950/80 border-amber-500/40 text-amber-400 animate-pulse",
                      icon: DoorOpen,
                    };
                  } else if (item.status === "DELAYED") {
                    statusBadge = {
                      label: "Delayed",
                      color: "bg-rose-950/80 border-rose-500/40 text-rose-400",
                      icon: AlertTriangle,
                    };
                  } else if (item.status === "DEPARTED") {
                    statusBadge = {
                      label: "Departed",
                      color: "bg-slate-900 border-slate-700 text-slate-400",
                      icon: Clock,
                    };
                  }

                  const StatusIcon = statusBadge.icon;

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-950 border border-slate-700 text-slate-200">
                            {item.lineCode}
                          </span>
                          <span className="text-xs font-bold text-white tracking-tight">
                            {item.destination}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                          <span className="text-slate-300 font-semibold">{item.platform}</span>
                          <span>&bull;</span>
                          <span>Est: <strong className="text-cyan-300">{item.estimatedTime} WIB</strong></span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-xs font-mono font-bold text-white">
                          {item.scheduledTime}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${statusBadge.color}`}
                        >
                          <StatusIcon className="w-2.5 h-2.5" />
                          {statusBadge.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: FACILITIES & UNIVERSAL ACCESSIBILITY MATRIX */}
            {activeTab === "facilities" && (
              <div className="space-y-4">
                {/* Accessibility Guarantees Card */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                    <Accessibility className="w-4 h-4 text-purple-400" />
                    <span>Universal Accessibility Standards (A11y)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-300">Passenger Elevator:</span>
                      {stop.accessibleElevator ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3 h-3" /> Available
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">No</span>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-300">Tactile Paving:</span>
                      {stop.tactilePaving ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3 h-3" /> Guiding Line
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">No</span>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-300">Wheelchair Ramp:</span>
                      {stop.wheelchairRamp ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3 h-3" /> 1:12 Incline
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">No</span>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-300">Automatic Wide Gates:</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3 h-3" /> Supported
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hub Amenities Matrix */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                    <Building2 className="w-4 h-4 text-cyan-400" />
                    <span>Station Amenities & Commuter Services</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center gap-2">
                      <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="text-slate-200">Prayer Room (Musholla)</span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center gap-2">
                      <Baby className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="text-slate-200">Nursing / Baby Care</span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-slate-200">ATM & Top-Up Kiosk</span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center gap-2">
                      <Coffee className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="text-slate-200">Retail & Convenience</span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center gap-2">
                      <Bike className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-slate-200">Bicycle Parking Rack</span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="text-slate-200">Park & Ride Facility</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SKYBRIDGE VECTOR TRANSFER GUIDE */}
            {activeTab === "skybridge" && skybridgeHubId && (
              <SkybridgeTransferGuide initialHubId={skybridgeHubId} />
            )}
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
}
