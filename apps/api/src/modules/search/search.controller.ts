import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { SearchService, SearchResult } from './search.service';

class SearchQueryDto {
  @IsString()
  @IsNotEmpty()
  q: string;

  @IsString()
  @IsOptional()
  projectId?: string;
}

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search entities and docs using Postgres ILIKE' })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Search query' })
  @ApiQuery({ name: 'projectId', required: false, type: String, description: 'Scope to a specific project' })
  @ApiResponse({
    status: 200,
    description: 'Search results',
    schema: {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: ['entity', 'doc'] },
              title: { type: 'string' },
              excerpt: { type: 'string' },
              projectId: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async search(
    @Query() query: SearchQueryDto,
  ): Promise<{ results: SearchResult[] }> {
    const results = await this.searchService.search(query.q, query.projectId);
    return { results };
  }
}
