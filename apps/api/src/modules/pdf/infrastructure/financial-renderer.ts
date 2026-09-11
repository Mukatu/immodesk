import { createHash } from 'node:crypto';
import Handlebars from 'handlebars';
import QRCode from 'qrcode';
import { formatXaf } from '../../../shared/money/amount';
import type {
  CashReceiptDocumentModel,
  InvoiceDocumentModel,
  ReceiptDocumentModel,
} from '../domain/financial-documents';
import { CASH_RECEIPT_HTML_TEMPLATE, INVOICE_HTML_TEMPLATE } from './cash-invoice-html';
import { RECEIPT_HTML_TEMPLATE } from './receipt-html';

/**
 * Rendu HTML des documents financiers.
 *
 * Un environnement Handlebars ISOLÉ (`Handlebars.create()`) : les assistants
 * restent une liste blanche propre à ces gabarits, sans interférer avec ceux
 * du contrat de bail. L'échappement HTML reste actif : noms, motifs et objets
 * viennent de saisies utilisateur.
 */
const hbs = Handlebars.create();
hbs.registerHelper('xaf', (value: unknown) => formatXaf(toBigInt(value)));

const receiptTemplate = hbs.compile(RECEIPT_HTML_TEMPLATE, { strict: false });
const cashReceiptTemplate = hbs.compile(CASH_RECEIPT_HTML_TEMPLATE, { strict: false });
const invoiceTemplate = hbs.compile(INVOICE_HTML_TEMPLATE, { strict: false });

export interface RenderedHtml {
  html: string;
  /** SHA-256 du HTML source : stable d'un rendu à l'autre, contrairement aux octets du PDF. */
  contentHash: string;
}

function hashed(html: string): RenderedHtml {
  return { html, contentHash: createHash('sha256').update(html, 'utf8').digest('hex') };
}

export function renderReceiptHtml(model: ReceiptDocumentModel): RenderedHtml {
  return hashed(
    receiptTemplate({
      ...model,
      hasPenalty: model.receipt.penaltyAmount > 0n,
      hasRemaining: model.receipt.remainingBalance > 0n,
    }),
  );
}

export function renderCashReceiptHtml(model: CashReceiptDocumentModel): RenderedHtml {
  return hashed(
    cashReceiptTemplate({
      ...model,
      showTenant: model.payerName !== model.tenantName,
      hasCredit: model.creditAmount > 0n,
    }),
  );
}

export function renderInvoiceHtml(model: InvoiceDocumentModel): RenderedHtml {
  return hashed(invoiceTemplate(model));
}

/**
 * QR de vérification en image embarquée. Correction d'erreur « M » : le code
 * reste lisible sur une quittance imprimée froissée ou photographiée de biais.
 */
export async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin: 1, width: 240 });
}

function toBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.trunc(value));
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return BigInt(value);
  return 0n;
}
