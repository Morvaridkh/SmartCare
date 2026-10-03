import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

interface RequestWithUser extends Request {
  user: { userId: string; sessionId: string };
}

export const CurrentUser = createParamDecorator(
  (
    data: unknown,
    ctx: ExecutionContext,
  ): { userId: string; sessionId: string } => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
