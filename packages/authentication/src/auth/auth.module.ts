import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRepository } from '../users/user.repository';
import { PostgresPoolFactory } from '@SmartCare/communication';

@Module({
  controllers: [AuthController],
  providers: [AuthService, UserRepository, PostgresPoolFactory],
})
export class AuthModule {}
