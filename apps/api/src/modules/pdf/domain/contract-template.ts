/**
 * Gabarit de contrat de bail paramétrable par organisation.
 *
 * Stocké dans `organization_settings.settings_json.contractTemplate`. Le
 * défaut ci-dessous est un bail à usage d'habitation pour le
 * Congo-Brazzaville ; le bail commercial réutilise le même gabarit avec le
 * bloc OHADA activé (`showOhadaBlock`), déduit du type de lot.
 *
 * AVERTISSEMENT ASSUMÉ : ces clauses sont un point de départ opérationnel,
 * pas un avis juridique. Le plan de phases prévoit leur validation par un
 * conseil local (§ 2.8) ; d'ici là, chaque organisation peut réécrire
 * intégralement l'en-tête, les clauses et les mentions.
 */
export interface ContractClause {
  key: string;
  title: string;
  body: string;
  enabled: boolean;
}

export interface ContractTemplate {
  headerTitle: string;
  lessorBlock: string;
  optionalClauses: ContractClause[];
  legalMentions: string;
  signatureCity: string;
  showOhadaBlock: boolean;
  footerText: string | null;
}

export const CONTRACT_TEMPLATE_KEY = 'contractTemplate';

export const DEFAULT_CONTRACT_TEMPLATE: ContractTemplate = {
  headerTitle: "CONTRAT DE BAIL À USAGE D'HABITATION",
  lessorBlock:
    "Le présent contrat est établi par l'agence désignée ci-dessous, agissant pour le compte " +
    'du bailleur en vertu du mandat de gestion qui lui a été confié.',
  optionalClauses: [
    {
      key: 'destination',
      title: 'Destination des lieux',
      body:
        'Les lieux loués sont destinés exclusivement à l’habitation du preneur et de sa famille. ' +
        'Toute activité commerciale ou artisanale y est interdite sans accord écrit du bailleur.',
      enabled: true,
    },
    {
      key: 'entretien',
      title: 'Entretien et réparations',
      body:
        'Le preneur entretient les lieux en bon père de famille et prend à sa charge les réparations ' +
        'locatives. Les grosses réparations et le clos et couvert restent à la charge du bailleur.',
      enabled: true,
    },
    {
      key: 'eau_electricite',
      title: 'Eau et électricité',
      body:
        'Les abonnements et consommations d’eau (LCDE) et d’électricité (E2C) sont à la charge du ' +
        'preneur, sauf stipulation contraire portée aux conditions particulières.',
      enabled: true,
    },
    {
      key: 'sous_location',
      title: 'Cession et sous-location',
      body:
        'Toute cession du bail et toute sous-location, même partielle et à titre gratuit, sont ' +
        'interdites sans l’accord écrit et préalable du bailleur.',
      enabled: true,
    },
    {
      key: 'assurance',
      title: 'Assurance',
      body:
        'Le preneur souscrit une assurance couvrant les risques locatifs et en justifie à la remise ' +
        'des clés, puis à chaque échéance annuelle.',
      enabled: false,
    },
    {
      key: 'etat_des_lieux',
      title: 'État des lieux',
      body:
        'Un état des lieux contradictoire est dressé à l’entrée et à la sortie. À défaut d’état des ' +
        'lieux d’entrée, les lieux sont réputés reçus en bon état.',
      enabled: true,
    },
  ],
  legalMentions:
    'Le présent contrat est régi par les dispositions légales et réglementaires en vigueur en ' +
    'République du Congo. Les parties déclarent en avoir reçu chacune un exemplaire original. ' +
    'Tout litige relève des juridictions compétentes de Brazzaville.',
  signatureCity: 'Brazzaville',
  showOhadaBlock: false,
  footerText: null,
};

/** Bloc ajouté aux baux commerciaux (lot SHOP, OFFICE ou WAREHOUSE). */
export const OHADA_BLOCK = {
  title: 'Bail à usage professionnel — Acte uniforme OHADA',
  body:
    'Le présent bail est soumis aux dispositions de l’Acte uniforme OHADA portant sur le droit ' +
    'commercial général, livre relatif au bail à usage professionnel. Le preneur bénéficie du ' +
    'droit au renouvellement dans les conditions et délais prévus par cet Acte uniforme ; la ' +
    'demande de renouvellement est formée au plus tard trois mois avant l’expiration du bail, ' +
    'par acte extrajudiciaire ou par tout moyen laissant trace écrite.',
};

/**
 * Fusionne le gabarit stocké avec le défaut.
 *
 * Tolérante par construction : `settings_json` est un JSONB libre, qu'une
 * version antérieure ou une saisie manuelle peut avoir laissé incomplet.
 * Un champ absent ou mal typé retombe sur le défaut plutôt que de faire
 * échouer une génération de contrat — refuser d'imprimer parce qu'un pied de
 * page manque serait disproportionné.
 */
export function mergeContractTemplate(stored: unknown): ContractTemplate {
  const source = (typeof stored === 'object' && stored !== null ? stored : {}) as Record<
    string,
    unknown
  >;

  return {
    headerTitle: text(source.headerTitle, DEFAULT_CONTRACT_TEMPLATE.headerTitle),
    lessorBlock: text(source.lessorBlock, DEFAULT_CONTRACT_TEMPLATE.lessorBlock),
    optionalClauses: clauses(source.optionalClauses),
    legalMentions: text(source.legalMentions, DEFAULT_CONTRACT_TEMPLATE.legalMentions),
    signatureCity: text(source.signatureCity, DEFAULT_CONTRACT_TEMPLATE.signatureCity),
    showOhadaBlock:
      typeof source.showOhadaBlock === 'boolean'
        ? source.showOhadaBlock
        : DEFAULT_CONTRACT_TEMPLATE.showOhadaBlock,
    footerText: typeof source.footerText === 'string' ? source.footerText : null,
  };
}

/** Applique une modification partielle sur le gabarit courant. */
export function patchContractTemplate(
  current: ContractTemplate,
  patch: Partial<ContractTemplate>,
): ContractTemplate {
  return {
    ...current,
    ...(patch.headerTitle !== undefined ? { headerTitle: patch.headerTitle } : {}),
    ...(patch.lessorBlock !== undefined ? { lessorBlock: patch.lessorBlock } : {}),
    ...(patch.optionalClauses !== undefined
      ? { optionalClauses: clauses(patch.optionalClauses) }
      : {}),
    ...(patch.legalMentions !== undefined ? { legalMentions: patch.legalMentions } : {}),
    ...(patch.signatureCity !== undefined ? { signatureCity: patch.signatureCity } : {}),
    ...(patch.showOhadaBlock !== undefined ? { showOhadaBlock: patch.showOhadaBlock } : {}),
    ...(patch.footerText !== undefined ? { footerText: patch.footerText } : {}),
  };
}

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function clauses(value: unknown): ContractClause[] {
  if (!Array.isArray(value))
    return DEFAULT_CONTRACT_TEMPLATE.optionalClauses.map((c) => ({ ...c }));
  const parsed = value
    .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
    .map((c) => ({
      key: text(c.key, 'clause'),
      title: text(c.title, ''),
      body: text(c.body, ''),
      enabled: typeof c.enabled === 'boolean' ? c.enabled : true,
    }))
    .filter((c) => c.title.length > 0 && c.body.length > 0);
  return parsed.length > 0
    ? parsed
    : DEFAULT_CONTRACT_TEMPLATE.optionalClauses.map((c) => ({ ...c }));
}
