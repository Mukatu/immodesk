import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../shared/auth/auth.contracts';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { MobileConfigService } from '../application/mobile-config.service';
import { MobileConfigDto } from './dto/device-status.dto';

@ApiTags('Synchronisation mobile')
@ApiBearerAuth()
@Controller('mobile')
export class MobileConfigController {
  constructor(private readonly config: MobileConfigService) {}

  @Get('config')
  @Roles('COLLECTOR')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Paramètres mobiles applicables sans recompiler l’application' })
  @ApiResponse({ status: 200, type: MobileConfigDto })
  get(): MobileConfigDto {
    return this.config.get();
  }
}
