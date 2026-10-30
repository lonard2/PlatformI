/**
 * PlatformI - About page.
 *
 * Public, localized, data-driven: headings from the `about` dictionary
 * section, credit entries from the shared aboutCredits module (the same
 * source CREDITS.md documents).
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

"use client";

import Link from "next/link";
import { TrainFront, Info } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { ABOUT_CREDIT_GROUPS } from "@/lib/aboutCredits";

export default function AboutPage() {
  const { t } = useTranslation();
  const a = t.about;

  const headings: Record<string, string> = {
    data: a.dataTitle,
    tech: a.techTitle,
    maps: a.mapsTitle,
    credits: a.creditsTitle,
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 bg-[#090d16] px-4 py-10 text-slate-100">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
          <TrainFront aria-hidden="true" className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{a.title}</h1>
          <p className="text-sm text-slate-400">{a.tagline}</p>
        </div>
      </header>

      <section aria-label={a.missionTitle} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <h2 className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-white">
          <Info aria-hidden="true" className="h-4 w-4 text-cyan-400" />
          {a.missionTitle}
        </h2>
        <p className="text-sm leading-relaxed text-slate-300">{a.missionBody}</p>
      </section>

      <section aria-label={a.coverageTitle} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <h2 className="mb-1.5 text-sm font-bold text-white">{a.coverageTitle}</h2>
        <p className="text-sm leading-relaxed text-slate-300">{a.coverageBody}</p>
      </section>

      {ABOUT_CREDIT_GROUPS.map((group) => (
        <section
          key={group.id}
          aria-label={headings[group.id]}
          className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
        >
          <h2 className="mb-2 text-sm font-bold text-white">{headings[group.id]}</h2>
          <ul className="space-y-1.5">
            {group.entries.map((entry) => (
              <li key={entry.name} className="text-sm">
                <span className="font-semibold text-slate-100">{entry.name}</span>
                <span className="text-slate-400"> — {a[entry.detailKey]}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section aria-label={a.licenseTitle} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <h2 className="mb-1.5 text-sm font-bold text-white">{a.licenseTitle}</h2>
        <p className="text-sm leading-relaxed text-slate-300">{a.licenseBody}</p>
      </section>

      <footer>
        <Link href="/" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
          ← PlatformI
        </Link>
      </footer>
    </main>
  );
}
