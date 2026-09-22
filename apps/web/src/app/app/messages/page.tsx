'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/business/data-table';
import { PageHeader } from '@/components/business/page-header';
import { EnumSelect } from '@/components/business/enum-select';
import { MessageStatusBadge } from '@/components/business/message-status-badge';
import {
  useContextPanel,
  type ContextBlock,
  type ContextPanelTone,
} from '@/components/layout/context-panel';
import { useMessageLogs, useRetryMessageLog } from '@/lib/api/hooks/use-message-logs';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { NOTIFICATION_CHANNEL_LABELS, MESSAGE_STATUS_LABELS } from '@/lib/enum-labels';
import { formatXaf } from '@/lib/money';
import type { MessageLog, MessageStatus, NotificationChannel } from '@/lib/api/types';

const PAGE_SIZE = 20;

const MESSAGE_TONE: Record<MessageStatus, ContextPanelTone> = {
  QUEUED: 'neutral',
  SENT: 'info',
  DELIVERED: 'ok',
  READ: 'ok',
  FAILED: 'danger',
  REJECTED: 'danger',
  EXPIRED: 'neutral',
};

function RetryAction({ id }: { id: string }) {
  const retry = useRetryMessageLog();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={retry.isPending}
      onClick={async () => {
        try {
          await retry.mutateAsync(id);
          toast.success('Message relancé.');
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : 'Impossible de relancer ce message.',
          );
        }
      }}
    >
      Relancer
    </Button>
  );
}

export default function MessagesPage() {
  const { open: openContextPanel, isOpen: isContextPanelOpen } = useContextPanel();
  const [selectedLogId, setSelectedLogId] = React.useState<string | null>(null);
  const [channel, setChannel] = React.useState<NotificationChannel | ''>('');
  const [status, setStatus] = React.useState<MessageStatus | ''>('');
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [previousCursors, setPreviousCursors] = React.useState<string[]>([]);
  const retryMessage = useRetryMessageLog();

  // Cf. apps/web/src/app/app/baux/page.tsx (modèle).
  React.useEffect(() => {
    if (!isContextPanelOpen) setSelectedLogId(null);
  }, [isContextPanelOpen]);

  async function handleRetry(id: string) {
    try {
      await retryMessage.mutateAsync(id);
      toast.success('Message relancé.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  function handleCopyContent(content: string) {
    navigator.clipboard
      ?.writeText(content)
      .then(() => toast.success('Contenu copié.'))
      .catch(() => toast.error(genericErrorMessage));
  }

  // Pas de fiche dédiée à un message (aucune route de détail) et
  // `relatedEntityType` est un texte libre côté API (ex. « Receipt ») sans
  // correspondance de route garantie : plutôt que de deviner un lien
  // potentiellement faux, les actions se limitent à ce qui est réellement
  // actionnable pour ce message.
  function handleRowSelect(log: MessageLog) {
    setSelectedLogId(log.id);

    const activityItems: { what: string; when?: string }[] = [
      { what: 'Mis en file', when: new Date(log.queuedAt).toLocaleString('fr-CG') },
    ];
    if (log.sentAt) {
      activityItems.push({ what: 'Envoyé', when: new Date(log.sentAt).toLocaleString('fr-CG') });
    }
    if (log.deliveredAt) {
      activityItems.push({
        what: 'Remis',
        when: new Date(log.deliveredAt).toLocaleString('fr-CG'),
      });
    }
    if (log.readAt) {
      activityItems.push({ what: 'Lu', when: new Date(log.readAt).toLocaleString('fr-CG') });
    }
    if (log.failedAt) {
      activityItems.push({
        what: log.errorMessage ? `Échec : ${log.errorMessage}` : 'Échec',
        when: new Date(log.failedAt).toLocaleString('fr-CG'),
      });
    }

    const alertBlocks: ContextBlock[] = [];
    if ((log.status === 'FAILED' || log.status === 'REJECTED') && log.errorMessage) {
      alertBlocks.push({ type: 'alert', tone: 'danger', text: log.errorMessage });
    } else if (log.status === 'EXPIRED') {
      alertBlocks.push({
        type: 'alert',
        tone: 'warning',
        text: "Message expiré avant d'avoir pu être remis.",
      });
    }

    const actions: {
      label: string;
      primary?: boolean;
      keepOpen?: boolean;
      onSelect?: () => void;
    }[] = [];
    if (log.status === 'FAILED' || log.status === 'REJECTED') {
      actions.push({
        label: "Relancer l'envoi",
        primary: true,
        onSelect: () => handleRetry(log.id),
      });
    }
    if (log.contentPreview) {
      actions.push({
        label: 'Copier le contenu envoyé',
        primary: actions.length === 0,
        keepOpen: true,
        onSelect: () => handleCopyContent(log.contentPreview as string),
      });
    } else if (log.providerMessageId) {
      actions.push({
        label: 'Copier l’identifiant du message',
        primary: actions.length === 0,
        keepOpen: true,
        onSelect: () => handleCopyContent(log.providerMessageId as string),
      });
    }

    openContextPanel({
      title: 'Message',
      blocks: [
        {
          type: 'identity',
          title: NOTIFICATION_CHANNEL_LABELS[log.channel],
          subtitle: log.toAddress,
          badge: { label: MESSAGE_STATUS_LABELS[log.status], tone: MESSAGE_TONE[log.status] },
        },
        {
          type: 'keyvalue',
          title: 'Détails',
          items: [
            { k: 'Canal', v: NOTIFICATION_CHANNEL_LABELS[log.channel] },
            { k: 'Destinataire', v: log.toAddress },
            { k: 'Modèle', v: log.templateCode ?? '—' },
            { k: 'Fournisseur', v: log.provider },
            { k: 'Coût', v: formatXaf(log.costAmount) },
          ],
        },
        { type: 'activity', title: "Suivi de l'envoi", items: activityItems },
        ...alertBlocks,
        ...(actions.length > 0 ? [{ type: 'actions' as const, actions }] : []),
      ],
    });
  }

  const { data, isLoading } = useMessageLogs({
    channel: channel || undefined,
    status: status || undefined,
    cursor,
    limit: PAGE_SIZE,
  });
  const logs = data?.items ?? [];

  function resetPagination() {
    setCursor(undefined);
    setPreviousCursors([]);
  }

  const columns = React.useMemo<ColumnDef<MessageLog>[]>(
    () => [
      {
        header: 'Date',
        cell: ({ row }) => new Date(row.original.queuedAt).toLocaleString('fr-CG'),
      },
      { header: 'Canal', cell: ({ row }) => NOTIFICATION_CHANNEL_LABELS[row.original.channel] },
      { header: 'Statut', cell: ({ row }) => <MessageStatusBadge status={row.original.status} /> },
      {
        header: 'Lié à',
        cell: ({ row }) =>
          row.original.relatedEntityType
            ? `${row.original.relatedEntityType} #${row.original.relatedEntityId?.slice(-6)}`
            : '—',
      },
      { header: 'Erreur', cell: ({ row }) => row.original.errorMessage ?? '—' },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) =>
          row.original.status === 'FAILED' ? <RetryAction id={row.original.id} /> : null,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description="Journal des envois WhatsApp et SMS (quittances, avis d'échéance)."
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48 space-y-1">
          <label htmlFor="channel-filter" className="text-xs font-medium text-muted-foreground">
            Canal
          </label>
          <EnumSelect<NotificationChannel>
            id="channel-filter"
            value={channel}
            onValueChange={(v) => {
              setChannel(v);
              resetPagination();
            }}
            labels={NOTIFICATION_CHANNEL_LABELS}
            placeholder="Tous les canaux"
          />
        </div>
        <div className="w-48 space-y-1">
          <label
            htmlFor="message-status-filter"
            className="text-xs font-medium text-muted-foreground"
          >
            Statut
          </label>
          <EnumSelect<MessageStatus>
            id="message-status-filter"
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              resetPagination();
            }}
            labels={MESSAGE_STATUS_LABELS}
            placeholder="Tous les statuts"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        emptyTitle="Aucun message"
        emptyDescription="Les envois WhatsApp et SMS apparaîtront ici."
        pageInfo={data?.pageInfo}
        onNextPage={() => {
          if (data?.pageInfo.nextCursor) {
            setPreviousCursors((prev) => [...prev, cursor ?? '']);
            setCursor(data.pageInfo.nextCursor);
          }
        }}
        onPreviousPage={() => {
          setPreviousCursors((prev) => {
            const next = [...prev];
            const last = next.pop();
            setCursor(last || undefined);
            return next;
          });
        }}
        hasPreviousPage={previousCursors.length > 0}
        onRowSelect={handleRowSelect}
        getRowLabel={(log) => `Voir le détail du message envoyé à ${log.toAddress}`}
        getRowClassName={(log) =>
          log.id === selectedLogId
            ? 'relative bg-muted/60 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent'
            : undefined
        }
      />
    </div>
  );
}
