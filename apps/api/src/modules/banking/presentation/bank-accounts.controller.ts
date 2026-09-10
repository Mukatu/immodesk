import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CurrentOrganizationId,
  CurrentUser,
  Roles,
  type AuthenticatedUser,
} from '../../../shared/auth/auth.contracts';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { ORG_HEADER, requireUser } from '../../parties/presentation/landlords.controller';
import { BankAccountsService } from '../application/bank-accounts.service';
import {
  BankAccountDto,
  BankAccountListDto,
  CreateBankAccountDto,
  ListBankAccountsQueryDto,
  UpdateBankAccountDto,
} from './dto/banking.dto';

@ApiTags('Comptes bancaires')
@ApiBearerAuth()
@Controller('bank-accounts')
export class BankAccountsController {
  constructor(private readonly accounts: BankAccountsService) {}

  @Post()
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Enregistrer un compte de règlement',
    description:
      'Banque locale (BGFI, LCB, Ecobank…) ou portefeuille Mobile Money. Au moins un ' +
      'identifiant est requis : numéro de compte, IBAN ou `momoMsisdn`.',
  })
  @ApiResponse({ status: 201, type: BankAccountDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'BANKING.ACCOUNT_DUPLICATE' })
  @ApiResponse({
    status: 422,
    type: ErrorResponseDto,
    description: 'BANKING.IDENTIFIER_REQUIRED, BANKING.HOLDER_INVALID',
  })
  async create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: CreateBankAccountDto,
  ): Promise<BankAccountDto> {
    return this.accounts.create(organizationId, requireUser(user), dto) as Promise<BankAccountDto>;
  }

  @Get()
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: "Comptes de l'organisation et des bailleurs" })
  @ApiResponse({ status: 200, type: BankAccountListDto })
  async list(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: ListBankAccountsQueryDto,
  ): Promise<BankAccountListDto> {
    const items = await this.accounts.list(organizationId, requireUser(user), query);
    return { items } as BankAccountListDto;
  }

  @Patch(':id')
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Mettre à jour un compte' })
  @ApiResponse({ status: 200, type: BankAccountDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'BANKING.ACCOUNT_NOT_FOUND' })
  async update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBankAccountDto,
  ): Promise<BankAccountDto> {
    return this.accounts.update(
      organizationId,
      requireUser(user),
      id,
      dto,
    ) as Promise<BankAccountDto>;
  }

  @Delete(':id')
  @Roles('ACCOUNTANT')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Désactiver un compte',
    description:
      'Jamais de suppression physique : un compte est cité par des paiements passés. ' +
      'La ligne passe à `isActive: false` et perd son statut de compte par défaut.',
  })
  @ApiResponse({ status: 204 })
  async deactivate(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.accounts.deactivate(organizationId, requireUser(user), id);
  }
}
