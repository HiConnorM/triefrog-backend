import {
  Controller,
  Get,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { OrgsService } from './orgs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/roles.decorator';
import { AuthUser } from '../auth/strategies/jwt.strategy';

@ApiTags('orgs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orgs')
export class OrgsController {
  constructor(private readonly orgsService: OrgsService) {}

  // ------------------------------------------------------------ GET /orgs/:id
  @Get(':id')
  @ApiOperation({ summary: 'Get organisation by ID' })
  @ApiParam({ name: 'id', description: 'Organisation ID' })
  @ApiResponse({ status: 200, description: 'Organisation details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — not a member' })
  @ApiResponse({ status: 404, description: 'Organisation not found' })
  async getOrg(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    this.assertOrgAccess(user, id);
    return this.orgsService.findById(id);
  }

  // ------------------------------------------------------ GET /orgs/:id/members
  @Get(':id/members')
  @ApiOperation({ summary: 'List members of an organisation' })
  @ApiParam({ name: 'id', description: 'Organisation ID' })
  @ApiResponse({ status: 200, description: 'List of members' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — not a member' })
  @ApiResponse({ status: 404, description: 'Organisation not found' })
  async getMembers(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    this.assertOrgAccess(user, id);
    return this.orgsService.getMembers(id);
  }

  // ------------------------------------------------------------------ helpers
  private assertOrgAccess(user: AuthUser, orgId: string): void {
    if (user.orgId !== orgId) {
      throw new ForbiddenException(
        'You do not have access to this organisation',
      );
    }
  }
}
