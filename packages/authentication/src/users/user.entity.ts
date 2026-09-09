// import { Exclude } from 'class-transformer';

export class UserEntity {
  id: string;
  email?: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  role: string;

  // @Exclude()
  password: string;

  phoneVerifiedAt?: Date;
  emailVerifiedAt?: Date;
  dAt: Date;
  updatedAt?: Date;
}

export type SafeUserEntity = Omit<UserEntity, 'password'>;
