"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, ArrowLeft, CircleAlert, CircleCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { engine } from "@/lib/client";
import { RegistryPanel, type PickedAgent } from "@/components/console/RegistryPanel";
import { ProbePanel } from "@/components/console/ProbePanel";
import { UnderwritePanel } from "@/components/console/UnderwritePanel";
import { BureauPanel } from "@/components/console/BureauPanel";
import { JournalPanel } from "@/components/console/JournalPanel";

const TABS = [
  { id: "registry", label: "Registry" },
  { id: "probe", label: "Probe" },
  { id: "underwrite", label: "Underwrite" },
  { id: "bureau", label: "Bureau" },
  { id: "journal", label: "Journal" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ConsolePage() {
  const [tab, setTab] = useState<TabId>("registry");
  const [refreshKey, setRefreshKey] = useState(0);
  const [online, setOnline] = useState<boolean | null>(null);
  // : a counterparty chosen in Registry, carried into Underwrite and Probe.
  const [picked, setPicked] = useState<PickedAgent | null>(null);

  useEffect(() => {
    let alive = true;
    engine
      .get("health")
      .then(() => alive && setOnline(true))
      .catch(() => alive && setOnline(false));
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="ambient relative flex min-h-screen flex-col">
      <span className="ambient-accent" aria-hidden />
      <header className="sticky top-0 z-20 border-b border-line glass-thin">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5 transition hover:text-brand-soft">
            <Logo className="h-6 w-6" />
            <span className="font-display text-lg leading-none">Precedent</span>
            <span className="ml-1 hidden text-xs text-fg-faint sm:inline">console</span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs">
              {online === null ? (
                <Activity size={13} className="text-fg-faint" />
              ) : online ? (
                <CircleCheck size={13} className="text-standard" />
              ) : (
                <CircleAlert size={13} className="text-refuse" />
              )}
              <span className={online ? "text-fg-muted" : "text-refuse"}>
                {online === null ? "checking engine" : online ? "memory engine online" : "engine offline"}
              </span>
            </span>
            <Link href="/docs/usage" className="text-xs text-fg-muted transition hover:text-fg">
              docs
            </Link>
            <Link
              href="/"
              className="hidden items-center gap-1 text-xs text-fg-faint transition hover:text-fg sm:flex"
            >
              <ArrowLeft size={12} /> home
            </Link>
          </div>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-px">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative shrink-0 px-3.5 py-2 text-sm transition ${
                tab === t.id ? "text-fg" : "text-fg-faint hover:text-fg-muted"
              }`}
            >
              {t.label}
              {tab === t.id && (
                <motion.span
                  layoutId="tab-underline"
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-brand"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {online === false && (
          <div className="mb-6 rounded-xl border border-refuse/30 bg-refuse/10 px-4 py-3.5 text-sm text-refuse">
            <p className="font-medium">The memory engine is not running.</p>
            <p className="mt-1 text-refuse/85">
              Precedent is two processes: this app is the face, the engine holds the memory.
              Open a second terminal and start it, from <code className="font-mono">web/</code>:
            </p>
            <code className="mt-2 block rounded-lg bg-white/50 px-3 py-2 font-mono text-xs">
              pnpm engine
            </code>
            <p className="mt-2 text-xs text-refuse/75">
              or from the project root:{" "}
              <code className="font-mono">uvicorn precedent.server:app --port 8787</code>
            </p>
            <button onClick={refresh} className="mt-2 underline">
              retry
            </button>
          </div>
        )}

        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {tab === "registry" && (
            <RegistryPanel
              onPick={(agent) => {
                setPicked(agent);
                setTab("underwrite");
              }}
            />
          )}
          {tab === "probe" && (
            <ProbePanel key={picked?.walletAddress ?? "none"} onDone={refresh} picked={picked} />
          )}
          {tab === "underwrite" && (
            <UnderwritePanel key={picked?.walletAddress ?? "none"} onDone={refresh} picked={picked} />
          )}
          {tab === "bureau" && <BureauPanel refreshKey={refreshKey} />}
          {tab === "journal" && <JournalPanel refreshKey={refreshKey} />}
        </motion.div>
      </main>
    </div>
  );
}
