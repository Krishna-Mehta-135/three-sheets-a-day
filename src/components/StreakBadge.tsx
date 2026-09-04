import Link from "next/link";

export function StreakBadge({
  current,
  todayCount,
  atRisk,
}: {
  current: number;
  todayCount: number;
  atRisk: boolean;
}) {
  const done = todayCount >= 3;
  return (
    <Link
      href="/me"
      className="group relative inline-flex shrink-0 items-center gap-3 border-2 border-ink bg-paper px-4 py-2.5"
      style={{ boxShadow: "5px 5px 0 var(--ink)" }}
    >
      <span
        className="display text-4xl leading-none"
        style={{ color: done ? "var(--ink-green)" : "var(--ink-pink)" }}
      >
        {current}
      </span>
      <span className="mono leading-relaxed">
        day
        {current === 1 ? "" : "s"}
        <br />
        <span className="opacity-60">
          {done ? "banked" : atRisk ? "on the line" : "running"}
        </span>
      </span>
      <span className="flex flex-col gap-1 pl-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block h-2.5 w-2.5 rounded-full border-2 border-ink"
            style={{ background: i < todayCount ? "var(--ink)" : "transparent" }}
          />
        ))}
      </span>
    </Link>
  );
}
