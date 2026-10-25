/**
 * PlatformI - Operator Control Portal: Executive KPI Dashboard
 *
 * Visualizes multimodal fleet telemetry, real-time disruption counts,
 * turnstile throughput metrics, and crowdsourced passenger load distribution.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Radio,
  Users,
  Truck,
  ArrowRight,
  QrCode,
  TrendingUp,
  Siren,
} from "lucide-react";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import type { DisruptionAlert, VehicleOperationalStatus } from "@/types/transit";
import { useTranslation } from "@/lib/i18n";

export default function AdminDashboardPage() {
  const { t, currentLanguageMeta } = useTranslation();
  const simulatedVehicles = useTransitStore((state) => state.simulatedVehicles);
  const allLines = useTransitStore((state) => state.allLines);
  const [alerts, setAlerts] = useState<DisruptionAlert[]>([]);
  const [isAlertsLoading, setIsAlertsLoading] = useState<boolean>(true);
  const [isAlertsStale, setIsAlertsStale] = useState<boolean>(false);

  // Board truth comes from the server; seeds never masquerade as live data.
  // The stale banner carries the only retry path when the fetch fails.
  const loadAlerts = async () => {
    setIsAlertsLoading(true);
    setIsAlertsStale(false);
    try {
      const res = await fetch("/api/alerts");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAlerts(data.data);
      } else {
        setIsAlertsStale(true);
      }
    } catch {
      setIsAlertsStale(true);
    } finally {
      setIsAlertsLoading(false);
    }
  };

  useEffect(() => {
    void loadAlerts();
  }, []);

  // Dynamic calculations from live store data
  const movingCount = simulatedVehicles.filter(
    (v) => v.status === "IN_SERVICE" && v.speedKmh > 0
  ).length;
  const boardingCount = simulatedVehicles.filter(
    (v) => v.status === "BOARDING"
  ).length;
  const holdCount = simulatedVehicles.filter(
    (v) => v.status === "CONGESTION_HOLD" || v.status === "OUT_OF_SERVICE"
  ).length;

  // Real derivation: share of fleet not held (neither CONGESTION_HOLD nor OUT_OF_SERVICE)
  const onTimePercentage = useMemo(() => {
    if (simulatedVehicles.length === 0) return "\u2014";
    const nominal = simulatedVehicles.length - holdCount;
    return `${((nominal / simulatedVehicles.length) * 100).toFixed(1)}%`;
  }, [simulatedVehicles.length, holdCount]);

  // Real derivation: share of fleet reporting OPTIMAL cabin cooling
  const acOptimalPercentage = useMemo(() => {
    if (simulatedVehicles.length === 0) return "\u2014";
    const optimal = simulatedVehicles.filter((v) => v.acComfort === "OPTIMAL").length;
    return `${Math.round((optimal / simulatedVehicles.length) * 100)}%`;
  }, [simulatedVehicles]);

  // Worst-corridor posture: the line holding the most vehicles, so the
  // board answers "where hurts most" without mental math across KPIs.
  const worstCorridor = useMemo(() => {
    const heldByLine = new Map<string, number>();
    for (const v of simulatedVehicles) {
      if (v.status === "CONGESTION_HOLD" || v.status === "OUT_OF_SERVICE") {
        heldByLine.set(v.lineId, (heldByLine.get(v.lineId) ?? 0) + 1);
      }
    }
    let worst: { lineId: string; count: number } | null = null;
    for (const [lineId, count] of heldByLine) {
      if (!worst || count > worst.count) worst = { lineId, count };
    }
    if (!worst) return null;
    return {
      line: allLines.find((l) => l.id === worst.lineId),
      count: worst.count,
    };
  }, [simulatedVehicles, allLines]);

  const crowdStats = useMemo(() => {
    const l1 = simulatedVehicles.filter((v) => v.crowdLevel === "LEVEL_1_MANY_SEATS").length;
    const l2 = simulatedVehicles.filter((v) => v.crowdLevel === "LEVEL_2_FEW_SEATS").length;
    const l3 = simulatedVehicles.filter((v) => v.crowdLevel === "LEVEL_3_STANDING_ONLY").length;
    const l4 = simulatedVehicles.filter((v) => v.crowdLevel === "LEVEL_4_FULL_CRUSH").length;
    return { l1, l2, l3, l4 };
  }, [simulatedVehicles]);

  const simulationSpeed = useTransitStore((state) => state.simulationSpeed);
  const [simulationTime, setSimulationTime] = useState<number>(() => Date.now());

  // Simulation clock ticker respecting simulationSpeed multiplier
  useEffect(() => {
    if (simulationSpeed === 0) return;
    const interval = setInterval(() => {
      setSimulationTime((prev) => prev + 1000 * simulationSpeed);
    }, 1000);
    return () => clearInterval(interval);
  }, [simulationSpeed]);

  const activeAlerts = useMemo(() => alerts.filter((a) => a.status === "ACTIVE"), [alerts]);
  const criticalAlertsCount = useMemo(() => activeAlerts.filter((a) => a.severity === "CRITICAL").length, [activeAlerts]);
  const warningAlertsCount = useMemo(() => activeAlerts.filter((a) => a.severity === "WARNING").length, [activeAlerts]);

  // Network posture: worst active severity, computed once and shared by the
  // hero strip and the sector KPI so the board never disagrees with itself.
  const worstActiveSeverity = useMemo(() => {
    if (criticalAlertsCount > 0) return "CRITICAL" as const;
    if (warningAlertsCount > 0) return "WARNING" as const;
    if (activeAlerts.length > 0) return "INFO" as const;
    return null;
  }, [criticalAlertsCount, warningAlertsCount, activeAlerts.length]);

  const postureWord =
    worstActiveSeverity === "CRITICAL"
      ? t.admin.dashboardPostureCritical
      : worstActiveSeverity === "WARNING"
      ? t.admin.dashboardPostureDegraded
      : worstActiveSeverity === "INFO"
      ? t.admin.dashboardPostureDegraded
      : t.admin.dashboardPostureOk;

  const postureColor =
    worstActiveSeverity === "CRITICAL"
      ? "text-rose-300"
      : worstActiveSeverity
      ? "text-amber-300"
      : "text-emerald-300";

  const heroClock = new Date(simulationTime).toLocaleTimeString(currentLanguageMeta.locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  });

  // Live telemetry pings sampled from the fleet. Advisory disruptions live
  // in a separate prioritized list below so a critical bulletin can never
  // read as routine traffic.
  const telemetryFeed = useMemo(() => {
    const pool =
      simulatedVehicles.filter((v) => v.status === "IN_SERVICE").length > 0
        ? simulatedVehicles.filter((v) => v.status === "IN_SERVICE")
        : simulatedVehicles;
    const sampleVehicles = pool.slice(0, 4);

    const events: {
      id: string;
      timestamp: number;
      time: string;
      badge: string;
      code: string;
      status: VehicleOperationalStatus;
      speedKmh: number;
      headingDegrees: number;
    }[] = [];

    sampleVehicles.forEach((v, index) => {
      const line = allLines.find((l) => l.id === v.lineId);
      const pingOffsetMs = index * 8000 + ((Math.round(v.speedKmh) * 17) % 5000);
      const timestamp = simulationTime - pingOffsetMs;
      const time = new Date(timestamp).toLocaleTimeString(currentLanguageMeta.locale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta",
      });

      events.push({
        id: `telem-${v.id}`,
        timestamp,
        time,
        badge: line?.code ?? v.category,
        code: v.vehicleCode,
        status: v.status,
        speedKmh: Math.round(v.speedKmh),
        headingDegrees: Math.round(v.headingDegrees),
      });
    });

    // Sort by recency (most recent event first)
    events.sort((a, b) => b.timestamp - a.timestamp);

    return { events, total: pool.length };
  }, [simulatedVehicles, allLines, simulationTime, currentLanguageMeta.locale]);

  const getVehicleStatusLabel = (status: VehicleOperationalStatus) => {
    switch (status) {
      case "IN_SERVICE":
        return t.admin.moving;
      case "BOARDING":
        return t.admin.boarding;
      case "CONGESTION_HOLD":
        return t.admin.hold;
      case "OUT_OF_SERVICE":
        return t.common.inactive;
    }
  };

  // Advisory disruptions, critical first: an incident queue must never
  // silently cap or truncate the actionable clause.
  const advisories = useMemo(() => {
    const rank = (severity: DisruptionAlert["severity"]): number =>
      severity === "CRITICAL" ? 0 : severity === "WARNING" ? 1 : 2;
    return [...activeAlerts].sort((a, b) => {
      const order = rank(a.severity) - rank(b.severity);
      if (order !== 0) return order;
      const timeA = a.startTime ? new Date(a.startTime).getTime() : NaN;
      const timeB = b.startTime ? new Date(b.startTime).getTime() : NaN;
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });
  }, [activeAlerts]);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. HERO BANNER */}
      <div className="rounded-2xl bg-slate-900/90 border border-white/10 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 text-xs font-mono font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              {t.admin.liveTelemetryBadge}
            </span>
            <span className="text-xs text-slate-400 font-mono">Dukuh Atas TOD</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1.5">
            {t.admin.heroTitle}
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl mt-1">
            {t.admin.heroSubtitle}
          </p>
          {/* Network posture: the answer first, context second */}
          <div
            data-testid="posture-strip"
            className="flex flex-wrap items-center gap-2 mt-2.5"
          >
            <span className={`text-sm font-bold font-mono ${postureColor}`}>
              {postureWord}
            </span>
            {worstActiveSeverity && (
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                  worstActiveSeverity === "CRITICAL"
                    ? "bg-rose-900/80 text-rose-300 border-rose-500/40"
                    : worstActiveSeverity === "WARNING"
                    ? "bg-amber-900/80 text-amber-300 border-amber-500/40"
                    : "bg-cyan-900/80 text-cyan-300 border-cyan-500/40"
                }`}
              >
                {worstActiveSeverity === "CRITICAL"
                  ? t.admin.sevCritical
                  : worstActiveSeverity === "WARNING"
                  ? t.admin.sevWarning
                  : t.admin.sevInfo}
              </span>
            )}
            <span className="text-[11px] font-mono text-slate-400">
              {heroClock} WIB
            </span>
          </div>
        </div>

        {/* Quick Shortcut Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href="/admin/alerts#broadcast-form"
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-amber-950 text-xs font-bold flex items-center gap-1.5 transition shadow-md btn-tactile"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{t.admin.publishAlert}</span>
          </Link>
          <Link
            href="/admin/alerts"
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition shadow-md btn-tactile"
          >
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.admin.disruptionManager}</span>
          </Link>
          <Link
            href="/admin/scanner"
            className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-cyan-950 text-xs font-bold flex items-center gap-1.5 transition shadow-md btn-tactile"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>{t.admin.gateScanner}</span>
          </Link>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI GRID (Signal Rarity: Calm Slate Surfaces with High-Contrast Value Accents) */}
      {isAlertsStale && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs text-amber-300"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{t.admin.telemetryStale}</span>
          </span>
          <button
            type="button"
            onClick={() => void loadAlerts()}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-amber-950 font-bold text-xs transition btn-tactile min-h-[36px] shrink-0"
          >
            {t.admin.retrySync}
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Fleet Telemetry */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-400 font-mono">{t.admin.activeFleet}</span>
            <div className="p-2 rounded-xl bg-slate-950 border border-white/10 text-cyan-400">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {simulatedVehicles.length} <span className="text-xs text-slate-400 font-normal">{t.common.active}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono pt-1">
            <span className="text-emerald-400">{movingCount} {t.admin.moving}</span>
            <span>&bull;</span>
            <span className="text-amber-400">{boardingCount} {t.admin.boarding}</span>
            <span>&bull;</span>
            <span className="text-slate-500">{holdCount} {t.admin.hold}</span>
          </div>
        </div>

        {/* KPI 2: Fleet Not Held */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-400 font-mono">{t.admin.kpiFleetNotHeld}</span>
            <div className="p-2 rounded-xl bg-slate-950 border border-white/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {onTimePercentage}
          </div>
          <div className="text-[11px] text-slate-400 font-mono pt-1">
            {t.admin.kpiFleetNotHeldBasis}
          </div>
        </div>

        {/* KPI 3: Active Disruption Bulletins */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-400 font-mono">{t.admin.activeDisruptions}</span>
            <div className="p-2 rounded-xl bg-slate-950 border border-white/10 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-300 font-mono">
            {activeAlerts.length} <span className="text-xs text-slate-400 font-normal">{t.common.active}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono pt-1">
            <span className="text-rose-400 font-bold">{criticalAlertsCount} {t.admin.criticalAlerts}</span>
            <span>&bull;</span>
            <span className="text-amber-400">{warningAlertsCount} {t.admin.warningAlerts}</span>
          </div>
          <Link
            href="/admin/alerts"
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300 hover:text-amber-100 transition pt-1 btn-tactile"
          >
            <span>{t.admin.adminOpenIncidentQueue}</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* KPI 4: Worst Corridor Posture */}
        <div
          data-testid="kpi-worst-corridor"
          className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-400 font-mono">{t.admin.kpiWorstCorridor}</span>
            <div className="p-2 rounded-xl bg-slate-950 border border-white/10 text-rose-400">
              <Siren className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold font-mono ${worstCorridor ? "text-rose-300" : "text-slate-400"}`}>
            {worstCorridor?.line?.code ?? "—"}
          </div>
          <div className="text-[11px] text-slate-400 font-mono pt-1 truncate">
            {worstCorridor && worstCorridor.line
              ? `${worstCorridor.line.name} (${worstCorridor.count})`
              : t.admin.kpiNoHeldVehicles}
          </div>
        </div>
      </div>

      {/* 3. LOWER SECTION: PASSENGER LOAD DISTRIBUTION & LIVE TELEMETRY STREAM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Passenger Crowd Density Distribution */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4 shadow-lg lg:col-span-1">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">{t.admin.crowdDistribution}</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">{t.admin.liveTelemetryBadge}</span>
          </div>

          <div className="space-y-3">
            {/* Level 1 */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-emerald-400 font-medium">{t.crowdsource.densitySeatsAvailable}</span>
                <span className="font-mono text-slate-300">{crowdStats.l1} {t.admin.unitLabel}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${(crowdStats.l1 / Math.max(1, simulatedVehicles.length)) * 100}%` }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>

            {/* Level 2 */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-amber-400 font-medium">{t.crowdsource.densityFewSeats}</span>
                <span className="font-mono text-slate-300">{crowdStats.l2} {t.admin.unitLabel}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${(crowdStats.l2 / Math.max(1, simulatedVehicles.length)) * 100}%` }}
                  className="h-full bg-amber-500 rounded-full"
                />
              </div>
            </div>

            {/* Level 3 */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-orange-400 font-medium">{t.crowdsource.densityStandingOnly}</span>
                <span className="font-mono text-slate-300">{crowdStats.l3} {t.admin.unitLabel}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${(crowdStats.l3 / Math.max(1, simulatedVehicles.length)) * 100}%` }}
                  className="h-full bg-orange-500 rounded-full"
                />
              </div>
            </div>

            {/* Level 4 */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-rose-400 font-medium">{t.crowdsource.densityFullCrowded}</span>
                <span className="font-mono text-slate-300">{crowdStats.l4} {t.admin.unitLabel}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${(crowdStats.l4 / Math.max(1, simulatedVehicles.length)) * 100}%` }}
                  className="h-full bg-rose-500 rounded-full"
                />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300">{t.vehicleInspector.acRatingTitle}:</div>
            <div className="text-[11px]">
              {acOptimalPercentage} {t.crowdsource.acComfortable}
            </div>
          </div>
        </div>

        {/* Right: Live OCC Telemetry & Event Stream */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4 shadow-lg lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">{t.admin.eventStreamTitle}</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 border border-slate-700 text-slate-300">
                {t.admin.telemetrySampleCount
                  .replace("{n}", String(telemetryFeed.events.length))
                  .replace("{m}", String(telemetryFeed.total))}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-mono text-slate-400">
                {new Date(simulationTime).toLocaleTimeString(currentLanguageMeta.locale, {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
                  timeZone: "Asia/Jakarta",
                })} WIB
              </span>
              <span className={`text-[10px] font-mono font-bold ${simulationSpeed === 0 ? "text-amber-400" : "text-emerald-400"}`}>
                {simulationSpeed === 0 ? t.admin.pausedLabel : t.common.active}
              </span>
            </div>
          </div>

          <h4 className="text-xs font-bold text-white">{t.admin.eventAdvisoriesTitle}</h4>
          <div className="space-y-2.5">
            {isAlertsLoading && alerts.length === 0 ? (
              <div role="status" aria-live="polite">
                <span className="sr-only">{t.admin.alertFeedLoading}</span>
                <div className="space-y-2.5" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      data-testid="advisory-skeleton"
                      className="p-3 rounded-xl border border-white/10 bg-slate-950/60 space-y-2 animate-pulse"
                    >
                      <div className="h-3 w-2/3 rounded bg-slate-800" />
                      <div className="h-3 w-full rounded bg-slate-800" />
                    </div>
                  ))}
                </div>
              </div>
            ) : advisories.length === 0 ? (
              <p className="rounded-xl border border-white/5 bg-slate-950/60 px-3 py-4 text-center text-xs text-slate-500">
                {t.admin.noActiveAdvisories}
              </p>
            ) : (
              advisories.map((a) => {
                const line = allLines.find((l) => l.id === a.lineId);
                const parsed = a.startTime ? new Date(a.startTime).getTime() : NaN;
                const time = !isNaN(parsed)
                  ? new Date(parsed).toLocaleTimeString(currentLanguageMeta.locale, {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                      timeZone: "Asia/Jakarta",
                    })
                  : null;
                const badge =
                  line?.code ||
                  (a.severity === "CRITICAL"
                    ? t.admin.sevCritical
                    : a.severity === "WARNING"
                    ? t.admin.sevWarning
                    : t.admin.sevInfo);
                const color =
                  a.severity === "CRITICAL"
                    ? "text-rose-300 border-rose-500/40 bg-rose-950/40"
                    : "text-amber-300 border-amber-500/40 bg-amber-950/40";
                return (
                  <Link
                    key={`alert-${a.id}`}
                    href={`/admin/alerts#alert-${a.id}`}
                    className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-start gap-3 text-xs hover:border-white/20 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {time && (
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">{time}</span>
                      )}
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 ${color}`}>
                        {badge}
                      </span>
                      <span data-testid={`advisory-text-${a.id}`} className="text-slate-200">
                        {a.title}: {a.description}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          <h4 className="text-xs font-bold text-white pt-1">{t.admin.eventTelemetryTitle}</h4>
          <div className="space-y-2.5">
            {telemetryFeed.events.length === 0 ? (
              <p className="rounded-xl border border-white/5 bg-slate-950/60 px-3 py-4 text-center text-xs text-slate-500">
                {t.admin.telemetryEmpty}
              </p>
            ) : (
              telemetryFeed.events.map((event) => (
              <div
                key={event.id}
                className="p-3 rounded-xl bg-slate-950/60 border border-white/5 grid grid-cols-2 sm:grid-cols-[auto_auto_1fr_auto_auto] items-center gap-x-3 gap-y-1 text-xs"
              >
                <span className="text-[10px] font-mono text-slate-400 shrink-0">{event.time}</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 text-cyan-300 border-cyan-500/40 bg-cyan-950/40 justify-self-start">
                  {event.badge}
                </span>
                <span className="font-mono font-bold text-white truncate">
                  {event.code}
                  <span className="ml-2 font-sans font-normal text-slate-400">
                    {getVehicleStatusLabel(event.status)}
                  </span>
                </span>
                <span className="font-mono text-slate-200 tabular-nums">
                  {event.speedKmh} km/h
                </span>
                <span className="font-mono text-slate-400 tabular-nums">
                  {event.headingDegrees}°
                </span>
              </div>
            ))
            )}
          </div>

          <div className="flex justify-end">
            <Link
              href="/admin/fleet"
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition btn-tactile"
            >
              <span>{t.admin.viewAllInFleet}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-mono text-[11px]">{t.admin.occCommandBadge}</span>
            <div className="flex items-center gap-4">
              <Link
                href="/admin/network"
                className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition btn-tactile"
              >
                <span>{t.admin.networkStudio}</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
              <Link
                href="/admin/timetables"
                className="text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1 transition btn-tactile"
              >
                <span>{t.admin.timetableManager}</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
              <Link
                href="/admin/fleet"
                className="text-slate-400 hover:text-slate-200 font-semibold flex items-center gap-1 transition btn-tactile"
              >
                <span>{t.admin.fleetControl}</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
