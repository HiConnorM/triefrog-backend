import { Controller, Get, Post, Param, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HttpService } from '../http.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const DOCS = process.env.DOCS_SERVICE_URL || 'http://localhost:3006';

@ApiTags('docs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class DocsController {
  constructor(private readonly http: HttpService) {}

  @Get('projects/:id/docs')
  @ApiOperation({ summary: 'List project docs' })
  listDocs(@Param('id') id: string, @Headers('authorization') auth: string) {
    return this.http.get(`${DOCS}/projects/${id}/docs`, auth);
  }

  @Get('docs/:docId')
  @ApiOperation({ summary: 'Get doc content' })
  getDoc(@Param('docId') docId: string, @Headers('authorization') auth: string) {
    return this.http.get(`${DOCS}/docs/${docId}`, auth);
  }

  @Post('projects/:id/docs/generate')
  @ApiOperation({ summary: 'Generate all docs for project' })
  generateDocs(@Param('id') id: string, @Headers('authorization') auth: string) {
    return this.http.post(`${DOCS}/projects/${id}/docs/generate`, {}, auth);
  }

  @Post('docs/:docId/verify')
  @ApiOperation({ summary: 'Verify/attest a doc' })
  verifyDoc(@Param('docId') docId: string, @Headers('authorization') auth: string) {
    return this.http.post(`${DOCS}/docs/${docId}/verify`, { attestedBy: 'user' }, auth);
  }

  @Post('projects/:id/docs/export-pr')
  @ApiOperation({ summary: 'Export docs as GitHub PR' })
  exportPr(@Param('id') id: string, @Headers('authorization') auth: string) {
    return this.http.post(`${DOCS}/projects/${id}/docs/export-pr`, {}, auth);
  }
}
