"""Dynamic-storage proofs: memory that reorganizes itself between sessions.

1. dormant counterparties are demoted out of the hot path (WARM -> ARCHIVE)
2. a counterparty that resurfaces is promoted back WITH its history — the part
   that would silently break, since archived entities are unreadable
3. the REFERENCE charter rewrites itself from journal evidence, and the new
   rule survives into a fresh session and changes what it decides
"""

from __future__ import annotations

import os
import sys
import tempfile
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from precedent.curator import curate, watchlist
from precedent.memory import COUNTERPARTY, PrecedentMemory
from precedent.probes import grade_probe
from precedent.underwriter import Underwriter


def _days_ago(days: float) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


def _live_names(memory: PrecedentMemory) -> list[str]:
    return [r["name"] for r in memory.client.list_entities(COUNTERPARTY, limit=100)]


def test_dormant_is_archived_and_resurfacing_restores_history():
    with tempfile.TemporaryDirectory() as tmp:
        db = os.path.join(tmp, "memory.db")
        m = PrecedentMemory(db)

        grade_probe(m, "agent-old", "malformed", "corrupted output", ts=_days_ago(200))
        grade_probe(m, "agent-old", "ghosted", "never delivered", ts=_days_ago(190))
        grade_probe(m, "agent-live", "delivered", "clean", ts=_days_ago(1))

        report = curate(m)
        assert "agent-old" in report.archived
        assert "agent-live" not in report.archived
        # archived entities are invisible to the live listing
        assert "agent-old" not in _live_names(m)
        assert m.get_dossier("agent-old") is None
        assert "agent-old" in m.archived_index()
        m.close()

        # --- it comes back, in a fresh session --------------------------------
        m2 = PrecedentMemory(db)
        grade_probe(m2, "agent-old", "delivered", "clean job after a long absence")

        dossier = m2.get_dossier("agent-old")
        assert dossier is not None, "resurfacing counterparty was not restored"
        incidents = dossier["body"]["incidents"]
        # the two old breaches survived the archive round-trip
        assert len(incidents) == 3, incidents
        assert any("corrupted output" in i["note"] for i in incidents)
        assert "agent-old" not in m2.archived_index()
        m2.close()


def test_charter_rewrites_itself_and_the_rule_persists():
    with tempfile.TemporaryDirectory() as tmp:
        db = os.path.join(tmp, "memory.db")
        m = PrecedentMemory(db)
        assert m.charter()["baseline_trust"] == 50

        # a market that turns out to be mostly bad actors
        for i in range(4):
            grade_probe(m, f"bad-{i}", "ghosted", "took payment, vanished", ts=_days_ago(1))
        grade_probe(m, "good-1", "delivered", "clean", ts=_days_ago(1))

        report = curate(m)
        assert report.charter_changed
        assert report.breach_rate == 0.8
        assert report.baseline_after < report.baseline_before
        assert "bad-0" in report.watchlist
        m.close()

        # --- fresh session inherits the learned rule --------------------------
        m2 = PrecedentMemory(db)
        charter = m2.charter()
        assert charter["baseline_trust"] == report.baseline_after
        assert charter["provenance"]["derived_from_incidents"] == 5
        # and the watchlist is readable without scanning
        assert "bad-0" in watchlist(m2)

        # the learned rule changes what this session decides
        decision = Underwriter(m2).underwrite("bad-0", 500.0, "data job")
        assert decision["decision"] in ("restricted", "refuse")
        m2.close()


if __name__ == "__main__":
    test_dormant_is_archived_and_resurfacing_restores_history()
    test_charter_rewrites_itself_and_the_rule_persists()
    print("dynamic-storage proofs passed: tiers migrate, and memory rewrites its own rules")
