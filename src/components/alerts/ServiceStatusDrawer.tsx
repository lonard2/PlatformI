/**
 * PlatformI - Complete Network Service Status & Incident History Center
 *
 * Provides real-time operational status for all transit lines, past incident history,
 * maintenance calendar logs, and 30-day network uptime & on-time performance (OTP) metrics.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Info,
  Search,
  X,
  Layers,
  Train,
  Bus,
  Plane,
  Anchor,
  Clock,
  ArrowRight,
  Filter,
  RefreshCw,
  Calendar,
  TrendingUp,
  BarChart3,
  Check,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  DisruptionAlert,
  TransitCategory,
  TransitMode,
  Line,
  HistoricalIncidentEvent,
  SystemUptimeMetric,
} from "@/types/transit";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import {
  DISRUPTION_ALERTS,
  HISTORICAL_INCIDENTS,
  SYSTEM_UPTIME_METRICS,
} from "@/lib/data/jakarta-dataset";

export interface ServiceStatusDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type MainTab = "LIVE" | "HISTORY" | "UPTIME";
type SeverityFilter = "ALL" | "CRITICAL" | "WARNING" | "NORMAL";

export const ServiceStatusDrawer: React.FC<ServiceStatusDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>("LIVE");
  const [alerts, setAlerts] = useState<DisruptionAlert[]>(DISRUPTION_ALERTS);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<TransitCategory | "ALL">("ALL");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("ALL");
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // History tab filter state
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string>("ALL");
  const [selectedHistorySeverity, setSelectedHistorySeverity] = useState<string>("ALL");

  const allLines = useTransitStore((state) => state.allLines);
  const selectLine = useTransitStore((state) => state.selectLine);

  const fetchAlerts = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) {
        const data = (await res.json()) as { success: boolean; data: DisruptionAlert[] };
        if (data.success && Array.isArray(data.data)) {
          setAlerts(data.data);
        }
      }
    } catch {
      // Fallback to local dataset
    } finally {
      setIsRefreshing(false);
      setLastUpdated(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "Asia/Jakarta",
        }) + " WIB"
      );
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAlerts();
    }
  }, [isOpen]);

  // Network Statistics
  const stats = useMemo(() => {
    const activeAlertsList = alerts.filter((a) => a.status === "ACTIVE");
    const disruptedLineIds = new Set(activeAlertsList.map((a) => a.lineId));
    const totalLines = allLines.length;
    const normalLines = totalLines - disruptedLineIds.size;
    const onTimePercentage = totalLines > 0 ? Math.round((normalLines / totalLines) * 100) : 100;

    const criticalCount = activeAlertsList.filter((a) => a.severity === "CRITICAL").length;
    const warningCount = activeAlertsList.filter((a) => a.severity === "WARNING").length;
    const infoCount = activeAlertsList.filter((a) => a.severity === "INFO").length;

    return {
      totalLines,
      normalLines,
      disruptedLines: disruptedLineIds.size,
      onTimePercentage,
      criticalCount,
      warningCount,
      infoCount,
    };
  }, [alerts, allLines]);

  // Filtered Live Lines
  const filteredLines = useMemo(() => {
    return allLines.filter((line) => {
      if (activeCategory !== "ALL" && line.category !== activeCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = line.code.toLowerCase().includes(q);
        const matchesName = line.name.toLowerCase().includes(q);
        if (!matchesCode && !matchesName) return false;
      }
      const lineAlerts = alerts.filter((a) => a.lineId === line.id && a.status === "ACTIVE");
      const hasCritical = lineAlerts.some((a) => a.severity === "CRITICAL");
      const hasWarning = lineAlerts.some((a) => a.severity === "WARNING");
      const isNormal = lineAlerts.length === 0;

      if (severityFilter === "CRITICAL" && !hasCritical) return false;
      if (severityFilter === "WARNING" && !hasWarning && !hasCritical) return false;
      if (severityFilter === "NORMAL" && !isNormal) return false;

      return true;
    });
  }, [allLines, alerts, activeCategory, searchQuery, severityFilter]);

  // Filtered History Events
  const filteredHistory = useMemo(() => {
    return HISTORICAL_INCIDENTS.filter((item) => {
      if (selectedHistoryDate !== "ALL" && item.date !== selectedHistoryDate) {
        return false;
      }
      if (selectedHistorySeverity !== "ALL" && item.severity !== selectedHistorySeverity) {
        return false;
      }
      return true;
    });
  }, [selectedHistoryDate, selectedHistorySeverity]);

  if (!isOpen) return null;

  const getCategoryIcon = (category: TransitCategory) => {
    switch (category) {
      case "RAIL":
        return <Train className="w-3.5 h-3.5" />;
      case "BUS":
        return <Bus className="w-3.5 h-3.5" />;
      case "AVIATION":
        return <Plane className="w-3.5 h-3.5" />;
      case "MARITIME":
        return <Anchor className="w-3.5 h-3.5" />;
    }
  };

  const handleSelectLine = (lineId: string) => {
    selectLine(lineId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full sm:w-[580px] h-full bg-[#0c1220] border-l border-white/15 flex flex-col shadow-2xl overflow-hidden text-slate-100 animate-in slide-in-from-right duration-250">
        {/* 1. MAIN HEADER */}
        <div className="px-5 py-4 border-b border-white/10 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Pusat Operasional & Keandalan
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 font-mono font-medium">
                  {stats.onTimePercentage}% Normal
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pemantauan status langsung, riwayat gangguan, dan performa uptime
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAlerts}
              title="Perbarui Maklumat"
              disabled={isRefreshing}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. THREE PRIMARY TABS */}
        <div className="px-5 pt-2 bg-slate-900/60 border-b border-white/10 flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveMainTab("LIVE")}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
              activeMainTab === "LIVE"
                ? "border-cyan-400 text-cyan-300 bg-cyan-950/40 shadow-sm"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Status Langsung</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
              {stats.disruptedLines > 0 ? stats.disruptedLines : "OK"}
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab("HISTORY")}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
              activeMainTab === "HISTORY"
                ? "border-cyan-400 text-cyan-300 bg-cyan-950/40 shadow-sm"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Riwayat & Kalender</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
              {HISTORICAL_INCIDENTS.length}
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab("UPTIME")}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
              activeMainTab === "UPTIME"
                ? "border-cyan-400 text-cyan-300 bg-cyan-950/40 shadow-sm"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Indeks Keandalan (Uptime)</span>
          </button>
        </div>

        {/* 3. TAB 1: LIVE STATUS */}
        {activeMainTab === "LIVE" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* KPI HUD STRIP */}
            <div className="px-5 py-3 bg-slate-950/80 border-b border-white/10 grid grid-cols-4 gap-2 text-center shrink-0">
              <div className="p-2 rounded-lg bg-slate-900/70 border border-white/5">
                <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Total Jalur</div>
                <div className="text-sm font-bold text-slate-200 font-mono">{stats.totalLines}</div>
              </div>
              <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/20">
                <div className="text-[10px] uppercase font-bold text-emerald-400 font-mono">Normal</div>
                <div className="text-sm font-bold text-emerald-300 font-mono">{stats.normalLines}</div>
              </div>
              <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/20">
                <div className="text-[10px] uppercase font-bold text-amber-400 font-mono">Peringatan</div>
                <div className="text-sm font-bold text-amber-300 font-mono">{stats.warningCount}</div>
              </div>
              <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/20">
                <div className="text-[10px] uppercase font-bold text-rose-400 font-mono">Kritis</div>
                <div className="text-sm font-bold text-rose-300 font-mono">{stats.criticalCount}</div>
              </div>
            </div>

            {/* FILTERS & SEARCH BAR */}
            <div className="p-4 bg-slate-950/60 border-b border-white/10 space-y-2.5 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kode jalur atau rute (misal MRT, Koridor 1, Cikarang)..."
                  className="w-full bg-slate-900 border border-white/15 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 transition"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                <button
                  onClick={() => setActiveCategory("ALL")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                    activeCategory === "ALL"
                      ? "bg-cyan-950/80 border-cyan-500/50 text-cyan-300 shadow-md"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Semua Moda
                </button>
                {(["RAIL", "BUS", "AVIATION", "MARITIME"] as TransitCategory[]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                      activeCategory === cat
                        ? "bg-cyan-950/80 border-cyan-500/50 text-cyan-300 shadow-md"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {getCategoryIcon(cat)}
                    <span>{cat === "RAIL" ? "Kereta" : cat === "BUS" ? "Bus / Feeder" : cat === "AVIATION" ? "Udara" : "Laut"}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-slate-400 font-mono">Status:</span>
                {(["ALL", "CRITICAL", "WARNING", "NORMAL"] as SeverityFilter[]).map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono border transition ${
                      severityFilter === sev
                        ? "bg-slate-800 border-white/30 text-white font-bold"
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {sev === "ALL" ? "SEMUA" : sev === "NORMAL" ? "NORMAL" : sev === "WARNING" ? "PERINGATAN" : "KRITIS"}
                  </button>
                ))}
              </div>
            </div>

            {/* LINE BULLETINS LIST */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {filteredLines.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Tidak ada jalur transit yang cocok dengan kriteria pencarian.
                </div>
              ) : (
                filteredLines.map((line) => {
                  const lineAlerts = alerts.filter(
                    (a) => a.lineId === line.id && a.status === "ACTIVE"
                  );
                  const isExpanded = expandedLineId === line.id;
                  const hasCritical = lineAlerts.some((a) => a.severity === "CRITICAL");
                  const hasWarning = lineAlerts.some((a) => a.severity === "WARNING");

                  let statusBadge = (
                    <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Normal</span>
                    </div>
                  );

                  if (hasCritical) {
                    statusBadge = (
                      <div className="flex items-center gap-1 text-[11px] font-bold text-rose-400 font-mono animate-pulse">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Gangguan Kritis</span>
                      </div>
                    );
                  } else if (hasWarning) {
                    statusBadge = (
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 font-mono">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Peringatan Operasi</span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={line.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        hasCritical
                          ? "bg-rose-950/20 border-rose-500/40 hover:border-rose-500/60"
                          : hasWarning
                          ? "bg-amber-950/20 border-amber-500/40 hover:border-amber-500/60"
                          : "bg-slate-900/60 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div
                        onClick={() => setExpandedLineId(isExpanded ? null : line.id)}
                        className="flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="px-2 py-0.5 rounded text-[11px] font-bold font-mono shadow-sm"
                            style={{
                              backgroundColor: line.colorHex,
                              color: line.textColorHex,
                            }}
                          >
                            {line.code}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white leading-tight">
                              {line.name}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Antara Kedatangan: ~{line.headwayMinutes} mnt &bull; Operasi {line.firstDeparture} - {line.lastDeparture}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">{statusBadge}</div>
                      </div>

                      {/* Expanded Alerts */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2.5 animate-in fade-in duration-150">
                          {lineAlerts.length === 0 ? (
                            <div className="text-xs text-slate-400 font-mono flex items-center justify-between">
                              <span>Semua perjalanan beroperasi sesuai jadwal reguler.</span>
                              <button
                                onClick={() => handleSelectLine(line.id)}
                                className="px-2.5 py-1 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold hover:bg-cyan-900/50 transition flex items-center gap-1"
                              >
                                <span>Lihat di Peta</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            lineAlerts.map((alert) => (
                              <div
                                key={alert.id}
                                className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                                  alert.severity === "CRITICAL"
                                    ? "bg-rose-950/40 border-rose-500/40 text-rose-200"
                                    : alert.severity === "WARNING"
                                    ? "bg-amber-950/40 border-amber-500/40 text-amber-200"
                                    : "bg-slate-800/80 border-slate-700 text-slate-300"
                                }`}
                              >
                                <div className="font-bold flex items-center justify-between">
                                  <span>{alert.title}</span>
                                  <span className="text-[10px] font-mono opacity-70">
                                    {new Date(alert.startTime).toLocaleTimeString("id-ID", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })} WIB
                                  </span>
                                </div>
                                <p className="text-[11px] leading-relaxed opacity-90">
                                  {alert.description}
                                </p>
                                {alert.affectedStops && alert.affectedStops.length > 0 && (
                                  <div className="text-[10px] font-mono opacity-80 pt-1">
                                    Halte/Stasiun Terdampak: <strong>{alert.affectedStops.join(", ")}</strong>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 4. TAB 2: INCIDENT HISTORY & EVENT CALENDAR */}
        {activeMainTab === "HISTORY" && (
          <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
            {/* 7-DAY CALENDAR DATE STRIP */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  Kalender Riwayat Peristiwa (Agustus 2026)
                </span>
                <span className="text-[10px]">Pilih tanggal</span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <button
                  onClick={() => setSelectedHistoryDate("ALL")}
                  className={`px-3 py-2 rounded-xl border text-xs font-mono font-bold transition shrink-0 ${
                    selectedHistoryDate === "ALL"
                      ? "bg-cyan-950 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-950/60"
                      : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Semua Tanggal
                </button>
                {["2026-08-22", "2026-08-21", "2026-08-20", "2026-08-19", "2026-08-18", "2026-08-17", "2026-08-16"].map(
                  (dStr) => {
                    const isSelected = selectedHistoryDate === dStr;
                    const dateNum = dStr.split("-")[2];
                    const count = HISTORICAL_INCIDENTS.filter((h) => h.date === dStr).length;

                    return (
                      <button
                        key={dStr}
                        onClick={() => setSelectedHistoryDate(dStr)}
                        className={`flex flex-col items-center justify-between px-3 py-1.5 rounded-xl border transition shrink-0 ${
                          isSelected
                            ? "bg-slate-800 border-cyan-400 text-white shadow-md shadow-cyan-950/60 ring-1 ring-cyan-400"
                            : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <span className="text-[10px] font-mono uppercase">Agu</span>
                        <span className="text-sm font-bold font-mono text-white">{dateNum}</span>
                        <span className="text-[9px] font-mono text-cyan-400">{count} Catatan</span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* INCIDENT TIMELINE LIST */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredHistory.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs font-mono">
                  Tidak ada catatan gangguan pada tanggal yang dipilih.
                </div>
              ) : (
                filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 space-y-2 text-xs shadow-md"
                  >
                    {/* Header: Line Code & Resolved Badge */}
                    <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-[10px]">
                          [{item.lineCode}] {item.lineName}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {item.date} &bull; {item.startTime} - {item.resolvedTime} WIB
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Selesai ({item.durationMinutes} mnt)
                      </span>
                    </div>

                    {/* Incident Title & Description */}
                    <div>
                      <h4 className="text-xs font-bold text-white tracking-tight">{item.title}</h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed pt-0.5">{item.description}</p>
                    </div>

                    {/* Root Cause & Resolution Card */}
                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1 text-[11px] font-mono">
                      <div>
                        <span className="text-amber-400 font-semibold">Penyebab: </span>
                        <span className="text-slate-300">{item.rootCause}</span>
                      </div>
                      <div>
                        <span className="text-emerald-400 font-semibold">Tindakan Rekayasa: </span>
                        <span className="text-slate-300">{item.mitigationAction}</span>
                      </div>
                      {item.affectedStops.length > 0 && (
                        <div className="text-slate-400 pt-0.5">
                          Titik Terdampak: <strong className="text-slate-200">{item.affectedStops.join(", ")}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 5. TAB 3: SYSTEM UPTIME & RELIABILITY KPI */}
        {activeMainTab === "UPTIME" && (
          <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
            {/* KPI OVERVIEW HERO */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-cyan-950/40 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  Rata-Rata Keandalan Seluruh Jaringan (30 Hari)
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold">Prima (Target &gt;95%)</span>
              </div>
              <div className="flex items-baseline gap-4 pt-1">
                <div>
                  <div className="text-3xl font-black font-mono text-white">98.15%</div>
                  <span className="text-[10px] text-slate-400 font-mono">Indeks On-Time (OTP)</span>
                </div>
                <div className="border-l border-white/10 pl-4">
                  <div className="text-3xl font-black font-mono text-cyan-300">14.8 mnt</div>
                  <span className="text-[10px] text-slate-400 font-mono">Rata-Rata Penanganan (MTTR)</span>
                </div>
              </div>
            </div>

            {/* DETAILED MODE-BY-MODE UPTIME LIST */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {SYSTEM_UPTIME_METRICS.map((metric) => (
                <div
                  key={metric.mode}
                  className="p-3 rounded-xl bg-slate-900/80 border border-white/10 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <strong className="text-white font-bold">{metric.systemName}</strong>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({metric.totalTrips30Days.toLocaleString()} Trip/Bulan)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-emerald-400 font-bold text-xs">{metric.uptimePercent30Days}% Uptime</span>
                      <span className="text-slate-500">&bull;</span>
                      <span className="text-cyan-300 font-bold text-xs">{metric.onTimePerformancePercent}% OTP</span>
                    </div>
                  </div>

                  {/* 7-Day Mini Status Tiles */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] font-mono text-slate-400">
                    <span>Status 7 Hari Terakhir:</span>
                    <div className="flex items-center gap-1">
                      {metric.statusHistory7Days.map((status: "NORMAL" | "LIMITED" | "DISRUPTED", sIdx: number) => (
                        <div
                          key={sIdx}
                          title={`H-${7 - sIdx}: ${status}`}
                          className={`w-3.5 h-3.5 rounded-md ${
                            status === "NORMAL"
                              ? "bg-emerald-500"
                              : status === "LIMITED"
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. FOOTER BAR */}
        <div className="px-5 py-3 border-t border-white/10 bg-slate-950/90 text-slate-400 text-xs flex items-center justify-between font-mono shrink-0">
          <span>Pusat Maklumat Kendali &bull; OCC Dukuh Atas</span>
          <span>Diperbarui: {lastUpdated || "Baru saja"}</span>
        </div>
      </div>
    </div>
  );
};
