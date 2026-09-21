import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/auth.contracts';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import type { TenantLeaseRow } from '../../../shared/prisma/tenant-directory.service';
import type { DocumentKind, RelatedEntityType } from '../../documents/domain/document-rules';
import {
  DocumentDto,
  RegisterDocumentDto,
  UploadUrlRequestDto,
  UploadUrlResponseDto,
} from '../../documents/presentation/dto/documents.dto';
import { requireUser } from '../../parties/presentation/landlords.controller';
import { TenantDocumentsService } from '../application/tenant-documents.service';
import { CurrentTenantLeases, TenantPortal } from './tenant-portal.decorator';
import { TenantPortalGuard } from './tenant-portal.guard';

/**
 * Deux routes jumelles de `DocumentsController` (module `documents`,
 * réservé à `MANAGER`), ouvertes au rôle dérivé `TENANT_PORTAL` et
 * restreintes aux baux de la session (contrat, § « Téléversement de la
 * preuve par le locataire »). `DocumentsController` n'est pas touché : ces
 * routes appellent directement `TenantDocumentsService`, qui délègue à
 * `DocumentsService` (module `documents`, `@Global()`) après avoir imposé
 * `related_entity_type = 'lease'` et un `related_entity_id` du périmètre.
 */
@ApiTags('Portail locataire — documents')
@ApiBearerAuth()
@TenantPortal()
@UseGuards(TenantPortalGuard)
@Controller('tenant/documents')
export class TenantDocumentsController {
  constructor(private readonly documents: TenantDocumentsService) {}

  @Post('upload-url')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'URL signée de téléversement, restreinte à un bail du locataire',
    description:
      'Mêmes plafonds de taille et de type que le module `documents`. `relatedEntityType` doit ' +
      'valoir `lease` et `relatedEntityId` désigner l’UN des baux actifs de la session, sinon ' +
      '422 `PARTIES.PORTAL_RELATED_ENTITY_INVALID`.',
  })
  @ApiResponse({ status: 201, type: UploadUrlResponseDto })
  @ApiResponse({
    status: 422,
    type: ErrorResponseDto,
    description: 'PARTIES.PORTAL_RELATED_ENTITY_INVALID',
  })
  async createUploadUrl(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentTenantLeases() leases: TenantLeaseRow[],
    @Body() dto: UploadUrlRequestDto,
  ): Promise<UploadUrlResponseDto> {
    return this.documents.createUploadUrl(leases, requireUser(user), {
      ...dto,
      kind: dto.kind as DocumentKind,
      relatedEntityType: (dto.relatedEntityType as RelatedEntityType) ?? null,
      relatedEntityId: dto.relatedEntityId ?? null,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Enregistrer un document téléversé, restreint à un bail du locataire',
  })
  @ApiResponse({ status: 201, type: DocumentDto })
  @ApiResponse({
    status: 422,
    type: ErrorResponseDto,
    description: 'PARTIES.PORTAL_RELATED_ENTITY_INVALID',
  })
  async register(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentTenantLeases() leases: TenantLeaseRow[],
    @Body() dto: RegisterDocumentDto,
  ): Promise<DocumentDto> {
    return this.documents.register(leases, requireUser(user), {
      ...dto,
      kind: dto.kind as DocumentKind,
      relatedEntityType: (dto.relatedEntityType as RelatedEntityType) ?? null,
      relatedEntityId: dto.relatedEntityId ?? null,
      checksumSha256: dto.checksumSha256 ?? null,
      clientRef: dto.clientRef ?? null,
    }) as Promise<DocumentDto>;
  }
}
