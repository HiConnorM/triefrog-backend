import { Controller, Get, Patch, Param, Body, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HttpService } from '../http.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const GRAPH = process.env.GRAPH_SERVICE_URL || 'http://localhost:3004';

@ApiTags('map')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class MapController {
  constructor(private readonly http: HttpService) {}

  @Get('projects/:id/map')
  @ApiOperation({ summary: 'Get project graph map payload' })
  getMap(@Param('id') id: string, @Headers('authorization') auth: string) {
    return this.http.get(`${GRAPH}/projects/${id}/map`, auth);
  }

  @Get('projects/:id/trie')
  @ApiOperation({ summary: 'Get project trie tree' })
  getTrie(@Param('id') id: string, @Headers('authorization') auth: string) {
    return this.http.get(`${GRAPH}/projects/${id}/trie`, auth);
  }

  @Get('nodes/:nodeId')
  @ApiOperation({ summary: 'Get node detail' })
  getNode(@Param('nodeId') nodeId: string, @Headers('authorization') auth: string) {
    return this.http.get(`${GRAPH}/nodes/${nodeId}`, auth);
  }

  @Patch('nodes/:nodeId/status')
  @ApiOperation({ summary: 'Update node status' })
  updateStatus(
    @Param('nodeId') nodeId: string,
    @Body() body: { status: string },
    @Headers('authorization') auth: string,
  ) {
    return this.http.patch(`${GRAPH}/nodes/${nodeId}/status`, body, auth);
  }
}
