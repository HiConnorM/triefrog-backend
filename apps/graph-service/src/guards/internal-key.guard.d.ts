import { CanActivate, ExecutionContext } from '@nestjs/common';
/**
 * Allows requests that carry the correct x-internal-key header.
 * Used for server-to-server calls (e.g. Next.js API routes → connector-service)
 * without requiring a user JWT.
 */
export declare class InternalKeyGuard implements CanActivate {
    canActivate(ctx: ExecutionContext): boolean;
}
//# sourceMappingURL=internal-key.guard.d.ts.map