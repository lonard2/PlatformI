/**
 * PlatformI - Batch Pola Operasi Timetable Generator Modal
 *
 * Provides rapid high-frequency schedule synthesis for metro, rail, and BRT lines
 * by generating sequential timetable runs across operational timebands.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useMemo } from "react";
import {
  Wand2,
  Clock,
  Layers,
  X,
  AlertCircle,
  Sparkles,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { Line, Stop, TimetableRun } from "@/types/transit";
import { useDialogFocusTrap } from "@/lib/hooks/useDialogFocusTrap";
import { generateBatchTimetableRuns } from "@/lib/simulation/timetableMatrix";

interface BatchScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  lines: Line[];
  allStops: Stop[];
  initialLineId?: string;
  onRunsGenerated: (runs: TimetableRun[]) => void;
}

const COMMON_HEADWAYS = [3, 5, 8, 10, 15, 20, 30];

export function BatchScheduleModal({
  isOpen,
  onClose,
  lines,
  allStops,
  initialLineId,
  onRunsGenerated,
}: BatchScheduleModalProps) {
  const defaultLine = initialLineId || lines[0]?.id || "line-mrt-ns";

  const [selectedLineId, setSelectedLineId] = useState<string>(defaultLine);
  const [startTime, setStartTime] = useState<string>("06:00");
  const [endTime, setEndTime] = useState<string>("09:00");
  const [headwayMinutes, setHeadwayMinutes] = useState<number>(5);
  const [runCodePrefix, setRunCodePrefix] = useState<string>("M-1");
  const [startRunNumber, setStartRunNumber] = useState<number>(101);
  const [operatorName, setOperatorName] = useState<string>("PT MRT Jakarta");
  const [serviceClass, setServiceClass] = useState<string>("Standard Metro Commuter");
  const [notes, setNotes] = useState<string>("Jam Sibuk Pagi - Regular Headway");
  const [replaceExisting, setReplaceExisting] = useState<boolean>(false);
  const [includeLateNightStabling, setIncludeLateNightStabling] = useState<boolean>(false);
  const [stablingStopId, setStablingStopId] = useState<string>("");
  const [lateNightStartTime, setLateNightStartTime] = useState<string>("22:00");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { containerRef, handleTrapKeyDown } = useDialogFocusTrap<HTMLDivElement>({
    isOpen,
    onClose,
  });

  const selectedLine = useMemo(() => {
    return lines.find((l) => l.id === selectedLineId) || lines[0];
  }, [lines, selectedLineId]);

  // Stops for selected line in sequential order
  const lineStops = useMemo(() => {
    if (!selectedLine) return [];
    return allStops
      .filter((s) => s.lineId === selectedLine.id || s.connectedLineIds.includes(selectedLine.id))
      .sort((a, b) => a.sequence - b.sequence);
  }, [allStops, selectedLine]);

  // Update defaults when line changes
  const handleLineChange = (lineId: string) => {
    setSelectedLineId(lineId);
    const line = lines.find((l) => l.id === lineId);
    if (!line) return;

    if (line.mode.includes("MRT")) {
      setRunCodePrefix("M-1");
      setOperatorName("PT MRT Jakarta (Perseroda)");
      setServiceClass("Standard Metro Commuter");
      setHeadwayMinutes(5);
    } else if (line.mode.includes("WHOOSH")) {
      setRunCodePrefix("G10");
      setOperatorName("PT Kereta Cepat Indonesia China (KCIC)");
      setServiceClass("First Class & Premium Economy");
      setHeadwayMinutes(30);
    } else if (line.mode.includes("LRT")) {
      setRunCodePrefix("TS-0");
      setOperatorName("PT Kereta Api Indonesia (LRT)");
      setServiceClass("GoA3 Driverless Automated");
      setHeadwayMinutes(10);
    } else if (line.mode.includes("TRANSJAKARTA")) {
      setRunCodePrefix(`TJ-${line.code}-`);
      setOperatorName("PT Transportasi Jakarta");
      setServiceClass("Standard BRT Rapid Service");
      setHeadwayMinutes(5);
    }
  };

  // Calculate preview count
  const estimatedTripsCount = useMemo(() => {
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return 0;

    let totalDurationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (totalDurationMinutes < 0) totalDurationMinutes += 1440;
    if (headwayMinutes <= 0) return 0;
    return Math.floor(totalDurationMinutes / headwayMinutes) + 1;
  }, [startTime, endTime, headwayMinutes]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      setErrorMessage("Start and End times must match valid HH:mm format (e.g. 06:00).");
      return;
    }

    if (lineStops.length < 2) {
      setErrorMessage(
        `Selected line (${selectedLine?.name}) requires at least 2 stops for full matrix timetable generation. Please add stops in Network Studio first.`
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const generatedRuns = generateBatchTimetableRuns({
        lineId: selectedLineId,
        operatorName,
        stops: lineStops,
        modeCategory: selectedLine?.mode || "MRT_JAKARTA",
        startTime,
        endTime,
        headwayMinutes,
        runCodePrefix,
        startRunNumber,
        serviceClass,
        gateOrBay: selectedLine?.category === "BUS" ? "Bay 1" : "Peron 1",
        notes,
        includeLateNightStabling,
        stablingStopId: stablingStopId || undefined,
        stablingStopName: lineStops.find((s) => s.id === stablingStopId)?.name,
        lateNightStartTime,
      });

      if (generatedRuns.length === 0) {
        setErrorMessage("No runs could be generated with the given time window and headway.");
        return;
      }

      // If replacing existing runs on this line, delete them first
      if (replaceExisting) {
        await fetch(`/api/network/timetables?lineId=${encodeURIComponent(selectedLineId)}`, {
          method: "DELETE",
        });
      }

      // Save batch to REST API
      const res = await fetch("/api/network/timetables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch: generatedRuns }),
      });

      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        onRunsGenerated(json.data);
        onClose();
      } else {
        setErrorMessage(json.error || "Failed to persist batch generated timetable runs.");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Batch generation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-generator-title"
        onKeyDown={handleTrapKeyDown}
        className="w-full max-w-xl bg-[#0c1222] border border-teal-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] focus:outline-none"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h3 id="batch-generator-title" className="text-sm font-bold text-white">
                Batch Pola Operasi Generator
              </h3>
              <p className="text-[11px] text-slate-400">
                Generate high-frequency scheduled runs across operational timebands.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-5 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form id="batch-generator-form" onSubmit={handleGenerate} className="space-y-4">
            {/* 1. Line Selector */}
            <div className="space-y-1">
              <label className="block text-slate-400 font-medium">Target Transit Line *</label>
              <select
                value={selectedLineId}
                onChange={(e) => handleLineChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 focus:outline-none focus:border-teal-500"
                required
              >
                {lines.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code} - {l.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500">
                {lineStops.length} sequential stations configured on this corridor.
              </p>
            </div>

            {/* 2. Operational Window (Start & End Time) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-400 font-medium">Window Start (HH:mm) *</label>
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="06:00"
                  pattern="^([01]\d|2[0-3]):[0-5]\d$"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 font-mono focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-400 font-medium">Window End (HH:mm) *</label>
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="09:00"
                  pattern="^([01]\d|2[0-3]):[0-5]\d$"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 font-mono focus:outline-none focus:border-teal-500"
                  required
                />
              </div>
            </div>

            {/* 3. Headway / Frequency Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-slate-400 font-medium">
                  Headway Interval (minutes) *
                </label>
                <span className="font-mono text-teal-400 font-bold">{headwayMinutes} min</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {COMMON_HEADWAYS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHeadwayMinutes(h)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      headwayMinutes === h
                        ? "bg-teal-500 text-teal-950 font-bold"
                        : "bg-slate-950 text-slate-400 border border-white/10 hover:bg-slate-900"
                    }`}
                  >
                    {h} min
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Run Code Pattern */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-400 font-medium">Trip Code Prefix *</label>
                <input
                  type="text"
                  value={runCodePrefix}
                  onChange={(e) => setRunCodePrefix(e.target.value)}
                  placeholder="e.g. M-1 or TJ-1"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 font-mono uppercase focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-400 font-medium">Start Run Number</label>
                <input
                  type="number"
                  min={1}
                  value={startRunNumber}
                  onChange={(e) => setStartRunNumber(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 font-mono focus:outline-none focus:border-teal-500"
                  required
                />
              </div>
            </div>

            {/* 5. Operator & Service Class */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-400 font-medium">Operator Name *</label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-400 font-medium">Service Class</label>
                <input
                  type="text"
                  value={serviceClass}
                  onChange={(e) => setServiceClass(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* 6. Notes & Replacement Toggle */}
            <div className="space-y-1">
              <label className="block text-slate-400 font-medium">Operational Note</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Regular Headway"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-white/10 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-200">Replace Existing Line Runs</div>
                <div className="text-[10px] text-slate-500">
                  Deletes current runs on this line before publishing the new sequence.
                </div>
              </div>
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-teal-500"
              />
            </div>

            {/* 7. Late-Night Depot Stabling & Early Termination Toggle */}
            <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-semibold text-indigo-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Dinas Malam Masuk Dipo (Late-Night Stabling Runs)</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Trips departing at/after night cutoff terminate early at depot/pocket track.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeLateNightStabling}
                  onChange={(e) => setIncludeLateNightStabling(e.target.checked)}
                  className="w-4 h-4 rounded border-indigo-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                />
              </div>

              {includeLateNightStabling && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-indigo-500/20">
                  <div className="space-y-1">
                    <label className="block text-[11px] text-indigo-300 font-medium">
                      Night Cutoff Time (HH:mm)
                    </label>
                    <input
                      type="text"
                      value={lateNightStartTime}
                      onChange={(e) => setLateNightStartTime(e.target.value)}
                      placeholder="22:00"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-indigo-500/30 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] text-indigo-300 font-medium">
                      Stabling Depot / Pocket Station
                    </label>
                    <select
                      value={stablingStopId}
                      onChange={(e) => setStablingStopId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-indigo-500/30 text-slate-200 text-xs focus:outline-none focus:border-indigo-400"
                    >
                      <option value="">Auto (Intermediate Depot ~65%)</option>
                      {lineStops.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.sequence}. {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Synthesis Summary Box */}
            <div className="p-3.5 rounded-xl bg-teal-950/40 border border-teal-500/30 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-mono font-bold text-teal-400">
                  Synthesis Preview
                </span>
                <div className="text-white font-mono font-bold text-sm">
                  {estimatedTripsCount} Scheduled Runs
                </div>
                <div className="text-[10px] text-slate-400">
                  {startTime} &rarr; {endTime} ({headwayMinutes} min headway)
                </div>
              </div>
              <div className="text-right font-mono text-[11px] text-teal-300">
                <span>{runCodePrefix}-{startRunNumber.toString().padStart(3, "0")}</span>
                <span className="text-slate-500"> to </span>
                <span>
                  {runCodePrefix}-
                  {(startRunNumber + Math.max(0, estimatedTripsCount - 1))
                    .toString()
                    .padStart(3, "0")}
                </span>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950/60 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="batch-generator-form"
            disabled={isSubmitting || estimatedTripsCount <= 0}
            className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-teal-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-500/20 transition btn-tactile"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>{isSubmitting ? "Generating..." : `Publish ${estimatedTripsCount} Runs`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
