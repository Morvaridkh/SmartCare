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
  private readonly selectFields = `
    id,
    email,
    phone AS "phoneNumber",
    "firstName",
    "lastName",
    role,
    "phoneVerifiedAt",
    "emailVerifiedAt",
    "createAt" AS "createdAt",
    "updateAt" AS "updatedAt"
  `;
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
        `select ${this.selectFields},password from users where ($1::varchar(15) is not null and phone = $1) or ($2::varchar(320) is not null and email = $2) limit 1`,
        [phoneNumber ?? null, email ?? null],
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
        `select ${this.selectFields} from users where ($1::varchar(15) is not null and phone = $1) or ($2::varchar(320) is not null and email = $2) limit 1`,
        [phoneNumber ?? null, email ?? null],
      );
      return result.rows[0] ?? null;
    } catch (error) {
      this.logger.error(`Failed to find user by phone or email`, error);
      throw new InternalServerErrorException(`Failed to find user`);
    }
  }

  async createUser(data: {
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
      const updates: string[] = [];
      const values: unknown[] = [id];
      let idx = 2;

      if (data.email !== undefined) {
        updates.push(`email = $${idx++}`);
        values.push(data.email);
      }

      if (data.phoneNumber !== undefined) {
        updates.push(`phone = $${idx++}`);
        values.push(data.phoneNumber);
      }

      if (data.firstName !== undefined) {
        updates.push(`"firstName" = $${idx++}`);
        values.push(data.firstName);
      }

      if (data.lastName !== undefined) {
        updates.push(`"lastName" = $${idx++}`);
        values.push(data.lastName);
      }

      if (updates.length === 0) {
        return this.findById(id);
      }

      updates.push(`"updatedAt" = NOW()`);

      const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING ${this.selectFields}
    `;

      const result = await this.pool.query<SafeUserEntity>(query, values);

      this.logger.debug(`User Updated: ${id}`);

      return result.rows[0] ?? null;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === '23505') {
        this.logger.warn(
          `Duplicate user: User with this email or phone already exists`,
        );
        throw new ConflictException('Email or phone already exists');
      }
      this.logger.error(`Failed to update user:`);
      throw new InternalServerErrorException('Failed to update user');
    }
  }
  async deleteUser(id: string): Promise<{ id: string } | null> {
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
