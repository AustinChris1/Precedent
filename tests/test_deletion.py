"""The gate proof, as a runnable test. Three assertions:

1. cold-start recall — a FRESH process/client recalls incidents recorded by an
   earlier session and the decision materially changes (the decision flip)
2. deletion test — delete memory.db and the same request yields a different,
   fail-closed answer: Precedent cannot price a known-bad agent it no longer
   remembers, so the core claim ("experience-based underwriting") breaks
3. decay/rehabilitation — old breaches weigh less than recent clean deliveries

Run:  python -m pytest tests/ -q   (or plain: python tests/test_deletion.py)
"""

from __future__ import annotations

import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from precedent.memory import PrecedentMemory
from precedent.probes import grade_probe
from precedent.underwriter import Underwriter, trust_score


def _days_ago_iso(days: float) -> str:
    from datetime import datetime, timedelta, timezone

    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


def test_cold_start_decision_flip_and_deletion():
    with tempfile.TemporaryDirectory() as tmp:
        db = os.path.join(tmp, "memory.db")

        # --- session 1: record real probe outcomes -------------------------
        m1 = PrecedentMemory(db)
        grade_probe(m1, "agent-b", "malformed", "40% corrupted rows in milestone 2", ts=_days_ago_iso(3))
        grade_probe(m1, "agent-b", "price_drift", "quoted 500, invoiced 640", ts=_days_ago_iso(2))
        m1.close()  # session ends; nothing survives except memory.db

        # --- session 2: fresh client, cold start ---------------------------
        m2 = PrecedentMemory(db)
        decision = Underwriter(m2).underwrite("agent-b", 1000.0, "3-part data pipeline")
        assert decision["decision"] in ("restricted", "refuse"), decision
        assert decision["upfront_pct"] == 0
        assert any("corrupted" in b for b in decision["basis"])  # recalled specifics
        m2.close()

        # --- the deletion test ---------------------------------------------
        os.remove(db)
        m3 = PrecedentMemory(db)
        blind = Underwriter(m3).underwrite("agent-b", 1000.0, "3-part data pipeline")
        assert blind["decision"] == "probe_first"  # fail-closed: no memory, no underwriting
        assert blind["max_amount_usdc"] <= 5.0
        assert blind != decision  # core function is gone without the memory layer
        m3.close()


def test_decay_rehabilitation():
    charter = {"decay_half_life_days": 14, "baseline_trust": 50}
    old_breach_recent_good = [
        {"ts": _days_ago_iso(60), "severity": -25.0},
        {"ts": _days_ago_iso(2), "severity": +8.0},
        {"ts": _days_ago_iso(1), "severity": +8.0},
    ]
    fresh_breach = [{"ts": _days_ago_iso(1), "severity": -25.0}]
    assert trust_score(old_breach_recent_good, charter) > trust_score(fresh_breach, charter)


if __name__ == "__main__":
    test_cold_start_decision_flip_and_deletion()
    test_decay_rehabilitation()
    print("gate proof passed: cold-start recall flips the decision; deletion breaks the product")
