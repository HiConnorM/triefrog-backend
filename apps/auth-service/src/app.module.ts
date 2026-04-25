import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrgsModule } from './orgs/orgs.module';

@Module({
  imports: [AuthModule, UsersModule, OrgsModule],
})
export class AppModule {}
