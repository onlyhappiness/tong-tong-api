import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface ClientInfo {
  ipAddress: string | null;
  userAgent: string | null;
}

const USER_AGENT_MAX_LENGTH = 512;

export const ClientInfoParam = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ClientInfo => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const userAgent = request.get('user-agent');

    return {
      ipAddress: request.ip ?? null,
      userAgent: userAgent ? userAgent.slice(0, USER_AGENT_MAX_LENGTH) : null,
    };
  },
);
