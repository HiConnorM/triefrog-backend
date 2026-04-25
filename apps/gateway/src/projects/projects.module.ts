import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { HttpService } from '../http.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'change_me',
    }),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, HttpService],
})
export class ProjectsModule {}
