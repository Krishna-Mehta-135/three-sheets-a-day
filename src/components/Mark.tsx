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
      <g strokeLinejoin="miter">
        <rect x="9" y="14" width="32" height="40" fill="var(--ink-pink)" transform="rotate(-11 26 35)" />
        <rect x="16" y="11" width="32" height="40" fill="#2f57e8" fillOpacity="0.62" transform="rotate(2 32 32)" style={{ mixBlendMode: "multiply" }} />
        <rect x="23" y="9" width="32" height="40" fill="var(--ink-yellow)" fillOpacity="0.72" transform="rotate(15 38 29)" style={{ mixBlendMode: "multiply" }} />
        <g fill="none" stroke="var(--ink)" strokeWidth="3.5">
          <rect x="9" y="14" width="32" height="40" transform="rotate(-11 26 35)" />
          <rect x="16" y="11" width="32" height="40" transform="rotate(2 32 32)" />
          <rect x="23" y="9" width="32" height="40" transform="rotate(15 38 29)" />
        </g>
      </g>
    </svg>
  );
}
