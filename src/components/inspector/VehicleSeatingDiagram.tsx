/**
 * PlatformI - Interactive Vehicle Cabin & Seating Diagram Component
 * - For Urban Standing Transit (BRT, MikroTrans, KRL, MRT, LRT):
 *   Renders Cabin Capacity & Standing Layout Diagram (Doors, Standing grab-straps, Priority seats, Wheelchair bays).
 * - For Intercity Reserved Transit (AKAP Sleeper/Executive, Travel Shuttle HiAce, Whoosh HSR, Speedboat):
 *   Renders Interactive Seat Booking Matrix with live selection.
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero raw emojis, Lucide SVG icons.
 */

"use client";

import React, { useState, useMemo } from "react";
import {
  Armchair,
  Check,
  Tv,
  Zap,
  Sparkles,
  Shield,
  Users,
  Info,
  CircleDot,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Maximize2,
  RotateCw,
  Accessibility,
  Heart,
  DoorOpen,
  Wind,
} from "lucide-react";
import {
  Vehicle,
  SeatingDiagram,
  SeatCoordinate,
  SeatStatus,
  SeatDeck,
  SeatingLayoutType,
  TransitMode,
} from "@/types/transit";
import { useTranslation } from "@/lib/i18n";
import {
  generateSleeper111Seats,
  generateSuperExec21Seats,
  generateExecutive22Seats,
  generateCommuterLongitudinalSeats,
  generateHiAceCaptainSeats,
} from "@/lib/data/jakarta-dataset";

interface VehicleSeatingDiagramProps {
  vehicle: Vehicle;
  onSeatSelect?: (seat: SeatCoordinate) => void;
}

const URBAN_STANDING_MODES = new Set<TransitMode>([
  "TRANSJAKARTA_BRT",
  "TRANSJAKARTA_NON_BRT",
  "MIKROTRANS",
  "MRT_JAKARTA",
  "LRT_JABODEBEK_CIBUBUR",
  "LRT_JABODEBEK_BEKASI",
  "LRT_JAKARTA",
  "KRL_BOGOR",
  "KRL_CIKARANG",
  "KRL_RANGKASBITUNG",
  "KRL_TANGERANG",
  "KRL_TANJUNG_PRIOK",
]);

/**
 * Generates Whoosh HSR First Class & Second Class Seating Diagram
 */
function generateWhooshHSRSeats(vehicleId: string): SeatingDiagram {
  const seats: SeatCoordinate[] = [];

  // Car 1: First Class (2-2 layout, 4 rows = 16 seats)
  const firstClassRows = [1, 2, 3, 4];
  firstClassRows.forEach((row, rIdx) => {
    ["A", "B", "C", "D"].forEach((col, cIdx) => {
      const xPos = cIdx < 2 ? 16 + cIdx * 16 : 56 + (cIdx - 2) * 16;
      const isOccupied = (row + cIdx) % 3 === 0;
      seats.push({
        id: `1FC-${row}${col}`,
        row,
        column: col,
        type: "FIRST_CLASS",
        status: isOccupied ? "OCCUPIED" : "AVAILABLE",
        deck: "SINGLE",
        x: xPos,
        y: 12 + rIdx * 10,
        pricePremiumRp: 250000,
        features: [
          "FIRST_CLASS_PLUSH_LEATHER",
          "MOTORIZED_RECLINE_140",
          "PERSONAL_24V_OUTLET",
          "FOLD_OUT_OAK_DESK",
          "COMPLIMENTARY_SNACK",
        ],
      });
    });
  });

  // Car 2-8: Second Class (3-2 layout, 5 rows = 25 seats shown in coach)
  const secondClassRows = [5, 6, 7, 8, 9];
  secondClassRows.forEach((row, rIdx) => {
    ["A", "B", "C"].forEach((col, cIdx) => {
      const isOccupied = (row * 2 + cIdx) % 4 === 1;
      seats.push({
        id: `2SC-${row}${col}`,
        row,
        column: col,
        type: "STANDARD_COACH",
        status: isOccupied ? "OCCUPIED" : "AVAILABLE",
        deck: "SINGLE",
        x: 12 + cIdx * 12,
        y: 56 + rIdx * 8.5,
        pricePremiumRp: 0,
        features: ["ERGONOMIC_CONTOUR_SEAT", "RECLINING_BACKREST", "UNDER_SEAT_USB_C"],
      });
    });

    ["D", "F"].forEach((col, cIdx) => {
      const isOccupied = (row + cIdx) % 3 === 2;
      seats.push({
        id: `2SC-${row}${col}`,
        row,
        column: col,
        type: "STANDARD_COACH",
        status: isOccupied ? "OCCUPIED" : "AVAILABLE",
        deck: "SINGLE",
        x: 64 + cIdx * 14,
        y: 56 + rIdx * 8.5,
        pricePremiumRp: 0,
        features: ["ERGONOMIC_CONTOUR_SEAT", "RECLINING_BACKREST", "UNDER_SEAT_USB_C"],
      });
    });
  });

  return {
    id: `seat-diag-${vehicleId}`,
    vehicleId,
    layoutType: "WHOOSH_8_CAR",
    totalSeats: seats.length,
    availableSeats: seats.filter((s) => s.status === "AVAILABLE").length,
    seats,
  };
}

/**
 * Generates Speedboat Marine Passenger Cabin Seating Diagram
 */
function generateSpeedboatSeats(vehicleId: string): SeatingDiagram {
  const seats: SeatCoordinate[] = [];
  const rows = [1, 2, 3, 4, 5, 6, 7];

  rows.forEach((row, rIdx) => {
    ["A", "B", "C", "D"].forEach((col, cIdx) => {
      const isOccupied = (row + cIdx) % 3 === 0;
      const xPos = cIdx < 2 ? 18 + cIdx * 16 : 54 + (cIdx - 2) * 16;
      seats.push({
        id: `M-${row}${col}`,
        row,
        column: col,
        type: "STANDARD_COACH",
        status: isOccupied ? "OCCUPIED" : "AVAILABLE",
        deck: "SINGLE",
        x: xPos,
        y: 16 + rIdx * 10.5,
        pricePremiumRp: 0,
        features: [
          "TYPE_I_LIFE_JACKET_UNDER_SEAT",
          "MARINE_VINYL_CUSHION",
          "WATERPROOF_STORAGE_NET",
          "PANORAMIC_OCEAN_VIEW",
        ],
      });
    });
  });

  return {
    id: `seat-diag-${vehicleId}`,
    vehicleId,
    layoutType: "SPEEDBOAT_CABIN",
    totalSeats: seats.length,
    availableSeats: seats.filter((s) => s.status === "AVAILABLE").length,
    seats,
  };
}

/**
 * Resolves or builds authentic seating layout for any vehicle
 */
function getVehicleSeating(vehicle: Vehicle): SeatingDiagram {
  if (vehicle.seatingDiagram) {
    return vehicle.seatingDiagram;
  }

  switch (vehicle.mode) {
    case "WHOOSH_HSR":
      return generateWhooshHSRSeats(vehicle.id);
    case "AKAP_INTERCITY_BUS":
      return generateSleeper111Seats(vehicle.id);
    case "EXECUTIVE_SHUTTLE":
      return generateHiAceCaptainSeats(vehicle.id);
    case "MARITIME_SPEEDBOAT":
      return generateSpeedboatSeats(vehicle.id);
    default:
      return generateExecutive22Seats(vehicle.id);
  }
}

/**
 * Urban Standing Transit Capacity & Cabin Schematic
 */
function UrbanStandingCabinView({ vehicle }: { vehicle: Vehicle }) {
  const { t } = useTranslation();
  const isBRT = vehicle.mode === "TRANSJAKARTA_BRT" || vehicle.mode === "TRANSJAKARTA_NON_BRT";
  const isMikro = vehicle.mode === "MIKROTRANS";
  const isMRT = vehicle.mode === "MRT_JAKARTA";
  const isLRT = vehicle.mode.includes("LRT");

  const totalCap = isMRT ? 1950 : isLRT ? 1308 : isBRT ? (vehicle.coachbuilder.includes("Articulated") || vehicle.coachbuilder.includes("Scania") ? 120 : 85) : isMikro ? 15 : 65;
  const seatedCap = isMRT ? 290 : isLRT ? 196 : isBRT ? 32 : isMikro ? 11 : 28;
  const standingCap = Math.max(0, totalCap - seatedCap);
  const prioritySeatsCount = isMRT ? 48 : isLRT ? 24 : isBRT ? 6 : 2;
  const wheelchairBays = isMRT ? 6 : isLRT ? 4 : isBRT ? 2 : 1;

  return (
    <div className="space-y-4 text-slate-200">
      {/* 1. CAPACITY HIGHLIGHT CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">{t.vehicleInspector.totalCapacity}</span>
          <strong className="text-base font-bold text-white font-mono">{totalCap} {t.vehicleInspector.paxUnit}</strong>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">{t.vehicleInspector.seatsLabel}</span>
          <strong className="text-base font-bold text-emerald-400 font-mono">{seatedCap} {t.vehicleInspector.seatsUnit}</strong>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">{t.vehicleInspector.standingLabel}</span>
          <strong className="text-base font-bold text-cyan-400 font-mono">{standingCap} {t.vehicleInspector.paxUnit}</strong>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">{t.vehicleInspector.wheelchairFriendly}</span>
          <strong className="text-base font-bold text-purple-300 font-mono">{wheelchairBays} {t.vehicleInspector.wheelchairBayUnit}</strong>
        </div>
      </div>

      {/* 2. SVG SCHEMATIC OF CABIN DOORS, STRAPS & PRIORITY AREAS */}
      <div className="p-3.5 bg-[#060a12] rounded-2xl border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-mono text-slate-300">
          <span className="flex items-center gap-1.5 font-bold text-cyan-300">
            <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
            {t.vehicleInspector.diagramTitle}
          </span>
          <span className="text-[10px] text-emerald-400">● {t.vehicleInspector.legendStandard}</span>
        </div>

        <svg viewBox="0 0 400 120" className="w-full h-auto text-slate-300">
          {/* Cabin Floor Shell */}
          <rect x="10" y="10" width="380" height="100" rx="8" fill="#090d16" stroke="#334155" strokeWidth="1.5" />

          {/* Driver Cab / Windscreen Area (Left) */}
          <path d="M 10 20 L 40 20 L 40 100 L 10 100 Z" fill="#0f172a" stroke="#475569" strokeWidth="1" />
          <text x="25" y="65" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="middle" transform="rotate(-90, 25, 65)">
            {t.vehicleInspector.svgCabin}
          </text>

          {/* Passenger Entry Doors (Top & Bottom Markers) */}
          {[100, 230, 330].map((x, idx) => (
            <g key={idx}>
              {/* Door Cutout */}
              <rect x={x} y="8" width="32" height="6" fill="#0284c7" rx="1" />
              <text x={x + 16} y="6" fill="#38bdf8" fontSize="6" fontFamily="sans-serif" textAnchor="middle">
                {`${t.vehicleInspector.svgDoor} ${idx + 1}`}
              </text>
            </g>
          ))}

          {/* Priority Seating Zone (Elderly / Pregnant / Disability) */}
          <rect x="50" y="20" width="40" height="24" rx="3" fill="#581c87" stroke="#a855f7" strokeWidth="1" />
          <text x="70" y="35" fill="#e9d5ff" fontSize="7" fontWeight="bold" textAnchor="middle">
            {t.vehicleInspector.svgPriority}
          </text>

          {/* Wheelchair Bay */}
          <rect x="50" y="76" width="40" height="26" rx="3" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1" strokeDasharray="3,2" />
          <text x="70" y="92" fill="#c7d2fe" fontSize="7" textAnchor="middle">
            {t.vehicleInspector.svgWheelchair}
          </text>

          {/* Longitudinal Seating Benches (Top & Bottom Rows) */}
          {[140, 180, 270, 310].map((x, idx) => (
            <rect key={idx} x={x} y="20" width="32" height="18" rx="2" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
          ))}
          {[100, 140, 180, 270, 310].map((x, idx) => (
            <rect key={idx} x={x} y="82" width="32" height="18" rx="2" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
          ))}

          {/* Central Standing Area with Grab Straps */}
          <rect x="100" y="44" width="280" height="32" rx="4" fill="#0f172a" stroke="#0ea5e9" strokeWidth="0.8" strokeDasharray="4,3" />
          <text x="240" y="62" fill="#38bdf8" fontSize="8" fontFamily="monospace" textAnchor="middle">
            {t.vehicleInspector.svgStandingArea}
          </text>

          {/* Grab Poles Indicator Dots */}
          {[120, 160, 200, 240, 280, 320, 360].map((x, idx) => (
            <circle key={idx} cx={x} cy="60" r="2" fill="#f59e0b" />
          ))}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-800 text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-purple-900 border border-purple-500" />
            <span className="text-purple-300">{t.vehicleInspector.legendPriority} ({prioritySeatsCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-indigo-950 border border-indigo-500" />
            <span className="text-indigo-300">{t.vehicleInspector.legendWheelchair} ({wheelchairBays})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-slate-800 border border-slate-600" />
            <span className="text-slate-300">{t.vehicleInspector.legendRegular} ({seatedCap - prioritySeatsCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-amber-300">{t.vehicleInspector.legendHandrail}</span>
          </div>
        </div>
      </div>

      {/* 3. COMFORT & VENTILATION FEATURES */}
      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
          <Wind className="w-4 h-4 text-cyan-400" />
          <span>{t.vehicleInspector.spmTitle}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-slate-200">{t.vehicleInspector.spmAc}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-slate-200">{t.vehicleInspector.spmFloor}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-slate-200">{t.vehicleInspector.spmAnnouncement}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-slate-200">{t.vehicleInspector.spmCctv}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VehicleSeatingDiagram({
  vehicle,
  onSeatSelect,
}: VehicleSeatingDiagramProps) {
  const { t } = useTranslation();
  // If urban standing transit: render dedicated UrbanStandingCabinView
  if (URBAN_STANDING_MODES.has(vehicle.mode)) {
    return <UrbanStandingCabinView vehicle={vehicle} />;
  }

  const initialDiagram = useMemo(() => getVehicleSeating(vehicle), [vehicle]);

  const [activeDeck, setActiveDeck] = useState<SeatDeck>("SINGLE");
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [userSelectedSeatIds, setUserSelectedSeatIds] = useState<string[]>([]);

  const diagram = initialDiagram;
  const filteredSeats = diagram.seats.filter(
    (s) => s.deck === activeDeck || s.deck === "SINGLE"
  );

  const selectedSeat = diagram.seats.find((s) => s.id === selectedSeatId);

  const handleSeatClick = (seat: SeatCoordinate) => {
    setSelectedSeatId(seat.id);

    if (seat.status === "AVAILABLE" || seat.status === "SELECTED") {
      setUserSelectedSeatIds((prev) =>
        prev.includes(seat.id)
          ? prev.filter((id) => id !== seat.id)
          : [...prev, seat.id]
      );
      if (onSeatSelect) {
        onSeatSelect(seat);
      }
    }
  };

  const isDoubleDecker =
    vehicle.mode === "AKAP_INTERCITY_BUS" &&
    vehicle.coachbuilder.toLowerCase().includes("double decker");

  const totalSeatsCount = diagram.totalSeats;
  const availableSeatsCount =
    diagram.seats.filter((s) => s.status === "AVAILABLE").length -
    userSelectedSeatIds.length;
  const occupiedSeatsCount =
    diagram.seats.filter((s) => s.status === "OCCUPIED").length;
  const occupancyPercentage = Math.round(
    (occupiedSeatsCount / Math.max(1, totalSeatsCount)) * 100
  );

  return (
    <div className="space-y-4 text-slate-200">
      {/* 1. TOP STATS BAR & DECK SWITCHER */}
      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-400 block text-[10px]">{t.vehicleInspector.totalPrefix} {t.vehicleInspector.seatsLabel}</span>
            <strong className="text-white">{totalSeatsCount} {t.vehicleInspector.seatsUnit}</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">{t.vehicleInspector.available}:</span>
            <strong className="text-emerald-400">{Math.max(0, availableSeatsCount)} {t.vehicleInspector.seatsFreeSuffix}</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">{t.vehicleInspector.occupied}:</span>
            <strong className="text-cyan-400">{occupancyPercentage}%</strong>
          </div>
        </div>

        {/* Double Decker Level Switcher */}
        {isDoubleDecker && (
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveDeck("LOWER")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeDeck === "LOWER"
                  ? "bg-cyan-600 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              >
                {t.vehicleInspector.deckLower}
              </button>
              <button
                onClick={() => setActiveDeck("UPPER")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  activeDeck === "UPPER"
                    ? "bg-cyan-600 text-white font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t.vehicleInspector.deckUpper}
              </button>
          </div>
        )}
      </div>

      {/* 2. SVG INTERACTIVE CABIN SEATING PLAN */}
      <div className="p-4 bg-[#070b14] rounded-2xl border border-slate-800/90 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
        {/* Front of Vehicle Indicator */}
        <div className="w-full flex items-center justify-center gap-2 text-[10px] font-mono uppercase text-slate-400 pb-3 border-b border-slate-800/60 mb-2">
          <span>▲ {t.vehicleInspector.frontOfVehicle}</span>
        </div>

        {/* Interactive SVG Seat Nodes */}
        <div className="w-full max-w-[340px] aspect-[4/5] relative bg-slate-950/60 rounded-xl p-3 border border-slate-800/60 shadow-lg">
          {filteredSeats.map((seat) => {
            const isUserSelected = userSelectedSeatIds.includes(seat.id);
            const isInspectSelected = selectedSeatId === seat.id;
            const isAvailable = seat.status === "AVAILABLE";

            let bgClass = "bg-slate-800 border-slate-700 text-slate-400";
            if (seat.status === "OCCUPIED") {
              bgClass = "bg-rose-950/40 border-rose-800/50 text-rose-500 opacity-60 cursor-not-allowed";
            } else if (isUserSelected) {
              bgClass = "bg-cyan-500 border-cyan-300 text-slate-950 font-bold shadow-lg shadow-cyan-500/50 scale-110";
            } else if (isAvailable) {
              if (seat.type === "SLEEPER_SUITE") {
                bgClass = "bg-indigo-950/80 border-indigo-500/60 text-indigo-300 hover:border-cyan-400 hover:scale-105";
              } else if (seat.type === "CAPTAIN_CHAIR" || seat.type === "FIRST_CLASS") {
                bgClass = "bg-amber-950/80 border-amber-500/60 text-amber-300 hover:border-cyan-400 hover:scale-105";
              } else {
                bgClass = "bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:border-cyan-400 hover:scale-105";
              }
            }

            return (
              <button
                key={seat.id}
                onClick={() => handleSeatClick(seat)}
                style={{
                  position: "absolute",
                  left: `${seat.x}%`,
                  top: `${seat.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex flex-col items-center justify-center transition-all ${bgClass} ${
                  isInspectSelected ? "ring-2 ring-white ring-offset-2 ring-offset-slate-950" : ""
                }`}
                title={`${t.vehicleInspector.seat} ${seat.id} - ${seat.type}`}
              >
                <span className="text-[10px] font-mono font-bold leading-none">{seat.id}</span>
              </button>
            );
          })}
        </div>

        {/* Rear of Vehicle Indicator */}
        <div className="w-full flex items-center justify-center gap-2 text-[10px] font-mono text-slate-500 pt-3 border-t border-slate-800/60 mt-2">
          <span>▼ {t.vehicleInspector.rearOfVehicle}</span>
        </div>
      </div>

      {/* 3. SELECTED SEAT DETAIL CARD */}
      {selectedSeat && (
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white font-mono">
                {t.vehicleInspector.seat} #{selectedSeat.id}
              </span>
              <span className="text-xs text-cyan-300 font-medium">
                {selectedSeat.type.replace(/_/g, " ")}
              </span>
            </div>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                selectedSeat.status === "AVAILABLE"
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                  : "bg-rose-950 text-rose-400 border border-rose-500/30"
              }`}
            >
              {selectedSeat.status === "AVAILABLE" ? t.vehicleInspector.available : t.vehicleInspector.occupied}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800">
            {selectedSeat.features.map((feature, fIdx) => (
              <span
                key={fIdx}
                className="px-2 py-0.5 rounded bg-slate-950 text-[10px] text-slate-300 font-mono border border-slate-800"
              >
                {feature.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
