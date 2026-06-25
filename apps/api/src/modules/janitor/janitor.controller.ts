import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JanitorService } from './janitor.service';

@ApiTags('janitor')
@ApiBearerAuth()
@Controller()
export class JanitorController {
  constructor(private readonly janitorService: JanitorService) {}

  @Get('projects/:id/janitor')
  @ApiOperation({ summary: 'Run Janitor Mode analysis and return full JanitorReport' })
  @ApiParam({ name: 'id', type: String })
  async getJanitorReport(@Param('id') id: string) {
    return this.janitorService.analyze(id);
  }

  @Get('projects/:id/janitor/summary')
  @ApiOperation({ summary: 'Lightweight Janitor summary — score, risk level, and counts' })
  @ApiParam({ name: 'id', type: String })
  async getJanitorSummary(@Param('id') id: string) {
    const report = await this.janitorService.analyze(id);
    return {
      projectId: report.projectId,
      cleanlinessScore: report.cleanlinessScore,
      aiMessRisk: report.aiMessRisk,
      scannedAt: report.scannedAt,
      stats: report.stats,
    };
  }
}
