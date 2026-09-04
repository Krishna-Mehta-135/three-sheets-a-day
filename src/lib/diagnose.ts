import "server-only";

export type PressProblem = {
  kind: "no-database" | "no-tables" | "unreachable" | "no-content" | "unknown";
  headline: string;
  detail: string;
  fix: string[];
};

/**
 * Turn a database failure into something a human can act on. Deliberately
 * never echoes the connection string or the driver's raw message.
 */
export function diagnose(err: unknown): PressProblem {
  const code = (err as { code?: string })?.code ?? "";
  const message = err instanceof Error ? err.message : String(err);

  if (message.includes("DATABASE_URL is not set")) {
    return {
      kind: "no-database",
      headline: "No database attached.",
      detail: "DATABASE_URL isn't set in this environment.",
      fix: [
        "On Vercel: Storage → add Neon Postgres, which sets DATABASE_URL for you.",
        "Locally: copy .env.example to .env and fill it in.",
        "Redeploy after adding it — environment variables are read at boot.",
      ],
    };
  }

  // 42P01 = undefined_table
  if (code === "42P01" || /relation ".*" does not exist/.test(message)) {
    return {
      kind: "no-tables",
      headline: "Database is empty.",
      detail: "The connection works, but the tables haven't been created yet.",
      fix: [
        "Run `npm run setup` with this environment's DATABASE_URL in .env.",
        "That creates the tables and loads the texts from content/pieces.json.",
      ],
    };
  }

  if (
    code === "ENOTFOUND" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "CONNECT_TIMEOUT" ||
    /password authentication failed|SASL|no pg_hba/i.test(message)
  ) {
    return {
      kind: "unreachable",
      headline: "Can't reach the database.",
      detail: "DATABASE_URL is set, but the connection was refused.",
      fix: [
        "Check the host and password in DATABASE_URL.",
        "Neon needs `?sslmode=require` on the end of the string.",
        "Use the pooled connection string on serverless, not the direct one.",
      ],
    };
  }

  return {
    kind: "unknown",
    headline: "The press jammed.",
    detail: message.slice(0, 200),
    fix: ["Check the server logs for the full stack trace."],
  };
}

export const NO_CONTENT: PressProblem = {
  kind: "no-content",
  headline: "Press is cold.",
  detail: "The tables exist, but nothing has been printed yet.",
  fix: [
    "Run `npm run setup` with this environment's DATABASE_URL in .env.",
    "It loads the texts that are already committed in content/pieces.json.",
  ],
};
