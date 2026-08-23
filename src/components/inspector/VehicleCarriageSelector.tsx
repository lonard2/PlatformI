/**
 * PlatformI - Interactive Multi-Car Trainset & Multi-Deck Carriage Telemetry
 *
 * Visualizes individual train cars (e.g. Kereta 1 s/d 12 SF12) or bus/plane decks,
 * allowing commuters and transit enthusiasts to inspect real-time car occupancy,
 * individual AC temperatures, pantograph & traction motor states, wheelchair bays,
 * and security sensors.
 *
 * Rules: Strict TypeScript typing (zero 'any'), zero raw emojis, Lucide SVG icons.
 */

"use client";

import React, { useState } from "react";
import {
  Train,
  Zap,
  Wind,
  Users,
  ShieldCheck,
  Wifi,
  Lock,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  Cpu,
} from "lucide-react";
import { Vehicle, VehicleCarriageTelemetry } from "@/types/transit";

interface VehicleCarriageSelectorProps {
  vehicle: Vehicle;
}

export function VehicleCarriageSelector({ vehicle }: VehicleCarriageSelectorProps) {
  const carriages = vehicle.carriages || [];

  // Default to first carriage if available
  const [selectedCarIndex, setSelectedCarIndex] = useState<number>(1);

  if (!carriages || carriages.length === 0) {
    return null;
  }

  const selectedCar =
    carriages.find((c) => c.carIndex === selectedCarIndex) || carriages[0];

  const isTrain = vehicle.category === "RAIL";
  const isAviation = vehicle.category === "AVIATION";

  const getOccupancyColor = (percent: number) => {
    if (percent < 50) return { bg: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500/40", lightBg: "bg-emerald-950/40", hex: "#10b981" };
    if (percent < 75) return { bg: "bg-cyan-500", text: "text-cyan-400", border: "border-cyan-500/40", lightBg: "bg-cyan-950/40", hex: "#06b6d4" };
    if (percent < 90) return { bg: "bg-amber-500", text: "text-amber-400", border: "border-amber-500/40", lightBg: "bg-amber-950/40", hex: "#f59e0b" };
    return { bg: "bg-rose-500", text: "text-rose-400", border: "border-rose-500/40", lightBg: "bg-rose-950/40", hex: "#f43f5e" };
  };

  const occStyle = getOccupancyColor(selectedCar.occupancyPercent);

  // SVG Geometry Calculation for Trainset Blueprint
  const totalCars = carriages.length;
  const carWidth = isTrain ? (totalCars > 8 ? 72 : 86) : 95;
  const carGap = 6;
  const svgTotalWidth = Math.max(500, totalCars * (carWidth + carGap) + 40);

  return (
    <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 space-y-3 shadow-lg">
      {/* 1. SECTION TITLE */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-white tracking-tight uppercase font-mono">
            {isTrain
              ? `Diagram Formasi Rangkaian (${carriages.length} SF)`
              : isAviation
              ? `Kompartemen Kabin Pesawat (${carriages.length} Zona)`
              : `Tingkat Dek Kendaraan (${carriages.length} Lantai)`}
          </h3>
        </div>
        <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-300" />
          Sentuh gerbong diagram untuk rincian
        </span>
      </div>

      {/* 2. INTERACTIVE TECHNICAL BLUEPRINT SVG SCHEMATIC */}
      <div className="p-3 bg-[#060a14] rounded-xl border border-cyan-500/30 space-y-2 overflow-hidden shadow-inner">
        <div className="flex items-center justify-between text-[11px] font-mono text-cyan-300 pb-1">
          <span className="flex items-center gap-1 font-bold">
            <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
            {isTrain
              ? `Skema Rangkaian: ${vehicle.name} (${carriages.length} Car Formation)`
              : isAviation
              ? `Skema Kabin Fuselage: ${vehicle.name}`
              : `Skema Struktur Karoseri: ${vehicle.name}`}
          </span>
          <span className="text-[10px] text-slate-400">
            Gerbong Aktif: <strong className="text-cyan-300">K{selectedCar.carIndex} ({selectedCar.carCode})</strong>
          </span>
        </div>

        {/* Scrollable / Touchable Blueprint Canvas */}
        <div className="overflow-x-auto pb-1 no-scrollbar">
          <svg
            viewBox={`0 0 ${svgTotalWidth} 105`}
            className="w-full h-auto min-w-[520px] select-none"
            style={{ minHeight: "105px" }}
          >
            {/* Background Grid Pattern */}
            <defs>
              <pattern id="diagGrid" width="12" height="12" patternUnits="userSpaceOnUse">
                <path d="M 12 0 L 0 0 0 12" fill="none" stroke="#0f1f38" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width={svgTotalWidth} height="105" fill="url(#diagGrid)" rx="6" />

            {/* Continuous Track Rail (Train only) */}
            {isTrain && (
              <g>
                <line x1="10" y1="84" x2={svgTotalWidth - 10} y2="84" stroke="#475569" strokeWidth="2.5" />
                <line x1="10" y1="88" x2={svgTotalWidth - 10} y2="88" stroke="#334155" strokeWidth="1.5" strokeDasharray="6,3" />
                {/* Overhead Catenary Line wire */}
                <line x1="10" y1="14" x2={svgTotalWidth - 10} y2="14" stroke="#0284c7" strokeWidth="1" strokeDasharray="8,4" opacity="0.6" />
              </g>
            )}

            {/* Render Each Individual Carriage in the Diagram */}
            {carriages.map((car, idx) => {
              const isSelected = car.carIndex === selectedCarIndex;
              const carX = 20 + idx * (carWidth + carGap);
              const carOcc = getOccupancyColor(car.occupancyPercent);
              const isLeadCab = idx === 0;
              const isTailCab = idx === totalCars - 1;

              return (
                <g
                  key={car.carIndex}
                  onClick={() => setSelectedCarIndex(car.carIndex)}
                  className="cursor-pointer transition-all duration-150 group"
                >
                  {/* Articulated Coupler between cars */}
                  {idx > 0 && isTrain && (
                    <g>
                      <rect x={carX - carGap} y="58" width={carGap} height="5" fill="#334155" />
                      <line x1={carX - carGap} y1="60.5" x2={carX} y2="60.5" stroke="#64748b" strokeWidth="1.5" />
                    </g>
                  )}

                  {/* Pantograph (If Active on this Car) */}
                  {car.pantographActive && isTrain && (
                    <g>
                      {/* Base & Diamond Collector Arm */}
                      <path
                        d={`M ${carX + carWidth / 2 - 10} 32 L ${carX + carWidth / 2 - 3} 18 L ${carX + carWidth / 2 + 3} 18 L ${carX + carWidth / 2 + 10} 32`}
                        stroke={isSelected ? "#38bdf8" : "#f59e0b"}
                        strokeWidth="1.8"
                        fill="none"
                      />
                      {/* Overhead Contact Bar */}
                      <line
                        x1={carX + carWidth / 2 - 9}
                        y1="18"
                        x2={carX + carWidth / 2 + 9}
                        y2="18"
                        stroke={isSelected ? "#67e8f9" : "#f59e0b"}
                        strokeWidth="2.5"
                      />
                      {/* Electric Arc Sparkle */}
                      <circle
                        cx={carX + carWidth / 2}
                        cy="18"
                        r="2.5"
                        fill="#38bdf8"
                        className="animate-ping"
                      />
                    </g>
                  )}

                  {/* HVAC Roof Pod */}
                  <rect
                    x={carX + 12}
                    y="27"
                    width={carWidth - 24}
                    height="5"
                    rx="1.5"
                    fill="#1e293b"
                    stroke={isSelected ? "#38bdf8" : "#475569"}
                    strokeWidth="0.8"
                  />

                  {/* Carriage Body Shell */}
                  {isLeadCab && isTrain ? (
                    // Aerodynamic / Angled Front Cab (Tc1)
                    <path
                      d={`M ${carX} 76 Q ${carX + 8} 32 ${carX + 22} 32 L ${carX + carWidth} 32 L ${carX + carWidth} 76 L ${carX} 76 Z`}
                      fill={isSelected ? "#0c2847" : "#0f172a"}
                      stroke={isSelected ? "#38bdf8" : "#334155"}
                      strokeWidth={isSelected ? "2" : "1.2"}
                    />
                  ) : isTailCab && isTrain ? (
                    // Aerodynamic / Angled Rear Cab (Tc2)
                    <path
                      d={`M ${carX} 32 L ${carX + carWidth - 22} 32 Q ${carX + carWidth - 8} 32 ${carX + carWidth} 76 L ${carX} 76 Z`}
                      fill={isSelected ? "#0c2847" : "#0f172a"}
                      stroke={isSelected ? "#38bdf8" : "#334155"}
                      strokeWidth={isSelected ? "2" : "1.2"}
                    />
                  ) : (
                    // Standard Intermediate Passenger Coach (M1, M2, T)
                    <rect
                      x={carX}
                      y="32"
                      width={carWidth}
                      height="44"
                      rx="3"
                      fill={isSelected ? "#0c2847" : "#0f172a"}
                      stroke={isSelected ? "#38bdf8" : "#334155"}
                      strokeWidth={isSelected ? "2" : "1.2"}
                    />
                  )}

                  {/* Cab Windscreen & Lights (If Lead/Tail Cab) */}
                  {isLeadCab && isTrain && (
                    <g>
                      <path
                        d={`M ${carX + 5} 58 Q ${carX + 11} 38 ${carX + 20} 38 L ${carX + 22} 58 Z`}
                        fill="#0284c7"
                        stroke="#38bdf8"
                        strokeWidth="0.8"
                      />
                      {/* Headlights (Warm Yellow) */}
                      <circle cx={carX + 6} cy="70" r="2.2" fill="#fde047" stroke="#ca8a04" strokeWidth="0.5" />
                    </g>
                  )}
                  {isTailCab && isTrain && (
                    <g>
                      <path
                        d={`M ${carX + carWidth - 22} 38 Q ${carX + carWidth - 11} 38 ${carX + carWidth - 5} 58 L ${carX + carWidth - 22} 58 Z`}
                        fill="#0284c7"
                        stroke="#38bdf8"
                        strokeWidth="0.8"
                      />
                      {/* Tail Red Marker Lights */}
                      <circle cx={carX + carWidth - 6} cy="70" r="2.2" fill="#f43f5e" stroke="#be123c" strokeWidth="0.5" />
                    </g>
                  )}

                  {/* Passenger Windows Row */}
                  {Array.from({ length: isLeadCab || isTailCab ? 3 : 4 }).map((_, wIdx) => {
                    const winX = carX + (isLeadCab ? 26 : 8) + wIdx * (carWidth > 80 ? 15 : 12);
                    return (
                      <rect
                        key={wIdx}
                        x={winX}
                        y="40"
                        width={carWidth > 80 ? "10" : "8"}
                        height="9"
                        rx="1.5"
                        fill={isSelected ? "#0284c7" : "#1e293b"}
                        stroke={isSelected ? "#67e8f9" : "#475569"}
                        strokeWidth="0.7"
                      />
                    );
                  })}

                  {/* Passenger Sliding Doors */}
                  <rect
                    x={carX + (isLeadCab ? 42 : isTailCab ? 20 : carWidth / 2 - 5)}
                    y="40"
                    width="10"
                    height="32"
                    fill="#091322"
                    stroke={isSelected ? "#38bdf8" : "#334155"}
                    strokeWidth="0.7"
                  />

                  {/* Micro Occupancy Bar inside Carriage */}
                  <rect
                    x={carX + 6}
                    y="55"
                    width={carWidth - 12}
                    height="3.5"
                    rx="1.5"
                    fill="#1e293b"
                  />
                  <rect
                    x={carX + 6}
                    y="55"
                    width={((carWidth - 12) * car.occupancyPercent) / 100}
                    height="3.5"
                    rx="1.5"
                    fill={carOcc.hex}
                  />

                  {/* Carriage Label (K1..K12 / Z1..Z3) */}
                  <text
                    x={carX + carWidth / 2}
                    y="69"
                    fill={isSelected ? "#ffffff" : "#94a3b8"}
                    fontSize="8.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {isTrain ? `K${car.carIndex}` : isAviation ? `Z${car.carIndex}` : `L${car.carIndex}`}
                  </text>

                  {/* Bogies / Wheels underneath */}
                  {isTrain && (
                    <g>
                      <circle cx={carX + 16} cy="80" r="4.5" fill="#0f172a" stroke="#64748b" strokeWidth="1.2" />
                      <circle cx={carX + 26} cy="80" r="4.5" fill="#0f172a" stroke="#64748b" strokeWidth="1.2" />
                      <circle cx={carX + carWidth - 26} cy="80" r="4.5" fill="#0f172a" stroke="#64748b" strokeWidth="1.2" />
                      <circle cx={carX + carWidth - 16} cy="80" r="4.5" fill="#0f172a" stroke="#64748b" strokeWidth="1.2" />
                    </g>
                  )}

                  {/* Active Selection Glow Ring */}
                  {isSelected && (
                    <rect
                      x={carX - 2}
                      y="24"
                      width={carWidth + 4}
                      height="64"
                      rx="6"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      strokeDasharray="4,2"
                      className="animate-pulse"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* 3. HORIZONTAL QUICK-SELECTION PILLS */}
      <div className="overflow-x-auto pb-1 no-scrollbar">
        <div className="flex items-center gap-1.5 min-w-max py-1">
          {carriages.map((car) => {
            const isSelected = car.carIndex === selectedCarIndex;
            const carOcc = getOccupancyColor(car.occupancyPercent);

            return (
              <button
                key={car.carIndex}
                onClick={() => setSelectedCarIndex(car.carIndex)}
                className={`relative flex flex-col items-center justify-between px-2.5 py-2 rounded-xl border transition-all transform active:scale-95 ${
                  isSelected
                    ? "bg-slate-800 border-cyan-400 shadow-md shadow-cyan-950/60 ring-1 ring-cyan-400"
                    : "bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60"
                }`}
                style={{ minWidth: isTrain && carriages.length > 8 ? "58px" : "72px" }}
              >
                {/* Pantograph / Motor indicator */}
                {car.pantographActive && (
                  <div className="absolute -top-1.5 right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-black animate-pulse" title="Pantograf Aktif" />
                )}

                {/* Car Index Badge */}
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-mono font-bold ${isSelected ? "text-cyan-300" : "text-slate-300"}`}>
                    {isTrain ? `K${car.carIndex}` : isAviation ? `Z${car.carIndex}` : `L${car.carIndex}`}
                  </span>
                </div>

                {/* Occupancy Micro-bar */}
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden my-1.5">
                  <div
                    style={{ width: `${car.occupancyPercent}%` }}
                    className={`h-full rounded-full ${carOcc.bg}`}
                  />
                </div>

                {/* Percentage */}
                <span className={`text-[9px] font-mono font-semibold ${isSelected ? "text-white" : "text-slate-400"}`}>
                  {car.occupancyPercent}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. SELECTED CARRIAGE TELEMETRY CARD */}
      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5 text-xs font-mono">
        {/* Header of Selected Car */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold">
                {isTrain ? `Kereta ${selectedCar.carIndex}` : isAviation ? `Zona ${selectedCar.carIndex}` : `Lantai ${selectedCar.carIndex}`}
              </span>
              <strong className="text-white text-xs">{selectedCar.carCode}</strong>
            </div>
            <span className="text-[11px] text-slate-400 block pt-0.5">
              {selectedCar.carTypeName}
            </span>
          </div>

          <div className={`px-2 py-1 rounded-lg border text-[10px] font-bold ${occStyle.lightBg} ${occStyle.text} ${occStyle.border}`}>
            {selectedCar.occupancyPercent}% Terisi
          </div>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
          {/* Passenger Load */}
          <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 block flex items-center gap-1">
              <Users className="w-3 h-3 text-cyan-400" />
              Kapasitas Penumpang
            </span>
            <strong className="text-white font-bold">
              {selectedCar.passengerCount} / {selectedCar.maxCapacity} org
            </strong>
          </div>

          {/* AC Climate */}
          <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 block flex items-center gap-1">
              <Wind className="w-3 h-3 text-emerald-400" />
              Suhu Kabin Kereta
            </span>
            <strong className="text-emerald-300 font-bold">
              {selectedCar.acTemperatureC.toFixed(1)}&deg;C ({selectedCar.acStatus})
            </strong>
          </div>

          {/* Electrical / Pantograph */}
          <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 block flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              Sistem Traksi / Daya
            </span>
            <strong className={`font-bold ${selectedCar.pantographActive ? "text-amber-300" : "text-slate-300"}`}>
              {selectedCar.pantographActive
                ? "Pantograf 1.5kV ON"
                : selectedCar.tractionMotorActive
                ? "Motor Traksi ON"
                : "Trailer Auxiliary"}
            </strong>
          </div>

          {/* Priority & Accessibility */}
          <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 block flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-cyan-400" />
              Kursi Prioritas
            </span>
            <strong className="text-cyan-300 font-bold">
              {selectedCar.prioritySeatsCount} Kursi {selectedCar.wheelchairAccessible ? "+ Kursi Roda" : ""}
            </strong>
          </div>

          {/* CCTV & Security */}
          <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 block flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              CCTV Pengawasan
            </span>
            <strong className="text-emerald-400 font-bold">
              {selectedCar.cctvActive ? "Kamera Aktif 1080p" : "Standby"}
            </strong>
          </div>

          {/* Doors & Wi-Fi */}
          <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 block flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-400" />
              Pintu Otomatis
            </span>
            <strong className="text-slate-200 font-bold">
              {selectedCar.doorsStatus === "CLOSED_LOCKED"
                ? "Terkunci Aman"
                : selectedCar.doorsStatus === "OPEN"
                ? "Terbuka (Peron)"
                : "Tahan Interlock"}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

