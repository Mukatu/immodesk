/**
 * Gabarit HTML du relevé de gérance (phase 7). Style dupliqué à dessein de
 * `cash-invoice-html.ts` : chaque document financier garde son propre
 * fichier de gabarit, `BASE_STYLE`/`ORG_BLOCK` n'y étant pas exportés.
 */
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
  .debit { color: #a00; }`;

/** RELEVÉ DE GÉRANCE adressé au bailleur (contrat, § PDF et envoi). */
export const OWNER_STATEMENT_HTML_TEMPLATE = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Relevé {{statement.number}}</title>
<style>@page { size: A4; margin: 15mm; } ${BASE_STYLE}</style></head>
<body>
  <header>
    <div class="org">
      <strong>{{organization.name}}</strong>
      {{#if organization.address}}<br>{{organization.address}}{{/if}}
      {{#if organization.phone}}<br>Tél. {{organization.phone}}{{/if}}
      {{#if organization.rccm}}<br>RCCM {{organization.rccm}}{{/if}}
    </div>
    <div class="meta"><h1>Relevé de gérance</h1>N° <strong>{{statement.number}}</strong><br>Émis le {{statement.issueDate}}<br>{{statement.period}}</div>
  </header>
  <table>
    <tr><th>Bailleur</th><td>{{landlordName}}</td></tr>
    <tr><th>Bien</th><td>{{propertyLabel}}</td></tr>
  </table>
  <table>
    <tr><th>Désignation</th><th>Montant</th></tr>
    {{#each lines}}<tr><td>{{this.label}}</td><td class="amount{{#if this.isDebit}} debit{{/if}}">{{#if this.isDebit}}− {{/if}}{{xaf this.amount}}</td></tr>{{/each}}
  </table>
  <table>
    <tr><td>Loyers encaissés</td><td class="amount">{{xaf statement.rentCollectedAmount}}</td></tr>
    <tr><td>Charges encaissées</td><td class="amount">{{xaf statement.chargesCollectedAmount}}</td></tr>
    <tr><td>Honoraires de gestion</td><td class="amount debit">− {{xaf statement.commissionAmount}}</td></tr>
    <tr><td>TVA sur honoraires</td><td class="amount debit">− {{xaf statement.commissionVatAmount}}</td></tr>
    <tr><td>Dépenses</td><td class="amount debit">− {{xaf statement.expensesAmount}}</td></tr>
    {{#if hasCarryForward}}<tr><td>Report de la période précédente</td><td class="amount debit">− {{xaf statement.carryForwardAmount}}</td></tr>{{/if}}
    <tr class="total"><td>Net à reverser</td><td class="amount">{{xaf statement.netPayableAmount}}</td></tr>
  </table>
  <p class="mention">Un solde net négatif est reporté sur le relevé du mois suivant, sans appel de fonds automatique.</p>
</body></html>`;
