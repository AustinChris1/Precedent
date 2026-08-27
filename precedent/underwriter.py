"""Risk scoring with time decay and rehabilitation."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .memory import PrecedentMemory, utcnow_iso


def _age_days(ts_iso: str, now: datetime) -> float:
    ts = datetime.fromisoformat(ts_iso)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return max((now - ts).total_seconds() / 86400.0, 0.0)


def trust_score(incidents: list[dict[str, Any]], charter: dict[str, Any]) -> float:
    now = datetime.now(timezone.utc)
    half_life = float(charter["decay_half_life_days"])
    score = float(charter["baseline_trust"])
    for inc in incidents:
        weight = 0.5 ** (_age_days(inc["ts"], now) / half_life)
        score += float(inc["severity"]) * weight
    return max(0.0, min(100.0, score))

#: Words that carry no job identity, so paraphrases still match.
_STOPWORDS = frozenset(
    "a an and for from in into of on or the to with job task work part parts "
    "please need needs required using via my our your".split()
)

# Share of significant words two job descriptions must have in common to count as the same kind of case.
JOB_MATCH_THRESHOLD = 0.45


def job_tokens(description: str) -> frozenset[str]:
    words = "".join(c.lower() if c.isalnum() else " " for c in description).split()
    return frozenset(w for w in words if w not in _STOPWORDS and len(w) > 2)


def similar_jobs(a: str, b: str) -> bool:
    """Jaccard overlap of significant words, a paraphrase of the same job matches."""
    ta, tb = job_tokens(a), job_tokens(b)
    if not ta or not tb:
        return False
    return len(ta & tb) / len(ta | tb) >= JOB_MATCH_THRESHOLD


def terms_for(score: float, charter: dict[str, Any]) -> dict[str, Any]:
    for band in charter["terms_bands"]:
        if score >= band["min_trust"]:
            return dict(band)
    return dict(charter["terms_bands"][-1])


class Underwriter:
    def __init__(self, memory: PrecedentMemory) -> None:
        self.memory = memory

    def underwrite(self, agent_id: str, amount_usdc: float, job_description: str) -> dict[str, Any]:
        charter = self.memory.charter()
        dossier = self.memory.get_dossier(agent_id)

        if dossier is None:
            decision = {
                "agent_id": agent_id,
                "decision": "probe_first",
                "trust": None,
                "max_amount_usdc": charter["probe_cap_usdc"],
                "reason": "no history on record, unknown counterparties are capped at probe size",
                "basis": [],
            }
        else:
            incidents = dossier["body"].get("incidents", [])
            score = trust_score(incidents, charter)
            band = terms_for(score, charter)
            recent = sorted(incidents, key=lambda i: i["ts"], reverse=True)[:3]
            decision = {
                "agent_id": agent_id,
                "decision": band["band"],
                "trust": round(score, 1),
                "amount_usdc": amount_usdc if band["band"] != "refuse" else 0.0,
                "upfront_pct": band["upfront_pct"],
                "collateral_pct": band["collateral_pct"],
                "penalty_x": band["penalty_x"],
                "basis": [
                    f"{i['ts'][:10]} {i['kind']} ({i['severity']:+.0f}): {i['note']}" for i in recent
                ],
            }

        # stare decisis, with vacatur
        # A harsher ruling on a like job governs this one *while the facts it rested on still stand*.
        incident_count = len(dossier["body"].get("incidents", [])) if dossier else 0
        bound_by = self._apply_precedent(agent_id, job_description, decision, incident_count)

        # every decision is itself a ruling, and becomes precedent for the next
        self.memory.record_ruling(
            agent_id,
            job_description,
            {
                "band": decision["decision"],
                "upfront_pct": decision.get("upfront_pct"),
                "collateral_pct": decision.get("collateral_pct"),
                "penalty_x": decision.get("penalty_x"),
                "trust": decision.get("trust"),
                # the facts this ruling rested on; new evidence distinguishes it
                "incident_count": incident_count,
            },
        )

        self.memory.client.write_event(
            evaluated=[f"underwrote {agent_id} for {amount_usdc} USDC: {decision['decision']}"],
            extra={"decision": decision, "bound_by": bound_by},
            ts=utcnow_iso(),
        )
        return decision

    def _apply_precedent(
        self,
        agent_id: str,
        job_description: str,
        decision: dict[str, Any],
        incident_count: int,
    ) -> str | None:
        """Tighten `decision` to the strictest *still-standing* ruling on a like job."""
        # "probe_first" means unknown, not bad, so it never joins the ratchet
        strictness = {"standard": 0, "guarded": 1, "restricted": 2, "refuse": 3}
        here = strictness.get(decision["decision"], 0)

        binding: dict[str, Any] | None = None
        for row in self._candidate_rulings(agent_id, job_description):
            body = row.get("body") or {}
            if body.get("agent_id") != agent_id:
                continue  # a ruling binds only the counterparty it was about
            if not similar_jobs(job_description, str(body.get("dispute", ""))):
                continue  # different facts, different case
            if incident_count > int(body.get("incident_count", 0)):
                continue  # distinguished: evidence exists that this ruling never saw
            there = strictness.get(str(body.get("band")), 0)
            if there > here:
                here = there
                binding = {"name": row.get("name"), **body}

        if binding is None:
            return None

        decision["decision"] = binding["band"]
        for key in ("upfront_pct", "collateral_pct", "penalty_x"):
            if binding.get(key) is not None:
                decision[key] = binding[key]
        if decision["decision"] == "refuse":
            decision["amount_usdc"] = 0.0
        decision["basis"].append(
            f"bound by precedent {binding['name']}: {binding['band']} on a like job, "
            "and no new evidence since"
        )
        decision["precedents"] = [binding["name"]]
        return binding["name"]

    def _candidate_rulings(self, agent_id: str, job_description: str) -> list[dict[str, Any]]:
        """Rulings that might bind: FTS hits, plus this agent's own rulings."""
        found = {r.get("name"): r for r in self.memory.find_precedents(job_description, limit=20)}
        for row in self.memory.rulings_for(agent_id):
            found.setdefault(row.get("name"), row)
        return [r for r in found.values() if r]
