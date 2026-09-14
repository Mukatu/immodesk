import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import type { MobileConfig } from '../domain/sync-types';

/**
 * `GET /v1/mobile/config` : valeurs par défaut du contrat, surchargeables
 * par variable d'environnement sans recompiler l'application mobile.
 */
@Injectable()
export class MobileConfigService {
  constructor(private readonly config: AppConfigService) {}

  get(): MobileConfig {
    return {
      maxPhotoBytes: this.config.get('MOBILE_MAX_PHOTO_BYTES'),
      photoMaxDimension: this.config.get('MOBILE_PHOTO_MAX_DIMENSION'),
      photoQuality: this.config.get('MOBILE_PHOTO_QUALITY'),
      maxSignatureBytes: this.config.get('MOBILE_MAX_SIGNATURE_BYTES'),
      retentionHours: this.config.get('MOBILE_RETENTION_HOURS'),
      syncIntervalSeconds: this.config.get('MOBILE_SYNC_INTERVAL_SECONDS'),
      maxOperationsPerBatch: this.config.get('MOBILE_MAX_OPERATIONS_PER_BATCH'),
      offlineWritesEnabled: this.config.get('MOBILE_OFFLINE_WRITES_ENABLED'),
    };
  }
}
