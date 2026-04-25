import { Controller, Get, Patch, Param, Query, Body, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HttpService } from '../http.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const CHECK = process.env.CHECK_SERVICE_URL || 'http://localhost:3005';
const SEARCH = process.env.SEARCH_SERVICE_URL || 'http://localhost:3007';

@ApiTags('findings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class FindingsController {
  constructor(private readonly http: HttpService) {}

  @Get('projects/:id/findings')
  @ApiOperation({ summary: 'List project findings' })
  listFindings(
    @Param('id') id: string,
    @Query('category') category: string,
    @Query('severity') severity: string,
    @Query('resolved') resolved: string,
    @Headers('authorization') auth: string,
  ) {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (severity) params.set('severity', severity);
    if (resolved !== undefined) params.set('resolved', resolved);
    const qs = params.toString();
    return this.http.get(`${CHECK}/projects/${id}/findings${qs ? '?' + qs : ''}`, auth);
  }

  @Patch('findings/:findingId/resolve')
  @ApiOperation({ summary: 'Resolve a finding' })
  resolveFinding(
    @Param('findingId') findingId: string,
    @Body() body: any,
    @Headers('authorization') auth: string,
  ) {
    return this.http.patch(`${CHECK}/findings/${findingId}/resolve`, body, auth);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search entities and docs' })
  search(
    @Query('q') q: string,
    @Query('projectId') projectId: string,
    @Headers('authorization') auth: string,
  ) {
    const params = new URLSearchParams({ q });
    if (projectId) params.set('projectId', projectId);
    return this.http.get(`${SEARCH}/search?${params.toString()}`, auth);
  }

  @Get('projects/:id/scan/stream')
  @ApiOperation({ summary: 'SSE scan progress stream' })
  scanStream(
    @Param('id') id: string,
    @Headers('authorization') auth: string,
  ) {
    // This endpoint is handled by passing through to realtime-service
    // The gateway returns the stream URL for the frontend to connect directly
    const REALTIME = process.env.REALTIME_SERVICE_URL || 'http://localhost:3008';
    return { streamUrl: `${REALTIME}/projects/${id}/scan/stream` };
  }
}
