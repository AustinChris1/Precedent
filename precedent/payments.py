"""Base integration (verified stack #1)."""

from __future__ import annotations

import hashlib
import json

from .memory import PrecedentMemory


def journal_digest(memory: PrecedentMemory, limit: int = 1000) -> str:
    events = memory.client.read_events(limit=limit)
    canonical = json.dumps(events, sort_keys=True, default=str).encode()
    return "0x" + hashlib.sha256(canonical).hexdigest()
