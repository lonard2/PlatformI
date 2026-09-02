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
  DollarSign,
  CheckCircle2,
  QrCode,
  TrendingUp,
} from "lucide-react";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { DISRUPTION_ALERTS } from "@/lib/data/jakarta-dataset";
import type { DisruptionAlert } from "@/types/transit";
import { useTranslation } from "@/lib/i18n";

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const simulatedVehicles = useTransitStore((state) => state.simulatedVehicles);
  const allLines = useTransitStore((state) => state.allLines);
  const [alerts, setAlerts] = useState<DisruptionAlert[]>(DISRUPTION_ALERTS);
  const [isAlertsStale, setIsAlertsStale] = useState<boolean>(false);

  useEffect(() => {
    fetch("/api/alerts")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setAlerts(data.data);
          setIsAlertsStale(false);
        } else {
          setIsAlertsStale(true);
        }
      })
      .catch(() => setIsAlertsStale(true));
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

  const onTimePercentage = useMemo(() => {
    if (simulatedVehicles.length === 0) return "\u2014";
    const nominal = simulatedVehicles.length - holdCount;
    return `${((nominal / simulatedVehicles.length) * 100).toFixed(1)}%`;
  }, [simulatedVehicles.length, holdCount]);

  // Real derivation: share of the fleet actually running (not OUT_OF_SERVICE)
  const uptimePercentage = useMemo(() => {
    if (simulatedVehicles.length === 0) return "\u2014";
    const inService = simulatedVehicles.filter((v) => v.status !== "OUT_OF_SERVICE").length;
    return `${((inService / simulatedVehicles.length) * 100).toFixed(1)}%`;
  }, [simulatedVehicles]);

  // Real derivation: share of fleet reporting OPTIMAL cabin cooling
  const acOptimalPercentage = useMemo(() => {
    if (simulatedVehicles.length === 0) return "\u2014";
    const optimal = simulatedVehicles.filter((v) => v.acComfort === "OPTIMAL").length;
    return `${Math.round((optimal / simulatedVehicles.length) * 100)}%`;
  }, [simulatedVehicles]);

  // Real derivation: est. fare-gate volume = live passenger load (summed
  // across carriages) x the BRT flat fare constant (3500, per fareCalculator's
  // road-mode base)
  const fareVolumeRp = useMemo(
    () =>
      simulatedVehicles.reduce(
        (sum, v) =>
          sum +
          (v.carriages?.reduce((load, c) => load + c.passengerCount, 0) ?? 0) *
            3500,
        0
      ),
    [simulatedVehicles]
  );

  const crowdStats = useMemo(() => {
    const l1 = simulatedVehicles.filter((v) => v.crowdLevel === "LEVEL_1_MANY_SEATS").length;
    const l2 = simulatedVehicles.filter((v) => v.crowdLevel === "LEVEL_2_FEW_SEATS").length;
    const l3 = simulatedVehicles.filter((v) => v.crowdLevel === "LEVEL_3_STANDING_ONLY").length;
    const l4 = simulatedVehicles.filter((v) => v.crowdLevel === "LEVEL_4_FULL_CRUSH").length;
    return { l1, l2, l3, l4 };
  }, [simulatedVehicles]);

  const activeAlerts = useMemo(() => alerts.filter((a) => a.status === "ACTIVE"), [alerts]);
  const criticalAlertsCount = useMemo(() => activeAlerts.filter((a) => a.severity === "CRITICAL").length, [activeAlerts]);
  const warningAlertsCount = useMemo(() => activeAlerts.filter((a) => a.severity === "WARNING").length, [activeAlerts]);

  // Dynamic live event stream constructed from live telemetry
  const liveEvents = useMemo(() => {
    const events: {
      time: string;
      text: string;
      badge: string;
      color: string;
    }[] = [];

    // 1. In-service moving vehicles
    simulatedVehicles.slice(0, 3).forEach((v) => {
      const line = allLines.find((l) => l.id === v.lineId);
      events.push({
        time: t.admin.telemetryLiveBadge,
        text: `${v.vehicleCode} (${v.name}) ${t.admin.telemetryTracking} ${Math.round(v.speedKmh)} km/h ${t.admin.telemetryHeading} ${Math.round(v.headingDegrees)}° [${v.status}]`,
        badge: line?.code || v.category,
        color: "text-cyan-300 border-cyan-500/40 bg-cyan-950/40",
      });
    });

    // 2. Active alerts if any
    activeAlerts.slice(0, 2).forEach((a) => {
      const line = allLines.find((l) => l.id === a.lineId);
      events.push({
        time: t.admin.advisoryBadge,
        text: `${a.title}: ${a.description}`,
        badge: line?.code || a.severity,
        color:
          a.severity === "CRITICAL"
            ? "text-rose-300 border-rose-500/40 bg-rose-950/40"
            : "text-amber-300 border-amber-500/40 bg-amber-950/40",
      });
    });

    return events;
  }, [simulatedVehicles, allLines, activeAlerts]);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. HERO BANNER */}
      <div className="rounded-2xl bg-slate-900/90 border border-white/10 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 text-xs font-mono font-semibold">
              {t.admin.occCommandBadge}
            </span>
            <span className="text-xs text-slate-400 font-mono">{t.admin.liveTelemetryBadge}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1.5">
            {t.admin.heroTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-1">
            {t.admin.heroSubtitle}
          </p>
        </div>

        {/* Quick Shortcut Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href="/admin/alerts"
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition shadow-md btn-tactile focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.admin.broadcastAlert}</span>
          </Link>
          <Link
            href="/admin/scanner"
            className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-cyan-950 text-xs font-bold flex items-center gap-1.5 transition shadow-md btn-tactile focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>{t.admin.testTurnstileValidator}</span>
          </Link>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI GRID (Signal Rarity: Calm Slate Surfaces with High-Contrast Value Accents) */}
      {isAlertsStale && (
        <div
          role="alert"
          className="flex items-center gap-2 p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs text-amber-300"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{t.admin.telemetryStale}</span>
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

        {/* KPI 2: On-Time Network Reliability */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-400 font-mono">{t.admin.onTimePunctuality}</span>
            <div className="p-2 rounded-xl bg-slate-950 border border-white/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {onTimePercentage}
          </div>
          <div className="text-[11px] text-slate-400 font-mono pt-1">
            {t.statusCenter.systemWideUptime}: <strong className="text-slate-200">{uptimePercentage}</strong>
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
        </div>

        {/* KPI 4: JakLingko Tariff Absorption */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-400 font-mono">{t.admin.fareGateVolume}</span>
            <div className="p-2 rounded-xl bg-slate-950 border border-white/10 text-cyan-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-cyan-300 font-mono">
            Rp {(fareVolumeRp / 1_000_000).toFixed(1)} Juta
          </div>
          <div className="text-[11px] text-slate-400 font-mono pt-1">
            {t.ticketing.integratedDiscount} ({t.admin.capNote})
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
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">{t.admin.eventStreamTitle}</h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">
              {t.common.active}
            </span>
          </div>

          <div className="space-y-2.5">
            {liveEvents.map((event, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">{event.time}</span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 ${event.color}`}>
                    {event.badge}
                  </span>
                  <span className="text-slate-300 truncate">{event.text}</span>
                </div>
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-mono text-[11px]">{t.admin.occCommandBadge}</span>
            <Link
              href="/admin/fleet"
              className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition btn-tactile"
            >
              <span>{t.admin.fleetControl}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
