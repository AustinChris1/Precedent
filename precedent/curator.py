"""Dynamic storage: memory that reorganizes itself and rewrites its own rules.

Recall alone is table stakes. The curator is what moves Precedent past it:

1. **Tier lifecycle.** Counterparties migrate WARM <-> ARCHIVE on their own
   behavior. Go quiet for a month and your dossier is archived off the hot
   path; show up again and it is restored with its history intact.

2. **Self-rewriting charter.** The curator reads the COLD journal, measures the
   breach rate Precedent has actually observed, and rewrites the REFERENCE
   charter accordingly. When the market turns out to be full of bad actors, an
   unknown counterparty gets less benefit of the doubt — automatically, and
   persistently. The rule that prices tomorrow's job is derived from what
   memory recorded yesterday.

3. **Recomputed watchlist** in HOT, so a fresh session knows who is on
   probation without scanning anything.

Every curation run is journaled with its provenance, so a decision can be
traced back to the evidence that shaped the rule that produced it.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from .memory import COUNTERPARTY, PrecedentMemory, utcnow_iso
from .underwriter import trust_score

DORMANT_AFTER_DAYS = 30
WATCHLIST_TRUST_CEILING = 40.0
#: Floor/ceiling for the learned baseline. A stranger is never fully trusted,
#: and never condemned purely for being a stranger.
BASELINE_MIN = 10.0
BASELINE_MAX = 50.0


@dataclass
class CurationReport:
    archived: list[str] = field(default_factory=list)
    restored: list[str] = field(default_factory=list)
    watchlist: list[str] = field(default_factory=list)
    baseline_before: float = 0.0
    baseline_after: float = 0.0
    breach_rate: float = 0.0
    incidents_considered: int = 0

    @property
    def charter_changed(self) -> bool:
        return abs(self.baseline_after - self.baseline_before) >= 0.5


def _age_days(ts_iso: str, now: datetime) -> float:
    ts = datetime.fromisoformat(ts_iso)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return max((now - ts).total_seconds() / 86400.0, 0.0)


def observed_breach_rate(memory: PrecedentMemory) -> tuple[float, int]:
    """Share of all recorded probe outcomes that were breaches."""
    breaches = 0
    total = 0
    for row in memory.client.list_entities(COUNTERPARTY, limit=1000):
        entity = memory.get_dossier(row["name"])
        if entity is None:
            continue
        for inc in entity["body"].get("incidents", []):
            total += 1
            if float(inc["severity"]) < 0:
                breaches += 1
    return (breaches / total if total else 0.0), total


def curate(memory: PrecedentMemory, now: datetime | None = None) -> CurationReport:
    now = now or datetime.now(timezone.utc)
    charter = memory.charter()
    report = CurationReport(baseline_before=float(charter["baseline_trust"]))

    # --- 1. tier lifecycle -------------------------------------------------
    # list_entities() only ever returns live rows: archived ones are hidden from
    # it, from get_entity() and from search. So demotion walks the live set, and
    # promotion is driven by memory.record_incident(), which restores a
    # counterparty from its journal snapshot the moment it resurfaces.
    for row in memory.client.list_entities(COUNTERPARTY, limit=1000):
        name = row["name"]
        entity = memory.get_dossier(name)
        if entity is None:
            continue
        last_seen = entity["body"].get("last_seen")
        if not last_seen:
            continue
        if _age_days(last_seen, now) > DORMANT_AFTER_DAYS:
            if memory.archive_with_snapshot(name, reason=f"dormant >{DORMANT_AFTER_DAYS}d"):
                report.archived.append(name)

    # --- 2. charter rewrites itself from journal evidence -------------------
    rate, considered = observed_breach_rate(memory)
    report.breach_rate = rate
    report.incidents_considered = considered
    learned_baseline = BASELINE_MAX - (BASELINE_MAX - BASELINE_MIN) * rate
    learned_baseline = round(max(BASELINE_MIN, min(BASELINE_MAX, learned_baseline)), 1)
    report.baseline_after = learned_baseline

    if report.charter_changed:
        updated = dict(charter)
        updated["baseline_trust"] = learned_baseline
        updated["provenance"] = {
            "derived_from_incidents": considered,
            "observed_breach_rate": round(rate, 3),
            "updated_at": utcnow_iso(),
        }
        memory.set_charter(updated)

    # --- 3. watchlist into HOT ---------------------------------------------
    watch: list[str] = []
    for row in memory.client.list_entities(COUNTERPARTY, limit=1000):
        entity = memory.get_dossier(row["name"])
        if entity is None:
            continue
        score = trust_score(entity["body"].get("incidents", []), memory.charter())
        if score < WATCHLIST_TRUST_CEILING:
            watch.append(row["name"])
    report.watchlist = watch
    memory.client.set_state("watchlist", {"agents": watch, "updated_at": utcnow_iso()})

    memory.client.write_event(
        evaluated=[
            f"curation: breach_rate={rate:.2f} over {considered} incidents; "
            f"baseline {report.baseline_before}->{report.baseline_after}"
        ],
        acted=[
            f"archived {len(report.archived)}, restored {len(report.restored)}, "
            f"watchlist {len(watch)}"
        ],
        forward=["apply revised baseline to unknown counterparties"],
        extra={
            "archived": report.archived,
            "restored": report.restored,
            "watchlist": watch,
            "baseline_after": report.baseline_after,
        },
    )
    return report


def watchlist(memory: PrecedentMemory) -> list[str]:
    """Read by a fresh session before it quotes anyone — no scanning required."""
    state = memory.client.get_state("watchlist")
    if not state:
        return []
    return state.get("body", state).get("agents", [])
