import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  __gristSql?: ReturnType<typeof postgres>;
  __gristDb?: Db;
};

/** Lazy so `next build` doesn't need a live database. */
function connect(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill it in.",
    );
  }
  const sql = globalForDb.__gristSql ?? postgres(url, { max: 5, prepare: false });
  const instance = drizzle(sql, { schema });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__gristSql = sql;
    globalForDb.__gristDb = instance;
  }
  return instance;
}

export const db: Db = new Proxy({} as Db, {
  get(_t, prop) {
    const real = globalForDb.__gristDb ?? connect();
    const value = Reflect.get(real as object, prop);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
