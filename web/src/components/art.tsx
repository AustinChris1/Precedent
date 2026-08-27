/** Brand illustrations. */

const INK = "var(--fg)";
const MUTED = "var(--fg-faint)";
const BRAND = "var(--brand)";
const LINE = "var(--line-strong)";

/** 1,303 agents; the filled ones are the 59 that carry any rating at all. */
export function MarketArt({ className = "" }: { className?: string }) {
  const total = 1303;
  const rated = 59;
  const cols = 47;
  const rows = Math.ceil(total / cols);
  const gap = 7;

  // deterministic spread of the rated few, so the picture is stable per build
  const ratedSet = new Set<number>();
  for (let i = 0; i < rated; i++) ratedSet.add(Math.floor((i * 2654435761) % total));

  const dots = [];
  for (let i = 0; i < total; i++) {
    const x = (i % cols) * gap + 4;
    const y = Math.floor(i / cols) * gap + 4;
    const isRated = ratedSet.has(i);
    dots.push(
      <circle
        key={i}
        cx={x}
        cy={y}
        r={isRated ? 2.4 : 1.5}
        fill={isRated ? BRAND : MUTED}
        opacity={isRated ? 1 : 0.32}
      />,
    );
  }

  return (
    <svg
      viewBox={`0 0 ${cols * gap} ${rows * gap}`}
      className={className}
      role="img"
      aria-label="Every agent on the marketplace; only the highlighted few carry any rating"
    >
      {dots}
    </svg>
  );
}

/** probe → memory → decision, drawn as the closed loop it is. */
export function FlowArt({ className = "" }: { className?: string }) {
  const box = (x: number, y: number, w: number, h: number, label: string, sub: string, accent = false) => (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="10"
        fill="rgba(255,255,255,0.75)"
        stroke={accent ? BRAND : LINE}
        strokeWidth={accent ? 1.6 : 1.2}
      />
      <text x={x + w / 2} y={y + 25} textAnchor="middle" fill={INK} fontSize="14" fontWeight="500">
        {label}
      </text>
      <text x={x + w / 2} y={y + 43} textAnchor="middle" fill={MUTED} fontSize="11">
        {sub}
      </text>
    </g>
  );

  return (
    <svg viewBox="0 0 720 260" className={className} role="img" aria-label="How Precedent works">
      <defs>
        <marker id="fa" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
          <path d="M0 0 L9 4.5 L0 9 z" fill={MUTED} />
        </marker>
      </defs>

      {box(20, 30, 180, 62, "Probe a live agent", "a real job, ~1¢")}
      {box(270, 30, 180, 62, "Record what happened", "graded on its contract")}
      {box(520, 30, 180, 62, "Remember", "one dossier per agent", true)}
      {box(270, 168, 180, 62, "Price the next job", "terms, not vibes", true)}

      <line x1="204" y1="61" x2="262" y2="61" stroke={MUTED} strokeWidth="1.4" markerEnd="url(#fa)" />
      <line x1="454" y1="61" x2="512" y2="61" stroke={MUTED} strokeWidth="1.4" markerEnd="url(#fa)" />

      {/* memory feeding forward into a future session */}
      <path
        d="M610 96 C610 140 500 140 456 160"
        fill="none"
        stroke={BRAND}
        strokeWidth="1.6"
        strokeDasharray="5 4"
        markerEnd="url(#fa)"
      />
      <text x="700" y="128" textAnchor="end" fill={BRAND} fontSize="11">
        days later, fresh session
      </text>

      {/* the loop closes: today's outcome becomes tomorrow's evidence */}
      <path
        d="M266 199 C150 199 110 150 110 100"
        fill="none"
        stroke={MUTED}
        strokeWidth="1.4"
        strokeDasharray="4 4"
        markerEnd="url(#fa)"
      />
    </svg>
  );
}

/** The five tiers, and what Precedent keeps in each. */
export function TiersArt({ className = "" }: { className?: string }) {
  const tiers = [
    ["HOT", "watchlist · archived index", 0.95],
    ["WARM", "one dossier per counterparty", 0.78],
    ["COLD", "append-only incident journal", 0.6],
    ["REFERENCE", "the underwriting charter", 0.42],
    ["ARCHIVE", "dormant, restorable", 0.26],
  ] as const;

  return (
    <svg viewBox="0 0 560 250" className={className} role="img" aria-label="The five memory tiers">
      {tiers.map(([name, desc, o], i) => (
        <g key={name}>
          <rect
            x={20 + i * 6}
            y={14 + i * 46}
            width={480 - i * 12}
            height="36"
            rx="8"
            fill={BRAND}
            opacity={o * 0.14}
          />
          <rect
            x={20 + i * 6}
            y={14 + i * 46}
            width={480 - i * 12}
            height="36"
            rx="8"
            fill="none"
            stroke={BRAND}
            strokeWidth="1"
            opacity={o * 0.5}
          />
          <text x={38 + i * 6} y={37 + i * 46} fill={INK} fontSize="12.5" fontWeight="600">
            {name}
          </text>
          <text x={130 + i * 6} y={37 + i * 46} fill={MUTED} fontSize="11.5">
            {desc}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** The decision flip: same question, different answer, because of memory. */
export function FlipArt({ className = "" }: { className?: string }) {
  const panel = (x: number, title: string, verdict: string, color: string, lines: string[]) => (
    <g>
      <rect x={x} y="16" width="300" height="180" rx="12" fill="rgba(255,255,255,0.7)" stroke={LINE} />
      <text x={x + 20} y="44" fill={MUTED} fontSize="11" letterSpacing="1">
        {title}
      </text>
      <text x={x + 20} y="76" fill={color} fontSize="20" fontWeight="600">
        {verdict}
      </text>
      {lines.map((l, i) => (
        <text key={l} x={x + 20} y={108 + i * 20} fill={MUTED} fontSize="11.5" fontFamily="monospace">
          {l}
        </text>
      ))}
    </g>
  );

  return (
    <svg viewBox="0 0 700 220" className={className} role="img" aria-label="The same request, decided differently">
      {panel(10, "WITHOUT MEMORY", "50% upfront", "var(--band-unknown)", [
        "no history on record",
        "treated as a stranger",
        "→ exploited again",
      ])}
      {panel(390, "WITH MEMORY", "0% upfront · 25% collateral", "var(--band-refuse)", [
        "2026-08-24 malformed (-15)",
        "2026-08-24 price_drift (-12)",
        "→ priced on evidence",
      ])}
      <text x="352" y="112" textAnchor="middle" fill={BRAND} fontSize="22">
        →
      </text>
    </svg>
  );
}
