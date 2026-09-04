export function Epigraph({
  text,
  author,
}: {
  text: string;
  author: string;
}) {
  return (
    <figure
      className="relative mt-10 border-2 border-ink px-6 py-6 sm:px-9 sm:py-7"
      style={{
        background: "color-mix(in srgb, var(--ink-yellow) 16%, var(--paper))",
        boxShadow: "6px 6px 0 var(--ink)",
        transform: "rotate(-0.5deg)",
      }}
    >
      <span
        className="display pointer-events-none absolute -left-1 -top-9 select-none text-[7rem] leading-none opacity-15"
        aria-hidden
      >
        &ldquo;
      </span>
      <blockquote className="relative text-[clamp(1.05rem,2.6vw,1.35rem)] italic leading-[1.55] text-balance">
        {text}
      </blockquote>
      <figcaption className="mono mt-4 opacity-65">— {author}</figcaption>
    </figure>
  );
}
