import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PostgresPoolFactory } from '@SmartCare/communication';
import { Pool } from 'pg';
import { SafeUserEntity, UserEntity } from './user.entity';

@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);
  private readonly pool: Pool;
  private readonly selectFields = ` id, email, phone, "firstName", "lastName", role, "phoneVerifiedAt", "emailVerifiedAt", "dAt", "updatedAt"`;
  constructor(private readonly poolFactory: PostgresPoolFactory) {
    this.pool = this.poolFactory.getPool('default');
  }

  async findById(id: string): Promise<SafeUserEntity | null> {
    this.logger.debug(`Finding user by id ${id}`);
    try {
      const result = await this.pool.query<SafeUserEntity>(
        `select ${this.selectFields} from users where id = $1`,
        [id],
      );
      return result.rows[0] ?? null;
    } catch (error) {
      this.logger.error(`Failed to find user by id ${id}:`, error);
      throw new InternalServerErrorException(`Failed to find user`);
    }
  }

  async findByEmail(email: string): Promise<SafeUserEntity | null> {
    this.logger.debug(`Finding user by email ${email}`);
    try {
      const result = await this.pool.query<SafeUserEntity>(
        `select ${this.selectFields} from users where email = $1`,
        [email],
      );
      return result.rows[0] ?? null;
    } catch (error) {
      this.logger.error(`Failed to find user by email ${email}:`, error);
      throw new InternalServerErrorException(`Failed to find user by email`);
    }
  }

  async findByPhone(phone: string): Promise<SafeUserEntity | null> {
    this.logger.debug(`Finding user by phone ${phone}`);
    try {
      const result = await this.pool.query<SafeUserEntity>(
        `select ${this.selectFields} from users where phone = $1`,
        [phone],
      );
      return result.rows[0] ?? null;
    } catch (error) {
      this.logger.error(`Failed to find user by phone ${phone}:`, error);
      throw new InternalServerErrorException(`Failed to find user by phone`);
    }
  }
  //Only use for login
  async findByPhoneOrEmailWithPass(
    phoneNumber?: string,
    email?: string,
  ): Promise<UserEntity | null> {
    this.logger.debug(`Finding user by phone or email`);
    try {
      const result = await this.pool.query<UserEntity>(
        `select ${this.selectFields},password from users where phone = $1 or email = $2 limit 1`,
        [phoneNumber, email ?? null],
      );
      return result.rows[0] ?? null;
    } catch (error) {
      this.logger.error(`Failed to find user by phone or email`, error);
      throw new InternalServerErrorException(`Failed to find user`);
    }
  }

  async findByPhoneOrEmail(
    phoneNumber?: string,
    email?: string,
  ): Promise<SafeUserEntity | null> {
    this.logger.debug(`Finding user by phone or email`);
    try {
      const result = await this.pool.query<SafeUserEntity>(
        `select ${this.selectFields} from users where phone = $1 or email = $2 limit 1`,
        [phoneNumber, email ?? null],
      );
      return result.rows[0] ?? null;
    } catch (error) {
      this.logger.error(`Failed to find user by phone or email`, error);
      throw new InternalServerErrorException(`Failed to find user`);
    }
  }

  async User(data: {
    email?: string;
    phoneNumber: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
  }): Promise<SafeUserEntity> {
    this.logger.debug(`Creating user:`);
    try {
      const result = await this.pool.query<SafeUserEntity>(
        `insert into users(email, phone, "firstName", "lastName", password) 
        VALUES ($1,$2,$3,$4,$5)
        returning ${this.selectFields}`,
        [
          data.email,
          data.phoneNumber,
          data.firstName,
          data.lastName,
          data.passwordHash,
        ],
      );
      this.logger.debug(`User d: ${result.rows[0].id}`);
      return result.rows[0];
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === '23505') {
        this.logger.warn(
          `Duplicate user: User with this email or phone already exists`,
        );
        throw new ConflictException('Phone number or email already exists');
      }
      this.logger.error(`Failed to  user:`, error);
      throw new InternalServerErrorException('Failed to  user');
    }
  }
  async updateUser(
    id: string,
    data: {
      email?: string;
      phoneNumber?: string;
      firstName?: string;
      lastName?: string;
    },
  ): Promise<SafeUserEntity | null> {
    this.logger.debug(`Updating user: ${id}`);
    try {
      const result = await this.pool.query<SafeUserEntity>(
        `
      update users set email = coalesce($2, email),
                       phone = coalesce($3, phone),
                       "firstName"= coalesce($4, "firstName"),
                       "lastName"= coalesce($5, "lastName"),
                       "updateAt"=now()
                       where id = $1
                       returning id, email, phone,"firstName", "lastName" ,role,"phoneVerifiedAt", "emailVerifiedAt","createAt","updateAt"`,
        [
          id,
          data.email ?? null,
          data.phoneNumber ?? null,
          data.firstName ?? null,
          data.lastName ?? null,
        ],
      );
      this.logger.debug(`User Updated`);
      return result.rows[0] ?? null;
    } catch (error) {
      this.logger.error(`Failed to update user:`);
      throw error;
    }
  }
  async deleteUser(id: string): Promise<SafeUserEntity | null> {
    this.logger.debug(`Deleting user by id: ${id}`);
    try {
      const result = await this.pool.query<SafeUserEntity>(
        `delete from users where id = $1 returning id`,
        [id],
      );
      if (!result.rows[0]) {
        this.logger.warn(`User not found to be deleted: ${id}`);
        return null;
      }
      this.logger.log('User Deleted');
      return result.rows[0];
    } catch (error) {
      this.logger.error(`Failed to delete user by id ${id}:`, error);
      throw new InternalServerErrorException('Failed to delete user');
    }
  }
}
