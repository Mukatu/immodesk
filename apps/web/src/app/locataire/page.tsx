'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/business/empty-state';
import { InvoiceStatusBadge } from '@/components/business/invoice-status-badge';
import { MoneyXaf } from '@/components/business/money-xaf';
import { useTenantAuth } from '@/lib/auth/tenant-auth-context';
import { useTenantInvoices } from '@/lib/api/hooks/use-tenant-portal';

/** Formate une date ISO "AAAA-MM-JJ" en "jj/mm/aaaa", sans dépendance externe. */
function formatDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

/** Accueil du portail locataire : liste des factures des baux actifs, la plus récente en tête. */
export default function AccueilLocatairePage() {
  const { tenant } = useTenantAuth();
  const { data, isLoading, isError } = useTenantInvoices({ limit: 50 });

  const invoices = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bonjour {tenant?.displayName}</h1>
        <p className="text-sm text-muted-foreground">
          Vos factures de loyer, tous baux actifs confondus.
        </p>
      </div>

      {isError ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          Impossible de charger vos factures pour le moment.
        </p>
      ) : null}

      {!isLoading && invoices.length === 0 && !isError ? (
        <EmptyState
          icon={FileText}
          title="Aucune facture pour le moment"
          description="Vos factures de loyer apparaîtront ici dès leur émission."
        />
      ) : null}

      <div className="grid gap-3">
        {invoices.map((invoice) => (
          <Link key={invoice.id} href={`/locataire/factures/${invoice.id}`}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                <div>
                  <p className="font-medium">{invoice.invoiceNumber ?? invoice.property.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {invoice.property.name} — Lot {invoice.unit.code}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Échéance {formatDate(invoice.dueDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <MoneyXaf amount={invoice.balanceAmount} className="text-lg font-semibold" />
                  <InvoiceStatusBadge status={invoice.status} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
