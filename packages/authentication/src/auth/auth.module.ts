import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from '../session/session.service';
import { SessionRepository } from '../session/session.repository';
import { TokenFactory } from '../helper/token.factory';
import { UserModule } from '../users/user.module';
import { PostgresPoolFactory } from '@SmartCare/communication';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenController } from '../helper/refresh-token.controller';
import { LoginRateLimitGuard } from './guards/login-rate-limit.guard';

@Module({
  imports: [
    ConfigModule,
    UserModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret: string = config.getOrThrow<string>('JWT_SECRET');
        return {
          secret,
          signOptions: {
            expiresIn: 3600,
          },
        };
      },
    }),
  ],
  controllers: [AuthController, RefreshTokenController],
  providers: [
    AuthService,
    SessionService,
    SessionRepository,
    TokenFactory,
    PostgresPoolFactory,
    JwtStrategy,
    LoginRateLimitGuard,
  ],
  exports: [AuthService, SessionService],
})
export class AuthModule {}
