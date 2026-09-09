import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterUserDto } from './dtos/register-user.dto';
import { LoginUserDto } from './dtos/login-user.dto';
import { UserRepository } from '../users/user.repository';
import { UserService } from '../users/user.service';
import * as argon2 from 'argon2';
import { plainToInstance } from 'class-transformer';
import { UserEntity } from '../users/user.entity';
@Injectable()
export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly userService: UserService,
  ) {}
  async register(dto: RegisterUserDto) {
    const existingUser = await this.userService.findByPhoneOrEmailWithPass(
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
    try {
      const user = await this.userService.create({
        email: dto.email,
        phoneNumber: dto.phoneNumber,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
      });
      const safe = plainToInstance(UserEntity, user, {
        ignoreDecorators: false,
      });
      this.logger.log(`User successfully registered`);
      return {
        user: safe,
        message: 'User registered',
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
    }
  }

  async login(dto: LoginUserDto) {
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
    if (!IsValidPassword) {
      throw new UnauthorizedException('Invalid password');
    }
    return {
      message: 'login successful',
    };
  }
}
