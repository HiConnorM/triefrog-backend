import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DocsService } from './docs.service';

export class DocDto {
  id: string;
  projectId: string;
  type: string;
  title: string;
  status: string;
  content?: string;
  lastVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class VerifyDocDto {
  attestedBy: string;
}

@ApiTags('docs')
@ApiBearerAuth()
@Controller()
export class DocsController {
  constructor(private readonly docsService: DocsService) {}

  @Get('projects/:projectId/docs')
  @ApiOperation({ summary: 'Get all docs for a project' })
  @ApiResponse({ status: 200, description: 'List of docs' })
  async getDocs(
    @Param('projectId') projectId: string,
  ): Promise<{ docs: DocDto[] }> {
    const docs = await this.docsService.getDocs(projectId);
    return { docs };
  }

  @Get('docs/:docId')
  @ApiOperation({ summary: 'Get a single doc with content' })
  @ApiResponse({ status: 200, description: 'Doc with content' })
  async getDoc(@Param('docId') docId: string): Promise<DocDto> {
    return this.docsService.getDoc(docId);
  }

  @Post('projects/:projectId/docs/generate')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger doc generation for a project' })
  @ApiResponse({ status: 202, description: 'Doc generation triggered' })
  async generateDocs(
    @Param('projectId') projectId: string,
  ): Promise<{ docIds: string[] }> {
    return this.docsService.generateDocs(projectId);
  }

  @Post('docs/:docId/verify')
  @ApiOperation({ summary: 'Verify a doc' })
  @ApiResponse({ status: 200, description: 'Doc verified' })
  async verifyDoc(
    @Param('docId') docId: string,
    @Body() body: VerifyDocDto,
  ): Promise<DocDto> {
    return this.docsService.verifyDoc(docId, body.attestedBy);
  }

  @Post('projects/:projectId/docs/export-pr')
  @ApiOperation({ summary: 'Export docs as a pull request' })
  @ApiResponse({ status: 200, description: 'PR created' })
  async exportPr(
    @Param('projectId') projectId: string,
  ): Promise<{ prUrl: string; message: string }> {
    return this.docsService.exportPr(projectId);
  }
}
