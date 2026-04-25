import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiHeader,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto, ProjectDto } from './dto/project.dto';

@ApiTags('projects')
@ApiHeader({ name: 'x-org-id', description: 'Organization ID from gateway JWT', required: true })
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List projects for an organization' })
  @ApiQuery({ name: 'orgId', required: true, type: String })
  @ApiResponse({ status: 200, type: [ProjectDto] })
  async getProjects(
    @Query('orgId') queryOrgId?: string,
    @Headers('x-org-id') headerOrgId?: string,
  ): Promise<ProjectDto[]> {
    const orgId = queryOrgId || headerOrgId || '';
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
