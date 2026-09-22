/**
 * PlatformI - Operator Control Portal: Timetable & Schedule Studio
 *
 * Provides comprehensive inspection, authoring, and lifecycle management of scheduled transit runs
 * across rail, aviation, bus, shuttle, and maritime networks with both master list and stop-by-trip matrix views.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import {
  Clock,
  Plus,
  Search,
  Train,
  Bus,
  Plane,
  Anchor,
  Sparkles,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  Edit2,
  Trash2,
  RotateCcw,
  DoorOpen,
  HelpCircle,
  X,
  AlertCircle,
  Building2,
  Luggage,
  LayoutList,
  Table2,
  Wand2,
  TrendingUp,
} from "lucide-react";
import { TimetableRun, TransitCategory, Stop, Line } from "@/types/transit";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useTranslation } from "@/lib/i18n";
import { useDialogFocusTrap } from "@/lib/hooks/useDialogFocusTrap";
import { BatchScheduleModal } from "@/components/admin/BatchScheduleModal";
import { TimetableMatrixGrid } from "@/components/admin/TimetableMatrixGrid";
import { TimetableStringlineChart } from "@/components/admin/TimetableStringlineChart";
import { shiftRunSchedule } from "@/lib/simulation/timetableMatrix";

interface QuickTemplate {
  label: string;
  category: TransitCategory;
  lineId: string;
  tripCodePrefix: string;
  operatorName: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  serviceClass: string;
  gateOrBay: string;
  baggageBelt?: string;
  notes: string;
}

const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    label: "Whoosh High-Speed Rail (Halim - Tegalluar)",
    category: "RAIL",
    lineId: "line-whoosh-hsr",
    tripCodePrefix: "G10",
    operatorName: "PT Kereta Cepat Indonesia China (KCIC)",
    origin: "Stasiun Halim HSR",
    destination: "Stasiun Tegalluar Summarecon",
    departureTime: "07:00",
    arrivalTime: "07:45",
    serviceClass: "First Class & Premium Economy",
    gateOrBay: "Gate 1 (Peron 1 & 2)",
    notes: "Direct Express 350 km/h with high-speed onboard dining. Boarding closes 5 mins prior.",
  },
  {
    label: "Garuda Indonesia Flight (CGK - DPS)",
    category: "AVIATION",
    lineId: "line-airport-cgk",
    tripCodePrefix: "GA-",
    operatorName: "Garuda Indonesia",
    origin: "Soekarno-Hatta (CGK T3)",
    destination: "Ngurah Rai Bali (DPS)",
    departureTime: "10:30",
    arrivalTime: "13:20",
    serviceClass: "Business & Economy Class",
    gateOrBay: "Gate 15 (Terminal 3 Domestic)",
    baggageBelt: "Belt 3",
    notes: "Complimentary hot meal, in-flight audio-video on demand, and 20kg baggage included.",
  },
  {
    label: "KAI Intercity Express (Gambir - Surabaya)",
    category: "RAIL",
    lineId: "line-kai-intercity",
    tripCodePrefix: "KA-",
    operatorName: "PT Kereta Api Indonesia (Persero)",
    origin: "Stasiun Gambir (GMR)",
    destination: "Surabaya Pasarturi (SBI)",
    departureTime: "08:20",
    arrivalTime: "16:30",
    serviceClass: "Eksekutif New Gen & Luxury Suite",
    gateOrBay: "Jalur 3 (Peron 2)",
    notes: "Argo Bromo Anggrek. Panoramic window coaches with hot dining car.",
  },
  {
    label: "Executive Road Shuttle (fX Sudirman - Bandung)",
    category: "BUS",
    lineId: "line-shuttle-daytrans",
    tripCodePrefix: "DT-",
    operatorName: "DayTrans Executive Shuttle",
    origin: "Pool fX Sudirman",
    destination: "Dipatiukur Bandung",
    departureTime: "08:00",
    arrivalTime: "10:45",
    serviceClass: "VIP 8-Seater Captain Seat",
    gateOrBay: "Bay 2 (Lobi fX Sudirman)",
    notes: "Direct via Tol Layang MBZ & Cipularang. Maximum luggage allowance 20kg.",
  },
  {
    label: "TransJakarta AMARI 24H (Blok M - Kota)",
    category: "BUS",
    lineId: "line-tj-cor-1",
    tripCodePrefix: "TJ-",
    operatorName: "PT Transportasi Jakarta",
    origin: "Halte Blok M",
    destination: "Halte Kota",
    departureTime: "23:45",
    arrivalTime: "00:40",
    serviceClass: "Standard BRT Night Service",
    gateOrBay: "Halte Peron 1",
    notes: "Angkutan Malam Hari (AMARI) 24 jam dengan integrasi skybridge CSW.",
  },
];

const DAYS_OF_WEEK = [
  { day: 1, label: "Mon", shortLabel: "M" },
  { day: 2, label: "Tue", shortLabel: "T" },
  { day: 3, label: "Wed", shortLabel: "W" },
  { day: 4, label: "Thu", shortLabel: "T" },
  { day: 5, label: "Fri", shortLabel: "F" },
  { day: 6, label: "Sat", shortLabel: "S" },
  { day: 0, label: "Sun", shortLabel: "S" },
];

function TimetableStudioContent() {
  const { t } = useTranslation();
  const allLines = useTransitStore((state) => state.allLines);
  const allStops = useTransitStore((state) => state.allStops);

  const [timetableRuns, setTimetableRuns] = useState<TimetableRun[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // View Mode: Matrix Grid vs Stringline Diagram vs Master List
  const [viewMode, setViewMode] = useState<"MATRIX" | "STRINGLINE" | "LIST">("MATRIX");
  const [matrixLineId, setMatrixLineId] = useState<string>("line-mrt-ns");

  // Filters for List View
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<TransitCategory | "ALL">("ALL");
  const [selectedLineId, setSelectedLineId] = useState<string>("ALL");

  // Modal State for Single Run (Add/Edit)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRunId, setEditingRunId] = useState<string | null>(null);

  // Modal State for Batch Schedule Generator
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);

  // Form State for Single Run
  const [formLineId, setFormLineId] = useState<string>("");
  const [formTripCode, setFormTripCode] = useState<string>("");
  const [formOperatorName, setFormOperatorName] = useState<string>("");
  const [formOrigin, setFormOrigin] = useState<string>("");
  const [formDestination, setFormDestination] = useState<string>("");
  const [formDepartureTime, setFormDepartureTime] = useState<string>("");
  const [formArrivalTime, setFormArrivalTime] = useState<string>("");
  const [formServiceClass, setFormServiceClass] = useState<string>("");
  const [formGateOrBay, setFormGateOrBay] = useState<string>("");
  const [formBaggageBelt, setFormBaggageBelt] = useState<string>("");
  const [formNotes, setFormNotes] = useState<string>("");
  const [formDaysOfWeek, setFormDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Undo Toast state
  const [lastDeletedRun, setLastDeletedRun] = useState<TimetableRun | null>(null);

  const { containerRef, handleTrapKeyDown } = useDialogFocusTrap<HTMLDivElement>({
    isOpen: isModalOpen,
    onClose: () => setIsModalOpen(false),
  });

  // Load timetable runs
  const fetchTimetables = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/network/timetables");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTimetableRuns(json.data);
      } else {
        setError(json.error || "Failed to load timetable runs");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetables();
  }, []);

  // Quick template selection
  const handleApplyTemplate = (tpl: QuickTemplate) => {
    const randomSuffix = Math.floor(10 + Math.random() * 90);
    setFormLineId(tpl.lineId);
    setFormTripCode(`${tpl.tripCodePrefix}${randomSuffix}`);
    setFormOperatorName(tpl.operatorName);
    setFormOrigin(tpl.origin);
    setFormDestination(tpl.destination);
    setFormDepartureTime(tpl.departureTime);
    setFormArrivalTime(tpl.arrivalTime);
    setFormServiceClass(tpl.serviceClass);
    setFormGateOrBay(tpl.gateOrBay);
    setFormBaggageBelt(tpl.baggageBelt || "");
    setFormNotes(tpl.notes);
    setFormDaysOfWeek([1, 2, 3, 4, 5, 6, 0]);
    setFormError(null);
  };

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingRunId(null);
    const defaultLine = matrixLineId || allLines[0]?.id || "line-mrt-ns";
    setFormLineId(defaultLine);
    setFormTripCode("");
    setFormOperatorName("");
    setFormOrigin("");
    setFormDestination("");
    setFormDepartureTime("08:00");
    setFormArrivalTime("09:00");
    setFormServiceClass("");
    setFormGateOrBay("");
    setFormBaggageBelt("");
    setFormNotes("");
    setFormDaysOfWeek([1, 2, 3, 4, 5, 6, 0]);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (run: TimetableRun) => {
    setEditingRunId(run.id);
    setFormLineId(run.lineId);
    setFormTripCode(run.tripCode);
    setFormOperatorName(run.operatorName);
    setFormOrigin(run.origin);
    setFormDestination(run.destination);
    setFormDepartureTime(run.departureTime);
    setFormArrivalTime(run.arrivalTime);
    setFormServiceClass(run.serviceClass || "");
    setFormGateOrBay(run.gateOrBay || "");
    setFormBaggageBelt(run.baggageBelt || "");
    setFormNotes(run.notes || "");
    setFormDaysOfWeek(run.daysOfWeek || [1, 2, 3, 4, 5, 6, 0]);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Toggle day of week in form
  const handleToggleDay = (day: number) => {
    setFormDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formTripCode.trim()) {
      setFormError("Trip Code is required (e.g. G1012, GA-404, M-101).");
      return;
    }
    if (!formOrigin.trim() || !formDestination.trim()) {
      setFormError("Origin and Destination are required.");
      return;
    }
    if (!formOperatorName.trim()) {
      setFormError("Operator Name is required.");
      return;
    }
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(formDepartureTime) || !timeRegex.test(formArrivalTime)) {
      setFormError("Departure and Arrival times must be in valid HH:mm format (e.g. 08:30).");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: Partial<TimetableRun> = {
        lineId: formLineId,
        tripCode: formTripCode.trim().toUpperCase(),
        operatorName: formOperatorName.trim(),
        origin: formOrigin.trim(),
        destination: formDestination.trim(),
        departureTime: formDepartureTime.trim(),
        arrivalTime: formArrivalTime.trim(),
        serviceClass: formServiceClass.trim() || undefined,
        gateOrBay: formGateOrBay.trim() || undefined,
        baggageBelt: formBaggageBelt.trim() || undefined,
        notes: formNotes.trim() || undefined,
        daysOfWeek: formDaysOfWeek,
      };

      if (editingRunId) {
        // PUT update
        const res = await fetch("/api/network/timetables", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingRunId, ...payload }),
        });
        const json = await res.json();
        if (json.success && json.data) {
          setTimetableRuns((prev) =>
            prev.map((r) => (r.id === editingRunId ? json.data : r))
          );
          setIsModalOpen(false);
        } else {
          setFormError(json.error || "Failed to update timetable run");
        }
      } else {
        // POST create
        const res = await fetch("/api/network/timetables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.success && json.data) {
          setTimetableRuns((prev) => [json.data, ...prev]);
          setIsModalOpen(false);
        } else {
          setFormError(json.error || "Failed to create timetable run");
        }
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Run from Matrix in-cell edits
  const handleUpdateRun = async (updatedRun: TimetableRun) => {
    try {
      const res = await fetch("/api/network/timetables", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedRun),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setTimetableRuns((prev) =>
          prev.map((r) => (r.id === updatedRun.id ? json.data : r))
        );
      }
    } catch {
      // Soft failure handled
    }
  };

  // Shift Run Schedule forward/backward by deltaMinutes
  const handleShiftRun = async (run: TimetableRun, deltaMinutes: number) => {
    const shifted = shiftRunSchedule(run, deltaMinutes);
    await handleUpdateRun(shifted);
  };

  // Handle Delete with Undo
  const handleDeleteRun = async (runId: string) => {
    const run = timetableRuns.find((r) => r.id === runId);
    if (!run) return;

    if (!window.confirm(`Are you sure you want to remove scheduled run ${run.tripCode} (${run.origin} -> ${run.destination})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/network/timetables?id=${encodeURIComponent(run.id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setTimetableRuns((prev) => prev.filter((r) => r.id !== run.id));
        setLastDeletedRun(run);
      }
    } catch {
      // Soft failure
    }
  };

  // Restore deleted run
  const handleUndoDelete = async () => {
    if (!lastDeletedRun) return;
    try {
      const res = await fetch("/api/network/timetables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lastDeletedRun),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setTimetableRuns((prev) => [json.data, ...prev]);
        setLastDeletedRun(null);
      }
    } catch {
      // Fail gracefully
    }
  };

  // Batch runs generated handler
  const handleRunsGenerated = (newRuns: TimetableRun[]) => {
    const lineId = newRuns[0]?.lineId;
    if (lineId) {
      setTimetableRuns((prev) => [
        ...newRuns,
        ...prev.filter((r) => r.lineId !== lineId),
      ]);
    } else {
      setTimetableRuns((prev) => [...newRuns, ...prev]);
    }
  };

  // Helper map for line data
  const lineMap = useMemo(() => {
    const map = new Map<string, Line>();
    allLines.forEach((l) => {
      map.set(l.id, l);
    });
    return map;
  }, [allLines]);

  // Selected Matrix Line
  const currentMatrixLine = useMemo(() => {
    return lineMap.get(matrixLineId) || allLines[0];
  }, [lineMap, matrixLineId, allLines]);

  // Stops for Matrix Line in sequential order
  const currentMatrixStops = useMemo(() => {
    if (!currentMatrixLine) return [];
    return allStops
      .filter((s) => s.lineId === currentMatrixLine.id || s.connectedLineIds.includes(currentMatrixLine.id))
      .sort((a, b) => a.sequence - b.sequence);
  }, [allStops, currentMatrixLine]);

  // Filtered timetable runs for Master List View
  const filteredRuns = useMemo(() => {
    return timetableRuns.filter((run) => {
      const line = lineMap.get(run.lineId);
      const category = line?.category || "RAIL";

      if (selectedCategory !== "ALL" && category !== selectedCategory) {
        return false;
      }

      if (selectedLineId !== "ALL" && run.lineId !== selectedLineId) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          run.tripCode.toLowerCase().includes(q) ||
          run.origin.toLowerCase().includes(q) ||
          run.destination.toLowerCase().includes(q) ||
          run.operatorName.toLowerCase().includes(q) ||
          (run.serviceClass && run.serviceClass.toLowerCase().includes(q)) ||
          (run.gateOrBay && run.gateOrBay.toLowerCase().includes(q)) ||
          (run.notes && run.notes.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [timetableRuns, selectedCategory, selectedLineId, searchQuery, lineMap]);

  // Statistics
  const uniqueOperatorsCount = useMemo(() => {
    const set = new Set(timetableRuns.map((r) => r.operatorName));
    return set.size;
  }, [timetableRuns]);

  const assignedGatesCount = useMemo(() => {
    return timetableRuns.filter((r) => Boolean(r.gateOrBay)).length;
  }, [timetableRuns]);

  const uniqueLinesCovered = useMemo(() => {
    const set = new Set(timetableRuns.map((r) => r.lineId));
    return set.size;
  }, [timetableRuns]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#070b14] overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 1. Header & View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 shadow-inner">
              <Clock className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {t.admin.timetableManager}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-950 text-teal-300 border border-teal-500/40">
              OCC-SCHED-01
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Author, inspect, and synchronize multi-modal scheduled runs with real-time stop dwell matrix and Pola Operasi generator.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Mode Switcher Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-white/10">
            <button
              type="button"
              onClick={() => setViewMode("MATRIX")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition btn-tactile ${
                viewMode === "MATRIX"
                  ? "bg-teal-500 text-teal-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>Stop-by-Trip Matrix</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("STRINGLINE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition btn-tactile ${
                viewMode === "STRINGLINE"
                  ? "bg-teal-500 text-teal-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Grafik Stringline</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("LIST")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition btn-tactile ${
                viewMode === "LIST"
                  ? "bg-teal-500 text-teal-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Master List</span>
            </button>
          </div>

          <button
            type="button"
            onClick={fetchTimetables}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-2 transition btn-tactile"
            title="Refresh timetable data"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-teal-400" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Undo Banner */}
      {lastDeletedRun && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/90 border border-teal-500/40 text-xs text-slate-200 shadow-xl">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400" />
            <span>
              Removed scheduled run <strong className="text-white">{lastDeletedRun.tripCode}</strong> ({lastDeletedRun.origin} &rarr; {lastDeletedRun.destination}).
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleUndoDelete}
              className="px-3 py-1 rounded-lg bg-teal-500 text-teal-950 font-bold text-xs hover:bg-teal-400 transition"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={() => setLastDeletedRun(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Executive KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Runs */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-slate-400 font-mono">Total Runs</span>
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {timetableRuns.length}
          </div>
          <div className="text-[10px] text-slate-400">Scheduled trips across all modes</div>
        </div>

        {/* Unique Operators */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-slate-400 font-mono">Operators & Airlines</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-300">
            {uniqueOperatorsCount}
          </div>
          <div className="text-[10px] text-slate-400">Active transit entities</div>
        </div>

        {/* Gate & Peron Coverage */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-slate-400 font-mono">Assigned Gates/Bays</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <DoorOpen className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400">
            {assignedGatesCount}
          </div>
          <div className="text-[10px] text-slate-400">Direct platform departure assignments</div>
        </div>

        {/* Line Network Coverage */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-slate-400 font-mono">Lines Covered</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300">
            {uniqueLinesCovered} <span className="text-xs text-slate-500 font-normal">of {allLines.length}</span>
          </div>
          <div className="text-[10px] text-slate-400">Multi-modal network coverage</div>
        </div>
      </div>

      {/* 3. CONDITIONAL VIEW: STOP-BY-TRIP MATRIX GRID VIEW */}
      {viewMode === "MATRIX" && (
        <div className="space-y-4">
          {/* Matrix Line Selector Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-bold uppercase font-mono tracking-wider">
                Corridor Line:
              </span>
              <select
                value={matrixLineId}
                onChange={(e) => setMatrixLineId(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-teal-500 transition"
              >
                {allLines.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code} &bull; {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Headway: <strong className="text-white">{currentMatrixLine?.headwayMinutes || 5} min</strong></span>
              <span>&bull;</span>
              <span>Span: <strong className="text-white">{currentMatrixLine?.firstDeparture || "05:00"} - {currentMatrixLine?.lastDeparture || "23:00"}</strong></span>
            </div>
          </div>

          {currentMatrixLine && (
            <TimetableMatrixGrid
              selectedLine={currentMatrixLine}
              lineStops={currentMatrixStops}
              runs={timetableRuns}
              onUpdateRun={handleUpdateRun}
              onDeleteRun={handleDeleteRun}
              onShiftRun={handleShiftRun}
              onOpenBatchModal={() => setIsBatchModalOpen(true)}
              onOpenCreateModal={handleOpenCreateModal}
              onEditRun={handleOpenEditModal}
            />
          )}
        </div>
      )}

      {/* 3B. CONDITIONAL VIEW: GRAPHICAL TRAIN STRINGLINE (MAREY CHART / GAPEKA ZUGDIAGRAMM) */}
      {viewMode === "STRINGLINE" && (
        <div className="space-y-4">
          {/* Corridor Line Selector Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-bold uppercase font-mono tracking-wider">
                Corridor Line:
              </span>
              <select
                value={matrixLineId}
                onChange={(e) => setMatrixLineId(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-teal-500 transition"
              >
                {allLines.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code} &bull; {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 pr-2 border-r border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Headway: <strong className="text-white">{currentMatrixLine?.headwayMinutes || 5} min</strong></span>
                <span>&bull;</span>
                <span>Span: <strong className="text-white">{currentMatrixLine?.firstDeparture || "05:00"} - {currentMatrixLine?.lastDeparture || "23:00"}</strong></span>
              </div>

              <button
                type="button"
                onClick={() => setIsBatchModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/20 text-xs font-semibold flex items-center gap-1.5 transition btn-tactile"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Pola Operasi Batch</span>
              </button>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="px-3 py-1.5 rounded-xl bg-teal-500 text-teal-950 hover:bg-teal-400 text-xs font-bold flex items-center gap-1.5 transition btn-tactile"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Perjalanan</span>
              </button>
            </div>
          </div>

          {currentMatrixLine && (
            <TimetableStringlineChart
              selectedLine={currentMatrixLine}
              lineStops={currentMatrixStops}
              runs={timetableRuns}
              onSelectRun={(run) => handleOpenEditModal(run)}
              onEditRun={(run) => handleOpenEditModal(run)}
            />
          )}
        </div>
      )}

      {/* 4. CONDITIONAL VIEW: MASTER LIST REGISTRY VIEW */}
      {viewMode === "LIST" && (
        <div className="space-y-4">
          {/* Filter Controls & Search */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  data-hotkey-search="true"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by Trip Code (G1012), Operator, Origin, Gate, Service Class, or Notes..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition"
                />
              </div>

              {/* Line Filter */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-400 font-medium">Line:</span>
                <select
                  value={selectedLineId}
                  onChange={(e) => setSelectedLineId(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition max-w-[200px] truncate"
                >
                  <option value="ALL">All Network Lines</option>
                  {allLines.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.code} - {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category Pill Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
              {(["ALL", "RAIL", "AVIATION", "BUS", "MARITIME"] as const).map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition btn-tactile flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-teal-500 text-teal-950 font-bold"
                        : "bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    {cat === "ALL" && <Layers className="w-3.5 h-3.5" />}
                    {cat === "RAIL" && <Train className="w-3.5 h-3.5" />}
                    {cat === "AVIATION" && <Plane className="w-3.5 h-3.5" />}
                    {cat === "BUS" && <Bus className="w-3.5 h-3.5" />}
                    {cat === "MARITIME" && <Anchor className="w-3.5 h-3.5" />}
                    <span>{cat === "ALL" ? "All Modes" : cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timetable Runs Listing */}
          <div className="rounded-2xl bg-slate-900/80 border border-white/10 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Scheduled Timetable Registry</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                  {filteredRuns.length} Runs
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>Batch Generator</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-teal-950 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Run</span>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-400" />
                <span>Loading scheduled timetable runs...</span>
              </div>
            ) : filteredRuns.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-950 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                  <Calendar className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No scheduled runs found matching your search or filters. Click &quot;Add Scheduled Run&quot; to author a new timetable trip.
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-teal-950 font-bold text-xs inline-flex items-center gap-2 shadow transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Run</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredRuns.map((run) => {
                  const line = lineMap.get(run.lineId);
                  const colorHex = line?.colorHex || "#0d9488";
                  const lineCode = line?.code || "TRN";

                  return (
                    <div
                      key={run.id}
                      className="p-4 hover:bg-slate-800/40 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      {/* Left: Trip Code, Mode, Origin & Destination */}
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span
                            style={{ backgroundColor: `${colorHex}25`, borderColor: `${colorHex}60`, color: colorHex }}
                            className="px-2 py-0.5 rounded text-xs font-mono font-bold border"
                          >
                            {run.tripCode}
                          </span>
                          <span className="text-xs font-semibold text-slate-300">
                            {run.operatorName}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-white/10 text-slate-400">
                            Line {lineCode}
                          </span>
                          {run.serviceClass && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/40 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-cyan-400" />
                              <span>{run.serviceClass}</span>
                            </span>
                          )}
                        </div>

                        {/* Route Corridor */}
                        <div className="flex items-center gap-2 text-xs text-slate-200">
                          <div className="flex items-center gap-1.5 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                            <span>{run.origin}</span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <div className="flex items-center gap-1.5 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span>{run.destination}</span>
                          </div>
                        </div>

                        {/* Operational Notes */}
                        {run.notes && (
                          <p className="text-[11px] text-slate-400 italic bg-slate-950/40 p-2 rounded-lg border border-white/5 line-clamp-2">
                            &ldquo;{run.notes}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Middle: Timing, Platform & Baggage */}
                      <div className="flex items-center gap-4 sm:gap-6 shrink-0 text-xs">
                        {/* Schedule */}
                        <div className="space-y-0.5">
                          <div className="text-[10px] uppercase font-mono text-slate-400">Schedule</div>
                          <div className="font-mono font-bold text-white text-sm flex items-center gap-1.5">
                            <span className="text-emerald-400">{run.departureTime}</span>
                            <span className="text-slate-600">&rarr;</span>
                            <span className="text-cyan-400">{run.arrivalTime}</span>
                          </div>
                        </div>

                        {/* Gate / Bay / Peron */}
                        {run.gateOrBay && (
                          <div className="space-y-0.5">
                            <div className="text-[10px] uppercase font-mono text-slate-400">Boarding</div>
                            <div className="font-mono text-xs font-semibold text-amber-300 flex items-center gap-1">
                              <DoorOpen className="w-3.5 h-3.5 text-amber-400" />
                              <span>{run.gateOrBay}</span>
                            </div>
                          </div>
                        )}

                        {/* Baggage Belt */}
                        {run.baggageBelt && (
                          <div className="space-y-0.5 hidden sm:block">
                            <div className="text-[10px] uppercase font-mono text-slate-400">Baggage</div>
                            <div className="font-mono text-xs font-semibold text-indigo-300 flex items-center gap-1">
                              <Luggage className="w-3.5 h-3.5 text-indigo-400" />
                              <span>{run.baggageBelt}</span>
                            </div>
                          </div>
                        )}

                        {/* Days of Week */}
                        <div className="space-y-0.5 hidden md:block">
                          <div className="text-[10px] uppercase font-mono text-slate-400">Days</div>
                          <div className="flex items-center gap-1">
                            {DAYS_OF_WEEK.map((d) => {
                              const isActive = run.daysOfWeek?.includes(d.day) ?? true;
                              return (
                                <span
                                  key={d.day}
                                  className={`w-4 h-4 rounded text-[10px] font-mono font-bold flex items-center justify-center ${
                                    isActive
                                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                                      : "bg-slate-950 text-slate-600 border border-white/5"
                                  }`}
                                >
                                  {d.shortLabel}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(run)}
                          className="p-2 rounded-xl bg-slate-950/80 border border-white/10 hover:bg-slate-800 text-slate-300 hover:text-white transition btn-tactile"
                          title="Edit Scheduled Run"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRun(run.id)}
                          className="p-2 rounded-xl bg-slate-950/80 border border-white/10 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 hover:border-rose-500/40 transition btn-tactile"
                          title="Delete Scheduled Run"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Authoring / Edit Modal for Single Run */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div
            ref={containerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="timetable-modal-title"
            onKeyDown={handleTrapKeyDown}
            className="w-full max-w-2xl bg-[#0c1222] border border-teal-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] focus:outline-none"
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 id="timetable-modal-title" className="text-sm font-bold text-white">
                  {editingRunId ? "Edit Scheduled Run" : "Add Scheduled Transit Run"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-5 space-y-4 text-xs">
              {/* Quick Template Presets (Only on Create) */}
              {!editingRunId && (
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-teal-500/20 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Quick Fill from Authentic Preset:</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {QUICK_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.label}
                        type="button"
                        onClick={() => handleApplyTemplate(tpl)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 text-[10px] font-semibold transition"
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form id="timetable-run-form" onSubmit={handleSubmit} className="space-y-4">
                {/* Line & Operator */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-slate-400 font-medium">Transit Line *</label>
                    <select
                      value={formLineId}
                      onChange={(e) => setFormLineId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 focus:outline-none focus:border-teal-500"
                      required
                    >
                      {allLines.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.code} - {l.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-400 font-medium">Operator / Carrier Name *</label>
                    <input
                      type="text"
                      value={formOperatorName}
                      onChange={(e) => setFormOperatorName(e.target.value)}
                      placeholder="e.g. KCIC, Garuda Indonesia, KAI"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 focus:outline-none focus:border-teal-500"
                      required
                    />
                  </div>
                </div>

                {/* Trip Code & Service Class */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-slate-400 font-medium">Trip / Flight Code *</label>
                    <input
                      type="text"
                      value={formTripCode}
                      onChange={(e) => setFormTripCode(e.target.value)}
                      placeholder="e.g. G1012, GA-404, KA-01, M-101"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 font-mono uppercase focus:outline-none focus:border-teal-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-400 font-medium">Service Class</label>
                    <input
                      type="text"
                      value={formServiceClass}
                      onChange={(e) => setFormServiceClass(e.target.value)}
                      placeholder="e.g. First Class & Premium Economy"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                {/* Origin & Destination */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-slate-400 font-medium">Origin Station / Terminal *</label>
                    <input
                      type="text"
                      value={formOrigin}
                      onChange={(e) => setFormOrigin(e.target.value)}
                      placeholder="e.g. Stasiun Halim HSR"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 focus:outline-none focus:border-teal-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-400 font-medium">Destination Terminus *</label>
                    <input
                      type="text"
                      value={formDestination}
                      onChange={(e) => setFormDestination(e.target.value)}
                      placeholder="e.g. Stasiun Tegalluar Summarecon"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 focus:outline-none focus:border-teal-500"
                      required
                    />
                  </div>
                </div>

                {/* Timing (Departure & Arrival) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-slate-400 font-medium">Departure Time (HH:mm) *</label>
                    <input
                      type="text"
                      value={formDepartureTime}
                      onChange={(e) => setFormDepartureTime(e.target.value)}
                      placeholder="08:30"
                      pattern="^([01]\d|2[0-3]):[0-5]\d$"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 font-mono focus:outline-none focus:border-teal-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-400 font-medium">Arrival Time (HH:mm) *</label>
                    <input
                      type="text"
                      value={formArrivalTime}
                      onChange={(e) => setFormArrivalTime(e.target.value)}
                      placeholder="09:15"
                      pattern="^([01]\d|2[0-3]):[0-5]\d$"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 font-mono focus:outline-none focus:border-teal-500"
                      required
                    />
                  </div>
                </div>

                {/* Platform / Gate / Bay & Baggage Belt */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-slate-400 font-medium">Gate / Bay / Peron</label>
                    <input
                      type="text"
                      value={formGateOrBay}
                      onChange={(e) => setFormGateOrBay(e.target.value)}
                      placeholder="e.g. Gate 1, Peron 2 Jalur 3, Bay 3"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-400 font-medium">Baggage Belt (Optional)</label>
                    <input
                      type="text"
                      value={formBaggageBelt}
                      onChange={(e) => setFormBaggageBelt(e.target.value)}
                      placeholder="e.g. Belt 4"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                {/* Days of Operation */}
                <div className="space-y-1.5">
                  <label className="block text-slate-400 font-medium">Operational Days</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {DAYS_OF_WEEK.map((d) => {
                      const isChecked = formDaysOfWeek.includes(d.day);
                      return (
                        <button
                          key={d.day}
                          type="button"
                          onClick={() => handleToggleDay(d.day)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            isChecked
                              ? "bg-teal-500 text-teal-950 font-bold"
                              : "bg-slate-950 text-slate-400 border border-white/10 hover:bg-slate-900"
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Operational Advisory Notes */}
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Operational Advisory Notes</label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="e.g. Boarding gate closes 5 minutes prior to departure. Free onboard Wi-Fi."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 focus:outline-none focus:border-teal-500 resize-none"
                  />
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-slate-950/60 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="timetable-run-form"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-teal-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition btn-tactile"
              >
                {isSubmitting ? "Saving..." : editingRunId ? "Update Scheduled Run" : "Create Scheduled Run"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Batch Pola Operasi Generator Modal */}
      {isBatchModalOpen && (
        <BatchScheduleModal
          isOpen={isBatchModalOpen}
          onClose={() => setIsBatchModalOpen(false)}
          lines={allLines}
          allStops={allStops}
          initialLineId={matrixLineId}
          existingRuns={timetableRuns}
          onRunsGenerated={handleRunsGenerated}
        />
      )}
    </div>
  );
}

export default function AdminTimetableStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-8 text-slate-400 text-xs">
          Loading Timetable Studio...
        </div>
      }
    >
      <TimetableStudioContent />
    </Suspense>
  );
}
