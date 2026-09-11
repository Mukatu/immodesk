import { Global, Module } from '@nestjs/common';
import { DOCUMENT_READER } from '../parties/domain/read-ports';
import { DocumentPurgeService } from './application/document-purge.service';
import { DocumentsService } from './application/documents.service';
import { OBJECT_STORAGE } from './domain/storage.port';
import { S3ObjectStorage } from './infrastructure/s3-object-storage';
import { DocumentsController } from './presentation/documents.controller';
import { PublicLinksController } from './presentation/public-links.controller';
import { SignedLinksService } from './application/signed-links.service';
import { PublicRateLimitGuard } from '../../shared/throttler/public-rate-limit.guard';

/**
 * Module `documents` : stockage objet compatible S3 (MinIO en pilote,
 * Cloudflare R2 si le volume l'exige), URL signées, rattachement polymorphe.
 * Propriétaire exclusif de la table `documents`.
 *
 * `@Global()` pour publier le port `DOCUMENT_READER` que `parties` et
 * `portfolio` consomment dans leurs fiches détaillées.
 */
@Global()
@Module({
  controllers: [DocumentsController, PublicLinksController],
  providers: [
    S3ObjectStorage,
    { provide: OBJECT_STORAGE, useExisting: S3ObjectStorage },
    DocumentsService,
    DocumentPurgeService,
    SignedLinksService,
    PublicRateLimitGuard,
    { provide: DOCUMENT_READER, useExisting: DocumentsService },
  ],
  exports: [
    DocumentsService,
    DocumentPurgeService,
    SignedLinksService,
    PublicRateLimitGuard,
    OBJECT_STORAGE,
    DOCUMENT_READER,
  ],
})
export class DocumentsModule {}
