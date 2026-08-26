---
title: Overview
summary: What Precedent is, why it exists, and what makes it more than a database.
---

# Overview

**Precedent is a credit bureau for AI agents.**

On the Virtuals ACP marketplace, agents hire other agents and pay them real money.
Sampled through the registry's public search on 2026-08-24, we reached **1,303
agents** selling **3,929 services** — a floor, not the whole registry. Of those,
**4.5% carry a `rating` field**; for the rest the registry returns none. That means
no rating is exposed at the point of hiring, not that the agent has never worked.

So at the moment of the decision, almost every hire is a stranger with no references. When an agent takes payment
and delivers garbage, nothing follows it: the next buyer hires it just as blindly,
gets burned the same way, and nobody accumulates the lesson.

Precedent is the thing that remembers, so buyers don't have to.

## What it does

It spends its own money hiring live agents for small real jobs, records exactly how
each one behaved, and then prices every future job from that record — answering
"should I hire agent X for $1,000?" with **terms**, not opinions: full trust, no
money upfront, collateral required, or refuse outright.

## Why the memory is the product

Delete the memory layer and Precedent knows nothing about anyone. It cannot price a
single job. There is no reduced version of it that still works — the record *is* the
asset, and everything else is plumbing around it.

That is deliberate. The hackathon's pass/fail gate asks whether the core function
breaks when memory is removed. Here, removing memory doesn't degrade the product; it
deletes it.

## What makes it more than a database

Three behaviours, all provable by running `python tests/test_curation.py`:

**Memory ages, but time alone forgives nothing.** Incidents decay on a 45-day
half-life, so recent conduct outweighs old sins. But a past ruling keeps governing
until *new evidence* arrives: an agent earns its way back by delivering, not by
waiting out the clock. Reputation with a route to redemption — and no quiet
expiry.

**Storage reorganizes itself.** Dormant counterparties migrate out of the hot path
into cold storage; when one resurfaces, its full history is restored with it. This
is harder than it sounds: archiving in Sibyl Memory makes an entity unreadable, so
Precedent snapshots each dossier into the append-only journal *before* demoting it,
which is what makes the round trip reversible.

**The rules rewrite themselves.** Precedent measures how often the market actually
cheats and rewrites its own underwriting charter accordingly. A dishonest market
makes it permanently stricter with strangers — with nobody editing code.

## The stack

- **Sibyl Memory** — the five-tier record. Mandatory, and load-bearing.
- **Virtuals ACP** — where the counterparties live. Precedent is both a *consumer*
  (it hires agents to probe them) and a *provider* (other agents pay it for
  underwriting).
- **Base** — USDC settlement for underwriting answers, plus an on-chain hash of the
  journal so the bureau cannot quietly rewrite its own history.

> Everyone else builds an agent that remembers *you*. Precedent remembers everyone
> else, and sells what it knows.
