import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';
import { PAYMENT_METHODS } from '../../../billing/application/billing-dashboard.service';

export class CollectionRateQueryDto {
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601() from?: string;
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601() to?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() propertyId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() landlordId?: string;
}

export class ArrearsQueryDto {
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601() asOf?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() propertyId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() landlordId?: string;
}

export class VacancyQueryDto {
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601() asOf?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() propertyId?: string;
}

export class PaymentMethodsQueryDto {
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601() from?: string;
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601() to?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() propertyId?: string;
}

/** `kind` de `POST /v1/exports/{kind}` (contrat phase 9, § « Exports »). */
export const EXPORT_KINDS = ['invoices', 'payments', 'arrears', 'dashboard'] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

/** `dashboardKind` requis lorsque `kind = 'dashboard'`. */
export const EXPORT_DASHBOARD_KINDS = [
  'collection-rate',
  'arrears',
  'vacancy',
  'payment-methods',
] as const;
export type ExportDashboardKind = (typeof EXPORT_DASHBOARD_KINDS)[number];

/**
 * Corps de `POST /v1/exports/{kind}` : reprend les mêmes filtres que la
 * liste correspondante (contrat, § « Exports »). Un seul DTO couvre les
 * quatre `kind`, chacun n'utilisant que le sous-ensemble de champs qui le
 * concerne — exactement comme les quatre tableaux de bord partagent déjà
 * `from/to/asOf/propertyId/landlordId` dans le contrat.
 */
export class ExportRequestDto {
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601() from?: string;
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601() to?: string;
  @ApiPropertyOptional({ format: 'date' }) @IsOptional() @IsISO8601() asOf?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() propertyId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() landlordId?: string;
  @ApiPropertyOptional({ description: 'Filtre `invoices` (invoice_status).' })
  @IsOptional()
  @IsString()
  status?: string;
  @ApiPropertyOptional({ enum: PAYMENT_METHODS, description: 'Filtre `payments`.' })
  @IsOptional()
  @IsIn(PAYMENT_METHODS)
  method?: (typeof PAYMENT_METHODS)[number];
  @ApiPropertyOptional({
    enum: EXPORT_DASHBOARD_KINDS,
    description: 'Obligatoire lorsque `kind = dashboard`.',
  })
  @IsOptional()
  @IsIn(EXPORT_DASHBOARD_KINDS)
  dashboardKind?: ExportDashboardKind;
}
