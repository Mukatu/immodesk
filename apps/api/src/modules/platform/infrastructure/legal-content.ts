import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG } from '../../../shared/config/config.module';
import type { AppConfig } from '../../../shared/config/config.schema';

export interface LegalDocumentContent {
  code: 'TERMS' | 'PRIVACY_POLICY';
  title: string;
  body: string;
}

/**
 * Contenu des mentions légales et de la politique de confidentialité,
 * servi par `GET /v1/legal` (docs/api/phase11-contract.md, arbitrage 18 et
 * § « Consentement et portail locataire »).
 *
 * DÉCISION FAUTE DE PRÉCISION DU CONTRAT : le contrat dit « servies depuis la
 * configuration », mais `config.schema.ts` (fichier interdit à ce module) ne
 * porte que `PRIVACY_LEGAL_VERSION` et `PRIVACY_DPO_CONTACT` — aucune
 * variable ne peut raisonnablement porter le TEXTE intégral d'une politique
 * de confidentialité. Ce texte est donc versionné ici, en code, comme le
 * sont déjà les descriptions de `infrastructure/openapi.ts` ; seule la
 * VERSION (`legalVersion`) et le contact DPO viennent de la configuration.
 * Signalé au rapport de livraison : un vrai contenu juridique doit remplacer
 * ce texte de repli avant mise en production.
 */
@Injectable()
export class LegalContentProvider {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  documents(): LegalDocumentContent[] {
    return [
      {
        code: 'TERMS',
        title: "Conditions générales d'utilisation",
        body:
          "Texte de repli : les conditions générales d'utilisation d'Immodesk n'ont pas encore été " +
          'rédigées par le service juridique. Ce contenu doit être remplacé avant toute mise en ' +
          `production (version ${this.config.PRIVACY_LEGAL_VERSION}).`,
      },
      {
        code: 'PRIVACY_POLICY',
        title: 'Politique de confidentialité',
        body:
          'Texte de repli : la politique de confidentialité décrit les données personnelles ' +
          'collectées, leur finalité, leur durée de conservation et les droits des personnes ' +
          `concernées. Ce contenu doit être rédigé et validé avant mise en production (version ${this.config.PRIVACY_LEGAL_VERSION}).`,
      },
    ];
  }

  legalVersion(): string {
    return this.config.PRIVACY_LEGAL_VERSION;
  }

  dpoContact(): string | null {
    return this.config.PRIVACY_DPO_CONTACT ?? null;
  }

  /**
   * Aucune variable de configuration ne porte de contact support
   * (recherché dans `config.schema.ts`, absent) : `null` en attendant sa
   * définition, plutôt qu'une valeur inventée.
   */
  supportContact(): string | null {
    return null;
  }
}
