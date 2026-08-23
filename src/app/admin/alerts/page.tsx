/**
 * PlatformI - Operator Control Portal: Disruption Alert Broadcasting Center
 *
 * Author, preview, broadcast, escalate, and resolve multimodal transit disruption notices
 * with instant live system propagation.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Radio,
  AlertTriangle,
  ShieldAlert,
  Info,
  CheckCircle2,
  Send,
  Trash2,
  RefreshCw,
  Eye,
  Clock,
  Layers,
  MapPin,
  X,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { DisruptionAlert, DisruptionSeverity, Line } from "@/types/transit";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { DISRUPTION_ALERTS } from "@/lib/data/jakarta-dataset";
import { useTranslation } from "@/lib/i18n";

export default function AdminAlertsPage() {
  const { t } = useTranslation();
  const allLines = useTransitStore((state) => state.allLines);
  const allStops = useTransitStore((state) => state.allStops);

  const [alerts, setAlerts] = useState<DisruptionAlert[]>(DISRUPTION_ALERTS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [broadcastToast, setBroadcastToast] = useState<string | null>(null);

  // New alert authoring form state
  const [targetLineId, setTargetLineId] = useState<string>(allLines[0]?.id || "line-tj-cor-1");
  const [severity, setSeverity] = useState<DisruptionSeverity>("WARNING");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [affectedStops, setAffectedStops] = useState<string[]>([]);
  const [estMinutes, setEstMinutes] = useState<string>("45");

  const selectedLine = allLines.find((l) => l.id === targetLineId) || allLines[0];

  // Fetch current alerts
  const loadAlerts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) {
        const data = (await res.json()) as { success: boolean; data: DisruptionAlert[] };
        if (data.success && Array.isArray(data.data)) {
          setAlerts(data.data);
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleToggleStop = (stopName: string) => {
    if (affectedStops.includes(stopName)) {
      setAffectedStops(affectedStops.filter((s) => s !== stopName));
    } else {
      setAffectedStops([...affectedStops, stopName]);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const estimatedEndTime = new Date(
      Date.now() + (parseInt(estMinutes, 10) || 45) * 60000
    ).toISOString();

    const payload = {
      lineId: targetLineId,
      title: title.trim(),
      description: description.trim(),
      severity,
      affectedStops,
      estimatedEndTime,
    };

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = (await res.json()) as { success: boolean; data: DisruptionAlert };
        if (data.success && data.data) {
          setAlerts([data.data, ...alerts]);
          setTitle("");
          setDescription("");
          setAffectedStops([]);
          setBroadcastToast("Disruption bulletin broadcasted successfully to all commuter devices!");
          setTimeout(() => setBroadcastToast(null), 4000);
        }
      }
    } catch (err) {
      console.error("Failed to broadcast alert:", err);
    }
  };

  const handleResolveAlert = async (id: string) => {
    try {
      const res = await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "RESOLVED" }),
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: "RESOLVED" } : a))
        );
      }
    } catch (err) {
      console.error("Failed to resolve alert:", err);
    }
  };

  const handleEscalateAlert = async (id: string) => {
    try {
      const res = await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, severity: "CRITICAL" }),
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, severity: "CRITICAL" } : a))
        );
      }
    } catch (err) {
      console.error("Failed to escalate alert:", err);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete alert:", err);
    }
  };

  // Stops on the selected line
  const lineStops = selectedLine?.stops || allStops.filter((s) => s.lineId === targetLineId);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-950 border border-amber-500/40 text-amber-400 text-xs font-mono font-semibold">
              {t.admin.occCommandBadge}
            </span>
            <span className="text-xs text-slate-400 font-mono">{t.admin.liveTelemetryBadge}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1.5">
            {t.admin.disruptionManager}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            {t.admin.impactDescription}
          </p>
        </div>

        <button
          onClick={loadAlerts}
          disabled={isLoading}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition self-start sm:self-auto flex items-center gap-2 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
          <span>{t.common.active}</span>
        </button>
      </div>

      {/* Broadcast Toast Notification */}
      {broadcastToast && (
        <div className="p-4 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs sm:text-sm flex items-center justify-between shadow-xl animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{broadcastToast}</span>
          </div>
          <button onClick={() => setBroadcastToast(null)} className="p-1 hover:bg-white/10 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. MAIN 2-COLUMN AUTHORING & PREVIEW GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Authoring Form */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Radio className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">{t.admin.newDisruptionAlert}</h3>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-4 text-xs">
            {/* Target Line */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">{t.admin.affectedLine}</label>
              <select
                value={targetLineId}
                onChange={(e) => {
                  setTargetLineId(e.target.value);
                  setAffectedStops([]);
                }}
                className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/80"
              >
                {allLines.map((l) => (
                  <option key={l.id} value={l.id}>
                    [{l.code}] {l.name} ({l.mode})
                  </option>
                ))}
              </select>
            </div>

            {/* Severity Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">{t.admin.severityLevel}</label>
              <div className="grid grid-cols-3 gap-2">
                {(["INFO", "WARNING", "CRITICAL"] as DisruptionSeverity[]).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverity(sev)}
                    className={`py-2 rounded-xl border text-xs font-mono font-bold transition ${
                      severity === sev
                        ? sev === "CRITICAL"
                          ? "bg-rose-950/80 border-rose-500/80 text-rose-300 shadow-lg shadow-rose-950/50"
                          : sev === "WARNING"
                          ? "bg-amber-950/80 border-amber-500/80 text-amber-300 shadow-lg shadow-amber-950/50"
                          : "bg-cyan-950/80 border-cyan-500/80 text-cyan-300 shadow-lg shadow-cyan-950/50"
                        : "bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {sev === "CRITICAL" ? t.admin.criticalAlerts : sev === "WARNING" ? t.admin.warningAlerts : "INFO"}
                  </button>
                ))}
              </div>
            </div>

            {/* Bulletin Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">{t.admin.alertTitle}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.admin.alertTitle}
                required
                className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80"
              >
              </input>
            </div>

            {/* Bulletin Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">{t.admin.impactDescription}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.admin.impactDescription}
                rows={3}
                required
                className="w-full bg-slate-950 border border-white/15 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 resize-none leading-relaxed"
              />
            </div>

            {/* Affected Stops Selection */}
            {lineStops && lineStops.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>{t.admin.affectedLine} ({affectedStops.length})</span>
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-xl bg-slate-950/60 border border-white/5">
                  {lineStops.map((stop) => {
                    const isSelected = affectedStops.includes(stop.name);
                    return (
                      <button
                        key={stop.id}
                        type="button"
                        onClick={() => handleToggleStop(stop.name)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition border ${
                          isSelected
                            ? "bg-amber-950/80 border-amber-500/50 text-amber-300 font-bold"
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {stop.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Estimated Resolution Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">{t.vehicleInspector.eta}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="1440"
                  step="5"
                  value={estMinutes}
                  onChange={(e) => setEstMinutes(e.target.value)}
                  className="w-24 bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500/80"
                />
                <span className="text-slate-400 text-xs">{t.common.minutes}</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!title.trim() || !description.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-bold shadow-xl shadow-amber-950/50 flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed transform active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>{t.admin.publishAlert}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Live Broadcast Preview */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">{t.admin.heroTitle}</h3>
              </div>
              <span className="text-[10px] font-mono text-cyan-400">{t.admin.liveTelemetryBadge}</span>
            </div>

            {/* Banner Preview */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                {t.admin.alertTitle}:
              </span>
              <div
                className={`p-3 rounded-xl border backdrop-blur-md shadow-lg ${
                  severity === "CRITICAL"
                    ? "bg-rose-950/80 border-rose-500/50 text-rose-200"
                    : severity === "WARNING"
                    ? "bg-amber-950/80 border-amber-500/50 text-amber-200"
                    : "bg-cyan-950/80 border-cyan-500/50 text-cyan-200"
                }`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border font-mono ${
                      severity === "CRITICAL"
                        ? "bg-rose-900 text-rose-300 border-rose-500/40"
                        : severity === "WARNING"
                        ? "bg-amber-900 text-amber-300 border-amber-500/40"
                        : "bg-cyan-900 text-cyan-300 border-cyan-500/40"
                    }`}
                  >
                    {severity === "CRITICAL" ? t.admin.criticalAlerts : severity === "WARNING" ? t.admin.warningAlerts : "INFO"}
                  </span>
                  <span
                    style={{
                      backgroundColor: `${selectedLine.colorHex}25`,
                      borderColor: `${selectedLine.colorHex}60`,
                      color: selectedLine.colorHex,
                    }}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md border font-mono"
                  >
                    {selectedLine.code}
                  </span>
                  <h4 className="text-xs font-semibold text-white truncate">
                    {title || selectedLine.name}
                  </h4>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-200">
                  {description || t.admin.impactDescription}
                </p>
                {affectedStops.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap items-center gap-1 text-[10px] font-mono text-slate-400">
                    <span>{t.admin.affectedLine}:</span>
                    {affectedStops.map((s, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 rounded bg-black/40 text-slate-300">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Service Status Drawer Preview */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                {t.admin.disruptionType}:
              </span>
              <div className="p-3.5 rounded-xl border border-white/10 bg-slate-950/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        backgroundColor: `${selectedLine.colorHex}25`,
                        borderColor: `${selectedLine.colorHex}60`,
                        color: selectedLine.colorHex,
                      }}
                      className="px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold"
                    >
                      {selectedLine.code}
                    </span>
                    <span className="text-xs font-semibold text-white">{selectedLine.name}</span>
                  </div>
                  <div className="text-[10px] font-mono text-amber-400 font-bold">
                    {severity}
                  </div>
                </div>
                <div className="text-xs text-slate-300">{title || t.admin.activeDisruptions}</div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-white/5 text-[11px] text-slate-400">
            {t.admin.occCommandBadge} &bull; {t.admin.heroSubtitle}
          </div>
        </div>
      </div>

      {/* 3. ACTIVE DISRUPTIONS MANAGEMENT FEED */}
      <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">{t.admin.activeDisruptions}</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {alerts.filter((a) => a.status === "ACTIVE").length} {t.common.active}
          </span>
        </div>

        <div className="space-y-3">
          {alerts.map((alert) => {
            const line = allLines.find((l) => l.id === alert.lineId);
            const isResolved = alert.status === "RESOLVED";

            return (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  isResolved
                    ? "bg-slate-950/40 border-slate-800/60 opacity-60"
                    : alert.severity === "CRITICAL"
                    ? "bg-rose-950/30 border-rose-500/40"
                    : "bg-slate-950/70 border-white/10"
                }`}
              >
                <div className="space-y-1.5 min-w-0 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                        isResolved
                          ? "bg-slate-800 text-slate-400 border-slate-700"
                          : alert.severity === "CRITICAL"
                          ? "bg-rose-900/80 text-rose-300 border-rose-500/40"
                          : "bg-amber-900/80 text-amber-300 border-amber-500/40"
                      }`}
                    >
                      {isResolved ? t.admin.resolveDisruption : alert.severity}
                    </span>

                    {line && (
                      <span
                        style={{
                          backgroundColor: `${line.colorHex}20`,
                          borderColor: `${line.colorHex}50`,
                          color: line.colorHex,
                        }}
                        className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border"
                      >
                        {line.code}
                      </span>
                    )}

                    <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                      {alert.title}
                    </h4>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {alert.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-mono pt-1">
                    <span>{new Date(alert.startTime).toLocaleTimeString()}</span>
                    {alert.affectedStops.length > 0 && (
                      <span>{t.admin.affectedLine}: {alert.affectedStops.join(", ")}</span>
                    )}
                  </div>
                </div>

                {/* Operations Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {!isResolved && (
                    <>
                      <button
                        onClick={() => handleEscalateAlert(alert.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-semibold transition"
                      >
                        {t.admin.criticalAlerts}
                      </button>
                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition"
                      >
                        {t.admin.resolveDisruption}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDeleteAlert(alert.id)}
                    title="Delete Alert"
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 border border-slate-800 text-slate-400 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
