import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/config.schema';

/**
 * Journalisation structurée pino.
 * Les secrets et données personnelles sensibles sont expurgés : jamais de
 * code OTP, de jeton ni de numéro complet dans les journaux.
 */
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        pinoHttp: {
          level: config.LOG_LEVEL,
          genReqId: (req: { headers: Record<string, unknown> }) =>
            (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
          customProps: () => ({ service: 'immodesk-api' }),
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.headers["x-api-key"]',
              'req.body.code',
              'req.body.refreshToken',
              'res.headers["set-cookie"]',
            ],
            censor: '[expurgé]',
          },
          autoLogging: {
            ignore: (req: { url?: string }) => req.url === '/v1/health',
          },
          transport:
            config.NODE_ENV === 'development'
              ? {
                  target: 'pino-pretty',
                  options: { singleLine: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname' },
                }
              : undefined,
        },
      }),
    }),
  ],
  exports: [PinoLoggerModule],
})
export class AppLoggerModule {}
