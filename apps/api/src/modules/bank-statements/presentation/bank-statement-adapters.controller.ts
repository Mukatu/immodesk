import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../shared/auth/auth.contracts';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { ADAPTERS } from '../infrastructure/adapters/adapter-registry';

@ApiTags('Adaptateurs de relevés')
@ApiBearerAuth()
@Controller('bank-statement-adapters')
export class BankStatementAdaptersController {
  @Get()
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Lister les adaptateurs de relevés bancaires livrés' })
  async list() {
    return {
      items: ADAPTERS.map((adapter) => ({
        code: adapter.code,
        label: adapter.label,
        format: adapter.format,
        // Les 5 adaptateurs livrés (BGFI, LCB, ECOBANK, UBA, MT940) ont tous
        // un échantillon de test sous test/integration/fixtures/.
        sampleAvailable: true,
      })),
    };
  }
}
