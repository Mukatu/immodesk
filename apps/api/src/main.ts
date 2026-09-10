import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { createApp, mountOpenApi } from './bootstrap';
import { AppConfigService } from './shared/config/config.module';

async function bootstrap(): Promise<void> {
  const app = await createApp();
  const config = app.get(AppConfigService);
  const prefix = config.get('API_GLOBAL_PREFIX');
  const port = config.get('PORT');

  if (config.get('SWAGGER_ENABLED')) {
    mountOpenApi(app, prefix);
  }

  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`API Immodesk démarrée sur http://localhost:${port}/${prefix}`);
  if (config.get('SWAGGER_ENABLED')) {
    logger.log(`Contrat OpenAPI : http://localhost:${port}/${prefix}/openapi.json`);
    logger.log(`Documentation : http://localhost:${port}/${prefix}/docs`);
  }
  if (config.devOtpCode) {
    logger.warn(
      `OTP_DEV_CODE actif : le code « ${config.devOtpCode} » est accepté. Jamais en production.`,
    );
  }
}

void bootstrap();
