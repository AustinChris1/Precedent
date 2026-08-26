# Build plan — Sep 1–10 (all dates UTC)

**Now (before Aug 31):** register at hack.sibyllabs.org/register — team "Precedent", both partner boxes checked. This scaffold stays private planning; the *public* repo starts Sep 1 so the commit history genuinely spans the build window (rules require real commit history).

**Standing rule:** every counterparty is an independent agent we do not control, and every probe is a real ACP job. No mocked counterparties anywhere in the demo.

**Rubric target (from the kickoff email + /submissions):** *"Recall alone is table stakes; coordination and dynamic-storage patterns top the band."* Precedent answers both — memory as the only channel between probe runner / curator / underwriter, and storage that migrates tiers and rewrites its own charter. Built and tested (`tests/test_curation.py`). The demo must show the curator changing a rule in one process and a different process deciding differently because of it.

**Note on `learn()` / `lint()`:** the SDK's built-in self-learning and linter are paid-tier only (verified: `TierGateError` on free). Our curator implements dynamic storage directly, so nothing is blocked. Free-tier soft cap is 5MB — ample.

**Probe cost: $0.21 for the whole campaign** — measured, not estimated. `node web/scripts/plan-probes.mjs` selects 15 live agents (5 per category, deduped) and prices 30 jobs at **$0.208 USDC**. Live agents are therefore affordable outright; sandbox is still the first stop on Sep 2 for wiring, but the headline data comes from real counterparties.

**Registry census** (`node web/scripts/acp-census.mjs`, re-run 2026-08-25 with corrected schema detection): **1,306 agents, 3,990 offerings** reachable through registry *search* — a floor, not the whole registry. Median offering price $0.10; 3,190 are ≤$1. Every offering declares a price and an SLA, but **only 993 (25%) publish a real deliverable JSON Schema** — 2,938 put prose there instead ("Detailed review report with issues and fixes"), which is truthy but carries no machine-checkable constraint.

That split drives the grading design: *ghosted*, *late* and *price drift* are provable against any priced offering; *malformed* needs a real schema. So targets are graded **strict** (schema, all five breach types) or **basic** (three of five). Requiring a schema would have discarded three quarters of the market for no gain on the breaches that do not need one.

**4.5% of agents carry a `rating` field** — meaning no rating is exposed at the point of hiring, not that the agent never worked. That is the gap Precedent fills, and it is reproducible rather than asserted.

| Day | Goal |
|---|---|
| **Sep 1** | Public repo init (MIT), port scaffold as first commits. Read kickoff email; set up Sibyl credentials (`sibyl init`) + ACP sandbox agents (buyer + our provider listing). |
| **Sep 2** | Wire ACP consumer side (`@virtuals-protocol/acp-node-v2`) in `web/`; grade outcomes via POST /grade. Place first 3–4 sandbox probe jobs. **Memory age starts today — earliest probes = most impressive recall at judging.** |
| **Sep 3** | Grade first probe outcomes into memory. More probes (different agent categories). First build-in-public post: "I'm hiring agents on ACP and building their credit bureau." |
| **Sep 4** | Base settlement in `web/` (viem): pay-per-query USDC flow + journal-digest anchoring (GET /anchor → tx; single contract or calldata, decide simplest at Base workshop). Deploy engine to VPS. |
| **Sep 5–7** | Partner workshops — validate ACP + Base integrations with partner engineers. Wire ACP provider side: list Precedent as an ACP service. Keep probing daily. |
| **Sep 8** | PMF push: publish probe findings report ("I hired N agents; here's who delivered"). Second required post. Waitlist link (simple form). Freeze features. |
| **Sep 9** | Record demo (2–5 min): problem → live probe → kill terminal on camera → fresh session recalls week-old incident with tx hashes → decision flip → paid on Base → verify journal anchor on Basescan. Deletion test on camera. |
| **Sep 10** | README polish (critical-path table must be findable < 2 min), submission form, buffer. |

## Stack split (decided — TS-first, $0 hosting)

- **`precedent/` (Python, ~done):** the memory engine only — sibyl-memory-client is Python-only (verified: no TS SDK exists on npm). Exposed as a small FastAPI service (`uvicorn precedent.server:app --port 8787`, ~60-80MB RAM). This code is essentially finished; it should barely change during the window.
- **`web/` (TypeScript — where all build-window work happens):** Next.js app with the UI *and* both partner integrations: Virtuals ACP node SDK for probe jobs + service listing, viem for Base USDC settlement + journal anchoring. Server routes call the Python engine over HTTP with X-API-Key.

## The Evaluator slot (highest-value change — verified 2026-08-24)

ACP has a **paid third-party evaluator role built into the protocol**, and Precedent
should occupy it. Verified against the installed SDK, not documentation:

- `AgentRole = "client" | "provider" | "evaluator"` (`events/types.d.ts:85`)
- every job carries an `evaluatorAddress`; `acpAgent.d.ts` documents three lifecycle
  shapes — self-evaluation, **third-party evaluation** (`{evaluatorAddress: <other wallet>}`),
  and skip
- the contract ABI exposes `setEvaluatorFee` / `evaluatorFeeBp`, and Solana has an
  `EvaluatorTokenAccount` — **evaluators are paid, on-chain**

Why this matters more than anything else in the window: as a mystery shopper,
Precedent spends its own money to learn. As an appointed evaluator, **the market pays
it to remember** — every job it evaluates writes an incident, memory gets denser,
underwriting gets better, and the charter learns from real breach rates instead of a
$0.21 sample. It is also the cleanest possible answer to "is the Virtuals integration
doing real work?": the protocol itself pays us for the memory we keep.

Ship it as a **second ACP offering** beside underwriting — do not rebuild the product
around it:

1. list Precedent as an ACP provider with two offerings: `underwrite` and `evaluate`
2. as evaluator, grade the deliverable against the provider's published schema/SLA/quote
   (the grading rule already exists and is tested), then approve or reject
3. write the outcome as an incident with the real ACP job id as `job_ref`

Do not claim the evaluator role in the README until a real job has been evaluated.

## Probe runner: never record what you cannot verify (added 2026-08-26)

The ACP API went down during deployment — returning
`{"message":"searchAgents error Request failed with status code 503"}` wrapped as
a 500, for roughly 40 minutes. It will do this again during Sep 1–10.

**The risk:** a probe that gets no deliverable looks identical to a probe whose
platform was broken. Recording that as `ghosted` (-25) writes a false accusation
into a permanent dossier — and it compounds: the score drops, the decision
becomes a binding ruling, and the observed breach rate rewrites the charter for
every other counterparty. One outage could poison the whole bureau.

**The rule:** before writing ANY breach, confirm ACP was reachable at the moment
of judgement. If the platform errored, record nothing and mark the probe
`inconclusive`. Retry later; an absent outcome is honest, a fabricated one is not.

Concretely for the runner:
- health-check the ACP API immediately before and after each probe window
- `ghosted` requires a successful platform round-trip that returned no deliverable
- log inconclusive probes so the campaign can resume, and so the count is visible
- `web/src/lib/registry.ts` already retries twice and raises
  `RegistryUnavailableError` rather than a bare status — reuse that signal

## Chain choice: Sepolia to build, mainnet for the artifact

Anchoring is a 32-byte hash, not storage — cost was never a reason to prefer
testnet (Base mainnet calldata is a fraction of a cent).

- **Base Sepolia** while wiring viem and debugging the transaction. Free.
- **Base mainnet** for anything a judge opens. A testnet anchor proves little:
  testnets are reset and pruned, so it cannot show the record existed and was
  not rewritten — which is the anchor's only job. The probe wallet is funded on
  mainnet anyway.

**Unverified:** whether the rules accept testnet for the Base multiplier. The
wording is "executed on-chain action". Confirm at the Base workshop (Sep 5–7)
and default to mainnet regardless, since it costs cents.

## Engine bandwidth (measured 2026-08-25)

Not a constraint. JSON only — images, fonts and bundles are all served by Vercel:

| Endpoint | Bytes |
|---|---|
| `/health` | 99 |
| `/underwrite` | 451 |
| `/dossier/{id}` | 621 |
| `/agents` | 1,472 |
| `/journal?limit=40` | 11,375 |

A full console session is ~15KB, so 1,000 visitors is ~20MB and a 10-minute
keep-alive ping costs 0.4MB/month. The VPS is the right home for the engine.

## Hosting ($0 total)

- **Engine → the existing 2GB VPS.** Zero-dependency SDK + SQLite file + uvicorn fits even on a loaded box; bind to 127.0.0.1 and reverse-proxy, set PRECEDENT_API_KEY. Disk persistence is the point — never Vercel serverless for this (ephemeral FS wipes memory.db = wipes the product).
- **Web app → Vercel free tier** (also hosts the waitlist page for PMF).
- **Fallback if the VPS chokes:** engine runs on the laptop with a cloudflared/ngrok free tunnel for the demo — judging is a video + repo, so 24/7 uptime is not required.
- **Total out of pocket: a few dollars.** Sandbox ACP needs no gas; the only unavoidable cost is Base gas (cents) for anchoring the journal digest, plus ~$2 sandbox USDC.

## Package manager

pnpm (`web/`). `pnpm install`, `pnpm dev`, `pnpm build`. Node v25, Next 16, React 19, Tailwind 4.

## Cut list (do not build)

Dashboards beyond one page, interactive simulators, per-job contract deployment, multi-chain anything, token anything.

## Claims audit (do not ship an unclickable claim)

A judge who clicks is the whole risk. Fixed 2026-08-24 after an external critique:

- **stare decisis** — was decorative (`record_ruling()` never called). Now enforced in
  `_apply_precedent()`: a harsher prior ruling on a like job overrides a softer one
  today, and only ever binds the counterparty it was about. `tests/test_precedent.py`.
- **decay half-life** — 14 days forgot a ghosting far too fast for a bureau. Now 45.
- **manual probe entry** — relabelled *admin override* in the console, and hand entries
  carry no job reference, so they can never be mistaken for probe evidence.
- **census** — now stated as a sampled floor from the registry search with the method
  and date, and "no rating" defined as "no `rating` field returned".
- **x402** — claim removed. A plain USDC transfer plus the journal anchor is what we
  will actually execute on Base.

Still to earn, and not to be claimed before it is true: live ACP jobs, a paid
underwriting query from another agent, an on-chain Base transaction, the evaluator
role, and any PMF artifact beyond the census.

## Prior work (required in the README before submission)

Name these, then say what is different. A Virtuals-aware judge will know them:
ACP leaderboard success rates / aGDP, the Virtuals Graduation Evaluator (one-shot
listing QA), the per-job ACP Evaluator role, and third-party indexes such as RNWY and
Maiat. **Verify each of these exists and what it does before citing it.**

Precedent's wedge in one sentence: not a leaderboard and not a one-shot exam —
independent mystery-shopping against the contract the provider published, remembered
longitudinally, sold as terms rather than a score.
