/**
 * PlatformI - Mobile & Tablet Bottom Navigation Bar
 * High-precision thumb-friendly touch navigation for mobile (< 640px) and tablet (< 1024px).
 * 6 equal-weight buttons: Map, Status, Route, Tickets, Community, AI Advisor.
 *
 * Rules: Zero raw emojis, strict Lucide SVG icons, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useMemo, useEffect, useRef, useState } from "react";
import { getHighestSeverity } from "@/lib/services/severityRollup";
import {
  MapPin,
  Activity,
  Navigation,
  Sparkles,
  QrCode,
  Users,
  MoreHorizontal,
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

  // Numbered severity badge: count of actionable alerts, capped for glanceability.
  const activeAlertCount = useMemo(
    () => activeAlerts.filter((a) => a.status === "ACTIVE").length,
    [activeAlerts]
  );
  const badgeCount = activeAlertCount > 9 ? "9+" : String(activeAlertCount);

  const [moreOpen, setMoreOpen] = useState<boolean>(false);

  // Shared keyboard focus affordance for every nav target.
  const TAB_FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60";

  const navRef = useRef<HTMLElement | null>(null);

  // Publish the real navigation height so the cockpit footer and the vehicle
  // sheet reserve exactly what the nav occupies (it grows with the safe area).
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const publishHeight = () => {
      const height = nav.offsetHeight;
      if (height > 0) {
        document.documentElement.style.setProperty("--bottom-nav-h", `${height}px`);
      }
    };

    publishHeight();
    const observer = new ResizeObserver(publishHeight);
    observer.observe(nav);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--bottom-nav-h");
    };
  }, []);

  const isWalletActive = activeDrawer === "tickets";
  const isCrowdsourceActive = activeDrawer === "crowdsource";
  const isStatusActive = activeDrawer === "alerts";
  const isMapActive = !activeDrawer && !isAIOpen;

  const closeSheet = () => setMoreOpen(false);

  const handleMapClick = () => {
    closeSheet();
    if (activeDrawer || isAIOpen) {
      // Returning home: dismiss drawers but preserve map context.
      setActiveDrawer(null);
      onCloseAI?.();
    } else {
      // Already home: explicit reset.
      clearSelection();
    }
  };

  const handleWalletClick = () => {
    closeSheet();
    onCloseAI?.();
    setActiveDrawer(isWalletActive ? null : "tickets");
  };

  const handleCrowdsourceClick = () => {
    closeSheet();
    onCloseAI?.();
    setActiveDrawer(isCrowdsourceActive ? null : "crowdsource");
  };

  const handleStatusClick = () => {
    closeSheet();
    onOpenStatus();
  };

  const handleJourneyClick = () => {
    closeSheet();
    onOpenJourney?.();
  };

  const handleAIClick = () => {
    closeSheet();
    onOpenAI();
  };

  return (
    <nav
      ref={navRef}
      aria-label={t.navigation.mainNavigation}
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--glass-chrome)] backdrop-blur-2xl border-t border-white/15 px-2 py-1.5 flex items-center justify-around shadow-2xl shadow-black safe-area-pb"
    >
      {/* 1. PETA (MAP) */}
      <button
        onClick={handleMapClick}
        aria-current={isMapActive ? "page" : undefined}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 min-h-[48px] py-1.5 rounded-xl transition-all active:scale-95 ${TAB_FOCUS} ${
          isMapActive
            ? "text-cyan-400 font-bold"
            : "text-slate-300 hover:text-white"
        }`}
      >
        <MapPin className="w-5 h-5" />
        <span className="text-xs tracking-tight truncate max-w-full">{t.navigation.tabMap}</span>
        {isMapActive && <span className="w-1 h-1 rounded-full bg-cyan-400 mt-0.5" />}
      </button>

      {/* 3. RUTE (JOURNEY) */}
      <button
        onClick={handleJourneyClick}
        aria-expanded={isJourneyOpen}
        aria-disabled={!onOpenJourney}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 min-h-[48px] py-1.5 rounded-xl transition-all active:scale-95 ${TAB_FOCUS} ${
          isJourneyOpen
            ? "text-cyan-400 font-bold"
            : "text-slate-300 hover:text-white"
        } ${!onOpenJourney ? "opacity-60" : ""}`}
      >
        <Navigation className="w-5 h-5" />
        <span className="text-xs tracking-tight truncate max-w-full">{t.navigation.tabRoute}</span>
        {isJourneyOpen && <span className="w-1 h-1 rounded-full bg-cyan-400 mt-0.5" />}
      </button>


      {/* 2. LAYANAN & STATUS (SERVICES) */}
      <button
        onClick={handleStatusClick}
        aria-haspopup="dialog"
        aria-expanded={isStatusActive}
        aria-label={
          activeAlertCount > 0
            ? `${t.navigation.tabStatus}: ${t.navigation.statusAlertCount.replace("{n}", badgeCount)}`
            : undefined
        }
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 min-h-[48px] py-1.5 rounded-xl transition-all active:scale-95 ${TAB_FOCUS} ${
          isStatusActive
            ? "text-cyan-400 font-bold"
            : "text-slate-300 hover:text-white"
        }`}
      >
        <div className="relative">
          <Activity className="w-5 h-5" aria-hidden="true" />
          {activeAlertCount > 0 ? (
            <span
              aria-hidden="true"
              className={`absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ${
                highestSeverity === "CRITICAL"
                  ? "bg-rose-500 text-white ring-rose-950 motion-safe:animate-pulse"
                  : highestSeverity === "WARNING"
                  ? "bg-amber-400 text-amber-950 ring-amber-950"
                  : "bg-emerald-500 text-emerald-950 ring-emerald-950"
              }`}
            >
              {badgeCount}
            </span>
          ) : (
            <span
              aria-hidden="true"
              className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                highestSeverity === "CRITICAL"
                  ? "bg-rose-500 animate-pulse ring-2 ring-rose-950"
                  : highestSeverity === "WARNING"
                  ? "bg-amber-400 ring-2 ring-amber-950"
                  : "bg-emerald-400 ring-2 ring-emerald-950"
              }`}
            />
          )}
        </div>
        <span className="text-xs tracking-tight truncate max-w-full">{t.navigation.tabStatus}</span>
        {isStatusActive && <span className="w-1 h-1 rounded-full bg-cyan-400 mt-0.5" />}
      </button>

      {/* 4. TIKET (TICKETS / QR) */}
      <button
        onClick={handleWalletClick}
        aria-haspopup="dialog"
        aria-expanded={isWalletActive}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 min-h-[48px] py-1.5 rounded-xl transition-all active:scale-95 ${TAB_FOCUS} ${
          isWalletActive
            ? "text-cyan-400 font-bold"
            : "text-slate-300 hover:text-white"
        }`}
      >
        <QrCode className="w-5 h-5" />
        <span className="text-xs tracking-tight truncate max-w-full">{t.navigation.tabTickets}</span>
        {isWalletActive && <span className="w-1 h-1 rounded-full bg-cyan-400 mt-0.5" />}
      </button>

      {/* 5. MORE (SECONDARY ENTRIES) */}
      <button
        onClick={() => setMoreOpen((prev) => !prev)}
        aria-expanded={moreOpen}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 min-h-[48px] py-1.5 rounded-xl transition-all active:scale-95 ${TAB_FOCUS} ${
          moreOpen
            ? "text-cyan-400 font-bold"
            : "text-slate-300 hover:text-white"
        }`}
      >
        <MoreHorizontal className="w-5 h-5" />
        <span className="text-xs tracking-tight truncate max-w-full">{t.navigation.more}</span>
        {moreOpen && <span className="w-1 h-1 rounded-full bg-cyan-400 mt-0.5" />}
      </button>

      {moreOpen && (
        <div className="absolute bottom-full left-2 right-2 mb-2 rounded-2xl bg-slate-900/95 border border-white/10 p-2 space-y-1 shadow-2xl shadow-black">
          <button
            type="button"
            onClick={handleCrowdsourceClick}
            aria-haspopup="dialog"
            aria-expanded={isCrowdsourceActive}
            className={`w-full min-h-[48px] px-3 rounded-xl flex items-center gap-3 text-xs font-semibold transition active:scale-[0.98] ${TAB_FOCUS} ${
              isCrowdsourceActive
                ? "bg-cyan-950/80 text-cyan-400 font-bold"
                : "text-slate-200 hover:bg-white/5"
            }`}
          >
            <Users className="w-5 h-5 shrink-0" />
            <span className="truncate">{t.navigation.tabCommunity}</span>
          </button>
          <button
            type="button"
            onClick={handleAIClick}
            aria-label={t.navigation.aiAdvisor}
            aria-haspopup="dialog"
            aria-expanded={isAIOpen}
            className={`w-full min-h-[48px] px-3 rounded-xl flex items-center gap-3 text-xs font-semibold transition active:scale-[0.98] ${TAB_FOCUS} ${
              isAIOpen
                ? "bg-cyan-950/80 text-cyan-400 font-bold"
                : "text-slate-200 hover:bg-white/5"
            }`}
          >
            <Sparkles className="w-5 h-5 shrink-0" />
            <span className="truncate">{t.navigation.tabAI}</span>
          </button>
        </div>
      )}
    </nav>
  );
}