import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MoneyXaf } from '@/components/business/money-xaf';
import { EmptyState } from '@/components/business/empty-state';
import type { TenantStatement, TenantStatementLine } from '@/lib/api/types';

const TYPE_LABELS: Record<TenantStatementLine['type'], string> = {
  INVOICE: 'Facture',
  PAYMENT: 'Paiement',
  REVERSAL: 'Contre-passation',
  CREDIT: 'Crédit',
};

export interface StatementTableProps {
  statement: TenantStatement;
  className?: string;
}

/** Tableau de relevé de compte locataire : solde d'ouverture, mouvements, solde de clôture. */
export function StatementTable({ statement, className }: StatementTableProps) {
  if (statement.lines.length === 0) {
    return (
      <EmptyState
        title="Aucun mouvement"
        description="Aucune facture ni aucun paiement sur cette période."
        className={className}
      />
    );
  }

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Solde d&apos;ouverture</span>
        <MoneyXaf amount={statement.openingBalance} className="font-medium" />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Référence</TableHead>
            <TableHead className="text-right">Débit</TableHead>
            <TableHead className="text-right">Crédit</TableHead>
            <TableHead className="text-right">Solde</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {statement.lines.map((line, index) => (
            <TableRow key={`${line.reference}-${index}`}>
              <TableCell>{line.date}</TableCell>
              <TableCell>{TYPE_LABELS[line.type]}</TableCell>
              <TableCell className="font-medium">{line.reference}</TableCell>
              <TableCell className="text-right">
                {line.debit > 0 ? <MoneyXaf amount={line.debit} /> : '—'}
              </TableCell>
              <TableCell className="text-right">
                {line.credit > 0 ? <MoneyXaf amount={line.credit} /> : '—'}
              </TableCell>
              <TableCell className="text-right">
                <MoneyXaf amount={line.balance} colorize />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Solde de clôture</span>
        <MoneyXaf amount={statement.closingBalance} className="font-semibold" colorize />
      </div>
    </div>
  );
}
