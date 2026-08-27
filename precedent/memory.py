"""The load-bearing memory layer."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sibyl_memory_client import MemoryClient, NotFoundError

COUNTERPARTY = "counterparty"
RULING = "ruling"
CHARTER_KEY = "underwriting_charter"
ARCHIVED_INDEX_KEY = "archived_index"
ARCHIVE_SNAPSHOT = "archive_snapshot"

DEFAULT_CHARTER: dict[str, Any] = {
    "decay_half_life_days": 45,
    "baseline_trust": 50,
    "probe_cap_usdc": 5.0,
    "terms_bands": [
        {"min_trust": 70, "band": "standard", "upfront_pct": 50, "collateral_pct": 0, "penalty_x": 1.0},
        {"min_trust": 40, "band": "guarded", "upfront_pct": 0, "collateral_pct": 0, "penalty_x": 1.0},
        {"min_trust": 20, "band": "restricted", "upfront_pct": 0, "collateral_pct": 25, "penalty_x": 1.5},
        {"min_trust": 0, "band": "refuse", "upfront_pct": 0, "collateral_pct": 0, "penalty_x": 0.0},
    ],
}


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class PrecedentMemory:
    def __init__(self, db_path: str = "~/.sibyl-memory/memory.db") -> None:
        self.client = MemoryClient.local(db_path)
        if self.client.get_reference(CHARTER_KEY) is None:
            self.client.set_reference(CHARTER_KEY, DEFAULT_CHARTER)

    def close(self) -> None:
        storage = getattr(self.client, "_storage", None) or getattr(self.client, "storage", None)
        if storage is not None:
            storage.close()

    # REFERENCE
    def charter(self) -> dict[str, Any]:
        ref = self.client.get_reference(CHARTER_KEY)
        if ref is None:
            return DEFAULT_CHARTER
        body = ref.get("body", ref)
        # reference bodies are stored as JSON documents (strings)
        return json.loads(body) if isinstance(body, str) else body

    def set_charter(self, charter: dict[str, Any]) -> None:
        """Rewrite the underwriting rules. Called by the curator, not by hand."""
        self.client.set_reference(CHARTER_KEY, charter)

    # ARCHIVE: reversible cold storage
    # archive_entity() hides an entity from get_entity(), list_entities() and search, so archiving alone would.
    def archived_index(self) -> dict[str, str]:
        state = self.client.get_state(ARCHIVED_INDEX_KEY)
        if not state:
            return {}
        return state.get("body", state).get("agents", {})

    def _write_archived_index(self, index: dict[str, str]) -> None:
        self.client.set_state(ARCHIVED_INDEX_KEY, {"agents": index})

    def archive_with_snapshot(self, agent_id: str, reason: str) -> bool:
        dossier = self.get_dossier(agent_id)
        if dossier is None:
            return False
        self.client.write_event(
            acted=[f"archived counterparty {agent_id}: {reason}"],
            extra={"kind": ARCHIVE_SNAPSHOT, "agent_id": agent_id, "body": dossier["body"]},
        )
        self.client.archive_entity(COUNTERPARTY, agent_id, reason=reason)
        index = self.archived_index()
        index[agent_id] = utcnow_iso()
        self._write_archived_index(index)
        return True

    def _latest_snapshot(self, agent_id: str) -> dict[str, Any] | None:
        for event in reversed(self.client.read_events(limit=1000)):
            extra = event.get("extra") or {}
            if extra.get("kind") == ARCHIVE_SNAPSHOT and extra.get("agent_id") == agent_id:
                return extra.get("body")
        return None

    def restore(self, agent_id: str) -> bool:
        """Bring an archived counterparty back with its history intact."""
        if agent_id not in self.archived_index():
            return False
        body = self._latest_snapshot(agent_id)
        if body is None:
            return False
        self.client.set_entity(COUNTERPARTY, agent_id, body, status="active")
        index = self.archived_index()
        index.pop(agent_id, None)
        self._write_archived_index(index)
        self.client.write_event(acted=[f"restored counterparty {agent_id} from archive"])
        return True

    # WARM: counterparty dossiers
    def get_dossier(self, agent_id: str) -> dict[str, Any] | None:
        try:
            return self.client.get_entity(COUNTERPARTY, agent_id)
        except NotFoundError:
            return None

    def record_incident(
        self,
        agent_id: str,
        kind: str,  # "breach" | "delivery" | "late" | "quality"
        severity: float,  # negative for breaches, positive for good deliveries
        note: str,
        job_ref: str | None = None,  # ACP job id / Base tx hash when available
        ts: str | None = None,
    ) -> dict[str, Any]:
        ts = ts or utcnow_iso()
        # a counterparty that resurfaces is pulled back out of ARCHIVE before the new incident lands, so its past is.
        self.restore(agent_id)
        dossier = self.get_dossier(agent_id)
        incidents = (dossier["body"].get("incidents", []) if dossier else [])
        incidents.append(
            {"ts": ts, "kind": kind, "severity": severity, "note": note, "job_ref": job_ref}
        )
        body = {"incidents": incidents, "last_seen": ts}
        saved = self.client.set_entity(COUNTERPARTY, agent_id, body, status="active")
        # COLD journal: append-only audit trail, searchable by FTS
        self.client.write_event(
            acted=[f"incident {kind} severity={severity} counterparty={agent_id}: {note}"],
            extra={"agent_id": agent_id, "kind": kind, "severity": severity, "job_ref": job_ref},
            ts=ts,
        )
        return saved

    # COLD + FTS: rulings as precedent
    def record_ruling(self, agent_id: str, dispute: str, ruling: dict[str, Any]) -> None:
        name = f"{agent_id}-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')}"
        self.client.set_entity(RULING, name, {"agent_id": agent_id, "dispute": dispute, **ruling})
        self.client.write_event(
            acted=[f"ruling for dispute with {agent_id}: {dispute}"],
            forward=[f"apply precedent {name} to similar disputes"],
        )

    def find_precedents(self, dispute_description: str, limit: int = 5) -> list[dict[str, Any]]:
        return self.client.search_entities(dispute_description, limit=limit, category=RULING)

    def rulings_for(self, agent_id: str, limit: int = 200) -> list[dict[str, Any]]:
        """Every ruling written about one counterparty."""
        rows = []
        for row in self.client.list_entities(RULING, limit=limit):
            if not str(row.get("name", "")).startswith(f"{agent_id}-"):
                continue
            rows.append(row)
        return rows

    # HOT: session state
    def set_active_job(self, job: dict[str, Any]) -> None:
        jobs = self.client.get_state("active_jobs") or {"body": {"jobs": []}}
        current = jobs.get("body", jobs).get("jobs", [])
        current.append(job)
        self.client.set_state("active_jobs", {"jobs": current})

    def active_jobs(self) -> list[dict[str, Any]]:
        state = self.client.get_state("active_jobs")
        if not state:
            return []
        return state.get("body", state).get("jobs", [])

    # ARCHIVE
    def retire(self, agent_id: str, reason: str) -> None:
        self.client.archive_entity(COUNTERPARTY, agent_id, reason=reason)
