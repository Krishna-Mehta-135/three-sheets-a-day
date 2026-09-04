import type { PressProblem } from "@/lib/diagnose";

/** The failure state, set like a printer's notice rather than a stack trace. */
export function PressNotice({ problem }: { problem: PressProblem }) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-20 sm:px-8">
      <p className="mono opacity-70">Notice from the press room</p>
      <h1 className="display mt-3 text-[clamp(2.4rem,10vw,5rem)]">
        <span className="misreg" data-text={problem.headline}>
          {problem.headline}
        </span>
      </h1>
      <div className="rule-thick my-7" />
      <p className="mb-7 text-[1.05rem]">{problem.detail}</p>
      <ol className="flex flex-col gap-3">
        {problem.fix.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span
              className="mono shrink-0 border-2 border-ink px-2 py-0.5"
              style={{ background: "var(--ink-yellow)" }}
            >
              {i + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
