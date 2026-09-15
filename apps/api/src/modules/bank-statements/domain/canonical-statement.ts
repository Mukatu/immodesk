export type StatementFormat = 'CSV' | 'MT940' | 'CAMT053' | 'OFX' | 'XLSX' | 'PDF_OCR';
export type ImplementedFormat = Extract<StatementFormat, 'CSV' | 'MT940'>;
export type StatementLineDirection = 'CREDIT' | 'DEBIT';

export interface CanonicalStatementLine {
  lineNumber: number;
  direction: StatementLineDirection;
  operationDate: string;
  valueDate?: string;
  amount: number;
  label: string;
  counterpartyName?: string;
  counterpartyAccount?: string;
  bankReference?: string;
  endToEndReference?: string;
  operationCode?: string;
  runningBalance?: number;
  raw: Record<string, unknown>;
}

export interface CanonicalStatement {
  statementReference?: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  currency: 'XAF';
  lines: CanonicalStatementLine[];
}

export interface BankStatementAdapter {
  readonly code: string;
  readonly label: string;
  readonly format: ImplementedFormat;
  detect(file: Buffer): boolean;
  parse(file: Buffer): CanonicalStatement;
}
