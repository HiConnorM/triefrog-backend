import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

/**
 * Allows requests that carry the correct x-internal-key header.
 * Used for server-to-server calls (e.g. Next.js API routes → connector-service)
 * without requiring a user JWT.
 */
@Injectable()
export class InternalKeyGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const key = req.headers['x-internal-key'];
    const expected = process.env.INTERNAL_SERVICE_KEY ?? 'triefrog-internal-dev';
    return key === expected;
  }
}
