/**
 * PlatformI - Operator Control Portal: Fleet Management Editor
 *
 * Provides real-time inspection, karoseri/chassis editing, operational status
 * toggling, and new simulated vehicle deployment across all transit modes.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useMemo, Suspense, useEffect, useRef } from "react";
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
  RotateCcw,
  Trash2,
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
import { recordShiftAction } from "@/lib/services/shiftLogService";

interface PendingFleetUndo {
  vehicleId: string;
  vehicleCode: string;
  field: "status" | "crowdLevel" | "add";
  previous?: VehicleOperationalStatus | CrowdDensityLevel;
  previousSpeedKmh?: number;
  label: string;
  expiry: number;
}

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
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (activeCategory !== "ALL") params.set("category", activeCategory);
      const qs = params.toString();
      // Equality guard: skip the RSC navigation when the URL already matches
      if (window.location.search.replace(/^\?/, "") === qs) return;
      router.replace(qs ? `/admin/fleet?${qs}` : "/admin/fleet", { scroll: false });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeCategory, router]);

  // Back/forward restores the filtered view: follow the URL when it changes
  // underneath us (popstate), skipping values identical to current state so
  // the debounced write never bounces back into the fields
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    const category = (searchParams.get("category") as TransitCategory | null) ?? "ALL";
    if (q !== searchQuery) setSearchQuery(q);
    if (category !== activeCategory) setActiveCategory(category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Operational status & crowd density grace undo: field-scoped Map registry with 5s pausable window
  const [pendingUndos, setPendingUndos] = useState<Map<string, PendingFleetUndo>>(() => new Map());
  const pendingUndosRef = useRef(pendingUndos);
  pendingUndosRef.current = pendingUndos;
  const [undoPaused, setUndoPaused] = useState<boolean>(false);
  const undoPausedRef = useRef(false);
  undoPausedRef.current = undoPaused;
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const undoButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (pendingUndos.size === 0) return;

    const interval = setInterval(() => {
      if (undoPausedRef.current) {
        setPendingUndos((prev) => {
          const next = new Map(prev);
          for (const [id, item] of next) {
            next.set(id, { ...item, expiry: item.expiry + 1000 });
          }
          return next;
        });
        setNowTick(Date.now());
        return;
      }
      const now = Date.now();
      setNowTick(now);

      const currentMap = pendingUndosRef.current;
      const expiredIds: string[] = [];
      for (const [id, item] of currentMap) {
        if (item.expiry <= now) {
          expiredIds.push(id);
        }
      }

      if (expiredIds.length > 0) {
        // Natural expiry fallback: restore focus if undo button had focus
        expiredIds.forEach((id) => {
          const btn = undoButtonRefs.current.get(id);
          const hadFocus =
            typeof document !== "undefined" &&
            btn &&
            (document.activeElement === btn || btn.contains(document.activeElement));
          if (hadFocus) {
            lastTriggerRef.current?.focus();
          }
          undoButtonRefs.current.delete(id);
        });

        setPendingUndos((prev) => {
          const next = new Map(prev);
          expiredIds.forEach((id) => next.delete(id));
          return next;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingUndos.size]);

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

  const getStatusLabel = (status: VehicleOperationalStatus): string => {
    switch (status) {
      case "IN_SERVICE":
        return t.admin.moving;
      case "BOARDING":
        return t.admin.boarding;
      case "CONGESTION_HOLD":
        return t.admin.hold;
      case "OUT_OF_SERVICE":
        return t.common.inactive;
      default:
        return status;
    }
  };

  const getCrowdLabel = (crowd: CrowdDensityLevel): string => {
    switch (crowd) {
      case "LEVEL_1_MANY_SEATS":
        return t.crowdsource.densitySeatsAvailable;
      case "LEVEL_2_FEW_SEATS":
        return t.crowdsource.densityFewSeats;
      case "LEVEL_3_STANDING_ONLY":
        return t.crowdsource.densityStandingOnly;
      case "LEVEL_4_FULL_CRUSH":
        return t.crowdsource.densityFullCrowded;
      default:
        return crowd;
    }
  };

  const handleUpdateStatus = (
    vehicle: Vehicle,
    newStatus: VehicleOperationalStatus,
    triggerEl?: HTMLElement | null
  ) => {
    if (vehicle.status === newStatus) return;
    const previousStatus = vehicle.status;
    const previousSpeedKmh = vehicle.speedKmh;
    const updated: Vehicle = {
      ...vehicle,
      status: newStatus,
      speedKmh: newStatus === "IN_SERVICE" ? (vehicle.speedKmh === 0 ? 40 : vehicle.speedKmh) : 0,
    };
    updateSingleVehicle(updated);
    if (selectedVehicle?.id === vehicle.id) {
      setSelectedVehicle(updated);
    }
    if (triggerEl) {
      lastTriggerRef.current = triggerEl;
    }
    recordShiftAction({
      actionType: "FLEET_STATUS",
      summary: `${vehicle.vehicleCode}: status changed from ${getStatusLabel(previousStatus)} to ${getStatusLabel(newStatus)}`,
      badge: vehicle.vehicleCode,
      params: {
        code: vehicle.vehicleCode,
        from: getStatusLabel(previousStatus),
        to: getStatusLabel(newStatus),
      },
    });
    setPendingUndos((prev) => {
      const next = new Map(prev);
      next.set(vehicle.id, {
        vehicleId: vehicle.id,
        vehicleCode: vehicle.vehicleCode,
        field: "status",
        previous: previousStatus,
        previousSpeedKmh,
        label: `${vehicle.vehicleCode} • ${t.admin.currentStatus}: ${getStatusLabel(previousStatus)} → ${getStatusLabel(newStatus)}`,
        expiry: Date.now() + 5000,
      });
      return next;
    });
    requestAnimationFrame(() => undoButtonRefs.current.get(vehicle.id)?.focus());
  };

  const handleUpdateCrowd = (
    vehicle: Vehicle,
    newCrowd: CrowdDensityLevel,
    triggerEl?: HTMLElement | null
  ) => {
    const previousCrowd = vehicle.crowdLevel;
    if (previousCrowd === newCrowd) return;
    const updated: Vehicle = {
      ...vehicle,
      crowdLevel: newCrowd,
    };
    updateSingleVehicle(updated);
    if (selectedVehicle?.id === vehicle.id) {
      setSelectedVehicle(updated);
    }
    if (triggerEl) {
      lastTriggerRef.current = triggerEl;
    }
    recordShiftAction({
      actionType: "FLEET_CROWD",
      summary: `${vehicle.vehicleCode}: crowd density updated to ${getCrowdLabel(newCrowd)}`,
      badge: vehicle.vehicleCode,
      params: {
        code: vehicle.vehicleCode,
        from: getCrowdLabel(previousCrowd),
        to: getCrowdLabel(newCrowd),
      },
    });
    setPendingUndos((prev) => {
      const next = new Map(prev);
      next.set(vehicle.id, {
        vehicleId: vehicle.id,
        vehicleCode: vehicle.vehicleCode,
        field: "crowdLevel",
        previous: previousCrowd,
        label: `${vehicle.vehicleCode} • ${t.admin.capacityAndDensity}: ${getCrowdLabel(previousCrowd)} → ${getCrowdLabel(newCrowd)}`,
        expiry: Date.now() + 5000,
      });
      return next;
    });
    requestAnimationFrame(() => undoButtonRefs.current.get(vehicle.id)?.focus());
  };

  const handleUndo = (vehicleId: string) => {
    const pending = pendingUndos.get(vehicleId);
    if (!pending) return;

    if (pending.field === "add") {
      updateSimulatedVehicles(simulatedVehicles.filter((v) => v.id !== vehicleId));
      if (selectedVehicle?.id === vehicleId) {
        setSelectedVehicle(null);
      }
    } else {
      // Field-scoped restore: preserves live simulation coordinates, heading, and telemetry
      const current = simulatedVehicles.find((v) => v.id === vehicleId);
      if (current) {
        if (pending.field === "status") {
          const prevStatus = pending.previous as VehicleOperationalStatus;
          const restored: Vehicle = {
            ...current,
            status: prevStatus,
            speedKmh: pending.previousSpeedKmh !== undefined ? pending.previousSpeedKmh : current.speedKmh,
          };
          updateSingleVehicle(restored);
          if (selectedVehicle?.id === vehicleId) {
            setSelectedVehicle(restored);
          }
        } else if (pending.field === "crowdLevel") {
          const prevCrowd = pending.previous as CrowdDensityLevel;
          const restored: Vehicle = {
            ...current,
            crowdLevel: prevCrowd,
          };
          updateSingleVehicle(restored);
          if (selectedVehicle?.id === vehicleId) {
            setSelectedVehicle(restored);
          }
        }
      }
    }

    recordShiftAction({
      actionType: "FLEET_UNDO",
      summary: `Undid ${pending.field} on ${pending.vehicleCode} (restored to ${String(pending.previous ?? "removed")})`,
      badge: pending.vehicleCode,
      params: {
        code: pending.vehicleCode,
        field: pending.field,
        restored: String(pending.previous ?? "removed"),
      },
    });

    setPendingUndos((prev) => {
      const next = new Map(prev);
      next.delete(vehicleId);
      return next;
    });
    undoButtonRefs.current.delete(vehicleId);

    requestAnimationFrame(() => {
      lastTriggerRef.current?.focus();
    });
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

    recordShiftAction({
      actionType: "FLEET_ADD",
      summary: `Added new vehicle: ${newUnit.vehicleCode} (${assignedLine.code})`,
      badge: newUnit.vehicleCode,
      params: {
        code: newUnit.vehicleCode,
        line: assignedLine.code,
      },
    });

    const undoLabel = `${t.admin.addVehicle}: ${newUnit.vehicleCode}`;
    setPendingUndos((prev) => {
      const next = new Map(prev);
      next.set(newId, {
        vehicleId: newId,
        vehicleCode: newUnit.vehicleCode,
        field: "add",
        label: undoLabel,
        expiry: Date.now() + 5000,
      });
      return next;
    });
    requestAnimationFrame(() => undoButtonRefs.current.get(newId)?.focus());
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

  const modalUndo = selectedVehicle ? pendingUndos.get(selectedVehicle.id) : undefined;
  const pageUndos = useMemo(() => {
    const all = Array.from(pendingUndos.values());
    if (!selectedVehicle) return all;
    return all.filter((u) => u.vehicleId !== selectedVehicle.id);
  }, [pendingUndos, selectedVehicle]);

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
            data-hotkey-search="true"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t.admin.searchFleetPlaceholder}
            placeholder={t.admin.searchFleetPlaceholder}
            className="w-full bg-slate-950 border border-white/15 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 transition"
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

      {/* 2.5 UNDO RESTORE BANNERS (5s Pausable Window per Vehicle) */}
      {/* Design Standard (Semantic Undo Theming):
          - Amber is used for destructive/removal undos (e.g. canceling vehicle creation).
          - Cyan is used for non-destructive state changes (operational status, crowd density).
      */}
      {pageUndos.length > 0 && (
        <div className="space-y-2">
          {pageUndos.map((undo) => (
            <div
              key={undo.vehicleId}
              role="status"
              aria-live="polite"
              className={`p-4 rounded-xl bg-slate-900 border text-slate-200 text-xs sm:text-sm flex items-center justify-between shadow-xl animate-in slide-in-from-top duration-200 ${
                undo.field === "add"
                  ? "border-amber-500/40"
                  : "border-cyan-500/40"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {undo.field === "add" ? (
                  <Trash2 className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <RotateCcw className="w-4 h-4 text-cyan-400 shrink-0" />
                )}
                <span className="truncate">
                  {t.admin.pendingUndo}: <strong>{undo.label}</strong>
                </span>
              </div>
              <button
                type="button"
                ref={(el) => {
                  if (el) undoButtonRefs.current.set(undo.vehicleId, el);
                  else undoButtonRefs.current.delete(undo.vehicleId);
                }}
                onFocus={() => setUndoPaused(true)}
                onBlur={() => setUndoPaused(false)}
                onClick={() => handleUndo(undo.vehicleId)}
                aria-label={`${t.admin.pendingUndo}: ${undo.label}`}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition btn-tactile min-h-[36px] shrink-0 ${
                  undo.field === "add"
                    ? "bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-amber-950"
                    : "bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-cyan-950"
                }`}
              >
                {t.common.undo}
                <span aria-hidden="true">
                  {" "}
                  ({Math.max(0, Math.ceil((undo.expiry - nowTick) / 1000))}s)
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

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
                <th scope="col" className="sticky right-0 z-20 py-3.5 px-4 text-right bg-slate-950/95 backdrop-blur-md shadow-[-12px_0_16px_-4px_rgba(0,0,0,0.6)] before:content-[''] before:absolute before:inset-y-0 before:-left-4 before:w-4 before:bg-gradient-to-r before:from-transparent before:to-slate-950/95 before:pointer-events-none">{t.admin.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {filteredVehicles.map((vehicle) => {
                const line = allLines.find((l) => l.id === vehicle.lineId);

                return (
                  <tr
                    key={vehicle.id}
                    className="group hover:bg-white/[0.03] transition"
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
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                      <div className="font-semibold text-white">{vehicle.coachbuilder}</div>
                      <div className="text-[10px] text-slate-400">{vehicle.chassis}</div>
                    </td>

                    {/* Speed & Heading */}
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-200">
                        <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="font-bold">{Math.round(vehicle.speedKmh)} km/h</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {Math.round(vehicle.headingDegrees)}&deg; {t.admin.telemetryHeading}
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
                        aria-label={`${t.admin.ariaStatusFor} ${vehicle.vehicleCode}`}
                        onChange={(e) =>
                          handleUpdateStatus(vehicle, e.target.value as VehicleOperationalStatus, e.currentTarget)
                        }
                        className={`text-[10px] font-mono font-semibold px-2 py-1.5 rounded-lg border transition cursor-pointer min-h-[36px] ${
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
                        aria-label={`${t.admin.ariaCrowdFor} ${vehicle.vehicleCode}`}
                        onChange={(e) =>
                          handleUpdateCrowd(vehicle, e.target.value as CrowdDensityLevel, e.currentTarget)
                        }
                        className={`text-[10px] font-mono font-semibold px-2 py-1.5 rounded-lg border transition cursor-pointer min-h-[36px] ${
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
                    <td className="sticky right-0 z-10 py-3.5 px-4 text-right bg-slate-900/95 group-hover:bg-[#131b2e] backdrop-blur-md shadow-[-12px_0_16px_-4px_rgba(0,0,0,0.6)] before:content-[''] before:absolute before:inset-y-0 before:-left-4 before:w-4 before:bg-gradient-to-r before:from-transparent before:to-slate-900/95 group-hover:before:to-[#131b2e] before:pointer-events-none transition-colors">
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

            {/* In-Modal Undo Banner: Keeps focus trapped inside dialog without z-50 leak */}
            {modalUndo && (
              <div
                role="status"
                aria-live="polite"
                className="mx-5 mt-4 p-3 rounded-xl bg-slate-950 border border-cyan-500/40 text-slate-200 text-xs flex items-center justify-between shadow-lg animate-in slide-in-from-top-2 duration-150 shrink-0"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <RotateCcw className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="truncate">
                    {t.admin.pendingUndo}: <strong>{modalUndo.label}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  ref={(el) => {
                    if (el) undoButtonRefs.current.set(modalUndo.vehicleId, el);
                    else undoButtonRefs.current.delete(modalUndo.vehicleId);
                  }}
                  onFocus={() => setUndoPaused(true)}
                  onBlur={() => setUndoPaused(false)}
                  onClick={() => handleUndo(modalUndo.vehicleId)}
                  aria-label={`${t.admin.pendingUndo}: ${modalUndo.label}`}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-cyan-950 font-bold text-xs transition btn-tactile min-h-[36px] shrink-0"
                >
                  {t.common.undo}
                  <span aria-hidden="true">
                    {" "}
                    ({Math.max(0, Math.ceil((modalUndo.expiry - nowTick) / 1000))}s)
                  </span>
                </button>
              </div>
            )}

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
                        onClick={(e) => handleUpdateStatus(selectedVehicle, st, e.currentTarget)}
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
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 min-h-[44px]"
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
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-mono uppercase min-h-[44px]"
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
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-slate-200 min-h-[44px]"
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
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-slate-200 min-h-[44px]"
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
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-slate-200 min-h-[44px]"
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
