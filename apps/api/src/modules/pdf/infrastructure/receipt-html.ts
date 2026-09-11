/**
 * Gabarit de la QUITTANCE DE LOYER — format A5 (défaut) ou A4.
 *
 * C'est la pièce que le locataire présente comme preuve de paiement : elle
 * porte le numéro QUI, les parties, le lot, la période, le détail réglé, le
 * mode de règlement et sa référence, le reste dû éventuel et le QR de
 * vérification publique. Aucune ressource externe : le QR est une image
 * embarquée (data URL), les polices sont celles du système.
 */
export const RECEIPT_HTML_TEMPLATE = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Quittance {{receipt.number}}</title>
<style>
  @page { size: {{pageSize}}; margin: 9mm 10mm 12mm 10mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; line-height: 1.35; color: #111; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: flex-start;
           border-bottom: 1.5pt solid #111; padding-bottom: 2.5mm; margin-bottom: 3mm; }
  .org strong { font-size: 10.5pt; }
  .org { font-size: 8.5pt; color: #333; }
  .title { text-align: right; }
  h1 { font-size: 13pt; margin: 0 0 1mm; text-transform: uppercase; letter-spacing: .05em; }
  .number { font-size: 10pt; }
  p.attest { text-align: justify; margin: 0 0 3mm; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 2.5mm; }
  th, td { border: .5pt solid #999; padding: 1.3mm 2mm; text-align: left; vertical-align: top; }
  th { width: 42%; background: #f4f4f4; font-weight: normal; color: #333; }
  td.amount { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  tr.total td, tr.total th { font-weight: bold; background: #e9e9e9; color: #111; }
  .verify { display: flex; gap: 4mm; align-items: center; margin-top: 3mm; }
  .verify img { width: 28mm; height: 28mm; }
  .mention { font-size: 7.5pt; color: #444; }
  .cancelled { color: #a00; border: 1.2pt solid #a00; padding: 1mm 3mm; font-weight: bold;
               display: inline-block; margin-bottom: 2mm; letter-spacing: .05em; }
</style>
</head>
<body>
  <header>
    <div class="org">
      <strong>{{organization.name}}</strong>
      {{#if organization.address}}<br>{{organization.address}}{{/if}}
      {{#if organization.phone}}<br>Tél. {{organization.phone}}{{/if}}
      {{#if organization.rccm}}<br>RCCM {{organization.rccm}}{{/if}}
    </div>
    <div class="title">
      <h1>Quittance de loyer</h1>
      <div class="number">N° <strong>{{receipt.number}}</strong></div>
      <div>Émise le {{receipt.issueDate}}</div>
    </div>
  </header>

  {{#if receipt.cancelled}}<div class="cancelled">QUITTANCE ANNULÉE</div>{{/if}}

  <p class="attest">
    Le bailleur <strong>{{landlordName}}</strong>{{#if agencyManaged}}, représenté par
    <strong>{{organization.name}}</strong>,{{/if}} déclare avoir reçu de
    <strong>{{tenantName}}</strong> la somme de <strong>{{xaf receipt.totalAmount}}</strong>
    au titre du loyer et des charges de la période <strong>{{receipt.period}}</strong>,
    et lui en donne quittance, sous réserve de tous ses droits.
  </p>

  <table>
    <tr><th>Logement</th><td>Lot {{unitCode}} — {{propertyName}}{{#if propertyAddress}}, {{propertyAddress}}{{/if}}</td></tr>
    <tr><th>Période</th><td>{{receipt.period}}</td></tr>
  </table>

  <table>
    <tr><th>Loyer</th><td class="amount">{{xaf receipt.rentAmount}}</td></tr>
    <tr><th>Charges</th><td class="amount">{{xaf receipt.chargesAmount}}</td></tr>
    {{#if hasPenalty}}<tr><th>Pénalités de retard</th><td class="amount">{{xaf receipt.penaltyAmount}}</td></tr>{{/if}}
    <tr class="total"><th>Total réglé</th><td class="amount">{{xaf receipt.totalAmount}}</td></tr>
    {{#if hasRemaining}}<tr><th>Reste dû sur le bail</th><td class="amount">{{xaf receipt.remainingBalance}}</td></tr>{{/if}}
  </table>

  <table>
    <tr><th>Mode de règlement</th><td>{{payment.methodLabel}}</td></tr>
    <tr><th>Référence du règlement</th><td>{{payment.reference}}{{#if payment.externalReference}} — {{payment.externalReference}}{{/if}}{{#if payment.cashReceiptNumber}} — reçu de caisse {{payment.cashReceiptNumber}}{{/if}}</td></tr>
  </table>

  <div class="verify">
    <img src="{{qrDataUrl}}" alt="QR de vérification">
    <div class="mention">
      Authenticité vérifiable en scannant ce code ou sur<br><strong>{{receipt.verificationUrl}}</strong><br><br>
      Cette quittance ne vaut que pour la période indiquée et ne préjuge pas des sommes dues au titre
      d’autres périodes. Empreinte : {{receipt.contentHashShort}}
    </div>
  </div>
</body>
</html>`;
