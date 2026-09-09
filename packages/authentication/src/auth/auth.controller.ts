import { Controller, Post, Body, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dtos/register-user.dto';
import { LoginUserDto } from './dtos/login-user.dto';

@Controller('auth')
export class AuthController {
  private readonly logger= new Logger(AuthController.name);
  constructor(private readonly authService: AuthService) {}
  @Post('register')
  register(@Body() dto: RegisterUserDto) {
    this.logger.log('register request received');
    return this.authService.register(dto);
  }
  @Post('login')
  login(@Body() dto: LoginUserDto) {
    this.logger.log('login request received');
    return this.authService.login(dto);
  }
}
