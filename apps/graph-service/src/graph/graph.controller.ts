import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { GraphService } from './graph.service';
import { UpdateNodeStatusDto } from './dto/update-node-status.dto';

@ApiTags('graph')
@Controller()
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  @Get('projects/:projectId/map')
  @ApiOperation({ summary: 'Get graph map payload (nodes + edges) for a project' })
  @ApiParam({ name: 'projectId', type: String })
  async getMap(@Param('projectId') projectId: string): Promise<unknown> {
    return this.graphService.getMapPayload(projectId);
  }

  @Get('projects/:projectId/trie')
  @ApiOperation({ summary: 'Get trie tree structure for a project' })
  @ApiParam({ name: 'projectId', type: String })
  async getTrie(@Param('projectId') projectId: string): Promise<unknown> {
    return this.graphService.getTriePayload(projectId);
  }

  @Get('nodes/:nodeId')
  @ApiOperation({ summary: 'Get detailed node with relationships, findings, and docs' })
  @ApiParam({ name: 'nodeId', type: String })
  async getNode(@Param('nodeId') nodeId: string): Promise<unknown> {
    return this.graphService.getNodeDetail(nodeId);
  }

  @Patch('nodes/:nodeId/status')
  @ApiOperation({ summary: 'Update node status' })
  @ApiParam({ name: 'nodeId', type: String })
  async updateNodeStatus(
    @Param('nodeId') nodeId: string,
    @Body() dto: UpdateNodeStatusDto,
  ): Promise<unknown> {
    return this.graphService.updateNodeStatus(nodeId, dto.status);
  }
}
