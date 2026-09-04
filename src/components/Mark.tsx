/**
 * Three sheets, fanned and overprinted — the same mark as the favicon, drawn
 * inline so it inherits the page's ink rather than loading an image.
 */
export function Mark({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden
      focusable="false"
      className="shrink-0"
    >
      <g style={{ mixBlendMode: "multiply" }}>
        <rect x="9" y="14" width="34" height="42" fill="var(--ink-pink)" transform="rotate(-9 26 35)" />
        <rect x="15" y="11" width="34" height="42" fill="var(--ink-blue)" transform="rotate(3 32 32)" />
        <rect x="21" y="8" width="34" height="42" fill="var(--ink-yellow)" transform="rotate(13 38 29)" />
      </g>
      <g fill="none" stroke="var(--ink)" strokeWidth="3.5">
        <rect x="9" y="14" width="34" height="42" transform="rotate(-9 26 35)" />
        <rect x="15" y="11" width="34" height="42" transform="rotate(3 32 32)" />
        <rect x="21" y="8" width="34" height="42" transform="rotate(13 38 29)" />
      </g>
    </svg>
  );
}
