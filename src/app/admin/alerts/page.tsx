/**
 * PlatformI - Operator Control Portal: Disruption Alert Broadcasting Center
 *
 * Author, preview, broadcast, escalate, and resolve multimodal transit disruption notices
 * with instant live system propagation.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Radio,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Send,
  Trash2,
  RefreshCw,
  Eye,
  X,
} from "lucide-react";
import { DisruptionAlert, DisruptionSeverity } from "@/types/transit";
import { useTransitStore } from "@/lib/stores/useTransitStore";
import { DISRUPTION_ALERTS } from "@/lib/data/jakarta-dataset";
import { useTranslation } from "@/lib/i18n";

export default function AdminAlertsPage() {
  const { t } = useTranslation();
  const allLines = useTransitStore((state) => state.allLines);
  const allStops = useTransitStore((state) => state.allStops);

  const [alerts, setAlerts] = useState<DisruptionAlert[]>(DISRUPTION_ALERTS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [broadcastToast, setBroadcastToast] = useState<string | null>(null);
  const [mutatingAlertId, setMutatingAlertId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  // Per-delete pending buffer state
  const [pendingDeletes, setPendingDeletes] = useState<Record<string, DisruptionAlert>>({});
  const [escalateConfirmId, setEscalateConfirmId] = useState<string | null>(null);
  const escalateTriggerRef = useRef<HTMLElement | null>(null);
  const escalateConfirmRef = useRef<HTMLButtonElement | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Per-row undo grace: one tick engine drives the countdown display, pauses
  // while an undo control holds focus (WCAG 2.2.1 timing adjustable), and
  // fires the server delete when a row's expiry passes. No setTimeout:
  // pausing must defer the real deletion, not just the displayed number.
  const [deleteExpiries, setDeleteExpiries] = useState<Record<string, number>>({});
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const [undoPaused, setUndoPaused] = useState<boolean>(false);
  const undoPausedRef = useRef(false);
  undoPausedRef.current = undoPaused;
  const undoButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const rowDeleteRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const pendingDeletesRef = useRef(pendingDeletes);
  pendingDeletesRef.current = pendingDeletes;

  const closeEscalateConfirm = () => setEscalateConfirmId(null);

  // Success feedback parity: every mutation confirms like broadcast does
  const notify = (message: string) => {
    setBroadcastToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setBroadcastToast(null), 4000);
  };

  // Move focus into the confirmation when it opens; restore to the
  // trigger when it closes (cancel, confirm, or Escape). After a confirmed
  // escalation the trigger unmounts (severity flips CRITICAL) — fall back
  // to the feed container so focus stays inside the changed region.
  const feedContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (escalateConfirmId) {
      escalateConfirmRef.current?.focus();
    } else if (escalateTriggerRef.current) {
      const trigger = escalateTriggerRef.current;
      escalateTriggerRef.current = null;
      if (trigger.isConnected) {
        trigger.focus();
      } else {
        feedContainerRef.current?.focus();
      }
    }
  }, [escalateConfirmId]);

  const executeDelete = async (id: string) => {
    const alertToDelete = pendingDeletesRef.current[id];
    setPendingDeletes((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setDeleteExpiries((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    undoButtonRefs.current.delete(id);
    if (!alertToDelete) return;

    try {
      const res = await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Restore the row: the server still has it, so the UI must too
        setAlerts((prev) =>
          prev.some((a) => a.id === id) ? prev : [alertToDelete, ...prev]
        );
        setBroadcastError(data.error || t.admin.deleteHttp);
      }
    } catch {
      setAlerts((prev) =>
        prev.some((a) => a.id === id) ? prev : [alertToDelete, ...prev]
      );
      setBroadcastError(t.admin.deleteNetwork);
    }
  };
  const executeDeleteRef = useRef(executeDelete);
  executeDeleteRef.current = executeDelete;

  useEffect(() => {
    if (Object.keys(deleteExpiries).length === 0) return;
    const interval = setInterval(() => {
      if (undoPausedRef.current) {
        // Grace paused: push every expiry forward so the real deletion
        // is deferred along with the visible countdown
        setDeleteExpiries((prev) => {
          const next = { ...prev };
          for (const id of Object.keys(next)) next[id] += 1000;
          return next;
        });
        setNowTick(Date.now());
        return;
      }
      const now = Date.now();
      setNowTick(now);
      const due = Object.entries(deleteExpiries)
        .filter(([, expiry]) => expiry <= now)
        .map(([id]) => id);
      for (const id of due) {
        void executeDeleteRef.current(id);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [deleteExpiries, undoPaused]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      // Grace pending at unmount: flush the real deletions so navigation
      // never silently drops a confirmed delete (row would resurrect)
      for (const id of Object.keys(pendingDeletesRef.current)) {
        void executeDeleteRef.current(id);
      }
    };
  }, []);

  // New alert authoring form state
  const [targetLineId, setTargetLineId] = useState<string>(allLines[0]?.id || "line-tj-cor-1");
  const [severity, setSeverity] = useState<DisruptionSeverity>("WARNING");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [affectedStops, setAffectedStops] = useState<string[]>([]);
  const [estMinutes, setEstMinutes] = useState<string>("45");

  const selectedLine = allLines.find((l) => l.id === targetLineId) || allLines[0];

  // Fetch current alerts with failure handling
  const loadAlerts = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) {
        const data = (await res.json()) as { success: boolean; data: DisruptionAlert[] };
        if (data.success && Array.isArray(data.data)) {
          // Never resurrect alerts inside their undo-grace window: the server
          // delete is still pending, so filter them out of fresh fetches
          setAlerts(data.data.filter((a) => !pendingDeletes[a.id]));
        } else {
          setFetchError(t.admin.fetchFormat);
        }
      } else {
        setFetchError(t.admin.fetchHttp + ` (HTTP ${res.status}) — ${t.admin.cachedState}`);
      }
    } catch {
      setFetchError(t.admin.fetchNetwork);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  // Triage order: CRITICAL first, then WARNING, then INFO; newest within tier
  const orderedAlerts = useMemo(() => {
    const rank = (a: DisruptionAlert) =>
      a.status === "RESOLVED" ? 3 : a.severity === "CRITICAL" ? 0 : a.severity === "WARNING" ? 1 : 2;
    return [...alerts].sort(
      (a, b) => rank(a) - rank(b) || b.startTime.localeCompare(a.startTime)
    );
  }, [alerts]);

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

    setIsPublishing(true);
    setBroadcastError(null);

    const estimatedEndTime = new Date(
      Date.now() + Math.max(5, Math.min(1440, parseInt(estMinutes, 10) || 45)) * 60000
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
          notify(t.admin.publishAlert + " — " + data.data.title);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setBroadcastError(data.error || t.admin.publishRejected);
      }
    } catch {
      setBroadcastError(t.admin.publishNetwork);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleResolveAlert = async (id: string) => {
    setMutatingAlertId(id);
    setBroadcastError(null);
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
        const title = alerts.find((a) => a.id === id)?.title;
        notify(t.admin.resolveDisruption + (title ? ` — ${title}` : ""));
      } else {
        const data = await res.json().catch(() => ({}));
        setBroadcastError(data.error || t.admin.resolveFailed);
      }
    } catch {
      setBroadcastError(t.admin.alertsNetwork);
    } finally {
      setMutatingAlertId(null);
    }
  };

  const handleEscalateAlert = async (id: string) => {
    setEscalateConfirmId(null);
    setMutatingAlertId(id);
    setBroadcastError(null);
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
        const title = alerts.find((a) => a.id === id)?.title;
        notify(t.admin.escalatedToast + (title ? ` — ${title}` : ""));
      } else {
        const data = await res.json().catch(() => ({}));
        setBroadcastError(data.error || t.admin.escalateFailed);
      }
    } catch {
      setBroadcastError(t.admin.alertsNetwork);
    } finally {
      setMutatingAlertId(null);
    }
  };

  const handleDemoteAlert = async (id: string) => {
    setMutatingAlertId(id);
    setBroadcastError(null);
    try {
      const res = await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, severity: "WARNING" }),
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, severity: "WARNING" } : a))
        );
        const title = alerts.find((a) => a.id === id)?.title;
        notify(t.admin.demotedToast + (title ? ` — ${title}` : ""));
      } else {
        const data = await res.json().catch(() => ({}));
        setBroadcastError(data.error || t.admin.demoteFailed);
      }
    } catch {
      setBroadcastError(t.admin.alertsNetwork);
    } finally {
      setMutatingAlertId(null);
    }
  };

  const handleDeleteAlert = (alertToDelete: DisruptionAlert) => {
    const id = alertToDelete.id;

    // Optimistically remove from visible list and park in the undo buffer;
    // the tick engine performs the server delete when the expiry passes
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    setPendingDeletes((prev) => ({ ...prev, [id]: alertToDelete }));
    setDeleteExpiries((prev) => ({ ...prev, [id]: Date.now() + 5000 }));

    // Keyboard focus follows the vanished row into the undo affordance
    requestAnimationFrame(() => undoButtonRefs.current.get(id)?.focus());
  };

  const handleUndoDelete = (id: string) => {
    const alertToRestore = pendingDeletes[id];
    if (!alertToRestore) return;

    setAlerts((prev) => [alertToRestore, ...prev]);
    // Focus follows the restored row: mirror of the delete-side ref map
    requestAnimationFrame(() => rowDeleteRefs.current.get(id)?.focus());
    setPendingDeletes((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setDeleteExpiries((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
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
            {t.admin.alertsSubtitle}
          </p>
        </div>

        <button
          onClick={loadAlerts}
          disabled={isLoading}
          className="p-2 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition self-start sm:self-auto flex items-center gap-2 text-xs btn-tactile"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
          <span>{t.admin.refresh}</span>
        </button>
      </div>

      {/* Fetch Error / Stale Connection Banner */}
      {fetchError && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 rounded-xl bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={loadAlerts}
            className="px-3 py-1.5 rounded-lg bg-rose-900 hover:bg-rose-800 text-white font-semibold text-xs transition self-start sm:self-auto btn-tactile min-h-[36px]"
          >
            {t.admin.retrySync}
          </button>
        </div>
      )}

      {/* Broadcast Failure Banner */}
      {broadcastError && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 rounded-xl bg-amber-950/90 border border-amber-500/50 text-amber-200 text-xs sm:text-sm flex items-center justify-between shadow-xl"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{broadcastError}</span>
          </div>
          <button
            type="button"
            onClick={() => setBroadcastError(null)}
            aria-label={t.admin.dismissError}
            className="p-1 hover:bg-white/10 rounded min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Broadcast Toast Notification */}
      {broadcastToast && (
        <div
          role="status"
          aria-live="polite"
          className="p-4 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs sm:text-sm flex items-center justify-between shadow-xl animate-in slide-in-from-top duration-200"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{broadcastToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setBroadcastToast(null)}
            aria-label={t.admin.dismissToast}
            className="p-1 hover:bg-white/10 rounded min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
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
              <label htmlFor="target-line-select" className="text-xs font-semibold text-slate-300">
                {t.admin.affectedLine}
              </label>
              <select
                id="target-line-select"
                value={targetLineId}
                onChange={(e) => {
                  setTargetLineId(e.target.value);
                  setAffectedStops([]);
                }}
                className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/80 min-h-[44px]"
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
                    aria-pressed={severity === sev}
                    onClick={() => setSeverity(sev)}
                    className={`py-2.5 rounded-xl border text-xs font-mono font-bold transition min-h-[44px] ${
                      severity === sev
                        ? sev === "CRITICAL"
                          ? "bg-rose-950/80 border-rose-500/80 text-rose-300 shadow-lg shadow-rose-950/50"
                          : sev === "WARNING"
                          ? "bg-amber-950/80 border-amber-500/80 text-amber-300 shadow-lg shadow-amber-950/50"
                          : "bg-cyan-950/80 border-cyan-500/80 text-cyan-300 shadow-lg shadow-cyan-950/50"
                        : "bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {/* Bulletin Title */}
            <div className="space-y-1.5">
              <label htmlFor="alert-title-input" className="text-xs font-semibold text-slate-300">
                {t.admin.alertTitle}
              </label>
              <input
                id="alert-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.admin.alertTitle}
                required
                className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 min-h-[44px]"
              />
            </div>

            {/* Bulletin Description */}
            <div className="space-y-1.5">
              <label htmlFor="alert-desc-input" className="text-xs font-semibold text-slate-300">
                {t.admin.impactDescription}
              </label>
              <textarea
                id="alert-desc-input"
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
                  <span>{t.admin.affectedStops} ({affectedStops.length})</span>
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-xl bg-slate-950/60 border border-white/5">
                  {lineStops.map((stop) => {
                    const isSelected = affectedStops.includes(stop.name);
                    return (
                      <button
                        key={stop.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handleToggleStop(stop.name)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition border min-h-[36px] ${
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
              <label htmlFor="est-minutes-input" className="text-xs font-semibold text-slate-300">
                {t.admin.resolutionWindow}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="est-minutes-input"
                  type="number"
                  min="5"
                  max="1440"
                  step="5"
                  value={estMinutes}
                  onChange={(e) => setEstMinutes(e.target.value)}
                  className="w-28 bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500/80 min-h-[44px]"
                />
                <span className="text-slate-400 text-xs">{t.common.minutes}</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPublishing || !title.trim() || !description.trim()}
              aria-busy={isPublishing}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-amber-950 text-xs font-bold shadow-xl flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed btn-tactile min-h-[44px]"
            >
              {isPublishing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-950" />
                  <span>{t.admin.publishing}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{t.admin.publishAlert}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Live Broadcast Preview */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">{t.admin.previewTitle}</h3>
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
                    <span>{t.admin.affectedStops}:</span>
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
            {t.admin.occCommandBadge} &bull; {t.admin.alertsSubtitle}
          </div>
        </div>
      </div>

      {/* 3. ACTIVE DISRUPTIONS MANAGEMENT FEED */}
      {/* Undo Delete Grace: rendered at the feed so the affordance sits where
          the row just vanished, not at the top of the page */}
      {Object.values(pendingDeletes).length > 0 && (
        <div className="space-y-2">
          {Object.values(pendingDeletes).map((deletedAlert) => (
            <div
              key={deletedAlert.id}
              role="status"
              aria-live="polite"
              className="p-4 rounded-xl bg-slate-900 border border-amber-500/40 text-slate-200 text-xs sm:text-sm flex items-center justify-between shadow-xl animate-in slide-in-from-top duration-200"
            >
              <div className="flex items-center gap-2 truncate">
                <Trash2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">
                  {t.admin.deletedNotice} <strong>{deletedAlert.title}</strong>
                </span>
              </div>
              <button
                type="button"
                ref={(el) => {
                  if (el) undoButtonRefs.current.set(deletedAlert.id, el);
                  else undoButtonRefs.current.delete(deletedAlert.id);
                }}
                onFocus={() => setUndoPaused(true)}
                onBlur={() => setUndoPaused(false)}
                onClick={() => handleUndoDelete(deletedAlert.id)}
                aria-label={`${t.admin.ariaUndoDeletion} ${deletedAlert.title}`}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-amber-950 font-bold text-xs transition btn-tactile min-h-[36px] shrink-0"
              >
                {t.common.undo}
                <span aria-hidden="true">
                  {" "}
                  ({Math.max(0, Math.ceil(((deleteExpiries[deletedAlert.id] ?? nowTick) - nowTick) / 1000))}s)
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
      <div
        ref={feedContainerRef}
        tabIndex={-1}
        className="rounded-2xl bg-slate-900/80 border border-white/10 p-5 space-y-4 shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
      >
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
          {orderedAlerts.map((alert: DisruptionAlert) => {
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
                      {isResolved ? t.admin.resolved : alert.severity}
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
                      <span>{t.admin.affectedStops}: {alert.affectedStops.join(", ")}</span>
                    )}
                  </div>
                </div>

                {/* Operations Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {!isResolved && (
                    <>
                      {alert.severity !== "CRITICAL" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            escalateTriggerRef.current = e.currentTarget;
                            setEscalateConfirmId(alert.id);
                          }}
                          disabled={mutatingAlertId === alert.id}
                          aria-label={`${t.admin.ariaEscalate} ${alert.title}`}
                          className="px-3 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-semibold transition disabled:opacity-50 min-h-[40px] flex items-center gap-1.5 btn-tactile"
                        >
                          {mutatingAlertId === alert.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : null}
                          <span>{t.admin.confirmEscalation}</span>
                        </button>
                      )}
                      {alert.severity === "CRITICAL" && (
                        <button
                          type="button"
                          onClick={() => handleDemoteAlert(alert.id)}
                          disabled={mutatingAlertId === alert.id}
                          aria-label={`${t.admin.ariaDemote} ${alert.title}`}
                          className="px-3 py-2 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-300 text-xs font-semibold transition disabled:opacity-50 min-h-[40px] flex items-center gap-1.5 btn-tactile"
                        >
                          {mutatingAlertId === alert.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : null}
                          <span>{t.admin.demoteAlert}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleResolveAlert(alert.id)}
                        disabled={mutatingAlertId === alert.id}
                        aria-label={`${t.admin.ariaResolve} ${alert.title}`}
                        className="px-3.5 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition disabled:opacity-50 min-h-[40px] flex items-center gap-1.5 btn-tactile"
                      >
                        {mutatingAlertId === alert.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : null}
                        <span>{t.admin.resolveDisruption}</span>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    ref={(el) => {
                      if (el) rowDeleteRefs.current.set(alert.id, el);
                      else rowDeleteRefs.current.delete(alert.id);
                    }}
                    onClick={() => handleDeleteAlert(alert)}
                    disabled={mutatingAlertId === alert.id}
                    title={`${t.admin.deleteAlertTitle} ${alert.title}`}
                    aria-label={`${t.admin.ariaDelete} ${alert.title}`}
                    className="p-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 hover:text-rose-100 transition min-w-[40px] min-h-[40px] flex items-center justify-center btn-tactile"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Escalation confirmation: CRITICAL reaches every passenger device */}
                {escalateConfirmId === alert.id && !isResolved && (
                  <div
                    role="alert"
                    aria-label={`${t.admin.confirmEscalation}: ${alert.title}`}
                    aria-describedby="escalate-confirm-body"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.stopPropagation();
                        closeEscalateConfirm();
                      }
                    }}
                    className="w-full flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl bg-rose-950/60 border border-rose-500/50"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <p id="escalate-confirm-body" className="text-xs text-rose-200 flex-1">
                      <strong className="text-rose-100">{alert.title}</strong> — {t.admin.escalateConfirmBody}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        ref={escalateConfirmRef}
                        onClick={() => handleEscalateAlert(alert.id)}
                        disabled={mutatingAlertId === alert.id}
                        className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition disabled:opacity-50 min-h-[40px] btn-tactile"
                      >
                        {t.admin.confirmEscalation}
                      </button>
                      <button
                        type="button"
                        onClick={closeEscalateConfirm}
                        className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-700 transition min-h-[40px] btn-tactile"
                      >
                        {t.common.cancel}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
