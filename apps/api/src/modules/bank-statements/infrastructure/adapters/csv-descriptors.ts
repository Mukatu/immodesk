/**
 * Descripteur déclaratif d'un export CSV bancaire.
 *
 * Ajouter une banque revient à ajouter un descripteur (et un échantillon de
 * test) : `createCsvAdapter(descriptor)` dans `csv-adapter.ts` interprète
 * n'importe lequel d'entre eux, aucun code nouveau n'est écrit.
 *
 * Les noms de colonnes sont comparés au libellé de l'en-tête APRÈS pliage
 * (`foldSearchText` : minuscules, sans accents), donc `'Libellé'` reconnaît
 * aussi bien « LIBELLE » que « libellé ».
 */
export interface CsvColumnMapping {
  operationDate: string;
  valueDate?: string;
  label: string;
  debit?: string;
  credit?: string;
  amount?: string;
  direction?: string;
  balance?: string;
  reference?: string;
  endToEndReference?: string;
}

export type CsvAmountSign = 'separate-columns' | 'signed-single-column';
export type CsvDateFormat = 'DD/MM/YYYY' | 'YYYY-MM-DD';

export interface CsvBankDescriptor {
  code: string;
  label: string;
  version: number;
  separator: string;
  encoding: BufferEncoding;
  dateFormat: CsvDateFormat;
  /** Lignes à ignorer AVANT la ligne d'en-tête (bandeau, coordonnées agence). */
  headerLinesToSkip: number;
  columns: CsvColumnMapping;
  amountSign: CsvAmountSign;
}

/** BGFI Bank Congo : montants en deux colonnes séparées, point-virgule. */
export const BGFI_DESCRIPTOR: CsvBankDescriptor = {
  code: 'BGFI',
  label: 'BGFI Bank Congo',
  version: 1,
  separator: ';',
  encoding: 'utf8',
  dateFormat: 'DD/MM/YYYY',
  headerLinesToSkip: 0,
  columns: {
    operationDate: 'Date opération',
    valueDate: 'Date valeur',
    label: 'Libellé',
    debit: 'Débit',
    credit: 'Crédit',
    reference: 'Référence BGFI',
  },
  amountSign: 'separate-columns',
};

/** LCB (La Congolaise de Banque) : montant signé unique, virgule. */
export const LCB_DESCRIPTOR: CsvBankDescriptor = {
  code: 'LCB',
  label: 'La Congolaise de Banque',
  version: 1,
  separator: ',',
  encoding: 'utf8',
  dateFormat: 'DD/MM/YYYY',
  headerLinesToSkip: 1,
  columns: {
    operationDate: 'Date operation',
    valueDate: 'Date valeur',
    label: 'Libelle operation',
    amount: 'Montant',
    direction: 'Sens',
    reference: 'Reference LCB',
  },
  amountSign: 'signed-single-column',
};

/** Ecobank Congo : export pipe, montant signé + sens explicite. */
export const ECOBANK_DESCRIPTOR: CsvBankDescriptor = {
  code: 'ECOBANK',
  label: 'Ecobank Congo',
  version: 1,
  separator: '|',
  encoding: 'utf8',
  dateFormat: 'YYYY-MM-DD',
  headerLinesToSkip: 2,
  columns: {
    operationDate: 'Date comptable',
    valueDate: 'Date valeur',
    label: 'Libelle',
    amount: 'Montant',
    direction: 'Sens',
    reference: 'Reference Ecobank',
    endToEndReference: 'Reference bout en bout',
  },
  amountSign: 'signed-single-column',
};

/** UBA Congo : deux colonnes de montant, solde progressif fourni. */
export const UBA_DESCRIPTOR: CsvBankDescriptor = {
  code: 'UBA',
  label: 'United Bank for Africa Congo',
  version: 1,
  separator: ';',
  encoding: 'utf8',
  dateFormat: 'DD/MM/YYYY',
  headerLinesToSkip: 0,
  columns: {
    operationDate: 'Date transaction',
    valueDate: 'Date valeur',
    label: 'Description',
    debit: 'Debit',
    credit: 'Credit',
    balance: 'Solde',
    reference: 'Ref transaction UBA',
    endToEndReference: 'Reference bout en bout',
  },
  amountSign: 'separate-columns',
};

export const CSV_DESCRIPTORS: readonly CsvBankDescriptor[] = [
  BGFI_DESCRIPTOR,
  LCB_DESCRIPTOR,
  ECOBANK_DESCRIPTOR,
  UBA_DESCRIPTOR,
];
