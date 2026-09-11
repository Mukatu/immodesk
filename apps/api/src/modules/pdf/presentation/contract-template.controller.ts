import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CurrentOrganizationId,
  CurrentUser,
  Roles,
  type AuthenticatedUser,
} from '../../../shared/auth/auth.contracts';
import { ORG_HEADER, requireUser } from '../../parties/presentation/landlords.controller';
import { ContractTemplateService } from '../application/contract-template.service';
import { ContractTemplateDto, PatchContractTemplateDto } from './dto/contract-template.dto';

/**
 * Gabarit de contrat de l'organisation.
 *
 * Monté sous `/organizations/:id/...` : `OrganizationGuard` vérifie que ce
 * `:id` correspond bien à l'en-tête `X-Organization-Id`, de sorte que l'URL
 * et le contexte RLS ne peuvent pas diverger.
 */
@ApiTags('Contrat de bail (PDF)')
@ApiBearerAuth()
@Controller('organizations/:id/contract-template')
export class ContractTemplateController {
  constructor(private readonly templates: ContractTemplateService) {}

  @Get()
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Gabarit de contrat de l’organisation',
    description:
      'Renvoie le gabarit par défaut « bail à usage d’habitation, Congo-Brazzaville » tant ' +
      'qu’aucune personnalisation n’a été enregistrée.',
  })
  @ApiResponse({ status: 200, type: ContractTemplateDto })
  async get(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) _id: string,
  ): Promise<ContractTemplateDto> {
    void _id;
    return this.templates.get(organizationId, requireUser(user)) as Promise<ContractTemplateDto>;
  }

  @Patch()
  @Roles('OWNER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Personnaliser le gabarit',
    description: 'Stocké dans `organization_settings.settings_json.contractTemplate`.',
  })
  @ApiResponse({ status: 200, type: ContractTemplateDto })
  async patch(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) _id: string,
    @Body() dto: PatchContractTemplateDto,
  ): Promise<ContractTemplateDto> {
    void _id;
    return this.templates.patch(
      organizationId,
      requireUser(user),
      dto,
    ) as Promise<ContractTemplateDto>;
  }
}
