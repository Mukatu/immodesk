import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { buildOpenApiDocument } from './modules/platform/infrastructure/openapi';
import { AppConfigService } from './shared/config/config.module';
import { DomainError } from './shared/errors/domain-error';

/**
 * Les montants Immodesk sont des BigInt. `JSON.stringify` refuse ce type par
 * défaut : on le sérialise en chaîne, jamais en nombre flottant (qui
 * perdrait de la précision au-delà de 2^53).
 */
function enableBigIntSerialization(): void {
  const proto = BigInt.prototype as unknown as { toJSON?: () => string };
  if (!proto.toJSON) {
    proto.toJSON = function toJSON(this: bigint): string {
      return this.toString(10);
    };
  }
}

/**
 * Construit l'application sans l'écouter : partagé entre `main.ts`,
 * l'export du contrat OpenAPI et les tests d'intégration.
 */
export async function createApp(): Promise<INestApplication> {
  enableBigIntSerialization();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
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
