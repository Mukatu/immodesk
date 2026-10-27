import { Global, Module } from '@nestjs/common';
import { ReadOnlyService } from './read-only.service';

/**
 * `@Global()` : `ReadOnlyGuard` est enregistré en `APP_GUARD` depuis
 * `app.module.ts`, et le module `platform` lit le même état pour composer
 * `GET /v1/status`. Exporter le service évite que chacun n'ouvre sa propre
 * lecture — et son propre cache.
 */
@Global()
@Module({
  providers: [ReadOnlyService],
  exports: [ReadOnlyService],
})
export class ReadOnlyModule {}
