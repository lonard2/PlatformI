/**
 * PlatformI - Multimodal Regional Public Transportation Cockpit
 * Main Application Dashboard & Interactive Cartography Canvas
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Train,
  Activity,
  Radio,
  Layers,
  Wallet,
  Users,
  X,
  Sparkles,
  Settings,
  Search,
  MapPin,
  Navigation,
  ArrowUpDown,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { DynamicMap } from "@/components/map/DynamicMap";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { resolvePlannedJourney } from "@/lib/services/journeyPlanner";
import { CheckInModal } from "@/components/crowdsource/CheckInModal";
import { CommunityLiveFeed } from "@/components/crowdsource/CommunityLiveFeed";
import { DigitalPassWallet } from "@/components/ticketing/DigitalPassWallet";
import { VehicleDetailSheet, HubDetailSheet } from "@/components/inspector";
import { DisruptionAlertBanner } from "@/components/alerts/DisruptionAlertBanner";
import { ServiceStatusDrawer } from "@/components/alerts/ServiceStatusDrawer";
import { AITransitAssistantModal } from "@/components/ai/AITransitAssistantModal";
import { AppSettingsModal } from "@/components/settings/AppSettingsModal";
import { TransportationSystemBar } from "@/components/navigation/TransportationSystemBar";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { useTranslation } from "@/lib/i18n";

export default function Home() {
  const { t } = useTranslation();
  const allLines = useTransitStore((state) => state.allLines);
  const allStops = useTransitStore((state) => state.allStops);
  const simulationSpeed = useTransitStore((state) => state.simulationSpeed);
  const activeDrawer = useTransitStore((state) => state.activeDrawer);
  const setActiveDrawer = useTransitStore((state) => state.setActiveDrawer);
  const selectedVehicleId = useTransitStore((state) => state.selectedVehicleId);
  const selectedStopId = useTransitStore((state) => state.selectedStopId);
  const clearSelection = useTransitStore((state) => state.clearSelection);
  const plannedJourney = useTransitStore((state) => state.plannedJourney);
  const setPlannedJourney = useTransitStore((state) => state.setPlannedJourney);
  const clearPlannedJourney = useTransitStore((state) => state.clearPlannedJourney);

  // Modal states
  const [isCheckInOpen, setIsCheckInOpen] = useState<boolean>(false);
  const [checkInTargetVehicleId, setCheckInTargetVehicleId] = useState<string | null>(null);
  const [checkInTargetLineId, setCheckInTargetLineId] = useState<string | null>(null);
  const [feedRefreshSignal, setFeedRefreshSignal] = useState<number>(0);
  const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false);
  const [isStatusDrawerOpen, setIsStatusDrawerOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  // Journey pill state
  const [isJourneyExpanded, setIsJourneyExpanded] = useState<boolean>(false);
  const [journeyOrigin, setJourneyOrigin] = useState<string>("");
  const [journeyDest, setJourneyDest] = useState<string>("");
  const [journeyQuery, setJourneyQuery] = useState<string | null>(null);

  // P0 Journey-to-Map binding: calculate deterministic route the instant both fields hold valid stops
  useEffect(() => {
    if (journeyOrigin.trim() && journeyDest.trim()) {
      const planned = resolvePlannedJourney(journeyOrigin, journeyDest, allStops, allLines);
      setPlannedJourney(planned);
    } else {
      clearPlannedJourney();
    }
  }, [journeyOrigin, journeyDest, allStops, allLines, setPlannedJourney, clearPlannedJourney]);

  // AI demoted to refinement: provides fare capping reasoning, transfer walkway guidance, crowd tips
  const handleRefineWithAI = () => {
    const origin = journeyOrigin.trim();
    const dest = journeyDest.trim();
    if (!origin || !dest) return;
    const lineSummary = plannedJourney?.directLines.length
      ? plannedJourney.directLines.map((l) => l.code).join(", ")
      : plannedJourney?.transferOption
      ? `${plannedJourney.transferOption.firstLine.code} → ${plannedJourney.transferOption.secondLine.code} via ${plannedJourney.transferOption.transferStop.name}`
      : "transit lines";
    setJourneyQuery(`Refine journey from ${origin} to ${dest} via ${lineSummary}. Calculate JakLingko fare cap, transfer guidance, and crowd recommendations.`);
    setIsAIModalOpen(true);
  };

  const handleSwapStops = () => {
    setJourneyOrigin(journeyDest);
    setJourneyDest(journeyOrigin);
  };

  const handleClearJourney = () => {
    setJourneyOrigin("");
    setJourneyDest("");
    clearPlannedJourney();
  };

  // Stop universe for the journey autocomplete (deduplicated, A-Z)
  const stopNames = useMemo(
    () => Array.from(new Set(allStops.map((s) => s.name))).sort(),
    [allStops]
  );

  const handleOpenCheckIn = (vehicleId?: string, lineId?: string) => {
    setCheckInTargetVehicleId(vehicleId || null);
    setCheckInTargetLineId(lineId || null);
    setIsCheckInOpen(true);
  };

  return (
    <main className="flex flex-col h-screen w-screen bg-[#090d16] text-slate-100 relative overflow-hidden pb-14 lg:pb-0">
      {/* 1. TOP PASSENGER HEADER (DESKTOP & TABLET ONLY) */}
      <header className="hidden sm:flex h-14 border-b border-white/10 glass-panel px-3 sm:px-6 items-center justify-between z-30 shrink-0">
        {/* Left Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/15 flex items-center justify-center border border-cyan-400/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
            <Train className="w-3.5 h-3.5 text-cyan-300" />
          </div>
          <h1 className="text-base font-bold tracking-tight text-white">
            PlatformI
          </h1>
        </div>

        {/* Right Navigation (Desktop) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsStatusDrawerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-xs text-slate-300 btn-tactile transition"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{allLines.length} {t.navigation.activeLines}</span>
          </button>

          <button
            onClick={() => setIsAIModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold btn-tactile transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t.navigation.aiAdvisor}</span>
          </button>

          <button
            onClick={() =>
              setActiveDrawer(activeDrawer === "crowdsource" ? null : "crowdsource")
            }
            aria-pressed={activeDrawer === "crowdsource"}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium btn-tactile transition ${
              activeDrawer === "crowdsource"
                ? "bg-cyan-950/80 border-cyan-500/50 text-cyan-300"
                : "bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">{t.navigation.crowdsource}</span>
          </button>

          <button
            onClick={() =>
              setActiveDrawer(activeDrawer === "tickets" ? null : "tickets")
            }
            aria-pressed={activeDrawer === "tickets"}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium btn-tactile transition ${
              activeDrawer === "tickets"
                ? "bg-blue-950/80 border-blue-500/50 text-blue-300"
                : "bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">{t.navigation.ticketing}</span>
          </button>

          <button
            onClick={() => setIsSettingsModalOpen(true)}
            aria-label={t.navigation.settings}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/70 text-slate-300 hover:text-white hover:border-slate-700 btn-tactile transition"
          >
            <Settings className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </header>

      {/* 2. MULTIMODAL TRANSPORTATION SYSTEMS & CONSOLIDATED HUBS BAR */}
      <TransportationSystemBar />

      {/* 3. PRIORITY DISRUPTION NOTICES BANNER (COMPACT) */}
      <DisruptionAlertBanner onOpenStatusDrawer={() => setIsStatusDrawerOpen(true)} />

      {/* 4. MAIN CARTOGRAPHY VIEWPORT & FLOATING DRAWERS */}
      <div className="flex-1 relative overflow-hidden flex">
        <DynamicMap />

        {/* Floating Journey Pill (above map, left side) */}
        <div className="absolute top-3 left-3 z-40">
          <AnimatePresence mode="wait">
            {isJourneyExpanded ? (
              <motion.div
                key="journey-expanded"
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="glass-panel rounded-2xl p-3.5 w-80 sm:w-96 shadow-2xl shadow-black/60 space-y-3 border border-white/15"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-bold text-white tracking-tight">{t.common.findRoute}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {(journeyOrigin || journeyDest) && (
                      <button
                        onClick={handleClearJourney}
                        aria-label="Clear route"
                        title="Clear route"
                        className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-rose-400 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setIsJourneyExpanded(false)}
                      aria-label={t.common.close}
                      className="touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <datalist id="stop-names">
                  {stopNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>

                <div className="space-y-1.5 relative">
                  {/* Origin Field */}
                  <div className="relative">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center">
                      <span className="text-[10px] font-mono font-black text-emerald-400">A</span>
                    </div>
                    <label htmlFor="journey-origin" className="sr-only">
                      {t.common.origin}
                    </label>
                    <input
                      id="journey-origin"
                      name="journey-origin"
                      list="stop-names"
                      type="text"
                      placeholder={t.common.origin}
                      value={journeyOrigin}
                      onChange={(e) => setJourneyOrigin(e.target.value)}
                      className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 transition"
                    />
                  </div>

                  {/* Swap Button between inputs */}
                  <div className="flex justify-end pr-2 -my-1 z-10 relative">
                    <button
                      type="button"
                      onClick={handleSwapStops}
                      aria-label="Swap origin and destination"
                      title="Swap stops"
                      className="p-1 rounded-md bg-slate-900 border border-slate-700/80 text-slate-400 hover:text-cyan-400 btn-tactile transition"
                    >
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Destination Field */}
                  <div className="relative">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-rose-500/20 border border-rose-400 flex items-center justify-center">
                      <span className="text-[10px] font-mono font-black text-rose-400">B</span>
                    </div>
                    <label htmlFor="journey-destination" className="sr-only">
                      {t.common.destination}
                    </label>
                    <input
                      id="journey-destination"
                      name="journey-destination"
                      list="stop-names"
                      type="text"
                      placeholder={t.common.destination}
                      value={journeyDest}
                      onChange={(e) => setJourneyDest(e.target.value)}
                      className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 transition"
                    />
                  </div>
                </div>

                {/* Deterministic Route Answer Bound to Map */}
                {plannedJourney ? (
                  <div className="space-y-2 pt-1">
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-2 shadow-inner">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          plannedJourney.directLines.length > 0
                            ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                            : "bg-amber-950/60 border-amber-500/40 text-amber-300"
                        }`}>
                          {plannedJourney.directLines.length > 0 ? "DIRECT ROUTE" : "1-TRANSFER ROUTE"}
                        </span>
                        <span className="text-xs font-mono font-bold text-cyan-300">
                          Rp {plannedJourney.estimatedFareRp.toLocaleString("id-ID")}
                        </span>
                      </div>

                      {/* Candidate Line Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {plannedJourney.directLines.length > 0 ? (
                          plannedJourney.directLines.map((l) => (
                            <span
                              key={l.id}
                              style={{
                                backgroundColor: `${l.colorHex}25`,
                                borderColor: `${l.colorHex}60`,
                                color: l.colorHex,
                              }}
                              className="px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold truncate max-w-[200px]"
                            >
                              [{l.code}] {l.name}
                            </span>
                          ))
                        ) : plannedJourney.transferOption ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-300">
                            <span
                              style={{
                                backgroundColor: `${plannedJourney.transferOption.firstLine.colorHex}25`,
                                borderColor: `${plannedJourney.transferOption.firstLine.colorHex}60`,
                                color: plannedJourney.transferOption.firstLine.colorHex,
                              }}
                              className="px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold"
                            >
                              {plannedJourney.transferOption.firstLine.code}
                            </span>
                            <span className="text-slate-500 font-mono">&rarr;</span>
                            <span
                              style={{
                                backgroundColor: `${plannedJourney.transferOption.secondLine.colorHex}25`,
                                borderColor: `${plannedJourney.transferOption.secondLine.colorHex}60`,
                                color: plannedJourney.transferOption.secondLine.colorHex,
                              }}
                              className="px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold"
                            >
                              {plannedJourney.transferOption.secondLine.code}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({plannedJourney.transferOption.transferStop.name})
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-white/5">
                        <span>~{plannedJourney.estimatedDurationMinutes} min</span>
                        <span>{plannedJourney.distanceKm} km</span>
                        <span className="text-emerald-400 font-semibold">Map Plotted</span>
                      </div>
                    </div>

                    {/* Refinement Action: AI Advisor */}
                    <button
                      type="button"
                      onClick={handleRefineWithAI}
                      className="w-full py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 btn-tactile transition shadow-md"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{t.navigation.aiAdvisor} &bull; {t.ticketing.integratedDiscount}</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-slate-950/40 border border-white/5 text-[11px] text-slate-400 text-center">
                    Select valid stations to preview route pins and candidate lines on the map.
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.button
                key="journey-collapsed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={() => setIsJourneyExpanded(true)}
                className={`touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 glass-panel rounded-full px-3.5 py-2 flex items-center gap-2 shadow-xl shadow-black/40 btn-tactile transition-all cursor-pointer ${
                  plannedJourney ? "border-cyan-500/50 bg-slate-900/90" : "hover:border-cyan-500/40"
                }`}
              >
                {plannedJourney ? (
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                    <span className="font-semibold text-white truncate max-w-[90px] sm:max-w-[120px]">
                      {plannedJourney.originStop.name}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                    <div className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_#f43f5e]" />
                    <span className="font-semibold text-white truncate max-w-[90px] sm:max-w-[120px]">
                      {plannedJourney.destinationStop.name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] hidden sm:inline">
                      {plannedJourney.distanceKm} km
                    </span>
                  </div>
                ) : (
                  <>
                    <Search className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-medium text-slate-300 hidden sm:inline">
                      {t.common.findRoute}
                    </span>
                    <span className="text-xs font-medium text-slate-300 sm:hidden">{t.common.route}</span>
                  </>
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Floating Crowdsource Feed Drawer */}
        <AnimatePresence>
          {activeDrawer === "crowdsource" && (
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="absolute top-3 right-3 bottom-3 z-40 w-full sm:w-96 max-w-[calc(100vw-24px)]"
            >
              <CommunityLiveFeed onOpenCheckIn={handleOpenCheckIn} refreshSignal={feedRefreshSignal} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Pass Wallet Drawer */}
        <AnimatePresence>
          {activeDrawer === "tickets" && (
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="absolute top-3 right-3 bottom-3 z-40 w-full sm:w-[420px] max-w-[calc(100vw-24px)]"
            >
              <DigitalPassWallet onClose={() => setActiveDrawer(null)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enthusiast Vehicle Detail Inspector Sheet */}
        <AnimatePresence>
          {(selectedVehicleId || activeDrawer === "vehicle") && (
            <VehicleDetailSheet
              key={selectedVehicleId || "vehicle-drawer"}
              vehicleId={selectedVehicleId}
              onClose={clearSelection}
              onOpenCheckIn={handleOpenCheckIn}
            />
          )}
        </AnimatePresence>

        {/* Station, Hub, Terminal & Port Detail Sheet */}
        <AnimatePresence>
          {(selectedStopId || activeDrawer === "hub") && (
            <HubDetailSheet
              key={selectedStopId || "hub-drawer"}
              stopId={selectedStopId}
              onClose={clearSelection}
            />
          )}
        </AnimatePresence>

      </div>

      {/* 5. MODALS & DRAWERS */}
      {/* Check-In Modal */}
      <CheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        initialVehicleId={checkInTargetVehicleId}
        initialLineId={checkInTargetLineId}
        onDone={() => setFeedRefreshSignal((s) => s + 1)}
      />

      {/* Multi-Model AI Transit Advisor Modal */}
      <AITransitAssistantModal
        isOpen={isAIModalOpen || activeDrawer === "ai"}
        initialQuery={journeyQuery ?? undefined}
        onClose={() => {
          setIsAIModalOpen(false);
          setJourneyQuery(null);
          if (activeDrawer === "ai") setActiveDrawer(null);
        }}
      />

      {/* Service Status Drawer */}
      <ServiceStatusDrawer
        isOpen={isStatusDrawerOpen || activeDrawer === "alerts"}
        onClose={() => {
          setIsStatusDrawerOpen(false);
          if (activeDrawer === "alerts") setActiveDrawer(null);
        }}
      />

      {/* App Settings Modal */}
      <AppSettingsModal
        isOpen={isSettingsModalOpen || activeDrawer === "settings"}
        onClose={() => {
          setIsSettingsModalOpen(false);
          if (activeDrawer === "settings") setActiveDrawer(null);
        }}
      />



      {/* 6. BOTTOM TELEMETRY STRIP */}
      <TelemetryFooter
        allLinesCount={allLines.length}
        simulationSpeed={simulationSpeed}
      />

      {/* 7. DEDICATED MOBILE & TABLET BOTTOM NAVIGATION BAR */}
      <MobileBottomNav
        onOpenAI={() => {
          if (plannedJourney) {
            handleRefineWithAI();
          } else {
            setIsAIModalOpen(true);
          }
        }}
        onOpenStatus={() => setIsStatusDrawerOpen(true)}
        onOpenJourney={() => setIsJourneyExpanded(true)}
      />
    </main>
  );
}

/**
 * Isolated Telemetry Footer Component
 * Subscribes to vehicle statuses independently so that the main Home component
 * and its 20+ children do NOT re-render on vehicle movements.
 */
function TelemetryFooter({
  allLinesCount,
  simulationSpeed,
}: {
  allLinesCount: number;
  simulationSpeed: number;
}) {
  const { t } = useTranslation();
  const simulatedVehicles = useTransitStore((state) => state.simulatedVehicles);

  return (
    <footer className="h-8 border-t border-white/10 glass-panel px-3 sm:px-6 flex items-center justify-between z-30 shrink-0 text-[11px] text-slate-400 font-mono tabular-nums">
      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
        <span className="flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-cyan-400" />
          {simulatedVehicles.length} {t.common.vehicles}
        </span>
        <span className="flex items-center gap-1.5">
          <Layers className="w-3 h-3 text-blue-400" />
          {allLinesCount} {t.common.lines}
        </span>
      </div>
      <span className="shrink-0">
        {simulationSpeed === 0 ? t.navigation.paused : `${simulationSpeed}x`}
      </span>
    </footer>
  );
}
