import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CurrentOrganizationId,
  CurrentUser,
  Roles,
  type AuthenticatedUser,
} from '../../../shared/auth/auth.contracts';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { GenerateContractDto } from '../../leases/presentation/dto/lease-actions.dto';
import { ContractJobDto } from '../../leases/presentation/dto/lease-response.dto';
import { ORG_HEADER, requireUser } from '../../parties/presentation/landlords.controller';
import { LeaseContractService } from '../application/lease-contract.service';
import { LeaseContractWorker } from '../infrastructure/lease-contract.worker';

@ApiTags('Contrat de bail (PDF)')
@ApiBearerAuth()
@Controller('leases/:id/contract')
export class LeaseContractController {
  constructor(
    private readonly contracts: LeaseContractService,
    private readonly worker: LeaseContractWorker,
  ) {}

  @Post()
  @Roles('MANAGER')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Mettre en file la génération du contrat PDF',
    description:
      'Le worker BullMQ « lease-contract » rend le gabarit Handlebars avec Puppeteer, dépose le ' +
      'PDF dans le stockage objet et archive une version immuable dans `lease_documents`.',
  })
  @ApiResponse({ status: 202, type: ContractJobDto })
  @ApiResponse({
    status: 409,
    type: ErrorResponseDto,
    description: 'LEASES.CONTRACT_IN_PROGRESS',
  })
  @ApiResponse({
    status: 503,
    type: ErrorResponseDto,
    description: 'LEASES.CONTRACT_UNAVAILABLE — aucun navigateur de rendu configuré',
  })
  async generate(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) leaseId: string,
    @Body() dto: GenerateContractDto,
  ): Promise<ContractJobDto> {
    const userId = requireUser(user);
    await this.contracts.assertGenerable(organizationId, userId, leaseId);
    return this.worker.enqueue({
      organizationId,
      userId,
      leaseId,
      regenerate: dto.regenerate ?? false,
    });
  }

  @Get('jobs/:jobId')
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'État du travail de génération' })
  @ApiResponse({ status: 200, type: ContractJobDto })
  @ApiResponse({
    status: 404,
    type: ErrorResponseDto,
    description: 'LEASES.CONTRACT_JOB_NOT_FOUND',
  })
  async status(
    @Param('id', ParseUUIDPipe) leaseId: string,
    @Param('jobId') jobId: string,
  ): Promise<ContractJobDto> {
    return this.worker.status(leaseId, jobId);
  }

  @Get('preview')
  @Roles('VIEWER')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Prévisualisation HTML du contrat',
    description:
      'Même gabarit et mêmes données que le PDF, sans Chromium : la prévisualisation reste ' +
      'disponible même lorsque aucun navigateur de rendu n’est installé.',
  })
  @ApiResponse({ status: 200, description: 'Document HTML.' })
  async preview(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) leaseId: string,
  ): Promise<string> {
    return this.contracts.previewHtml(organizationId, requireUser(user), leaseId);
  }
}
