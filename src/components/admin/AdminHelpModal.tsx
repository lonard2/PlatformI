/**
 * PlatformI - OCC Dispatcher Quick Reference & Keyboard Shortcuts Modal
 *
 * Implements an accessible, high-contrast modal dialog conforming to WCAG 2.1 AA:
 * 1. Focus trap and Escape key listener via useDialogFocusTrap.
 * 2. Complete cheatsheet of single-key and combination dispatch shortcuts (Point 7).
 * 3. Clear architectural breakdown of disruption severity triage and passenger blast radius (Point 10).
 * 4. Zero emojis, crisp Lucide SVG icons, strictly typed.
 */

"use client";

import React, { useState } from "react";
import {
  HelpCircle,
  X,
  Keyboard,
  Radio,
  SlidersHorizontal,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Zap,
  History,
  Trash2,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useDialogFocusTrap } from "@/lib/hooks/useDialogFocusTrap";
import { useShiftLog } from "@/lib/services/shiftLogService";

interface AdminHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminHelpModal({ isOpen, onClose }: AdminHelpModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"SHORTCUTS" | "TRIAGE" | "OPS" | "SHIFTLOG">("SHORTCUTS");
  const { log: shiftLog, clear: clearShiftLog } = useShiftLog();
  const { containerRef } = useDialogFocusTrap<HTMLDivElement>({
    isOpen,
    onClose,
  });

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-help-title"
        aria-describedby="admin-help-subtitle"
        tabIndex={-1}
        className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden focus:outline-none"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#0a0f1d]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 id="admin-help-title" className="text-base font-bold text-white tracking-tight">
                {t.admin.helpTitle}
              </h2>
              <p id="admin-help-subtitle" className="text-xs text-slate-400">
                {t.admin.helpSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.admin.closeHelpDialog}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition btn-tactile min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-white/10 bg-slate-950/40 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("SHORTCUTS")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === "SHORTCUTS"
                ? "border-cyan-400 text-cyan-300 bg-slate-900/60"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>{t.admin.helpShortcutsTitle}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("TRIAGE")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === "TRIAGE"
                ? "border-amber-400 text-amber-300 bg-slate-900/60"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{t.admin.helpTriageTitle}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("OPS")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === "OPS"
                ? "border-emerald-400 text-emerald-300 bg-slate-900/60"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{t.admin.helpOpsTitle}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("SHIFTLOG")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === "SHIFTLOG"
                ? "border-teal-400 text-teal-300 bg-slate-900/60"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{t.admin.helpShiftLogTitle}</span>
            {shiftLog.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-teal-950 text-teal-300 border border-teal-500/40">
                {shiftLog.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-slate-300 font-sans">
          {activeTab === "SHORTCUTS" && (
            <div className="space-y-3">
              <p className="text-slate-400 text-xs">
                Global hotkeys active across the OCC dispatch portal when not editing text inputs:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-white/5">
                  <span className="text-slate-300">{t.admin.shortcutHelp}</span>
                  <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-xs font-bold text-cyan-300">
                    ?
                  </kbd>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-white/5">
                  <span className="text-slate-300">{t.admin.shortcutSearch}</span>
                  <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-xs font-bold text-cyan-300">
                    /
                  </kbd>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-white/5">
                  <span className="text-slate-300">{t.admin.shortcutDashboard}</span>
                  <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-xs font-bold text-cyan-300">
                    1
                  </kbd>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-white/5">
                  <span className="text-slate-300">{t.admin.shortcutFleet}</span>
                  <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-xs font-bold text-cyan-300">
                    2
                  </kbd>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-white/5">
                  <span className="text-slate-300">{t.admin.shortcutAlerts}</span>
                  <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-xs font-bold text-cyan-300">
                    3
                  </kbd>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-white/5">
                  <span className="text-slate-300">{t.admin.shortcutScanner}</span>
                  <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-xs font-bold text-cyan-300">
                    4
                  </kbd>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-white/5 sm:col-span-2">
                  <span className="text-slate-300">{t.admin.shortcutEscape}</span>
                  <kbd className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-xs font-bold text-cyan-300">
                    Esc
                  </kbd>
                </div>
              </div>
            </div>
          )}

          {activeTab === "TRIAGE" && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-rose-900 text-rose-200 font-mono font-bold text-[10px] uppercase">
                    CRITICAL
                  </span>
                  <span className="font-bold text-rose-300">{t.admin.sevCritical}</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {t.admin.triageCriticalDesc}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-900 text-amber-200 font-mono font-bold text-[10px] uppercase">
                    WARNING
                  </span>
                  <span className="font-bold text-amber-300">{t.admin.sevWarning}</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {t.admin.triageWarningDesc}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-900 text-cyan-200 font-mono font-bold text-[10px] uppercase">
                    INFO
                  </span>
                  <span className="font-bold text-cyan-300">{t.admin.sevInfo}</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {t.admin.triageInfoDesc}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10 space-y-1">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Undo Grace Architecture</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  {t.admin.triageUndoDesc}
                </p>
              </div>
            </div>
          )}

          {activeTab === "OPS" && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10 space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>JakLingko Integration Rules</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {t.admin.opsJakLingkoDesc}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10 space-y-1">
                <div className="flex items-center gap-2 text-teal-400 font-semibold">
                  <Zap className="w-4 h-4" />
                  <span>Vehicle Operational State Machine</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {t.admin.opsStatusDesc}
                </p>
              </div>
            </div>
          )}

          {activeTab === "SHIFTLOG" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="text-xs text-slate-400">
                  {t.admin.shiftLogTotalActions}:{" "}
                  <strong className="text-white font-mono">{shiftLog.length}</strong>
                </div>
                {shiftLog.length > 0 && (
                  <button
                    type="button"
                    onClick={clearShiftLog}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-[11px] font-semibold transition btn-tactile"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.admin.shiftLogClear}</span>
                  </button>
                )}
              </div>

              {shiftLog.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 space-y-1">
                  <History className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                  <p>{t.admin.shiftLogEmpty}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
                  {shiftLog.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 rounded-xl bg-slate-950/80 border border-white/5 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                              entry.actionType === "ALERT_ESCALATE"
                                ? "bg-rose-950 text-rose-300 border-rose-500/40"
                                : entry.actionType === "ALERT_RESOLVE"
                                ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                                : entry.actionType === "ALERT_DELETE"
                                ? "bg-amber-950 text-amber-300 border-amber-500/40"
                                : "bg-cyan-950 text-cyan-300 border-cyan-500/40"
                            }`}
                          >
                            {entry.actionType.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {entry.operatorId}
                          </span>
                        </div>
                        <p className="text-slate-200 text-xs leading-relaxed break-words">
                          {entry.summary}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {entry.timeFormatted}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-[#0a0f1d] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>PlatformI OCC Core Engine v1.0</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-cyan-950 font-bold text-xs transition btn-tactile min-h-[36px]"
          >
            {t.admin.closeHelpDialog}
          </button>
        </div>
      </div>
    </div>
  );
}
