import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CurrentOrganizationId,
  CurrentUser,
  Roles,
  type AuthenticatedUser,
} from '../../../shared/auth/auth.contracts';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { GuarantorsService } from '../application/guarantors.service';
import { ORG_HEADER, requireUser } from './landlords.controller';
import { GuarantorDto, UpdateGuarantorDto } from './dto/tenants.dto';

@ApiTags('Garants')
@ApiBearerAuth()
@Controller('guarantors')
export class GuarantorsController {
  constructor(private readonly guarantors: GuarantorsService) {}

  @Patch(':id')
  @Roles('MANAGER')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Mettre à jour un garant' })
  @ApiResponse({ status: 200, type: GuarantorDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'PARTIES.GUARANTOR_NOT_FOUND' })
  async update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGuarantorDto,
  ): Promise<GuarantorDto> {
    return this.guarantors.update(
      organizationId,
      requireUser(user),
      id,
      dto,
    ) as Promise<GuarantorDto>;
  }

  @Delete(':id')
  @Roles('MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Supprimer un garant (suppression logique)' })
  @ApiResponse({ status: 204 })
  async remove(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.guarantors.softDelete(organizationId, requireUser(user), id);
  }
}
