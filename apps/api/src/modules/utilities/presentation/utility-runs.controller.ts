import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DomainError } from '../../../shared/errors/domain-error';
import {
  CurrentOrganizationId,
  CurrentUser,
  Roles,
  type AuthenticatedUser,
} from '../../../shared/auth/auth.contracts';
import { ORG_HEADER, requireUser } from '../../parties/presentation/landlords.controller';
import { UtilityRunService } from '../application/utility-run.service';
import {
  UtilityRunAcceptedDto,
  UtilityRunInputDto,
  UtilityRunStatusDto,
} from './dto/utilities.dto';

@ApiTags('Refacturation des charges')
@ApiBearerAuth()
@Controller('billing/utility-runs')
export class UtilityRunsController {
  constructor(private readonly runs: UtilityRunService) {}

  @Post()
  @Roles('MANAGER')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Déclencher la campagne de refacturation des charges' })
  @ApiResponse({ status: 202, type: UtilityRunAcceptedDto })
  async run(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: UtilityRunInputDto,
  ): Promise<UtilityRunAcceptedDto> {
    return this.runs.run(organizationId, requireUser(user), dto);
  }

  @Get(':runId')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: "Résultat d'une campagne (lignes créées, ignorées, erreurs)" })
  @ApiResponse({ status: 200, type: UtilityRunStatusDto })
  async status(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('runId') runId: string,
  ): Promise<UtilityRunStatusDto> {
    const report = await this.runs.status(organizationId, requireUser(user), runId);
    if (!report) throw new DomainError('UTILITIES.RUN_NOT_FOUND', { runId });
    return report as unknown as UtilityRunStatusDto;
  }
}
