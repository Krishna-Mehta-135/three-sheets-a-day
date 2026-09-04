export const PIECE_TYPES = ["poem", "essay", "story"] as const;
export type PieceType = (typeof PIECE_TYPES)[number];

export function isPieceType(v: string): v is PieceType {
  return (PIECE_TYPES as readonly string[]).includes(v);
}

export const TYPE_META: Record<
  PieceType,
  { label: string; ink: string; blurb: string; glyph: string }
> = {
  poem: {
    label: "Poem",
    ink: "var(--ink-pink)",
    blurb: "short, loud, sideways",
    glyph: "✦",
  },
  essay: {
    label: "Essay",
    ink: "var(--ink-blue)",
    blurb: "someone thinking out loud",
    glyph: "▲",
  },
  story: {
    label: "Story",
    ink: "var(--ink-green)",
    blurb: "a lie that tells the truth",
    glyph: "●",
  },
};
