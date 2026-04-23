#!/usr/bin/env python3
"""
sync_all.py — One command to refresh all property financial data from Dropbox.

Runs in sequence:
    1. Balance sheets    (sync_balance_sheets.py)
    2. Income statements (sync_actuals.py)
    3. Rent rolls        (sync_rent_rolls.py)

Usage:
    python3 scripts/sync_all.py                   # dry-run everything
    python3 scripts/sync_all.py --commit          # write to Supabase
    python3 scripts/sync_all.py --commit -v       # verbose
    python3 scripts/sync_all.py --commit --force-refresh
                                                  # re-load even if already in DB
    python3 scripts/sync_all.py --property 61     # single property (folder match)
    python3 scripts/sync_all.py --skip rent_rolls # run 2 of 3
    python3 scripts/sync_all.py --only actuals    # run 1 of 3

Each child script's output is streamed through live. Non-zero exit from any
child marks this run "partial success" and returns 1 at the end.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent

STEPS = [
    ("balance_sheets", "sync_balance_sheets.py",  ["--commit", "--property", "--force-refresh", "--verbose", "--file"]),
    ("actuals",        "sync_actuals.py",         ["--commit", "--property", "--force-refresh", "--verbose", "--file", "--min-year", "--year"]),
    ("rent_rolls",     "sync_rent_rolls.py",      ["--commit", "--property", "--verbose", "--file"]),  # no --force-refresh
]


def build_args(step_flags: list[str], ns: argparse.Namespace) -> list[str]:
    """Map orchestrator args → child-script args, only forwarding what the child supports."""
    out: list[str] = []
    if ns.commit and "--commit" in step_flags:
        out.append("--commit")
    if ns.verbose and "--verbose" in step_flags:
        out.append("--verbose")
    if ns.force_refresh and "--force-refresh" in step_flags:
        out.append("--force-refresh")
    if ns.property and "--property" in step_flags:
        out.extend(["--property", ns.property])
    if ns.file and "--file" in step_flags:
        out.extend(["--file", ns.file])
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--commit", action="store_true", help="Actually write to Supabase (default: dry-run).")
    ap.add_argument("--verbose", "-v", action="store_true")
    ap.add_argument("--force-refresh", action="store_true",
                    help="Re-load even if the period is already in Supabase.")
    ap.add_argument("--property", help="Substring filter on property folder name.")
    ap.add_argument("--file", help="Single file path — only meaningful with --only.")
    ap.add_argument("--skip", action="append", default=[], choices=[s[0] for s in STEPS],
                    help="Skip a step (repeatable). Choices: balance_sheets | actuals | rent_rolls.")
    ap.add_argument("--only", action="append", default=[], choices=[s[0] for s in STEPS],
                    help="Run ONLY these steps (repeatable). Inverse of --skip.")
    args = ap.parse_args()

    to_run = [(name, script, flags) for name, script, flags in STEPS
              if (not args.only or name in args.only)
              and name not in args.skip]

    if not to_run:
        print("Nothing to run (all steps skipped).", file=sys.stderr)
        return 1

    header = "MODE: COMMIT" if args.commit else "MODE: dry-run (use --commit to write)"
    print(f"\n{'━'*60}\n{header}\n{'━'*60}")
    print(f"Running steps: {', '.join(n for n, _, _ in to_run)}")
    if args.property: print(f"Property filter: {args.property}")
    if args.force_refresh: print("Force-refresh: YES")

    failed: list[str] = []
    for name, script, flags in to_run:
        path = SCRIPT_DIR / script
        if not path.exists():
            print(f"\n⚠ {name}: script not found at {path}", file=sys.stderr)
            failed.append(name)
            continue
        child_args = build_args(flags, args)
        print(f"\n{'═'*60}\n▶  STEP: {name.upper()}  "
              f"({script} {' '.join(child_args)})\n{'═'*60}")
        try:
            result = subprocess.run(["python3", str(path), *child_args],
                                    cwd=path.parent.parent, check=False)
        except KeyboardInterrupt:
            print("\n⚠ Interrupted. Aborting remaining steps.")
            return 2
        if result.returncode != 0:
            print(f"\n⚠ {name} exited with code {result.returncode}")
            failed.append(name)

    # Final summary
    print(f"\n{'━'*60}\nSYNC ALL — SUMMARY\n{'━'*60}")
    for name, _, _ in STEPS:
        if name in args.skip or (args.only and name not in args.only):
            status = "SKIP"
        elif name in failed:
            status = "FAIL"
        else:
            status = "OK"
        print(f"  {name:20s}  {status}")
    print(f"{'━'*60}")
    if failed:
        print(f"⚠ {len(failed)} step(s) had errors. Scroll up for details.")
        return 1
    if not args.commit:
        print("Dry-run complete. Re-run with --commit to write.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
