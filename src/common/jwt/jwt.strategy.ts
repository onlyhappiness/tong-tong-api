import { UserService } from '@/user/service/user.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Payload } from './jwt.payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_ACESS_TOKEN_SECRET,
      ignoreExpiration: false,
    });
  }

  async validate(payload: Payload) {
    const { email } = payload;

    const user = await this.userService.findUserByEmail(email);
    if (user) {
      return user;
    } else {
      throw new UnauthorizedException();
    }
  }
}
