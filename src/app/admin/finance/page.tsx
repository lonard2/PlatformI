/**
 * PlatformI - OCC Finance Queue.
 *
 * Finance-role worklist for the intercity-first money path: confirm unpaid
 * reservations against transfer proof, and refund paid ones. The finance
 * APIs stay the final arbiter (supervisor threshold, gate-consumed blocks).
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Wallet, CheckCircle2, Undo2, ShieldAlert, RefreshCw } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { FINANCE_SUPERVISOR_THRESHOLD_RP } from "@/lib/services/adminAuthService";

interface QueueRow {
  ticketNumber: string;
  reservationCode: string | null;
  totalFareRp: number;
  paymentStatus: string;
  status: string;
  guestPhone: string | null;
  createdAt: string;
  paymentRef: string | null;
  confirmedBy: string | null;
  refundedBy: string | null;
}

function formatRp(amountRp: number): string {
  return `Rp${new Intl.NumberFormat("id-ID").format(amountRp)}`;
}

export default function AdminFinancePage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [operatorRole, setOperatorRole] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/finance/queue", { cache: "no-store" });
      const json = (await res.json()) as { success: boolean; error?: string; tickets?: QueueRow[] };
      if (!res.ok || !json.success) {
        setLoadError(json.error ?? `HTTP_${res.status}`);
        setRows([]);
        return;
      }
      setRows(json.tickets ?? []);
    } catch {
      setLoadError("NETWORK_ERROR");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/auth")
      .then((res) => res.json())
      .then((data: { authenticated?: boolean; operator?: { role?: string } }) => {
        setOperatorRole(data.operator?.role ?? null);
      })
      .catch(() => setOperatorRole(null))
      .finally(() => {
        void loadQueue();
      });
  }, [loadQueue]);

  const isFinance = operatorRole === "FINANCE_OFFICER" || operatorRole === "FINANCE_SUPERVISOR";

  async function confirmPayment(ticketNumber: string): Promise<void> {
    setBusy(ticketNumber);
    setNotice(null);
    try {
      const res = await fetch("/api/finance/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketNumber }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        setNotice(json.error ?? `HTTP_${res.status}`);
        return;
      }
      setNotice(t.admin.financeConfirmed.replace("{code}", ticketNumber));
      await loadQueue();
    } finally {
      setBusy(null);
    }
  }

  async function refundPayment(ticketNumber: string): Promise<void> {
    setBusy(ticketNumber);
    setNotice(null);
    try {
      const res = await fetch("/api/finance/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketNumber, reason: reasons[ticketNumber] ?? "" }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        setNotice(json.error ?? `HTTP_${res.status}`);
        return;
      }
      setNotice(t.admin.financeRefunded.replace("{code}", ticketNumber));
      setReasons((prev) => {
        const next = { ...prev };
        delete next[ticketNumber];
        return next;
      });
      await loadQueue();
    } finally {
      setBusy(null);
    }
  }

  return (
    <main id="admin-main" className="p-6 space-y-5" data-testid="finance-queue-page">
      <header className="flex items-center gap-3">
        <Wallet className="w-6 h-6 text-emerald-300" aria-hidden="true" />
        <div>
          <h1 className="text-xl font-semibold">{t.admin.financeQueueTitle}</h1>
          <p className="text-sm text-slate-400">{t.admin.financeQueueSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadQueue()}
          className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          {t.common.refresh}
        </button>
      </header>

      {!loading && operatorRole !== null && !isFinance && (
        <p role="alert" className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <ShieldAlert className="mr-2 inline w-4 h-4" aria-hidden="true" />
          {t.admin.financeDenied}
        </p>
      )}

      {notice !== null && (
        <p role="status" className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm">
          {notice}
        </p>
      )}
      {loadError !== null && (
        <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm">
          {loadError}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">{t.common.loading}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-400">{t.admin.financeQueueEmpty}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const needsSupervisor = row.totalFareRp >= FINANCE_SUPERVISOR_THRESHOLD_RP;
            return (
              <li
                key={row.ticketNumber}
                className="rounded-xl border border-slate-700/70 bg-slate-900/60 px-4 py-3"
                data-testid={`finance-row-${row.ticketNumber}`}
              >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-mono text-sm font-semibold">{row.ticketNumber}</span>
                  <span className="text-xs text-slate-400">{row.reservationCode ?? "—"}</span>
                  <span className="text-sm font-semibold text-emerald-300">{formatRp(row.totalFareRp)}</span>
                  <span className="rounded-full border border-slate-600 px-2 py-0.5 text-xs">{row.paymentStatus}</span>
                  {needsSupervisor && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/50 px-2 py-0.5 text-xs text-amber-300">
                      <ShieldAlert className="w-3 h-3" aria-hidden="true" />
                      {t.admin.financeNeedsSupervisor}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-slate-500">
                    {row.guestPhone ?? "—"} · {new Date(row.createdAt).toLocaleString("id-ID")}
                  </span>
                </div>
                {isFinance && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {row.paymentStatus === "UNPAID" && (
                      <button
                        type="button"
                        disabled={busy === row.ticketNumber}
                        onClick={() => void confirmPayment(row.ticketNumber)}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                        {t.admin.financeConfirmPayment}
                      </button>
                    )}
                    {row.paymentStatus === "PAID" && (
                      <>
                        <input
                          type="text"
                          value={reasons[row.ticketNumber] ?? ""}
                          onChange={(e) =>
                            setReasons((prev) => ({ ...prev, [row.ticketNumber]: e.target.value }))
                          }
                          placeholder="reason"
                          aria-label={`refund reason for ${row.ticketNumber}`}
                          className="w-56 rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm"
                        />
                        <button
                          type="button"
                          disabled={busy === row.ticketNumber}
                          onClick={() => void refundPayment(row.ticketNumber)}
                          className="inline-flex items-center gap-2 rounded-lg border border-rose-500/60 px-3 py-1.5 text-sm hover:bg-rose-500/10 disabled:opacity-50"
                        >
                          <Undo2 className="w-4 h-4" aria-hidden="true" />
                          {t.admin.financeRefund}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
