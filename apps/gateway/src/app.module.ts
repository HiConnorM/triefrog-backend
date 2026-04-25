import { Module } from '@nestjs/common';
import { AuthProxyModule } from './auth/auth-proxy.module';
import { ProjectsModule } from './projects/projects.module';
import { MapModule } from './map/map.module';
import { DocsModule } from './docs/docs.module';
import { FindingsModule } from './findings/findings.module';

@Module({
  imports: [
    AuthProxyModule,
    ProjectsModule,
    MapModule,
    DocsModule,
    FindingsModule,
  ],
})
export class AppModule {}
