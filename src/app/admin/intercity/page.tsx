/**
 * PlatformI - Operator Control Portal: Intercity Operators & Terminals
 *
 * OCC authoring for intercity operator rosters and their boarding points
 * (terminal, agen, pool, gate, pier). Operators are listed with expandable
 * point rosters; deletes confirm with cascade counts (points cascade,
 * linked runs keep their schedules with a nulled operator reference).
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, X, Building2, MapPin } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type {
  IntercityOperator,
  BoardingPoint,
  BoardingPointKind,
  TransitMode,
} from "@/types/transit";

const INTERCITY_MODES: TransitMode[] = [
  "KAI_INTERCITY",
  "AKAP_INTERCITY_BUS",
  "EXECUTIVE_SHUTTLE",
  "AIRPORT_COMMERCIAL",
  "MARITIME_SPEEDBOAT",
  "MARITIME_PELNI",
];

const POINT_KINDS: BoardingPointKind[] = ["TERMINAL", "AGEN", "POOL", "GATE", "PIER"];

interface OperatorDraft {
  id?: string;
  name: string;
  mode: string;
  serviceTier: string;
}

interface PointDraft {
  id?: string;
  operatorId: string;
  label: string;
  kind: BoardingPointKind;
}

export default function AdminIntercityPage() {
  const { t } = useTranslation();
  const [operators, setOperators] = useState<IntercityOperator[]>([]);
  const [points, setPoints] = useState<BoardingPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [opDraft, setOpDraft] = useState<OperatorDraft | null>(null);
  const [pointDraft, setPointDraft] = useState<PointDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    { kind: "operator"; id: string; name: string } | { kind: "point"; id: string; name: string } | null
  >(null);
  const [busy, setBusy] = useState<boolean>(false);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [opsRes, pointsRes] = await Promise.all([
        fetch("/api/intercity/operators"),
        fetch("/api/intercity/boarding-points"),
      ]);
      const opsJson = await opsRes.json();
      const pointsJson = await pointsRes.json();
      if (!opsRes.ok) throw new Error(opsJson.error || "Failed to load operators");
      if (!pointsRes.ok) throw new Error(pointsJson.error || "Failed to load boarding points");
      setOperators(opsJson.operators || []);
      setPoints(pointsJson.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load intercity data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const openNewOperator = (): void => {
    setOpDraft({ name: "", mode: "AKAP_INTERCITY_BUS", serviceTier: "" });
  };

  const openEditOperator = (op: IntercityOperator): void => {
    setOpDraft({ id: op.id, name: op.name, mode: op.mode, serviceTier: op.serviceTier });
  };

  const saveOperator = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!opDraft || !opDraft.name.trim() || !opDraft.serviceTier.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const isEdit = Boolean(opDraft.id);
      const res = await fetch("/api/intercity/operators", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? { id: opDraft.id, name: opDraft.name.trim(), mode: opDraft.mode, serviceTier: opDraft.serviceTier.trim() }
            : { name: opDraft.name.trim(), mode: opDraft.mode, serviceTier: opDraft.serviceTier.trim() }
        ),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save operator");
      setOperators((prev) =>
        isEdit ? prev.map((o) => (o.id === json.data.id ? json.data : o)) : [...prev, json.data]
      );
      setOpDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save operator");
    } finally {
      setBusy(false);
    }
  };

  const openNewPoint = (operatorId: string): void => {
    setPointDraft({ operatorId, label: "", kind: "POOL" });
  };

  const openEditPoint = (p: BoardingPoint): void => {
    setPointDraft({ id: p.id, operatorId: p.operatorId, label: p.label, kind: p.kind });
  };

  const savePoint = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!pointDraft || !pointDraft.label.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const isEdit = Boolean(pointDraft.id);
      const res = await fetch("/api/intercity/boarding-points", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? { id: pointDraft.id, label: pointDraft.label.trim(), kind: pointDraft.kind }
            : { operatorId: pointDraft.operatorId, label: pointDraft.label.trim(), kind: pointDraft.kind }
        ),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save boarding point");
      setPoints((prev) =>
        isEdit ? prev.map((p) => (p.id === json.data.id ? json.data : p)) : [...prev, json.data]
      );
      setPointDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save boarding point");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async (): Promise<void> => {
    if (!deleteTarget || busy) return;
    setBusy(true);
    setError(null);
    try {
      const url =
        deleteTarget.kind === "operator"
          ? `/api/intercity/operators?id=${encodeURIComponent(deleteTarget.id)}`
          : `/api/intercity/boarding-points?id=${encodeURIComponent(deleteTarget.id)}`;
      const res = await fetch(url, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to delete");
      if (deleteTarget.kind === "operator") {
        setOperators((prev) => prev.filter((o) => o.id !== deleteTarget.id));
        const goneId = deleteTarget.id;
        setPoints((prev) => prev.filter((p) => p.operatorId !== goneId));
      } else {
        setPoints((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      }
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusy(false);
    }
  };

  const pointsFor = (operatorId: string): BoardingPoint[] =>
    points.filter((p) => p.operatorId === operatorId);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {t.admin.icTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">{t.admin.icSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={openNewOperator}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition btn-tactile min-h-[40px] self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t.admin.icAddOperator}</span>
        </button>
      </div>

      {error && (
        <p role="alert" className="text-xs text-rose-300 font-mono bg-rose-950/40 border border-rose-500/30 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {isLoading ? (
        <p role="status" className="text-xs text-slate-400 font-mono">…</p>
      ) : operators.length === 0 ? (
        <p className="text-xs text-slate-400 font-mono p-4 rounded-xl bg-slate-900/60 border border-white/5">
          {t.admin.icEmptyOperators}
        </p>
      ) : (
        <div className="space-y-3">
          {operators.map((op) => {
            const opPoints = pointsFor(op.id);
            return (
              <div key={op.id} className="rounded-2xl bg-slate-900/80 border border-white/10 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="text-sm font-bold text-white truncate">{op.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md border bg-slate-950/80 border-white/10 text-slate-300 shrink-0">
                      {op.mode}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md border bg-indigo-950/80 border-indigo-500/40 text-indigo-300 shrink-0">
                      {op.serviceTier}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">
                      {opPoints.length} pts
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openNewPoint(op.id)}
                      aria-label={`${t.admin.icAddPoint}: ${op.name}`}
                      className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition min-h-[40px] flex items-center gap-1"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{t.admin.icAddPoint}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditOperator(op)}
                      aria-label={`${t.admin.icEditOperator}: ${op.name}`}
                      className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition min-h-[40px] flex items-center gap-1"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>{t.admin.icEditOperator}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ kind: "operator", id: op.id, name: op.name })}
                      aria-label={`${t.admin.icDeleteOperator}: ${op.name}`}
                      className="px-2.5 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-xs font-semibold transition min-h-[40px] flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.admin.icDeleteOperator}</span>
                    </button>
                  </div>
                </div>

                {opPoints.length === 0 ? (
                  <p className="text-[11px] text-slate-500 font-mono pl-1">—</p>
                ) : (
                  <div className="space-y-1.5 pl-1">
                    {opPoints.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-950/60 border border-white/5 px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="text-xs text-slate-200 truncate">{p.label}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-white/10 text-slate-400 shrink-0">
                            {p.kind}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditPoint(p)}
                            aria-label={`${t.admin.icEditPoint}: ${p.label}`}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ kind: "point", id: p.id, name: p.label })}
                            aria-label={`${t.admin.icDeletePoint}: ${p.label}`}
                            className="p-2 rounded-lg text-rose-300/80 hover:text-rose-200 hover:bg-rose-950/60 transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {opDraft && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpDraft(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={opDraft.id ? t.admin.icEditOperator : t.admin.icAddOperator}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setOpDraft(null);
              }
            }}
            className="w-full max-w-md p-5 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">
                {opDraft.id ? t.admin.icEditOperator : t.admin.icAddOperator}
              </h3>
              <button
                type="button"
                onClick={() => setOpDraft(null)}
                aria-label={t.common.close}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={(e) => { void saveOperator(e); }} className="space-y-3 text-xs text-slate-300">
              <div>
                <label htmlFor="ic-op-name" className="block text-[11px] text-slate-400 mb-1">{t.admin.icOperatorName}</label>
                <input
                  id="ic-op-name"
                  type="text"
                  required
                  value={opDraft.name}
                  onChange={(e) => setOpDraft({ ...opDraft, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ic-op-mode" className="block text-[11px] text-slate-400 mb-1">{t.admin.icMode}</label>
                  <select
                    id="ic-op-mode"
                    value={opDraft.mode}
                    onChange={(e) => setOpDraft({ ...opDraft, mode: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white"
                  >
                    {INTERCITY_MODES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="ic-op-tier" className="block text-[11px] text-slate-400 mb-1">{t.admin.icServiceTier}</label>
                  <input
                    id="ic-op-tier"
                    type="text"
                    required
                    value={opDraft.serviceTier}
                    onChange={(e) => setOpDraft({ ...opDraft, serviceTier: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white"
                  />
                </div>
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpDraft(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition disabled:opacity-50 btn-tactile"
                >
                  {t.admin.icSave}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pointDraft && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setPointDraft(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={pointDraft.id ? t.admin.icEditPoint : t.admin.icAddPoint}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setPointDraft(null);
              }
            }}
            className="w-full max-w-md p-5 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">
                {pointDraft.id ? t.admin.icEditPoint : t.admin.icAddPoint}
              </h3>
              <button
                type="button"
                onClick={() => setPointDraft(null)}
                aria-label={t.common.close}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={(e) => { void savePoint(e); }} className="space-y-3 text-xs text-slate-300">
              <div>
                <label htmlFor="ic-point-label" className="block text-[11px] text-slate-400 mb-1">{t.admin.icPointLabel}</label>
                <input
                  id="ic-point-label"
                  type="text"
                  required
                  value={pointDraft.label}
                  onChange={(e) => setPointDraft({ ...pointDraft, label: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white"
                />
              </div>
              <div>
                <label htmlFor="ic-point-kind" className="block text-[11px] text-slate-400 mb-1">{t.admin.icKind}</label>
                <select
                  id="ic-point-kind"
                  value={pointDraft.kind}
                  onChange={(e) => setPointDraft({ ...pointDraft, kind: e.target.value as BoardingPointKind })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white"
                >
                  {POINT_KINDS.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPointDraft(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition disabled:opacity-50 btn-tactile"
                >
                  {t.admin.icSave}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={deleteTarget.kind === "operator" ? t.admin.icDeleteOperator : t.admin.icDeletePoint}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setDeleteTarget(null);
              }
            }}
            className="w-full max-w-md p-5 rounded-2xl bg-slate-900 border border-rose-500/40 shadow-2xl space-y-3"
          >
            <p className="text-xs text-slate-200 leading-relaxed">
              {deleteTarget.kind === "operator"
                ? t.admin.icConfirmDeleteOperator
                    .replace("{name}", deleteTarget.name)
                    .replace("{n}", String(pointsFor(deleteTarget.id).length))
                : t.admin.icConfirmDeletePoint.replace("{name}", deleteTarget.name)}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={() => { void confirmDelete(); }}
                disabled={busy}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition disabled:opacity-50 btn-tactile"
              >
                {t.admin.icDelete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
