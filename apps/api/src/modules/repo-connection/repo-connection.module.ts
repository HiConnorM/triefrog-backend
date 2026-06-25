import { Module } from '@nestjs/common';
import { RepoConnectionController } from './repo-connection.controller';
import { RepoConnectionService } from './repo-connection.service';

@Module({
  controllers: [RepoConnectionController],
  providers: [RepoConnectionService],
  exports: [RepoConnectionService],
})
export class RepoConnectionModule {}
