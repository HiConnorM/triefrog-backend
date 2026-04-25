import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('projects')
  @ApiOperation({ summary: 'List projects for org' })
  async listProjects(
    @Query('orgId') orgId: string,
    @Headers('authorization') auth: string,
  ) {
    return this.projectsService.getProjects(orgId, auth);
  }

  @Post('projects')
  @ApiOperation({ summary: 'Create project' })
  async createProject(
    @Body() body: any,
    @Headers('authorization') auth: string,
  ) {
    return this.projectsService.createProject(body, auth);
  }

  @Get('projects/:id')
  @ApiOperation({ summary: 'Get project' })
  async getProject(
    @Param('id') id: string,
    @Headers('authorization') auth: string,
  ) {
    return this.projectsService.getProject(id, auth);
  }

  @Get('projects/:id/overview')
  @ApiOperation({ summary: 'Get aggregated project overview' })
  async getOverview(
    @Param('id') id: string,
    @Headers('authorization') auth: string,
  ) {
    return this.projectsService.getProjectOverview(id, auth);
  }

  @Post('projects/:id/scan')
  @ApiOperation({ summary: 'Trigger project scan' })
  async triggerScan(
    @Param('id') id: string,
    @Headers('authorization') auth: string,
    @Req() req: any,
  ) {
    const user = req.user;
    return this.projectsService.triggerScan(
      id,
      user?.userId || 'anonymous',
      auth,
    );
  }
}
