/**
 * PlatformI - Commuter Crowdsourcing 1-Tap Check-In Modal
 *
 * Implements:
 * - 4-level Crowd Density Picker (Level 1: Low, Level 2: Moderate, Level 3: High, Level 4: Crush Load)
 * - AC Comfort Rating (Cold, Optimal, Warm, Hot)
 * - Vehicle fleet selector with real-time route badges
 * - Optimistic Zustand store dispatch and SQLite API persistence
 * - 60-second client-side rate limit cooldown protector
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Wind,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  Radio,
  Train,
  Bus,
  Clock,
  Sparkles,
  Shield,
  Loader2,
} from "lucide-react";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { CrowdDensityLevel, ACComfortRating } from "@/types/transit";
import { useTranslation } from "@/lib/i18n";

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialVehicleId?: string | null;
}

const DENSITY_OPTIONS: {
  level: CrowdDensityLevel;
  numeric: number;
  label: string;
  sublabel: string;
  badgeClass: string;
  borderClass: string;
  bgSelectedClass: string;
}[] = [
  {
    level: "LEVEL_1_MANY_SEATS",
    numeric: 1,
    label: "Level 1: Low Density",
    sublabel: "Many empty seats available",
    badgeClass: "bg-emerald-950/70 border-emerald-500/40 text-emerald-300",
    borderClass: "border-emerald-500/50 hover:border-emerald-400",
    bgSelectedClass: "bg-emerald-950/80 border-emerald-400 shadow-emerald-950/40",
  },
  {
    level: "LEVEL_2_FEW_SEATS",
    numeric: 2,
    label: "Level 2: Moderate",
    sublabel: "Few seats left, standing begins",
    badgeClass: "bg-amber-950/70 border-amber-500/40 text-amber-300",
    borderClass: "border-amber-500/50 hover:border-amber-400",
    bgSelectedClass: "bg-amber-950/80 border-amber-400 shadow-amber-950/40",
  },
  {
    level: "LEVEL_3_STANDING_ONLY",
    numeric: 3,
    label: "Level 3: High Density",
    sublabel: "Standing room only, crowded aisle",
    badgeClass: "bg-orange-950/70 border-orange-500/40 text-orange-300",
    borderClass: "border-orange-500/50 hover:border-orange-400",
    bgSelectedClass: "bg-orange-950/80 border-orange-400 shadow-orange-950/40",
  },
  {
    level: "LEVEL_4_FULL_CRUSH",
    numeric: 4,
    label: "Level 4: Crush Load",
    sublabel: "Max capacity, doorway congestion",
    badgeClass: "bg-rose-950/70 border-rose-500/40 text-rose-300",
    borderClass: "border-rose-500/50 hover:border-rose-400",
    bgSelectedClass: "bg-rose-950/80 border-rose-400 shadow-rose-950/40",
  },
];

const AC_OPTIONS: {
  rating: ACComfortRating;
  label: string;
  sublabel: string;
  badgeClass: string;
}[] = [
  {
    rating: "COLD",
    label: "Cold (Sejuk Dingin)",
    sublabel: "< 22 deg C strong cooling",
    badgeClass: "bg-cyan-950/60 border-cyan-500/30 text-cyan-300",
  },
  {
    rating: "OPTIMAL",
    label: "Optimal (Nyaman)",
    sublabel: "23 - 25 deg C fresh airflow",
    badgeClass: "bg-emerald-950/60 border-emerald-500/30 text-emerald-300",
  },
  {
    rating: "WARM",
    label: "Warm (Kurang Dingin)",
    sublabel: "26 - 28 deg C warm airflow",
    badgeClass: "bg-amber-950/60 border-amber-500/30 text-amber-300",
  },
  {
    rating: "HOT",
    label: "Hot (AC Gangguan)",
    sublabel: "> 28 deg C stuffy/stale air",
    badgeClass: "bg-rose-950/60 border-rose-500/30 text-rose-300",
  },
];

export const CheckInModal: React.FC<CheckInModalProps> = ({
  isOpen,
  onClose,
  initialVehicleId,
}) => {
  const { t } = useTranslation();
  const simulatedVehicles = useTransitStore((state) => state.simulatedVehicles);
  const selectedVehicleId = useTransitStore((state) => state.selectedVehicleId);
  const updateSingleVehicle = useTransitStore((state) => state.updateSingleVehicle);

  const [targetVehicleId, setTargetVehicleId] = useState<string>("");
  const [selectedDensity, setSelectedDensity] = useState<CrowdDensityLevel>("LEVEL_2_FEW_SEATS");
  const [selectedAC, setSelectedAC] = useState<ACComfortRating>("OPTIMAL");
  const [note, setNote] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  // Sync target vehicle when modal opens
  useEffect(() => {
    if (isOpen) {
      const activeId = initialVehicleId || selectedVehicleId || simulatedVehicles[0]?.id || "";
      setTargetVehicleId(activeId);
      setIsSubmitted(false);
      setErrorMessage(null);
    }
  }, [isOpen, initialVehicleId, selectedVehicleId, simulatedVehicles]);

  // Cooldown timer ticker
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  if (!isOpen) return null;

  const currentVehicle = simulatedVehicles.find((v) => v.id === targetVehicleId);

  const handleSubmit = async () => {
    if (!targetVehicleId) {
      setErrorMessage("Please select an active transit vehicle to check-in.");
      return;
    }

    if (cooldownSeconds > 0) {
      setErrorMessage(`Please wait ${cooldownSeconds}s before submitting another report.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Optimistically update local Zustand store
      if (currentVehicle) {
        updateSingleVehicle({
          ...currentVehicle,
          crowdLevel: selectedDensity,
          acComfort: selectedAC,
        });
      }

      // 2. Dispatch to API
      const res = await fetch("/api/crowdsource/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: targetVehicleId,
          crowdLevel: selectedDensity,
          acComfort: selectedAC,
          note: note.trim() || null,
          userId: `USR-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to submit check-in");
      }

      setIsSubmitted(true);
      setCooldownSeconds(60); // 60s cooldown
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-slate-950/95 border border-white/15 rounded-2xl shadow-2xl shadow-cyan-950/40 text-slate-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-slate-900/90 to-cyan-950/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                {t.crowdsource.checkInTitle}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/30 text-cyan-300 font-mono">
                  Crowdsource Live
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {t.crowdsource.checkInSubtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label={t.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
          {/* Success Banner */}
          {isSubmitted ? (
            <div className="p-5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-center space-y-3 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-300">
                  Report Broadcasted Successfully
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Your crowd and AC telemetry has updated the live vehicle scoreboard. Thank you for contributing to Greater Jakarta transit transparency.
                </p>
              </div>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium hover:bg-slate-700 transition"
                >
                  Submit Another Report
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition shadow-md shadow-emerald-600/30"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 flex items-center gap-2.5 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 1. Vehicle Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    Target Transit Vehicle
                  </span>
                  {currentVehicle && (
                    <span className="text-[11px] font-mono text-cyan-400">
                      Code: {currentVehicle.vehicleCode}
                    </span>
                  )}
                </label>

                <select
                  value={targetVehicleId}
                  onChange={(e) => setTargetVehicleId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition"
                >
                  {simulatedVehicles.map((v) => (
                    <option key={v.id} value={v.id} className="bg-slate-900 text-slate-200">
                      [{v.vehicleCode}] {v.name} ({v.mode})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Crowd Density Rating (4 Levels) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    Crowd Density Level
                  </span>
                  <span className="text-[10px] text-slate-400">Tap to select level</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DENSITY_OPTIONS.map((opt) => {
                    const isSelected = selectedDensity === opt.level;
                    return (
                      <button
                        key={opt.level}
                        type="button"
                        onClick={() => setSelectedDensity(opt.level)}
                        className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                          isSelected
                            ? `${opt.bgSelectedClass} border-2 shadow-lg`
                            : `bg-slate-900/70 ${opt.borderClass}`
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-100">
                            {opt.label}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium border ${opt.badgeClass}`}
                          >
                            Level {opt.numeric}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {opt.sublabel}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. AC Comfort Score */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-cyan-400" />
                    AC Comfort Rating
                  </span>
                  <span className="text-[10px] text-slate-400">Cabin temperature status</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AC_OPTIONS.map((ac) => {
                    const isSelected = selectedAC === ac.rating;
                    return (
                      <button
                        key={ac.rating}
                        type="button"
                        onClick={() => setSelectedAC(ac.rating)}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? "bg-cyan-950/80 border-cyan-400 shadow-md shadow-cyan-950/50"
                            : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <span className="text-xs font-bold text-slate-200 truncate">
                          {ac.rating}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate mt-1">
                          {ac.label.split(" ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Optional Passenger Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Passenger Note (Optional)
                  </span>
                  <span className="text-[10px] text-slate-500">Max 120 chars</span>
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Plenty of seats in rear car, wheelchair area clear"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              {/* Rate Limit Protection Notice */}
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
                <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  Anti-spam rate limiting applies: 1 report per 60 seconds per vehicle.
                </span>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!isSubmitted && (
          <div className="px-5 py-3.5 border-t border-white/10 bg-slate-900/80 flex items-center justify-between shrink-0">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              {t.common.cancel}
            </button>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || cooldownSeconds > 0}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t.common.loading}
                </>
              ) : cooldownSeconds > 0 ? (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  Cooldown ({cooldownSeconds}s)
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  {t.crowdsource.submitCheckIn}
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
  );
};
