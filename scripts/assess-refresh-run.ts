/**
 * assess-refresh-run.ts — verdict + report + persistence for one GTFS refresh.
 *
 * Usage:
 *   npx tsx scripts/assess-refresh-run.ts \
 *     --candidate <temp artifact> --current <committed artifact> \
 *     --report-out <report.json> [--feed-url <url>]
 *
 * Exit codes: 0 promoted-verdict, 2 quarantine-verdict, 1 failed run
 * (unreadable candidate, DB and file log both unavailable, etc.).
 * A ScheduleRefreshRun row is recorded on every path; when Postgres is
 * unreachable the run is appended to var/runs.log instead — but the exit
 * code always reflects validation, never the logging fallback.
 */
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname } from "node:path";
import { db, closeDb } from "../src/lib/db";
import {
  assessRefresh,
  diffArtifacts,
  type RefreshCandidate,
} from "../src/lib/services/scheduleRefresh";

type Verdict = "promote" | "quarantine" | "failed";

interface RunReport {
  startedAt: string;
  feedUrl: string;
  feedFingerprint: string;
  lineCount: number;
  stopRowCount: number;
  verdict: Verdict;
  reasons: string[];
  drifts: ReturnType<typeof diffArtifacts>;
}

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  return idx === -1 ? undefined : process.argv[idx + 1];
}

function readJson(path: string | undefined): Record<string, unknown> | null {
  if (!path) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function summariesOf(
  lines: Record<string, Record<string, unknown>>
): Record<
  string,
  {
    headwayMinutesMedian: number | null;
    firstTripWeekday: string | null;
    lastTripWeekday: string | null;
  }
> {
  const out: Record<
    string,
    {
      headwayMinutesMedian: number | null;
      firstTripWeekday: string | null;
      lastTripWeekday: string | null;
    }
  > = {};
  for (const [lineId, entry] of Object.entries(lines)) {
    out[lineId] = {
      headwayMinutesMedian:
        typeof entry.headwayMinutesMedian === "number"
          ? entry.headwayMinutesMedian
          : null,
      firstTripWeekday:
        typeof entry.firstTripWeekday === "string" ? entry.firstTripWeekday : null,
      lastTripWeekday:
        typeof entry.lastTripWeekday === "string" ? entry.lastTripWeekday : null,
    };
  }
  return out;
}

async function recordRun(report: RunReport): Promise<void> {
  const row = {
    feedUrl: report.feedUrl,
    feedFingerprint: report.feedFingerprint,
    lineCount: report.lineCount,
    stopRowCount: report.stopRowCount,
    status:
      report.verdict === "promote"
        ? "ok"
        : report.verdict === "quarantine"
          ? "quarantined"
          : "failed",
    errorsJson: JSON.stringify(report.reasons),
    driftJson: JSON.stringify(report.drifts),
  };
  try {
    await db.scheduleRefreshRun.create({ data: row });
  } catch (err) {
    mkdirSync("var", { recursive: true });
    appendFileSync(
      "var/runs.log",
      JSON.stringify({ ...row, recordedAt: new Date().toISOString() }) + "\n"
    );
    console.error(
      "[refresh] DB record failed, file-logged instead:",
      (err as Error).message
    );
  }
}

async function main(): Promise<number> {
  const candidateRaw = readJson(arg("--candidate"));
  const currentRaw = readJson(arg("--current"));
  const reportOut = arg("--report-out") ?? "";
  const startedAt = new Date().toISOString();

  const fail = async (reasons: string[]): Promise<number> => {
    const report: RunReport = {
      startedAt,
      feedUrl: arg("--feed-url") ?? "",
      feedFingerprint: "",
      lineCount: 0,
      stopRowCount: 0,
      verdict: "failed",
      reasons,
      drifts: [],
    };
    if (reportOut) {
      mkdirSync(dirname(reportOut), { recursive: true });
      writeFileSync(reportOut, JSON.stringify(report, null, 2) + "\n");
    }
    await recordRun(report);
    for (const r of reasons) console.error(`[refresh] ${r}`);
    return 1;
  };

  if (!candidateRaw || !currentRaw) {
    return fail(["unreadable candidate or current artifact"]);
  }

  const candidate = candidateRaw as unknown as RefreshCandidate;
  const current = currentRaw as unknown as RefreshCandidate;
  const assessment = assessRefresh(candidate, current);
  const candidateLines = (candidateRaw.lines ?? {}) as Record<string, Record<string, unknown>>;
  const currentLines = (currentRaw.lines ?? {}) as Record<string, Record<string, unknown>>;
  const drifts = diffArtifacts(summariesOf(candidateLines), summariesOf(currentLines));
  const stopRowCount = Object.values(candidateLines).reduce(
    (sum, e) => sum + (typeof e.stopTimeRows === "number" ? e.stopTimeRows : 0),
    0
  );

  const report: RunReport = {
    startedAt,
    feedUrl:
      arg("--feed-url") ??
      (typeof candidateRaw.feedUrl === "string" ? candidateRaw.feedUrl : ""),
    feedFingerprint:
      typeof candidateRaw.feedFingerprint === "string"
        ? candidateRaw.feedFingerprint
        : "",
    lineCount: Object.keys(candidateLines).length,
    stopRowCount,
    verdict: assessment.verdict === "promote" ? "promote" : "quarantine",
    reasons: assessment.reasons,
    drifts,
  };
  if (reportOut) {
    mkdirSync(dirname(reportOut), { recursive: true });
    writeFileSync(reportOut, JSON.stringify(report, null, 2) + "\n");
  }
  await recordRun(report);
  if (report.verdict === "promote") {
    console.log(
      `[refresh] PROMOTE: ${report.lineCount} lines, ${report.stopRowCount} stop rows`
    );
    return 0;
  }
  for (const r of report.reasons) console.error(`[refresh] quarantine: ${r}`);
  return 2;
}

main()
  .then(async (code) => {
    await closeDb();
    process.exit(code);
  })
  .catch(async (err) => {
    console.error("[refresh] runner crashed:", (err as Error).message);
    try {
      await closeDb();
    } catch {
      /* already failing */
    }
    process.exit(1);
  });
