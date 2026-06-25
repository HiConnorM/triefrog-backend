import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { HealthController } from './health.controller';

// Domain modules — each preserves its bounded context; collapsed into one
// runtime. HTTP is served here; the heavy scan job runs in apps/worker.
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrgsModule } from './modules/orgs/orgs.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { RepoConnectionModule } from './modules/repo-connection/repo-connection.module';
import { ScanModule } from './modules/scan/scan.module';
import { GraphModule } from './modules/graph/graph.module';
import { CheckModule } from './modules/check/check.module';
import { JanitorModule } from './modules/janitor/janitor.module';
import { DocsModule } from './modules/docs/docs.module';
import { SearchModule } from './modules/search/search.module';
import { RealtimeModule } from './modules/realtime/realtime.module';

@Module({
  imports: [
    // Shared queue connection. The API produces `scan` jobs and consumes the
    // light post-scan jobs (`graph`, `check`, `docs`) via in-module processors.
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    AuthModule,
    UsersModule,
    OrgsModule,
    ProjectsModule,
    RepoConnectionModule,
    ScanModule,
    GraphModule,
    CheckModule,
    JanitorModule,
    DocsModule,
    SearchModule,
    RealtimeModule,
  ],
  controllers: [HealthController],
  // Authenticate every route by default; @Public() opts specific routes out.
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
