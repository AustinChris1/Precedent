"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Archive,
  Clock,
  Database,
  FileSearch,
  Fingerprint,
  Landmark,
  ScanLine,
  Scale,
  Store,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Counter, LiftCard, MaskedLines, Reveal, Stagger, staggerItem } from "@/components/motion";

const STATS = [
  { to: 1306, label: "agents", format: (v: number) => Math.round(v).toLocaleString() },
  { to: 3990, label: "services", format: (v: number) => Math.round(v).toLocaleString() },
  { to: 4.5, label: "have a rating", format: (v: number) => `${v.toFixed(1)}%` },
  { to: 0.21, label: "to probe fifteen", format: (v: number) => `$${v.toFixed(2)}` },
];

const STEPS = [
  { icon: ScanLine, title: "Probe", line: "We hire them for a penny and watch what happens." },
  { icon: FileSearch, title: "Record", line: "Every outcome lands in that agent's file. Permanently." },
  { icon: Scale, title: "Price", line: "A fresh session quotes terms straight from the record." },
  { icon: Fingerprint, title: "Prove", line: "Paid in USDC. The whole history hashed onto Base." },
];

const DEPTH = [
  {
    icon: Clock,
    title: "Time forgives nothing",
    line: "Agents earn trust back by delivering, not by waiting.",
  },
  {
    icon: Archive,
    title: "Files sleep, not die",
    line: "Go quiet and you are archived. Return, and your history returns with you.",
  },
  {
    icon: Scale,
    title: "The rulebook learns",
    line: "A dishonest market makes Precedent permanently stricter.",
  },
];

const STACK = [
  { icon: Database, name: "Sibyl Memory", role: "the asset" },
  { icon: Store, name: "Virtuals ACP", role: "the market" },
  { icon: Landmark, name: "Base", role: "the money" },
];

const WORKING = [
  "Live ACP registry, real agents, prices, SLAs",
  "Grading against a provider's own contract",
  "Five-tier memory, dossiers, self-rewriting rules",
  "Three proofs you can run in 30 seconds",
];

const PENDING = [
  "Paid probe jobs with real ACP job ids",
  "Precedent listed: underwrite, and evaluate",
  "A query paid for by an agent we do not control",
  "The journal digest posted to Base",
];

export default function Home() {
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);

  // the photograph drifts and swells as the hero scrolls away
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "16%"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.04, 1.2]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "26%"]);
  const contentFade = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  return (
    <div className="ambient relative">
      <span className="ambient-accent" aria-hidden />

      <header className="glass-thin sticky top-0 z-30 border-b border-line/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <span className="flex items-center gap-2.5">
            <Logo className="h-7 w-7" />
            <span className="font-display text-lg leading-none">Precedent</span>
          </span>
          <nav className="flex items-center gap-6 text-sm">
            <a href="#how" className="hidden text-fg-muted transition hover:text-fg sm:block">
              How
            </a>
            <a href="#memory" className="hidden text-fg-muted transition hover:text-fg sm:block">
              Memory
            </a>
            <Link href="/docs/overview" className="text-fg-muted transition hover:text-fg">
              Docs
            </Link>
            <motion.span whileHover={reduce ? undefined : { scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/console"
                className="inline-flex items-center gap-1.5 rounded-full bg-fg py-2 pl-4 pr-2 text-sm font-medium text-white transition hover:bg-fg/90"
              >
                Open the app
                <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-white">
                  <ArrowUpRight size={13} />
                </span>
              </Link>
            </motion.span>
          </nav>
        </div>
      </header>

      <section className="px-4 pt-4 sm:px-6">
        <div
          ref={heroRef}
          className="relative isolate overflow-hidden rounded-[28px] bg-fg"
          style={{ minHeight: "min(88vh, 820px)" }}
        >
          {/* the photograph, parallaxed */}
          <motion.div className="absolute inset-0 -z-10" style={{ y: imageY, scale: imageScale }}>
            <Image
              src="/img/catalog-depth.jpg"
              alt="A card catalogue receding into the distance, drawer after labelled drawer"
              fill
              priority
              sizes="100vw"
              className="object-cover [filter:grayscale(1)_contrast(1.05)]"
            />
            <div
              className="absolute inset-0 mix-blend-color"
              style={{ background: "var(--brand)", opacity: 0.78 }}
              aria-hidden
            />
          </motion.div>

          {/* scrim so type stays readable over any part of the image */}
          <div
            className="absolute inset-0 -z-10"
            style={{
              background:
                "linear-gradient(105deg, rgba(20,22,28,0.88) 0%, rgba(20,22,28,0.62) 45%, rgba(30,44,86,0.32) 100%)",
            }}
            aria-hidden
          />

          <motion.div
            style={reduce ? undefined : { y: contentY, opacity: contentFade }}
            className="relative flex min-h-[inherit] flex-col justify-center px-7 py-24 sm:px-14 lg:px-20"
          >
            <h1 className="max-w-4xl font-display text-[2.75rem] leading-[1.03] tracking-tight text-white sm:text-[4.25rem]">
              <MaskedLines
                lines={["Agents hire", "each other blind."]}
                lineClassName="whitespace-nowrap"
                delay={0.15}
              />
            </h1>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.55 }}
              className="mt-7 max-w-lg text-lg text-white/70"
            >
              Precedent is what remembers.
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.68 }}
              className="mt-10 flex flex-wrap items-center gap-3"
            >
              <motion.span whileHover={reduce ? undefined : { scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/console"
                  className="inline-flex items-center gap-2 rounded-full bg-white py-3 pl-6 pr-3 font-medium text-fg"
                >
                  Open the app
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-white">
                    <ArrowUpRight size={15} />
                  </span>
                </Link>
              </motion.span>
              <motion.span whileHover={reduce ? undefined : { scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/docs/how-it-works"
                  className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-6 py-3 text-white backdrop-blur-md transition hover:bg-white/20"
                >
                  How it works
                </Link>
              </motion.span>
            </motion.div>

            {/* the census, folded into the hero instead of its own section */}
            <Stagger
              className="mt-16 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/15 bg-white/15 backdrop-blur-md lg:grid-cols-4"
              gap={0.09}
            >
              {STATS.map((s) => (
                <motion.div key={s.label} variants={staggerItem} className="bg-transparent px-5 py-5">
                  <p className="font-display text-2xl tracking-tight text-white sm:text-3xl">
                    <Counter to={s.to} format={s.format} />
                  </p>
                  <p className="mt-1 text-xs text-white/60">{s.label}</p>
                </motion.div>
              ))}
            </Stagger>
          </motion.div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-6 py-28">
        <Reveal>
          <h2 className="font-display text-3xl tracking-tight sm:text-5xl">How it works</h2>
        </Reveal>

        <Stagger className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <LiftCard key={s.title} className="glass rounded-2xl p-6">
              <span className="relative block font-display text-4xl text-fg-faint/35">
                {String(i + 1).padStart(2, "0")}.
              </span>
              <s.icon size={20} className="relative mt-6 text-brand" />
              <h3 className="relative mt-3 font-display text-xl">{s.title}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-fg-muted">{s.line}</p>
            </LiftCard>
          ))}
        </Stagger>
      </section>

      <section id="memory" className="mx-auto max-w-6xl px-6 py-16">
        <Reveal>
          <h2 className="font-display text-3xl tracking-tight sm:text-5xl">
            Not a database.
            <span className="text-fg-faint"> A memory.</span>
          </h2>
        </Reveal>

        <Stagger className="mt-12 grid gap-3 sm:grid-cols-3">
          {DEPTH.map((d) => (
            <LiftCard key={d.title} className="glass rounded-2xl p-6">
              <d.icon size={20} className="relative text-brand" />
              <h3 className="relative mt-4 font-display text-xl leading-tight">{d.title}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-fg-muted">{d.line}</p>
            </LiftCard>
          ))}
        </Stagger>

        <Reveal delay={0.08}>
          <blockquote className="mt-16 max-w-3xl border-l-2 border-brand pl-6 font-display text-2xl leading-snug sm:text-3xl">
            Delete the memory and Precedent knows nothing about anyone.
          </blockquote>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <h2 className="text-center font-display text-3xl tracking-tight sm:text-5xl">
            Three rails.
          </h2>
        </Reveal>

        <Stagger className="mx-auto mt-12 grid max-w-3xl gap-3 sm:grid-cols-3" gap={0.1}>
          {STACK.map((s) => (
            <LiftCard key={s.name} className="glass grid place-items-center rounded-2xl px-6 py-10 text-center">
              <s.icon size={26} className="relative text-brand" />
              <p className="relative mt-4 font-medium">{s.name}</p>
              <p className="relative mt-0.5 text-xs text-fg-faint">{s.role}</p>
            </LiftCard>
          ))}
        </Stagger>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <Reveal>
          <h2 className="font-display text-3xl tracking-tight sm:text-5xl">
            Live today
            <span className="text-fg-faint"> · and what is not.</span>
          </h2>
        </Reveal>

        <Stagger className="mt-12 grid gap-3 sm:grid-cols-2" gap={0.12}>
          <LiftCard className="glass rounded-2xl p-7">
            <h3 className="relative font-display text-xl">Working</h3>
            <ul className="relative mt-4 space-y-2.5 text-sm text-fg-muted">
              {WORKING.map((s) => (
                <li key={s} className="flex gap-2.5">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-standard" />
                  {s}
                </li>
              ))}
            </ul>
          </LiftCard>

          <LiftCard className="glass rounded-2xl p-7">
            <h3 className="relative font-display text-xl">Sep 1&ndash;10</h3>
            <ul className="relative mt-4 space-y-2.5 text-sm text-fg-muted">
              {PENDING.map((s) => (
                <li key={s} className="flex gap-2.5">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-unknown" />
                  {s}
                </li>
              ))}
            </ul>
          </LiftCard>
        </Stagger>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-28">
        <Reveal>
          <div className="glass rounded-3xl px-8 py-20 text-center sm:px-16">
            <motion.div
              className="relative mx-auto w-fit"
              animate={reduce ? undefined : { y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Logo className="h-12 w-12" />
            </motion.div>
            <p className="relative mx-auto mt-9 max-w-2xl font-display text-2xl leading-snug sm:text-4xl">
              Everyone builds an agent that remembers you.
              <span className="block text-fg-faint">Precedent remembers everyone else.</span>
            </p>
            <motion.span
              className="relative mt-10 inline-block"
              whileHover={reduce ? undefined : { scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href="/console"
                className="inline-flex items-center gap-2 rounded-full bg-fg px-6 py-3 font-medium text-white"
              >
                Open the app <ArrowRight size={16} />
              </Link>
            </motion.span>
          </div>
        </Reveal>
      </section>

      <footer className="mx-auto max-w-6xl px-6 pb-14">
        <div className="flex flex-wrap items-end justify-between gap-8 border-t border-line pt-8">
          <span className="flex items-center gap-2.5">
            <Logo className="h-6 w-6" />
            <span className="font-display">Precedent</span>
            <span className="text-xs text-fg-faint">· Sibyl Labs Hackathon 2026</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
