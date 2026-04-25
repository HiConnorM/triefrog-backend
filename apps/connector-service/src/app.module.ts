import { Module } from '@nestjs/common';
import { ProjectsModule } from './projects/projects.module';
import { RepoConnectionModule } from './repo-connection/repo-connection.module';

@Module({
  imports: [ProjectsModule, RepoConnectionModule],
})
export class AppModule {}
