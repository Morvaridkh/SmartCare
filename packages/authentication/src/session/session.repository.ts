import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PostgresPoolFactory } from '@SmartCare/communication';
import { Pool } from 'pg';
import { SessionEntity } from './session.entity';

@Injectable()
export class SessionRepository {
  private readonly logger = new Logger(SessionRepository.name);
  private readonly pool: Pool;
  constructor(private readonly poolFactory: PostgresPoolFactory) {
    this.pool = this.poolFactory.getPool('default');
  }
  async createSession(data: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
  }): Promise<SessionEntity> {
    this.logger.log(`Creating session for user: ${data.userId}`);
    try {
      const result = await this.pool.query<SessionEntity>(
        `insert into sessions(id, user_id, ip_address, user_agent, refresh_token_hash, expires_at) 
          values ($1, $2, $3, $4, $5, $6) returning *`,
        [
          data.id,
          data.userId,
          data.ipAddress ?? null,
          data.userAgent ?? null,
          data.refreshTokenHash,
          data.expiresAt,
        ],
      );
      this.logger.log(`session d: ${result.rows[0].id}`);
      return result.rows[0];
    } catch (error) {
      this.logger.error(`Failed to  session:`, error);
      throw new InternalServerErrorException(`Failed to  session:`);
    }
  }
  async findById(id: string): Promise<SessionEntity | null> {
    this.logger.debug(`Finding session by id: ${id}`);
    try {
      const result = await this.pool.query<SessionEntity>(
        `select * from sessions where id = $1`,
        [id],
      );
      return result.rows[0] ?? null;
    } catch (error) {
      this.logger.error(`Failed to find session by id: ${id}`, error);
      throw new InternalServerErrorException(`Failed to find session`);
    }
  }
  async findByRefreshTokenHash(
    refreshTokenHash: string,
  ): Promise<SessionEntity | null> {
    this.logger.debug(`Finding session by refreshTokenHash`);
    try {
      const result = await this.pool.query<SessionEntity>(
        `select * from sessions where refresh_token_hash = $1`,
        [refreshTokenHash],
      );
      return result.rows[0] ?? null;
    } catch (error) {
      this.logger.error(`Failed to find session by refreshTokenHash`, error);
      throw new InternalServerErrorException(`Failed to find session`);
    }
  }
  async revokeSession(id: string): Promise<boolean> {
    this.logger.log(`Revoking session: ${id}`);
    try {
      const result = await this.pool.query<SessionEntity>(
        `update sessions set revoked_at = now(),updated_at = now() where id = $1 and revoked_at is null`,
        [id],
      );
      if (result.rowCount === 0) {
        this.logger.warn(`session not found or already revoked: ${id}`);
        return false;
      }
      this.logger.log(`Revoking session: ${id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to revoke session: ${id}`, error);
      throw new InternalServerErrorException(`Failed to revoke session`);
    }
  }
  async revokeAllByUserId(userId: string): Promise<number> {
    this.logger.log(`Revoking all sessions for user: ${userId}`);
    try {
      const result = await this.pool.query(
        `UPDATE sessions 
       SET revoked_at = NOW() 
       WHERE user_id = $1 
       AND revoked_at IS NULL`,
        [userId],
      );

      this.logger.log(
        `Revoked ${result.rowCount} sessions for user: ${userId}`,
      );
      return result.rowCount ?? 0;
    } catch (error) {
      this.logger.error(
        `Failed to revoke all sessions for user ${userId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to revoke sessions');
    }
  }
  async rotateRefreshToken(
    id: string,
    newRefreshTokenHash: string,
    newExpiresAt: Date,
    oldRefreshToken: string,
  ): Promise<SessionEntity | null> {
    this.logger.log(`Rotating refresh token for session: ${id}`);

    try {
      const result = await this.pool.query<SessionEntity>(
        `
      UPDATE sessions
      SET
        refresh_token_hash = $1,
        expires_at = $2,
        updated_at = NOW()
      WHERE id = $3
      AND refresh_token_hash = $4
      AND revoked_at IS NULL
      AND expires_at > now()
      RETURNING *
      `,
        [newRefreshTokenHash, newExpiresAt, id, oldRefreshToken],
      );

      if (!result.rows[0]) {
        this.logger.warn(`Session not found for refresh token rotation: ${id}`);
        return null;
      }

      return result.rows[0];
    } catch (error) {
      this.logger.error(
        `Failed to rotate refresh token for session ${id}`,
        error,
      );

      throw new InternalServerErrorException('Failed to update session');
    }
  }
}
