import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HttpService } from '../http.service';

const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';

@ApiTags('auth')
@Controller('auth')
export class AuthProxyController {
  constructor(private readonly http: HttpService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  async register(
    @Body() body: Record<string, unknown>,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.http.post(
      `${AUTH_SERVICE_URL}/auth/register`,
      body,
      requestId ? { 'x-request-id': requestId } : undefined,
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and obtain tokens' })
  async login(
    @Body() body: Record<string, unknown>,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.http.post(
      `${AUTH_SERVICE_URL}/auth/login`,
      body,
      requestId ? { 'x-request-id': requestId } : undefined,
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Body() body: Record<string, unknown>,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.http.post(
      `${AUTH_SERVICE_URL}/auth/refresh`,
      body,
      requestId ? { 'x-request-id': requestId } : undefined,
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  async logout(
    @Body() body: Record<string, unknown>,
    @Headers('authorization') authorization?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const headers: Record<string, string> = {};
    if (authorization) headers['authorization'] = authorization;
    if (requestId) headers['x-request-id'] = requestId;

    return this.http.post(
      `${AUTH_SERVICE_URL}/auth/logout`,
      body,
      Object.keys(headers).length > 0 ? headers : undefined,
    );
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authenticated user profile' })
  async me(
    @Headers('authorization') authorization?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const headers: Record<string, string> = {};
    if (authorization) headers['authorization'] = authorization;
    if (requestId) headers['x-request-id'] = requestId;

    return this.http.get(
      `${AUTH_SERVICE_URL}/auth/me`,
      Object.keys(headers).length > 0 ? headers : undefined,
    );
  }
}
