import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../shared/auth/auth.contracts';
import { HealthService, type HealthReport } from '../application/health.service';

class HealthCheckDto {
  @ApiProperty({ enum: ['up', 'down', 'skipped'] }) status!: string;
  @ApiProperty({ required: false }) latencyMs?: number;
  @ApiProperty({ required: false }) detail?: string;
}

class HealthChecksDto {
  @ApiProperty({ type: HealthCheckDto }) database!: HealthCheckDto;
  @ApiProperty({ type: HealthCheckDto }) redis!: HealthCheckDto;
  @ApiProperty({ type: HealthCheckDto }) storage!: HealthCheckDto;
}

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok', 'degraded'] }) status!: string;
  @ApiProperty({ type: HealthChecksDto }) checks!: HealthChecksDto;
}

@ApiTags('Plateforme')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Sonde de disponibilité',
    description:
      'Vérifie la base PostgreSQL, Redis et le stockage objet. Répond toujours 200 : le champ `status` vaut `degraded` si une dépendance est en panne, ce qui permet aux sondes de distinguer « API morte » de « dépendance morte ».',
  })
  @ApiResponse({ status: 200, type: HealthResponseDto })
  async check(): Promise<HealthReport> {
    return this.health.check();
  }
}
