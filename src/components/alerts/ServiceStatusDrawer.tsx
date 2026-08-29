/**
 * PlatformI - Complete Network Service Status & Incident History Center
 *
 * Provides real-time operational status for all transit lines, interactive multi-month
 * incident & maintenance calendar, multi-window historical uptime analytics (30d/90d/180d/365d),
 * and monthly reliability progression trends.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Info,
  Search,
  X,
      Clock,
    ArrowRight,
  RefreshCw,
  Calendar as CalendarIcon,
  TrendingUp,
  BarChart3,
    Check,
  ChevronLeft,
  ChevronRight,
    Globe,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  DisruptionAlert,
  TransitCategory,
  TransitMode,
  Line,
  HistoricalIncidentEvent,
  SystemUptimeMetric,
  MonthlyUptimeRecord,
} from "@/types/transit";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import {
  DISRUPTION_ALERTS,
  HISTORICAL_INCIDENTS,
  SYSTEM_UPTIME_METRICS,
} from "@/lib/data/jakarta-dataset";
import { useTranslation, SupportedLanguage } from "@/lib/i18n";

export interface ServiceStatusDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type MainTab = "LIVE" | "HISTORY" | "UPTIME";
type SeverityFilter = "ALL" | "CRITICAL" | "WARNING" | "INFO" | "NORMAL";
type UptimeTimeframe = "30_DAYS" | "90_DAYS" | "180_DAYS" | "365_DAYS";

const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const MONTH_NAMES_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const ServiceStatusDrawer: React.FC<ServiceStatusDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const { t, language, setLanguage, supportedLanguages } = useTranslation();

  const [activeMainTab, setActiveMainTab] = useState<MainTab>("LIVE");
  const [alerts, setAlerts] = useState<DisruptionAlert[]>(DISRUPTION_ALERTS);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<TransitCategory | "ALL">("ALL");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("ALL");
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [fetchFailed, setFetchFailed] = useState<boolean>(false);

  // History & Calendar state (Default August 2026)
  const [calendarYear, setCalendarYear] = useState<number>(2026);
  const [calendarMonth, setCalendarMonth] = useState<number>(7); // 0-indexed: 7 = August
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string>("ALL");
  const [selectedHistorySeverity, setSelectedHistorySeverity] = useState<string>("ALL");

  // Uptime analytics state
  const [uptimeTimeframe, setUptimeTimeframe] = useState<UptimeTimeframe>("30_DAYS");
  const [expandedUptimeMode, setExpandedUptimeMode] = useState<TransitMode | null>(null);
  const [selectedTrendMonth, setSelectedTrendMonth] = useState<string | null>(null);
  const [showLanguageMenu, setShowLanguageMenu] = useState<boolean>(false);
  const prefersReducedMotion = useReducedMotion();

  // Derive the dataset's latest incident date once — the "Today" jump must
  // never point at a hardcoded date that silently goes stale.
  const latestIncident = useMemo(() => {
    if (HISTORICAL_INCIDENTS.length === 0) return null;
    return HISTORICAL_INCIDENTS.reduce((max, h) => (h.date > max ? h.date : max),
      HISTORICAL_INCIDENTS[0].date
    );
  }, []);
  const latestIncidentParts = latestIncident
    ? latestIncident.split("-").map((part) => parseInt(part, 10))
    : null;
  const latestIncidentLabel = latestIncidentParts
    ? `${latestIncidentParts[2]} ${
        (language === "id" ? MONTH_NAMES_ID : MONTH_NAMES_EN)[
          latestIncidentParts[1] - 1
        ].slice(0, 3)
      }`
    : "";

  const allLines = useTransitStore((state) => state.allLines);
  const selectLine = useTransitStore((state) => state.selectLine);
  const isFetchingRef = useRef(false);
  const fetchAbortRef = useRef<AbortController | null>(null);

  const fetchAlerts = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    fetchAbortRef.current = new AbortController();
    const signal = fetchAbortRef.current.signal;
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/alerts", { signal });
      if (res.ok) {
        const data = (await res.json()) as { success: boolean; data: DisruptionAlert[] };
        if (data.success && Array.isArray(data.data)) {
          setAlerts(data.data);
          setFetchFailed(false);
        } else {
          setFetchFailed(true);
        }
      } else {
        setFetchFailed(true);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setFetchFailed(true);
    } finally {
      isFetchingRef.current = false;
      setIsRefreshing(false);
      setLastUpdated(
        new Date().toLocaleTimeString(language === "id" ? "id-ID" : "en-US", {
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
    } else if (fetchAbortRef.current) {
      // Closing the drawer cancels any in-flight refresh
      fetchAbortRef.current.abort();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const hasInfo = lineAlerts.some((a) => a.severity === "INFO");
      const isNormal = lineAlerts.length === 0;

      if (severityFilter === "CRITICAL" && !hasCritical) return false;
      if (severityFilter === "WARNING" && !hasWarning && !hasCritical) return false;
      if (severityFilter === "INFO" && !hasInfo && !hasWarning && !hasCritical) return false;
      if (severityFilter === "NORMAL" && !isNormal) return false;

      return true;
    })
    .map((line) => {
      const la = alerts.filter((a) => a.lineId === line.id && a.status === "ACTIVE");
      const rank = la.some((a) => a.severity === "CRITICAL")
        ? 0
        : la.some((a) => a.severity === "WARNING")
        ? 1
        : la.some((a) => a.severity === "INFO")
        ? 2
        : 3;
      return { line, rank };
    })
    .sort((a, b) => a.rank - b.rank || a.line.name.localeCompare(b.line.name))
    .map((entry) => entry.line);
  }, [allLines, alerts, activeCategory, searchQuery, severityFilter]);

  // Severity chip counts: count LINES under the current category + search
  // (same unit as the filtered list), not raw alerts.
  const severityCounts = useMemo(() => {
    const counts = { ALL: 0, CRITICAL: 0, WARNING: 0, INFO: 0, NORMAL: 0 };
    allLines.forEach((line) => {
      if (activeCategory !== "ALL" && line.category !== activeCategory) return;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !line.code.toLowerCase().includes(q) &&
          !line.name.toLowerCase().includes(q)
        )
          return;
      }
      const la = alerts.filter((a) => a.lineId === line.id && a.status === "ACTIVE");
      counts.ALL += 1;
      if (la.some((a) => a.severity === "CRITICAL")) counts.CRITICAL += 1;
      if (la.some((a) => a.severity === "WARNING")) counts.WARNING += 1;
      if (la.some((a) => a.severity === "INFO")) counts.INFO += 1;
      if (la.length === 0) counts.NORMAL += 1;
    });
    return counts;
  }, [allLines, alerts, activeCategory, searchQuery]);

  // Calendar calculations
  const monthKeyPrefix = useMemo(() => {
    const mm = String(calendarMonth + 1).padStart(2, "0");
    return `${calendarYear}-${mm}`;
  }, [calendarYear, calendarMonth]);

  const monthLabel = useMemo(() => {
    const names = language === "id" ? MONTH_NAMES_ID : MONTH_NAMES_EN;
    return `${names[calendarMonth]} ${calendarYear}`;
  }, [calendarMonth, calendarYear, language]);

  // Days in selected calendar month
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();
    // Monday as first column (0 = Monday, 6 = Sunday)
    const startOffset = (firstDayOfWeek + 6) % 7;
    const totalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    const days: {
      dayNum: number;
      dateStr: string;
      events: HistoricalIncidentEvent[];
      isCurrentMonth: boolean;
    }[] = [];

    // Add empty padding for previous month days
    for (let i = 0; i < startOffset; i++) {
      days.push({ dayNum: 0, dateStr: "", events: [], isCurrentMonth: false });
    }

    // Add actual days
    for (let d = 1; d <= totalDays; d++) {
      const ddStr = String(d).padStart(2, "0");
      const mmStr = String(calendarMonth + 1).padStart(2, "0");
      const fullDateStr = `${calendarYear}-${mmStr}-${ddStr}`;
      const dayEvents = HISTORICAL_INCIDENTS.filter((h) => h.date === fullDateStr);

      days.push({
        dayNum: d,
        dateStr: fullDateStr,
        events: dayEvents,
        isCurrentMonth: true,
      });
    }

    return days;
  }, [calendarYear, calendarMonth]);

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
    setSelectedHistoryDate("ALL");
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
    setSelectedHistoryDate("ALL");
  };

  // Filtered History Events
  const filteredHistory = useMemo(() => {
    return HISTORICAL_INCIDENTS.filter((item) => {
      if (selectedHistoryDate !== "ALL") {
        if (item.date !== selectedHistoryDate) return false;
      } else {
        // If "ALL" in current month
        if (!item.date.startsWith(monthKeyPrefix)) return false;
      }
      if (selectedHistorySeverity !== "ALL" && item.severity !== selectedHistorySeverity) {
        return false;
      }
      return true;
    });
  }, [selectedHistoryDate, selectedHistorySeverity, monthKeyPrefix]);

  // Aggregate Uptime KPI based on selected timeframe
  const aggregatedUptime = useMemo(() => {
    const windowMonths =
      uptimeTimeframe === "30_DAYS"
        ? 1
        : uptimeTimeframe === "90_DAYS"
        ? 3
        : uptimeTimeframe === "180_DAYS"
        ? 6
        : 12;

    let totalUptimeSum = 0;
    let totalOtpSum = 0;
    let totalDisruptionMin = 0;
    let totalMttrSum = 0;

    SYSTEM_UPTIME_METRICS.forEach((m) => {
      let percent = m.uptimePercent30Days;
      if (uptimeTimeframe === "90_DAYS") percent = m.uptimePercent90Days;
      else if (uptimeTimeframe === "180_DAYS") percent = m.uptimePercent180Days;
      else if (uptimeTimeframe === "365_DAYS") percent = m.uptimePercent365Days;

      totalUptimeSum += percent;

      // OTP: averaged over the selected window from monthly history (the
      // scalar onTimePerformancePercent is a 30-day figure).
      if (windowMonths === 1) {
        totalOtpSum += m.onTimePerformancePercent;
      } else if (m.monthlyHistory.length > 0) {
        const window = m.monthlyHistory.slice(-windowMonths);
        totalOtpSum +=
          window.reduce((sum, r) => sum + r.onTimePerformancePercent, 0) / window.length;
      } else {
        totalOtpSum += m.onTimePerformancePercent;
      }

      // Source data exists only for the 30-day window (scoped in the UI).
      totalDisruptionMin += m.disruptionMinutes30Days;
      totalMttrSum += m.mttrMinutes;
    });

    const count = SYSTEM_UPTIME_METRICS.length;
    return {
      avgUptime: (totalUptimeSum / count).toFixed(2),
      avgOtp: (totalOtpSum / count).toFixed(2),
      avgMttr: (totalMttrSum / count).toFixed(1),
      totalDisruption: totalDisruptionMin,
    };
  }, [uptimeTimeframe]);

  // 12-Month System Wide Progression Trend
  const monthlyTrendAggregates = useMemo(() => {
    const months = [
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
    ];

    return months.map((mKey) => {
      let monthSum = 0;
      let monthOtp = 0;
      let monthTrips = 0;
      let count = 0;
      let label = mKey;

      SYSTEM_UPTIME_METRICS.forEach((sys) => {
        const rec = sys.monthlyHistory.find((r) => r.monthKey === mKey);
        if (rec) {
          monthSum += rec.uptimePercent;
          monthOtp += rec.onTimePerformancePercent;
          monthTrips += rec.totalTrips;
          count++;
          label = rec.monthLabel;
        }
      });

      return {
         monthKey: mKey,
         monthLabel: label,
         avgUptime: count > 0 ? parseFloat((monthSum / count).toFixed(2)) : null,
         avgOtp: count > 0 ? parseFloat((monthOtp / count).toFixed(2)) : null,
         totalTrips: monthTrips,
       };
    });
  }, []);

  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const drawerTitleId = "status-drawer-title";

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setTimeout(() => {
        drawerRef.current?.focus();
      }, 100);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  const handleDrawerKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && showLanguageMenu) {
        setShowLanguageMenu(false);
        return;
      }
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    },
    [onClose, showLanguageMenu]
  );

  // Minimal focus trap: wrap Tab cycling inside the drawer
  const handleTrapKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const focusables = drawerRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // Arrow-key navigation for the tablist
  const TAB_ORDER: MainTab[] = ["LIVE", "HISTORY", "UPTIME"];
  const handleTablistKeyDown = (e: React.KeyboardEvent) => {
    const idx = TAB_ORDER.indexOf(activeMainTab);
    let next = -1;
    if (e.key === "ArrowRight") next = (idx + 1) % TAB_ORDER.length;
    if (e.key === "ArrowLeft") next = (idx + TAB_ORDER.length - 1) % TAB_ORDER.length;
    if (next >= 0) {
      e.preventDefault();
      setActiveMainTab(TAB_ORDER[next]);
      document.getElementById(`status-tab-${TAB_ORDER[next]}`)?.focus();
    }
  };

  const handleSelectLine = (lineId: string) => {
    selectLine(lineId);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={drawerTitleId}
            tabIndex={-1}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: "spring", damping: 28, stiffness: 280 }
            }
            className="w-full sm:w-[640px] md:w-[680px] h-full bg-[#090d18] border-l border-white/15 flex flex-col shadow-2xl overflow-hidden text-slate-100 outline-none"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              handleDrawerKeyDown(e);
              handleTrapKeyDown(e);
            }}
          >
            {/* 1. MAIN HEADER & LANGUAGE SWITCHER */}
            <div className="px-5 py-4 border-b border-white/10 bg-[#0c1222] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 id={drawerTitleId} className="text-base font-bold text-white tracking-tight">
                      {t.statusCenter.title}
                    </h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 font-mono font-bold">
                      {stats.onTimePercentage}% {t.common.normal}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {t.statusCenter.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Language Selector Dropdown */}
                <div className="relative">
                <button
                  onClick={() => setShowLanguageMenu((v) => !v)}
                  aria-expanded={showLanguageMenu}
                  aria-haspopup="menu"
                  aria-label={t.common.selectLanguage}
                  className={`touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs text-slate-300 hover:text-white transition flex items-center gap-1.5`}
                >
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-mono font-bold uppercase">{language}</span>
                  </button>

                  <AnimatePresence>
                    {showLanguageMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-1.5 z-50 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 space-y-1"
                      >
                        {supportedLanguages.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => {
                              setLanguage(lang.code);
                              setShowLanguageMenu(false);
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition ${
                              language === lang.code
                                ? "bg-cyan-950/90 text-cyan-300 border border-cyan-500/40"
                                : "text-slate-300 hover:bg-slate-800"
                            }`}
                          >
                            <span>{lang.nativeName}</span>
                            <span className="text-[10px] font-mono opacity-60 uppercase">
                              {lang.flagLabel}
                            </span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={fetchAlerts}
                  aria-label={t.common.refresh}
                  disabled={isRefreshing}
                  className={`touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition disabled:opacity-50`}
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
                </button>

                <button
                  onClick={onClose}
                  aria-label={t.common.close}
                  className={`touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition`}
                 >
                   <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 2. THREE PRIMARY TABS */}
            <div
              role="tablist"
              aria-label={t.statusCenter.title}
              onKeyDown={handleTablistKeyDown}
              className="px-5 pt-2 bg-slate-900/60 border-b border-white/10 flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar"
            >
              <button
                role="tab"
                id="status-tab-LIVE"
                aria-selected={activeMainTab === "LIVE"}
                aria-controls="status-panel-LIVE"
                tabIndex={activeMainTab === "LIVE" ? 0 : -1}
                onClick={() => setActiveMainTab("LIVE")}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-mono font-bold transition-all border-b-2 flex items-center gap-2 ${
                  activeMainTab === "LIVE"
                    ? "border-cyan-400 text-cyan-300 bg-slate-800/80 shadow-md"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>{t.statusCenter.tabLive}</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-900 text-[10px]">
                  {allLines.length}
                </span>
              </button>

              <button
                role="tab"
                id="status-tab-HISTORY"
                aria-selected={activeMainTab === "HISTORY"}
                aria-controls="status-panel-HISTORY"
                tabIndex={activeMainTab === "HISTORY" ? 0 : -1}
                onClick={() => setActiveMainTab("HISTORY")}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-mono font-bold transition-all border-b-2 flex items-center gap-2 ${
                  activeMainTab === "HISTORY"
                    ? "border-cyan-400 text-cyan-300 bg-slate-800/80 shadow-md"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>{t.statusCenter.tabHistory}</span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[10px]">
                  {HISTORICAL_INCIDENTS.length}
                </span>
              </button>

              <button
                role="tab"
                id="status-tab-UPTIME"
                aria-selected={activeMainTab === "UPTIME"}
                aria-controls="status-panel-UPTIME"
                tabIndex={activeMainTab === "UPTIME" ? 0 : -1}
                onClick={() => setActiveMainTab("UPTIME")}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-mono font-bold transition-all border-b-2 flex items-center gap-2 ${
                  activeMainTab === "UPTIME"
                    ? "border-cyan-400 text-cyan-300 bg-slate-800/80 shadow-md"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>{t.statusCenter.tabUptime}</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px]">
                  {aggregatedUptime.avgUptime}%
                </span>
              </button>
            </div>

            {/* 3. TAB 1: LIVE NETWORK STATUS */}
            {activeMainTab === "LIVE" && (
              <div
                role="tabpanel"
                id="status-panel-LIVE"
                aria-labelledby="status-tab-LIVE"
                tabIndex={-1}
                className="flex-1 flex flex-col overflow-hidden p-4 space-y-3.5"
              >
                {fetchFailed && (
                  <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-300 text-[11px] font-mono shrink-0">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {t.common.stale}
                    </span>
                    <button
                      onClick={fetchAlerts}
                      className="underline underline-offset-2 hover:text-amber-200 transition"
                    >
                      {t.common.refresh}
                    </button>
                  </div>
                )}

                {/* Search & Category Filter */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder={t.navigation.searchRoutesAndHubs}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Mode Categories */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                    {(["ALL", "RAIL", "BUS", "AVIATION", "MARITIME"] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
                          activeCategory === cat
                            ? "bg-cyan-950 border-cyan-500/50 text-cyan-300 shadow-sm"
                            : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {cat === "ALL"
                          ? t.navigation.allModes
                          : cat === "RAIL"
                          ? t.navigation.railModes
                          : cat === "BUS"
                          ? t.navigation.busModes
                          : cat === "AVIATION"
                          ? t.navigation.airModes
                          : t.navigation.seaModes}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Severity Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {(["ALL", "CRITICAL", "WARNING", "INFO", "NORMAL"] as const).map((sev) => {
                    const isActive = severityFilter === sev;
                    const count =
                      sev === "ALL"
                        ? severityCounts.ALL
                        : sev === "CRITICAL"
                        ? severityCounts.CRITICAL
                        : sev === "WARNING"
                        ? severityCounts.WARNING
                        : sev === "INFO"
                        ? severityCounts.INFO
                        : severityCounts.NORMAL;
                    const sevLabel =
                      sev === "ALL"
                        ? t.statusCenter.sevAll
                        : sev === "CRITICAL"
                        ? t.statusCenter.sevCritical
                        : sev === "WARNING"
                        ? t.statusCenter.sevWarning
                        : sev === "INFO"
                        ? t.statusCenter.sevInfo
                        : t.statusCenter.sevNormal;
                    return (
                      <button
                        key={sev}
                        onClick={() => setSeverityFilter(sev)}
                        aria-pressed={isActive}
                        className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition border flex items-center gap-1 ${
                          isActive
                            ? "bg-cyan-950 border-cyan-500/50 text-cyan-300 shadow-sm"
                            : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {sevLabel}
                    <span className="px-1 py-0.5 rounded bg-slate-900 text-[10px] font-mono">{count}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Line Status List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {filteredLines.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 font-mono">
                      {t.statusCenter.noLinesMatch}
                    </div>
                  ) : (
                    filteredLines.map((line) => {
                      const lineAlerts = alerts.filter((a) => a.lineId === line.id && a.status === "ACTIVE");
                      const hasCritical = lineAlerts.some((a) => a.severity === "CRITICAL");
                      const hasWarning = lineAlerts.some((a) => a.severity === "WARNING");
                      const hasInfo = lineAlerts.some((a) => a.severity === "INFO");
                      const isExpanded = expandedLineId === line.id;

                      let statusBadge = {
                        label: t.common.normal,
                        color: "bg-emerald-950/80 border-emerald-500/40 text-emerald-400",
                        icon: CheckCircle2,
                      };

                      if (hasCritical) {
                        statusBadge = {
                          label: t.common.critical,
                          color: "bg-rose-950/80 border-rose-500/40 text-rose-400 animate-pulse",
                          icon: ShieldAlert,
                        };
                      } else if (hasWarning) {
                        statusBadge = {
                          label: t.common.warning,
                          color: "bg-amber-950/80 border-amber-500/40 text-amber-400",
                          icon: AlertTriangle,
                        };
                      } else if (hasInfo) {
                        statusBadge = {
                          label: t.statusCenter.sevInfo,
                          color: "bg-cyan-950/80 border-cyan-500/40 text-cyan-400",
                          icon: Info,
                        };
                      }

                      const StatusIcon = statusBadge.icon;

                      return (
                        <div
                          key={line.id}
                          className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition shadow-sm"
                        >
                          <div
                            role="button"
                             tabIndex={0}
                             aria-expanded={isExpanded}
                             aria-controls={`line-panel-${line.id}`}
                             className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 flex items-center justify-between cursor-pointer rounded-lg"
                             onClick={() => setExpandedLineId(isExpanded ? null : line.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setExpandedLineId(isExpanded ? null : line.id);
                              }
                            }}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="px-2 py-0.5 rounded text-xs font-mono font-bold shrink-0 shadow-sm"
                                style={{
                                  backgroundColor: `${line.colorHex}25`,
                                  color: line.colorHex,
                                  border: `1px solid ${line.colorHex}70`,
                                }}
                              >
                                {line.code}
                              </span>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-white truncate">{line.name}</h4>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {t.statusCenter.headwayPrefix} {line.headwayMinutes} {t.common.minutes} &bull; {line.firstDeparture} - {line.lastDeparture}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1 ${statusBadge.color}`}
                              >
                                <StatusIcon className="w-3 h-3" />
                                <span>{statusBadge.label}</span>
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </div>

                          {/* Expanded Alerts Details */}
                          {isExpanded && (
                             <div
                               id={`line-panel-${line.id}`}
                               className="mt-3 pt-3 border-t border-white/10 space-y-2"
                             >
                              {lineAlerts.length === 0 ? (
                                <div className="text-xs text-slate-400 font-mono flex items-center justify-between">
                                  <span>{t.statusCenter.operationalNormalTitle}</span>
                                  <button
                                    onClick={() => handleSelectLine(line.id)}
                                    className="px-2.5 py-1 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold hover:bg-cyan-900/50 transition flex items-center gap-1"
                                  >
                                    <span>{t.common.viewOnMap}</span>
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
                                        : alert.severity === "INFO"
                                          ? "bg-cyan-950/40 border-cyan-500/40 text-cyan-200"
                                          : "bg-amber-950/40 border-amber-500/40 text-amber-200"
                                    }`}
                                  >
                                    <div className="font-bold flex items-center justify-between">
                                      <span>{alert.title}</span>
                                      <span className="text-[10px] font-mono opacity-70">
                                        {new Date(alert.startTime).toLocaleTimeString("id-ID", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}{" "}
                                        WIB
                                      </span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed opacity-90">
                                      {alert.description}
                                    </p>
                                    {alert.affectedStops && alert.affectedStops.length > 0 && (
                                      <div className="text-[10px] font-mono opacity-80 pt-0.5">
                                        {t.statusCenter.affectedStations}{" "}
                                        <strong>{alert.affectedStops.join(", ")}</strong>
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

            {/* 4. TAB 2: INTERACTIVE MULTI-MONTH CALENDAR & INCIDENT HISTORY */}
            {activeMainTab === "HISTORY" && (
              <div
                role="tabpanel"
                id="status-panel-HISTORY"
                aria-labelledby="status-tab-HISTORY"
                tabIndex={-1}
                className="flex-1 flex flex-col overflow-hidden p-4 space-y-4"
              >
                {/* CALENDAR NAVIGATION & MONTH SELECTOR */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-sm font-bold text-white tracking-tight">{monthLabel}</h3>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                         onClick={handlePrevMonth}
                         title={t.statusCenter.prevMonth}
                         aria-label={t.statusCenter.prevMonth}
                         className={`touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition`}
                       >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                         onClick={handleNextMonth}
                         title={t.statusCenter.nextMonth}
                         aria-label={t.statusCenter.nextMonth}
                         className={`touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition`}
                       >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Filter Buttons */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    <button
                      onClick={() => setSelectedHistoryDate("ALL")}
                      className={`touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition border ${
                        selectedHistoryDate === "ALL"
                          ? "bg-cyan-950 border-cyan-500 text-cyan-300 shadow-sm"
                          : "bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {t.statusCenter.allDates} ({monthLabel})
                    </button>
                    <button
                      onClick={() => {
                        if (latestIncident) {
                          const parts = latestIncident.split("-").map(Number);
                          setCalendarYear(parts[0]);
                          setCalendarMonth(parts[1] - 1);
                          setSelectedHistoryDate(latestIncident);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition border bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200"
                    >
                      {t.statusCenter.today} ({latestIncidentLabel})
                    </button>
                  </div>

                  {/* 7-COLUMN CALENDAR MATRIX (Mon-Sun) */}
                  <div className="space-y-1">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono text-slate-400 font-bold uppercase">
                      <span>{t.statusCenter.mon}</span>
                      <span>{t.statusCenter.tue}</span>
                      <span>{t.statusCenter.wed}</span>
                      <span>{t.statusCenter.thu}</span>
                      <span>{t.statusCenter.fri}</span>
                      <span>{t.statusCenter.sat}</span>
                      <span>{t.statusCenter.sun}</span>
                    </div>

                    {/* Day Cells */}
                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((cell, cIdx) => {
                        if (!cell.isCurrentMonth) {
                          return <div key={cIdx} className="h-10 rounded-lg bg-slate-950/30" />;
                        }

                        const isSelected = selectedHistoryDate === cell.dateStr;
                        const hasCritical = cell.events.some((e) => e.severity === "CRITICAL");
                        const hasWarning = cell.events.some((e) => e.severity === "WARNING");
                        const hasInfo = cell.events.length > 0;

                        return (
                          <button
                            key={cIdx}
                            onClick={() => setSelectedHistoryDate(cell.dateStr)}
                            aria-label={`${monthLabel} ${cell.dayNum}${
                              cell.events.length > 0
                                ? ` — ${cell.events.length} ${t.statusCenter.incidentCountLabel}`
                                : ""
                            }`}
                            className={`h-10 rounded-lg p-1 flex flex-col items-center justify-between border transition-all ${
                              isSelected
                                ? "bg-cyan-950 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400 shadow-md shadow-cyan-950/50"
                                : cell.events.length > 0
                                ? "bg-slate-800 border-slate-700 hover:border-cyan-500/50 text-white"
                                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                            }`}
                          >
                            <span className="text-[11px] font-mono font-bold">{cell.dayNum}</span>
                            {cell.events.length > 0 && (
                              <div className="flex items-center gap-0.5">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    hasCritical
                                      ? "bg-rose-500 animate-pulse"
                                      : hasWarning
                                      ? "bg-amber-400"
                                      : "bg-cyan-400"
                                  }`}
                                />
                                <span className="text-[10px] font-mono font-bold text-slate-300">
                                  {cell.events.length}
                                </span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Incident Severity Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {(["ALL", "CRITICAL", "WARNING", "INFO"] as const).map((sev) => {
                    const isActive = selectedHistorySeverity === sev;
                    const sevLabel =
                      sev === "ALL"
                        ? t.statusCenter.sevAll
                        : sev === "CRITICAL"
                        ? t.statusCenter.sevCritical
                        : sev === "WARNING"
                        ? t.statusCenter.sevWarning
                        : t.statusCenter.sevInfo;
                    return (
                      <button
                        key={sev}
                        onClick={() => setSelectedHistorySeverity(sev)}
                        aria-pressed={isActive}
                        className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition border ${
                          isActive
                            ? "bg-cyan-950 border-cyan-500/50 text-cyan-300 shadow-sm"
                            : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {sevLabel}
                      </button>
                    );
                  })}
                </div>

                {/* INCIDENT TIMELINE LIST */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
                    <span>
                      {selectedHistoryDate === "ALL"
                        ? `${t.statusCenter.tabHistory} (${monthLabel}):`
                        : `${selectedHistoryDate}:`}
                    </span>
                    <span className="text-cyan-400 font-bold">
                      {filteredHistory.length}
                    </span>
                  </div>

                  {filteredHistory.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs font-mono bg-slate-900/40 rounded-xl border border-slate-800">
                      {t.statusCenter.noIncidentsOnDate}
                    </div>
                  ) : (
                    filteredHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl bg-slate-900/85 border border-slate-800 space-y-2 text-xs shadow-md"
                      >
                        {/* Line Header */}
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
                            {t.common.resolved} ({item.durationMinutes} {t.common.minutes})
                          </span>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h4 className="text-xs font-bold text-white tracking-tight">{item.title}</h4>
                          <p className="text-[11px] text-slate-300 leading-relaxed pt-0.5">
                            {item.description}
                          </p>
                        </div>

                        {/* Root Cause & Engineering Mitigation */}
                        <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/90 space-y-1 text-[11px] font-mono">
                          <div>
                            <span className="text-amber-400 font-semibold">{t.statusCenter.rootCause} </span>
                            <span className="text-slate-300">{item.rootCause}</span>
                          </div>
                          <div>
                            <span className="text-emerald-400 font-semibold">{t.statusCenter.engineeringMitigation} </span>
                            <span className="text-slate-300">{item.mitigationAction}</span>
                          </div>
                          {item.affectedStops.length > 0 && (
                            <div className="text-slate-400 pt-0.5">
                              {t.statusCenter.affectedStations}{" "}
                              <strong className="text-slate-200">{item.affectedStops.join(", ")}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 5. TAB 3: MULTI-WINDOW HISTORICAL UPTIME & RELIABILITY KPI */}
            {activeMainTab === "UPTIME" && (
              <div
                role="tabpanel"
                id="status-panel-UPTIME"
                aria-labelledby="status-tab-UPTIME"
                tabIndex={-1}
                className="flex-1 flex flex-col overflow-hidden p-4 space-y-4"
              >
                {/* TIMEFRAME SELECTOR BUTTONS */}
                <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 shrink-0">
                  {(
                    [
                      { id: "30_DAYS", label: t.statusCenter.timeframe30Days },
                      { id: "90_DAYS", label: t.statusCenter.timeframe90Days },
                      { id: "180_DAYS", label: t.statusCenter.timeframe180Days },
                      { id: "365_DAYS", label: t.statusCenter.timeframe365Days },
                    ] as const
                  ).map((tf) => (
                    <button
                      key={tf.id}
                      onClick={() => setUptimeTimeframe(tf.id)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition text-center ${
                        uptimeTimeframe === tf.id
                          ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>

                {/* KPI OVERVIEW HERO BANNER */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-white/10 space-y-2 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4" />
                      {t.statusCenter.systemWideUptime}
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      {t.statusCenter.targetSlaPrima}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 pt-1">
                     <div>
                       <div className="text-3xl font-black font-mono text-white tabular-nums">
                         {aggregatedUptime.avgUptime}%
                       </div>
                       <span className="text-[10px] text-slate-400 font-mono">
                         {t.statusCenter.uptimeLabel}
                       </span>
                     </div>
                     <div className="border-l border-white/10 pl-4">
                       <div className="text-3xl font-black font-mono text-cyan-300 tabular-nums">
                         {aggregatedUptime.avgOtp}%
                       </div>
                       <span className="text-[10px] text-slate-400 font-mono">
                         {t.statusCenter.onTimePerformance}
                       </span>
                     </div>
                     <div className="border-l border-white/10 pl-4">
                       <div className="text-2xl font-black font-mono text-slate-200 tabular-nums">
                         {aggregatedUptime.avgMttr} {t.common.minutes}
                       </div>
                       <span className="text-[10px] text-slate-400 font-mono">
                         {t.statusCenter.meanTimeToRecovery} ({t.statusCenter.scope30Days})
                       </span>
                     </div>
                   </div>
                </div>

                {/* 12-MONTH PROGRESSION TREND BAR CHART */}
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 shrink-0">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-cyan-400" />
                      {t.statusCenter.monthlyTrendTitle}
                    </span>
                      <span className="text-[10px] text-emerald-400">{t.statusCenter.targetAbove98}</span>
                  </div>

                  {/* Bar Chart Visual */}
                  <div className="grid grid-cols-12 gap-1 items-end h-20 pt-2 border-b border-white/5">
                    {monthlyTrendAggregates.map((m) => {
                       const isTapped = selectedTrendMonth === m.monthKey;
                       const heightPercent =
                         m.avgUptime !== null
                           ? Math.max(0, (m.avgUptime - 94) * 16)
                           : 3;

                       return (
                         <div
                           key={m.monthKey}
                           role="button"
                           tabIndex={0}
                           aria-pressed={isTapped}
                           aria-label={`${m.monthLabel}: ${
                             m.avgUptime !== null
                               ? `${t.statusCenter.uptimeLabel} ${m.avgUptime}%`
                               : t.statusCenter.noData
                           }`}
                           onClick={() =>
                             setSelectedTrendMonth(isTapped ? null : m.monthKey)
                           }
                           onKeyDown={(e) => {
                             if (e.key === "Enter" || e.key === " ") {
                               e.preventDefault();
                               setSelectedTrendMonth(isTapped ? null : m.monthKey);
                             }
                           }}
                           className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 flex flex-col items-center gap-1 cursor-pointer group h-full justify-end rounded-sm`}
                         >
                           <div
                             style={{ height: `${heightPercent}%` }}
                             className={`w-full rounded-t transition-all ${
                               m.avgUptime === null
                                 ? "bg-slate-600"
                                 : isTapped
                                 ? "bg-cyan-400 shadow-lg shadow-cyan-400/50"
                                 : m.avgUptime >= 98
                                 ? "bg-emerald-500/80 group-hover:bg-emerald-400"
                                 : "bg-amber-500/80 group-hover:bg-amber-400"
                             }`}
                           />
                           <span className="text-[10px] font-mono text-slate-400 truncate max-w-full">
                             {m.monthLabel.split(" ")[0].slice(0, 3)}
                           </span>
                         </div>
                       );
                     })}
                   </div>
                   <div className="text-right text-[10px] font-mono text-slate-500">
                     {t.statusCenter.bandNote}
                   </div>

                  {/* Selected Month Tooltip */}
                   {selectedTrendMonth &&
                     (() => {
                       const selected = monthlyTrendAggregates.find(
                         (m) => m.monthKey === selectedTrendMonth
                       );
                       if (!selected) return null;
                       return (
                         <div className="p-2 rounded-lg bg-slate-950 border border-cyan-500/40 flex items-center justify-between text-xs font-mono">
                           <span className="text-white font-bold">{selected.monthLabel}:</span>
                           {selected.avgUptime !== null ? (
                             <>
                               <span className="text-emerald-400">
                                 {t.statusCenter.uptimeLabel}: {selected.avgUptime}%
                               </span>
                               <span className="text-cyan-300">
                                 {t.statusCenter.onTimeShort}: {selected.avgOtp}%
                               </span>
                             </>
                           ) : (
                             <span className="text-slate-400">{t.statusCenter.noData}</span>
                           )}
                         </div>
                       );
                     })()}
                </div>

                {/* DETAILED MODE-BY-MODE UPTIME LIST WITH 12-MONTH EXPANSION */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  <div className="text-xs font-mono text-slate-400 px-1">
                    {t.statusCenter.modeReliabilityTable}:
                  </div>

                  {SYSTEM_UPTIME_METRICS.map((metric) => {
                    let displayedUptime = metric.uptimePercent30Days;
                    if (uptimeTimeframe === "90_DAYS") displayedUptime = metric.uptimePercent90Days;
                    else if (uptimeTimeframe === "180_DAYS") displayedUptime = metric.uptimePercent180Days;
                    else if (uptimeTimeframe === "365_DAYS") displayedUptime = metric.uptimePercent365Days;

                    const isExpanded = expandedUptimeMode === metric.mode;

                    return (
                      <div
                        key={metric.mode}
                        className="p-3.5 rounded-xl bg-slate-900/85 border border-slate-800 space-y-2.5 text-xs shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <strong className="text-white font-bold">{metric.systemName}</strong>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({metric.totalTrips30Days.toLocaleString()} {t.statusCenter.tripsPerMonth})
                            </span>
                          </div>

                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-emerald-400 font-bold text-xs">
                              {displayedUptime}% {t.statusCenter.uptimeLabel}
                            </span>
                            <span className="text-slate-600">&bull;</span>
                            <span className="text-cyan-300 font-bold text-xs">
                              {metric.onTimePerformancePercent}% {t.statusCenter.onTimeShort}
                            </span>
                          </div>
                        </div>

                        {/* 7-Day Mini Status Tiles & History Expand Button */}
                        <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] font-mono text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <span>{t.statusCenter.sevenDayStatus}:</span>
                            <div className="flex items-center gap-1">
                              {metric.statusHistory7Days.map((status, sIdx) => (
                                <div
                                  key={sIdx}
                                  aria-label={`${t.statusCenter.dayOffset}${7 - sIdx}: ${
                                    status === "NORMAL"
                                      ? t.statusCenter.sevNormal
                                      : status === "LIMITED"
                                      ? t.navigation.serviceLimited
                                      : t.navigation.serviceSuspended
                                  }`}
                                  title={`${t.statusCenter.dayOffset}${7 - sIdx}: ${
                                    status === "NORMAL"
                                      ? t.statusCenter.sevNormal
                                      : status === "LIMITED"
                                      ? t.navigation.serviceLimited
                                      : t.navigation.serviceSuspended
                                  }`}
                                  className={`w-3 h-3 rounded ${
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

                          <button
                             onClick={() =>
                               setExpandedUptimeMode(isExpanded ? null : metric.mode)
                             }
                             aria-expanded={isExpanded}
                             aria-controls={`uptime-panel-${metric.mode}`}
                             className={`touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1`}
                           >
                            <span>{t.statusCenter.monthHistorySubpanel}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Expandable 12-Month Table */}
                        {isExpanded && (
                          <div className="mt-2 pt-2 border-t border-slate-800 space-y-1.5">
                            <div className="grid grid-cols-4 text-[10px] font-mono text-slate-400 font-bold pb-1 border-b border-white/5">
                              <span>{t.statusCenter.month}</span>
                              <span>{t.statusCenter.uptimeLabel}</span>
                              <span>{t.statusCenter.onTimeShort}</span>
                              <span className="text-right">{t.statusCenter.totalTrips}</span>
                            </div>
                            {metric.monthlyHistory.map((mRec) => (
                              <div
                                key={mRec.monthKey}
                                className="grid grid-cols-4 text-[10px] font-mono text-slate-300 py-0.5 hover:bg-slate-800/40 rounded"
                              >
                                <span className="font-semibold text-white">{mRec.monthLabel}</span>
                                <span className="text-emerald-400 font-bold">{mRec.uptimePercent}%</span>
                                <span className="text-cyan-300">{mRec.onTimePerformancePercent}%</span>
                                <span className="text-right text-slate-400">{mRec.totalTrips.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 6. FOOTER BAR */}
            <div className="px-5 py-3 border-t border-white/10 bg-slate-950/90 text-slate-400 text-xs flex items-center justify-between font-mono shrink-0">
              <span className="flex items-center gap-2">
 {fetchFailed && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[10px]">
                    {t.common.stale}
                  </span>
                )}
              </span>
              <span>
                {t.common.lastUpdated}: {lastUpdated || t.common.updatedJustNow}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
