/**
 * PlatformI - Operator Control Portal: Fleet Management Editor
 *
 * Provides real-time inspection, karoseri/chassis editing, operational status
 * toggling, and new simulated vehicle deployment across all transit modes.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useMemo } from "react";
import {
  Truck,
  Plus,
  Search,
  Filter,
  Train,
  Bus,
  Plane,
  Anchor,
  Edit2,
  Check,
  X,
  Layers,
  Gauge,
  Users,
  Wind,
  Shield,
  Activity,
  Sliders,
  Sparkles,
} from "lucide-react";
import {
  Vehicle,
  VehicleOperationalStatus,
  TransitCategory,
  TransitMode,
  CrowdDensityLevel,
  ACComfortRating,
} from "@/types/transit";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_LINES } from "@/lib/data/jakarta-dataset";

export default function FleetManagementPage() {
  const simulatedVehicles = useTransitStore((state) => state.simulatedVehicles);
  const updateSingleVehicle = useTransitStore((state) => state.updateSingleVehicle);
  const updateSimulatedVehicles = useTransitStore((state) => state.updateSimulatedVehicles);
  const allLines = useTransitStore((state) => state.allLines);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<TransitCategory | "ALL">("ALL");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // New vehicle form state
  const [newLineId, setNewLineId] = useState<string>(allLines[0]?.id || "line-mrt-ns");
  const [newVehicleCode, setNewVehicleCode] = useState<string>("");
  const [newName, setNewName] = useState<string>("");
  const [newCoachbuilder, setNewCoachbuilder] = useState<string>("Laksana Karoseri");
  const [newChassis, setNewChassis] = useState<string>("Scania K250UB 4x2");
  const [newSpeed, setNewSpeed] = useState<number>(45);

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return simulatedVehicles.filter((v) => {
      if (activeCategory !== "ALL" && v.category !== activeCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = v.vehicleCode.toLowerCase().includes(q);
        const matchesName = v.name.toLowerCase().includes(q);
        const matchesKaroseri = v.coachbuilder.toLowerCase().includes(q);
        const matchesChassis = v.chassis.toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesKaroseri && !matchesChassis) return false;
      }
      return true;
    });
  }, [simulatedVehicles, activeCategory, searchQuery]);

  const handleUpdateStatus = (vehicle: Vehicle, newStatus: VehicleOperationalStatus) => {
    const updated: Vehicle = {
      ...vehicle,
      status: newStatus,
      speedKmh: newStatus === "IN_SERVICE" ? (vehicle.speedKmh === 0 ? 40 : vehicle.speedKmh) : 0,
    };
    updateSingleVehicle(updated);
    if (selectedVehicle?.id === vehicle.id) {
      setSelectedVehicle(updated);
    }
  };

  const handleUpdateCrowd = (vehicle: Vehicle, newCrowd: CrowdDensityLevel) => {
    const updated: Vehicle = {
      ...vehicle,
      crowdLevel: newCrowd,
    };
    updateSingleVehicle(updated);
    if (selectedVehicle?.id === vehicle.id) {
      setSelectedVehicle(updated);
    }
  };

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicleCode.trim() || !newName.trim()) return;

    const assignedLine = allLines.find((l) => l.id === newLineId) || allLines[0];
    const newId = `veh-custom-${Date.now().toString(36)}`;

    const firstCoord = assignedLine.polylineCoordinates[0] || { latitude: -6.2088, longitude: 106.8456 };

    const newUnit: Vehicle = {
      id: newId,
      lineId: assignedLine.id,
      vehicleCode: newVehicleCode.toUpperCase(),
      name: newName,
      category: assignedLine.category,
      mode: assignedLine.mode,
      currentLatitude: firstCoord.latitude,
      currentLongitude: firstCoord.longitude,
      headingDegrees: 0,
      speedKmh: newSpeed,
      status: "IN_SERVICE",
      crowdLevel: "LEVEL_2_FEW_SEATS",
      acComfort: "OPTIMAL",
      coachbuilder: newCoachbuilder,
      chassis: newChassis,
      progressFraction: 0,
      currentSegmentIndex: 0,
      nextStopId: assignedLine.stops?.[0]?.id || "stop-0",
      nextStopEtaSeconds: 180,
    };

    updateSimulatedVehicles([...simulatedVehicles, newUnit]);
    setIsAddModalOpen(false);
    setNewVehicleCode("");
    setNewName("");
  };

  const getCategoryIcon = (category: TransitCategory) => {
    switch (category) {
      case "RAIL":
        return <Train className="w-3.5 h-3.5 text-rose-400" />;
      case "BUS":
        return <Bus className="w-3.5 h-3.5 text-cyan-400" />;
      case "AVIATION":
        return <Plane className="w-3.5 h-3.5 text-teal-400" />;
      case "MARITIME":
        return <Anchor className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 text-xs font-mono font-semibold">
              FLEET INVENTORY & ROLLING STOCK
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {simulatedVehicles.length} Registered Units
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1.5">
            Fleet Operations & Specifications Editor
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time management of train sets, coachbuilt BRT buses, executive shuttles, aircraft, and speedboats.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-950/50 flex items-center gap-1.5 transition self-start sm:self-auto transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Deploy Simulated Vehicle</span>
        </button>
      </div>

      {/* 2. FILTER STRIP */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code, karoseri, chassis..."
            className="w-full bg-slate-950 border border-white/15 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 transition"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto">
          <button
            onClick={() => setActiveCategory("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition shrink-0 ${
              activeCategory === "ALL"
                ? "bg-cyan-950/80 border-cyan-500/50 text-cyan-300 shadow-md"
                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            All Modes ({simulatedVehicles.length})
          </button>
          {(["RAIL", "BUS", "AVIATION", "MARITIME"] as TransitCategory[]).map((cat) => {
            const count = simulatedVehicles.filter((v) => v.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition shrink-0 ${
                  activeCategory === cat
                    ? "bg-cyan-950/80 border-cyan-500/50 text-cyan-300 shadow-md"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {getCategoryIcon(cat)}
                <span>{cat.charAt(0) + cat.slice(1).toLowerCase()} ({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. FLEET TABLE */}
      <div className="rounded-2xl bg-slate-900/80 border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                <th className="py-3.5 px-4">Vehicle Code / Name</th>
                <th className="py-3.5 px-4">Assigned Line</th>
                <th className="py-3.5 px-4">Coachbuilder & Chassis</th>
                <th className="py-3.5 px-4">Speed / Telemetry</th>
                <th className="py-3.5 px-4">Operational Status</th>
                <th className="py-3.5 px-4">Crowd Density</th>
                <th className="py-3.5 px-4 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {filteredVehicles.map((vehicle) => {
                const line = allLines.find((l) => l.id === vehicle.lineId);

                return (
                  <tr
                    key={vehicle.id}
                    className="hover:bg-white/[0.03] transition cursor-pointer"
                    onClick={() => setSelectedVehicle(vehicle)}
                  >
                    {/* Code & Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-slate-950 border border-white/10 shrink-0">
                          {getCategoryIcon(vehicle.category)}
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs sm:text-sm font-mono">
                            {vehicle.vehicleCode}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                            {vehicle.name}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Line Badge */}
                    <td className="py-3.5 px-4">
                      {line ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            style={{
                              backgroundColor: `${line.colorHex}20`,
                              borderColor: `${line.colorHex}50`,
                              color: line.colorHex,
                            }}
                            className="px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold shrink-0"
                          >
                            {line.code}
                          </span>
                          <span className="text-[11px] text-slate-300 truncate max-w-[120px]">
                            {line.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono">Unassigned</span>
                      )}
                    </td>

                    {/* Karoseri & Chassis */}
                    <td className="py-3.5 px-4">
                      <div className="text-[11px] font-semibold text-slate-200 truncate max-w-[200px]">
                        {vehicle.coachbuilder}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                        {vehicle.chassis}
                      </div>
                    </td>

                    {/* Speed */}
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div className="flex items-center gap-1 text-slate-200">
                        <Gauge className="w-3 h-3 text-cyan-400" />
                        <span>{Math.round(vehicle.speedKmh)} km/h</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        ETA: {vehicle.nextStopEtaSeconds}s
                      </div>
                    </td>

                    {/* Status Dropdown / Badge */}
                    <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={vehicle.status}
                        onChange={(e) =>
                          handleUpdateStatus(
                            vehicle,
                            e.target.value as VehicleOperationalStatus
                          )
                        }
                        className={`text-[10px] font-mono font-semibold px-2 py-1 rounded-lg border focus:outline-none transition cursor-pointer ${
                          vehicle.status === "IN_SERVICE"
                            ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
                            : vehicle.status === "BOARDING"
                            ? "bg-amber-950/80 border-amber-500/40 text-amber-300"
                            : vehicle.status === "CONGESTION_HOLD"
                            ? "bg-rose-950/80 border-rose-500/40 text-rose-300"
                            : "bg-slate-900 border-slate-700 text-slate-400"
                        }`}
                      >
                        <option value="IN_SERVICE">IN_SERVICE</option>
                        <option value="BOARDING">BOARDING</option>
                        <option value="CONGESTION_HOLD">CONGESTION_HOLD</option>
                        <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
                      </select>
                    </td>

                    {/* Crowd Level */}
                    <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={vehicle.crowdLevel}
                        onChange={(e) =>
                          handleUpdateCrowd(
                            vehicle,
                            e.target.value as CrowdDensityLevel
                          )
                        }
                        className="text-[10px] font-mono px-2 py-1 rounded-lg bg-slate-950 border border-white/10 text-slate-300 focus:outline-none cursor-pointer"
                      >
                        <option value="LEVEL_1_MANY_SEATS">L1: Many Seats</option>
                        <option value="LEVEL_2_FEW_SEATS">L2: Few Seats</option>
                        <option value="LEVEL_3_STANDING_ONLY">L3: Standing Only</option>
                        <option value="LEVEL_4_FULL_CRUSH">L4: Full Crush</option>
                      </select>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVehicle(vehicle);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-950 border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 text-[11px] font-medium transition"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. DETAIL INSPECTOR DRAWER / MODAL */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0c1220] border border-white/15 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 bg-slate-900/90 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-500/40">
                  {getCategoryIcon(selectedVehicle.category)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">
                    {selectedVehicle.vehicleCode} &bull; {selectedVehicle.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {selectedVehicle.mode} &bull; Unit Telemetry
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedVehicle(null)}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-white/5 space-y-2">
                <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                  Enthusiast Coachbuilder Specifications
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Karoseri (Bodybuilder):</span>
                    <strong className="text-white text-xs">{selectedVehicle.coachbuilder}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Chassis Platform:</span>
                    <strong className="text-white text-xs">{selectedVehicle.chassis}</strong>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-mono">Telemetry Speed</span>
                  <div className="text-lg font-bold text-cyan-300 font-mono">
                    {Math.round(selectedVehicle.speedKmh)} km/h
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-mono">Heading Azimuth</span>
                  <div className="text-lg font-bold text-slate-200 font-mono">
                    {Math.round(selectedVehicle.headingDegrees)}&deg;
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-300">Change Operational State</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["IN_SERVICE", "BOARDING", "CONGESTION_HOLD", "OUT_OF_SERVICE"] as VehicleOperationalStatus[]).map(
                    (st) => (
                      <button
                        key={st}
                        onClick={() => handleUpdateStatus(selectedVehicle, st)}
                        className={`p-2.5 rounded-xl border text-xs font-mono transition ${
                          selectedVehicle.status === st
                            ? "bg-cyan-950 border-cyan-500/60 text-cyan-300 font-bold shadow-md"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setSelectedVehicle(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs text-slate-200 font-semibold transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. ADD SIMULATED VEHICLE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0c1220] border border-white/15 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 bg-slate-900/90 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/40">
                  <Truck className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Deploy Simulated Vehicle</h3>
                  <p className="text-xs text-slate-400">Add active rolling stock or bus unit to simulation</p>
                </div>
              </div>

              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleAddVehicle} className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
              {/* Assigned Line */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Assign to Transit Line</label>
                <select
                  value={newLineId}
                  onChange={(e) => setNewLineId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/80"
                >
                  {allLines.map((l) => (
                    <option key={l.id} value={l.id}>
                      [{l.code}] {l.name} ({l.mode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Code & Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Vehicle Code</label>
                  <input
                    type="text"
                    value={newVehicleCode}
                    onChange={(e) => setNewVehicleCode(e.target.value)}
                    placeholder="e.g. TJ-999 / MRT-09"
                    required
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono uppercase focus:outline-none focus:border-cyan-500/80"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Display Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. TransJakarta Cityline 3"
                    required
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/80"
                  />
                </div>
              </div>

              {/* Coachbuilder & Chassis */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Karoseri (Coachbuilder)</label>
                  <select
                    value={newCoachbuilder}
                    onChange={(e) => setNewCoachbuilder(e.target.value)}
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/80"
                  >
                    <option value="Laksana Karoseri">Laksana Cityline 3</option>
                    <option value="Adiputro Karoseri">Adiputro Jetbus 5 SDD</option>
                    <option value="Tentrem Karoseri">Tentrem Velocity W5</option>
                    <option value="Nippon Sharyo / J-TREC">Nippon Sharyo 1067mm</option>
                    <option value="CRRC Qingdao Sifang">CRRC KCIC400AF High-Speed</option>
                    <option value="PT INKA / Hyundai Rotem">PT INKA / Hyundai Rotem</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Chassis Platform</label>
                  <select
                    value={newChassis}
                    onChange={(e) => setNewChassis(e.target.value)}
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/80"
                  >
                    <option value="Scania K250UB 4x2 Low-Entry">Scania K250UB 4x2</option>
                    <option value="Mercedes-Benz OH 1626 Air Suspension">Mercedes-Benz OH 1626</option>
                    <option value="Mercedes-Benz OC 500 RF 2542 6x2">Mercedes-Benz OC 500 RF</option>
                    <option value="BYD B12 Pure Electric">BYD B12 Pure Electric</option>
                    <option value="1500V DC EMU 6-Car Formation">1500V DC EMU 6-Car</option>
                    <option value="25kV AC 8-Car High-Speed Trainset">25kV AC 8-Car Trainset</option>
                  </select>
                </div>
              </div>

              {/* Initial Speed */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Initial Speed: <span className="font-mono text-cyan-400">{newSpeed} km/h</span>
                </label>
                <input
                  type="range"
                  min="20"
                  max="120"
                  step="5"
                  value={newSpeed}
                  onChange={(e) => setNewSpeed(parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs font-bold text-white shadow-lg shadow-cyan-950/50 transition"
                >
                  Deploy to Live Simulation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
