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
} from "lucide-react";
import { Line, Stop, TimetableRun, TimetableStopTime } from "@/types/transit";
import {
  cascadeStopTimes,
  timeStringToMinutes,
  minutesToTimeString,
  shiftRunSchedule,
} from "@/lib/simulation/timetableMatrix";

interface TimetableMatrixGridProps {
  selectedLine: Line;
  lineStops: Stop[];
  runs: TimetableRun[];
  onUpdateRun: (updatedRun: TimetableRun) => Promise<void>;
  onDeleteRun: (runId: string) => Promise<void>;
  onShiftRun: (run: TimetableRun, deltaMinutes: number) => Promise<void>;
  onOpenBatchModal: () => void;
  onOpenCreateModal: () => void;
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
}: TimetableMatrixGridProps) {
  const [timeWindow, setTimeWindow] = useState<TimeWindowFilter>("ALL");
  const [editingCell, setEditingCell] = useState<InCellEditState | null>(null);
  const [isSavingCell, setIsSavingCell] = useState<boolean>(false);
  const [cellError, setCellError] = useState<string | null>(null);

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
        run.stopTimes
      );
      return {
        ...run,
        stopTimes: autoStopTimes,
      };
    });
  }, [filteredRuns, lineStops, selectedLine.mode]);

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
  };

  // Save in-cell edit with cascading recalculation
  const handleSaveCell = async () => {
    if (!editingCell) return;
    setCellError(null);

    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(editingCell.arrivalTime) || !timeRegex.test(editingCell.departureTime)) {
      setCellError("Time format must be HH:mm (e.g. 08:30).");
      return;
    }

    try {
      setIsSavingCell(true);
      const targetRun = materializedRuns.find((r) => r.id === editingCell.runId);
      if (!targetRun) return;

      const currentStopTimes = [...(targetRun.stopTimes || [])];
      const targetIndex = editingCell.stopIndex;

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

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
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
          </div>
          <div className="text-[11px] text-slate-400 hidden sm:block">
            Click any cell to edit arrival/departure dwell or toggle express bypass.
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
            <table className="w-full text-left border-collapse select-none">
              <thead>
                <tr className="border-b border-white/10 bg-slate-950/90 text-xs text-slate-300">
                  {/* Sticky Stations Header Column */}
                  <th className="sticky left-0 z-20 bg-[#070b14] border-r border-white/10 px-4 py-3 min-w-[220px] shadow-lg">
                    <div className="font-bold text-white uppercase text-[10px] font-mono tracking-wider">
                      Sequential Stations
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      Origin &rarr; Destination
                    </div>
                  </th>

                  {/* Trip Run Columns */}
                  {materializedRuns.map((run) => (
                    <th
                      key={run.id}
                      className="px-3 py-3 min-w-[150px] border-r border-white/5 bg-slate-950/40 text-center align-top"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-mono font-bold text-teal-400 text-xs">
                            {run.tripCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => onDeleteRun(run.id)}
                            className="text-slate-500 hover:text-rose-400 transition"
                            title="Delete Trip"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-[10px] text-slate-400 truncate">
                          {run.serviceClass || run.operatorName}
                        </div>

                        <div className="font-mono text-[11px] font-bold text-slate-200">
                          {run.departureTime} &rarr; {run.arrivalTime}
                        </div>

                        {/* Quick Shift Timing Controls */}
                        <div className="flex items-center justify-center gap-1 pt-1">
                          <button
                            type="button"
                            onClick={() => onShiftRun(run, -5)}
                            className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] font-mono text-slate-300 border border-white/5 transition"
                            title="Shift entire trip -5 minutes earlier"
                          >
                            -5m
                          </button>
                          <button
                            type="button"
                            onClick={() => onShiftRun(run, 5)}
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
                {lineStops.map((stop, stopIdx) => {
                  const isOrigin = stopIdx === 0;
                  const isTerminus = stopIdx === lineStops.length - 1;

                  return (
                    <tr
                      key={stop.id}
                      className={`hover:bg-slate-800/30 transition ${
                        isOrigin || isTerminus ? "bg-slate-950/30 font-medium" : ""
                      }`}
                    >
                      {/* Sticky Station Label */}
                      <td className="sticky left-0 z-10 bg-[#070b14] border-r border-white/10 px-4 py-3 shadow-lg">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-900 border border-white/10 text-[10px] font-mono flex items-center justify-center text-slate-400 shrink-0">
                            {stop.sequence || stopIdx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="text-white font-medium truncate flex items-center gap-1">
                              <span>{stop.name}</span>
                              {stop.stationType === "TOD" && (
                                <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-500/40">
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
                      {materializedRuns.map((run) => {
                        const stopTime = run.stopTimes?.[stopIdx];
                        const isBypass = stopTime?.isBypass ?? false;
                        const isEditingThisCell =
                          editingCell?.runId === run.id && editingCell?.stopId === stop.id;

                        if (isEditingThisCell) {
                          return (
                            <td
                              key={run.id}
                              className="px-2 py-2 border-r border-white/5 bg-teal-950/40 align-middle"
                            >
                              <div className="p-2 rounded-xl bg-slate-950 border border-teal-500/50 shadow-xl space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-teal-300">
                                    Edit Schedule
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setEditingCell(null)}
                                    className="text-slate-400 hover:text-white"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Bypass Toggle */}
                                <button
                                  type="button"
                                  onClick={handleToggleBypassInCell}
                                  className={`w-full py-1 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                                    editingCell.isBypass
                                      ? "bg-amber-500 text-amber-950"
                                      : "bg-slate-900 text-slate-300 border border-white/10"
                                  }`}
                                >
                                  {editingCell.isBypass ? "Express PASS (Active)" : "Mark as PASS / Bypass"}
                                </button>

                                {!editingCell.isBypass && (
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <div>
                                      <span className="text-[9px] text-slate-400">Arr:</span>
                                      <input
                                        type="text"
                                        value={editingCell.arrivalTime}
                                        onChange={(e) =>
                                          setEditingCell((prev) =>
                                            prev ? { ...prev, arrivalTime: e.target.value } : null
                                          )
                                        }
                                        className="w-full px-1.5 py-1 rounded bg-slate-900 border border-white/10 text-white font-mono text-[11px]"
                                      />
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-slate-400">Dep:</span>
                                      <input
                                        type="text"
                                        value={editingCell.departureTime}
                                        onChange={(e) =>
                                          setEditingCell((prev) =>
                                            prev ? { ...prev, departureTime: e.target.value } : null
                                          )
                                        }
                                        className="w-full px-1.5 py-1 rounded bg-slate-900 border border-white/10 text-white font-mono text-[11px]"
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Cascade checkbox */}
                                <label className="flex items-center gap-1.5 text-[10px] text-slate-300 cursor-pointer">
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
                                    className="rounded border-slate-700 bg-slate-900 text-teal-500"
                                  />
                                  <span>Cascade times</span>
                                </label>

                                {cellError && (
                                  <div className="text-[9px] text-rose-400">{cellError}</div>
                                )}

                                <div className="flex items-center justify-end gap-1.5 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingCell(null)}
                                    className="px-2 py-0.5 rounded bg-slate-900 text-[10px] text-slate-400"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleSaveCell}
                                    disabled={isSavingCell}
                                    className="px-2.5 py-0.5 rounded bg-teal-500 text-teal-950 font-bold text-[10px]"
                                  >
                                    {isSavingCell ? "Saving..." : "Apply"}
                                  </button>
                                </div>
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={run.id}
                            onClick={() => handleStartCellEdit(run, stop, stopIdx, stopTime)}
                            className="px-3 py-3 border-r border-white/5 text-center cursor-pointer hover:bg-teal-500/10 transition group"
                          >
                            {isBypass ? (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                                <span>--:-- PASS</span>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <div className="font-mono text-xs font-semibold text-white group-hover:text-teal-300 transition">
                                  {isOrigin
                                    ? stopTime?.departureTime || run.departureTime
                                    : isTerminus
                                    ? stopTime?.arrivalTime || run.arrivalTime
                                    : `${stopTime?.arrivalTime || "--:--"} / ${stopTime?.departureTime || "--:--"}`}
                                </div>
                                <div className="text-[9px] font-mono text-slate-500">
                                  {stopTime?.peronOrTrack || `Peron ${(stopIdx % 2) + 1}`}
                                </div>
                              </div>
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
    </div>
  );
}
