/**
 * PlatformI - Priority Disruption Alert Banner
 *
 * Renders priority operational disruption notices matching user-pinned transit modes
 * or critical system-wide bulletins with expandable details and line highlighting.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { DisruptionAlert, DisruptionSeverity } from "@/types/transit";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { DISRUPTION_ALERTS } from "@/lib/data/jakarta-dataset";

export interface DisruptionAlertBannerProps {
  onOpenStatusDrawer?: () => void;
}

export const DisruptionAlertBanner: React.FC<DisruptionAlertBannerProps> = ({
  onOpenStatusDrawer,
}) => {
  const [alerts, setAlerts] = useState<DisruptionAlert[]>(DISRUPTION_ALERTS);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  const allLines = useTransitStore((state) => state.allLines);
  const allStops = useTransitStore((state) => state.allStops);
  const selectedModes = useTransitStore((state) => state.selectedModes);
  const selectLine = useTransitStore((state) => state.selectLine);
  const setActiveDrawer = useTransitStore((state) => state.setActiveDrawer);

  // Fetch live alerts from API periodically
  useEffect(() => {
    let isMounted = true;

    const fetchAlerts = async () => {
      try {
        const res = await fetch("/api/alerts?status=ACTIVE");
        if (res.ok) {
          const data = (await res.json()) as { success: boolean; data: DisruptionAlert[] };
          if (data.success && data.data && data.data.length > 0 && isMounted) {
            setAlerts(data.data);
          }
        }
      } catch {
        // Fallback to static alerts dataset
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // 30s poll
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Filter alerts relevant to user's active modes, or include all if unfiltered
  const relevantAlerts = alerts.filter((alert) => {
    const line = allLines.find((l) => l.id === alert.lineId);
    if (!line) return true;
    return selectedModes.includes(line.mode);
  });

  const activeAlerts = relevantAlerts.length > 0 ? relevantAlerts : alerts;

  if (isDismissed || activeAlerts.length === 0) {
    return null;
  }

  const currentAlert = activeAlerts[currentIndex % activeAlerts.length];
  const affectedLine = allLines.find((l) => l.id === currentAlert.lineId);

  const getSeverityBadge = (severity: DisruptionSeverity) => {
    switch (severity) {
      case "CRITICAL":
        return {
          icon: <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />,
          containerStyle:
            "bg-rose-950/80 border-rose-500/50 text-rose-200 shadow-rose-950/40",
          tagStyle: "bg-rose-900/80 text-rose-300 border-rose-500/40",
          label: "Critical Disruption",
        };
      case "WARNING":
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
          containerStyle:
            "bg-amber-950/80 border-amber-500/50 text-amber-200 shadow-amber-950/40",
          tagStyle: "bg-amber-900/80 text-amber-300 border-amber-500/40",
          label: "Service Advisory",
        };
      case "INFO":
      default:
        return {
          icon: <Info className="w-4 h-4 text-cyan-400 shrink-0" />,
          containerStyle:
            "bg-cyan-950/80 border-cyan-500/50 text-cyan-200 shadow-cyan-950/40",
          tagStyle: "bg-cyan-900/80 text-cyan-300 border-cyan-500/40",
          label: "Maintenance Notice",
        };
    }
  };

  const badgeConfig = getSeverityBadge(currentAlert.severity);

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
    <div className="w-full px-3 sm:px-6 py-1.5 z-20 transition-all duration-200">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full rounded-xl border backdrop-blur-md shadow-lg p-2.5 sm:p-3 cursor-pointer transition-all duration-200 ${badgeConfig.containerStyle}`}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Left Icon & Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            {badgeConfig.icon}
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border font-mono ${badgeConfig.tagStyle}`}
              >
                {badgeConfig.label}
              </span>

              {affectedLine && (
                <span
                  style={{
                    backgroundColor: `${affectedLine.colorHex}25`,
                    borderColor: `${affectedLine.colorHex}60`,
                    color: affectedLine.colorHex,
                  }}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md border font-mono shrink-0"
                >
                  {affectedLine.code}
                </span>
              )}

              <h4 className="text-xs sm:text-sm font-semibold text-white truncate max-w-sm sm:max-w-md md:max-w-xl">
                {currentAlert.title}
              </h4>
            </div>
          </div>

          {/* Right Actions & Counter */}
          <div className="flex items-center gap-2 shrink-0">
            {activeAlerts.length > 1 && (
              <button
                onClick={handleNextAlert}
                title="Next Alert"
                className="text-[10px] px-2 py-1 rounded-md bg-black/40 hover:bg-black/60 border border-white/10 text-slate-300 font-mono transition"
              >
                {currentIndex + 1}/{activeAlerts.length} &rarr;
              </button>
            )}

            <button
              onClick={handleOpenDrawer}
              title="View Complete Network Status"
              className="hidden md:flex items-center gap-1 text-[11px] font-medium text-slate-300 hover:text-white px-2 py-1 rounded-md bg-black/30 hover:bg-black/50 border border-white/10 transition"
            >
              <span>Network Status</span>
              <ArrowRight className="w-3 h-3" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-300 transition"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDismissed(true);
              }}
              title="Dismiss Banner"
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expandable Details Body */}
        {isExpanded && (
          <div className="mt-3 pt-2.5 border-t border-white/10 text-xs text-slate-300 space-y-2 animate-in fade-in duration-150">
            <p className="leading-relaxed text-slate-200">
              {currentAlert.description}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              {currentAlert.affectedStops && currentAlert.affectedStops.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Affected Stops:
                  </span>
                  {currentAlert.affectedStops.map((stopName, sIdx) => (
                    <span
                      key={sIdx}
                      className="px-2 py-0.5 rounded-md bg-black/40 border border-white/10 text-[10px] text-slate-300 font-mono"
                    >
                      {stopName}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                {affectedLine && (
                  <button
                    onClick={handleHighlightLine}
                    className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 transition"
                  >
                    <Layers className="w-3 h-3" />
                    <span>Highlight {affectedLine.code} on Map</span>
                  </button>
                )}

                <button
                  onClick={handleOpenDrawer}
                  className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-white/15 text-slate-200 transition"
                >
                  <span>All Operational Bulletins</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
