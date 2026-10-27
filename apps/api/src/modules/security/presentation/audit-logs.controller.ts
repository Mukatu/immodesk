import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { AuditLogsService } from '../application/audit-logs.service';
import { AuditLogPageDto, ListAuditLogsQueryDto } from './dto/audit.dto';

const ORG_HEADER = {
  name: 'X-Organization-Id',
  required: true,
  description: 'Organisation courante. Positionne `app.current_organization_id` (RLS).',
};

/**
 * `GET /v1/organizations/{id}/audit-logs` — montée séparément de
 * `/security/*` : le contrat (tableau des routes) place cette route
 * directement sous `/organizations/{id}`, pas sous `/organizations/{id}/security`.
 */
@ApiTags('Sécurité — audit')
@ApiBearerAuth()
@Controller('organizations/:id/audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogs: AuditLogsService) {}

  @Get()
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: "Journal d'audit",
    description:
      'Filtrable par acteur, entité, opération, période et action ; paginé au curseur. ' +
      '`previousState`/`newState` sont renvoyés tels quels.',
  })
  @ApiResponse({ status: 200, type: AuditLogPageDto })
  async list(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListAuditLogsQueryDto,
  ): Promise<AuditLogPageDto> {
    return this.auditLogs.list(tenant.organizationId, tenant.userId, query);
  }
}
