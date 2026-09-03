/**
 * Locus — Latin for a place or position, and by extension an opening.
 *
 * The mark is a lattice of positions with one put forward: the whole job of
 * the app. The chosen point reads on its own at favicon sizes, and the lattice
 * resolves as the mark gets bigger.
 *
 * Geometry is centred inside the 24×24 box: the lattice and the oversized
 * chosen dot together occupy 17 units, inset 3.5 on every side.
 */
const COLS = [5.2, 11.6, 18.0];
const ROWS = [6.0, 12.4, 18.8];
const DOT = 1.7;
const CHOSEN = 2.5;

export function Logo({
  size = 22,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-label="Locus"
    >
      {ROWS.map((cy, row) =>
        COLS.map((cx, col) =>
          // The top-right position is the chosen one, drawn separately.
          row === 0 && col === 2 ? null : (
            <circle
              key={`${row}-${col}`}
              cx={cx}
              cy={cy}
              r={DOT}
              fill="currentColor"
              opacity={0.42}
            />
          ),
        ),
      )}
      <circle
        cx={COLS[2]}
        cy={ROWS[0]}
        r={CHOSEN}
        fill="var(--color-accent, #1d4ed8)"
      />
    </svg>
  );
}

/** Mark plus wordmark, set in the same Garamond the CV itself uses. */
export function Wordmark() {
  return (
    <span className="flex items-baseline gap-2">
      <Logo size={21} className="translate-y-[3px]" />
      <span
        className="text-[20px] font-semibold leading-none tracking-[.005em]"
        style={{ fontFamily: '"EB Garamond", Garamond, Georgia, serif' }}
      >
        Locus
      </span>
    </span>
  );
}
