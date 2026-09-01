import { Injectable } from '@nestjs/common';
import { PostgresPoolFactory } from '@SmartCare/communication';
import { Pool } from 'pg';
import { UserTypes } from './user.types';

@Injectable()
export class UserRepository {
  private readonly pool: Pool;
  constructor(private readonly poolFactory: PostgresPoolFactory) {
    this.pool = this.poolFactory.getPool('default');
  }
  async findById(id: string) {
    const result = await this.pool.query<UserTypes>(
      `select id, email, phone, "firstName", "lastName", password, role, "isVerified" from users where id = $1`,
      [id],
    );
    return result.rows[0];
  }
  async findByPhoneOrEmail(phoneNumber?: string, email?: string) {
    const result = await this.pool.query<UserTypes>(
      `select id, email, phone, "firstName", "lastName", password, role, "isVerified" from users where phone = $1 or email = $2`,
      [phoneNumber, email ?? null],
    );
    return result.rows[0] ?? null;
  }
  async createUser(data: {
    email?: string;
    phoneNumber: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
  }) {
    const result = await this.pool.query<UserTypes>(
      `insert into users(email, phone, "firstName", "lastName", password) 
        VALUES ($1,$2,$3,$4,$5)
        returning id, email, phone,"firstName", "lastName" ,role,"createAt","updateAt"`,
      [
        data.email,
        data.phoneNumber,
        data.firstName,
        data.lastName,
        data.passwordHash,
      ],
    );
    return result.rows[0];
  }
  async updateUser(
    id: string,
    data: {
      email?: string;
      phoneNumber?: string;
      firstName: string;
      lastName: string;
    },
  ) {
    const result = await this.pool.query<UserTypes>(
      `
      update users set email = coalesce($2, email),
                       phone = coalesce($3, phone),
                       "firstName"= coalesce($4, "firstName"),
                       "lastName"= coalesce($5, "lastName"),
                       "updateAt"=now()
                       where id = $1
                       returning id, email, phone,"firstName", "lastName" ,role,"createAt","updateAt"`,
      [
        data.email ?? null,
        data.phoneNumber ?? null,
        data.firstName ?? null,
        data.lastName ?? null,
      ],
    );
    return result.rows[0] ?? null;
  }
  async deleteUser(id: string) {
    const result = await this.pool.query<UserTypes>(
      `delete from users where id = $1 returning id`,
      [id],
    );
    return result.rows[0];
  }
}
