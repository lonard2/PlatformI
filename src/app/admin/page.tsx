/**
 * PlatformI - Operator Control Portal: Executive KPI Dashboard
 *
 * Visualizes multimodal fleet telemetry, real-time disruption counts,
 * turnstile throughput metrics, and crowdsourced passenger load distribution.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Radio,
  Users,
  CreditCard,
  Truck,
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowRight,
  Clock,
  Layers,
  Sparkles,
  DollarSign,
  QrCode,
  Train,
  CheckCircle2,
} from "lucide-react";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { DISRUPTION_ALERTS } from "@/lib/data/jakarta-dataset";
import { useTranslation } from "@/lib/i18n";

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const simulatedVehicles = useTransitStore((state) => state.simulatedVehicles);
  const allLines = useTransitStore((state) => state.allLines);
  const allStops = useTransitStore((state) => state.allStops);

  // Computations
  const movingCount = simulatedVehicles.filter(
    (v) => v.status === "IN_SERVICE" && v.speedKmh > 0
  ).length;
  const boardingCount = simulatedVehicles.filter(
    (v) => v.status === "BOARDING"
  ).length;
  const holdCount = simulatedVehicles.filter(
    (v) => v.status === "CONGESTION_HOLD" || v.status === "OUT_OF_SERVICE"
  ).length;

  const crowdStats = useMemo(() => {
    const l1 = simulatedVehicles.filter((v) => v.crowdLevel === "LEVEL_1_MANY_SEATS").length;
    const l2 = simulatedVehicles.filter((v) => v.crowdLevel === "LEVEL_2_FEW_SEATS").length;
    const l3 = simulatedVehicles.filter((v) => v.crowdLevel === "LEVEL_3_STANDING_ONLY").length;
    const l4 = simulatedVehicles.filter((v) => v.crowdLevel === "LEVEL_4_FULL_CRUSH").length;
    return { l1, l2, l3, l4 };
  }, [simulatedVehicles]);

  const activeAlerts = DISRUPTION_ALERTS.filter((a) => a.status === "ACTIVE");
  const criticalAlertsCount = activeAlerts.filter((a) => a.severity === "CRITICAL").length;
  const warningAlertsCount = activeAlerts.filter((a) => a.severity === "WARNING").length;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. HERO BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-white/10 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
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
            className="px-3.5 py-2 rounded-xl bg-amber-950/80 hover:bg-amber-900/80 border border-amber-500/40 text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-lg"
          >
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.admin.broadcastAlert}</span>
          </Link>
          <Link
            href="/admin/scanner"
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-cyan-950/50"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>{t.admin.testTurnstileValidator}</span>
          </Link>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Fleet Telemetry */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-400 font-mono">{t.admin.activeFleet}</span>
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/30">
              <Truck className="w-4 h-4 text-cyan-400" />
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
            <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/30">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            98.2%
          </div>
          <div className="text-[11px] text-slate-400 font-mono pt-1">
            {t.statusCenter.systemWideUptime}: <strong className="text-slate-200">99.4%</strong>
          </div>
        </div>

        {/* KPI 3: Active Disruption Bulletins */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-400 font-mono">{t.admin.activeDisruptions}</span>
            <div className="p-2 rounded-xl bg-amber-950/80 border border-amber-500/30">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
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
            <span className="text-xs uppercase font-bold text-slate-400 font-mono">{t.ticketing.jaklingkoCapNotice.split(":")[0]}</span>
            <div className="p-2 rounded-xl bg-teal-950/80 border border-teal-500/30">
              <DollarSign className="w-4 h-4 text-teal-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-teal-300 font-mono">
            Rp 48.6 Juta
          </div>
          <div className="text-[11px] text-slate-400 font-mono pt-1">
            {t.ticketing.integratedDiscount} (3h Max Rp 10.000)
          </div>
        </div>
      </div>

      {/* 3. LOWER SECTION: PASSENGER LOAD DISTRIBUTION & RECENT OCC AUDIT FEED */}
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
                <span className="font-mono text-slate-300">{crowdStats.l1} Units</span>
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
                <span className="text-cyan-400 font-medium">{t.crowdsource.densityFewSeats}</span>
                <span className="font-mono text-slate-300">{crowdStats.l2} Units</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${(crowdStats.l2 / Math.max(1, simulatedVehicles.length)) * 100}%` }}
                  className="h-full bg-cyan-500 rounded-full"
                />
              </div>
            </div>

            {/* Level 3 */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-amber-400 font-medium">{t.crowdsource.densityStandingOnly}</span>
                <span className="font-mono text-slate-300">{crowdStats.l3} Units</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${(crowdStats.l3 / Math.max(1, simulatedVehicles.length)) * 100}%` }}
                  className="h-full bg-amber-500 rounded-full"
                />
              </div>
            </div>

            {/* Level 4 */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-rose-400 font-medium">{t.crowdsource.densityFullCrowded}</span>
                <span className="font-mono text-slate-300">{crowdStats.l4} Units</span>
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
              91% {t.crowdsource.acComfortable}
            </div>
          </div>
        </div>

        {/* Right: Live OCC Telemetry & Event Stream */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4 shadow-lg lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">{t.admin.heroTitle}</h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {t.common.active}
            </span>
          </div>

          <div className="space-y-2.5">
            {[
              {
                time: "14:22:10 WIB",
                type: "HEADWAY_SYNC",
                text: "MRT Jakarta Ratangga TS-01 on-schedule departure Bundaran HI (5m00s headway)",
                badge: "MRT-NS",
                color: "text-cyan-400 border-cyan-500/40 bg-cyan-950/50",
              },
              {
                time: "14:21:45 WIB",
                type: "PASS_SCAN",
                text: "Gate Turnstile #04 CSW-ASEAN verified rolling token QR pass",
                badge: "GATE-04",
                color: "text-emerald-400 border-emerald-500/40 bg-emerald-950/50",
              },
              {
                time: "14:20:12 WIB",
                type: "DISRUPTION_BROADCAST",
                text: "Advisory bulletin updated for northern Thousand Islands speedboat corridor",
                badge: "MARITIME",
                color: "text-amber-400 border-amber-500/40 bg-amber-950/50",
              },
              {
                time: "14:18:30 WIB",
                type: "CHECKIN_UPDATE",
                text: "Commuter telemetry logged for TransJakarta TJ-788 (Level 3 Standing, AC Optimal)",
                badge: "COR-1",
                color: "text-blue-400 border-blue-500/40 bg-blue-950/50",
              },
              {
                time: "14:15:00 WIB",
                type: "WHOOSH_FEEDER",
                text: "Whoosh feeder train connection synchronized at Padalarang Hub (G1012)",
                badge: "WHOOSH",
                color: "text-rose-400 border-rose-500/40 bg-rose-950/50",
              },
            ].map((event, idx) => (
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
              className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition"
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
