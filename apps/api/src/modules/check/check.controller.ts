import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CheckService } from './check.service';
import { FindingsQueryDto } from './dto/findings-query.dto';

@ApiTags('check')
@Controller()
export class CheckController {
  constructor(private readonly checkService: CheckService) {}

  @Get('projects/:projectId/findings')
  @ApiOperation({ summary: 'Get all findings for a project with optional filters' })
  @ApiParam({ name: 'projectId', type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'severity', required: false, type: String })
  @ApiQuery({ name: 'resolved', required: false, type: Boolean })
  async getFindings(
    @Param('projectId') projectId: string,
    @Query() query: FindingsQueryDto,
  ): Promise<unknown> {
    return this.checkService.getFindings(projectId, query);
  }

  @Patch('findings/:findingId/resolve')
  @ApiOperation({ summary: 'Mark a finding as resolved' })
  @ApiParam({ name: 'findingId', type: String })
  async resolveFinding(@Param('findingId') findingId: string): Promise<unknown> {
    return this.checkService.resolveFinding(findingId);
  }
}
