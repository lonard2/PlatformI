/**
 * PlatformI - Operations Control Center (OCC) Login & Dispatcher Auth Portal
 *
 * Implements:
 * - High-contrast OCC dispatcher terminal authentication interface
 * - Quick credential presets for testing & operations onboarding
 * - Secure session establishment with HTTP-only cookie
 * - Deep link destination routing via callbackUrl
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Train,
  KeyRound,
  UserCheck,
  ArrowRight,
  Lock,
  AlertCircle,
  Compass,
  CheckCircle2,
  Loader2,
  Terminal,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { PUBLIC_OPERATOR_PRESETS } from "@/lib/services/adminPresetOperators";

function AdminLoginForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";

  const [operatorId, setOperatorId] = useState<string>("OCC-DKA-01");
  const [passkey, setPasskey] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorId.trim() || !passkey.trim()) {
      setErrorMessage(t.admin.loginErrorRequired);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          operatorId: operatorId.trim(),
          passkey: passkey.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || t.admin.loginErrorInvalid);
        setIsLoading(false);
        return;
      }

      setSuccessMessage(
        `${t.admin.loginWelcomePrefix}, ${data.operator?.name || t.admin.operatorFallback}. ${t.admin.loginAuthorizing}`
      );

      // Brief pause to display success state before transition
      redirectTimerRef.current = setTimeout(() => {
        const target = callbackUrl.startsWith("/admin") ? callbackUrl : "/admin";
        router.push(target);
        router.refresh();
      }, 500);
    } catch {
      setErrorMessage(t.admin.loginErrorNetwork);
      setIsLoading(false);
    }
  };

  const handleSelectPreset = (presetId: string) => {
    setOperatorId(presetId);
    setPasskey("");
    setErrorMessage(null);
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
          <Train className="w-6 h-6" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-xl font-bold text-white tracking-tight">PlatformI OCC</h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-bold">
            {t.admin.loginRestricted}
          </span>
        </div>
        <p className="text-xs text-slate-400">
          {t.admin.loginOpsHub}
        </p>
      </div>

      {/* Main Login Card */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-white/15 shadow-2xl backdrop-blur-xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Lock className="w-4 h-4 text-cyan-400" />
            <span>{t.admin.loginDispatcherAuth}</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">v1.0.0-PROD</span>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2.5 animate-in fade-in duration-150"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div
            role="status"
            aria-live="polite"
            className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-start gap-2.5 animate-in fade-in duration-150"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Operator ID */}
          <div className="space-y-1.5">
            <label htmlFor="operator-badge-id" className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                {t.admin.loginBadgeId}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{t.admin.loginBadgeExample}</span>
            </label>
            <input
              id="operator-badge-id"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
              placeholder="OCC-DKA-01"
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-xs font-mono text-white placeholder-slate-500 transition"
            />
          </div>

          {/* Passkey */}
          <div className="space-y-1.5">
            <label htmlFor="operator-passkey" className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                {t.admin.loginPasskey}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{t.admin.loginShiftToken}</span>
            </label>
            <input
              id="operator-passkey"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
              placeholder="••••••••••••"
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-xs font-mono text-white placeholder-slate-500 transition"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-cyan-950 text-xs font-bold shadow-md flex items-center justify-center gap-2 btn-tactile transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.admin.loginAuthorizing}</span>
              </>
            ) : (
              <>
                <span>{t.admin.loginAccessDashboard}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Credentials Switcher */}
        <div className="pt-3 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Terminal className="w-3 h-3 text-cyan-400" />
              {t.admin.loginDemoCredentials}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10px] font-mono">
            {PUBLIC_OPERATOR_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.id)}
                className={`p-2 rounded-lg border text-left transition btn-tactile min-h-[44px] ${
                  operatorId === preset.id
                    ? "bg-cyan-950/80 border-cyan-500/50 text-cyan-300 font-bold"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="font-bold truncate">{preset.id}</div>
                <div className="text-[10px] text-slate-400 truncate">
                  {preset.id === "OCC-DKA-01"
                    ? t.admin.roleChief
                    : preset.id === "OCC-MRT-02"
                    ? t.admin.roleLine
                    : t.admin.roleSecurity}
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate">
                  {preset.demoPasskey}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Return Link */}
      <div className="text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>{t.admin.loginReturnCockpit}</span>
        </Link>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen w-screen bg-[#070b14] flex items-center justify-center p-4 selection:bg-cyan-500/30">
      <Suspense
        fallback={
          <div className="p-8 text-center text-xs text-slate-400 font-mono flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>{t.admin.loginLoading}</span>
          </div>
        }
      >
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
