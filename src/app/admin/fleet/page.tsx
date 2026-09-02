/**
 * PlatformI - Operator Control Portal: Fleet Management Editor
 *
 * Provides real-time inspection, karoseri/chassis editing, operational status
 * toggling, and new simulated vehicle deployment across all transit modes.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useMemo, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Truck,
  Plus,
  Search,
  Train,
  Bus,
  Plane,
  Anchor,
  X,
  Gauge,
} from "lucide-react";
import {
  Vehicle,
  VehicleOperationalStatus,
  TransitCategory,
  CrowdDensityLevel,
} from "@/types/transit";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useTranslation } from "@/lib/i18n";
import { useDialogFocusTrap } from "@/lib/hooks/useDialogFocusTrap";

export default function FleetManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <FleetManagementContent />
    </Suspense>
  );
}

function FleetManagementContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const simulatedVehicles = useTransitStore((state) => state.simulatedVehicles);
  const updateSingleVehicle = useTransitStore((state) => state.updateSingleVehicle);
  const updateSimulatedVehicles = useTransitStore((state) => state.updateSimulatedVehicles);
  const allLines = useTransitStore((state) => state.allLines);

  // Filter state is URL-synced: refresh and shared links restore the view
  const [searchQuery, setSearchQuery] = useState<string>(() => searchParams.get("q") ?? "");
  const [activeCategory, setActiveCategory] = useState<TransitCategory | "ALL">(
    () => (searchParams.get("category") as TransitCategory | null) ?? "ALL"
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (activeCategory !== "ALL") params.set("category", activeCategory);
    const qs = params.toString();
    router.replace(qs ? `/admin/fleet?${qs}` : "/admin/fleet", { scroll: false });
  }, [searchQuery, activeCategory, router]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  const closeTelemetryModal = () => setSelectedVehicle(null);
  const closeAddModal = () => setIsAddModalOpen(false);

  const { containerRef: telemetryModalRef, handleTrapKeyDown: handleTelemetryTrapKey } =
    useDialogFocusTrap<HTMLDivElement>({
      isOpen: selectedVehicle !== null,
      onClose: closeTelemetryModal,
    });

  const { containerRef: addModalRef, handleTrapKeyDown: handleAddTrapKey } =
    useDialogFocusTrap<HTMLDivElement>({
      isOpen: isAddModalOpen,
      onClose: closeAddModal,
    });

  const openTelemetryModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
  };

  const openAddModal = () => {
    setIsAddModalOpen(true);
  };

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
              {t.admin.occCommandBadge}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {simulatedVehicles.length} {t.admin.activeVehicles}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1.5">
            {t.admin.fleetControl}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            {t.admin.fleetSubtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-cyan-950 text-xs font-bold shadow-lg flex items-center gap-1.5 transition self-start sm:self-auto btn-tactile"
        >
          <Plus className="w-4 h-4" />
          <span>{t.admin.addVehicle}</span>
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
            aria-label={t.admin.searchFleetPlaceholder}
            placeholder={t.admin.searchFleetPlaceholder}
            className="w-full bg-slate-950 border border-white/15 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 transition"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto">
          <button
            type="button"
            aria-pressed={activeCategory === "ALL"}
            onClick={() => setActiveCategory("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition shrink-0 ${
              activeCategory === "ALL"
                ? "bg-cyan-950/80 border-cyan-500/50 text-cyan-300 shadow-md"
                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.navigation.allModes} ({simulatedVehicles.length})
          </button>
          {(["RAIL", "BUS", "AVIATION", "MARITIME"] as TransitCategory[]).map((cat) => {
            const count = simulatedVehicles.filter((v) => v.category === cat).length;
            const catLabel =
              cat === "RAIL"
                ? t.navigation.railModes
                : cat === "BUS"
                ? t.navigation.busModes
                : cat === "AVIATION"
                ? t.navigation.airModes
                : t.navigation.seaModes;

            return (
              <button
                key={cat}
                type="button"
                aria-pressed={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition shrink-0 ${
                  activeCategory === cat
                    ? "bg-cyan-950/80 border-cyan-500/50 text-cyan-300 shadow-md"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {getCategoryIcon(cat)}
                <span>{catLabel} ({count})</span>
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
                <th scope="col" className="py-3.5 px-4">{t.admin.vehicleCode}</th>
                <th scope="col" className="py-3.5 px-4">{t.admin.fleetAssignedLine}</th>
                <th scope="col" className="py-3.5 px-4">{t.admin.modelAndCoach}</th>
                <th scope="col" className="py-3.5 px-4">{t.admin.currentSpeedAndHeading}</th>
                <th scope="col" className="py-3.5 px-4">{t.admin.currentStatus}</th>
                <th scope="col" className="py-3.5 px-4">{t.admin.capacityAndDensity}</th>
                <th scope="col" className="py-3.5 px-4 text-right">{t.admin.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {filteredVehicles.map((vehicle) => {
                const line = allLines.find((l) => l.id === vehicle.lineId);

                return (
                  <tr
                    key={vehicle.id}
                    className="hover:bg-white/[0.03] transition"
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
                        <span className="text-slate-500 font-mono">-</span>
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

                    {/* Speed & Heading */}
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-200">
                        <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="font-bold">{Math.round(vehicle.speedKmh)} km/h</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {Math.round(vehicle.headingDegrees)}&deg; heading
                      </div>
                    </td>

                    {/* Operational Status (Quick Toggle) */}
                    <td className="py-3.5 px-4">
                      <label htmlFor={`status-select-${vehicle.id}`} className="sr-only">
                        {t.admin.currentStatus} — {vehicle.vehicleCode}
                      </label>
                      <select
                        id={`status-select-${vehicle.id}`}
                        value={vehicle.status}
                        aria-label={`Operating status for ${vehicle.vehicleCode}`}
                        onChange={(e) =>
                          handleUpdateStatus(vehicle, e.target.value as VehicleOperationalStatus)
                        }
                        className={`text-[10px] font-mono font-semibold px-2 py-1.5 rounded-lg border focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 transition cursor-pointer min-h-[36px] ${
                          vehicle.status === "IN_SERVICE"
                            ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
                            : vehicle.status === "BOARDING"
                            ? "bg-cyan-950/80 border-cyan-500/40 text-cyan-300"
                            : vehicle.status === "CONGESTION_HOLD"
                            ? "bg-amber-950/80 border-amber-500/40 text-amber-300"
                            : "bg-slate-900 border-slate-700 text-slate-400"
                        }`}
                      >
                        <option value="IN_SERVICE">{t.admin.moving}</option>
                        <option value="BOARDING">{t.admin.boarding}</option>
                        <option value="CONGESTION_HOLD">{t.admin.hold}</option>
                        <option value="OUT_OF_SERVICE">{t.common.inactive}</option>
                      </select>
                    </td>

                    {/* Capacity & Crowd Density */}
                    <td className="py-3.5 px-4">
                      <label htmlFor={`crowd-select-${vehicle.id}`} className="sr-only">
                        {t.admin.capacityAndDensity} — {vehicle.vehicleCode}
                      </label>
                      <select
                        id={`crowd-select-${vehicle.id}`}
                        value={vehicle.crowdLevel}
                        aria-label={`Crowd density for ${vehicle.vehicleCode}`}
                        onChange={(e) =>
                          handleUpdateCrowd(vehicle, e.target.value as CrowdDensityLevel)
                        }
                        className={`text-[10px] font-mono font-semibold px-2 py-1.5 rounded-lg border focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 transition cursor-pointer min-h-[36px] ${
                          vehicle.crowdLevel === "LEVEL_1_MANY_SEATS"
                            ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
                            : vehicle.crowdLevel === "LEVEL_2_FEW_SEATS"
                            ? "bg-amber-950/80 border-amber-500/40 text-amber-300"
                            : vehicle.crowdLevel === "LEVEL_3_STANDING_ONLY"
                            ? "bg-orange-950/80 border-orange-500/40 text-orange-300"
                            : "bg-rose-950/80 border-rose-500/40 text-rose-300"
                        }`}
                      >
                        <option value="LEVEL_1_MANY_SEATS">{t.crowdsource.densitySeatsAvailable}</option>
                        <option value="LEVEL_2_FEW_SEATS">{t.crowdsource.densityFewSeats}</option>
                        <option value="LEVEL_3_STANDING_ONLY">{t.crowdsource.densityStandingOnly}</option>
                        <option value="LEVEL_4_FULL_CRUSH">{t.crowdsource.densityFullCrowded}</option>
                      </select>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        aria-label={`${t.admin.viewTelemetryFor} ${vehicle.vehicleCode}`}
                        onClick={() => openTelemetryModal(vehicle)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/30 hover:border-cyan-500/60 text-cyan-300 hover:text-cyan-100 text-[11px] font-medium transition btn-tactile min-h-[36px]"
                      >
                        {t.admin.viewTelemetry}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredVehicles.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-slate-400">
                    {t.admin.fleetNoMatch}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. DETAIL INSPECTOR DRAWER / MODAL */}
      {selectedVehicle && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="telemetry-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeTelemetryModal();
          }}
          onKeyDown={handleTelemetryTrapKey}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            ref={telemetryModalRef}
            tabIndex={-1}
            className="glass-panel bg-slate-900/95 border border-white/10 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200 outline-none"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 bg-slate-900/90 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-500/40">
                  {getCategoryIcon(selectedVehicle.category)}
                </div>
                <div>
                  <h3 id="telemetry-dialog-title" className="text-base font-bold text-white font-mono">
                    {selectedVehicle.vehicleCode} &bull; {selectedVehicle.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {selectedVehicle.mode} &bull; {t.admin.liveTelemetryBadge}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeTelemetryModal}
                aria-label={t.admin.closeTelemetryDialog}
                className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-white/5 space-y-2">
                <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                  {t.vehicleInspector.telemetryTitle}
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[10px]">{t.vehicleInspector.coachbuilder}:</span>
                    <strong className="text-white text-xs">{selectedVehicle.coachbuilder}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">{t.vehicleInspector.chassis}:</span>
                    <strong className="text-white text-xs">{selectedVehicle.chassis}</strong>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-mono">{t.vehicleInspector.speed}</span>
                  <div className="text-lg font-bold text-cyan-300 font-mono">
                    {Math.round(selectedVehicle.speedKmh)} km/h
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-mono">{t.vehicleInspector.bearing}</span>
                  <div className="text-lg font-bold text-slate-200 font-mono">
                    {Math.round(selectedVehicle.headingDegrees)}&deg;
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-300">{t.admin.currentStatus}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["IN_SERVICE", "BOARDING", "CONGESTION_HOLD", "OUT_OF_SERVICE"] as VehicleOperationalStatus[]).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        aria-pressed={selectedVehicle.status === st}
                        onClick={() => handleUpdateStatus(selectedVehicle, st)}
                        className={`p-3 rounded-xl border text-xs font-mono transition min-h-[44px] ${
                          selectedVehicle.status === st
                            ? "bg-cyan-950 border-cyan-500/60 text-cyan-300 font-bold shadow-md"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {st === "IN_SERVICE"
                          ? t.admin.moving
                          : st === "BOARDING"
                          ? t.admin.boarding
                          : st === "CONGESTION_HOLD"
                          ? t.admin.hold
                          : t.common.inactive}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={closeTelemetryModal}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs text-slate-200 font-semibold transition btn-tactile min-h-[36px]"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. ADD SIMULATED VEHICLE MODAL */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-vehicle-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAddModal();
          }}
          onKeyDown={handleAddTrapKey}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            ref={addModalRef}
            tabIndex={-1}
            className="glass-panel bg-slate-900/95 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200 outline-none"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 bg-slate-900/90 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/40">
                  <Truck className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 id="add-vehicle-dialog-title" className="text-base font-bold text-white">{t.admin.addVehicle}</h3>
                  <p className="text-xs text-slate-400">{t.admin.fleetSubtitle}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeAddModal}
                aria-label={t.admin.closeAddVehicleDialog}
                className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleAddVehicle} className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
              {/* Assigned Line */}
              <div className="space-y-1.5">
                <label htmlFor="add-vehicle-line" className="text-xs font-semibold text-slate-300">{t.admin.fleetAssignedLine}</label>
                <select
                  id="add-vehicle-line"
                  value={newLineId}
                  onChange={(e) => setNewLineId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/80 min-h-[44px]"
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
                  <label htmlFor="add-vehicle-code" className="text-xs font-semibold text-slate-300">{t.admin.vehicleCode}</label>
                  <input
                    id="add-vehicle-code"
                    type="text"
                    value={newVehicleCode}
                    onChange={(e) => setNewVehicleCode(e.target.value)}
                    placeholder="e.g. TJ-999 / MRT-09"
                    required
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-mono uppercase focus:outline-none focus:border-cyan-500/80 min-h-[44px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="add-vehicle-name" className="text-xs font-semibold text-slate-300">{t.admin.vehicleName}</label>
                  <input
                    id="add-vehicle-name"
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. TransJakarta Cityline 3"
                    required
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/80 min-h-[44px]"
                  />
                </div>
              </div>

              {/* Coachbuilder & Chassis */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="add-vehicle-coachbuilder" className="text-xs font-semibold text-slate-300">{t.vehicleInspector.coachbuilder}</label>
                  <select
                    id="add-vehicle-coachbuilder"
                    value={newCoachbuilder}
                    onChange={(e) => setNewCoachbuilder(e.target.value)}
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/80 min-h-[44px]"
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
                  <label htmlFor="add-vehicle-chassis" className="text-xs font-semibold text-slate-300">{t.vehicleInspector.chassis}</label>
                  <select
                    id="add-vehicle-chassis"
                    value={newChassis}
                    onChange={(e) => setNewChassis(e.target.value)}
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/80 min-h-[44px]"
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
                <label htmlFor="add-vehicle-speed" className="text-xs font-semibold text-slate-300">
                  {t.vehicleInspector.speed}: <span className="font-mono text-cyan-400">{newSpeed} km/h</span>
                </label>
                <input
                  id="add-vehicle-speed"
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
                  className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white transition btn-tactile min-h-[40px]"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-xs font-bold text-cyan-950 shadow-md transition btn-tactile min-h-[40px]"
                >
                  {t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
