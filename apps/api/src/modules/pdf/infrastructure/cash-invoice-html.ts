const BASE_STYLE = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; line-height: 1.35; color: #111; margin: 0; }
  header { display: flex; justify-content: space-between; border-bottom: 1.5pt solid #111;
           padding-bottom: 2.5mm; margin-bottom: 3mm; }
  .org { font-size: 8.5pt; color: #333; } .org strong { font-size: 10.5pt; color: #111; }
  h1 { font-size: 13pt; margin: 0 0 1mm; text-transform: uppercase; letter-spacing: .05em; text-align: right; }
  .meta { text-align: right; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 2.5mm; }
  th, td { border: .5pt solid #999; padding: 1.3mm 2mm; text-align: left; vertical-align: top; }
  th { background: #f4f4f4; font-weight: normal; color: #333; }
  td.amount { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  tr.total td { font-weight: bold; background: #e9e9e9; }
  .mention { font-size: 7.5pt; color: #444; }
  .cancelled { color: #a00; border: 1.2pt solid #a00; padding: 1mm 3mm; font-weight: bold; display: inline-block; }`;

const ORG_BLOCK = `
    <div class="org">
      <strong>{{organization.name}}</strong>
      {{#if organization.address}}<br>{{organization.address}}{{/if}}
      {{#if organization.phone}}<br>Tél. {{organization.phone}}{{/if}}
      {{#if organization.rccm}}<br>RCCM {{organization.rccm}}{{/if}}
    </div>`;

/**
 * REÇU DE CAISSE remis par le démarcheur : il tient lieu de preuve tant que
 * la facture n'est pas soldée (un paiement partiel n'émet pas de quittance).
 */
export const CASH_RECEIPT_HTML_TEMPLATE = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Reçu {{receipt.number}}</title>
<style>@page { size: {{pageSize}}; margin: 9mm 10mm 12mm 10mm; } ${BASE_STYLE}</style></head>
<body>
  <header>${ORG_BLOCK}
    <div class="meta"><h1>Reçu de caisse</h1>N° <strong>{{receipt.number}}</strong><br>{{receipt.receivedAt}}</div>
  </header>
  {{#if receipt.cancelled}}<div class="cancelled">REÇU ANNULÉ</div>{{/if}}
  <table>
    <tr><th>Reçu de</th><td>{{payerName}}{{#if showTenant}} pour le compte de {{tenantName}}{{/if}}</td></tr>
    <tr><th>Montant</th><td class="amount"><strong>{{xaf receipt.amount}}</strong></td></tr>
    {{#if receipt.purpose}}<tr><th>Objet</th><td>{{receipt.purpose}}</td></tr>{{/if}}
    <tr><th>Encaissé par</th><td>{{collectorName}}</td></tr>
    <tr><th>Référence du règlement</th><td>{{receipt.paymentReference}}</td></tr>
  </table>
  {{#if allocations.length}}
  <table>
    <tr><th>Facture</th><th>Période</th><th>Imputé</th></tr>
    {{#each allocations}}<tr><td>{{this.invoiceNumber}}</td><td>{{this.period}}</td><td class="amount">{{xaf this.amount}}</td></tr>{{/each}}
    {{#if hasCredit}}<tr><td colspan="2">Avoir au profit du locataire</td><td class="amount">{{xaf creditAmount}}</td></tr>{{/if}}
  </table>
  {{/if}}
  <p class="mention">
    Signature du payeur recueillie sur l’appareil du démarcheur{{#if receipt.signatureHashShort}}, empreinte {{receipt.signatureHashShort}}{{/if}}.
    La quittance de loyer est émise dès que la facture est entièrement réglée.
  </p>
</body></html>`;

/** FACTURE DE LOYER (avis d'échéance), générée à la demande. */
export const INVOICE_HTML_TEMPLATE = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Facture {{invoice.number}}</title>
<style>@page { size: A4; margin: 15mm; } ${BASE_STYLE}</style></head>
<body>
  <header>${ORG_BLOCK}
    <div class="meta"><h1>Facture de loyer</h1>N° <strong>{{invoice.number}}</strong><br>Émise le {{invoice.issueDate}}<br>{{invoice.statusLabel}}</div>
  </header>
  <table>
    <tr><th>Bailleur</th><td>{{landlordName}}</td></tr>
    <tr><th>Locataire</th><td>{{tenantName}} — {{tenantPhone}}</td></tr>
    <tr><th>Logement</th><td>Lot {{unitCode}} — {{propertyName}}{{#if propertyAddress}}, {{propertyAddress}}{{/if}}</td></tr>
    <tr><th>Période</th><td>{{invoice.period}}</td></tr>
    <tr><th>Échéance</th><td><strong>{{invoice.dueDate}}</strong></td></tr>
  </table>
  <table>
    <tr><th>Désignation</th><th>Quantité</th><th>Prix unitaire</th><th>Montant</th></tr>
    {{#each lines}}<tr><td>{{this.label}}</td><td class="amount">{{this.quantity}}</td><td class="amount">{{xaf this.unitPrice}}</td><td class="amount">{{#if this.isCredit}}− {{/if}}{{xaf this.amount}}</td></tr>{{/each}}
    <tr class="total"><td colspan="3">Total</td><td class="amount">{{xaf invoice.totalAmount}}</td></tr>
    <tr><td colspan="3">Déjà réglé</td><td class="amount">{{xaf invoice.paidAmount}}</td></tr>
    <tr class="total"><td colspan="3">Reste à payer</td><td class="amount">{{xaf invoice.balanceAmount}}</td></tr>
  </table>
  <p class="mention">Pour tout virement, indiquez la référence {{invoice.number}} dans le libellé.</p>
</body></html>`;
