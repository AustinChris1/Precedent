"""A read receipt for memory: every tier access, recorded as it happens."""

from __future__ import annotations

import time
from typing import Any

# op -> (tier, what the call is asking for)
READS: dict[str, tuple[str, str]] = {
    "get_state": ("HOT", "read session state"),
    "get_entity": ("WARM", "open a dossier"),
    "list_entities": ("WARM", "list a category"),
    "search_entities": ("WARM/FTS5", "full-text search for precedent"),
    "read_events": ("COLD", "scan the journal"),
    "get_reference": ("REFERENCE", "load the charter"),
}

WRITES: dict[str, tuple[str, str]] = {
    "set_state": ("HOT", "write session state"),
    "set_entity": ("WARM", "save a dossier"),
    "write_event": ("COLD", "append to the journal"),
    "set_reference": ("REFERENCE", "rewrite the charter"),
    "archive_entity": ("ARCHIVE", "demote a dossier"),
}

TRACED = {**READS, **WRITES}


def _target(op: str, args: tuple[Any, ...], kwargs: dict[str, Any]) -> str:
    """A short, honest label for what this call touched."""
    if op in ("get_entity", "set_entity", "archive_entity"):
        category = args[0] if args else kwargs.get("category", "?")
        name = args[1] if len(args) > 1 else kwargs.get("name", "?")
        return f"{category}/{name}"
    if op == "list_entities":
        return str(args[0] if args else kwargs.get("category", "?"))
    if op == "search_entities":
        query = str(args[0] if args else kwargs.get("query", ""))
        category = kwargs.get("category")
        return f'"{query}"' + (f" in {category}" if category else "")
    if op == "read_events":
        return f"last {kwargs.get('limit', args[0] if args else '?')}"
    if op == "write_event":
        return "1 entry"
    if args:
        return str(args[0])
    return "-"


def _outcome(result: Any) -> tuple[bool, int | None]:
    """Did the read find anything, and how much."""
    if isinstance(result, list):
        return bool(result), len(result)
    return result is not None, None


class TracingClient:
    """Delegates to a MemoryClient, recording each tier access so it can be shown, not claimed."""

    def __init__(self, client: Any) -> None:
        self._client = client
        self._entries: list[dict[str, Any]] = []
        self._recording = False

    def start(self) -> None:
        self._entries = []
        self._recording = True

    def collect(self) -> list[dict[str, Any]]:
        self._recording = False
        return list(self._entries)

    def __getattr__(self, name: str) -> Any:
        attr = getattr(self._client, name)
        if name not in TRACED or not callable(attr):
            return attr
        tier, intent = TRACED[name]

        def traced(*args: Any, **kwargs: Any) -> Any:
            started = time.perf_counter()
            try:
                result = attr(*args, **kwargs)
            except Exception:
                # a miss is evidence too: the dossier that was looked for and not found
                self._record(name, tier, intent, args, kwargs, started, hit=False, count=None)
                raise
            hit, count = _outcome(result)
            self._record(name, tier, intent, args, kwargs, started, hit=hit, count=count)
            return result

        return traced

    def _record(
        self,
        op: str,
        tier: str,
        intent: str,
        args: tuple[Any, ...],
        kwargs: dict[str, Any],
        started: float,
        *,
        hit: bool,
        count: int | None,
    ) -> None:
        if not self._recording:
            return
        self._entries.append(
            {
                "seq": len(self._entries),
                "op": op,
                "tier": tier,
                "intent": intent,
                "mode": "read" if op in READS else "write",
                "target": _target(op, args, kwargs),
                "hit": hit,
                "count": count,
                "ms": round((time.perf_counter() - started) * 1000, 2),
            }
        )
