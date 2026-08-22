/**
 * PlatformI - Complete Network Service Status Drawer
 *
 * Provides real-time operational status for all transit lines across
 * Rail, Bus, Aviation, and Maritime networks with severity filtering and search.
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
} from "lucide-react";
import { DisruptionAlert, TransitCategory, TransitMode, Line } from "@/types/transit";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { DISRUPTION_ALERTS } from "@/lib/data/jakarta-dataset";

export interface ServiceStatusDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type SeverityFilter = "ALL" | "CRITICAL" | "WARNING" | "NORMAL";

export const ServiceStatusDrawer: React.FC<ServiceStatusDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [alerts, setAlerts] = useState<DisruptionAlert[]>(DISRUPTION_ALERTS);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<TransitCategory | "ALL">("ALL");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("ALL");
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

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
      // Fallback
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

  // Filtered Lines
  const filteredLines = useMemo(() => {
    return allLines.filter((line) => {
      // Category filter
      if (activeCategory !== "ALL" && line.category !== activeCategory) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = line.code.toLowerCase().includes(q);
        const matchesName = line.name.toLowerCase().includes(q);
        if (!matchesCode && !matchesName) return false;
      }

      // Severity filter
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
      <div className="w-full sm:w-[540px] h-full bg-[#0c1220] border-l border-white/15 flex flex-col shadow-2xl overflow-hidden text-slate-100 animate-in slide-in-from-right duration-250">
        {/* 1. HEADER */}
        <div className="px-5 py-4 border-b border-white/10 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-400/30">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Service Disruption Center
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 font-mono font-medium">
                  {stats.onTimePercentage}% Normal
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Network-wide operational status & live bulletins
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAlerts}
              title="Refresh Bulletins"
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

        {/* 2. KPI STATUS HUD STRIP */}
        <div className="px-5 py-3 bg-slate-950/80 border-b border-white/10 grid grid-cols-4 gap-2 text-center shrink-0">
          <div className="p-2 rounded-lg bg-slate-900/70 border border-white/5">
            <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Lines</div>
            <div className="text-sm font-bold text-slate-200 font-mono">{stats.totalLines}</div>
          </div>
          <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/20">
            <div className="text-[10px] uppercase font-bold text-emerald-400 font-mono">Normal</div>
            <div className="text-sm font-bold text-emerald-300 font-mono">{stats.normalLines}</div>
          </div>
          <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/20">
            <div className="text-[10px] uppercase font-bold text-amber-400 font-mono">Warning</div>
            <div className="text-sm font-bold text-amber-300 font-mono">{stats.warningCount}</div>
          </div>
          <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/20">
            <div className="text-[10px] uppercase font-bold text-rose-400 font-mono">Critical</div>
            <div className="text-sm font-bold text-rose-300 font-mono">{stats.criticalCount}</div>
          </div>
        </div>

        {/* 3. FILTERS & SEARCH BAR */}
        <div className="p-4 bg-slate-950/60 border-b border-white/10 space-y-2.5 shrink-0">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by line code or name (e.g. MRT-NS, Corridor 1)..."
              className="w-full bg-slate-900 border border-white/15 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 transition"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
            <button
              onClick={() => setActiveCategory("ALL")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                activeCategory === "ALL"
                  ? "bg-cyan-950/80 border-cyan-500/50 text-cyan-300 shadow-md"
                  : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              All Categories
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
                <span>{cat.charAt(0) + cat.slice(1).toLowerCase()}</span>
              </button>
            ))}
          </div>

          {/* Severity Pills */}
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
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* 4. LINE BULLETINS LIST */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {filteredLines.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No transit lines matched your search and filter criteria.
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
                  <span>Normal Service</span>
                </div>
              );

              if (hasCritical) {
                statusBadge = (
                  <div className="flex items-center gap-1 text-[11px] font-bold text-rose-400 font-mono">
                    <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
                    <span>Critical Disruption</span>
                  </div>
                );
              } else if (hasWarning) {
                statusBadge = (
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 font-mono">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Advisory Reported</span>
                  </div>
                );
              }

              return (
                <div
                  key={line.id}
                  className="rounded-xl border border-white/10 bg-slate-900/80 hover:border-white/20 transition overflow-hidden shadow-md"
                >
                  <div
                    onClick={() =>
                      lineAlerts.length > 0
                        ? setExpandedLineId(isExpanded ? null : line.id)
                        : handleSelectLine(line.id)
                    }
                    className="p-3.5 flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        style={{
                          backgroundColor: `${line.colorHex}20`,
                          borderColor: `${line.colorHex}60`,
                          color: line.colorHex,
                        }}
                        className="px-2.5 py-1 rounded-lg border text-xs font-mono font-bold shrink-0"
                      >
                        {line.code}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-semibold text-white truncate">
                          {line.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {line.firstDeparture} - {line.lastDeparture}
                          </span>
                          <span>&bull;</span>
                          <span>Headway: {line.headwayMinutes}m</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {statusBadge}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectLine(line.id);
                        }}
                        title="Highlight Line on Map"
                        className="p-1 rounded-md bg-slate-800 hover:bg-cyan-900/60 text-slate-400 hover:text-cyan-300 transition"
                      >
                        <Layers className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Active Alerts Section */}
                  {lineAlerts.length > 0 && (
                    <div className="border-t border-white/10 bg-slate-950/60 p-3 space-y-2 text-xs">
                      {lineAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-amber-300">
                              {alert.title}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {alert.severity}
                            </span>
                          </div>
                          <p className="text-slate-300 text-[11px] leading-relaxed">
                            {alert.description}
                          </p>
                          {alert.affectedStops.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono text-slate-400 pt-1">
                              <span>Stops:</span>
                              {alert.affectedStops.map((stop, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="px-1.5 py-0.5 rounded bg-slate-900 border border-white/10 text-slate-300"
                                >
                                  {stop}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 5. FOOTER */}
        <div className="p-3 bg-slate-950 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 font-mono shrink-0">
          <span>Last Bulletin Sync: {lastUpdated || "Live"}</span>
          <span>PT Integrasi Transit Jakarta</span>
        </div>
      </div>
    </div>
  );
};
