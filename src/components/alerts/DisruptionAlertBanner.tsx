/**
 * PlatformI - Priority Disruption Alert Banner
 *
 * Renders priority operational disruption notices matching user-pinned transit modes
 * or critical system-wide bulletins with expandable details and line highlighting.
 * Designed with a compact, non-intrusive layout on mobile/tablet to prioritize transit icons.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  ChevronDown,
  X,
  Layers,
  MapPin,
  Clock,
  ArrowRight,
  ShieldAlert,
  Radio,
  RefreshCw,
} from "lucide-react";
import { DisruptionAlert, DisruptionSeverity } from "@/types/transit";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { DISRUPTION_ALERTS } from "@/lib/data/jakarta-dataset";
import { useTranslation } from "@/lib/i18n";

export interface DisruptionAlertBannerProps {
  onOpenStatusDrawer?: () => void;
}

export const DisruptionAlertBanner: React.FC<DisruptionAlertBannerProps> = ({
  onOpenStatusDrawer,
}) => {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<DisruptionAlert[]>(DISRUPTION_ALERTS);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isUndoVisible, setIsUndoVisible] = useState<boolean>(false);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [fetchFailed, setFetchFailed] = useState<boolean>(false);

  const allLines = useTransitStore((state) => state.allLines);
  const selectedModes = useTransitStore((state) => state.selectedModes);
  const selectLine = useTransitStore((state) => state.selectLine);
  const setActiveDrawer = useTransitStore((state) => state.setActiveDrawer);

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/alerts?status=ACTIVE");
      if (res.ok) {
        const data = (await res.json()) as { success: boolean; data: DisruptionAlert[] };
        if (data.success && data.data && data.data.length > 0) {
          setAlerts(data.data);
          setLastFetchTime(new Date());
          setFetchFailed(false);
          return;
        }
      }
      setFetchFailed(true);
    } catch {
      setFetchFailed(true);
    }
  };

  // Fetch live alerts from API periodically
  useEffect(() => {
    let isMounted = true;

    const fetchWithMount = async () => {
      if (!isMounted) return;
      await fetchAlerts();
    };

    fetchWithMount();
    const interval = setInterval(fetchWithMount, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Undo dismiss: show undo bar for 5s before truly dismissing
  useEffect(() => {
    if (isUndoVisible) {
      const undoTimer = setTimeout(() => {
        setIsUndoVisible(false);
        setIsDismissed(true);
      }, 5000);
      return () => clearTimeout(undoTimer);
    }
  }, [isUndoVisible]);

  const handleDismiss = () => {
    setIsUndoVisible(true);
  };

  const handleUndoDismiss = () => {
    setIsUndoVisible(false);
    setIsDismissed(false);
  };

  // Filter alerts relevant to user's active modes, or include all if unfiltered
  const relevantAlerts = alerts.filter((alert) => {
    const line = allLines.find((l) => l.id === alert.lineId);
    if (!line) return true;
    return selectedModes.includes(line.mode);
  });

  const activeAlerts = relevantAlerts.length > 0 ? relevantAlerts : alerts;

  const currentAlert = activeAlerts[currentIndex % activeAlerts.length];
  const affectedLine = currentAlert ? allLines.find((l) => l.id === currentAlert.lineId) : null;

  const getSeverityBadge = (severity: DisruptionSeverity) => {
    switch (severity) {
      case "CRITICAL":
        return {
          icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
          containerStyle:
            "bg-gradient-to-r from-rose-950/90 via-slate-950/90 to-rose-950/80 border-rose-500/50 text-rose-200 shadow-lg shadow-rose-950/40 ring-1 ring-rose-500/30",
          tagStyle: "bg-rose-900/80 text-rose-300 border-rose-500/40",
          pulseColor: "bg-rose-500",
          label: t.common.critical,
        };
      case "WARNING":
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
          containerStyle:
            "bg-gradient-to-r from-amber-950/80 via-slate-950/90 to-amber-950/70 border-amber-500/40 text-amber-200 shadow-lg shadow-amber-950/30 ring-1 ring-amber-500/20",
          tagStyle: "bg-amber-900/80 text-amber-300 border-amber-500/40",
          pulseColor: "bg-amber-500",
          label: t.common.warning,
        };
      case "INFO":
      default:
        return {
          icon: <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />,
          containerStyle:
            "bg-gradient-to-r from-cyan-950/80 via-slate-950/90 to-cyan-950/70 border-cyan-500/40 text-cyan-200 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-500/20",
          tagStyle: "bg-cyan-900/80 text-cyan-300 border-cyan-500/40",
          pulseColor: "bg-cyan-500",
          label: t.common.normal,
        };
    }
  };

  const badgeConfig = currentAlert ? getSeverityBadge(currentAlert.severity) : null;

  const handleNextAlert = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % activeAlerts.length);
  };

  const handleHighlightLine = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (affectedLine) {
      selectLine(affectedLine.id);
    }
  };

  const handleOpenDrawer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenStatusDrawer) {
      onOpenStatusDrawer();
    } else {
      setActiveDrawer("alerts");
    }
  };

  return (
    <AnimatePresence>
      {isUndoVisible && !isDismissed && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="w-full px-3 sm:px-6 py-1 z-20"
        >
          <div className="w-full rounded-xl border border-slate-700 bg-slate-900/95 backdrop-blur-md px-3 py-2 flex items-center justify-between text-xs text-slate-300">
            <span>{t.common.close}</span>
            <button
              onClick={handleUndoDismiss}
              className="px-3 py-1 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-semibold hover:bg-cyan-900/80 transition"
            >
              Undo
            </button>
          </div>
        </motion.div>
      )}

      {!isDismissed && !isUndoVisible && activeAlerts.length > 0 && currentAlert && badgeConfig && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="w-full px-3 sm:px-6 py-0.5 z-20"
        >
          {/* Thin Status Strip */}
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            className={`w-full rounded-lg border backdrop-blur-md px-2.5 py-1 cursor-pointer transition-all duration-200 ${badgeConfig.containerStyle}`}
          >
            <div className="flex items-center justify-between gap-2">
              {/* Left: Icon + Count + Title */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="relative flex items-center justify-center">
                  <span
                    className={`animate-ping absolute inline-flex h-2 w-2 rounded-full opacity-75 ${badgeConfig.pulseColor}`}
                  />
                  {badgeConfig.icon}
                </div>

                <span className="text-[11px] font-mono font-bold text-slate-300 shrink-0">
                  {activeAlerts.length}
                </span>

                <span className="text-[11px] sm:text-xs font-semibold text-white truncate">
                  {currentAlert.title}
                </span>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {fetchFailed && (
                  <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300">
                    Stale
                  </span>
                )}
                {activeAlerts.length > 1 && (
                  <button
                    onClick={handleNextAlert}
                    aria-label="Pemberitahuan berikutnya"
                    className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 hover:bg-black/60 border border-white/10 text-slate-300 font-mono transition"
                  >
                    {currentIndex + 1}/{activeAlerts.length}
                  </button>
                )}
                {fetchFailed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchAlerts();
                    }}
                    aria-label={t.common.refresh}
                    className="p-0.5 rounded hover:bg-white/10 text-amber-400 transition"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                  </button>
                )}
                <button
                  onClick={handleOpenDrawer}
                  aria-label="Lihat Status Lengkap"
                  className="hidden sm:flex items-center gap-0.5 text-[9px] font-medium text-slate-300 hover:text-white px-1.5 py-0.5 rounded bg-black/30 hover:bg-black/50 border border-white/10 transition"
                >
                  <span>Status</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss();
                  }}
                  aria-label={t.common.close}
                  className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Expandable Details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="mt-1 p-2.5 rounded-lg glass-panel border border-white/10 text-xs text-slate-300 space-y-2">
                  <p className="leading-relaxed text-slate-200 text-[11px]">
                    {currentAlert.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {currentAlert.affectedStops && currentAlert.affectedStops.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-cyan-400" />
                          {t.statusCenter.affectedStations}
                        </span>
                        {currentAlert.affectedStops.map((stopName, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-[9px] text-slate-300 font-mono"
                          >
                            {stopName}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      {affectedLine && (
                        <button
                          onClick={handleHighlightLine}
                          className="flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 transition"
                        >
                          <Layers className="w-2.5 h-2.5" />
                          <span>{t.common.viewOnMap}</span>
                        </button>
                      )}
                      <button
                        onClick={handleOpenDrawer}
                        className="flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-white/15 text-slate-200 transition"
                      >
                        <span>{t.statusCenter.title}</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

