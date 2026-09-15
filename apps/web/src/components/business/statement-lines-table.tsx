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
import { OWNER_STATEMENT_LINE_TYPE_LABELS } from '@/lib/enum-labels';
import type { OwnerStatementLine } from '@/lib/api/types';

export interface StatementLinesTableProps {
  lines: OwnerStatementLine[];
  className?: string;
}

/**
 * Lignes d'un relevé de gérance, colonnes Débit et Crédit selon `isDebit`.
 * `amount` n'est jamais négatif dans le contrat (arbitrage n°2) : cette table
 * n'affiche donc jamais de montant négatif, le sens vient uniquement de la colonne.
 */
export function StatementLinesTable({ lines, className }: StatementLinesTableProps) {
  if (lines.length === 0) {
    return (
      <EmptyState
        title="Aucune ligne"
        description="Ce relevé ne comporte aucune ligne pour le moment."
        className={className}
      />
    );
  }

  const sorted = [...lines].sort((a, b) => a.position - b.position);
  const totalDebit = sorted.filter((l) => l.isDebit).reduce((sum, l) => sum + l.amount, 0);
  const totalCredit = sorted.filter((l) => !l.isDebit).reduce((sum, l) => sum + l.amount, 0);

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Libellé</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Débit</TableHead>
            <TableHead className="text-right">Crédit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((line) => (
            <TableRow key={line.id}>
              <TableCell className="font-medium">{line.label}</TableCell>
              <TableCell className="text-muted-foreground">
                {OWNER_STATEMENT_LINE_TYPE_LABELS[line.lineType]}
              </TableCell>
              <TableCell className="text-right">
                {line.isDebit ? <MoneyXaf amount={line.amount} /> : '—'}
              </TableCell>
              <TableCell className="text-right">
                {!line.isDebit ? <MoneyXaf amount={line.amount} /> : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-2 flex items-center justify-end gap-6 text-sm font-medium">
        <span>
          Total débit <MoneyXaf amount={totalDebit} />
        </span>
        <span>
          Total crédit <MoneyXaf amount={totalCredit} />
        </span>
      </div>
    </div>
  );
}
