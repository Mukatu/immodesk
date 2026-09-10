import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import {
  ALLOWED_MIME_TYPES,
  DOCUMENT_KINDS,
  MAX_PDF_BYTES,
  RELATED_ENTITY_TYPES,
} from '../../domain/document-rules';

const KIND_VALUES = [...DOCUMENT_KINDS];
const ENTITY_VALUES = [...RELATED_ENTITY_TYPES];
const MIME_VALUES = Object.keys(ALLOWED_MIME_TYPES);

export class UploadUrlRequestDto {
  @ApiProperty({ example: 'cni-bernadette-loemba.jpg' })
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({
    enum: MIME_VALUES,
    example: 'image/jpeg',
    description: 'Hors liste : 415 `DOCUMENTS.MIME_NOT_ALLOWED`.',
  })
  @IsIn(MIME_VALUES)
  mimeType!: string;

  @ApiProperty({
    type: 'integer',
    format: 'int64',
    example: 2_400_000,
    description:
      '15 Mo pour une image, 25 Mo pour un PDF : au-delà, 413 `DOCUMENTS.FILE_TOO_LARGE`.',
    maximum: MAX_PDF_BYTES,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sizeBytes!: number;

  @ApiProperty({ enum: KIND_VALUES, example: 'ID_DOCUMENT' })
  @IsIn(KIND_VALUES)
  kind!: string;

  @ApiPropertyOptional({ enum: ENTITY_VALUES })
  @IsOptional()
  @IsIn(ENTITY_VALUES)
  relatedEntityType?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  relatedEntityId?: string;
}

export class UploadUrlResponseDto {
  @ApiProperty({ description: 'URL signée à appeler en PUT avec le même `Content-Type`.' })
  uploadUrl!: string;

  @ApiProperty({
    example: 'org/018f.../id_document/018f....jpg',
    description: "Clé décidée par l'API : le client ne la choisit jamais.",
  })
  objectKey!: string;

  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
  @ApiProperty({ example: 15728640 }) maxSizeBytes!: number;
}

export class RegisterDocumentDto {
  @ApiProperty({ description: 'Clé rendue par `/documents/upload-url`.' })
  @IsString()
  @MaxLength(1024)
  objectKey!: string;

  @ApiProperty() @IsString() @MaxLength(255) fileName!: string;
  @ApiProperty({ enum: MIME_VALUES }) @IsIn(MIME_VALUES) mimeType!: string;

  @ApiProperty({ type: 'integer', format: 'int64', example: 2_400_000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sizeBytes!: number;
  @ApiProperty({ enum: KIND_VALUES }) @IsIn(KIND_VALUES) kind!: string;

  @ApiPropertyOptional({ enum: ENTITY_VALUES })
  @IsOptional()
  @IsIn(ENTITY_VALUES)
  relatedEntityType?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  relatedEntityId?: string;

  @ApiPropertyOptional({ description: 'Empreinte SHA-256 du contenu, pour vérifier l’intégrité.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  checksumSha256?: string;

  @ApiPropertyOptional({ description: "ULID de l'appareil mobile, clé d'idempotence." })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientRef?: string;
}

export class ListDocumentsQueryDto {
  @ApiPropertyOptional({ enum: ENTITY_VALUES })
  @IsOptional()
  @IsIn(ENTITY_VALUES)
  relatedEntityType?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  relatedEntityId?: string;

  @ApiPropertyOptional({ enum: KIND_VALUES })
  @IsOptional()
  @IsIn(KIND_VALUES)
  kind?: string;
}

export class DocumentDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: KIND_VALUES }) kind!: string;
  @ApiProperty() fileName!: string;
  @ApiProperty() mimeType!: string;
  @ApiProperty({
    type: 'integer',
    format: 'int64',
    example: 2400000,
    description: 'Taille constatée dans le stockage, pas celle annoncée par le client.',
  })
  sizeBytes!: number;
  @ApiProperty({ nullable: true, type: Number }) widthPx!: number | null;
  @ApiProperty({ nullable: true, type: Number }) heightPx!: number | null;
  @ApiProperty({ nullable: true, type: Number }) pagesCount!: number | null;
  @ApiProperty({ nullable: true, type: String }) relatedEntityType!: string | null;
  @ApiProperty({ nullable: true, type: String }) relatedEntityId!: string | null;
  @ApiProperty({ nullable: true, type: String }) uploadedByUserId!: string | null;
  @ApiProperty({ format: 'date-time' }) uploadedAt!: string;
  @ApiProperty({ nullable: true, type: String }) retentionUntil!: string | null;
  @ApiProperty({ nullable: true, type: String }) deletedAt!: string | null;
}

export class DocumentListDto {
  @ApiProperty({ type: [DocumentDto] }) items!: DocumentDto[];
}

export class DownloadUrlDto {
  @ApiProperty({ description: 'URL signée valable 10 minutes.' }) downloadUrl!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
}
