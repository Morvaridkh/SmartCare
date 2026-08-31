import { Pool, type PoolConfig } from 'pg';

export type PostgresConnectionIdentity = string;

type Environment = Readonly<Record<string, string | undefined>>;

/**
 * Resolves PostgreSQL settings by identity and owns the resulting pool registry.
 * Repeated requests for the same identity return the same pool.
 */
export class PostgresPoolFactory {
  private readonly pools = new Map<PostgresConnectionIdentity, Pool>();

  constructor(private readonly environment: Environment = process.env) {}

  getPool(identity: PostgresConnectionIdentity): Pool {
    const normalizedIdentity = this.validateIdentity(identity);
    const existingPool = this.pools.get(normalizedIdentity);
    if (existingPool) {
      return existingPool;
    }

    const pool = new Pool(this.readConfiguration(normalizedIdentity));
    this.pools.set(normalizedIdentity, pool);
    return pool;
  }

  hasPool(identity: PostgresConnectionIdentity): boolean {
    return this.pools.has(this.validateIdentity(identity));
  }

  async closePool(identity: PostgresConnectionIdentity): Promise<boolean> {
    const normalizedIdentity = this.validateIdentity(identity);
    const pool = this.pools.get(normalizedIdentity);
    if (!pool) {
      return false;
    }

    this.pools.delete(normalizedIdentity);
    await pool.end();
    return true;
  }

  async closeAll(): Promise<void> {
    const pools = [...this.pools.values()];
    this.pools.clear();
    await Promise.all(pools.map((pool) => pool.end()));
  }

  private readConfiguration(identity: PostgresConnectionIdentity): PoolConfig {
    const prefix =
      identity === 'default'
        ? 'DB'
        : `${identity.replace(/-/g, '_').toUpperCase()}_DB`;

    const maximumConnections = this.readInteger(
      `${prefix}_MAX_CONNECTIONS`,
      10,
      1,
    );
    const minimumConnections = this.readInteger(
      `${prefix}_MIN_CONNECTIONS`,
      0,
      0,
    );
    if (minimumConnections > maximumConnections) {
      throw new Error(
        `${prefix}_MIN_CONNECTIONS cannot exceed ${prefix}_MAX_CONNECTIONS`,
      );
    }

    return {
      host: this.readRequired(`${prefix}_HOST`),
      port: this.readInteger(`${prefix}_PORT`, 5432, 1, 65535),
      database: this.readRequired(`${prefix}_NAME`),
      user: this.readRequired(`${prefix}_USERNAME`),
      password: this.readRequired(`${prefix}_PASSWORD`, true),
      ssl: this.readSsl(`${prefix}_SSL`),
      max: maximumConnections,
      min: minimumConnections,
      idleTimeoutMillis: this.readInteger(
        `${prefix}_IDLE_TIMEOUT_MS`,
        10_000,
        0,
      ),
      connectionTimeoutMillis: this.readInteger(
        `${prefix}_CONNECTION_TIMEOUT_MS`,
        0,
        0,
      ),
      maxLifetimeSeconds: this.readInteger(
        `${prefix}_MAX_LIFETIME_SECONDS`,
        0,
        0,
      ),
    };
  }

  private validateIdentity(identity: PostgresConnectionIdentity): string {
    const normalized = identity.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_-]*$/.test(normalized)) {
      throw new Error(
        "PostgreSQL connection identity must start with a letter and contain only letters, numbers, '_' or '-'",
      );
    }
    return normalized;
  }

  private readRequired(name: string, preserveWhitespace = false): string {
    const rawValue = this.environment[name];
    if (rawValue === undefined || rawValue.length === 0) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    const value = rawValue.trim();
    if (!preserveWhitespace && value.length === 0) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return preserveWhitespace ? rawValue : value;
  }

  private readInteger(
    name: string,
    fallback: number,
    minimum: number,
    maximum?: number,
  ): number {
    const rawValue = this.environment[name];
    if (rawValue === undefined || rawValue.trim() === '') {
      return fallback;
    }

    const value = Number(rawValue);
    if (
      !Number.isInteger(value) ||
      value < minimum ||
      (maximum !== undefined && value > maximum)
    ) {
      const range =
        maximum === undefined
          ? `at least ${minimum}`
          : `between ${minimum} and ${maximum}`;
      throw new Error(`${name} must be an integer ${range}`);
    }
    return value;
  }

  private readSsl(name: string): PoolConfig['ssl'] {
    const value = this.environment[name]?.trim().toLowerCase();
    if (value === undefined || value === '' || value === 'false') {
      return false;
    }
    if (value === 'true') {
      return true;
    }
    throw new Error(`${name} must be either true or false`);
  }
}
