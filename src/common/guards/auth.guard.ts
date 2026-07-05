import { SessionService } from '@/modules/auth/service/session.service';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const cookieName = this.configService.getOrThrow<string>('auth.cookieName');
    const token = request.cookies?.[cookieName] as string | null;

    if (!token) throw new UnauthorizedException();

    const session = await this.sessionService.findValid(token);
    if (!session) throw new UnauthorizedException();

    (request as Request & { user: unknown }).user = session.user;
    return true;
  }
}
