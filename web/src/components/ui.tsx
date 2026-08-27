"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import type { Band } from "@/lib/engine";

export function Card({
  title,
  hint,
  icon,
  children,
  className = "",
}: {
  title?: string;
  hint?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass rounded-2xl ${className}`}>
      {title && (
        <header className="relative flex items-start gap-3 border-b border-line px-5 py-3.5">
          {icon && <span className="mt-0.5 text-brand-soft">{icon}</span>}
          <div>
            <h2 className="font-display text-lg leading-tight">{title}</h2>
            {hint && <p className="mt-0.5 text-xs text-fg-faint">{hint}</p>}
          </div>
        </header>
      )}
      <div className="relative p-5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[0.7rem] font-medium uppercase tracking-[0.12em] text-fg-faint">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-xs text-fg-faint">{hint}</span>}
    </label>
  );
}

const inputBase =
  "w-full rounded-xl border border-line-strong bg-white/70 px-3 py-2 text-sm text-fg " +
  "shadow-[inset_0_1px_2px_rgba(43,45,51,0.05)] backdrop-blur-sm " +
  "placeholder:text-fg-faint outline-none transition focus:border-brand-soft/60 " +
  "focus:bg-white focus:ring-4 focus:ring-brand/10";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${inputBase} font-mono text-xs leading-relaxed ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

export function Button({
  children,
  loading,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "primary" | "ghost";
}) {
  const styles =
    variant === "primary"
      ? "bg-brand text-white shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_8px_20px_-8px_rgba(88,120,200,0.50)] hover:bg-brand-soft"
      : "glass-thin border border-line-strong text-fg-muted hover:border-brand-soft/50 hover:text-fg";
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm
        font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles}
        ${props.className ?? ""}`}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

const BAND_STYLES: Record<Band, { label: string; className: string }> = {
  standard: { label: "Standard terms", className: "text-standard border-standard/35 bg-standard/10" },
  guarded: { label: "Guarded", className: "text-guarded border-guarded/35 bg-guarded/10" },
  restricted: { label: "Restricted", className: "text-restricted border-restricted/35 bg-restricted/10" },
  refuse: { label: "Refuse", className: "text-refuse border-refuse/35 bg-refuse/10" },
  probe_first: { label: "No history, probe first", className: "text-unknown border-unknown/35 bg-unknown/10" },
};

export function BandBadge({ band }: { band: Band }) {
  const s = BAND_STYLES[band] ?? BAND_STYLES.probe_first;
  return (
    <span
      className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium backdrop-blur-sm ${s.className}`}
    >
      {s.label}
    </span>
  );
}

export function TrustMeter({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="font-mono text-sm text-fg-faint">no history</span>;
  }
  const band =
    value >= 70 ? "standard" : value >= 40 ? "guarded" : value >= 20 ? "restricted" : "refuse";
  const color = `var(--band-${band})`;
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.max(2, value)}%`, background: color }}
        />
      </div>
      <span className="font-mono text-sm tabular-nums" style={{ color }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-line px-3 py-6 text-center text-sm text-fg-faint">
      {children}
    </p>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-refuse/30 bg-refuse/10 px-3 py-2 text-sm text-refuse">
      {children}
    </p>
  );
}
