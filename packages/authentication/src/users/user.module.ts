import { Module } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { PostgresPoolFactory } from '@SmartCare/communication';

@Module({
  providers: [UserRepository, UserService, PostgresPoolFactory],
  exports: [UserService],
})
export class UserModule {}
