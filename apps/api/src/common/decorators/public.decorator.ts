import { SetMetadata } from '@nestjs/common';

/**
 * Marks a route as publicly accessible, bypassing the global JWT guard.
 * Use on auth endpoints (login/register/refresh) and health checks.
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
