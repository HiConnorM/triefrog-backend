import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RepoConnectionService } from './repo-connection.service';

class CreateConnectionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ description: 'GitHub personal access token or OAuth token' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ enum: ['github'], default: 'github' })
  @IsString()
  @IsIn(['github'])
  provider: string;
}

@ApiTags('connections')
@Controller('connections')
export class RepoConnectionController {
  constructor(private readonly repoConnectionService: RepoConnectionService) {}

  @Post()
  @ApiOperation({ summary: 'Store an encrypted repo token for a project' })
  @ApiResponse({ status: 201, description: 'Connection created' })
  async createConnection(@Body() dto: CreateConnectionDto) {
    return this.repoConnectionService.createConnection(
      dto.projectId,
      dto.token,
      dto.provider,
    );
  }

  @Get(':projectId')
  @ApiOperation({ summary: 'Get connection metadata for a project (no token)' })
  @ApiResponse({ status: 200, description: 'Connection metadata' })
  async getConnection(@Param('projectId') projectId: string) {
    return this.repoConnectionService.getConnection(projectId);
  }

  @Delete(':projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove connection for a project' })
  @ApiResponse({ status: 204 })
  async deleteConnection(@Param('projectId') projectId: string): Promise<void> {
    return this.repoConnectionService.deleteConnection(projectId);
  }

  @Post(':projectId/verify')
  @ApiOperation({ summary: 'Verify the stored token works against GitHub API' })
  @ApiResponse({
    status: 200,
    description: 'Verification result',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        login: { type: 'string', nullable: true },
        error: { type: 'string', nullable: true },
      },
    },
  })
  async verifyConnection(
    @Param('projectId') projectId: string,
  ): Promise<{ valid: boolean; login: string | null; error?: string }> {
    return this.repoConnectionService.verifyConnection(projectId);
  }
}
