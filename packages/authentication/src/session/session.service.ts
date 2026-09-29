import {
  Injectable,
  Logger,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { SessionRepository } from './session.repository';
import { SessionEntity } from './session.entity';
import * as crypto from 'crypto';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly SessionExpireDay = 1;
  constructor(private readonly sessionRepository: SessionRepository) {}

  async createSession(
    sessionId: string,
    userId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<SessionEntity> {
    this.logger.log(`Creating session for user: ${userId}`);
    //Expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.SessionExpireDay);
    //RefreshTokenHash
    const refreshTokenHash = this.hashRefreshToken(refreshToken);

    const session = await this.sessionRepository.createSession({
      id: sessionId,
      userId,
      refreshTokenHash,
      ipAddress,
      userAgent,
      expiresAt,
    });
    this.logger.log(`Session created: ${session.id}`);
    return session;
  }

  private hashRefreshToken(refreshToken: string): string {
    return crypto.createHash('sha256').update(refreshToken).digest('hex');
  }

  async validateSession(
    sessionId: string,
    userId: string,
  ): Promise<SessionEntity> {
    this.logger.debug(`Validating session: ${sessionId}`);

    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      this.logger.warn(`Session not found for refresh token`);
      throw new UnauthorizedException(`Invalid refresh token`);
    }
    if (!session.isActive) {
      this.logger.warn(`Session is not active: ${session.id}`);
      throw new UnauthorizedException(`Session is not active`);
    }
    if (session.userId !== userId) {
      this.logger.warn(`Session user mismatch: ${session.id}`);
      throw new UnauthorizedException(`Session user mismatch`);
    }
    this.logger.debug(`Refresh token validated for session: ${session.id}`);
    return session;
  }

  async validateRefreshToken(refreshToken: string): Promise<SessionEntity> {
    this.logger.debug('Validating refresh token');

    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const session =
      await this.sessionRepository.findByRefreshTokenHash(refreshTokenHash);

    if (!session) {
      this.logger.warn('Session not found for refresh token');
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!session.isActive) {
      this.logger.warn(`Session is not active: ${session.id}`);
      throw new UnauthorizedException('Session is not active');
    }

    this.logger.debug(`Refresh token validated for session: ${session.id}`);
    return session;
  }

  async revokeSession(sessionId: string): Promise<void> {
    this.logger.log(`Revoking session: ${sessionId}`);

    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.sessionRepository.revokeSession(sessionId);
    this.logger.log(`Session revoked: ${sessionId}`);
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    this.logger.log(`Revoking all sessions for user: ${userId}`);
    await this.sessionRepository.revokeAllByUserId(userId);
    this.logger.log(`All sessions revoked for user: ${userId}`);
  }

  async rotateRefreshToken(
    sessionId: string,
    oldRefreshToken: string,
    newRefreshToken: string,
  ): Promise<SessionEntity> {
    this.logger.log(`Rotating refresh token for session: ${sessionId}`);

    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (!session.isActive) {
      throw new UnauthorizedException('Session is not active');
    }

    const oldRefreshTokenHash = this.hashRefreshToken(oldRefreshToken);
    const newRefreshTokenHash = this.hashRefreshToken(newRefreshToken);

    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + this.SessionExpireDay);

    const updatedSession = await this.sessionRepository.rotateRefreshToken(
      sessionId,
      newRefreshTokenHash,
      newExpiresAt,
      oldRefreshTokenHash,
    );

    if (!updatedSession) {
      this.logger.warn(`Rotation failed for session: ${sessionId}`);
      throw new UnauthorizedException('Refresh token rotation failed');
    }

    this.logger.log(`Refresh token rotated for session: ${sessionId}`);

    return updatedSession;
  }
}
