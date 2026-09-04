"""The read receipt must report what actually happened, not a script."""

from __future__ import annotations

import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from precedent.memory import PrecedentMemory
from precedent.probes import grade_probe
from precedent.trace import READS, WRITES
from precedent.underwriter import Underwriter

AGENT = "0xtrace0000000000000000000000000000000001"
JOB = "3-part data pipeline"


def find(entries, op, target):
    return next((e for e in entries if e["op"] == op and e["target"] == target), None)


def main() -> None:
    db = os.path.join(tempfile.mkdtemp(), "trace.db")
    memory = PrecedentMemory(db)
    underwriter = Underwriter(memory)

    memory.start_trace()
    underwriter.underwrite(AGENT, 1000, JOB)
    stranger = memory.collect_trace()

    assert stranger, "underwriting must record at least one tier access"
    for entry in stranger:
        assert entry["op"] in {**READS, **WRITES}, f"untracked op leaked: {entry['op']}"

    # the miss is the whole reason a stranger gets probed rather than priced
    lookup = find(stranger, "get_entity", f"counterparty/{AGENT}")
    assert lookup is not None, "the dossier lookup was not recorded"
    assert lookup["hit"] is False, "an unknown counterparty must report a miss"
    assert find(stranger, "get_reference", "underwriting_charter") is not None

    grade_probe(memory, AGENT, "ghosted", "no deliverable after 40 min")

    memory.start_trace()
    decision = underwriter.underwrite(AGENT, 1000, JOB)
    known = memory.collect_trace()

    lookup = find(known, "get_entity", f"counterparty/{AGENT}")
    assert lookup is not None and lookup["hit"] is True, "the recorded dossier must read as a hit"
    assert decision["decision"] != "probe_first"

    # the trace is scoped to one request, not a growing global log
    assert stranger[0]["seq"] == 0 and known[0]["seq"] == 0

    memory.close()
    print("read-receipt proof passed: the trace reports real hits, misses and tiers")


if __name__ == "__main__":
    main()
