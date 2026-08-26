---
title: Using the app
summary: A tester's walkthrough — what every screen does and how to prove it works.
---

# Using the app

*Written for someone opening the console for the first time who wants to verify the
claims rather than take them on trust.*

## Before you start

Two processes. The memory engine holds the record; the web app is the face.

```bash
cd web && pnpm install

# terminal 1 — the memory engine (Python). Started for you from here.
pnpm engine

# terminal 2 — the web app
pnpm dev
```

Both are required. The app is only the face; the engine holds the memory, so with
the engine down every panel reports *engine offline* and nothing can be recalled.

Open `http://localhost:3000/console`. The header says **memory engine online** when
the two are talking. If it says offline, the engine isn't running.

---

## Registry — see the real marketplace

**What it does:** searches the live Virtuals ACP registry. These are real agents,
fetched live. Nothing here is sample data.

**Try this:** search `data`, then `trading`. Look at the *no rating* count next to
the results — that is the entire problem this project exists for, visible in one
number.

**Build the plan** costs out a full probe campaign against live prices: five agents
per category, every job run twice, with the total in USDC. It spends nothing — it
only prices the work.

> Each job is run **twice on purpose**. One good delivery proves very little.
> Flakiness — same job, same agent, different result — is the failure that actually
> costs buyers money, and no existing rating captures it.

---

## Probe — where facts enter the bureau

Two tools. The top one judges; the bottom one records.

### Grade against the published contract

This is the rule that decides whether an agent behaved, and you can run it on
anything.

**Try this:**

1. Leave the defaults and press **Grade it** → verdict `delivered`. All four checks
   pass.
2. Change the deliverable to `sorry, I couldn't do that` → verdict `malformed`. It
   isn't valid against the schema the agent published.
3. Restore it, set **Took (min)** to `90` against the 60-minute SLA → `delivered_late`.
4. Set **Invoiced** higher than **Quoted** → `price_drift`, even though the work was
   fine. Overcharging is its own breach.
5. Tick **Never delivered** → `ghosted`, the worst outcome.

Notice you are never asked for an opinion. Every verdict comes from the contract.

### Record a probe outcome

Writes an incident into an agent's file. Fill in the agent, pick an outcome, say what
happened, and submit. This is the **only** way information enters the bureau.

**Try this:** record a `malformed` for an agent called `test-agent`, then go to
**Bureau** and watch its file appear.

---

## Underwrite — the whole point

Ask what terms a counterparty deserves.

**Try this, in order:**

1. Underwrite `brand-new-agent` for 1000 USDC → **No history — probe first**. It
   refuses to price a stranger at that size. That is failing *closed*, deliberately.
2. Go to **Probe**, record two bad outcomes for `test-agent`.
3. Come back and underwrite `test-agent` for 1000 → **Restricted** or **Refuse**,
   with 0% upfront and collateral demanded.
4. Read **Recalled from memory**: the specific incidents behind the terms.

**The proof:** step 1 and step 3 are the same question. The only thing that changed
is what the system remembers.

**Want the hard version?** Stop the engine, delete its database, restart it, and
underwrite `test-agent` again. It's back to "probe first" — the product is gone. That
is exactly what `python tests/test_deletion.py` automates.

---

## Bureau — the filing cabinet, and the part that learns

**Counterparties on file** lists every agent with a trust score, worst first. Click
one to read its dossier: every incident, dated, with the score impact.

**Run curation** is where memory reorganizes itself. Press it and watch:

- **Breach rate** — how much of the market has actually misbehaved, measured from
  the journal
- **Baseline trust** — *the number that moves*. If the market looks dishonest, this
  drops, and strangers are treated more harshly from then on
- **Archived** — dormant agents filed out of the hot path
- **Watchlist** — who is on probation

When it says *the charter rewrote itself*, the system has changed its own rules based
on evidence it collected. Reload the page: the new baseline is still there. Nothing
about that lives in the browser or in a running process — it is in memory.

**Try this:** record several `ghosted` outcomes for different agents, then run
curation. Baseline trust falls. Every future decision, in any session, is now
stricter.

---

## Journal — the receipts

**COLD journal** is the append-only log of everything that ever happened: incidents,
rulings, curation runs. It is never edited, only added to.

**Compute journal digest** produces one hash of the entire history. Publishing that
on Base is what makes the bureau accountable — anyone can check that the record they
were shown last week is the record that still exists today.

**Try this:** compute the digest, record one more incident, compute it again. It
changes completely. That is the point: history cannot be quietly edited without the
fingerprint giving it away.

---

## What isn't wired yet

Being straight about the boundary. Placing live ACP jobs and posting the digest to
Base are wired during the build window (Sep 1–10) — they need credentials and a
funded wallet. Everything else on this page works now, against the live registry and
a real memory engine.
