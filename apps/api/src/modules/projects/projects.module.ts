import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { CheckModule } from '../check/check.module';
import { ScanModule } from '../scan/scan.module';

@Module({
  // Overview aggregation and scan triggering reuse the check and scan
  // services directly (in-process) instead of the old HTTP fan-out.
  imports: [CheckModule, ScanModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
