import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthProxyController } from './auth-proxy.controller';
import { JwtStrategy } from './jwt.strategy';
import { HttpService } from '../http.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'change-me-in-production',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? '15m' },
    }),
  ],
  controllers: [AuthProxyController],
  providers: [JwtStrategy, HttpService],
  exports: [JwtStrategy, PassportModule],
})
export class AuthProxyModule {}
