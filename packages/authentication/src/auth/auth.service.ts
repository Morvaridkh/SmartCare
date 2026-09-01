import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterUserDto } from './dtos/register-user.dto';
import { LoginUserDto } from './dtos/login-user.dto';
import { UserRepository } from '../users/user.repository';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async register(dto: RegisterUserDto) {
    const existingUser = await this.userRepository.findByPhoneOrEmail(
      dto.phoneNumber,
      dto.email,
    );
    if (existingUser) {
      throw new ConflictException('Phone number or email already exists');
    }
    //hash the password
    const passwordHash = await argon2.hash(dto.password);
    //create user
    const user = await this.userRepository.createUser({
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      firstName: dto.firstName,
      lastName: dto.lastName,
      passwordHash,
    });
    return {
      user,
      message: 'User registered',
    };
  }

  async login(dto: LoginUserDto) {
    if (!dto.phoneNumber && !dto.email) {
      throw new BadRequestException(
        'Please put your phone number or email here. ',
      );
    }
    const existingUser = await this.userRepository.findByPhoneOrEmail(
      dto.phoneNumber,
      dto.email,
    );
    if (!existingUser) {
      throw new UnauthorizedException('User does not exist');
    }
    const IsValidPassword = await argon2.verify(
      existingUser.password,
      dto.password,
    );
    if (!IsValidPassword) {
      throw new UnauthorizedException('Invalid password');
    }
    return {
      message: 'login successful',
    };
  }
}
