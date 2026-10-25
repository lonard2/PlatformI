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
  Eye,
  EyeOff,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { setActiveOperatorId } from "@/lib/services/shiftLogService";
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
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [showPasskey, setShowPasskey] = useState<boolean>(false);
  const [capsLockOn, setCapsLockOn] = useState<boolean>(false);
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const roleLabelFor = (presetId: string): string =>
    presetId === "OCC-DKA-01"
      ? t.admin.roleChief
      : presetId === "OCC-MRT-02"
      ? t.admin.roleLine
      : t.admin.roleSecurity;

  // Demo presets live behind an explicit flag so production builds never
  // advertise them: run local dev with NEXT_PUBLIC_DEMO_MODE=1 to onboard.
  const isDemoEnv = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

  const matchedPreset = PUBLIC_OPERATOR_PRESETS.find(
    (p) => p.id === operatorId.trim()
  );
  const identityLine = matchedPreset
    ? t.admin.loginAuthorizingAs
        .replace("{name}", matchedPreset.name)
        .replace("{role}", roleLabelFor(matchedPreset.id))
        .replace("{hub}", matchedPreset.stationHub)
    : operatorId.trim()
    ? t.admin.loginAuthorizingAsId.replace("{id}", operatorId.trim())
    : "";

  // Landing preview: name the surface the deep link resolves to so the
  // success banner ends with context instead of a blind teleport.
  const landingLabel = (() => {
    const target = callbackUrl.startsWith("/admin") ? callbackUrl : "/admin";
    const labels: Record<string, string> = {
      "/admin": t.admin.dashboard,
      "/admin/alerts": t.admin.disruptionManager,
      "/admin/fleet": t.admin.fleetControl,
      "/admin/network": t.admin.networkStudio,
      "/admin/timetables": t.admin.timetableManager,
      "/admin/scanner": t.admin.gateScanner,
    };
    return labels[target] ?? t.admin.dashboard;
  })();

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  // Client-visible attempt discipline: the count advises, the supervisor
  // contact escalates; only the server can truly lock the account, so the
  // form stays usable and every further rejection re-states the lockout.
  const MAX_LOGIN_ATTEMPTS = 5;

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
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        setErrorMessage(
          nextAttempts >= MAX_LOGIN_ATTEMPTS
            ? t.admin.loginAttemptLockout
            : `${data.error || t.admin.loginErrorInvalid} ${t.admin.loginAttemptCount
                .replace("{n}", String(nextAttempts))
                .replace("{max}", String(MAX_LOGIN_ATTEMPTS))}`
        );
        setIsLoading(false);
        return;
      }

      setSuccessMessage(
        `${t.admin.loginWelcomePrefix}, ${data.operator?.name || t.admin.operatorFallback}. ${t.admin.loginAuthorizing} ${t.admin.loginEntering} → ${landingLabel}.`
      );

      if (data.operator?.id) {
        setActiveOperatorId(data.operator.id);
      }

      // Readable pause: the operator registers the welcome and the landing
      // surface before the context switch.
      redirectTimerRef.current = setTimeout(() => {
        const target = callbackUrl.startsWith("/admin") ? callbackUrl : "/admin";
        router.push(target);
        router.refresh();
      }, 1200);
    } catch {
      setErrorMessage(t.admin.loginErrorNetwork);
      setIsLoading(false);
    }
  };

  const handleSelectPreset = (presetId: string) => {
    setOperatorId(presetId);
    // Same-operator mis-tap keeps the typed passkey; switching operators
    // clears it so one operator's token is never submitted as another's.
    if (presetId !== operatorId.trim()) {
      setPasskey("");
    }
    setErrorMessage(null);
  };

  const handlePasskeyKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === "function") {
      setCapsLockOn(e.getModifierState("CapsLock"));
    }
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
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
              isDemoEnv
                ? "bg-amber-950/80 border-amber-500/40 text-amber-300"
                : "bg-slate-950/60 border-slate-700 text-slate-400"
            }`}
          >
            {isDemoEnv ? t.admin.loginEnvDemo : t.admin.loginEnvProduction}
          </span>
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
            <div className="relative">
              <input
                id="operator-passkey"
                name="password"
                type={showPasskey ? "text" : "password"}
                autoComplete="current-password"
                required
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                onKeyDown={handlePasskeyKey}
                onKeyUp={handlePasskeyKey}
                onBlur={() => setCapsLockOn(false)}
                placeholder="••••••••••••"
                disabled={isLoading}
                aria-describedby="operator-passkey-caps"
                className="w-full px-3.5 py-2.5 pr-11 rounded-xl bg-slate-950/80 border border-slate-700/80 text-xs font-mono text-white placeholder-slate-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPasskey((v) => !v)}
                aria-label={showPasskey ? t.admin.loginHidePasskey : t.admin.loginShowPasskey}
                aria-pressed={showPasskey}
                disabled={isLoading}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition min-w-[36px] min-h-[36px] flex items-center justify-center disabled:opacity-50"
              >
                {showPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="relative -mt-2">
            <span id="operator-passkey-caps" className="text-[10px] text-amber-300 font-mono">
              {capsLockOn ? t.admin.loginCapsLock : ""}
            </span>
          </div>

          {/* Who is being authorized: named operator or typed badge ID */}
          {identityLine && (
            <p
              data-testid="auth-identity-line"
              className="text-[11px] text-slate-300 font-mono truncate"
            >
              {identityLine}
            </p>
          )}

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

          {/* Session scope: what this login actually grants */}
          <p className="text-center text-[10px] text-slate-500">
            {t.admin.loginSessionScope}
          </p>
        </form>

        {/* Quick Credentials Switcher (demo environments only) */}
        {isDemoEnv && (
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
                    {roleLabelFor(preset.id)}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {preset.stationHub}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Return Link */}
      <div className="text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>{t.admin.loginReturnPassengerView}</span>
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
