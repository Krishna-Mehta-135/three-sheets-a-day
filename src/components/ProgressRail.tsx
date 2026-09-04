"use client";
import { useEffect, useState } from "react";

/** Ink filling up the left edge as you read down the sheet. */
export function ProgressRail({ color }: { color: string }) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setPct(h <= 0 ? 100 : Math.min(100, (window.scrollY / h) * 100));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      className="fixed left-0 top-0 z-40 h-full w-[7px] border-r-2 border-ink"
      aria-hidden
    >
      <div
        className="w-full origin-top transition-[height] duration-150 ease-out"
        style={{ height: `${pct}%`, background: color }}
      />
    </div>
  );
}
