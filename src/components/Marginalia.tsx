"use client";

import { useState, useTransition } from "react";
import { saveNote } from "@/app/actions";

/** A scrap of paper taped to the bottom of the sheet. */
export function Marginalia({
  pieceId,
  initial,
}: {
  pieceId: string;
  initial: string;
}) {
  const [note, setNote] = useState(initial);
  const [saved, setSaved] = useState<"idle" | "saving" | "done">("idle");
  const [, start] = useTransition();

  function commit() {
    if (note === initial && saved === "idle") return;
    setSaved("saving");
    start(async () => {
      await saveNote(pieceId, note);
      setSaved("done");
      setTimeout(() => setSaved("idle"), 1600);
    });
  }

  return (
    <div className="relative mt-14">
      <span className="tape -top-3 left-8 -rotate-3" />
      <span className="tape -top-3 right-8 rotate-2" />
      <div
        className="border-2 border-dashed border-ink p-5"
        style={{ background: "color-mix(in srgb, var(--ink-yellow) 22%, transparent)" }}
      >
        <label className="mono opacity-70">Marginalia — what stuck?</label>
        <textarea
          value={note}
          maxLength={600}
          rows={3}
          onChange={(e) => setNote(e.target.value)}
          onBlur={commit}
          placeholder="one line is enough…"
          className="mt-3 w-full resize-y bg-transparent text-[1.02rem] italic outline-none placeholder:opacity-35"
        />
        <div className="mono mt-2 flex justify-between opacity-50">
          <span>{600 - note.length} left</span>
          <span>
            {saved === "saving" ? "saving…" : saved === "done" ? "kept ✓" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
