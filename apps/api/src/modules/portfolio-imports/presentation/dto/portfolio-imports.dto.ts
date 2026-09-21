import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreatePortfolioImportDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Document CSV déjà téléversé par le mécanisme habituel du module `documents`.',
  })
  @IsUUID()
  documentId!: string;
}

export class ImportJobCreatedDto {
  @ApiProperty({ example: 'import-…' }) jobId!: string;
}

export class ImportRejectionDto {
  @ApiProperty({ example: 12, description: 'Numéro de ligne dans le fichier.' })
  line!: number;

  @ApiProperty({ example: 'Colonne « téléphone » manquante.' })
  reason!: string;
}

export class ImportReportDto {
  @ApiProperty({ enum: ['QUEUED', 'ACTIVE', 'COMPLETED', 'FAILED'] })
  status!: string;

  @ApiPropertyOptional({ example: 500 }) totalRows?: number;
  @ApiPropertyOptional({ example: 480 }) createdCount?: number;
  @ApiPropertyOptional({ example: 20 }) rejectedCount?: number;
  @ApiPropertyOptional({ type: [ImportRejectionDto] }) rejected?: ImportRejectionDto[];
  @ApiPropertyOptional({ format: 'uuid', description: 'Document du rapport (genre OTHER).' })
  documentId?: string;
  @ApiPropertyOptional() downloadUrl?: string;
  @ApiPropertyOptional() expiresAt?: string;
  @ApiPropertyOptional() error?: string;
}
