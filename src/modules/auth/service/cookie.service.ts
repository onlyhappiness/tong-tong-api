import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Request, Response } from 'express';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class CookieService {
  constructor(private readonly config: ConfigService) {}

  setSession(res: Response, token: string): void {
    const ttlDays = this.config.getOrThrow<number>('auth.sessionTtlDays');
    res.cookie(this.name(), token, {
      ...this.options(),
      maxAge: ttlDays * DAY_MS,
    });
  }

  clearSession(res: Response): void {
    res.clearCookie(this.name(), this.options());
  }

  getSessionToken(req: Request): string | undefined {
    return req.cookies?.[this.name()] as string | undefined;
  }

  private name(): string {
    return this.config.getOrThrow<string>('auth.cookieName');
  }

  private options(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: this.config.getOrThrow<string>('app.env') === 'production',
    };
  }
}
