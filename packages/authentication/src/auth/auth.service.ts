import { BadRequestException, Injectable } from '@nestjs/common';
import { RegisterUserDto } from './dtos/register-user.dto';
import { LoginUserDto } from './dtos/login-user.dto';
import * as argon2 from 'argon2';
@Injectable()
export class AuthService {
  // hello(): string {
  //   return 'Hello from AuthService!';
  // }
  async register(dto: RegisterUserDto) {
    //hash the password
    const passwordHash = await argon2.hash(dto.password);
    console.log(passwordHash);
    return {
      message: 'User registered',
    };
  }
  login(dto: LoginUserDto) {
    console.log(dto);
    return {
      message: 'login request',
    };
  }
}
