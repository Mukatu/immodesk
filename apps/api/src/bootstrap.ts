import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { buildOpenApiDocument } from './modules/platform/infrastructure/openapi';
import { AppConfigService } from './shared/config/config.module';
import { DomainError } from './shared/errors/domain-error';
import { toJsonAmount } from './shared/money/amount';

/**
 * Les montants Immodesk sont des BigInt en base et dans le domaine, mais les
 * contrats d'API les typent en `number`. `JSON.stringify` refusant le type
 * BigInt, ce filet de sécurité global applique la même conversion gardée que
 * les mappers de présentation : au-delà de `Number.MAX_SAFE_INTEGER`, on lève
 * plutôt que de transmettre un montant arrondi.
 *
 * Les mappers restent la voie normale ; ceci ne rattrape que les BigInt qui
 * atteindraient la réponse sans passer par eux.
 */
function enableBigIntSerialization(): void {
  const proto = BigInt.prototype as unknown as { toJSON?: () => number };
  if (!proto.toJSON) {
    proto.toJSON = function toJSON(this: bigint): number {
      return toJsonAmount(this);
    };
  }
}

/**
 * Construit l'application sans l'écouter : partagé entre `main.ts`,
 * l'export du contrat OpenAPI et les tests d'intégration.
 */
export async function createApp(): Promise<INestApplication> {
  enableBigIntSerialization();

  // `rawBody` : les webhooks WhatsApp et SMS se vérifient sur le corps BRUT
  // (HMAC) ; une signature calculée sur un JSON re-sérialisé ne correspondrait
  // jamais. Le plafond de 1 Mo admet une signature PNG de 512 Ko en base64.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { limit: '1mb', extended: true });
  app.useLogger(app.get(Logger));

  const config = app.get(AppConfigService);
  const prefix = config.get('API_GLOBAL_PREFIX');
  app.setGlobalPrefix(prefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      // Toute erreur de validation devient VALIDATION.INVALID_PAYLOAD (422).
      exceptionFactory: (errors) =>
        new DomainError('VALIDATION.INVALID_PAYLOAD', {
          fields: errors.map((e) => ({
            path: e.property,
            messages: Object.values(e.constraints ?? {}),
          })),
        }),
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'X-Organization-Id',
      'Idempotency-Key',
      'X-Request-Id',
    ],
  });
  app.enableShutdownHooks();

  return app;
}

/** Expose `GET /{prefix}/openapi.json` et l'interface `/{prefix}/docs`. */
export function mountOpenApi(app: INestApplication, prefix: string): void {
  const document = buildOpenApiDocument(app, prefix);
  SwaggerModule.setup(`${prefix}/docs`, app, document, {
    jsonDocumentUrl: `${prefix}/openapi.json`,
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Immodesk API',
  });
}
