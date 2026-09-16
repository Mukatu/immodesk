import { Global, Module } from '@nestjs/common';
import { MeterReadingsService } from './application/meter-readings.service';
import { MetersService } from './application/meters.service';
import { MeterReadingsController, MetersController } from './presentation/meters.controller';

/**
 * Module `meters` (phase 8) : compteurs et relevés, propriétaire exclusif de
 * `meters` et `meter_readings`.
 *
 * `@Global()` : `utilities` lit les relevés et les compteurs pour la
 * valorisation et la campagne de refacturation, sans import de module — même
 * convention que les autres modules à ports/lecture transverse.
 */
@Global()
@Module({
  controllers: [MetersController, MeterReadingsController],
  providers: [MetersService, MeterReadingsService],
  exports: [MetersService, MeterReadingsService],
})
export class MetersModule {}
