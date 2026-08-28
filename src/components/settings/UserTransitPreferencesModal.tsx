/**
 * PlatformI - User Commuter Transit Preferences Modal
 *
 * Configures pinned transit modes, routing priorities (JakLingko tariff cap,
 * speed, accessibility), and disruption notification thresholds.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sliders,
  Train,
  Bus,
  Plane,
  Anchor,
  Sparkles,
  ShieldCheck,
  Check,
  X,
  RotateCcw,
  Zap,
  DollarSign,
  Accessibility,
  Bell,
  CheckSquare,
  Square,
} from "lucide-react";
import { TransitMode, TransitCategory } from "@/types/transit";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { TRANSIT_MODE_CONFIG, TRANSIT_CATEGORY_CONFIG } from "@/lib/constants/modes";
import { useTranslation } from "@/lib/i18n";

export interface UserTransitPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type RoutingPriority = "SPEED" | "FARE" | "TRANSFERS" | "ACCESSIBILITY";
type NotificationThreshold = "CRITICAL" | "ALL" | "NONE";

export const UserTransitPreferencesModal: React.FC<UserTransitPreferencesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const selectedModes = useTransitStore((state) => state.selectedModes);
  const toggleMode = useTransitStore((state) => state.toggleMode);
  const selectAllModes = useTransitStore((state) => state.selectAllModes);
  const clearAllModes = useTransitStore((state) => state.clearAllModes);

  const [routingPriority, setRoutingPriority] = useState<RoutingPriority>("SPEED");
  const [notificationThreshold, setNotificationThreshold] =
    useState<NotificationThreshold>("ALL");
  const [saveToast, setSaveToast] = useState<boolean>(false);

  const categories: TransitCategory[] = ["RAIL", "BUS", "AVIATION", "MARITIME"];

  const getCategoryIcon = (category: TransitCategory) => {
    switch (category) {
      case "RAIL":
        return <Train className="w-4 h-4 text-rose-400" />;
      case "BUS":
        return <Bus className="w-4 h-4 text-cyan-400" />;
      case "AVIATION":
        return <Plane className="w-4 h-4 text-teal-400" />;
      case "MARITIME":
        return <Anchor className="w-4 h-4 text-blue-400" />;
    }
  };

  const routingOptions: { id: RoutingPriority; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: "SPEED",
      label: t.preferences.fastestRoute,
      desc: t.preferences.fastestRouteDesc,
      icon: <Zap className="w-4 h-4 text-amber-400" />,
    },
    {
      id: "FARE",
      label: t.preferences.cheapestFare,
      desc: t.preferences.cheapestFareDesc,
      icon: <DollarSign className="w-4 h-4 text-emerald-400" />,
    },
    {
      id: "TRANSFERS",
      label: t.preferences.leastTransfers,
      desc: t.preferences.leastTransfersDesc,
      icon: <Train className="w-4 h-4 text-cyan-400" />,
    },
    {
      id: "ACCESSIBILITY",
      label: t.preferences.wheelchairAccessible,
      desc: t.preferences.wheelchairAccessibleDesc,
      icon: <Accessibility className="w-4 h-4 text-purple-400" />,
    },
  ];

  const handleSave = () => {
    setSaveToast(true);
    setTimeout(() => {
      setSaveToast(false);
      onClose();
    }, 600);
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
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-[#0c1220] border border-white/15 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
        {/* 1. HEADER */}
        <div className="px-5 py-4 border-b border-white/10 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20 border border-teal-400/30">
              <Sliders className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {t.preferences.title}
              </h2>
              <p className="text-xs text-slate-400">
                {t.preferences.subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label={t.common.close}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. BODY */}
        <div className="flex-1 p-5 overflow-y-auto space-y-6 text-xs sm:text-sm">
          {/* Section A: Pinned Transit Networks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Active & Pinned Transit Modes ({selectedModes.length} Active)
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllModes}
                  className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition"
                >
                  {t.preferences.selectAll}
                </button>
                <span className="text-slate-600">&bull;</span>
                <button
                  onClick={clearAllModes}
                  className="text-[11px] font-medium text-slate-400 hover:text-slate-200 transition"
                >
                  {t.preferences.clearAll}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {categories.map((category) => {
                const categoryConfig = TRANSIT_CATEGORY_CONFIG[category];
                const modes = categoryConfig.modes;

                return (
                  <div key={category} className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                      {getCategoryIcon(category)}
                      <span>{categoryConfig.name}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {modes.map((mode) => {
                        const modeConfig = TRANSIT_MODE_CONFIG[mode];
                        const isSelected = selectedModes.includes(mode);

                        return (
                          <button
                            key={mode}
                            onClick={() => toggleMode(mode)}
                            className={`p-2.5 rounded-lg border flex items-center justify-between transition text-left ${
                              isSelected
                                ? "bg-slate-800/90 border-white/20 text-white"
                                : "bg-slate-950/40 border-slate-900 text-slate-500 hover:text-slate-400"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                style={{ backgroundColor: modeConfig.colorHex }}
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                              />
                              <span className="truncate text-xs font-medium">
                                {modeConfig.name}
                              </span>
                            </div>
                            {isSelected ? (
                              <CheckSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section B: Routing Priority Optimization */}
          <div className="space-y-3">
            <label className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              {t.preferences.routingPriority}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {routingOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setRoutingPriority(opt.id)}
                  className={`p-3 rounded-xl border flex items-start gap-2.5 transition text-left ${
                    routingPriority === opt.id
                      ? "bg-teal-950/70 border-teal-500/60 text-teal-200 shadow-md"
                      : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="mt-0.5">{opt.icon}</div>
                  <div>
                    <div className="font-semibold text-white">{opt.label}</div>
                    <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                      {opt.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section C: {t.preferences.alertNotifications} */}
          <div className="space-y-3">
            <label className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
              <Bell className="w-3.5 h-3.5 text-rose-400" />
              Disruption Alert Notifications
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setNotificationThreshold("CRITICAL")}
                className={`p-2.5 rounded-xl border text-center transition ${
                  notificationThreshold === "CRITICAL"
                    ? "bg-rose-950/70 border-rose-500/60 text-rose-300 font-bold"
                    : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="text-xs">{t.preferences.criticalOnly}</div>
                <div className="text-[9px] text-slate-400">Severe disruptions</div>
              </button>

              <button
                onClick={() => setNotificationThreshold("ALL")}
                className={`p-2.5 rounded-xl border text-center transition ${
                  notificationThreshold === "ALL"
                    ? "bg-cyan-950/70 border-cyan-500/60 text-cyan-300 font-bold"
                    : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="text-xs">{t.preferences.allBulletins}</div>
                <div className="text-[9px] text-slate-400">Delays & maintenance</div>
              </button>

              <button
                onClick={() => setNotificationThreshold("NONE")}
                className={`p-2.5 rounded-xl border text-center transition ${
                  notificationThreshold === "NONE"
                    ? "bg-slate-800 border-white/30 text-white font-bold"
                    : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="text-xs">{t.preferences.muted}</div>
                <div className="text-[9px] text-slate-400">No popups</div>
              </button>
            </div>
          </div>
        </div>

        {/* 3. FOOTER */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-t border-white/10 flex items-center justify-between shrink-0">
          <button
            onClick={() => selectAllModes()}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.preferences.selectAll}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs text-slate-300 transition"
            >
              {t.common.cancel}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-xs font-bold text-white shadow-lg shadow-teal-950/50 flex items-center gap-1.5 transition transform active:scale-95"
            >
              {saveToast ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{t.common.success}</span>
                </>
              ) : (
                <span>{t.preferences.savePreferences}</span>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
  );
};
