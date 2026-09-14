'use client';

import * as React from 'react';
import { ShieldAlert } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

import { PageHeader } from '@/components/business/page-header';
import { DataTable } from '@/components/business/data-table';
import { EnumSelect } from '@/components/business/enum-select';
import { WebhookStatusBadge } from '@/components/business/webhook-status-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/auth/auth-context';
import { useWebhookEvents } from '@/lib/api/hooks/use-webhook-events';
import { WEBHOOK_SOURCE_LABELS, WEBHOOK_STATUS_LABELS } from '@/lib/enum-labels';
import type { WebhookEvent, WebhookSource, WebhookStatus } from '@/lib/api/types';
import { ReplayWebhookButton } from './_components/replay-webhook-button';

const PAGE_SIZE = 20;

/**
 * Journal technique des webhooks entrants (phase 4) : réservé à OWNER dans le
 * contrat (`GET/POST /v1/webhook-events`). Aucun précédent de page restreinte
 * par rôle dans le code existant : vérification simple avec le contexte
 * d'auth, message d'accès refusé affiché à la place du contenu.
 */
export default function ParametresWebhooksPage() {
  const { currentOrganization } = useAuth();
  const isOwner = currentOrganization?.role === 'OWNER';

  const [source, setSource] = React.useState<WebhookSource | ''>('');
  const [status, setStatus] = React.useState<WebhookStatus | ''>('');
  const [signatureValid, setSignatureValid] = React.useState<'' | 'true' | 'false'>('');
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [previousCursors, setPreviousCursors] = React.useState<string[]>([]);

  const { data, isLoading } = useWebhookEvents({
    source: source || undefined,
    status: status || undefined,
    signatureValid: signatureValid === '' ? undefined : signatureValid === 'true',
    cursor,
    limit: PAGE_SIZE,
  });

  const events = data?.items ?? [];

  function resetPagination() {
    setCursor(undefined);
    setPreviousCursors([]);
  }

  function handleNextPage() {
    if (data?.pageInfo.nextCursor) {
      setPreviousCursors((prev) => [...prev, cursor ?? '']);
      setCursor(data.pageInfo.nextCursor);
    }
  }

  function handlePreviousPage() {
    setPreviousCursors((prev) => {
      const next = [...prev];
      const last = next.pop();
      setCursor(last || undefined);
      return next;
    });
  }

  const columns = React.useMemo<ColumnDef<WebhookEvent>[]>(
    () => [
      { header: 'Source', cell: ({ row }) => WEBHOOK_SOURCE_LABELS[row.original.source] },
      { header: "Type d'événement", cell: ({ row }) => row.original.eventType },
      {
        header: 'Statut',
        cell: ({ row }) => (
          <WebhookStatusBadge
            status={row.original.status}
            signatureValid={row.original.signatureValid}
          />
        ),
      },
      {
        header: 'Reçu le',
        cell: ({ row }) => new Date(row.original.receivedAt).toLocaleString('fr-CG'),
      },
      { header: 'Tentatives', cell: ({ row }) => row.original.processingAttempts },
      {
        header: 'Actions',
        cell: ({ row }) => <ReplayWebhookButton eventId={row.original.id} />,
      },
    ],
    [],
  );

  if (!isOwner) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-warning/10 text-warning">
          <ShieldAlert className="size-7" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Accès refusé</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Accès réservé aux propriétaires de l&apos;organisation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Webhooks"
        description="Journal technique des événements entrants (Mobile Money, virement, messagerie)."
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-52 space-y-1">
          <label
            htmlFor="webhook-source-filter"
            className="text-xs font-medium text-muted-foreground"
          >
            Source
          </label>
          <EnumSelect<WebhookSource>
            id="webhook-source-filter"
            value={source}
            onValueChange={(v) => {
              setSource(v);
              resetPagination();
            }}
            labels={WEBHOOK_SOURCE_LABELS}
            placeholder="Toutes les sources"
          />
        </div>

        <div className="w-52 space-y-1">
          <label
            htmlFor="webhook-status-filter"
            className="text-xs font-medium text-muted-foreground"
          >
            Statut
          </label>
          <EnumSelect<WebhookStatus>
            id="webhook-status-filter"
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              resetPagination();
            }}
            labels={WEBHOOK_STATUS_LABELS}
            placeholder="Tous les statuts"
          />
        </div>

        <div className="w-52 space-y-1">
          <label
            htmlFor="webhook-signature-filter"
            className="text-xs font-medium text-muted-foreground"
          >
            Signature
          </label>
          <Select
            value={signatureValid || undefined}
            onValueChange={(v) => {
              setSignatureValid(v as 'true' | 'false');
              resetPagination();
            }}
          >
            <SelectTrigger id="webhook-signature-filter">
              <SelectValue placeholder="Toutes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Signature valide</SelectItem>
              <SelectItem value="false">Signature invalide</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={events}
        isLoading={isLoading}
        emptyTitle="Aucun événement"
        emptyDescription="Les événements webhook reçus par la plateforme apparaissent ici."
        pageInfo={data?.pageInfo}
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
        hasPreviousPage={previousCursors.length > 0}
      />
    </div>
  );
}
