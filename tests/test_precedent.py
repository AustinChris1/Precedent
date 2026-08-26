"""Stare decisis, and its limits.

Two rules must hold together, or the product tells two stories:

  1. a harsher ruling on a like job GOVERNS a later, softer decision
  2. it is DISTINGUISHED the moment new evidence arrives

In one line: **time alone never rehabilitates; delivering does.** Waiting out the
decay curve must not quietly upgrade a counterparty's terms, but clean deliveries
must be able to — otherwise the decay curve and the ruling contradict each other.
"""

from __future__ import annotations

import os
import sys
import tempfile
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from precedent.memory import PrecedentMemory
from precedent.probes import grade_probe
from precedent.underwriter import Underwriter, similar_jobs

JOB = "image generation pipeline"


def _days_ago(days: float) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


def _two_old_ghostings(m: PrecedentMemory, agent: str) -> None:
    """Breaches old enough that decay alone would have softened the score."""
    grade_probe(m, agent, "ghosted", "took payment, never delivered", ts=_days_ago(300))
    grade_probe(m, agent, "ghosted", "vanished again on a retry", ts=_days_ago(290))


def _seed_ruling(m: PrecedentMemory, agent: str, job: str, band: str, incident_count: int) -> None:
    """A ruling as it was written back when those breaches were fresh."""
    m.record_ruling(
        agent,
        job,
        {
            "band": band,
            "incident_count": incident_count,
            "upfront_pct": 0,
            "collateral_pct": 25,
            "penalty_x": 1.5,
        },
    )


def test_time_alone_does_not_rehabilitate():
    """Decayed breaches + no new evidence → the old ruling still governs."""
    with tempfile.TemporaryDirectory() as tmp:
        db = os.path.join(tmp, "memory.db")
        m = PrecedentMemory(db)
        _two_old_ghostings(m, "agent-x")
        _seed_ruling(m, "agent-x", JOB, "refuse", incident_count=2)
        m.close()

        m2 = PrecedentMemory(db)
        decision = Underwriter(m2).underwrite("agent-x", 1000.0, JOB)

        # the raw score has healed with age, but nothing was actually delivered
        assert decision["trust"] is not None and decision["trust"] > 40, decision
        assert decision["decision"] == "refuse", decision
        assert decision.get("precedents"), "the standing ruling was not cited"
        assert any("bound by precedent" in b for b in decision["basis"]), decision["basis"]
        m2.close()


def test_new_evidence_distinguishes_the_ruling_so_rehabilitation_is_real():
    """The same agent, but it actually delivered → the old ruling no longer binds."""
    with tempfile.TemporaryDirectory() as tmp:
        db = os.path.join(tmp, "memory.db")
        m = PrecedentMemory(db)
        _two_old_ghostings(m, "agent-y")
        _seed_ruling(m, "agent-y", JOB, "refuse", incident_count=2)
        for i in range(6):
            grade_probe(m, "agent-y", "delivered", f"clean delivery {i}")
        m.close()

        m2 = PrecedentMemory(db)
        decision = Underwriter(m2).underwrite("agent-y", 1000.0, JOB)
        assert decision["decision"] != "refuse", decision
        assert not decision.get("precedents"), "a superseded ruling must not bind"
        m2.close()


def test_precedent_only_binds_the_agent_it_was_about():
    with tempfile.TemporaryDirectory() as tmp:
        db = os.path.join(tmp, "memory.db")
        m = PrecedentMemory(db)

        _two_old_ghostings(m, "agent-bad")
        _seed_ruling(m, "agent-bad", "data cleaning job", "refuse", incident_count=2)

        for i in range(4):
            grade_probe(m, "agent-good", "delivered", f"clean {i}")
        good = Underwriter(m).underwrite("agent-good", 500.0, "data cleaning job")

        assert good["decision"] != "refuse", good
        assert not good.get("precedents"), "a stranger's ruling must not bind"
        m.close()


def test_being_unknown_is_not_a_ruling():
    """`probe_first` means unknown, not bad — it must never cap a later decision."""
    with tempfile.TemporaryDirectory() as tmp:
        db = os.path.join(tmp, "memory.db")
        m = PrecedentMemory(db)

        for i in range(5):
            grade_probe(m, "agent-z", "delivered", f"clean {i}")
        # a ruling from when this agent was a total stranger, facts unchanged since
        _seed_ruling(m, "agent-z", "market data lookup", "probe_first", incident_count=5)

        later = Underwriter(m).underwrite("agent-z", 1000.0, "market data lookup")
        assert later["decision"] == "standard", later
        assert not later.get("precedents"), "being unknown once must not bind forever"
        m.close()


def test_a_paraphrase_of_the_same_job_still_binds():
    """FTS on free text is not a taxonomy; wording must not decide the outcome."""
    assert similar_jobs("3-part data pipeline", "a data pipeline in 3 parts")
    assert similar_jobs(JOB, "pipeline for image generation")
    assert not similar_jobs(JOB, "quarterly tax filing")

    with tempfile.TemporaryDirectory() as tmp:
        db = os.path.join(tmp, "memory.db")
        m = PrecedentMemory(db)
        _two_old_ghostings(m, "agent-p")
        _seed_ruling(m, "agent-p", JOB, "refuse", incident_count=2)
        m.close()

        m2 = PrecedentMemory(db)
        reworded = Underwriter(m2).underwrite("agent-p", 900.0, "pipeline for image generation")
        assert reworded["decision"] == "refuse", reworded
        assert reworded.get("precedents"), "a reworded job dodged the binding ruling"
        m2.close()


def test_an_unrelated_job_is_not_bound():
    with tempfile.TemporaryDirectory() as tmp:
        db = os.path.join(tmp, "memory.db")
        m = PrecedentMemory(db)
        _two_old_ghostings(m, "agent-q")
        _seed_ruling(m, "agent-q", JOB, "refuse", incident_count=2)
        m.close()

        m2 = PrecedentMemory(db)
        other = Underwriter(m2).underwrite("agent-q", 900.0, "quarterly tax filing")
        assert other["decision"] != "refuse", other
        assert not other.get("precedents"), "an unrelated case must not bind"
        m2.close()


if __name__ == "__main__":
    test_time_alone_does_not_rehabilitate()
    test_new_evidence_distinguishes_the_ruling_so_rehabilitation_is_real()
    test_precedent_only_binds_the_agent_it_was_about()
    test_being_unknown_is_not_a_ruling()
    test_a_paraphrase_of_the_same_job_still_binds()
    test_an_unrelated_job_is_not_bound()
    print("stare decisis proof passed: rulings bind while facts stand; new evidence frees them")
