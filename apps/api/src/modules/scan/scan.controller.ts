import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ScanService } from './scan.service';
import { TriggerScanDto } from './dto/trigger-scan.dto';

@ApiTags('scans')
@Controller('scans')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Trigger a new scan for a project' })
  @ApiResponse({ status: 201, description: 'Scan created and queued' })
  async triggerScan(@Body() dto: TriggerScanDto): Promise<{ scanId: string }> {
    const scan = await this.scanService.triggerScan(dto.projectId, dto.triggeredBy);
    return { scanId: scan.id };
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'List all scans for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'List of scans' })
  async getProjectScans(@Param('projectId') projectId: string): Promise<{ scans: unknown[] }> {
    const scans = await this.scanService.getProjectScans(projectId);
    return { scans };
  }

  @Get(':scanId')
  @ApiOperation({ summary: 'Get a scan by ID' })
  @ApiParam({ name: 'scanId', description: 'Scan ID' })
  @ApiResponse({ status: 200, description: 'Scan details' })
  async getScan(@Param('scanId') scanId: string): Promise<{ scan: unknown }> {
    const scan = await this.scanService.getScan(scanId);
    return { scan };
  }
}
