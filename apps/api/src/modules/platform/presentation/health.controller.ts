import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../../shared/auth/auth.contracts';
import { HealthService, type HealthReport } from '../application/health.service';
import { ReadinessService, type ReadinessReport } from '../application/readiness.service';

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
  constructor(
    private readonly health: HealthService,
    private readonly readiness: ReadinessService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Sonde de vivacité',
    description:
      'Vérifie la base PostgreSQL, Redis et le stockage objet. Répond toujours 200 : le champ `status` vaut `degraded` si une dépendance est en panne, ce qui permet aux sondes de distinguer « API morte » de « dépendance morte ».',
  })
  @ApiResponse({ status: 200, type: HealthResponseDto })
  async check(): Promise<HealthReport> {
    return this.health.check();
  }

  @Get('ready')
  @Public()
  @ApiOperation({
    summary: 'Sonde de disponibilité',
    description:
      'Vérifie séparément la base, Redis, le stockage objet et l’agrégateur Mobile Money. Répond 503 dès qu’une dépendance indispensable manque (docs/api/phase11-contract.md, § 11.F).',
  })
  @ApiResponse({ status: 200, type: HealthResponseDto })
  @ApiResponse({ status: 503, type: HealthResponseDto })
  async ready(@Res({ passthrough: true }) res: Response): Promise<ReadinessReport> {
    const report = await this.readiness.check();
    if (report.status === 'degraded') res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return report;
  }
}
