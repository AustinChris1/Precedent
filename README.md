# Precedent

**A memory-native underwriter for agent-to-agent commerce.** Agents on Virtuals ACP hire each other blind. Precedent spends its own USDC running mystery-shopper probe jobs against live agents, remembers exactly how each counterparty behaved, and sells experience-backed underwriting decisions — paid in USDC on Base. Its only asset is its memory. Delete the memory and there is no product.

*Sibyl Labs Hackathon 2026 — team Precedent.*

## Critical-path memory calls (for judges — the load-bearing proof)

Every underwriting decision is impossible without Sibyl Memory. The critical path:

| Call | Where | Why the product dies without it |
|---|---|---|
| `get_entity("counterparty", id)` | [precedent/underwriter.py](precedent/underwriter.py) `underwrite()` | No dossier → no risk pricing. Fail-closed to a $5 probe cap. |
| `set_entity("counterparty", ...)` + `write_event(...)` | [precedent/memory.py](precedent/memory.py) `record_incident()` | Probe outcomes are the product's proprietary data; nowhere else stores them. |
| `search_entities(query, category="ruling")` | [precedent/underwriter.py](precedent/underwriter.py) `_apply_precedent()` | Stare decisis, enforced: a harsher prior ruling on a like job overrides today's softer one. Proven by `tests/test_precedent.py`. |
| `get_reference("underwriting_charter")` | [precedent/memory.py](precedent/memory.py) `charter()` | Decay half-life and terms bands live in the REFERENCE tier. |
| `read_events(...)` | [precedent/payments.py](precedent/payments.py) `journal_digest()` | The COLD journal hash anchored on Base — tamper-evident memory. |
| `archive_entity()` + journal snapshot | [precedent/memory.py](precedent/memory.py) `archive_with_snapshot()` / `restore()` | Tier migration. Restoring a dormant counterparty's history is impossible without the journal. |
| `set_reference()` (rewrite) | [precedent/curator.py](precedent/curator.py) `curate()` | Memory rewrites its own underwriting rules from journal evidence. |

**Run the proofs yourself** (< 30 seconds each):

```
python tests/test_deletion.py    # the gate: delete memory, the product dies
python tests/test_curation.py    # dynamic storage: tiers migrate, rules rewrite themselves
python tests/test_precedent.py   # stare decisis: a past ruling binds a later, softer one
```

It records real-shaped incidents in session 1, proves a *fresh* session flips its financial terms from recalled specifics, then deletes `memory.db` and proves the core function breaks.

## Why this is needed (measured, not asserted)

Sampled from the public ACP registry **search** endpoint on 2026-08-24 via 42
queries (`node web/scripts/acp-census.mjs`, reproducible, no credentials needed).
This is a floor, not the full registry:

- **1,303 agents** reachable through search, publishing **3,929 offerings**
- **4.5% carry a `rating` field**; for the rest the registry returns none. That
  means *no rating exposed here* — not *never completed a job*. Success rates do
  exist elsewhere on the Virtuals app.
- every offering declares a deliverable JSON Schema, a requirements schema, and
  an SLA in minutes

That last point is what makes Precedent fair as well as useful: a breach is
never our opinion, it is **the provider failing the contract it published
itself** — wrong shape against its own schema, late against its own SLA, or
invoiced above its own quote. See [offering-spec.ts](web/src/lib/offering-spec.ts).

## Beyond recall: coordination and dynamic storage

Recall alone is table stakes. Two things put Precedent above it, both provable
by `python tests/test_curation.py`:

**Memory is the only coordination channel.** Three roles share no process
state, no queue, no database besides Sibyl Memory: the *probe runner* (TS/ACP)
writes incidents, the *curator* reorganizes storage and rewrites the rules, and
the *underwriter* prices jobs for external callers. The curator changing the charter in
one process changes what the underwriter decides in another — the handoff is
the memory itself.

**Storage reorganizes itself.** Dossiers migrate WARM → ARCHIVE when a
counterparty goes dormant, and are promoted back — with history intact — the
moment it resurfaces. That round trip is not free: `archive_entity()` hides an
entity from `get_entity()`, `list_entities()` and search, so archiving alone
would erase the record rehabilitation depends on. Precedent snapshots each
dossier into the append-only COLD journal before demoting it and keeps a HOT
index of what is archived, making ARCHIVE reversible.

**The charter rewrites itself.** The curator measures the breach rate it has
actually observed and rewrites the REFERENCE charter's baseline trust, stamped
with provenance (`derived_from_incidents`, `observed_breach_rate`). A market
full of bad actors makes Precedent permanently stricter. The rule that prices
tomorrow's job is derived from what memory recorded yesterday — and it survives
into every future session.

```bash
python -m precedent curate
# breach rate 80% over 5 incidents
# baseline trust 50.0 -> 18.0 (rewritten)
# archived 1 · watchlist 4
```

## The console

A Next.js app where every function of the bureau can be exercised end to end:

| Tab | What you can do |
|---|---|
| **Registry** | Search the live Virtuals ACP registry (public, no credentials) and build a costed probe plan |
| **Probe** | Grade any deliverable against a published contract, and write the outcome into memory |
| **Underwrite** | Ask for terms and see the recalled incidents that justify them |
| **Bureau** | Run curation, watch the charter rewrite itself, read dossiers, see the watchlist |
| **Journal** | Read the append-only COLD journal and compute the Base anchor digest |

```bash
# 1. memory engine (Python)
uvicorn precedent.server:app --port 8787
# 2. web app (TypeScript)
cd web && pnpm install && pnpm dev
```

The app talks to the engine through `/api/engine/*`, so the engine's API key never
reaches the browser.

### The mark

**The Recall Loop** — a citation bracket pair holds the blue seal of a ruling, encircled
by an arrow that turns back on itself: what was written down returns to decide the
next case. Drawn as inline SVG in [Logo.tsx](web/src/components/Logo.tsx), so it
inherits the palette and stays legible in monochrome and at favicon size.

## Tier usage

- **HOT** — active engagements and watchlist (`set_state`/`get_state`)
- **WARM** — one dossier entity per counterparty agent
- **COLD** — append-only incident + ruling journal, hashed and anchored on Base
- **REFERENCE** — the underwriting charter (decay half-life, terms bands, probe cap)
- **ARCHIVE** — rehabilitated/dormant counterparties (`archive_entity`)
- **FTS5** — precedent retrieval across rulings

**Rehabilitation, precisely.** Incidents decay with a 45-day half-life, so recent
conduct outweighs old breaches — but a prior ruling keeps governing until *new
evidence* arrives. An agent earns its way back by delivering, not by waiting out
the clock. Both halves are proven in `tests/test_precedent.py`.

## Partner stacks — status, honestly

Nothing here is claimed as done until there is a transaction or job id a judge can
open. Current state as of 2026-08-24:

| Stack | Shipped now | Planned in the build window (Sep 1–10) |
|---|---|---|
| **Virtuals ACP** | Live registry read — target selection and costing against real agents and their published contracts ([registry.ts](web/src/lib/registry.ts), [offering-spec.ts](web/src/lib/offering-spec.ts)) | Paid probe jobs with real job ids; Precedent listed as a provider with `underwrite` and `evaluate` offerings |
| **Base** | Deterministic journal digest computed ([payments.py](precedent/payments.py) `journal_digest()`) | The digest posted on-chain, and one USDC settlement for an underwriting query |
| **Sibyl Memory** | The entire product. Mandatory, load-bearing, and never a bonus stack. | — |

## Prior work

Reputation surfaces already exist in this market. Precedent is not the first thing
to look at ACP agents, and pretending otherwise would be worse than useless:

- **ACP leaderboards / success rate / aGDP** — volume and completion counts
- **Virtuals Graduation Evaluator** — one-shot QA to get a listing
- **The per-job ACP Evaluator role** — approve/reject before escrow releases
- **Third-party indexes** (e.g. RNWY, Maiat) — job counts and trust scores

*Each of these must be opened and checked before submission; entries here are
placeholders until verified first-hand.*

**The wedge:** none of them mystery-shops an agent against the contract it
published itself, keeps that record longitudinally, or answers with **terms**
rather than a score. A completion percentage cannot tell you that this provider
returns prose where its own schema declares an object.

## How memory made this possible

Not "we added memory to an app" — the memory *is* the app:

- **Underwriting is recall.** `underwrite()` opens with `get_entity()`. No dossier,
  no price: it fails closed at a $5 probe cap rather than guessing.
- **Evidence has nowhere else to live.** Probe outcomes are proprietary; they exist
  only because Sibyl Memory persists them across sessions and processes.
- **The rules are stored, not coded.** The charter lives in the REFERENCE tier and is
  rewritten from journal evidence, so the system's behaviour changes without a deploy.
- **Rehabilitation needs the journal.** ARCHIVE hides an entity from every read API,
  so a dormant counterparty's history survives only because it was snapshotted into
  the append-only journal first.
- **Precedent needs FTS.** A prior ruling binds a later decision only because past
  rulings are searchable and comparable.

## Architecture

- **`precedent/` (Python)** — the memory engine, and nothing else. Python only because `sibyl-memory-client` is Python-only (no TS SDK exists). A small FastAPI service; the SQLite file on disk **is** the product.
- **`web/` (TypeScript, Next.js 16 + pnpm)** — everything else: UI, Virtuals ACP integration via `@virtuals-protocol/acp-node-v2` (probe jobs + service listing), Base via viem (USDC settlement + journal anchoring). Talks to the engine over HTTP with `X-API-Key`.

The engine needs a persistent disk (its memory is a file, so serverless would erase it); the Next.js app deploys to Vercel.

## Credentials

Nothing in the console as it stands needs a key — the registry read is a public
endpoint and Sibyl Memory's free tier is local. Placing ACP jobs and posting to
Base do need credentials; **[SETUP.md](SETUP.md)** covers where each one comes
from, which are secret, and where they go. Template: [web/.env.example](web/.env.example).

## Quickstart

```bash
# engine
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
uvicorn precedent.server:app --port 8787

# web
cd web && pnpm install && pnpm dev
```

CLI equivalents, useful for the demo:

```bash
python -m precedent grade agent-b --outcome malformed --note "40% corrupted rows"
python -m precedent underwrite agent-b --amount 1000 --job "3-part data pipeline"
python -m precedent report agent-b
```

License: MIT
