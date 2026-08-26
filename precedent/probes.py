"""Mystery-shopper probes: Precedent spends its own USDC to build memory.

A probe is a small real job placed with a live agent on Virtuals ACP. The
outcome (delivered / late / malformed / ghosted) is graded and written to the
counterparty's dossier. Probes are the reason Precedent's memory is proprietary
experiential data rather than scraped reputation.

Probe jobs are placed by the TypeScript side (web/, Virtuals ACP node SDK),
which reports outcomes here via POST /grade. grade_probe() is the single write
path for probe results.
"""

from __future__ import annotations

from typing import Any

from .memory import PrecedentMemory, utcnow_iso

# severity grading for probe outcomes; negative = breach, positive = earned trust
OUTCOME_SEVERITY = {
    "delivered": +8.0,
    "delivered_late": +2.0,
    "malformed": -15.0,
    "partial": -10.0,
    "ghosted": -25.0,
    "price_drift": -12.0,
}


def grade_probe(
    memory: PrecedentMemory,
    agent_id: str,
    outcome: str,
    note: str,
    job_ref: str | None = None,
    ts: str | None = None,
) -> dict[str, Any]:
    if outcome not in OUTCOME_SEVERITY:
        raise ValueError(f"unknown outcome {outcome!r}; expected one of {sorted(OUTCOME_SEVERITY)}")
    severity = OUTCOME_SEVERITY[outcome]
    kind = "delivery" if severity > 0 else "breach"
    saved = memory.record_incident(
        agent_id, kind, severity, f"probe:{outcome} — {note}", job_ref=job_ref, ts=ts or utcnow_iso()
    )
    memory.client.write_event(
        acted=[f"probe graded {outcome} for {agent_id}"],
        forward=[f"re-underwrite {agent_id} on next request"],
    )
    return saved
