import { Injectable } from '@nestjs/common';
import type {
  CashReceiptDocumentModel,
  InvoiceDocumentModel,
  ReceiptDocumentModel,
} from '../domain/financial-documents';
import {
  qrDataUrl,
  renderCashReceiptHtml,
  renderInvoiceHtml,
  renderReceiptHtml,
  type RenderedHtml,
} from '../infrastructure/financial-renderer';
import { PdfBrowserService } from '../infrastructure/pdf-browser.service';

export interface RenderedDocument extends RenderedHtml {
  /** Octets du PDF, ou `null` si aucun navigateur de rendu n'est disponible. */
  pdf: Buffer | null;
}

/**
 * Rendu PDF des documents financiers, par le même Chromium partagé que le
 * contrat de bail. Sans navigateur, le HTML reste produit et `pdf` vaut
 * `null` : l'appelant décide (quittance émise sans PDF, ou 503 à la demande).
 */
@Injectable()
export class FinancialPdfService {
  constructor(private readonly browser: PdfBrowserService) {}

  async available(): Promise<boolean> {
    return this.browser.available();
  }

  qr(text: string): Promise<string> {
    return qrDataUrl(text);
  }

  async receipt(model: ReceiptDocumentModel, footer: string): Promise<RenderedDocument> {
    return this.toPdf(renderReceiptHtml(model), footer);
  }

  async cashReceipt(model: CashReceiptDocumentModel, footer: string): Promise<RenderedDocument> {
    return this.toPdf(renderCashReceiptHtml(model), footer);
  }

  async invoice(model: InvoiceDocumentModel, footer: string): Promise<RenderedDocument> {
    return this.toPdf(renderInvoiceHtml(model), footer);
  }

  private async toPdf(rendered: RenderedHtml, footer: string): Promise<RenderedDocument> {
    if (!(await this.browser.available())) return { ...rendered, pdf: null };
    try {
      return { ...rendered, pdf: await this.browser.renderPdf(rendered.html, footer) };
    } catch {
      // Navigateur présent mais qui refuse de démarrer : même issue que
      // l'absence de navigateur, jamais un échec de l'opération métier.
      return { ...rendered, pdf: null };
    }
  }
}
