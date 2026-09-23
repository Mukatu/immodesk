import { Injectable } from '@nestjs/common';
import { LegalContentProvider } from '../infrastructure/legal-content';

export interface LegalTerms {
  legalVersion: string;
  publishedAt: string;
  locale: 'fr-CG';
  documents: { code: 'TERMS' | 'PRIVACY_POLICY'; title: string; body: string; updatedAt: string }[];
  dpoContact: string | null;
  supportContact: string | null;
}

/**
 * `GET /v1/legal` — public, non authentifié (docs/api/phase11-contract.md,
 * arbitrage 18 et § « Consentement et portail locataire »). Servi depuis la
 * configuration/le code, jamais depuis une table.
 */
@Injectable()
export class LegalService {
  constructor(private readonly content: LegalContentProvider) {}

  get(): LegalTerms {
    const legalVersion = this.content.legalVersion();
    const now = new Date().toISOString();
    return {
      legalVersion,
      publishedAt: now,
      locale: 'fr-CG',
      documents: this.content.documents().map((doc) => ({ ...doc, updatedAt: now })),
      dpoContact: this.content.dpoContact(),
      supportContact: this.content.supportContact(),
    };
  }
}
