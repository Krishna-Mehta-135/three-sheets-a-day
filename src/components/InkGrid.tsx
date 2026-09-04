import { prettyDay } from "@/lib/dates";

/** Six months of days as a halftone dot field — density = how much you read. */
export function InkGrid({
  days,
  tally,
  today,
}: {
  days: string[];
  tally: Record<string, number>;
  today: string;
}) {
  // Pad the front so each column is a real Sun–Sat week.
  const firstDow = new Date(days[0] + "T00:00:00Z").getUTCDay();
  const cells: (string | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...days,
  ];
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div className="overflow-x-auto border-2 border-ink p-3">
      <div className="flex gap-[3px]">
        {weeks.map((week, w) => (
          <div key={w} className="flex flex-col gap-[3px]">
            {week.map((day, d) => {
              if (!day) return <span key={d} className="block h-3.5 w-3.5" />;
              const n = Math.min(3, tally[day] ?? 0);
              return (
                <span
                  key={d}
                  title={`${prettyDay(day)} — ${n}/3`}
                  className="block h-3.5 w-3.5 border-2"
                  style={{
                    borderColor:
                      day === today ? "var(--ink-pink)" : "var(--ink)",
                    background:
                      n === 0
                        ? "transparent"
                        : `color-mix(in srgb, var(--ink) ${n * 33}%, transparent)`,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
