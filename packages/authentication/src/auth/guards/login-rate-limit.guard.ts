import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface AttemptWindow {
  timestamps: number[];
}

@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  private readonly maxAttempts = 5;
  private readonly windowMs = 15 * 60 * 1000;
  private readonly attemptsByIp = new Map<string, AttemptWindow>();

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const ipAddress = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    const now = Date.now();
    const window = this.attemptsByIp.get(ipAddress) ?? { timestamps: [] };

    window.timestamps = window.timestamps.filter(
      (timestamp) => timestamp > now - this.windowMs,
    );

    if (window.timestamps.length >= this.maxAttempts) {
      const retryAfterSeconds = Math.ceil(
        (window.timestamps[0] + this.windowMs - now) / 1000,
      );
      response.setHeader('Retry-After', String(retryAfterSeconds));
      throw new HttpException(
        'Too many login attempts. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    window.timestamps.push(now);
    this.attemptsByIp.set(ipAddress, window);
    return true;
  }
}
