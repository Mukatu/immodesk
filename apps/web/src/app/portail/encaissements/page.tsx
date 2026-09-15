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
import { usePortalCollections } from '@/lib/api/hooks/use-portal';

export default function PortailEncaissementsPage() {
  const { data } = usePortalCollections({ limit: 50 });
  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Encaissements confirmés"
        description="Consultation seule des loyers encaissés pour vos biens."
      />
      {items.length === 0 ? (
        <EmptyState
          title="Aucun encaissement"
          description="Les encaissements confirmés apparaîtront ici."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Locataire</TableHead>
              <TableHead>Lot</TableHead>
              <TableHead>Facture</TableHead>
              <TableHead className="text-right">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((c) => (
              <TableRow key={c.paymentId}>
                <TableCell>{c.paymentDate}</TableCell>
                <TableCell>{c.tenant.displayName}</TableCell>
                <TableCell>{c.unit.code}</TableCell>
                <TableCell>{c.invoiceNumber ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <MoneyXaf amount={c.amount} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
