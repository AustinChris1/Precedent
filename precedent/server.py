"""HTTP wrapper around the memory engine, the only Python you host."""

from __future__ import annotations

import os
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

from .curator import curate, watchlist
from .memory import COUNTERPARTY, PrecedentMemory
from .payments import journal_digest
from .probes import OUTCOME_SEVERITY, grade_probe
from .underwriter import Underwriter, trust_score

app = FastAPI(title="Precedent memory engine", version="0.1.0")

_memory: PrecedentMemory | None = None


def memory() -> PrecedentMemory:
    global _memory
    if _memory is None:
        _memory = PrecedentMemory(os.environ.get("PRECEDENT_DB", "~/.sibyl-memory/precedent.db"))
    return _memory


def check_key(x_api_key: str | None) -> None:
    expected = os.environ.get("PRECEDENT_API_KEY")
    if expected and x_api_key != expected:
        raise HTTPException(status_code=401, detail="bad api key")


class UnderwriteReq(BaseModel):
    agent_id: str
    amount_usdc: float
    job_description: str


class GradeReq(BaseModel):
    agent_id: str
    outcome: str  # one of probes.OUTCOME_SEVERITY
    note: str
    job_ref: str | None = None  # ACP job id / Base tx hash
    # Only the probe runner may attach a job reference.
    source: str = "manual"


@app.get("/health")


def health() -> dict[str, Any]:
    return {"ok": True, "outcomes": sorted(OUTCOME_SEVERITY)}


@app.post("/underwrite")


def underwrite(req: UnderwriteReq, x_api_key: str | None = Header(default=None)) -> dict[str, Any]:
    check_key(x_api_key)
    mem = memory()
    # record the tier accesses so the answer can show its reads, not just assert them
    mem.start_trace()
    decision = Underwriter(mem).underwrite(req.agent_id, req.amount_usdc, req.job_description)
    return {**decision, "memory_reads": mem.collect_trace()}


@app.post("/grade")


def grade(req: GradeReq, x_api_key: str | None = Header(default=None)) -> dict[str, Any]:
    check_key(x_api_key)
    if req.outcome not in OUTCOME_SEVERITY:
        raise HTTPException(status_code=422, detail=f"outcome must be one of {sorted(OUTCOME_SEVERITY)}")

    job_ref = req.job_ref if req.source == "probe_runner" else None
    note = req.note if req.source == "probe_runner" else f"[manual entry] {req.note}"
    grade_probe(memory(), req.agent_id, req.outcome, note, job_ref=job_ref)
    return {"graded": req.agent_id, "outcome": req.outcome, "job_ref": job_ref}


@app.get("/dossier/{agent_id}")


def dossier(agent_id: str, x_api_key: str | None = Header(default=None)) -> dict[str, Any]:
    check_key(x_api_key)
    d = memory().get_dossier(agent_id)
    if d is None:
        return {"agent_id": agent_id, "history": False}
    incidents = d["body"].get("incidents", [])
    return {
        "agent_id": agent_id,
        "history": True,
        "trust": round(trust_score(incidents, memory().charter()), 1),
        "incidents": incidents,
    }


@app.get("/anchor")


def anchor(x_api_key: str | None = Header(default=None)) -> dict[str, Any]:
    check_key(x_api_key)
    return {"journal_digest": journal_digest(memory())}


@app.post("/curate")


def run_curation(x_api_key: str | None = Header(default=None)) -> dict[str, Any]:
    """Dynamic storage: migrate tiers, rewrite the charter, recompute the watchlist."""
    check_key(x_api_key)
    report = curate(memory())
    return {
        "archived": report.archived,
        "restored": report.restored,
        "watchlist": report.watchlist,
        "baseline_before": report.baseline_before,
        "baseline_after": report.baseline_after,
        "charter_changed": report.charter_changed,
        "breach_rate": report.breach_rate,
        "incidents_considered": report.incidents_considered,
    }


@app.get("/watchlist")


def get_watchlist(x_api_key: str | None = Header(default=None)) -> dict[str, Any]:
    check_key(x_api_key)
    return {"agents": watchlist(memory())}


@app.get("/charter")


def get_charter(x_api_key: str | None = Header(default=None)) -> dict[str, Any]:
    check_key(x_api_key)
    return memory().charter()


@app.get("/journal")


def get_journal(limit: int = 25, x_api_key: str | None = Header(default=None)) -> dict[str, Any]:
    check_key(x_api_key)
    events = memory().client.read_events(limit=limit)
    return {"events": list(reversed(events))}


@app.get("/agents")


def list_agents(x_api_key: str | None = Header(default=None)) -> dict[str, Any]:
    """Live dossiers plus the HOT index of who has been archived."""
    check_key(x_api_key)
    mem = memory()
    charter = mem.charter()
    rows = []
    for row in mem.client.list_entities(COUNTERPARTY, limit=500):
        dossier = mem.get_dossier(row["name"])
        if dossier is None:
            continue
        incidents = dossier["body"].get("incidents", [])
        rows.append(
            {
                "agent_id": row["name"],
                "trust": round(trust_score(incidents, charter), 1),
                "incidents": len(incidents),
                "last_seen": dossier["body"].get("last_seen"),
            }
        )
    rows.sort(key=lambda r: r["trust"])
    return {"agents": rows, "archived": mem.archived_index()}
