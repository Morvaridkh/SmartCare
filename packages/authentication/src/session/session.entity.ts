export class SessionEntity {
  id: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  //session is expired or not!
  get isExpired(): boolean {
    return new Date() >= this.expiresAt;
  }
  //session is revoked or not!
  get isRevoked(): boolean {
    return !!this.revokedAt;
  }
  //session is active or not!
  get isActive(): boolean {
    return !this.isRevoked && !this.isExpired;
  }
}
