/**
 * PlatformI - Mobile & Tablet Bottom Navigation Bar
 * High-precision thumb-friendly touch navigation for mobile (< 640px) and tablet (< 1024px).
 * 5 equal-weight buttons: Map, Services, Journey, Tickets, Community.
 *
 * Rules: Zero raw emojis, strict Lucide SVG icons, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useMemo } from "react";
import { getHighestSeverity } from "@/lib/services/severityRollup";
import {
  MapPin,
  Activity,
  Navigation,
  Sparkles,
  QrCode,
  Users,
} from "lucide-react";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { useTranslation } from "@/lib/i18n";

interface MobileBottomNavProps {
  onOpenAI: () => void;
  onCloseAI?: () => void;
  onOpenStatus: () => void;
  onOpenJourney?: () => void;
  isAIOpen?: boolean;
  isJourneyOpen?: boolean;
}

export function MobileBottomNav({
  onOpenAI,
  onCloseAI,
  onOpenStatus,
  onOpenJourney,
  isAIOpen = false,
  isJourneyOpen = false,
}: MobileBottomNavProps) {
  const { t } = useTranslation();
  const activeDrawer = useTransitStore((state) => state.activeDrawer);
  const setActiveDrawer = useTransitStore((state) => state.setActiveDrawer);
  const clearSelection = useTransitStore((state) => state.clearSelection);
  const activeAlerts = useTransitStore((state) => state.activeAlerts);

  const highestSeverity = useMemo(() => getHighestSeverity(activeAlerts), [activeAlerts]);

  const isWalletActive = activeDrawer === "tickets";
  const isCrowdsourceActive = activeDrawer === "crowdsource";
  const isStatusActive = activeDrawer === "alerts";
  const isMapActive = !activeDrawer && !isAIOpen;

  const handleMapClick = () => {
    setActiveDrawer(null);
    clearSelection();
    onCloseAI?.();
  };

  const handleWalletClick = () => {
    onCloseAI?.();
    setActiveDrawer(isWalletActive ? null : "tickets");
  };

  const handleCrowdsourceClick = () => {
    onCloseAI?.();
    setActiveDrawer(isCrowdsourceActive ? null : "crowdsource");
  };

  return (
    <nav
      aria-label={t.navigation.mainNavigation}
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--glass-chrome)] backdrop-blur-2xl border-t border-white/15 px-2 py-1.5 flex items-center justify-around shadow-2xl shadow-black safe-area-pb"
    >
      {/* 1. PETA (MAP) */}
      <button
        onClick={handleMapClick}
        aria-current={isMapActive ? "page" : undefined}
        aria-pressed={isMapActive}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 min-h-[48px] py-1.5 rounded-xl transition-all active:scale-95 ${
          isMapActive
            ? "text-cyan-400 font-bold"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <MapPin className="w-5 h-5" />
        <span className="text-[11px] tracking-tight truncate max-w-full">{t.navigation.tabMap}</span>
        {isMapActive && <span className="w-1 h-1 rounded-full bg-cyan-400 mt-0.5" />}
      </button>

      {/* 2. LAYANAN & STATUS (SERVICES) */}
      <button
        onClick={onOpenStatus}
        aria-haspopup="dialog"
        aria-expanded={isStatusActive}
        aria-pressed={isStatusActive}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 min-h-[48px] py-1.5 rounded-xl transition-all active:scale-95 ${
          isStatusActive
            ? "text-cyan-400 font-bold"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <div className="relative">
          <Activity className="w-5 h-5" />
          <span
            className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
              highestSeverity === "CRITICAL"
                ? "bg-rose-500 animate-pulse ring-2 ring-rose-950"
                : highestSeverity === "WARNING"
                ? "bg-amber-400 ring-2 ring-amber-950"
                : "bg-emerald-400 ring-2 ring-emerald-950"
            }`}
          />
        </div>
        <span className="text-[11px] tracking-tight truncate max-w-full">{t.navigation.tabStatus}</span>
        {isStatusActive && <span className="w-1 h-1 rounded-full bg-cyan-400 mt-0.5" />}
      </button>

      {/* 3. RUTE (JOURNEY) */}
      <button
        onClick={onOpenJourney}
        aria-expanded={isJourneyOpen}
        aria-pressed={isJourneyOpen}
        className="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 min-h-[48px] py-1.5 rounded-xl text-slate-400 hover:text-slate-200 transition-all active:scale-95"
      >
        <Navigation className="w-5 h-5" />
        <span className="text-[11px] tracking-tight truncate max-w-full">{t.navigation.tabRoute}</span>
        {isJourneyOpen && <span className="w-1 h-1 rounded-full bg-cyan-400 mt-0.5" />}
      </button>

      {/* 4. TIKET (TICKETS / QR) */}
      <button
        onClick={handleWalletClick}
        aria-haspopup="dialog"
        aria-expanded={isWalletActive}
        aria-pressed={isWalletActive}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 min-h-[48px] py-1.5 rounded-xl transition-all active:scale-95 ${
          isWalletActive
            ? "text-cyan-400 font-bold"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <QrCode className="w-5 h-5" />
        <span className="text-[11px] tracking-tight truncate max-w-full">{t.navigation.tabTickets}</span>
        {isWalletActive && <span className="w-1 h-1 rounded-full bg-cyan-400 mt-0.5" />}
      </button>

      {/* 5. KOMUNITAS (CROWDSOURCE) */}
      <button
        onClick={handleCrowdsourceClick}
        aria-haspopup="dialog"
        aria-expanded={isCrowdsourceActive}
        aria-pressed={isCrowdsourceActive}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 min-h-[48px] py-1.5 rounded-xl transition-all active:scale-95 ${
          isCrowdsourceActive
            ? "text-cyan-400 font-bold"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <Users className="w-5 h-5" />
        <span className="text-[11px] tracking-tight truncate max-w-full">{t.navigation.tabCommunity}</span>
        {isCrowdsourceActive && <span className="w-1 h-1 rounded-full bg-cyan-400 mt-0.5" />}
      </button>

      {/* 6. AI ADVISOR */}
      <button
        onClick={onOpenAI}
        aria-label={t.navigation.aiAdvisor}
        title={t.navigation.aiAdvisor}
        aria-haspopup="dialog"
        aria-expanded={isAIOpen}
        aria-pressed={isAIOpen}
        className={`touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 min-h-[48px] py-1.5 rounded-xl transition-all active:scale-95 ${
          isAIOpen
            ? "text-cyan-400 font-bold"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <div className="relative">
          <Sparkles className={`w-5 h-5 ${isAIOpen ? "text-cyan-400" : "text-cyan-300 motion-safe:animate-pulse"}`} />
        </div>
        <span className="text-[11px] tracking-tight truncate max-w-full font-semibold text-cyan-300">{t.navigation.tabAI}</span>
        {isAIOpen && <span className="w-1 h-1 rounded-full bg-cyan-400 mt-0.5" />}
      </button>
    </nav>
  );
}
