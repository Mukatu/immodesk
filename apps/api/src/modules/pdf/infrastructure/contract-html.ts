/**
 * Gabarit Handlebars du contrat de bail — HTML + CSS au format A4.
 *
 * Isolé dans son propre fichier : c'est un DOCUMENT, relu par une agence et
 * par un conseil juridique, pas du code. Le noyer au milieu de la logique de
 * rendu le rendrait illisible pour ceux qui doivent précisément le relire.
 *
 * Aucune ressource externe : ni police distante, ni image, ni feuille de
 * style. Le rendu doit être identique hors ligne, sur le VPS comme sur le
 * poste d'un développeur — une police téléchargée introduirait une variation
 * invisible et casserait le déterminisme de l'empreinte.
 *
 * La DATE DE GÉNÉRATION n'apparaît pas ici : elle est imprimée par le pied de
 * page de Puppeteer. C'est ce qui rend le HTML — et donc son empreinte —
 * identique d'un rendu à l'autre pour un même bail.
 */
export const CONTRACT_HTML_TEMPLATE = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>{{template.headerTitle}} — {{lease.reference}}</title>
<style>
  @page { size: A4; margin: 18mm 16mm 22mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Times New Roman", Georgia, serif;
    font-size: 10.5pt; line-height: 1.45; color: #111; margin: 0;
  }
  h1 {
    font-size: 15pt; text-align: center; text-transform: uppercase;
    letter-spacing: .04em; margin: 0 0 4mm; padding-bottom: 3mm;
    border-bottom: 1.5pt solid #111;
  }
  h2 {
    font-size: 11pt; text-transform: uppercase; letter-spacing: .03em;
    margin: 6mm 0 2mm; padding-bottom: 1mm; border-bottom: .5pt solid #999;
  }
  h3 { font-size: 10.5pt; margin: 4mm 0 1mm; }
  p { margin: 0 0 2.5mm; text-align: justify; }
  .agency { text-align: center; font-size: 9.5pt; color: #444; margin-bottom: 2mm; }
  .reference { text-align: center; font-size: 10pt; margin-bottom: 5mm; }
  .reference strong { letter-spacing: .05em; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 3mm; }
  th, td { border: .5pt solid #999; padding: 1.6mm 2.2mm; vertical-align: top; }
  th { width: 38%; background: #f2f2f2; text-align: left; font-weight: normal; color: #333; }
  td.amount { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  ol { margin: 0 0 3mm; padding-left: 6mm; }
  ol li { margin-bottom: 2mm; text-align: justify; }
  .ohada { border: .75pt solid #111; padding: 3mm; margin: 3mm 0; background: #fafafa; }
  .mentions { font-size: 9.5pt; color: #333; }
  .signatures { margin-top: 8mm; width: 100%; }
  .signatures td { border: none; padding: 0 4mm; width: 50%; vertical-align: top; }
  .sign-box { border: .5pt solid #999; height: 26mm; margin-top: 2mm; }
  .sign-label { font-size: 9.5pt; color: #333; }
  .place { margin-top: 6mm; font-size: 10pt; }
  .footer-note { margin-top: 6mm; font-size: 9pt; color: #555; text-align: center; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>
  <div class="agency">
    {{organization.legalName}}{{#if organization.tradeName}} — {{organization.tradeName}}{{/if}}
    {{#if organization.rccmNumber}}<br>RCCM {{organization.rccmNumber}}{{/if}}
  </div>

  <h1>{{template.headerTitle}}</h1>

  <div class="reference">
    {{#if lease.reference}}Référence : <strong>{{lease.reference}}</strong>{{else}}Projet de contrat — référence attribuée à l'activation{{/if}}
  </div>

  <p>{{template.lessorBlock}}</p>

  <h2>Entre les soussignés</h2>
  <table>
    <tr><th>Le bailleur</th><td>{{landlord.displayName}}{{#if landlord.addressLine}}, {{landlord.addressLine}}{{/if}} — téléphone {{landlord.primaryPhone}}</td></tr>
    <tr><th>Le preneur</th><td>{{tenant.displayName}} — téléphone {{tenant.primaryPhone}}{{#if tenant.idDocumentNumber}}, pièce d'identité n° {{tenant.idDocumentNumber}}{{/if}}</td></tr>
  </table>

  <h2>Désignation des lieux loués</h2>
  <table>
    <tr><th>Immeuble</th><td>{{property.name}}</td></tr>
    <tr><th>Adresse</th><td>{{property.addressLine}}, quartier {{property.district}}, {{property.city}}</td></tr>
    <tr><th>Lot</th><td>{{unit.code}}{{#if unit.label}} — {{unit.label}}{{/if}} ({{unitTypeLabel}}{{#if unit.roomsCount}}, {{unit.roomsCount}} pièce(s){{/if}})</td></tr>
  </table>

  <h2>Conditions financières</h2>
  <table>
    <tr><th>Loyer {{rentPeriodLabel}}</th><td class="amount">{{xaf lease.rentAmount}}</td></tr>
    <tr><th>Charges{{#if lease.chargesAreProvisional}} (provisions){{/if}}</th><td class="amount">{{xaf lease.chargesAmount}}</td></tr>
    <tr><th>Total par échéance</th><td class="amount"><strong>{{xaf totalAmount}}</strong></td></tr>
    <tr><th>Dépôt de garantie</th><td class="amount">{{xaf lease.depositAmount}}{{#if depositMonths}} ({{depositMonths}} mois de loyer){{/if}}</td></tr>
    {{#if lease.agencyFeeAmount}}<tr><th>Frais d'agence</th><td class="amount">{{xaf lease.agencyFeeAmount}}</td></tr>{{/if}}
    {{#if lease.advanceMonths}}<tr><th>Avance de loyers</th><td>{{lease.advanceMonths}} mois</td></tr>{{/if}}
    <tr><th>Jour d'échéance</th><td>Le {{lease.paymentDueDay}} de chaque période, tolérance de {{lease.graceDays}} jour(s)</td></tr>
    <tr><th>Mode de règlement</th><td>{{paymentMethodLabel}}</td></tr>
  </table>

  <h2>Durée du bail</h2>
  <table>
    <tr><th>Date d'effet</th><td>{{frDate lease.startDate}}</td></tr>
    <tr><th>Terme</th><td>{{#if lease.endDate}}{{frDate lease.endDate}}{{else}}Durée indéterminée{{/if}}</td></tr>
    <tr><th>Entrée dans les lieux</th><td>{{#if lease.moveInDate}}{{frDate lease.moveInDate}}{{else}}À la remise des clés{{/if}}</td></tr>
    <tr><th>Préavis</th><td>{{lease.noticeDays}} jours</td></tr>
  </table>

  {{#if hasOtherParties}}
  <h2>Autres parties au contrat</h2>
  <table>
    <tr><th>Qualité</th><th style="width:auto">Identité</th></tr>
    {{#each otherParties}}
    <tr><th>{{this.roleLabel}}</th><td>{{this.displayName}}{{#if this.isSolidary}} — solidaire{{/if}}{{#if this.shareLabel}} ({{this.shareLabel}}){{/if}}</td></tr>
    {{/each}}
  </table>
  {{/if}}

  <h2>Clauses</h2>
  <ol>
    {{#each clauses}}
    <li><strong>{{this.title}}.</strong> {{this.body}}</li>
    {{/each}}
  </ol>

  {{#if showOhada}}
  <div class="ohada">
    <h3>{{ohada.title}}</h3>
    <p>{{ohada.body}}</p>
  </div>
  {{/if}}

  {{#if lease.notes}}
  <h2>Conditions particulières</h2>
  <p>{{lease.notes}}</p>
  {{/if}}

  <h2>Mentions légales</h2>
  <p class="mentions">{{template.legalMentions}}</p>

  <p class="place">Fait à {{template.signatureCity}}, en deux exemplaires originaux.</p>

  <table class="signatures">
    <tr>
      <td><div class="sign-label">Le bailleur — {{landlord.displayName}}</div><div class="sign-box"></div></td>
      <td><div class="sign-label">Le preneur — {{tenant.displayName}}</div><div class="sign-box"></div></td>
    </tr>
  </table>

  {{#if template.footerText}}<p class="footer-note">{{template.footerText}}</p>{{/if}}
</body>
</html>`;
