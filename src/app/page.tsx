/**
 * PlatformI - Multimodal Regional Public Transportation Cockpit
 * Main Application Dashboard & Interactive Cartography Canvas
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Train,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Radio,
  Clock,
  Compass,
  Layers,
  Wallet,
  Users,
  Plus,
  X,
  Sparkles,
  Settings,
  Sliders,
  Shield,
  Bot,
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
import { UserTransitPreferencesModal } from "@/components/settings/UserTransitPreferencesModal";
import { TransportationSystemBar } from "@/components/navigation/TransportationSystemBar";

export default function Home() {
  const simulatedVehicles = useTransitStore((state) => state.simulatedVehicles);
  const allLines = useTransitStore((state) => state.allLines);
  const allStops = useTransitStore((state) => state.allStops);
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
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState<boolean>(false);

  // Live WIB Clock
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "Asia/Jakarta",
        }) + " WIB"
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const movingVehiclesCount = simulatedVehicles.filter(
    (v) => v.status === "IN_SERVICE" && v.speedKmh > 0
  ).length;
  const boardingVehiclesCount = simulatedVehicles.filter(
    (v) => v.status === "BOARDING"
  ).length;

  const handleOpenCheckIn = (vehicleId?: string) => {
    setCheckInTargetVehicleId(vehicleId || null);
    setIsCheckInOpen(true);
  };

  return (
    <main className="flex flex-col h-screen w-screen bg-[#090d16] text-slate-100 relative overflow-hidden select-none">
      {/* 1. TOP HEADER / STATUS HUD */}
      <header className="h-14 border-b border-white/10 glass-panel px-3 sm:px-6 flex items-center justify-between z-30 shrink-0">
        {/* Left Brand Badge */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
            <Train className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-2">
              PlatformI
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 font-mono font-normal">
                Jabodetabek
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 hidden xs:block">
              Multimodal Regional Transit Cockpit
            </p>
          </div>
        </div>

        {/* Center Disruption / Status Quick Action */}
        <div className="hidden lg:flex items-center gap-2">
          <button
            onClick={() => setIsStatusDrawerOpen(true)}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-xs text-slate-300 transition"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">Live Network Status</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 font-mono">
              {allLines.length} Lines
            </span>
          </button>
        </div>

        {/* Right Navigation & Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* AI Advisor Button */}
          <button
            onClick={() => setIsAIModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-600/90 to-blue-600/90 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400/40 text-xs font-semibold shadow-md shadow-cyan-950/40 transition transform active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
            <span className="hidden sm:inline">AI Advisor</span>
          </button>

          {/* Crowdsource Feed Toggle Button */}
          <button
            onClick={() =>
              setActiveDrawer(activeDrawer === "crowdsource" ? null : "crowdsource")
            }
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition ${
              activeDrawer === "crowdsource"
                ? "bg-cyan-950/80 border-cyan-500/50 text-cyan-300 shadow-md shadow-cyan-950/40"
                : "bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Live Feed</span>
          </button>

          {/* Pass Wallet Toggle Button */}
          <button
            onClick={() =>
              setActiveDrawer(activeDrawer === "tickets" ? null : "tickets")
            }
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition ${
              activeDrawer === "tickets"
                ? "bg-blue-950/80 border-blue-500/50 text-blue-300 shadow-md shadow-blue-950/40"
                : "bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden xs:inline">Passes</span>
          </button>

          {/* Transit Preferences Toggle */}
          <button
            onClick={() => setIsPreferencesModalOpen(true)}
            title="Transit Preferences & Pinned Networks"
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/70 text-slate-300 hover:text-white hover:border-slate-700 transition"
          >
            <Sliders className="w-4 h-4 text-slate-300" />
          </button>

          {/* Settings Modal Toggle */}
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            title="Application Settings"
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/70 text-slate-300 hover:text-white hover:border-slate-700 transition"
          >
            <Settings className="w-4 h-4 text-slate-300" />
          </button>

          {/* Operator Control Admin Portal Link */}
          <Link
            href="/admin"
            title="Operator Control Center (OCC)"
            className="p-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 transition"
          >
            <Shield className="w-4 h-4 text-cyan-400" />
          </Link>
        </div>
      </header>

      {/* 2. TOP PRIORITY DISRUPTION NOTICES BANNER */}
      <DisruptionAlertBanner onOpenStatusDrawer={() => setIsStatusDrawerOpen(true)} />

      {/* 3. MULTIMODAL TRANSPORTATION SYSTEMS & CONSOLIDATED HUBS BAR */}
      <TransportationSystemBar />

      {/* 4. MAIN CARTOGRAPHY VIEWPORT & FLOATING DRAWERS */}
      <div className="flex-1 relative overflow-hidden flex">
        <DynamicMap />

        {/* Floating Crowdsource Feed Drawer */}
        {activeDrawer === "crowdsource" && (
          <div className="absolute top-3 right-3 bottom-3 z-40 w-full sm:w-96 max-w-[calc(100vw-24px)] animate-in slide-in-from-right duration-200">
            <CommunityLiveFeed onOpenCheckIn={handleOpenCheckIn} />
          </div>
        )}

        {/* Floating Pass Wallet Drawer */}
        {activeDrawer === "tickets" && (
          <div className="absolute top-3 right-3 bottom-3 z-40 w-full sm:w-[420px] max-w-[calc(100vw-24px)] animate-in slide-in-from-right duration-200">
            <DigitalPassWallet onClose={() => setActiveDrawer(null)} />
          </div>
        )}

        {/* Enthusiast Vehicle Detail Inspector Sheet */}
        {(selectedVehicleId || activeDrawer === "vehicle") && (
          <VehicleDetailSheet
            vehicleId={selectedVehicleId}
            onClose={clearSelection}
          />
        )}

        {/* Station, Hub, Terminal & Port Detail Sheet */}
        {(selectedStopId || activeDrawer === "hub") && (
          <HubDetailSheet
            stopId={selectedStopId}
            onClose={clearSelection}
          />
        )}

        {/* Floating Bottom-Right Quick Action Button */}
        <div className="absolute bottom-4 right-4 z-30 flex items-center gap-2">
          <button
            onClick={() => handleOpenCheckIn()}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-xl shadow-emerald-950/60 flex items-center gap-1.5 border border-emerald-400/30 transition transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>1-Tap Check-In</span>
          </button>
        </div>
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

      {/* User Transit Preferences Modal */}
      <UserTransitPreferencesModal
        isOpen={isPreferencesModalOpen}
        onClose={() => setIsPreferencesModalOpen(false)}
      />

      {/* 5. BOTTOM TELEMETRY TICKER / METRICS STRIP */}
      <footer className="h-9 border-t border-white/10 glass-panel px-3 sm:px-6 flex items-center justify-between z-30 shrink-0 text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-3 sm:gap-6 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-cyan-400" />
            <span>
              Fleet:{" "}
              <strong className="text-slate-200">{simulatedVehicles.length} Units</strong>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>
              Moving: <strong className="text-emerald-400">{movingVehiclesCount}</strong>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>
              Boarding: <strong className="text-amber-400">{boardingVehiclesCount}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-blue-400" />
            <span>
              Networks:{" "}
              <strong className="text-slate-200">{allLines.length} Lines</strong>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5">
            <Compass className="w-3 h-3 text-emerald-400" />
            <span>
              Interchanges:{" "}
              <strong className="text-slate-200">{allStops.length} Hubs</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-[11px] text-slate-400">
            Speed:{" "}
            <span className="text-cyan-400 font-bold">
              {simulationSpeed === 0 ? "Paused (0x)" : `${simulationSpeed}x`}
            </span>
          </div>
          <span className="text-slate-600 hidden sm:inline">&bull;</span>
          <div className="hidden sm:inline text-[11px] text-slate-500">
            PlatformI &bull; DKI Jakarta & Bodetabek
          </div>
        </div>
      </footer>
    </main>
  );
}
