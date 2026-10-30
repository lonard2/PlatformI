/**
 * PlatformI - Application Settings Modal
 *
 * Controls cartography basemap tiles, simulation speed, and the
 * accessibility preferences that are actually applied to the app.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Layers,
  Gauge,
  Sparkles,
  Eye,
  Sliders,
  X,
  Check,
  RotateCcw,
  User,
  Info,
} from "lucide-react";
import { useTransitStore, TileLayerId, SimulationSpeed } from "@/lib/stores/useTransitStore";
import { useAccessibilityStore } from "@/lib/stores/useAccessibilityStore";
import { useDialogFocusTrap } from "@/lib/hooks/useDialogFocusTrap";
import { useTranslation, SupportedLanguage } from "@/lib/i18n";
import { MemberAccountPanel } from "@/components/settings/MemberAccountPanel";

export interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppSettingsModal: React.FC<AppSettingsModalProps> = ({ isOpen, onClose }) => {
  const { t, language, setLanguage, supportedLanguages } = useTranslation();
  const activeTileLayer = useTransitStore((state) => state.activeTileLayer);
  const setTileLayer = useTransitStore((state) => state.setTileLayer);
  const simulationSpeed = useTransitStore((state) => state.simulationSpeed);
  const setSimulationSpeed = useTransitStore((state) => state.setSimulationSpeed);
  const reducedMotion = useAccessibilityStore((state) => state.reducedMotion);
  const setReducedMotion = useAccessibilityStore((state) => state.setReducedMotion);
  const highContrast = useAccessibilityStore((state) => state.highContrast);
  const setHighContrast = useAccessibilityStore((state) => state.setHighContrast);
  const resetAccessibility = useAccessibilityStore((state) => state.resetAccessibility);

  // Local state for app-level toggles

  const tileOptions: { id: TileLayerId; label: string; desc: string }[] = [
    { id: "dark", label: t.settings.darkMatter, desc: t.settings.tileDarkDesc },
    { id: "light", label: t.settings.positronLight, desc: t.settings.tileLightDesc },
    { id: "satellite", label: t.settings.tileSatelliteLabel, desc: t.settings.tileSatelliteDesc },
    { id: "streets", label: t.settings.tileStreetsLabel, desc: t.settings.tileStreetsDesc },
  ];

  const speedOptions: { speed: SimulationSpeed; label: string; desc: string }[] = [
    { speed: 0, label: t.settings.pausedEngine, desc: t.settings.speedPausedDesc },
    { speed: 1, label: t.settings.realtimeSpeed, desc: t.settings.speedRealtimeDesc },
    { speed: 2, label: t.settings.fastSpeed2x, desc: t.settings.speedFastDesc },
    { speed: 5, label: t.settings.hyperSpeed5x, desc: t.settings.speedHyperDesc },
  ];

  const modalTitleId = "settings-modal-title";

  // Dialog grammar: focus is trapped while the modal is open and restored to
  // the trigger on close. The hook owns the container ref — attaching a
  // separate ref would leave autofocus and Tab-cycling inert.
  const { containerRef } = useDialogFocusTrap<HTMLDivElement>({ isOpen, onClose });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    },
    [onClose]
  );

  const handleReset = () => {
    setTileLayer("dark");
    setSimulationSpeed(1);
    resetAccessibility();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-[#0c1220] border border-white/15 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 outline-none"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
        {/* 1. HEADER */}
        <div className="px-5 py-4 border-b border-white/10 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 id={modalTitleId} className="text-base font-bold text-white tracking-tight">{t.settings.title}</h2>
              <p className="text-xs text-slate-400">{t.settings.subtitle}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label={t.common.close}
            className="touch-target p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white btn-tactile transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. SETTINGS CONTENT BODY */}
        <div className="flex-1 p-5 overflow-y-auto space-y-6 text-xs sm:text-sm">
          {/* Section B: Basemap Tile Selector */}
          <div className="space-y-2.5">
            <label className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              {t.settings.mapTileLayer}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tileOptions.map((tile) => (
                <button
                  key={tile.id}
                  aria-pressed={activeTileLayer === tile.id}
                  onClick={() => setTileLayer(tile.id)}
                  className={`p-3 rounded-xl border flex items-start gap-2.5 transition text-left ${
                    activeTileLayer === tile.id
                      ? "bg-blue-950/70 border-blue-500/60 text-blue-200 shadow-md"
                      : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="mt-0.5">
                    {activeTileLayer === tile.id ? (
                      <Check className="w-4 h-4 text-blue-400" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-700" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{tile.label}</div>
                    <div className="text-[10px] text-slate-400">{tile.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section C: Simulation Engine Clock Speed */}
          <div className="space-y-2.5">
            <label className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              {t.settings.simulationEngineSpeed}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {speedOptions.map((opt) => (
                <button
                  key={opt.speed}
                  aria-pressed={simulationSpeed === opt.speed}
                  onClick={() => setSimulationSpeed(opt.speed)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition ${
                    simulationSpeed === opt.speed
                      ? "bg-emerald-950/70 border-emerald-500/60 text-emerald-300 font-bold shadow-md"
                      : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <span className="font-mono text-sm">{opt.label}</span>
                  <span className="text-[10px] text-slate-400 leading-tight mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section: Accessibility Toggles */}
          <div className="space-y-3 pt-1">
            <label className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              {t.settings.accessibility}
            </label>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="font-semibold text-white">{t.settings.highContrast}</div>
                    <div className="text-[10px] text-slate-400">{t.settings.highContrastDesc}</div>
                  </div>
                </div>
                <label className="touch-target flex items-center justify-center cursor-pointer">
                  <input
                    type="checkbox"
                    aria-label={t.settings.highContrast}
                    checked={highContrast}
                    onChange={(e) => setHighContrast(e.target.checked)}
                    className="w-5 h-5 rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-cyan-500"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="font-semibold text-white">{t.settings.reducedMotion}</div>
                    <div className="text-[10px] text-slate-400">{t.settings.reducedMotionDesc}</div>
                  </div>
                </div>
                <label className="touch-target flex items-center justify-center cursor-pointer">
                  <input
                    type="checkbox"
                    aria-label={t.settings.reducedMotion}
                    checked={reducedMotion}
                    onChange={(e) => setReducedMotion(e.target.checked)}
                    className="w-5 h-5 rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-cyan-500"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Section: Language Switcher */}
          <div className="space-y-2.5">
            <label className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              {t.settings.languageSelection}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  aria-pressed={language === lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition ${
                    language === lang.code
                      ? "bg-cyan-950/80 border-cyan-500/60 text-cyan-300 shadow-md ring-1 ring-cyan-500/30"
                      : "bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <span>{lang.nativeName}</span>
                  <span className="text-[10px] font-mono opacity-60 uppercase">{lang.flagLabel}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section: Admin Portal Link */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-white text-xs">{t.settings.adminPortal}</div>
                <div className="text-[11px] text-slate-400">{t.settings.adminPortalDesc}</div>
              </div>
              <a
                href="/admin"
                className="touch-target px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-semibold transition"
              >
                {t.navigation.adminPanel}
              </a>
            </div>
          </div>

          {/* Section: About & Credits Link */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-400" />
                  {t.about.title}
                </div>
                <div className="text-[11px] text-slate-400">{t.about.linkDesc}</div>
              </div>
              <a
                href="/about"
                className="touch-target px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-semibold transition"
              >
                {t.about.title}
              </a>
            </div>
          </div>

          {/* Section: Member Account */}
          <div className="space-y-2.5">
            <label className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              {t.account.title}
            </label>
            <MemberAccountPanel />
          </div>
        </div>

        {/* 3. FOOTER ACTIONS */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-t border-white/10 flex items-center justify-between shrink-0">
          <button
            onClick={handleReset}
            className="touch-target flex items-center gap-1.5 text-xs text-slate-400 hover:text-white btn-tactile transition font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.settings.resetDefaults}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              aria-label={t.common.done}
              className="touch-target px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-xs font-bold text-slate-950 shadow-md flex items-center gap-1.5 btn-tactile transition"
            >
              <span>{t.common.done}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
  );
};
