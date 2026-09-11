'use client';

import { PageHeader } from '@/components/business/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/business/empty-state';
import { useNotificationTemplates } from '@/lib/api/hooks/use-notification-templates';
import { TemplateCard } from './_components/template-card';

const CODE_LABELS: Record<string, string> = {
  RECEIPT_ISSUED: 'Quittance de loyer',
  CASH_RECEIPT_ISSUED: 'Reçu de caisse',
  INVOICE_ISSUED: "Avis d'échéance",
};

/** Paramétrage des gabarits de notification WhatsApp/SMS (phase 3). */
export default function ParametresMessagesPage() {
  const { data, isLoading } = useNotificationTemplates();
  const templates = data?.items ?? [];

  const byCode = new Map<string, typeof templates>();
  for (const template of templates) {
    const list = byCode.get(template.code) ?? [];
    list.push(template);
    byCode.set(template.code, list);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Gabarits de messages"
        description="Corps des messages WhatsApp et SMS envoyés aux locataires."
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : byCode.size === 0 ? (
        <EmptyState title="Aucun gabarit" description="Aucun gabarit de notification configuré." />
      ) : (
        [...byCode.entries()].map(([code, group]) => (
          <section key={code} className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">{CODE_LABELS[code] ?? code}</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {group.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
