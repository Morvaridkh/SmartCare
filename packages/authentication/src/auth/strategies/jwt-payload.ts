export interface JwtPayload {
  sub: string;
  sessionId: string;
  jti?: string;
  iat?: number;
  exp?: number;
}
