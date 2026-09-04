#!/usr/bin/env node
/**
 * Bring a database up to date: create the tables, then load the committed
 * texts. Idempotent — safe on every deploy.
 *
 * Runs as part of `vercel-build`, so a fresh Vercel project seeds itself as
 * long as DATABASE_URL is present at build time.
 */
import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.error(
    "\nDATABASE_URL is not set — skipping database setup.\n" +
      "On Vercel: Storage -> add Neon Postgres, then redeploy.\n",
  );
  process.exit(process.env.VERCEL ? 0 : 1);
}

function run(label, cmd, args) {
  console.log(`\n> ${label}`);
  const res = spawnSync(cmd, args, { stdio: "inherit", env: process.env });
  if (res.status !== 0) {
    console.error(`\n${label} failed.`);
    process.exit(res.status ?? 1);
  }
}

run("creating tables", "npx", ["drizzle-kit", "push", "--force"]);
run("loading texts", "node", ["scripts/load-content.mjs"]);
console.log("\n✓ database ready");
