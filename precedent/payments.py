"""Base integration (verified stack #1).

Two on-chain actions, both shown live in the demo:
  1. USDC settlement for underwriting queries (a plain USDC transfer per report;
     x402 only if a real 402 flow ships, never as a label)
  2. journal anchoring — a hash of the COLD journal is posted to Base after
     each ruling, so any counterparty can verify Precedent has not rewritten
     history. This is what makes the bureau's memory *credible*, not decorative.

journal_digest() computes the deterministic hash here; the TypeScript side
(web/, viem) reads it from GET /anchor and submits the Base transaction.
"""

from __future__ import annotations

import hashlib
import json

from .memory import PrecedentMemory


def journal_digest(memory: PrecedentMemory, limit: int = 1000) -> str:
    events = memory.client.read_events(limit=limit)
    canonical = json.dumps(events, sort_keys=True, default=str).encode()
    return "0x" + hashlib.sha256(canonical).hexdigest()
