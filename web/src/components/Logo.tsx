/** The Recall Loop. */

export function Logo({
  className = "",
  title = "Precedent",
  simple = false,
}: {
  className?: string;
  title?: string;
  simple?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* citation brackets */}
      <path d="M16 9 H10 V39 H16" stroke="currentColor" strokeWidth="2.9" strokeLinecap="square" />
      <path d="M32 9 H38 V39 H32" stroke="currentColor" strokeWidth="2.9" strokeLinecap="square" />

      {!simple && (
        <>
          {/* the return: an orbit around the ruling, open at the top */}
          <path
            d="M18.6 18.4 A6.6 6.6 0 1 0 24 17.4"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* arrowhead closing the loop back on itself */}
          <path
            d="M21.3 14.4 L24.4 17.5 L21.2 20.4"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}

      {/* the seal: the ruling itself */}
      <circle cx="24" cy="24" r={simple ? 5.4 : 3.1} fill="var(--color-brand, currentColor)" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Logo className="h-7 w-7 text-fg" />
      <span className="font-display text-[1.35rem] leading-none tracking-tight text-fg">
        Precedent
      </span>
    </span>
  );
}
