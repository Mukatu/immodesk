import { Global, Inject, Injectable, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/config.schema';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) readonly client: Redis) {}

  async ping(): Promise<boolean> {
    try {
      return (await this.client.ping()) === 'PONG';
    } catch (error) {
      this.logger.warn(`Redis injoignable : ${(error as Error).message}`);
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => undefined);
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): Redis =>
        new Redis(config.REDIS_URL, {
          maxRetriesPerRequest: 2,
          enableOfflineQueue: true,
          lazyConnect: false,
          retryStrategy: (times) => Math.min(times * 200, 2000),
        }),
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
