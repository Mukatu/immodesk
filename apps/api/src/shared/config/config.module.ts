import { Global, Inject, Injectable, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validateConfig, type AppConfig } from './config.schema';

export const APP_CONFIG = Symbol('APP_CONFIG');

/**
 * Service de configuration typé : aucune lecture de `process.env` ailleurs
 * dans le code applicatif.
 */
@Injectable()
export class AppConfigService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  get all(): Readonly<AppConfig> {
    return this.config;
  }

  get isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  get isTest(): boolean {
    return this.config.NODE_ENV === 'test';
  }

  /** Le code OTP fixe de développement n'est jamais actif en production. */
  get devOtpCode(): string | null {
    if (this.isProduction) return null;
    return this.config.OTP_DEV_CODE ?? null;
  }
}

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env', '../../.env'],
      // En test, l'environnement est entièrement posé par
      // `test/integration/setup-env.ts` : recharger `.env` ici réintroduirait
      // par exemple `OTP_DEV_CODE`, que les tests neutralisent volontairement.
      ignoreEnvFile: process.env.NODE_ENV === 'test',
    }),
  ],
  providers: [
    {
      provide: APP_CONFIG,
      useFactory: (): AppConfig => validateConfig(process.env as Record<string, unknown>),
    },
    AppConfigService,
  ],
  exports: [APP_CONFIG, AppConfigService],
})
export class AppConfigModule {}
