import { CookieService } from '@/modules/auth/service/cookie.service';
import { SessionService } from '@/modules/auth/service/session.service';
import { User } from '@/modules/user/model/user.entity';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly sessionService: SessionService,
    private readonly cookieService: CookieService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();

    const token = this.cookieService.getSessionToken(request);
    if (!token) throw new UnauthorizedException();

    const validated = await this.sessionService.findValid(token);
    if (!validated) throw new UnauthorizedException();

    // 서버 만료가 밀렸으면 쿠키 만료도 같이 밀어야 한다.
    // DB만 갱신하면 브라우저가 먼저 쿠키를 버려서, 세션은 살아있는데
    // 클라이언트가 토큰을 잃는 상태가 된다.
    if (validated.renewed) {
      this.cookieService.setSession(http.getResponse<Response>(), token);
    }

    (request as Request & { user: User }).user = validated.session.user;
    return true;
  }
}
