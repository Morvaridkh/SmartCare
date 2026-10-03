import {
  Controller,
  Post,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { RefreshTokenDto } from '../auth/dtos/refresh-token.dto';

@Controller('auth/refresh-token')
export class RefreshTokenController {
  private readonly logger = new Logger(this.constructor.name);

  constructor(private readonly authService: AuthService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto) {
    this.logger.log('Refresh token request received');
    return this.authService.refreshToken(dto.refreshToken);
  }
}
