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
    if (percent < 50) return { bg: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500/40", lightBg: "bg-emerald-950/40" };
    if (percent < 75) return { bg: "bg-cyan-500", text: "text-cyan-400", border: "border-cyan-500/40", lightBg: "bg-cyan-950/40" };
    if (percent < 90) return { bg: "bg-amber-500", text: "text-amber-400", border: "border-amber-500/40", lightBg: "bg-amber-950/40" };
    return { bg: "bg-rose-500", text: "text-rose-400", border: "border-rose-500/40", lightBg: "bg-rose-950/40" };
  };

  const occStyle = getOccupancyColor(selectedCar.occupancyPercent);

  return (
    <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 space-y-3 shadow-lg">
      {/* 1. SECTION TITLE */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-white tracking-tight uppercase font-mono">
            {isTrain
              ? `Susunan Rangkaian Kereta (${carriages.length} SF)`
              : isAviation
              ? `Kompartemen Kabin Pesawat (${carriages.length} Zona)`
              : `Tingkat Dek Kendaraan (${carriages.length} Lantai)`}
          </h3>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          Klik kereta untuk rincian
        </span>
      </div>

      {/* 2. INTERACTIVE HORIZONTAL FORMATION STRIP */}
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

      {/* 3. SELECTED CARRIAGE TELEMETRY CARD */}
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
              {selectedCar.acTemperatureC.toFixed(1)}°C ({selectedCar.acStatus})
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
