import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterUserDto } from './dtos/register-user.dto';
import { LoginUserDto } from './dtos/login-user.dto';
import { UserService } from '../users/user.service';
import { SessionService } from '../session/session.service';
import { TokenFactory } from '../helper/token.factory';
import * as argon2 from 'argon2';
// import { plainToInstance } from 'class-transformer';
import { randomUUID } from 'node:crypto';
import { UserAuthorizedDto } from './dtos/user-authorized.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly tokenFactory: TokenFactory,
  ) {}

  // todo: returnType - get ip and ua as input
  async register(
    dto: RegisterUserDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<UserAuthorizedDto> {
    this.logger.log(`Registering User: ${dto.email}`);

    const existingUser = await this.userService.findByPhoneOrEmail(
      dto.phoneNumber,
      dto.email,
    );
    if (existingUser) {
      this.logger.warn(`User already exists`);
      throw new ConflictException('Phone number or email already exists');
    }

    //hash the password
    const passwordHash = await argon2.hash(dto.password);
    // user
    const user = await this.userService.create({
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      firstName: dto.firstName,
      lastName: dto.lastName,
      passwordHash,
    });
    const sessionId = randomUUID();

    const { accessToken, refreshToken: signedRefreshToken } =
      await this.tokenFactory
        .setUserId(user.id)
        .setSessionId(sessionId)
        .create();

    await this.sessionService.createSession(
      sessionId,
      user.id,
      signedRefreshToken,
      ipAddress,
      userAgent,
    );
    this.logger.log(`User successfully registered`);

    return {
      accessToken,
      refreshToken: signedRefreshToken,
      user,
    };
  }

  async login(
    dto: LoginUserDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<UserAuthorizedDto> {
    this.logger.log(`Login User: ${dto.email || dto.phoneNumber}`);

    if (!dto.phoneNumber && !dto.email) {
      throw new BadRequestException(
        'Please put your phone number or email here. ',
      );
    }

    const existingUser = await this.userService.findByPhoneOrEmailWithPass(
      dto.phoneNumber,
      dto.email,
    );
    if (!existingUser) {
      this.logger.warn(`User does not exist`);
      throw new UnauthorizedException('User does not exist');
    }

    const isValidPassword = await argon2.verify(
      existingUser.password,
      dto.password,
    );
    if (!isValidPassword) {
      this.logger.warn(`Invalid Password attempt for user: ${existingUser.id}`);
      throw new UnauthorizedException('Invalid password');
    }

    const sessionId = randomUUID();

    const { accessToken, refreshToken: signedRefreshToken } =
      await this.tokenFactory
        .setUserId(existingUser.id)
        .setSessionId(sessionId)
        .create();

    await this.sessionService.createSession(
      sessionId,
      existingUser.id,
      signedRefreshToken,
      ipAddress,
      userAgent,
    );

    this.logger.debug(`User logged in successfully: ${existingUser.id}`);

    return {
      accessToken,
      refreshToken: signedRefreshToken,
      user: {
        id: existingUser.id,
        email: existingUser.email,
        phoneNumber: existingUser.phoneNumber,
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        role: existingUser.role,
        createdAt: existingUser.createdAt,
      },
    };
  }

  async logout(sessionId: string, userId: string): Promise<void> {
    this.logger.log(`Logout user: ${userId}, session: ${sessionId}`);
    await this.sessionService.validateSession(sessionId, userId);
    await this.sessionService.revokeSession(sessionId);
    this.logger.log(`User logged out successfully`);
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    this.logger.log(`Refreshing token`);
    const session =
      await this.sessionService.validateRefreshToken(refreshToken);

    const { accessToken, refreshToken: newRefreshToken } =
      await this.tokenFactory
        .setUserId(session.userId)
        .setSessionId(session.id)
        .create();

    await this.sessionService.rotateRefreshToken(
      session.id,
      refreshToken,
      newRefreshToken,
    );
    this.logger.log(`Token refreshed for session: ${session.id}`);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }
}
