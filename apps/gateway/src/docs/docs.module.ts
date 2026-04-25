import { Module } from '@nestjs/common';
import { DocsController } from './docs.controller';
import { HttpService } from '../http.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET || 'change_me' })],
  controllers: [DocsController],
  providers: [HttpService],
})
export class DocsModule {}
