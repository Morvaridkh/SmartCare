import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({
  path: path.resolve(process.cwd(), '../../.env'),
});

import { MigrationRunner } from '../postgres/migration-runner.js';
import { PostgresPoolFactory } from '../postgres/postgres-pool-factory.js';

async function runMigrations(): Promise<void> {
  const poolFactory = new PostgresPoolFactory();
  const connectionIdentity = process.env.DB_IDENTITY ?? 'default';
  const pool = poolFactory.getPool(connectionIdentity);
  const runner = new MigrationRunner({
    pool,
    migrationsDirectory:
      process.env.MIGRATIONS_DIRECTORY ??
      path.resolve(process.cwd(), '../authentication/migrations'),
    logger: console,
  });

  try {
    const results = await runner.run();
    console.info(
      results.length === 0
        ? 'Database is up to date.'
        : `${results.length} migration(s) completed.`,
    );
  } finally {
    await poolFactory.closeAll();
  }
}

runMigrations().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
