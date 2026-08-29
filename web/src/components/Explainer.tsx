"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CircleSlash, FileText, Pause, Play, Search } from "lucide-react";

type Incident = { when: string; text: string; delta: number };

type Moment = {
  day: string;
  caption: string;
  question: string;
  verdict: string;
  verdictTone: "unknown" | "bad";
  detail: string;
  file: Incident[];
};

/** The same question asked twice, answered differently because of what happened between. */
const MOMENTS: Moment[] = [
  {
    day: "Day 1",
    caption: "A stranger asks to be hired for $1,000.",
    question: "Should I hire 0x7eaf…4837 for $1,000?",
    verdict: "No history. Probe first.",
    verdictTone: "unknown",
    detail: "Precedent refuses to price an agent it has never seen. It will risk $0.01 to find out, not $1,000.",
    file: [],
  },
  {
    day: "Day 2",
    caption: "Precedent buys a $0.01 job from that agent and watches.",
    question: "Probing 0x7eaf…4837 · data extraction · $0.01",
    verdict: "It took the money and vanished.",
    verdictTone: "bad",
    detail: "The agent published a 10 minute SLA. Nothing arrived in 40. That is graded against its own promise, not our opinion, and written to its file.",
    file: [{ when: "Day 2", text: "ghosted, no deliverable after 40 min", delta: -25 }],
  },
  {
    day: "Day 9",
    caption: "A week later, in a session that remembers nothing on its own.",
    question: "Should I hire 0x7eaf…4837 for $1,000?",
    verdict: "Refuse.",
    verdictTone: "bad",
    detail: "Same question as Day 1. Different answer, and the only thing that changed is the file.",
    file: [{ when: "Day 2", text: "ghosted, no deliverable after 40 min", delta: -25 }],
  },
];

export function Explainer() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const m = MOMENTS[i];

  useEffect(() => {
    if (!playing || reduce) return;
    const t = setTimeout(() => setI((n) => (n + 1) % MOMENTS.length), 5200);
    return () => clearTimeout(t);
  }, [i, playing, reduce]);

  return (
    <div className="glass rounded-3xl p-6 sm:p-9">
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {MOMENTS.map((s, n) => (
            <button
              key={s.day}
              onClick={() => {
                setI(n);
                setPlaying(false);
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                n === i ? "bg-fg text-white" : "text-fg-faint hover:text-fg"
              }`}
            >
              {s.day}
            </button>
          ))}
        </div>
        <button
          onClick={() => setPlaying((p) => !p)}
          className="flex items-center gap-1.5 text-xs text-fg-faint transition hover:text-fg"
        >
          {playing ? <Pause size={12} /> : <Play size={12} />}
          {playing ? "pause" : "play"}
        </button>
      </div>

      <p className="relative mt-6 font-display text-xl leading-snug sm:text-2xl">{m.caption}</p>

      <div className="relative mt-7 grid gap-3 lg:grid-cols-[1.1fr_1fr]">
        <div className="well rounded-2xl p-5">
          <p className="flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.12em] text-fg-faint">
            <Search size={12} /> the request
          </p>
          <AnimatePresence mode="wait">
            <motion.p
              key={m.question}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="mt-3 font-mono text-sm leading-relaxed text-fg"
            >
              {m.question}
            </motion.p>
          </AnimatePresence>

          <p className="mt-6 flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.12em] text-fg-faint">
            <FileText size={12} /> what Precedent remembers
          </p>
          <div className="mt-3 space-y-2">
            <AnimatePresence mode="popLayout">
              {m.file.length === 0 ? (
                <motion.p
                  key="empty"
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-sm text-fg-faint"
                >
                  <CircleSlash size={13} /> nothing. This agent is a stranger.
                </motion.p>
              ) : (
                m.file.map((f) => (
                  <motion.div
                    key={f.text}
                    layout
                    initial={reduce ? false : { opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-baseline justify-between gap-3 rounded-xl border-l-2 border-refuse/60 bg-white/60 px-3 py-2"
                  >
                    <span className="text-sm text-fg-muted">
                      <span className="font-mono text-xs text-fg-faint">{f.when}</span> {f.text}
                    </span>
                    <span className="font-mono text-xs text-refuse">{f.delta}</span>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="well flex flex-col justify-center rounded-2xl p-5">
          <p className="text-[0.68rem] uppercase tracking-[0.12em] text-fg-faint">the answer</p>
          <AnimatePresence mode="wait">
            <motion.div
              key={m.verdict}
              initial={reduce ? false : { opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.97, y: -8 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <p
                className={`mt-3 font-display text-2xl leading-tight sm:text-3xl ${
                  m.verdictTone === "bad" ? "text-refuse" : "text-fg-muted"
                }`}
              >
                {m.verdict}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted">{m.detail}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <p className="relative mt-6 text-xs text-fg-faint">
        An illustration of the flow, not a live query. The console runs it for real against the
        live registry and a real memory engine.
      </p>
    </div>
  );
}
