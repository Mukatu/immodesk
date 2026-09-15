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
import { PayoutStatusBadge } from '@/components/business/payout-status-badge';
import { EmptyState } from '@/components/business/empty-state';
import { PageHeader } from '@/components/business/page-header';
import { usePortalPayouts } from '@/lib/api/hooks/use-portal';

export default function PortailReversementsPage() {
  const { data } = usePortalPayouts({ limit: 50 });
  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes reversements"
        description="Consultation seule des reversements exécutés ou en cours."
      />
      {items.length === 0 ? (
        <EmptyState title="Aucun reversement" description="Vos reversements apparaîtront ici." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead className="text-right">Montant net</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.reference}</TableCell>
                <TableCell className="text-right">
                  <MoneyXaf amount={p.netAmount} />
                </TableCell>
                <TableCell>
                  <PayoutStatusBadge status={p.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
