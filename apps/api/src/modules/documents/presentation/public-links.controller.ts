import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../../shared/auth/auth.contracts';
import { DomainError } from '../../../shared/errors/domain-error';
import { PublicRateLimitGuard } from '../../../shared/throttler/public-rate-limit.guard';
import { ErrorResponseDto } from '../../identity/presentation/dto/auth.dto';
import { DocumentsService } from '../application/documents.service';
import { SignedLinksService } from '../application/signed-links.service';

@ApiTags('Liens publics')
@Controller('public/d')
export class PublicLinksController {
  constructor(
    private readonly links: SignedLinksService,
    private readonly documents: DocumentsService,
  ) {}

  @Get(':token')
  @Public()
  @UseGuards(PublicRateLimitGuard)
  @ApiOperation({
    summary: 'Lien court signé vers un PDF (SMS de repli)',
    description:
      'Vérifie la signature et l’échéance, puis redirige (302) vers une URL signée de dix minutes.',
  })
  @ApiResponse({ status: 302, description: 'Redirection vers le document.' })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'PUBLIC.LINK_INVALID' })
  async open(@Param('token') token: string, @Res() res: Response): Promise<void> {
    const target = this.links.verify(token);
    const url = target
      ? await this.documents.systemDownloadUrl(target.organizationId, target.documentId)
      : null;
    if (!url) throw new DomainError('PUBLIC.LINK_INVALID');
    res.redirect(302, url.downloadUrl);
  }
}
