/**
 * PlatformI - Stop-by-Trip Cross-Tabular Timetable Matrix Grid
 *
 * Renders the industry-standard station-rows by trip-columns matrix, enabling
 * operators to inspect inter-station runtimes, dwell times, and edit schedules in-cell.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useMemo } from "react";
import {
  Clock,
  Plus,
  Wand2,
  FastForward,
  MapPin,
  Building2,
  ArrowRight,
  Edit2,
  Trash2,
  Check,
  X,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert,
  Moon,
  GitBranch,
  AlertTriangle,
  ArrowLeftRight,
  Undo2,
} from "lucide-react";
import {
  Line,
  Stop,
  TimetableRun,
  TimetableStopTime,
  TripOperationalType,
  DivergenceReason,
} from "@/types/transit";
import {
  cascadeStopTimes,
  timeStringToMinutes,
  minutesToTimeString,
  shiftRunSchedule,
  validateStopTimeChronology,
  detectPlatformConflicts,
  checkPlatformOccupancyConflict,
  PlatformConflict,
  getOrderedLineStops,
  CorridorDirection,
} from "@/lib/simulation/timetableMatrix";
import { useDialogFocusTrap } from "@/lib/hooks/useDialogFocusTrap";

interface TimetableMatrixGridProps {
  selectedLine: Line;
  lineStops: Stop[];
  runs: TimetableRun[];
  onUpdateRun: (updatedRun: TimetableRun) => Promise<void>;
  onDeleteRun: (runId: string) => Promise<void>;
  onShiftRun: (run: TimetableRun, deltaMinutes: number) => Promise<void>;
  onOpenBatchModal: () => void;
  onOpenCreateModal: () => void;
  onEditRun?: (run: TimetableRun) => void;
}

type TimeWindowFilter = "ALL" | "PEAK_AM" | "OFF_PEAK" | "PEAK_PM" | "NIGHT";

interface InCellEditState {
  runId: string;
  stopId: string;
  stopName: string;
  stopIndex: number;
  arrivalTime: string;
  departureTime: string;
  peronOrTrack: string;
  isBypass: boolean;
  cascadeDownstream: boolean;
}

export function TimetableMatrixGrid({
  selectedLine,
  lineStops,
  runs,
  onUpdateRun,
  onDeleteRun,
  onShiftRun,
  onOpenBatchModal,
  onOpenCreateModal,
  onEditRun,
}: TimetableMatrixGridProps) {
  const [timeWindow, setTimeWindow] = useState<TimeWindowFilter>("ALL");
  const [direction, setDirection] = useState<CorridorDirection>("OUTBOUND");
  const [editingCell, setEditingCell] = useState<InCellEditState | null>(null);
  const [isSavingCell, setIsSavingCell] = useState<boolean>(false);
  const [cellError, setCellError] = useState<string | null>(null);
  const [cellWarning, setCellWarning] = useState<string | null>(null);
  const [cellWarningOverride, setCellWarningOverride] = useState<boolean>(false);

  // 1-step undo buffer for run edits
  const [undoRunStack, setUndoRunStack] = useState<{
    previousRun: TimetableRun;
    description: string;
  } | null>(null);

  // Filter runs by selected time window
  const filteredRuns = useMemo(() => {
    let list = runs.filter((r) => r.lineId === selectedLine.id);

    // Sort by departure time
    list = list.sort((a, b) => a.departureTime.localeCompare(b.departureTime));

    if (timeWindow === "ALL") return list;

    return list.filter((r) => {
      const depMinutes = timeStringToMinutes(r.departureTime);
      if (timeWindow === "PEAK_AM") {
        return depMinutes >= 360 && depMinutes < 540; // 06:00 - 09:00
      }
      if (timeWindow === "OFF_PEAK") {
        return depMinutes >= 540 && depMinutes < 990; // 09:00 - 16:30
      }
      if (timeWindow === "PEAK_PM") {
        return depMinutes >= 990 && depMinutes < 1200; // 16:30 - 20:00
      }
      if (timeWindow === "NIGHT") {
        return depMinutes >= 1200 || depMinutes < 360; // 20:00 - 06:00
      }
      return true;
    });
  }, [runs, selectedLine.id, timeWindow]);

  // State for operational divergence modal
  const [configuringRun, setConfiguringRun] = useState<TimetableRun | null>(null);
  const [divergenceType, setDivergenceType] = useState<TripOperationalType>("REGULAR");
  const [divergenceReason, setDivergenceReason] = useState<DivergenceReason>("NONE");
  const [divergenceDesc, setDivergenceDesc] = useState<string>("");
  const [terminatedStopId, setTerminatedStopId] = useState<string>("");

  const { containerRef: divergenceDialogRef, handleTrapKeyDown: handleDivergenceTrapKeyDown } =
    useDialogFocusTrap<HTMLDivElement>({
      isOpen: !!configuringRun,
      onClose: () => setConfiguringRun(null),
    });

  // Directional sequential stops ordering (Outbound = Origin -> Terminus, Inbound = Terminus -> Origin)
  const orderedStops = useMemo(() => {
    return getOrderedLineStops(lineStops, direction);
  }, [lineStops, direction]);

  // Ensure each run has populated stopTimes along the line stops
  const materializedRuns = useMemo(() => {
    return filteredRuns.map((run) => {
      if (run.stopTimes && run.stopTimes.length === lineStops.length) {
        return run;
      }
      // Auto-compute cascading stop times if not yet populated
      const autoStopTimes = cascadeStopTimes(
        run.departureTime,
        lineStops,
        selectedLine.mode,
        run.stopTimes,
        run.terminatedEarlyStopId
      );
      return {
        ...run,
        stopTimes: autoStopTimes,
      };
    });
  }, [filteredRuns, lineStops, selectedLine.mode]);

  // Real-time Platform & Track Headway Conflict Detection (Interlocking Safety)
  const platformConflicts = useMemo(() => {
    return detectPlatformConflicts(materializedRuns, orderedStops, 2);
  }, [materializedRuns, orderedStops]);

  // Aggregate total unique conflicts across entire line
  const totalConflictCount = useMemo(() => {
    let count = 0;
    const countedPairs = new Set<string>();
    platformConflicts.forEach((conflicts) => {
      for (const c of conflicts) {
        const pairKey = [c.stopId, c.runIdA, c.runIdB].sort().join("::");
        if (!countedPairs.has(pairKey)) {
          countedPairs.add(pairKey);
          count++;
        }
      }
    });
    return count;
  }, [platformConflicts]);

  // WAI-ARIA roving keyboard navigation for transit dispatchers
  const [activeGridCell, setActiveGridCell] = useState<{ stopIdx: number; runIdx: number } | null>(
    null
  );

  const handleCellKeyDown = (
    e: React.KeyboardEvent,
    stopIdx: number,
    runIdx: number,
    run: TimetableRun,
    stop: Stop,
    stopTime?: TimetableStopTime
  ) => {
    if (editingCell) return;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (stopIdx > 0) {
        const nextStop = stopIdx - 1;
        setActiveGridCell({ stopIdx: nextStop, runIdx });
        document.getElementById(`matrix-cell-${nextStop}-${runIdx}`)?.focus();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (stopIdx < orderedStops.length - 1) {
        const nextStop = stopIdx + 1;
        setActiveGridCell({ stopIdx: nextStop, runIdx });
        document.getElementById(`matrix-cell-${nextStop}-${runIdx}`)?.focus();
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (runIdx > 0) {
        const nextRun = runIdx - 1;
        setActiveGridCell({ stopIdx, runIdx: nextRun });
        document.getElementById(`matrix-cell-${stopIdx}-${nextRun}`)?.focus();
      }
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (runIdx < materializedRuns.length - 1) {
        const nextRun = runIdx + 1;
        setActiveGridCell({ stopIdx, runIdx: nextRun });
        document.getElementById(`matrix-cell-${stopIdx}-${nextRun}`)?.focus();
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const canonicalStopIdx = lineStops.findIndex((s) => s.id === stop.id);
      const effectiveCanonicalIdx = canonicalStopIdx >= 0 ? canonicalStopIdx : stopIdx;
      if (stopTime?.isTerminatedEarly) {
        handleOpenDivergenceModal(run);
      } else {
        handleStartCellEdit(run, stop, effectiveCanonicalIdx, stopTime);
      }
    }
  };

  // Open in-cell editor
  const handleStartCellEdit = (
    run: TimetableRun,
    stop: Stop,
    stopIndex: number,
    currentStopTime?: TimetableStopTime
  ) => {
    const arrTime = currentStopTime?.arrivalTime || run.departureTime;
    const depTime = currentStopTime?.departureTime || run.departureTime;
    const isBypass = currentStopTime?.isBypass ?? false;
    const peronOrTrack = currentStopTime?.peronOrTrack || `Peron ${(stopIndex % 2) + 1}`;

    setEditingCell({
      runId: run.id,
      stopId: stop.id,
      stopName: stop.name,
      stopIndex,
      arrivalTime: arrTime,
      departureTime: depTime,
      peronOrTrack,
      isBypass,
      cascadeDownstream: true,
    });
    setCellError(null);
    setCellWarning(null);
    setCellWarningOverride(false);
  };

  // 1-step undo handler to rollback the last edited run
  const handleUndoLastEdit = async () => {
    if (!undoRunStack) return;
    try {
      await onUpdateRun(undoRunStack.previousRun);
      setUndoRunStack(null);
    } catch (err) {
      setCellError(err instanceof Error ? err.message : "Gagal membatalkan perubahan");
    }
  };

  // Wrapped shift run handler with undo history capture
  const handleShiftWithUndo = async (run: TimetableRun, deltaMinutes: number) => {
    setUndoRunStack({
      previousRun: JSON.parse(JSON.stringify(run)),
      description: `Pergeseran ${deltaMinutes > 0 ? "+" : ""}${deltaMinutes}m pada ${run.tripCode}`,
    });
    await onShiftRun(run, deltaMinutes);
  };

  // Save in-cell edit with chronological validation and cascading recalculation
  const handleSaveCell = async (overrideWarning = false) => {
    if (!editingCell) return;
    setCellError(null);
    if (!overrideWarning) {
      setCellWarning(null);
    }

    const targetRun = materializedRuns.find((r) => r.id === editingCell.runId);
    if (!targetRun) return;

    // Snapshot pristine run state into undo buffer before modifications
    const runSnapshot: TimetableRun = JSON.parse(JSON.stringify(targetRun));

    const currentStopTimes = [...(targetRun.stopTimes || [])];
    const targetIndex = editingCell.stopIndex;

    // Strict chronological validation: prevent negative dwell and inter-station time travel
    const validation = validateStopTimeChronology({
      arrivalTime: editingCell.arrivalTime,
      departureTime: editingCell.departureTime,
      isBypass: editingCell.isBypass,
      stopIndex: targetIndex,
      allStopTimes: currentStopTimes,
      cascadeDownstream: editingCell.cascadeDownstream,
    });

    if (!validation.isValid) {
      setCellError(validation.errorMessage || "Format atau urutan waktu tidak valid.");
      return;
    }

    // Interlocking Platform / Track Collision Check against other trips
    const conflictCheck = checkPlatformOccupancyConflict({
      targetRunId: targetRun.id,
      stopId: editingCell.stopId,
      stopName: editingCell.stopName,
      peronOrTrack: editingCell.peronOrTrack,
      arrivalTime: editingCell.arrivalTime,
      departureTime: editingCell.departureTime,
      isBypass: editingCell.isBypass,
      allRuns: materializedRuns,
      minHeadwayMinutes: 2,
    });

    if (conflictCheck.hasConflict && !overrideWarning && !cellWarningOverride) {
      setCellWarning(
        conflictCheck.warningMessage ||
          `Konflik Peron: Jalur/Peron ini sudah dialokasikan untuk ${conflictCheck.conflictingTripCode} (${conflictCheck.conflictingWindow}). Klik 'Tetap Terapkan' jika disengaja.`
      );
      return;
    }

    try {
      setIsSavingCell(true);

      // Update the edited stop
      const updatedStopTime: TimetableStopTime = {
        stopId: editingCell.stopId,
        stopName: editingCell.stopName,
        stopSequence: lineStops[targetIndex]?.sequence || targetIndex + 1,
        arrivalTime: editingCell.arrivalTime,
        departureTime: editingCell.departureTime,
        isBypass: editingCell.isBypass,
        peronOrTrack: editingCell.peronOrTrack,
        dwellSeconds: editingCell.isBypass ? 0 : 60,
      };

      currentStopTimes[targetIndex] = updatedStopTime;

      // Cascade downstream if requested
      if (editingCell.cascadeDownstream && targetIndex < lineStops.length - 1) {
        const remainingStops = lineStops.slice(targetIndex);
        const cascadedTail = cascadeStopTimes(
          editingCell.departureTime,
          remainingStops,
          selectedLine.mode,
          currentStopTimes.slice(targetIndex)
        );

        // Splice cascaded tail back into currentStopTimes
        for (let j = 0; j < cascadedTail.length; j++) {
          currentStopTimes[targetIndex + j] = cascadedTail[j];
        }
      }

      // Update run origin departure & destination arrival if bounds modified
      const newOriginDeparture =
        targetIndex === 0 ? editingCell.departureTime : targetRun.departureTime;
      const newDestArrival =
        currentStopTimes[currentStopTimes.length - 1]?.arrivalTime || targetRun.arrivalTime;

      const updatedRun: TimetableRun = {
        ...targetRun,
        departureTime: newOriginDeparture,
        arrivalTime: newDestArrival,
        stopTimes: currentStopTimes,
      };

      // Push snapshot to undo stack
      setUndoRunStack({
        previousRun: runSnapshot,
        description: `Edit jadwal stasiun ${editingCell.stopName} pada ${targetRun.tripCode}`,
      });

      await onUpdateRun(updatedRun);
      setEditingCell(null);
    } catch (err) {
      setCellError(err instanceof Error ? err.message : "Failed to update stop schedule");
    } finally {
      setIsSavingCell(false);
    }
  };

  // Toggle quick bypass for a stop in cell editor
  const handleToggleBypassInCell = () => {
    if (!editingCell) return;
    setEditingCell((prev) => (prev ? { ...prev, isBypass: !prev.isBypass } : null));
  };

  // Open operational divergence modal for a run
  const handleOpenDivergenceModal = (run: TimetableRun) => {
    setConfiguringRun(run);
    setDivergenceType(run.tripType || "REGULAR");
    setDivergenceReason(run.divergenceReason || "NONE");
    setDivergenceDesc(run.divergenceDescription || run.notes || "");
    setTerminatedStopId(run.terminatedEarlyStopId || "");
  };

  // Save divergence configuration and cascade stops
  const handleSaveDivergence = async () => {
    if (!configuringRun) return;

    // Capture snapshot for undo before modifying divergence
    const runSnapshot: TimetableRun = JSON.parse(JSON.stringify(configuringRun));

    const termStop = lineStops.find((s) => s.id === terminatedStopId);
    let newDest = configuringRun.destination;
    let newNotes = divergenceDesc || configuringRun.notes;

    if (divergenceType === "NIGHT_DEPOT_STABLING") {
      newDest = termStop ? `${termStop.name} (Masuk Dipo)` : configuringRun.destination;
      if (!divergenceDesc) {
        newNotes = `Dinas Malam Masuk Dipo ${termStop?.name || "Depot"} - Berakhir Lebih Awal`;
      }
    } else if (divergenceType === "SHORT_TURN") {
      newDest = termStop ? `${termStop.name} (Relasi Pendek)` : configuringRun.destination;
      if (!divergenceDesc) {
        newNotes = `Relasi Pendek Berakhir di ${termStop?.name || "Stasiun Akhir"}`;
      }
    } else if (divergenceType === "ROUTE_DIVERGENCE") {
      if (!divergenceDesc) {
        newNotes =
          divergenceReason === "INCIDENT_DISRUPTION"
            ? "Rekayasa Pola Operasi imbas kendala prasarana"
            : "Rekayasa Pola Operasi pengalihan jalur perawatan malam";
      }
    } else if (divergenceType === "REGULAR") {
      newDest = lineStops[lineStops.length - 1]?.name || configuringRun.destination;
    }

    const recomputedStopTimes = cascadeStopTimes(
      configuringRun.departureTime,
      lineStops,
      selectedLine.mode,
      configuringRun.stopTimes,
      divergenceType !== "REGULAR" ? terminatedStopId || undefined : undefined
    );

    const activeStops = recomputedStopTimes.filter((st) => !st.isTerminatedEarly);
    const newArrTime =
      activeStops[activeStops.length - 1]?.arrivalTime || configuringRun.arrivalTime;

    const updated: TimetableRun = {
      ...configuringRun,
      destination: newDest,
      arrivalTime: newArrTime,
      notes: newNotes,
      tripType: divergenceType,
      divergenceReason: divergenceType === "REGULAR" ? "NONE" : divergenceReason,
      divergenceDescription: divergenceDesc,
      terminatedEarlyStopId:
        divergenceType !== "REGULAR" ? terminatedStopId || undefined : undefined,
      stopTimes: recomputedStopTimes,
    };

    setUndoRunStack({
      previousRun: runSnapshot,
      description: `Rekayasa rute pada ${configuringRun.tripCode}`,
    });

    await onUpdateRun(updated);
    setConfiguringRun(null);
  };

  return (
    <div className="space-y-4">
      {/* Matrix Controls & Time Windows */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Time Window Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-xs text-slate-400 font-semibold shrink-0 mr-1">Timeband:</span>
          {(
            [
              { id: "ALL", label: "All Day" },
              { id: "PEAK_AM", label: "06:00 - 09:00 (Peak AM)" },
              { id: "OFF_PEAK", label: "09:00 - 16:30 (Day)" },
              { id: "PEAK_PM", label: "16:30 - 20:00 (Peak PM)" },
              { id: "NIGHT", label: "20:00 - 00:00 (Night)" },
            ] as const
          ).map((w) => {
            const isSelected = timeWindow === w.id;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => setTimeWindow(w.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition btn-tactile ${
                  isSelected
                    ? "bg-teal-500 text-teal-950 font-bold"
                    : "bg-slate-950/60 text-slate-400 hover:text-slate-200"
                }`}
              >
                {w.label}
              </button>
            );
          })}
        </div>

        {/* Action Buttons & Direction Toggle & Undo Button */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Direction Segmented Control */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setDirection("OUTBOUND")}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                direction === "OUTBOUND"
                  ? "bg-teal-500 text-teal-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Arah Hilir / Outbound Departure (Stasiun Awal -> Akhir)"
            >
              <span>Arah Hilir</span>
            </button>
            <button
              type="button"
              onClick={() => setDirection("INBOUND")}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                direction === "INBOUND"
                  ? "bg-teal-500 text-teal-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Arah Mudik / Inbound Return (Stasiun Akhir -> Awal)"
            >
              <ArrowLeftRight className="w-3 h-3" />
              <span>Arah Mudik</span>
            </button>
          </div>

          {/* 1-Step Undo Button */}
          {undoRunStack && (
            <button
              type="button"
              onClick={handleUndoLastEdit}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition btn-tactile animate-pulse"
              title={`Batalkan: ${undoRunStack.description}`}
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Batalkan Edit</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenBatchModal}
            className="px-3.5 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/40 text-teal-300 text-xs font-bold flex items-center gap-2 transition btn-tactile"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Batch Pola Operasi</span>
          </button>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-teal-950 font-bold text-xs flex items-center gap-1.5 transition btn-tactile"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Single Run</span>
          </button>
        </div>
      </div>

      {/* Cross-Tabular Matrix Table Container */}
      <div className="rounded-2xl bg-slate-900/80 border border-white/10 shadow-2xl overflow-hidden flex flex-col">
        {/* Table Sub-header */}
        <div className="p-4 border-b border-white/10 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              style={{
                backgroundColor: `${selectedLine.colorHex}25`,
                borderColor: `${selectedLine.colorHex}60`,
                color: selectedLine.colorHex,
              }}
              className="px-2 py-0.5 rounded text-xs font-mono font-bold border"
            >
              {selectedLine.code}
            </span>
            <h3 className="text-sm font-bold text-white truncate max-w-md">
              {selectedLine.name}
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
              {lineStops.length} Stations &bull; {materializedRuns.length} Trips
            </span>
            {totalConflictCount > 0 ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950/80 text-rose-300 border border-rose-500/50 flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>{totalConflictCount} Konflik Peron</span>
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Interlocking Aman</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <div className="hidden md:flex items-center gap-1.5 font-mono bg-slate-950/80 px-2.5 py-1 rounded-lg border border-white/10">
              <span className="text-teal-400 font-bold">OCC Keyboard:</span>
              <span className="text-slate-300">↑ ↓ ← →</span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-slate-300">[Enter] Edit</span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-slate-300">[Esc] Batal</span>
            </div>
            <span className="hidden sm:inline text-slate-500">
              Klik sel untuk edit
            </span>
          </div>
        </div>

        {/* Scrollable Matrix Table */}
        {lineStops.length < 2 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <MapPin className="w-6 h-6 mx-auto text-slate-600" />
            <p>
              This line currently has fewer than 2 stops. Add stops in Network Studio to unlock the full Stop-by-Trip matrix.
            </p>
          </div>
        ) : materializedRuns.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-3">
            <Clock className="w-6 h-6 mx-auto text-teal-400 animate-pulse" />
            <p>No scheduled timetable runs found for this line within this time window.</p>
            <button
              type="button"
              onClick={onOpenBatchModal}
              className="px-4 py-2 rounded-xl bg-teal-500 text-teal-950 font-bold text-xs inline-flex items-center gap-2"
            >
              <Wand2 className="w-4 h-4" />
              <span>Generate Pola Operasi Sequence</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto relative">
            <table
              role="grid"
              aria-label="Stop-by-Trip Timetable Matrix"
              className="w-full text-left border-collapse select-none"
            >
              <thead>
                <tr
                  role="row"
                  className="border-b border-white/10 bg-slate-950/90 text-xs text-slate-300"
                >
                  {/* Sticky Stations Header Column */}
                  <th
                    role="columnheader"
                    scope="col"
                    className="sticky left-0 z-20 bg-[#070b14] border-r border-white/10 px-4 py-3 min-w-[220px] shadow-lg"
                  >
                    <div className="font-bold text-white uppercase text-[10px] font-mono tracking-wider">
                      Sequential Stations
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {direction === "OUTBOUND" ? "Arah Hilir (Asal → Akhir)" : "Arah Mudik (Akhir → Asal)"}
                    </div>
                  </th>

                  {/* Trip Run Columns */}
                  {materializedRuns.map((run) => (
                    <th
                      key={run.id}
                      role="columnheader"
                      scope="col"
                      className="px-3 py-3 min-w-[150px] border-r border-white/5 bg-slate-950/40 text-center align-top"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono font-bold text-teal-400 text-xs">
                            {run.tripCode}
                          </span>
                          <div className="flex items-center gap-1">
                            {onEditRun && (
                              <button
                                type="button"
                                onClick={() => onEditRun(run)}
                                className="text-slate-400 hover:text-cyan-300 transition p-0.5 rounded hover:bg-cyan-950/50"
                                title="Edit Run Metadata (Trip Code, Operator, Gate/Bay, Class, Notes)"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenDivergenceModal(run)}
                              className="text-slate-400 hover:text-indigo-300 transition p-0.5 rounded hover:bg-indigo-950/50"
                              title="Rekayasa Pola Operasi / Dinas Stabling Dipo"
                            >
                              <GitBranch className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteRun(run.id)}
                              className="text-slate-500 hover:text-rose-400 transition p-0.5 rounded hover:bg-rose-950/50"
                              title="Delete Trip"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Operational Typology Badge */}
                        {run.tripType === "NIGHT_DEPOT_STABLING" ? (
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-950/90 border border-indigo-500/50 text-indigo-300">
                            <Moon className="w-2.5 h-2.5 text-indigo-400" />
                            <span>Masuk Dipo</span>
                          </div>
                        ) : run.tripType === "SHORT_TURN" ? (
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950/90 border border-amber-500/50 text-amber-300">
                            <ArrowRight className="w-2.5 h-2.5 text-amber-400" />
                            <span>Relasi Pendek</span>
                          </div>
                        ) : run.tripType === "ROUTE_DIVERGENCE" ? (
                          <div
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950/90 border border-rose-500/50 text-rose-300"
                            title={run.divergenceDescription || "Rekayasa Pola Operasi"}
                          >
                            <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
                            <span>
                              {run.divergenceReason === "INCIDENT_DISRUPTION"
                                ? "Rekayasa Insiden"
                                : run.divergenceReason === "NOCTURNAL_MAINTENANCE"
                                ? "Divergensi Malam"
                                : "Rekayasa Rute"}
                            </span>
                          </div>
                        ) : run.tripType === "SPECIAL_KLB" ? (
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-950/90 border border-yellow-500/50 text-yellow-300">
                            <Sparkles className="w-2.5 h-2.5 text-yellow-400" />
                            <span>KLB Luar Biasa</span>
                          </div>
                        ) : null}

                        <div className="text-[10px] text-slate-400 truncate">
                          {run.serviceClass || run.operatorName}
                        </div>

                        <div className="font-mono text-[11px] font-bold text-slate-200">
                          {run.departureTime} &rarr; {run.arrivalTime}
                        </div>

                        {/* Quick Shift Timing Controls */}
                        <div className="flex items-center justify-center gap-1 pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleShiftWithUndo(run, -5)}
                            className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] font-mono text-slate-300 border border-white/5 transition"
                            title="Shift entire trip -5 minutes earlier"
                          >
                            -5m
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShiftWithUndo(run, 5)}
                            className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] font-mono text-slate-300 border border-white/5 transition"
                            title="Shift entire trip +5 minutes later"
                          >
                            +5m
                          </button>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5 text-xs">
                {orderedStops.map((stop, stopIdx) => {
                  const isOrigin = stopIdx === 0;
                  const isTerminus = stopIdx === orderedStops.length - 1;
                  const canonicalStopIdx = lineStops.findIndex((s) => s.id === stop.id);
                  const effectiveCanonicalIdx = canonicalStopIdx >= 0 ? canonicalStopIdx : stopIdx;

                  return (
                    <tr
                      key={stop.id}
                      role="row"
                      className={`hover:bg-slate-800/30 transition ${
                        isOrigin || isTerminus ? "bg-slate-950/30 font-medium" : ""
                      }`}
                    >
                      {/* Sticky Station Label */}
                      <td
                        role="rowheader"
                        scope="row"
                        className="sticky left-0 z-10 bg-[#070b14] border-r border-white/10 px-4 py-3 shadow-lg"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-900 border border-white/10 text-[10px] font-mono flex items-center justify-center text-slate-400 shrink-0">
                            {direction === "OUTBOUND" ? (stop.sequence || stopIdx + 1) : (orderedStops.length - stopIdx)}
                          </span>
                          <div className="min-w-0">
                            <div className="text-white font-medium truncate flex items-center gap-1">
                              <span>{stop.name}</span>
                              {stop.stationType === "TOD" && (
                                <span className="px-1 py-0.2 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-500/40">
                                  TOD
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {isOrigin
                                ? "Departure Terminus"
                                : isTerminus
                                ? "Arrival Terminus"
                                : stop.isInterchange
                                ? "Transit Interchange"
                                : "Standard Halte"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Station Timing Cells for each Trip */}
                      {materializedRuns.map((run, runIdx) => {
                        const stopTime = run.stopTimes?.find((st) => st.stopId === stop.id) || run.stopTimes?.[effectiveCanonicalIdx];
                        const isBypass = stopTime?.isBypass ?? false;
                        const isTerminated = !!stopTime?.isTerminatedEarly;
                        const isEditingThisCell =
                          editingCell?.runId === run.id && editingCell?.stopId === stop.id;
                        const isFocused =
                          activeGridCell?.stopIdx === stopIdx && activeGridCell?.runIdx === runIdx;

                        const cellConflictKey = `${stop.id}::${run.id}`;
                        const cellConflicts = platformConflicts.get(cellConflictKey);
                        const hasPlatformConflict = Boolean(cellConflicts && cellConflicts.length > 0);

                        return (
                          <td
                            key={run.id}
                            id={`matrix-cell-${stopIdx}-${runIdx}`}
                            tabIndex={
                              isFocused ||
                              (activeGridCell === null && stopIdx === 0 && runIdx === 0)
                                ? 0
                                : -1
                            }
                            role="gridcell"
                            aria-selected={isFocused}
                            onFocus={() => setActiveGridCell({ stopIdx, runIdx })}
                            onKeyDown={(e) =>
                              handleCellKeyDown(e, stopIdx, runIdx, run, stop, stopTime)
                            }
                            onClick={() => {
                              setActiveGridCell({ stopIdx, runIdx });
                              if (isTerminated) {
                                handleOpenDivergenceModal(run);
                              } else {
                                handleStartCellEdit(run, stop, effectiveCanonicalIdx, stopTime);
                              }
                            }}
                            className={`relative px-3 py-3 border-r border-white/5 text-center cursor-pointer transition select-none outline-none ${
                              isEditingThisCell
                                ? "bg-teal-950/60 ring-2 ring-teal-400 ring-inset z-20"
                                : isFocused
                                ? "ring-2 ring-teal-400/80 ring-inset bg-teal-500/15"
                                : hasPlatformConflict
                                ? "bg-rose-950/40 border-b border-rose-500/40 hover:bg-rose-900/40"
                                : isTerminated
                                ? "bg-slate-950/60 hover:bg-slate-900/80"
                                : "hover:bg-teal-500/10 group"
                            }`}
                            title={
                              hasPlatformConflict
                                ? `KONFLIK PERON: ${cellConflicts?.map((c) => `${c.peronOrTrack} bentrok dengan ${c.tripCodeB} (${c.timeB})`).join("; ")}`
                                : isTerminated
                                ? "Perjalanan tidak melayani stasiun ini (Berakhir Lebih Awal / Masuk Dipo). Klik untuk ubah rekayasa."
                                : "Klik atau tekan Enter untuk edit waktu stasiun"
                            }
                          >
                            {/* Standard Static Timing Display (Guarantees zero layout shift) */}
                            {isTerminated ? (
                              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 border border-slate-700 text-slate-500">
                                <span>
                                  --:--{" "}
                                  {run.tripType === "NIGHT_DEPOT_STABLING"
                                    ? "MASUK DIPO"
                                    : "TDK MELAYANI"}
                                </span>
                              </div>
                            ) : isBypass ? (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                                <span>--:-- PASS</span>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <div className="font-mono text-xs font-semibold text-white group-hover:text-teal-300 transition flex items-center justify-center gap-1">
                                  {hasPlatformConflict && (
                                    <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0 animate-pulse" />
                                  )}
                                  <span>
                                    {isOrigin
                                      ? stopTime?.departureTime || run.departureTime
                                      : isTerminus
                                      ? stopTime?.arrivalTime || run.arrivalTime
                                      : `${stopTime?.arrivalTime || "--:--"} / ${stopTime?.departureTime || "--:--"}`}
                                  </span>
                                </div>
                                <div className="text-[10px] font-mono flex items-center justify-center gap-1">
                                  <span className={hasPlatformConflict ? "text-rose-300 font-bold" : "text-slate-400"}>
                                    {stopTime?.peronOrTrack || `Peron ${(stopIdx % 2) + 1}`}
                                  </span>
                                  {hasPlatformConflict && (
                                    <span className="px-1 rounded text-[9px] bg-rose-900/80 text-rose-200 border border-rose-500/60 font-bold uppercase">
                                      Bentrok
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Floating Anchored Popover for In-Cell Edit (Zero CLS Layout Shift) */}
                            {isEditingThisCell && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingCell(null);
                                  }}
                                />
                                <div
                                  role="dialog"
                                  aria-label="Edit Stop Time"
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => {
                                    if (e.key === "Escape") {
                                      e.stopPropagation();
                                      setEditingCell(null);
                                    }
                                  }}
                                  className={`absolute z-50 w-64 p-3 rounded-2xl bg-slate-950 border border-teal-500 shadow-2xl space-y-2.5 text-xs text-left backdrop-blur-xl ${
                                    stopIdx >= orderedStops.length - 2
                                      ? "bottom-full mb-2"
                                      : "top-full mt-2"
                                  } ${
                                    runIdx >= materializedRuns.length - 2
                                      ? "right-0"
                                      : "left-1/2 -translate-x-1/2"
                                  }`}
                                >
                                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                                    <div className="space-y-0.5">
                                      <span className="text-[11px] font-bold text-teal-300 block">
                                        Edit Jadwal Stasiun
                                      </span>
                                      <span className="text-[10px] text-slate-400 block font-mono truncate max-w-[170px]">
                                        {stop.name} &bull; {run.tripCode}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setEditingCell(null)}
                                      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900"
                                      aria-label="Tutup editor sel"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {/* Bypass Toggle */}
                                  <button
                                    type="button"
                                    onClick={handleToggleBypassInCell}
                                    className={`w-full py-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1.5 ${
                                      editingCell.isBypass
                                        ? "bg-amber-500 text-amber-950"
                                        : "bg-slate-900 text-slate-300 border border-white/10 hover:bg-slate-800"
                                    }`}
                                  >
                                    {editingCell.isBypass
                                      ? "Express PASS (Aktif)"
                                      : "Tandai Langsung / PASS"}
                                  </button>

                                  {/* Set Early Terminus / Masuk Dipo shortcut */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleOpenDivergenceModal(run);
                                      setTerminatedStopId(stop.id);
                                      setEditingCell(null);
                                    }}
                                    className="w-full py-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1.5 bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/60"
                                  >
                                    <GitBranch className="w-3 h-3" />
                                    <span>Hentikan / Masuk Dipo di Sini</span>
                                  </button>

                                  {!editingCell.isBypass && (
                                    <>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                                            Kedatangan (Arr)
                                          </label>
                                          <input
                                            type="text"
                                            autoFocus
                                            value={editingCell.arrivalTime}
                                            onChange={(e) =>
                                              setEditingCell((prev) =>
                                                prev
                                                  ? { ...prev, arrivalTime: e.target.value }
                                                  : null
                                              )
                                            }
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleSaveCell();
                                              }
                                            }}
                                            className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-teal-400"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                                            Keberangkatan (Dep)
                                          </label>
                                          <input
                                            type="text"
                                            value={editingCell.departureTime}
                                            onChange={(e) =>
                                              setEditingCell((prev) =>
                                                prev
                                                  ? { ...prev, departureTime: e.target.value }
                                                  : null
                                              )
                                            }
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleSaveCell();
                                              }
                                            }}
                                            className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-teal-400"
                                          />
                                        </div>
                                      </div>

                                      <div>
                                        <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                                          Alokasi Jalur / Peron
                                        </label>
                                        <input
                                          type="text"
                                          value={editingCell.peronOrTrack}
                                          placeholder="Contoh: Peron 1 / Jalur 2"
                                          onChange={(e) =>
                                            setEditingCell((prev) =>
                                              prev
                                                ? { ...prev, peronOrTrack: e.target.value }
                                                : null
                                            )
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              e.preventDefault();
                                              handleSaveCell();
                                            }
                                          }}
                                          className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-teal-400"
                                        />
                                      </div>
                                    </>
                                  )}

                                  {/* Cascade checkbox */}
                                  <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer pt-0.5">
                                    <input
                                      type="checkbox"
                                      checked={editingCell.cascadeDownstream}
                                      onChange={(e) =>
                                        setEditingCell((prev) =>
                                          prev
                                            ? { ...prev, cascadeDownstream: e.target.checked }
                                            : null
                                        )
                                      }
                                      className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-teal-500"
                                    />
                                    <span>Geser stasiun downstream</span>
                                  </label>

                                  {cellError && (
                                    <div className="p-1.5 rounded bg-rose-950/60 border border-rose-500/40 text-[10px] text-rose-300">
                                      {cellError}
                                    </div>
                                  )}

                                  {cellWarning && (
                                    <div className="p-2 rounded-xl bg-amber-950/80 border border-amber-500/60 text-[10px] text-amber-200 space-y-1.5">
                                      <div className="flex items-start gap-1.5">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                        <span className="font-semibold leading-tight">{cellWarning}</span>
                                      </div>
                                      <div className="flex justify-end">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setCellWarningOverride(true);
                                            handleSaveCell(true);
                                          }}
                                          className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-[10px] transition"
                                        >
                                          Tetap Terapkan (Override)
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/10">
                                    <button
                                      type="button"
                                      onClick={() => setEditingCell(null)}
                                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-400 transition"
                                    >
                                      Batal
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveCell(false)}
                                      disabled={isSavingCell}
                                      className="px-3 py-1 rounded-lg bg-teal-500 hover:bg-teal-400 text-teal-950 font-bold text-[10px] transition shadow-md shadow-teal-500/20"
                                    >
                                      {isSavingCell ? "Menyimpan..." : "Terapkan"}
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Operational Divergence & Rekayasa Pola Operasi Modal */}
      {configuringRun && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setConfiguringRun(null);
            }
          }}
        >
          <div
            ref={divergenceDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="divergence-dialog-title"
            onKeyDown={handleDivergenceTrapKeyDown}
            tabIndex={-1}
            className="w-full max-w-lg bg-[#0c1222] border border-indigo-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] outline-none"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
                  <GitBranch className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="divergence-dialog-title" className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Rekayasa Operasi & Stabling</span>
                    <span className="font-mono text-teal-400 text-xs">
                      ({configuringRun.tripCode})
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Konfigurasi dinas malam masuk dipo, relasi pendek, atau rekayasa pengalihan rute.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfiguringRun(null)}
                className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Trip Typology */}
              <div className="space-y-1.5">
                <label className="block text-slate-400 font-semibold">
                  Tipologi Operasional Perjalanan (Trip Typology)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "REGULAR", label: "Reguler (Full Line)", icon: Clock },
                    { id: "NIGHT_DEPOT_STABLING", label: "Masuk Dipo (Night Stabling)", icon: Moon },
                    { id: "SHORT_TURN", label: "Relasi Pendek (Short Turn)", icon: ArrowRight },
                    {
                      id: "ROUTE_DIVERGENCE",
                      label: "Rekayasa Operasi (Divergence)",
                      icon: AlertTriangle,
                    },
                    { id: "SPECIAL_KLB", label: "Kereta Luar Biasa (KLB)", icon: Sparkles },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSel = divergenceType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setDivergenceType(item.id as TripOperationalType)}
                        className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                          isSel
                            ? "bg-indigo-950/80 border-indigo-500 text-white font-bold"
                            : "bg-slate-950/60 border-white/10 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Icon
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isSel ? "text-indigo-400" : "text-slate-500"
                          }`}
                        />
                        <span className="text-[11px] leading-tight">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divergence Reason (if not REGULAR) */}
              {divergenceType !== "REGULAR" && (
                <div className="space-y-1">
                  <label className="block text-slate-400 font-semibold">
                    Alasan Rekayasa / Divergensi
                  </label>
                  <select
                    value={divergenceReason}
                    onChange={(e) => setDivergenceReason(e.target.value as DivergenceReason)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 focus:outline-none focus:border-indigo-400"
                  >
                    <option value="NONE">Tanpa Alasan Spesifik</option>
                    <option value="DEPOT_PULL_IN">Dinas Masuk Dipo / Stabling Malam</option>
                    <option value="INCIDENT_DISRUPTION">
                      Rekayasa Imbas Kendala Prasarana / Insiden
                    </option>
                    <option value="NOCTURNAL_MAINTENANCE">
                      Pengalihan Jalur - Perawatan Rel Malam
                    </option>
                    <option value="EVENT_DETOUR">Pengalihan Jalur - Acara / Car Free Day</option>
                  </select>
                </div>
              )}

              {/* Early Terminus Stop (if stabling or short-turn or divergence) */}
              {divergenceType !== "REGULAR" && (
                <div className="space-y-1">
                  <label className="block text-slate-400 font-semibold">
                    Stasiun Akhir Pelayanan / Titik Divergensi
                  </label>
                  <select
                    value={terminatedStopId}
                    onChange={(e) => setTerminatedStopId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 focus:outline-none focus:border-indigo-400"
                  >
                    <option value="">-- Layani Sampai Stasiun Akhir --</option>
                    {lineStops.map((s, idx) => (
                      <option key={s.id} value={s.id}>
                        {idx + 1}. {s.name} {s.stationType === "TOD" ? "(TOD)" : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500">
                    Stasiun-stasiun setelah titik ini akan ditandai tidak melayani penumpang.
                  </p>
                </div>
              )}

              {/* Divergence Description / Notes */}
              <div className="space-y-1">
                <label className="block text-slate-400 font-semibold">
                  Catatan Operasional / Pemberitahuan Penumpang
                </label>
                <textarea
                  value={divergenceDesc}
                  onChange={(e) => setDivergenceDesc(e.target.value)}
                  rows={2}
                  placeholder="e.g. Kereta Berakhir di Stasiun Depok untuk Masuk Dipo. Tidak melayani Cilebut & Bogor."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="p-4 border-t border-white/10 bg-slate-950/60 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfiguringRun(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 text-xs font-semibold hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveDivergence}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Terapkan Rekayasa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
