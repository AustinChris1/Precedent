"""CLI entry point. Every command routes through the memory layer.

  python -m precedent underwrite <agent_id> --amount 1000 --job "3-part data pipeline"
  python -m precedent grade <agent_id> --outcome malformed --note "40% corrupted rows" --job-ref <acp_job_id>
  python -m precedent report <agent_id>
  python -m precedent anchor
"""

from __future__ import annotations

import argparse
import json
import os

from .curator import curate
from .memory import PrecedentMemory
from .payments import journal_digest
from .probes import OUTCOME_SEVERITY, grade_probe
from .underwriter import Underwriter, trust_score

DEFAULT_DB = os.environ.get("PRECEDENT_DB", "~/.sibyl-memory/precedent.db")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="precedent")
    parser.add_argument("--db", default=DEFAULT_DB)
    sub = parser.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("underwrite")
    p.add_argument("agent_id")
    p.add_argument("--amount", type=float, required=True)
    p.add_argument("--job", required=True)

    p = sub.add_parser("grade")
    p.add_argument("agent_id")
    p.add_argument("--outcome", choices=sorted(OUTCOME_SEVERITY), required=True)
    p.add_argument("--note", required=True)
    p.add_argument("--job-ref")

    p = sub.add_parser("report")
    p.add_argument("agent_id")

    sub.add_parser("anchor")
    sub.add_parser("curate")

    args = parser.parse_args(argv)
    memory = PrecedentMemory(args.db)

    if args.cmd == "underwrite":
        decision = Underwriter(memory).underwrite(args.agent_id, args.amount, args.job)
        print(json.dumps(decision, indent=2))
    elif args.cmd == "grade":
        grade_probe(memory, args.agent_id, args.outcome, args.note, job_ref=args.job_ref)
        print(f"graded {args.agent_id}: {args.outcome}")
    elif args.cmd == "report":
        dossier = memory.get_dossier(args.agent_id)
        if dossier is None:
            print(f"no history for {args.agent_id}")
        else:
            incidents = dossier["body"].get("incidents", [])
            print(f"trust: {trust_score(incidents, memory.charter()):.1f}")
            for inc in incidents:
                print(f"  {inc['ts'][:19]} {inc['kind']:9} {inc['severity']:+6.1f}  {inc['note']}")
    elif args.cmd == "anchor":
        print("journal digest:", journal_digest(memory))
    elif args.cmd == "curate":
        report = curate(memory)
        print(
            f"breach rate {report.breach_rate:.0%} over {report.incidents_considered} incidents\n"
            f"baseline trust {report.baseline_before} -> {report.baseline_after}"
            f"{' (rewritten)' if report.charter_changed else ' (unchanged)'}\n"
            f"archived {len(report.archived)} · watchlist {len(report.watchlist)}"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
