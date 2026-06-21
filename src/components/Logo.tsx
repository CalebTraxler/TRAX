/**
 * TRAX brand mark — a candlestick monogram tile + wordmark.
 * Pure inline SVG so it stays crisp at any size and themes with the page.
 */

export function LogoMark({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const id = "trax-grad";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="TRAX"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--brand)" />
          <stop offset="1" stopColor="var(--brand-2)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="12" fill={`url(#${id})`} />
      {/* candlestick cutouts in the tile's dark foreground */}
      <g fill="var(--brand-foreground)">
        <rect x="11" y="13" width="5" height="22" rx="2.5" opacity="0.55" />
        <rect x="12.25" y="17" width="2.5" height="14" rx="1.25" />
        <rect x="21.5" y="20" width="5" height="15" rx="2.5" opacity="0.55" />
        <rect x="22.75" y="23" width="2.5" height="9" rx="1.25" />
        <rect x="32" y="9" width="5" height="26" rx="2.5" opacity="0.55" />
        <rect x="33.25" y="14" width="2.5" height="16" rx="1.25" />
      </g>
    </svg>
  );
}

export function Logo({
  showTagline = false,
  className = "",
}: {
  showTagline?: boolean;
  className?: string;
}) {
  return (
    <span className={"flex items-center gap-2.5 " + className}>
      <LogoMark size={32} className="shrink-0 drop-shadow-[0_2px_10px_rgba(45,212,191,0.25)]" />
      <span className="flex flex-col leading-none">
        <span className="text-[17px] font-extrabold tracking-tight">TRAX</span>
        {showTagline && (
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            AI Token Cost Index
          </span>
        )}
      </span>
    </span>
  );
}
