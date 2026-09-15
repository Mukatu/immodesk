import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CurrentOrganizationId,
  CurrentUser,
  Roles,
  type AuthenticatedUser,
} from '../../../shared/auth/auth.contracts';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { ORG_HEADER, requireUser } from '../../parties/presentation/landlords.controller';
import { ExpensesQueryService } from '../application/expenses-query.service';
import {
  ExpensesService,
  type ExpenseInput,
  type ExpenseUpdateInput,
} from '../application/expenses.service';
import {
  ExpenseDto,
  ExpenseInputDto,
  ExpensePageDto,
  ExpenseUpdateDto,
  ListExpensesQueryDto,
  RejectExpenseDto,
} from './dto/expenses.dto';

@ApiTags('Dépenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpensesController {
  constructor(
    private readonly expenses: ExpensesService,
    private readonly queries: ExpensesQueryService,
  ) {}

  @Post()
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Saisir une dépense (statut initial DRAFT)' })
  @ApiResponse({ status: 201, type: ExpenseDto })
  @ApiResponse({
    status: 200,
    type: ExpenseDto,
    description: 'Rejeu idempotent (`clientRef` connu).',
  })
  async create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: ExpenseInputDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ExpenseDto> {
    const { expense, replayed } = await this.expenses.create(
      organizationId,
      requireUser(user),
      dto as unknown as ExpenseInput,
    );
    if (replayed) res.status(HttpStatus.OK);
    return expense as ExpenseDto;
  }

  @Get()
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Lister les dépenses' })
  @ApiResponse({ status: 200, type: ExpensePageDto })
  async list(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: ListExpensesQueryDto,
  ): Promise<ExpensePageDto> {
    return this.queries.list(organizationId, requireUser(user), query) as Promise<ExpensePageDto>;
  }

  @Patch(':id')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Modifier une dépense DRAFT ou SUBMITTED, non rattachée à un relevé' })
  @ApiResponse({ status: 200, type: ExpenseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'AGENCY.EXPENSE_LOCKED' })
  async update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExpenseUpdateDto,
  ): Promise<ExpenseDto> {
    return this.expenses.update(
      organizationId,
      requireUser(user),
      id,
      dto as unknown as ExpenseUpdateInput,
    ) as Promise<ExpenseDto>;
  }

  @Post(':id/submit')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Soumettre une dépense DRAFT à validation' })
  @ApiResponse({ status: 200, type: ExpenseDto })
  async submit(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ExpenseDto> {
    return this.expenses.submit(organizationId, requireUser(user), id) as Promise<ExpenseDto>;
  }

  @Post(':id/approve')
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Valider une dépense SUBMITTED' })
  @ApiResponse({ status: 200, type: ExpenseDto })
  async approve(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ExpenseDto> {
    return this.expenses.approve(organizationId, requireUser(user), id) as Promise<ExpenseDto>;
  }

  @Post(':id/reject')
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Rejeter une dépense SUBMITTED (motif obligatoire)' })
  @ApiResponse({ status: 200, type: ExpenseDto })
  @ApiResponse({
    status: 422,
    type: ErrorResponseDto,
    description: 'AGENCY.EXPENSE_REJECTION_REASON_REQUIRED',
  })
  async reject(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectExpenseDto,
  ): Promise<ExpenseDto> {
    return this.expenses.reject(
      organizationId,
      requireUser(user),
      id,
      dto.reason,
    ) as Promise<ExpenseDto>;
  }
}
