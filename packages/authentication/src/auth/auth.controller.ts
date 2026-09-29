import {
  Controller,
  Post,
  Body,
  Logger,
  Ip,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dtos/register-user.dto';
import { LoginUserDto } from './dtos/login-user.dto';
import { UserAuthorizedDto } from './dtos/user-authorized.dto';
import { LoginRateLimitGuard } from './guards/login-rate-limit.guard';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(this.constructor.name);

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  // todo: Its better to specify return type like: Promise<UserAuthorizedDto>
  async register(
    @Body() dto: RegisterUserDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<UserAuthorizedDto> {
    this.logger.log('register request received');
    // todo read userAgent + userIp ->
    //  - pass them inside service to store inside session
    //  - you also can run rate limiter based on ip for prevent attacks
    return this.authService.register(dto, ipAddress, userAgent);
  }

  @Post('login')
  @UseGuards(LoginRateLimitGuard)
  async login(
    @Body() dto: LoginUserDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<UserAuthorizedDto> {
    this.logger.log('login request received');
    // todo read userAgent + userIp ->
    //  - pass them inside service to store inside session
    //  - you also can run rate limiter based on ip for prevent attacks
    return this.authService.login(dto, ipAddress, userAgent);
  }
}
