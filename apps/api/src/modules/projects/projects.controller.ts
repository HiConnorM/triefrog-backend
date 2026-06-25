import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto, ProjectDto } from './dto/project.dto';
import { CurrentUser } from '../auth/decorators/roles.decorator';
import { AuthUser } from '../auth/strategies/jwt.strategy';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List projects for an organization' })
  @ApiQuery({ name: 'orgId', required: true, type: String })
  @ApiResponse({ status: 200, type: [ProjectDto] })
  async getProjects(
    @CurrentUser() user: AuthUser,
    @Query('orgId') queryOrgId?: string,
  ): Promise<ProjectDto[]> {
    const orgId = queryOrgId || user.orgId || '';
    return this.projectsService.getProjects(orgId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, type: ProjectDto })
  async createProject(@Body() dto: CreateProjectDto): Promise<ProjectDto> {
    return this.projectsService.createProject(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project by ID' })
  @ApiResponse({ status: 200, type: ProjectDto })
  async getProject(@Param('id') id: string): Promise<ProjectDto> {
    return this.projectsService.getProject(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a project' })
  @ApiResponse({ status: 200, type: ProjectDto })
  async updateProject(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectDto> {
    return this.projectsService.updateProject(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a project' })
  @ApiResponse({ status: 204 })
  async deleteProject(@Param('id') id: string): Promise<void> {
    return this.projectsService.deleteProject(id);
  }

  @Get(':id/overview')
  @ApiOperation({ summary: 'Aggregated project overview: shippability, health cards, latest scan' })
  async getOverview(@Param('id') id: string): Promise<unknown> {
    return this.projectsService.getOverview(id);
  }

  @Post(':id/scan')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger a new scan for a project' })
  async triggerScan(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ scanId: string }> {
    return this.projectsService.triggerScan(id, user.userId);
  }

  @Get(':id/repos')
  @ApiOperation({ summary: 'List GitHub repos for a project' })
  @ApiResponse({
    status: 200,
    description: 'Returns repo list (empty until GitHub is connected)',
  })
  async getRepos(@Param('id') id: string): Promise<{
    repos: any[];
    note: string;
  }> {
    // Ensure project exists
    await this.projectsService.getProject(id);

    return {
      repos: [],
      note: 'Connect GitHub first',
    };
  }
}
