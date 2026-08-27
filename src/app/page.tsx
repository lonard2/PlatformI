/**
 * PlatformI - Multimodal Regional Public Transportation Cockpit
 * Main Application Dashboard & Interactive Cartography Canvas
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { DynamicMap } from "@/components/map/DynamicMap";
import { useTransitStore } from "@/lib/stores/useTransitStore";
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
  const simulationSpeed = useTransitStore((state) => state.simulationSpeed);
  const activeDrawer = useTransitStore((state) => state.activeDrawer);
  const setActiveDrawer = useTransitStore((state) => state.setActiveDrawer);
  const selectedVehicleId = useTransitStore((state) => state.selectedVehicleId);
  const selectedStopId = useTransitStore((state) => state.selectedStopId);
  const clearSelection = useTransitStore((state) => state.clearSelection);

  // Modal states
  const [isCheckInOpen, setIsCheckInOpen] = useState<boolean>(false);
  const [checkInTargetVehicleId, setCheckInTargetVehicleId] = useState<string | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false);
  const [isStatusDrawerOpen, setIsStatusDrawerOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  // Journey pill state

  const [isJourneyExpanded, setIsJourneyExpanded] = useState<boolean>(false);
  const [journeyOrigin, setJourneyOrigin] = useState<string>("");
  const [journeyDest, setJourneyDest] = useState<string>("");

  const handleOpenCheckIn = (vehicleId?: string) => {
    setCheckInTargetVehicleId(vehicleId || null);
    setIsCheckInOpen(true);
  };

  return (
    <main className="flex flex-col h-screen w-screen bg-[#090d16] text-slate-100 relative overflow-hidden pb-14 lg:pb-0">
      {/* 1. TOP PASSENGER HEADER (DESKTOP & TABLET ONLY) */}
      <header className="hidden sm:flex h-13 sm:h-14 border-b border-white/10 glass-panel px-3 sm:px-6 items-center justify-between z-30 shrink-0">
        {/* Left Brand */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center border border-cyan-400/30">
            <Train className="w-3.5 h-3.5 text-white" />
          </div>
          <h1 className="text-sm font-bold tracking-tight text-white">
            PlatformI
          </h1>
        </div>

        {/* Right Navigation (Desktop) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsStatusDrawerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-xs text-slate-300 transition"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{allLines.length} {t.navigation.activeLines}</span>
          </button>

          <button
            onClick={() => setIsAIModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-600/90 to-blue-600/90 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400/40 text-xs font-semibold transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
            <span>{t.navigation.aiAdvisor}</span>
          </button>

          <button
            onClick={() =>
              setActiveDrawer(activeDrawer === "crowdsource" ? null : "crowdsource")
            }
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition ${
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
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition ${
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
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/70 text-slate-300 hover:text-white hover:border-slate-700 transition"
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

        {/* Floating Journey Pill (above map, right side) */}
        <div className="absolute top-3 left-3 sm:left-auto sm:right-3 z-40">
          <AnimatePresence mode="wait">
            {isJourneyExpanded ? (
              <motion.div
                key="journey-expanded"
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="glass-panel rounded-xl p-3 w-72 sm:w-80 shadow-2xl shadow-black/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-bold text-white">{t.common.search || "Cari Rute"}</span>
                  </div>
                  <button
                    onClick={() => setIsJourneyExpanded(false)}
                    aria-label={t.common.close}
                    className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-emerald-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Asal"
                      value={journeyOrigin}
                      onChange={(e) => setJourneyOrigin(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                    />
                  </div>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-rose-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Tujuan"
                      value={journeyDest}
                      onChange={(e) => setJourneyDest(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                    />
                  </div>
                </div>

                <button
                  disabled={!journeyOrigin.trim() || !journeyDest.trim()}
                  className="w-full py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Cari Rute</span>
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="journey-collapsed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={() => setIsJourneyExpanded(true)}
                className="glass-panel rounded-full px-3 py-2 flex items-center gap-2 shadow-xl shadow-black/40 hover:border-cyan-500/40 transition-all cursor-pointer"
              >
                <Search className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-medium text-slate-300 hidden sm:inline">
                  {journeyOrigin && journeyDest
                    ? `${journeyOrigin} → ${journeyDest}`
                    : "Cari Rute"}
                </span>
                <span className="text-xs font-medium text-slate-300 sm:hidden">Rute</span>
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
              <CommunityLiveFeed onOpenCheckIn={handleOpenCheckIn} />
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

      {/* 4. MODALS & DRAWERS */}
      {/* Check-In Modal */}
      <CheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        initialVehicleId={checkInTargetVehicleId}
      />

      {/* Multi-Model AI Transit Advisor Modal */}
      <AITransitAssistantModal
        isOpen={isAIModalOpen || activeDrawer === "ai"}
        onClose={() => {
          setIsAIModalOpen(false);
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



      {/* 5. BOTTOM TELEMETRY STRIP */}
      <TelemetryFooter
        allLinesCount={allLines.length}
        simulationSpeed={simulationSpeed}
      />

      {/* 6. DEDICATED MOBILE & TABLET BOTTOM NAVIGATION BAR */}
      <MobileBottomNav
        onOpenAI={() => setIsAIModalOpen(true)}
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
    <footer className="h-8 border-t border-white/10 glass-panel px-3 sm:px-6 flex items-center justify-between z-30 shrink-0 text-[11px] text-slate-400 font-mono">
      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
        <span className="flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-cyan-400" />
          {simulatedVehicles.length}
        </span>
        <span className="flex items-center gap-1.5">
          <Layers className="w-3 h-3 text-blue-400" />
          {allLinesCount}
        </span>
      </div>
      <span className="shrink-0">
        {simulationSpeed === 0 ? t.navigation.paused : `${simulationSpeed}x`}
      </span>
    </footer>
  );
}
