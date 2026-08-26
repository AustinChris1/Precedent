# Setup — credentials, wallets, and where everything goes

Everything Precedent needs, in the order you need it. Nothing here is required to
run what already works (the console, the memory engine, the registry read); it is
required for the **live loop** during the build window.

> **Rule for every secret below:** it goes in a file that is gitignored, never in
> a commit, never in a screenshot, never pasted into a chat. You have already had
> one credential leak this project (the submission token) — assume screen shares
> and screenshots are public.

---

## 0. What actually needs a secret

| Piece | Needs a credential? | Why |
|---|---|---|
| Sibyl Memory | **No** | Free tier is local and needs no account. `sibyl init` only if you upgrade. |
| ACP registry read (Registry tab) | **No** | `/agents/search` is a public endpoint. This is why the console works today. |
| Placing ACP jobs / being hired | **Yes** | You sign transactions as your agent. |
| Posting the journal digest to Base | **Yes** | You pay gas. |

So: two of the four need keys, and both only matter from Sep 1.

---

## 1. Sibyl Memory — nothing to do

The free tier runs entirely on your machine with no account. The engine creates
`memory.db` on first run.

```bash
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
uvicorn precedent.server:app --port 8787
```

Optional, and only if you hit the 5MB free cap or want the built-in learner
(`learn()` / `lint()` are paid-tier only — verified, they raise `TierGateError`
on free):

```bash
pip install sibyl-memory-cli
sibyl init        # opens a browser, writes ~/.sibyl-memory/credentials.json
sibyl status
```

That file is outside the repo, so there is nothing to gitignore.

---

## 2. Virtuals ACP — register the agent, then copy four values

Verified against the SDK's own README (`@virtuals-protocol/acp-node-v2`), not
from memory.

**Step 1 — register.** Go to **https://app.virtuals.io/acp/new** and register
Precedent in the Service Registry. You will register it as a **provider** with at
least one offering — that is what lets other agents hire it. Planned offerings:

- `underwrite` — "should I hire agent X for amount Y?" → terms from memory
- `evaluate` — act as the third-party evaluator on someone else's job

**Step 2 — collect four values** from your agent's page at
**https://app.virtuals.io/acp/agents/**

| Value | Where | Notes |
|---|---|---|
| `ACP_AGENT_WALLET_ADDRESS` | the agent's wallet address | public, not a secret |
| `ACP_WALLET_ID` | **Signers** tab | not a secret by itself |
| `ACP_SIGNER_PRIVATE_KEY` | **Signers** tab → **+ Add Signer** → **Copy Key** | **secret** |
| `ACP_BUILDER_CODE` | **Settings** tab (`bc-…`) | optional; attributes txs to you on base.dev |

**About that private key.** It is generated *by the platform* for the agent
wallet — it is not your personal wallet key, and you never paste a personal key
anywhere in this project. It still controls the agent's funds, so treat it as a
password. If it leaks, add a new signer and stop using the old one.

**Step 3 — fund the agent wallet** with USDC on Base. The whole probe campaign
is costed at **$0.208** (`node web/scripts/plan-probes.mjs`), so $5–10 is
generous. Confirm the exact gas/funding model at the Virtuals workshop on
Sep 5–7 — smart-wallet gas handling is the one thing here I have not verified
first-hand.

**Sandbox first.** Wire and test against sandbox before spending on live agents.

---

## 3. Base — one burner wallet

Only needed to post the journal digest on-chain and to settle an underwriting
payment.

1. Create a **brand-new** wallet (MetaMask → new account, or `cast wallet new`).
   Use it for this project and nothing else.
2. Export its private key → `PRECEDENT_WALLET_PRIVATE_KEY`.
3. Fund with a few dollars of ETH on Base for gas. Anchoring a 32-byte hash
   costs cents.

Never use a wallet that holds anything you would miss.

---

## 4. Where the values go

**One file:** `web/.env.local` — create it by copying the template.

```bash
cd web
cp .env.example .env.local
# then edit .env.local and paste your values
```

`.env.local` is already gitignored (verified: `.env*` with a `!.env.example`
exception, so the template ships and the secrets never do). Next.js loads it
automatically — no extra wiring.

**The engine reads its own two variables** from its process environment, not
from `.env.local`:

```bash
# Windows PowerShell
$env:PRECEDENT_DB    = "$HOME\.sibyl-memory\precedent.db"
$env:PRECEDENT_API_KEY = "<the same value as ENGINE_API_KEY>"
uvicorn precedent.server:app --port 8787
```

On the VPS, put those in the systemd unit or your process manager. `ENGINE_API_KEY`
in `web/.env.local` and `PRECEDENT_API_KEY` on the engine **must match** — that is
the only thing stopping the open internet from writing to your bureau's memory.

### Checklist before the first live job

- [ ] `web/.env.local` exists and is **not** listed by `git status`
- [ ] `ENGINE_API_KEY` matches `PRECEDENT_API_KEY`
- [ ] Agent wallet funded with USDC on Base
- [ ] Burner wallet funded with a little ETH on Base
- [ ] Sandbox job placed and graded before any live spend

---

## 5. If something leaks

1. **ACP signer:** add a new signer on the Signers tab, use it, stop using the old.
2. **Base burner:** move the funds out, generate a new wallet. It holds only gas
   money, which is the point of using a burner.
3. **Submission token:** it is in `SUBMISSION.local.md` (gitignored). If it leaks,
   contact Sibyl Labs — anyone with it can edit your submission.

---

## 6. Deploying

**The short version: Vercel hosts the app, your VPS hosts the memory.**

`sibyl-memory-client` is Python-only and its `Storage` class takes a `db_path`
and calls `sqlite3.connect()` on a local file — that is the only constructor,
there is no hosted mode. Vercel functions get an ephemeral filesystem wiped
between cold starts, so running the engine there would erase `memory.db`
continuously. For this product that is not degraded service: it is the deletion
test failing on a loop.

| Piece | Where | Why |
|---|---|---|
| Next app (`web/`) | **Vercel** | Stateless. Free, fast, clean URL for judges. |
| Memory engine (`precedent/`) | **your VPS** | Needs a disk that survives. |

`pnpm engine` is a **local dev convenience only** — it starts the Python engine
from inside `web/` so you do not need two directories open. It has no role on
Vercel. In production the engine runs as a systemd service.

---

### A. The app on Vercel

1. Push the repo to GitHub, then **New Project** on Vercel and import it.
2. Set **Root Directory** to `web`. This is the one setting that matters — the
   Next app is not at the repo root.
3. Framework preset: Next.js (detected). Build command and output: defaults.
4. Add two **Environment Variables**:

   | Name | Value |
   |---|---|
   | `ENGINE_URL` | `https://engine.your-domain.com` |
   | `ENGINE_API_KEY` | the same secret the engine uses |

5. Deploy.

[`web/vercel.json`](web/vercel.json) is committed and sets security headers plus
`no-store` on `/api/*`. You do not need to configure anything else.

**Why the build works without the repo root:** the docs live in `/docs` at the
root, but Vercel builds from `web/` and cannot see `../docs`. So the synced copy
in `web/src/content/docs` is **committed**, and `scripts/sync-docs.mjs` refreshes
it locally while skipping cleanly when the source is absent. Verified by hiding
`/docs` and running the script: it uses the committed files and exits 0.

---

### B. The engine on the VPS

Everything below is in [`deploy/`](deploy/).

```bash
# on the VPS, from a checkout of the repo
sudo bash deploy/install-engine.sh
```

That creates a `precedent` system user, installs the engine to `/opt/precedent`
with its own venv, and puts the database in `/var/lib/precedent` — a directory
that survives deploys, unlike the app directory.

Then:

```bash
# 1. set a real key (must match ENGINE_API_KEY on Vercel)
sudo nano deploy/precedent-engine.service     # PRECEDENT_API_KEY=...

# 2. install and start
sudo cp deploy/precedent-engine.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now precedent-engine
curl -s localhost:8787/health                  # {"ok":true,...}
```

The unit binds uvicorn to **127.0.0.1 only** and runs with `ProtectSystem=strict`
plus a single `ReadWritePaths=/var/lib/precedent`, so a compromised engine can
write nowhere else on the box.

**TLS.** Vercel must reach the engine over HTTPS. Point an A record at the VPS,
then:

```bash
sudo apt install caddy
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile   # edit the hostname first
sudo systemctl reload caddy
```

Caddy obtains a certificate automatically. Confirm end to end:

```bash
curl -s https://engine.your-domain.com/health
```

If that returns JSON, set `ENGINE_URL` on Vercel to that host and redeploy. The
console header will read **memory engine online**.

---

### C. If you would rather not run two hosts

Run both on the VPS: `next start` alongside the engine, with
`ENGINE_URL=http://127.0.0.1:8787`. You lose Vercel's CDN and preview deploys;
you gain one machine and no publicly exposed engine at all, which is a smaller
attack surface. Still $0.

### D. For the demo

Judging is a video plus a repo, so 24/7 uptime is not required. If the VPS is
unhappy on demo day, run the engine locally and expose it with a free
cloudflared tunnel — the recording is what counts.
