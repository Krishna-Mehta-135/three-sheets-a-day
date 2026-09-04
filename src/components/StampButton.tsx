"use client";

import { useState, useTransition } from "react";
import { markRead, unmarkRead } from "@/app/actions";
import type { PieceType } from "@/lib/types";

export function StampButton({
  day,
  type,
  pieceId,
  read,
}: {
  day: string;
  type: PieceType;
  pieceId: string;
  read: boolean;
}) {
  const [done, setDone] = useState(read);
  const [justHit, setJustHit] = useState(false);
  const [pending, start] = useTransition();

  function toggle() {
    if (done) {
      setDone(false);
      start(() => void unmarkRead(day, type));
      return;
    }
    setDone(true);
    setJustHit(true);
    start(() => void markRead(day, type, pieceId));
  }

  if (done) {
    return (
      <button
        onClick={toggle}
        title="Un-stamp this one"
        className={`stamp text-sm ${justHit ? "stamp-hit" : ""}`}
        style={{ color: "var(--ink-green)", transform: "rotate(-8deg)" }}
      >
        ✓ Read {day.slice(5)}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className="sheet mono px-6 py-4 disabled:opacity-50"
      style={{ background: "var(--ink-yellow)" }}
    >
      Stamp it read
    </button>
  );
}
