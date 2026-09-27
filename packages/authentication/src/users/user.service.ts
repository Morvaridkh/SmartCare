import {
  ConflictException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { UserRepository } from './user.repository';
import { SafeUserEntity, UserEntity } from './user.entity';
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(private readonly userRepository: UserRepository) {}
  async findById(id: string): Promise<SafeUserEntity | null> {
    this.logger.debug(`Finding user by id ${id}`);
    const user = await this.userRepository.findById(id);
    if (!user) {
      this.logger.warn(`User with id ${id} not found`);
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  async findByPhoneOrEmailWithPass(
    phoneNumber?: string,
    email?: string,
  ): Promise<UserEntity | null> {
    this.logger.debug(`Finding user by phone number or email`, {
      phoneNumber,
      email,
    });
    return this.userRepository.findByPhoneOrEmailWithPass(phoneNumber, email);
  }

  async findByPhoneOrEmail(
    phoneNumber?: string,
    email?: string,
  ): Promise<SafeUserEntity | null> {
    this.logger.debug(`Finding user by phone number or email`, {
      phoneNumber,
      email,
    });
    return this.userRepository.findByPhoneOrEmail(phoneNumber, email);
  }

  async findByEmail(email: string): Promise<SafeUserEntity | null> {
    this.logger.debug(`Finding user by email: ${email}`);
    return this.userRepository.findByEmail(email);
  }

  async findByPhone(phone: string): Promise<SafeUserEntity | null> {
    this.logger.debug(`Finding user by phone: ${phone}`);
    return this.userRepository.findByPhone(phone);
  }

  async create(data: {
    email?: string;
    phoneNumber: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
  }): Promise<SafeUserEntity> {
    this.logger.log(
      `creating user with phoneNumber or Email`,
      data.phoneNumber,
      data.email,
    );
    const existingUser = await this.userRepository.findByPhoneOrEmailWithPass(
      data.phoneNumber,
      data.email,
    );
    if (existingUser) {
      this.logger.warn(`User already exists: ${data.phoneNumber}`);
      throw new ConflictException('Phone number or email already exists');
    }
    this.logger.debug(`Creating user with phoneNumber`, {
      phoneNumber: data.phoneNumber,
    });
    return this.userRepository.User(data);
  }

  async update(
    id: string,
    data: {
      email?: string;
      phoneNumber?: string;
      firstName: string;
      lastName: string;
    },
  ): Promise<SafeUserEntity | null> {
    this.logger.log(`Update user: ${id}`);
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      this.logger.warn(`User not found to update: ${id}`);
      throw new NotFoundException('User not found to update');
    }
    if (data.email) {
      const existing = await this.userRepository.findByEmail(data.email);
      if (existing && existing.id !== id) {
        throw new ConflictException('Email already exists');
      }
    }
    if (data.phoneNumber) {
      const existing = await this.userRepository.findByPhone(data.phoneNumber);
      if (existing && existing.id !== id) {
        throw new ConflictException('Phone number already exists');
      }
    }
    return this.userRepository.updateUser(id, data);
  }
  async deleteUser(id: string): Promise<SafeUserEntity | null> {
    this.logger.log(`Delete user by id ${id}`);
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundException('User not found to delete');
    }
    this.logger.debug(`Deleting user with id ${id}`);
    return this.userRepository.deleteUser(id);
  }
}
