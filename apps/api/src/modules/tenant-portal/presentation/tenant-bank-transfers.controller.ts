import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/auth.contracts';
import { parseIsoDate } from '../../leases/domain/calendar';
import type { TenantLeaseRow } from '../../../shared/prisma/tenant-directory.service';
import { requireUser } from '../../parties/presentation/landlords.controller';
import { TenantBankTransfersService } from '../application/tenant-bank-transfers.service';
import { CurrentTenantLeases, TenantPortal } from './tenant-portal.decorator';
import { TenantPortalGuard } from './tenant-portal.guard';
import {
  TenantTransferDeclareDto,
  TenantTransferListQueryDto,
} from './dto/tenant-bank-transfers.dto';

/**
 * Virement déclaré par le locataire (contrat, § « Virement déclaré ») :
 * preuve obligatoire, validation réservée au gestionnaire — ni `review`, ni
 * `approve`, ni `reject`, ni `cancel` ne sont exposés ici.
 */
@ApiTags('Portail locataire — virements déclarés')
@ApiBearerAuth()
@TenantPortal()
@UseGuards(TenantPortalGuard)
@Controller('tenant/bank-transfer-declarations')
export class TenantBankTransfersController {
  constructor(private readonly declarations: TenantBankTransfersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Déclarer un virement pour l’un de ses baux, preuve obligatoire' })
  async declare(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentTenantLeases() leases: TenantLeaseRow[],
    @Body() dto: TenantTransferDeclareDto,
  ) {
    return this.declarations.declare(leases, requireUser(user), {
      leaseId: dto.leaseId,
      invoiceId: dto.invoiceId ?? null,
      declaredAmount: BigInt(dto.declaredAmount),
      transferDate: parseIsoDate(dto.transferDate.slice(0, 10)),
      transferReference: dto.transferReference ?? null,
      payerName: dto.payerName,
      payerBankCode: dto.payerBankCode ?? null,
      payerBankName: dto.payerBankName ?? null,
      payerAccountNumber: dto.payerAccountNumber ?? null,
      beneficiaryBankAccountId: dto.beneficiaryBankAccountId,
      proofDocumentId: dto.proofDocumentId,
      clientRef: dto.clientRef,
      notes: dto.notes ?? null,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Lister ses déclarations de virement, tous baux confondus' })
  async list(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentTenantLeases() leases: TenantLeaseRow[],
    @Query() query: TenantTransferListQueryDto,
  ) {
    return this.declarations.list(leases, requireUser(user), query);
  }
}
