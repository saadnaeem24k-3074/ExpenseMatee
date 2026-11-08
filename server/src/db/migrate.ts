import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool, PoolClient } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "migrations");

// Arbitrary key used to stop two migrate processes from running at the same time.
const ADVISORY_LOCK_KEY = 727274;

const MIGRATIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`;

export interface Migration {
  id: string;
  filePath: string;
  sql: string;
  checksum: string;
}

export interface MigrationResult {
  applied: string[];
  skipped: string[];
}

/**
 * Reads every numbered .sql file from the migrations directory in ascending
 * order and fingerprints its contents so edited migrations can be detected.
 */
export function loadMigrations(): Migration[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => /^\d{3}_[a-z0-9_]+\.sql$/i.test(name))
    .sort()
    .map((name) => {
      const filePath = path.join(MIGRATIONS_DIR, name);
      const sql = readFileSync(filePath, "utf-8").replace(/\r\n/g, "\n");
      const checksum = createHash("sha256").update(sql).digest("hex");
      return { id: name, filePath, sql, checksum };
    });
}

/**
 * Applies all pending migrations in order. Each migration runs inside its own
 * transaction and is recorded in schema_migrations only after it succeeds, so
 * the runner is safe to execute repeatedly.
 */
export async function runMigrations(pool: Pool): Promise<MigrationResult> {
  const client: PoolClient = await pool.connect();
  const applied: string[] = [];
  const skipped: string[] = [];

  try {
    await client.query("SELECT pg_advisory_lock($1)", [ADVISORY_LOCK_KEY]);
    await client.query(MIGRATIONS_TABLE_SQL);

    const { rows } = await client.query<{ id: string; checksum: string }>(
      "SELECT id, checksum FROM schema_migrations"
    );
    const appliedChecksums = new Map(rows.map((row) => [row.id, row.checksum]));
    const migrations = loadMigrations();

    if (migrations.length === 0) {
      console.log("No migration files found.");
      return { applied, skipped };
    }

    for (const migration of migrations) {
      const previousChecksum = appliedChecksums.get(migration.id);

      if (previousChecksum !== undefined) {
        if (previousChecksum !== migration.checksum) {
          throw new Error(
            `Migration ${migration.id} changed after it was applied (checksum mismatch). ` +
              `Create a new migration file instead of editing an applied one.`
          );
        }
        skipped.push(migration.id);
        console.log(`skip  ${migration.id} (already applied)`);
        continue;
      }

      console.log(`apply ${migration.id} ...`);
      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query(
          "INSERT INTO schema_migrations (id, checksum) VALUES ($1, $2)",
          [migration.id, migration.checksum]
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(
          `Migration ${migration.id} failed and was rolled back: ${(error as Error).message}`
        );
      }

      applied.push(migration.id);
      console.log(`done  ${migration.id}`);
    }

    if (applied.length === 0) {
      console.log(`Database is up to date (${skipped.length} migration(s) already applied).`);
    } else {
      console.log(
        `Applied ${applied.length} migration(s); skipped ${skipped.length} already applied.`
      );
    }

    return { applied, skipped };
  } finally {
    await client
      .query("SELECT pg_advisory_unlock($1)", [ADVISORY_LOCK_KEY])
      .catch(() => undefined);
    client.release();
  }
}

const isEntryPoint =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntryPoint) {
  (async () => {
    const { pool } = await import("./pool.js");
    try {
      console.log("Running migrations...");
      await runMigrations(pool);
      console.log("Migrations complete.");
    } catch (error) {
      console.error("Migration failed:", error);
      process.exitCode = 1;
    } finally {
      await pool.end();
    }
  })();
}
