import { Injectable, Scope } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';

export interface TokenResult {
  accessToken: string;
  refreshToken: string;
}
@Injectable({ scope: Scope.TRANSIENT })
export class TokenFactory {
  private userId: string = '';
  private sessionId: string = '';
  private accessTokenExpiry = 15 * 60; // 15 min
  private refreshTokenExpiry = 24 * 60 * 60;// 1 day
  private tokenId: string = randomUUID();
  constructor(private readonly jwtService: JwtService) {}

  setUserId(userId: string): this {
    this.userId = userId;
    return this;
  }

  setSessionId(sessionId: string): this {
    this.sessionId = sessionId;
    return this;
  }

  setAccessTokenExpiry(expiry: number): this {
    this.accessTokenExpiry = expiry;
    return this;
  }
  setRefreshTokenExpiry(expiry: number): this {
    this.refreshTokenExpiry = expiry;
    return this;
  }
  setTokenId(tokenId?: string): this {
    if (tokenId) {
      this.tokenId = tokenId;
    }
    return this;
  }
  private validate(): void {
    if (!this.userId){
      throw new Error(`User id is required`);
    }
    if (!this.sessionId){
      throw new Error(`Session id is required`);
    }
  }
  //create token:
  async create(): Promise<TokenResult> {
    this.validate();

    const accessPayload = {
      sub: this.userId,
      sessionId: this.sessionId,
      jti: this.tokenId,
    };

    const refreshPayload = {
      sub: this.userId,
      sessionId: this.sessionId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        expiresIn: this.accessTokenExpiry,
      }),
      this.jwtService.signAsync(refreshPayload, {
        expiresIn: this.refreshTokenExpiry,
      }),
    ]);
    return { accessToken, refreshToken };
  }

  reset(): this {
    this.userId = '';
    this.sessionId = '';
    this.accessTokenExpiry = 15 * 60;
    this.refreshTokenExpiry = 24 * 60 * 60;
    this.tokenId = randomUUID();
    return this;
  }
}
