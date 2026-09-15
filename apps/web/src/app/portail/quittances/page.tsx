'use client';

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
import { PageHeader } from '@/components/business/page-header';
import { usePortalReceipts } from '@/lib/api/hooks/use-portal';

export default function PortailQuittancesPage() {
  const { data } = usePortalReceipts({ limit: 50 });
  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes quittances"
        description="Consultation seule des quittances de vos locataires."
      />
      {items.length === 0 ? (
        <EmptyState
          title="Aucune quittance"
          description="Les quittances émises apparaîtront ici."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Locataire</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.receiptNumber}</TableCell>
                <TableCell>{r.tenant.displayName}</TableCell>
                <TableCell>{r.issueDate}</TableCell>
                <TableCell className="text-right">
                  <MoneyXaf amount={r.totalAmount} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
