/**
 * PlatformI - Interactive Vehicle Seating Diagram Component (SVG Matrix)
 * Renders authentic cabin seating layouts for Indonesian transit:
 * 1. Sleeper Suites 1-1-1 (Individual Pods)
 * 2. Super Executive 2-1 (Wide Recliners)
 * 3. Executive Standard 2-2 (Tour Coach)
 * 4. Commuter Longitudinal Bench (Urban Rail / BRT)
 * 5. HiAce VIP Captain Chairs (Executive Shuttle)
 * 6. High-Speed Rail 1st / 2nd Class (Whoosh)
 * 7. Speedboat Marine Passenger Cabin
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero emojis, interactive seat inspection.
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
    // Left 3 seats: A, B, C
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

    // Right 2 seats: D, F
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
    // 2-2 Marine Bench arrangement
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
    case "TRANSJAKARTA_BRT":
    case "MRT_JAKARTA":
    case "LRT_JABODEBEK_CIBUBUR":
    case "LRT_JABODEBEK_BEKASI":
    case "LRT_JAKARTA":
    case "KRL_BOGOR":
    case "KRL_CIKARANG":
    case "KRL_RANGKASBITUNG":
    case "KRL_TANGERANG":
    case "KRL_TANJUNG_PRIOK":
      return generateCommuterLongitudinalSeats(vehicle.id);
    case "MARITIME_SPEEDBOAT":
      return generateSpeedboatSeats(vehicle.id);
    case "TRANSJAKARTA_NON_BRT":
    case "KAI_BANDARA":
    default:
      return generateExecutive22Seats(vehicle.id);
  }
}

export function VehicleSeatingDiagram({
  vehicle,
  onSeatSelect,
}: VehicleSeatingDiagramProps) {
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
            <span className="text-slate-400 block text-[10px]">Total Cabin:</span>
            <strong className="text-white">{totalSeatsCount} Seats</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Available:</span>
            <strong className="text-emerald-400">{Math.max(0, availableSeatsCount)} Open</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Occupancy:</span>
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
              Lower Deck (Suites)
            </button>
            <button
              onClick={() => setActiveDeck("UPPER")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeDeck === "UPPER"
                  ? "bg-cyan-600 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Upper Deck (Super Exec)
            </button>
          </div>
        )}
      </div>

      {/* 2. INTERACTIVE SVG CABIN VIEWPORT */}
      <div className="relative rounded-2xl bg-[#090d16] border border-slate-800 p-4 overflow-hidden flex flex-col items-center justify-center min-h-[380px]">
        {/* Cabin Hull Shell & Vehicle Direction Indicator */}
        <div className="w-full max-w-md flex items-center justify-between text-[11px] text-slate-500 font-mono pb-2 border-b border-slate-800/80 mb-2">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <CircleDot className="w-3.5 h-3.5" />
            <span className="font-semibold uppercase tracking-wider">
              {diagram.layoutType.replace(/_/g, " ")}
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <span>Front (Driver & Helm)</span>
            <span className="text-cyan-400 font-bold">&uarr;</span>
          </div>
        </div>

        {/* SVG Matrix Canvas */}
        <div className="w-full max-w-md aspect-[1/1.6] sm:aspect-[1/1.4] relative bg-slate-950/90 rounded-xl border border-slate-800/80 p-2 shadow-inner">
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full select-none"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Background Coach Perimeter */}
            <rect
              x="5"
              y="2"
              width="90"
              height="96"
              rx="8"
              fill="none"
              stroke="#1e293b"
              strokeWidth="1.2"
              strokeDasharray="2 2"
            />

            {/* Driver Cockpit / Helm Area */}
            <rect
              x="12"
              y="4"
              width="76"
              height="5"
              rx="2"
              fill="#0f172a"
              stroke="#334155"
              strokeWidth="0.8"
            />
            <text
              x="50"
              y="7.5"
              textAnchor="middle"
              fill="#64748b"
              fontSize="2.8"
              fontFamily="monospace"
              fontWeight="bold"
            >
              COCKPIT / FRONT ENTRY
            </text>

            {/* Commuter Standee Aisle / Rail Poles */}
            {diagram.layoutType === "COMMUTER_LONGITUDINAL" && (
              <g>
                <line
                  x1="35"
                  y1="12"
                  x2="35"
                  y2="92"
                  stroke="#334155"
                  strokeWidth="0.8"
                  strokeDasharray="1.5 2"
                />
                <line
                  x1="65"
                  y1="12"
                  x2="65"
                  y2="92"
                  stroke="#334155"
                  strokeWidth="0.8"
                  strokeDasharray="1.5 2"
                />
                <text
                  x="50"
                  y="52"
                  textAnchor="middle"
                  fill="#475569"
                  fontSize="2.4"
                  fontFamily="monospace"
                  transform="rotate(-90 50 52)"
                >
                  STANDEE AREA & OVERHEAD HANDRAILS
                </text>
              </g>
            )}

            {/* Render Seats */}
            {filteredSeats.map((seat) => {
              const isSelectedByUser = userSelectedSeatIds.includes(seat.id);
              const isInspected = selectedSeatId === seat.id;
              const isOccupied = seat.status === "OCCUPIED";
              const isPriority = seat.type === "PRIORITY_ACCESSIBLE";
              const isWheelchair = seat.type === "WHEELCHAIR_BAY";
              const isSleeper = seat.type === "SLEEPER_SUITE";
              const isFirstClass = seat.type === "FIRST_CLASS";

              // Determine Seat Colors
              let fill = "#0f172a";
              let stroke = "#334155";
              let textColor = "#94a3b8";

              if (isOccupied) {
                fill = "#1e293b";
                stroke = "#475569";
                textColor = "#64748b";
              } else if (isSelectedByUser || isInspected) {
                fill = "#0891b2";
                stroke = "#38bdf8";
                textColor = "#ffffff";
              } else if (isPriority) {
                fill = "#1e1b4b";
                stroke = "#818cf8";
                textColor = "#c7d2fe";
              } else if (isWheelchair) {
                fill = "#14532d";
                stroke = "#22c55e";
                textColor = "#bbf7d0";
              } else if (isSleeper || isFirstClass) {
                fill = "#311042";
                stroke = "#c084fc";
                textColor = "#f5d0fe";
              } else {
                fill = "#064e3b";
                stroke = "#10b981";
                textColor = "#6ee7b7";
              }

              const width = isSleeper ? 24 : isFirstClass ? 15 : 12;
              const height = isSleeper ? 10 : 8.5;

              return (
                <g
                  key={seat.id}
                  onClick={() => handleSeatClick(seat)}
                  className="cursor-pointer transition-transform hover:opacity-90"
                  style={{ transformOrigin: `${seat.x}% ${seat.y}%` }}
                >
                  {/* Seat Pod / Shell Rectangle */}
                  <rect
                    x={seat.x - width / 2}
                    y={seat.y - height / 2}
                    width={width}
                    height={height}
                    rx={isSleeper ? 3 : 2}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isInspected || isSelectedByUser ? 1.5 : 0.8}
                  />

                  {/* Seat Headrest / Armrest Accent */}
                  <rect
                    x={seat.x - width / 2 + 1}
                    y={seat.y - height / 2 + 0.8}
                    width={width - 2}
                    height={2}
                    rx={1}
                    fill={stroke}
                    opacity="0.6"
                  />

                  {/* Seat ID Text */}
                  <text
                    x={seat.x}
                    y={seat.y + 1.2}
                    textAnchor="middle"
                    fill={textColor}
                    fontSize="2.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {seat.id}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* 3. SEATING LEGEND */}
        <div className="w-full max-w-md pt-3 flex flex-wrap items-center justify-center gap-3 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#064e3b] border border-[#10b981]"></span>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#1e293b] border border-[#475569]"></span>
            <span>Occupied</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#0891b2] border border-[#38bdf8]"></span>
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#311042] border border-[#c084fc]"></span>
            <span>Sleeper/1st</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#14532d] border border-[#22c55e]"></span>
            <span>Accessible</span>
          </div>
        </div>
      </div>

      {/* 4. SELECTED SEAT DETAIL INSPECTOR CARD */}
      {selectedSeat ? (
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 shadow-lg space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
                {selectedSeat.id}
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                  Seat {selectedSeat.id}
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                    {selectedSeat.type.replace(/_/g, " ")}
                  </span>
                </h4>
                <p className="text-[10px] text-slate-400 font-mono">
                  Row {selectedSeat.row} &bull; Column {selectedSeat.column}
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-1.5">
              {selectedSeat.status === "AVAILABLE" ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Available
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  Occupied
                </span>
              )}
            </div>
          </div>

          {/* Seat Features List */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Cabin Amenities & Equipment:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {selectedSeat.features.map((feature, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-slate-950/80 border border-slate-800 text-[10px] text-slate-300 flex items-center gap-1"
                >
                  <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                  {feature.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>

          {/* Price Premium if any */}
          {selectedSeat.pricePremiumRp > 0 && (
            <div className="text-[11px] text-amber-400 bg-amber-950/30 p-2 rounded-lg border border-amber-500/30 flex items-center justify-between">
              <span>Class Upgrade Premium:</span>
              <strong>+Rp {selectedSeat.pricePremiumRp.toLocaleString("id-ID")}</strong>
            </div>
          )}
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>Click any seat on the diagram to inspect features and status.</span>
        </div>
      )}
    </div>
  );
}
