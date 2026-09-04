import {
  pgTable,
  text,
  integer,
  timestamp,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    handle: text("handle").notNull(),
    displayName: text("display_name").notNull(),
    tz: text("tz").notNull().default("UTC"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("users_handle_idx").on(t.handle)],
);

/** poem | essay | story */
export const pieces = pgTable(
  "pieces",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    author: text("author").notNull().default("Anonymous"),
    body: text("body").notNull(),
    source: text("source").notNull(),
    sourceUrl: text("source_url"),
    wordCount: integer("word_count").notNull().default(0),
    /** optional slant, e.g. "philosophy" — shown as a chip on the sheet */
    topic: text("topic"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("pieces_type_idx").on(t.type)],
);

/** One global pick per (day, type) so everybody reads the same three sheets. */
export const dailies = pgTable(
  "dailies",
  {
    day: text("day").notNull(), // YYYY-MM-DD
    type: text("type").notNull(),
    pieceId: text("piece_id")
      .notNull()
      .references(() => pieces.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.day, t.type] })],
);

export const reads = pgTable(
  "reads",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    type: text("type").notNull(),
    pieceId: text("piece_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.day, t.type] }),
    index("reads_user_day_idx").on(t.userId, t.day),
  ],
);

/** Free-text reaction the reader can scribble on a piece. */
export const marginalia = pgTable(
  "marginalia",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pieceId: text("piece_id").notNull(),
    note: text("note").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.pieceId] })],
);

/** Epigraphs. Not part of the streak — just something sharp at the top of the day. */
export const quotes = pgTable("quotes", {
  id: text("id").primaryKey(),
  text: text("text").notNull(),
  author: text("author").notNull(),
  sourceUrl: text("source_url"),
});
