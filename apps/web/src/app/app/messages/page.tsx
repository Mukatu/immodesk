'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/business/data-table';
import { PageHeader } from '@/components/business/page-header';
import { EnumSelect } from '@/components/business/enum-select';
import { MessageStatusBadge } from '@/components/business/message-status-badge';
import { useMessageLogs, useRetryMessageLog } from '@/lib/api/hooks/use-message-logs';
import { NOTIFICATION_CHANNEL_LABELS, MESSAGE_STATUS_LABELS } from '@/lib/enum-labels';
import type { MessageLog, MessageStatus, NotificationChannel } from '@/lib/api/types';

const PAGE_SIZE = 20;

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
  const [channel, setChannel] = React.useState<NotificationChannel | ''>('');
  const [status, setStatus] = React.useState<MessageStatus | ''>('');
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [previousCursors, setPreviousCursors] = React.useState<string[]>([]);

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
      />
    </div>
  );
}
