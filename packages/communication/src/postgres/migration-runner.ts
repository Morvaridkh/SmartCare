import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import type { Pool, PoolClient } from 'pg';

interface Migration {
  readonly name: string;
  readonly filePath: string;
}

export interface MigrationResult {
  readonly name: string;
  readonly executionTimeMs: number;
}

export interface MigrationRunnerOptions {
  readonly pool: Pick<Pool, 'connect'>;
  readonly migrationsDirectory: string;
  readonly metadataTable?: string;
  readonly logger?: Pick<Console, 'info' | 'error'>;
}

/** Executes pending SQL migrations in filename order. */
export class MigrationRunner {
  private readonly metadataTable: string;

  constructor(private readonly options: MigrationRunnerOptions) {
    this.metadataTable = options.metadataTable ?? 'migrations';

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(this.metadataTable)) {
      throw new Error(`Invalid metadata table name: ${this.metadataTable}`);
    }
  }

  async run(): Promise<MigrationResult[]> {
    const client = await this.options.pool.connect();

    try {
      await this.createMetadataTable(client);
      await this.acquireLock(client);

      try {
        return await this.runPendingMigrations(client);
      } finally {
        await this.releaseLock(client);
      }
    } finally {
      client.release();
    }
  }

  private async runPendingMigrations(
    client: PoolClient,
  ): Promise<MigrationResult[]> {
    const migrations = await this.findMigrations();
    const executedNames = await this.findExecutedMigrationNames(client);
    const pending = migrations.filter(({ name }) => !executedNames.has(name));
    const results: MigrationResult[] = [];

    for (const migration of pending) {
      results.push(await this.runOne(client, migration));
    }

    return results;
  }

  private async findMigrations(): Promise<Migration[]> {
    const entries = await fs.readdir(this.options.migrationsDirectory, {
      withFileTypes: true,
    });

    return entries
      .filter((entry) => entry.isFile() && path.extname(entry.name) === '.sql')
      .map((entry) => ({
        name: entry.name,
        filePath: path.join(this.options.migrationsDirectory, entry.name),
      }))
      .sort((left, right) =>
        left.name.localeCompare(right.name, 'en', { numeric: true }),
      );
  }

  private async runOne(
    client: PoolClient,
    migration: Migration,
  ): Promise<MigrationResult> {
    // Read only when this migration is about to run. Already-executed files
    // never consume memory or cause unnecessary I/O.
    const sql = await fs.readFile(migration.filePath, 'utf8');
    const startedAt = performance.now();

    await client.query('BEGIN');
    try {
      await client.query(sql);
      const executionTimeMs = performance.now() - startedAt;
      await client.query(
        `INSERT INTO ${this.metadataTable} (name, execution_time_ms) VALUES ($1, $2)`,
        [migration.name, executionTimeMs],
      );
      await client.query('COMMIT');
      this.options.logger?.info(
        `Migration ${migration.name} completed in ${executionTimeMs.toFixed(2)} ms`,
      );
      return { name: migration.name, executionTimeMs };
    } catch (error) {
      await client.query('ROLLBACK');
      this.options.logger?.error(`Migration ${migration.name} failed`);
      throw error;
    }
  }

  private async createMetadataTable(client: PoolClient): Promise<void> {
    await client.query(`
            CREATE TABLE IF NOT EXISTS ${this.metadataTable} (
                name text PRIMARY KEY,
                execution_time_ms double precision NOT NULL,
                executed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);
  }

  private async findExecutedMigrationNames(
    client: PoolClient,
  ): Promise<Set<string>> {
    const result = await client.query<{ name: string }>(
      `SELECT name FROM ${this.metadataTable} ORDER BY name`,
    );
    return new Set(result.rows.map(({ name }) => name));
  }

  private acquireLock(client: PoolClient): Promise<unknown> {
    return client.query('SELECT pg_advisory_lock(hashtext($1))', [
      this.metadataTable,
    ]);
  }

  private releaseLock(client: PoolClient): Promise<unknown> {
    return client.query('SELECT pg_advisory_unlock(hashtext($1))', [
      this.metadataTable,
    ]);
  }
}
