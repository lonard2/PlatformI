#!/usr/bin/env python3
"""
PlatformI — GTFS schedule derivation (offline, bus lines only).

Downloads the official Transjakarta static GTFS feed, filters to explicitly
allowlisted services and the 41 in-scope dataset routes, and emits a compact
DERIVED artifact (median segment times, operating windows, headways) to
src/lib/data/gtfs-derived.json.

Rules:
- Never commits or writes the raw GTFS zip into the repo (temp dir only).
- Deterministic output: sorted keys, stable float rounding.
- Services HJ (expired Dec 2025) and X (single junk day) are excluded.
- GTFS times are headway templates (exact_times=0): the artifact records them
  as planning inputs, never as promised exact departures.

Usage:
  python3 scripts/derive-gtfs-schedule.py [--input /tmp/tj-gtfs] [--feed-url URL]
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import statistics
import sys
import tempfile
import urllib.request
import zipfile
from collections import Counter, defaultdict
from datetime import datetime, timezone

FEED_URL_DEFAULT = "https://gtfs.transjakarta.co.id/files/file_gtfs.zip"
ALLOWED_SERVICES = ["SH", "HK", "HL", "HM", "HR"]
WEEKDAY_SERVICES = {"HK", "SH", "HR"}
WEEKEND_SERVICES = {"HL", "HM", "SH", "HR"}

# Dataset route code -> dataset line id (41 in-scope bus routes).
CODE_TO_LINE_ID = {
    "1": "line-tj-cor-1", "2": "line-tj-cor-2", "3": "line-tj-cor-3",
    "4": "line-tj-cor-4", "5": "line-tj-cor-5", "6": "line-tj-cor-6",
    "7": "line-tj-cor-7", "8": "line-tj-cor-8", "9": "line-tj-cor-9",
    "10": "line-tj-cor-10", "11": "line-tj-cor-11", "12": "line-tj-cor-12",
    "13": "line-tj-cor-13", "14": "line-tj-cor-14",
    "2A": "line-tj-sub-2a", "3F": "line-tj-sub-3f", "5C": "line-tj-sub-5c",
    "6A": "line-tj-sub-6a", "6B": "line-tj-sub-6b", "7F": "line-tj-sub-7f",
    "9A": "line-tj-sub-9a", "10H": "line-tj-sub-10h",
    "1A": "line-tj-feeder-1a", "1P": "line-tj-feeder-1p",
    "4C": "line-tj-feeder-4c", "6V": "line-tj-feeder-6v",
    "7A": "line-tj-feeder-7a", "9D": "line-tj-feeder-9d",
    "1T": "line-tj-royal-1t",
    "BW1": "line-tj-wisata-bw1", "BW2": "line-tj-wisata-bw2",
    "BW4": "line-tj-wisata-bw4",
    "JAK.01": "line-tj-mikro-jak01", "JAK.02": "line-tj-mikro-jak02",
    "JAK.03": "line-tj-mikro-jak03", "JAK.10": "line-tj-mikro-jak10",
    "JAK.12": "line-tj-mikro-jak12", "JAK.32": "line-tj-mikro-jak32",
    "JAK.45": "line-tj-mikro-jak45", "JAK.52": "line-tj-mikro-jak52",
    "JAK.88": "line-tj-mikro-jak88",
}


def parse_secs(t: str) -> int:
    h, m, s = t.split(":")
    return int(h) * 3600 + int(m) * 60 + int(s)


def fmt_hhmm(total: int) -> str:
    total %= 24 * 3600
    return f"{total // 3600:02d}:{(total % 3600) // 60:02d}"


def read_csv(path: str) -> list[dict]:
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default=None, help="Unzipped GTFS dir (skip download)")
    ap.add_argument("--feed-url", default=FEED_URL_DEFAULT)
    ap.add_argument("--out", default="src/lib/data/gtfs-derived.json")
    args = ap.parse_args()

    workdir = args.input
    tmp: tempfile.TemporaryDirectory | None = None
    feed_fingerprint = ""
    if workdir is None:
        tmp = tempfile.TemporaryDirectory(prefix="tj-gtfs-")
        zpath = os.path.join(tmp.name, "feed.zip")
        print(f"[derive] downloading {args.feed_url}", flush=True)
        urllib.request.urlretrieve(args.feed_url, zpath)
        with open(zpath, "rb") as f:
            feed_fingerprint = "sha256:" + hashlib.sha256(f.read()).hexdigest()
        with zipfile.ZipFile(zpath) as z:
            z.extractall(tmp.name)
        workdir = tmp.name
        print(f"[derive] extracted to {workdir}", flush=True)
    else:
        digest = hashlib.sha256()
        for root, _, files in sorted(os.walk(workdir)):
            for name in sorted(files):
                with open(os.path.join(root, name), "rb") as f:
                    digest.update(f.read())
        feed_fingerprint = "sha256:" + digest.hexdigest()

    routes = read_csv(os.path.join(workdir, "routes.txt"))
    trips = read_csv(os.path.join(workdir, "trips.txt"))
    stop_times = read_csv(os.path.join(workdir, "stop_times.txt"))
    freqs = read_csv(os.path.join(workdir, "frequencies.txt"))

    # Map GTFS route_id -> short name, keep only mapped routes.
    wanted_routes: dict[str, str] = {}
    for r in routes:
        if r["route_short_name"] in CODE_TO_LINE_ID:
            wanted_routes[r["route_id"]] = r["route_short_name"]
    missing = sorted(set(CODE_TO_LINE_ID) - {r["route_short_name"] for r in routes})
    print(f"[derive] mapped GTFS routes: {len(wanted_routes)} (missing: {missing or 'none'})")

    trips = [t for t in trips if t["route_id"] in wanted_routes and t["service_id"] in ALLOWED_SERVICES]
    print(f"[derive] trips after service filter {ALLOWED_SERVICES}: {len(trips)}")
    trip_ids = {t["trip_id"] for t in trips}
    trip_meta = {t["trip_id"]: t for t in trips}

    by_trip: dict[str, list[dict]] = defaultdict(list)
    for st in stop_times:
        if st["trip_id"] in trip_ids:
            by_trip[st["trip_id"]].append(st)
    for rows in by_trip.values():
        rows.sort(key=lambda r: int(r["stop_sequence"]))

    freq_by_trip: dict[str, int] = {}
    for f in freqs:
        if f["trip_id"] in trip_ids:
            try:
                freq_by_trip[f["trip_id"]] = int(f["headway_secs"])
            except ValueError:
                pass

    # Group trips by (route_id, direction_id).
    groups: dict[tuple[str, str], list[str]] = defaultdict(list)
    for t in trips:
        groups[(t["route_id"], t.get("direction_id", "") or "0")].append(t["trip_id"])

    lines: dict[str, dict] = {}
    total_rows = 0
    per_route_rows: dict[str, int] = {}
    for (route_id, direction), tids in sorted(groups.items()):
        code = wanted_routes[route_id]
        line_id = CODE_TO_LINE_ID[code]
        # Canonical stop order: stop sequence of the longest trip in the group.
        longest = max(tids, key=lambda tid: len(by_trip.get(tid, [])))
        canon = [r["stop_id"] for r in by_trip[longest]]
        # Median segment seconds across trips that traverse each consecutive pair.
        seg_lists: dict[tuple[str, str], list[int]] = defaultdict(list)
        for tid in tids:
            rows = by_trip.get(tid, [])
            times = {r["stop_id"]: parse_secs(r["arrival_time"]) for r in rows}
            for a, b in zip(canon, canon[1:]):
                if a in times and b in times:
                    dt = times[b] - times[a]
                    if 0 < dt <= 3600:
                        seg_lists[(a, b)].append(dt)
        seg_seconds = [round(statistics.median(seg_lists[(a, b)])) if seg_lists[(a, b)] else 0
                       for a, b in zip(canon, canon[1:])]
        # Impute zero/unknown segments with the direction median of positive
        # segments (duplicate timestamps in the feed, not teleportation).
        positives = sorted(s for s in seg_seconds if s > 0)
        fill = round(statistics.median(positives)) if positives else 0
        zero_count = sum(1 for s in seg_seconds if s <= 0)
        seg_seconds = [s if s > 0 else fill for s in seg_seconds]

        def window(svcs: set[str]) -> tuple[str | None, str | None]:
            firsts, lasts = [], []
            for tid in tids:
                if trip_meta[tid]["service_id"] not in svcs:
                    continue
                rows = by_trip.get(tid, [])
                if not rows:
                    continue
                firsts.append(parse_secs(rows[0]["departure_time"]))
                lasts.append(parse_secs(rows[-1]["arrival_time"]))
            if not firsts:
                return None, None
            return fmt_hhmm(min(firsts)), fmt_hhmm(max(lasts))

        fw0, lw0 = window(WEEKDAY_SERVICES)
        fw1, lw1 = window(WEEKEND_SERVICES)
        headways = sorted(freq_by_trip[t] for t in tids if t in freq_by_trip)
        n_rows = sum(len(by_trip.get(t, [])) for t in tids)
        total_rows += n_rows
        per_route_rows[code] = per_route_rows.get(code, 0) + n_rows
        entry = lines.setdefault(line_id, {
            "code": code, "gtfsRouteIds": [], "directions": [],
            "tripCount": 0, "stopTimeRows": 0, "headwayMinutesMedian": None,
        })
        if route_id not in entry["gtfsRouteIds"]:
            entry["gtfsRouteIds"].append(route_id)
        entry["directions"].append({
            "direction": direction,
            "stopIds": canon,
            "segmentSeconds": seg_seconds,
            "firstTripWeekday": fw0, "lastTripWeekday": lw0,
            "firstTripWeekend": fw1, "lastTripWeekend": lw1,
            "tripCount": len(tids),
        })
        entry["tripCount"] += len(tids)
        entry["stopTimeRows"] += n_rows
        entry["_headways"] = sorted(entry.get("_headways", []) + headways)

    for entry in lines.values():
        hh = entry.pop("_headways")
        entry["headwayMinutesMedian"] = round(statistics.median(hh) / 60, 1) if hh else None
        entry["gtfsRouteIds"].sort()
        entry["directions"].sort(key=lambda d: d["direction"])

    out = {
        "generatedNote": "Derived from official Transjakarta static GTFS. Times are headway templates, not promised departures.",
        "feedUrl": args.feed_url,
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "feedFingerprint": feed_fingerprint,
        "allowedServices": ALLOWED_SERVICES,
        "lines": dict(sorted(lines.items())),
    }
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, sort_keys=True, ensure_ascii=False)
        f.write("\n")

    print(f"[derive] lines: {len(lines)} trips: {sum(e['tripCount'] for e in lines.values())} rows: {total_rows}")
    print(f"[derive] wrote {args.out} ({os.path.getsize(args.out) // 1024} KB)")
    for code in sorted(per_route_rows):
        print(f"  {code}: {per_route_rows[code]} rows")
    if tmp is not None:
        tmp.cleanup()
    return 0


if __name__ == "__main__":
    sys.exit(main())
