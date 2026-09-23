import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { readPrivacySettings, type PrivacySettings } from '../domain/privacy-settings';
import {
  processingRegisterCommon,
  type ProcessingRegisterCommon,
} from '../domain/processing-register';
import { defaultPrivacySettings } from './privacy-defaults';

export interface ProcessingRegisterView extends ProcessingRegisterCommon {
  version: string;
  updatedAt: string;
  dpo: { name: string | null; contact: string | null };
  organization: {
    dpoName: string | null;
    dpoContact: string | null;
    retention: PrivacySettings;
  } | null;
}

/**
 * `GET /v1/privacy/processing-register` : authentifié, sans en-tête
 * d'organisation obligatoire (arbitrage 13). Quand l'en-tête EST présent,
 * l'appartenance de l'utilisateur à cette organisation est vérifiée avant
 * d'y joindre sa section — un authentifié quelconque ne doit pas lire le
 * paramétrage privé d'une organisation dont il n'est pas membre en devinant
 * son UUID ; un en-tête invalide ou une organisation étrangère dégrade
 * silencieusement vers la partie commune, jamais une erreur.
 */
@Injectable()
export class ProcessingRegisterService {
  private readonly logger = new Logger(ProcessingRegisterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async get(userId: string, organizationId: string | null): Promise<ProcessingRegisterView> {
    try {
      const dpoContact = this.config.get('PRIVACY_DPO_CONTACT') ?? null;
      const common = processingRegisterCommon(dpoContact);
      const organization = organizationId
        ? await this.organizationSection(userId, organizationId)
        : null;

      return {
        ...common,
        version: this.config.get('PRIVACY_LEGAL_VERSION'),
        updatedAt: new Date().toISOString(),
        dpo: { name: null, contact: dpoContact },
        organization,
      };
    } catch (error) {
      this.logger.error(`Registre des traitements indisponible : ${(error as Error).message}`);
      throw new DomainError('PRIVACY.REGISTER_UNAVAILABLE');
    }
  }

  private async organizationSection(
    userId: string,
    organizationId: string,
  ): Promise<{
    dpoName: string | null;
    dpoContact: string | null;
    retention: PrivacySettings;
  } | null> {
    return this.prisma
      .withTenant(organizationId, userId, async (tx) => {
        const membership = await tx.organization_members.findFirst({
          where: { organization_id: organizationId, user_id: userId, status: 'ACTIVE' },
          select: { id: true },
        });
        if (!membership) return null;

        const settings = await tx.organization_settings.findUnique({
          where: { organization_id: organizationId },
          select: { settings_json: true },
        });
        if (!settings) return null;

        const view = readPrivacySettings(
          settings.settings_json,
          defaultPrivacySettings(this.config),
        );
        return { dpoName: view.dpoName, dpoContact: view.dpoContact, retention: view };
      })
      .catch(() => null); // Organisation invalide ou hors RLS : dégrade vers la partie commune, jamais une erreur.
  }
}
