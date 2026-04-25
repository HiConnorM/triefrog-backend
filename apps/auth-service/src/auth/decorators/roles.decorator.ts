import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Attach required roles to a route handler.
 * Usage: @Roles('admin', 'owner')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Extract the authenticated user from the request.
 * Usage: @CurrentUser() user: AuthUser
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
