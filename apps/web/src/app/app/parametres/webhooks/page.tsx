'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';

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
import { useContextPanel } from '@/components/layout/context-panel';
import { apiFetch } from '@/lib/api/client';
import { useWebhookEvents } from '@/lib/api/hooks/use-webhook-events';
import { WEBHOOK_SOURCE_LABELS, WEBHOOK_STATUS_LABELS } from '@/lib/enum-labels';
import type { WebhookEvent, WebhookSource, WebhookStatus } from '@/lib/api/types';
import { ReplayWebhookButton } from './_components/replay-webhook-button';

const PAGE_SIZE = 20;

const WEBHOOK_STATUS_TONE: Record<WebhookStatus, 'ok' | 'info' | 'warning' | 'danger' | 'neutral'> =
  {
    RECEIVED: 'neutral',
    PROCESSING: 'warning',
    PROCESSED: 'ok',
    IGNORED: 'neutral',
    FAILED: 'danger',
  };

/**
 * Journal technique des webhooks entrants (phase 4) : réservé à OWNER dans le
 * contrat (`GET/POST /v1/webhook-events`). Aucun précédent de page restreinte
 * par rôle dans le code existant : vérification simple avec le contexte
 * d'auth, message d'accès refusé affiché à la place du contenu.
 */
export default function ParametresWebhooksPage() {
  const { currentOrganization } = useAuth();
  const isOwner = currentOrganization?.role === 'OWNER';
  const { open: openContextPanel, isOpen: isContextPanelOpen } = useContextPanel();
  const queryClient = useQueryClient();

  const [source, setSource] = React.useState<WebhookSource | ''>('');
  const [status, setStatus] = React.useState<WebhookStatus | ''>('');
  const [signatureValid, setSignatureValid] = React.useState<'' | 'true' | 'false'>('');
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [previousCursors, setPreviousCursors] = React.useState<string[]>([]);
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isContextPanelOpen) setSelectedEventId(null);
  }, [isContextPanelOpen]);

  function handleRowSelect(event: WebhookEvent) {
    setSelectedEventId(event.id);
    const repeatedFailure = event.status === 'FAILED' && event.processingAttempts > 1;
    openContextPanel({
      title: 'Événement webhook',
      blocks: [
        {
          type: 'identity',
          title: WEBHOOK_SOURCE_LABELS[event.source],
          subtitle: event.eventType,
          badge: {
            label: WEBHOOK_STATUS_LABELS[event.status],
            tone: WEBHOOK_STATUS_TONE[event.status],
          },
        },
        {
          type: 'keyvalue',
          title: 'Détail',
          items: [
            { k: 'Identifiant externe', v: event.externalEventId ?? '—' },
            {
              k: 'Signature',
              v:
                event.signatureValid === null
                  ? 'Non vérifiée'
                  : event.signatureValid
                    ? 'Valide'
                    : 'Invalide',
            },
            { k: 'Tentatives de traitement', v: event.processingAttempts },
            { k: 'Reçu le', v: new Date(event.receivedAt).toLocaleString('fr-CG') },
            {
              k: 'Entité liée',
              v: event.relatedEntityType
                ? `${event.relatedEntityType} ${event.relatedEntityId}`
                : '—',
            },
          ],
        },
        ...(repeatedFailure
          ? ([
              {
                type: 'alert',
                tone: 'warning',
                text: event.errorMessage ?? 'Échecs de traitement répétés pour cet événement.',
              },
            ] as const)
          : []),
        {
          type: 'actions',
          actions: [
            {
              label: 'Rejouer cet événement',
              primary: true,
              onSelect: () => {
                apiFetch<void>(`/webhook-events/${event.id}/replay`, { method: 'POST' })
                  .then(() => {
                    toast.success('Événement rejoué.');
                    queryClient.invalidateQueries({ queryKey: ['webhook-events'] });
                  })
                  .catch(() => toast.error('Impossible de rejouer cet événement.'));
              },
            },
          ],
        },
      ],
    });
  }

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
        onRowSelect={handleRowSelect}
        getRowLabel={(event) =>
          `Voir le résumé de l'événement ${WEBHOOK_SOURCE_LABELS[event.source]} ${event.eventType}`
        }
        getRowClassName={(event) =>
          event.id === selectedEventId
            ? 'relative bg-muted/60 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent'
            : undefined
        }
      />
    </div>
  );
}
