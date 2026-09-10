import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { DocumentsService } from '../application/documents.service';
import type { DocumentKind, RelatedEntityType } from '../domain/document-rules';
import {
  DocumentDto,
  DocumentListDto,
  DownloadUrlDto,
  ListDocumentsQueryDto,
  RegisterDocumentDto,
  UploadUrlRequestDto,
  UploadUrlResponseDto,
} from './dto/documents.dto';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post('upload-url')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Demander une URL signée de téléversement',
    description:
      'Le fichier part directement du navigateur ou du téléphone vers le stockage objet : ' +
      "il ne transite jamais par l'API. Le `Content-Type` est signé — le client doit " +
      'envoyer exactement le même en-tête. Aucune ligne n’est créée en base à cette étape.',
  })
  @ApiResponse({ status: 201, type: UploadUrlResponseDto })
  @ApiResponse({ status: 413, type: ErrorResponseDto, description: 'DOCUMENTS.FILE_TOO_LARGE' })
  @ApiResponse({ status: 415, type: ErrorResponseDto, description: 'DOCUMENTS.MIME_NOT_ALLOWED' })
  async createUploadUrl(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: UploadUrlRequestDto,
  ): Promise<UploadUrlResponseDto> {
    return this.documents.createUploadUrl(organizationId, requireUser(user), {
      ...dto,
      kind: dto.kind as DocumentKind,
      relatedEntityType: (dto.relatedEntityType as RelatedEntityType) ?? null,
      relatedEntityId: dto.relatedEntityId ?? null,
    });
  }

  @Post()
  @Roles('MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Enregistrer un document téléversé',
    description:
      "L'API vérifie par un HEAD que l'objet existe réellement dans le stockage avant " +
      "d'écrire la fiche : 409 `DOCUMENTS.OBJECT_MISSING` sinon. La taille retenue est " +
      'celle constatée dans le stockage, pas celle annoncée.',
  })
  @ApiResponse({ status: 201, type: DocumentDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'DOCUMENTS.OBJECT_MISSING' })
  @ApiResponse({
    status: 422,
    type: ErrorResponseDto,
    description: 'DOCUMENTS.OBJECT_KEY_INVALID',
  })
  async register(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: RegisterDocumentDto,
  ): Promise<DocumentDto> {
    return this.documents.register(organizationId, requireUser(user), {
      ...dto,
      kind: dto.kind as DocumentKind,
      relatedEntityType: (dto.relatedEntityType as RelatedEntityType) ?? null,
      relatedEntityId: dto.relatedEntityId ?? null,
      checksumSha256: dto.checksumSha256 ?? null,
      clientRef: dto.clientRef ?? null,
    }) as Promise<DocumentDto>;
  }

  @Get()
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Lister les documents d’une entité' })
  @ApiResponse({ status: 200, type: DocumentListDto })
  async list(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: ListDocumentsQueryDto,
  ): Promise<DocumentListDto> {
    const items = await this.documents.list(organizationId, requireUser(user), query);
    return { items } as DocumentListDto;
  }

  @Get(':id/download-url')
  @Roles('VIEWER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'URL signée de téléchargement (10 minutes)',
    description:
      "Le document d'une autre organisation est invisible sous RLS : la réponse est 404, " +
      'jamais 403 — un 403 révélerait son existence.',
  })
  @ApiResponse({ status: 200, type: DownloadUrlDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'DOCUMENTS.NOT_FOUND' })
  async downloadUrl(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DownloadUrlDto> {
    return this.documents.createDownloadUrl(organizationId, requireUser(user), id);
  }

  @Delete(':id')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({
    summary: 'Supprimer un document (suppression logique)',
    description:
      "La fiche est marquée supprimée ; l'objet est détruit par la tâche de purge après " +
      'le délai de rétractation (`DOCUMENTS_PURGE_GRACE_HOURS`, 24 h par défaut).',
  })
  @ApiResponse({ status: 204 })
  async remove(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.documents.softDelete(organizationId, requireUser(user), id);
  }
}
