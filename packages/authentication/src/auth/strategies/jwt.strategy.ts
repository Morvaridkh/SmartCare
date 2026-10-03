import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SessionService } from '../../session/session.service';
import { JwtPayload } from './jwt-payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly sessionService: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(
    payload: JwtPayload,
  ): Promise<{ userId: string; sessionId: string }> {
    this.logger.debug(`Validating token for session: ${payload.sessionId}`);

    const session = await this.sessionService.validateSession(
      payload.sessionId,
      payload.sub,
    );

    this.logger.debug(`Token validated for user: ${session.userId}`);

    return {
      userId: session.userId,
      sessionId: session.id,
    };
  }
}
