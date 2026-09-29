import type { SafeUserEntity } from '../../users/user.entity';

export class UserAuthorizedDto {
  accessToken: string;
  refreshToken: string;
  user: SafeUserEntity;
}
