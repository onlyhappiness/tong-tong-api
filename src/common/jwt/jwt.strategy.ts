import { UserService } from '@/user/user.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly userService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => {
          const token = req?.cookies?.authorization; // 쿠키에서 JWT 추출
          return token;
        },
      ]),
      secretOrKey: process.env.JWT_TOKEN_SECRET,
    });
  }

  async validate(payload: any) {
    const { account } = payload;

    const user = await this.userService.findUserByAccount(account);
    if (!user) {
      throw new UnauthorizedException();
    }

    return user;

    // const user = await this.userService.findUserByAccount(account);
    // if (user) {
    //   return user;
    // } else {
    //   throw new UnauthorizedException();
    // }
  }
}
