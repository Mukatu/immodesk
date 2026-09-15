import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CurrentOrganizationId,
  CurrentUser,
  Roles,
  type AuthenticatedUser,
} from '../../../shared/auth/auth.contracts';
import { ORG_HEADER, requireUser } from '../../parties/presentation/landlords.controller';
import { CommissionsQueryService } from '../application/commissions-query.service';
import { CommissionPageDto, ListCommissionsQueryDto } from './dto/commissions.dto';

@ApiTags('Commissions')
@ApiBearerAuth()
@Controller('commissions')
export class CommissionsController {
  constructor(private readonly queries: CommissionsQueryService) {}

  @Get()
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Lister les commissions, avec totaux sur l’ensemble filtré' })
  @ApiResponse({ status: 200, type: CommissionPageDto })
  async list(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: ListCommissionsQueryDto,
  ): Promise<CommissionPageDto> {
    return this.queries.list(
      organizationId,
      requireUser(user),
      query,
    ) as unknown as Promise<CommissionPageDto>;
  }
}
