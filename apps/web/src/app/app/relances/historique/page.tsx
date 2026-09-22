'use client';

import * as React from 'react';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTable } from '@/components/business/data-table';
import { MoneyXaf } from '@/components/business/money-xaf';
import { PageHeader } from '@/components/business/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useContextPanel,
  type ContextBlock,
  type ContextPanelTone,
} from '@/components/layout/context-panel';
import { useDunningRules } from '@/lib/api/hooks/use-dunning-rules';
import { useDunningRuns } from '@/lib/api/hooks/use-dunning-runs';
import { useTenants } from '@/lib/api/hooks/use-tenants';
import {
  DUNNING_STEP_STATUS_LABELS,
  MESSAGE_STATUS_LABELS,
  NOTIFICATION_CHANNEL_LABELS,
} from '@/lib/enum-labels';
import { formatXaf } from '@/lib/money';
import type { DunningRun, DunningStepStatus } from '@/lib/api/types';
import { formatDateFr, formatDateTimeFr } from '../_components/format-date-fr';
import { DunningStepStatusBadge } from '../_components/dunning-step-status-badge';

const PAGE_SIZE = 20;

const DUNNING_TONE: Record<DunningStepStatus, ContextPanelTone> = {
  PENDING: 'neutral',
  RUNNING: 'info',
  SENT: 'ok',
  SKIPPED: 'warning',
  FAILED: 'danger',
  CANCELLED: 'neutral',
};

export default function DunningHistoryPage() {
  const { open: openContextPanel, isOpen: isContextPanelOpen } = useContextPanel();
  const [selectedRunId, setSelectedRunId] = React.useState<string | null>(null);
  const [ruleId, setRuleId] = React.useState('ALL');
  const [status, setStatus] = React.useState<DunningStepStatus | 'ALL'>('ALL');
  const [tenantQuery, setTenantQuery] = React.useState('');
  const [tenantId, setTenantId] = React.useState<string | null>(null);
  const [tenantLabel, setTenantLabel] = React.useState('');
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [previousCursors, setPreviousCursors] = React.useState<string[]>([]);

  // Cf. apps/web/src/app/app/baux/page.tsx (modèle).
  React.useEffect(() => {
    if (!isContextPanelOpen) setSelectedRunId(null);
  }, [isContextPanelOpen]);

  function handleRowSelect(run: DunningRun) {
    setSelectedRunId(run.id);

    // « Historique des envois » construit à partir des jalons propres à cette
    // exécution (programmation, traitement, statut du message envoyé) plutôt
    // que d'un appel réseau supplémentaire — aucun autre écran du panneau
    // contextuel ne charge de données annexes à la sélection d'une ligne.
    const activityItems: { what: string; when?: string }[] = [
      { what: 'Relance programmée', when: formatDateTimeFr(run.scheduledAt) },
    ];
    if (run.executedAt) {
      activityItems.push({
        what: `Exécutée — ${DUNNING_STEP_STATUS_LABELS[run.status]}${run.skipReason ? ` : ${run.skipReason}` : ''}`,
        when: formatDateTimeFr(run.executedAt),
      });
    }
    // Il n'existe aucun statut de remise sur la relance elle-même : la remise
    // effective se lit dans le journal des messages (`messageStatus`, déjà
    // renseigné à partir de ce journal par l'API).
    if (run.messageLogId && run.messageStatus) {
      activityItems.push({
        what: `Message ${MESSAGE_STATUS_LABELS[run.messageStatus]}`,
      });
    }
    if (run.penaltyApplied) {
      activityItems.push({ what: `Pénalité appliquée : ${formatXaf(run.penaltyAmount)}` });
    }
    if (run.guarantorNotified) {
      activityItems.push({ what: 'Garant notifié' });
    }

    const alertBlocks: ContextBlock[] = [];
    if (run.status === 'FAILED' && run.errorMessage) {
      alertBlocks.push({ type: 'alert', tone: 'danger', text: run.errorMessage });
    } else if (run.status === 'SKIPPED' && run.skipReason) {
      alertBlocks.push({ type: 'alert', tone: 'warning', text: run.skipReason });
    }

    openContextPanel({
      title: 'Exécution de relance',
      blocks: [
        {
          type: 'identity',
          title: `${run.ruleName} — rang ${run.stepOrder}`,
          subtitle: run.tenant.displayName,
          badge: { label: DUNNING_STEP_STATUS_LABELS[run.status], tone: DUNNING_TONE[run.status] },
        },
        {
          type: 'keyvalue',
          title: 'Détails',
          items: [
            { k: 'Locataire', v: run.tenant.displayName },
            { k: 'Facture', v: run.invoice?.invoiceNumber ?? '—' },
            { k: 'Solde', v: formatXaf(run.balanceAmount) },
            { k: 'Retard', v: `${run.daysOverdue} j` },
            { k: 'Canal', v: NOTIFICATION_CHANNEL_LABELS[run.channel] },
          ],
        },
        { type: 'activity', title: 'Suivi', items: activityItems },
        ...alertBlocks,
        {
          type: 'actions',
          actions: [
            {
              label: "Voir le détail de l'exécution",
              primary: true,
              href: `/app/relances/historique/${run.id}`,
            },
            { label: 'Voir le locataire', href: `/app/locataires/${run.tenant.id}` },
            ...(run.invoice
              ? [{ label: 'Voir la facture', href: `/app/factures/${run.invoice.id}` }]
              : []),
          ],
        },
      ],
    });
  }

  const { data: rulesData } = useDunningRules();
  const { data: tenantsData } = useTenants({ q: tenantQuery || undefined, limit: 8 });
  const { data, isLoading } = useDunningRuns({
    ruleId: ruleId === 'ALL' ? undefined : ruleId,
    tenantId: tenantId ?? undefined,
    status: status === 'ALL' ? undefined : status,
    cursor,
    limit: PAGE_SIZE,
  });

  function selectTenant(id: string, label: string) {
    setTenantId(id);
    setTenantLabel(label);
    setTenantQuery('');
    resetPaging();
  }

  function clearTenant() {
    setTenantId(null);
    setTenantLabel('');
    resetPaging();
  }

  function resetPaging() {
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

  const columns = React.useMemo<ColumnDef<DunningRun>[]>(
    () => [
      {
        header: 'Palier',
        cell: ({ row }) => (
          <Link
            href={`/app/relances/historique/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.ruleName}
          </Link>
        ),
      },
      {
        header: 'Statut',
        cell: ({ row }) => <DunningStepStatusBadge status={row.original.status} />,
      },
      { header: 'Date', cell: ({ row }) => formatDateFr(row.original.runDate) },
      {
        header: 'Locataire',
        cell: ({ row }) => row.original.tenant.displayName,
      },
      {
        header: 'Facture',
        cell: ({ row }) => row.original.invoice?.invoiceNumber ?? '—',
      },
      { header: 'Retard (j)', cell: ({ row }) => row.original.daysOverdue },
      {
        header: 'Solde',
        cell: ({ row }) => <MoneyXaf amount={row.original.balanceAmount} />,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historique des relances"
        description="Chaque exécution, avec son statut, son motif d'ignorance et l'éventuelle pénalité appliquée."
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="history-rule-filter">Palier</Label>
          <Select
            value={ruleId}
            onValueChange={(v) => {
              setRuleId(v);
              resetPaging();
            }}
          >
            <SelectTrigger id="history-rule-filter" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les paliers</SelectItem>
              {(rulesData?.items ?? []).map((rule) => (
                <SelectItem key={rule.id} value={rule.id}>
                  {rule.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="history-status-filter">Statut</Label>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as DunningStepStatus | 'ALL');
              resetPaging();
            }}
          >
            <SelectTrigger id="history-status-filter" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les statuts</SelectItem>
              {(Object.keys(DUNNING_STEP_STATUS_LABELS) as DunningStepStatus[]).map((value) => (
                <SelectItem key={value} value={value}>
                  {DUNNING_STEP_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="history-tenant-filter">Locataire</Label>
          {tenantId ? (
            <div className="flex w-56 items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="truncate text-sm font-medium">{tenantLabel}</span>
              <Button
                id="history-tenant-filter"
                type="button"
                variant="outline"
                size="sm"
                onClick={clearTenant}
              >
                Effacer
              </Button>
            </div>
          ) : (
            <div className="relative w-56">
              <Input
                id="history-tenant-filter"
                placeholder="Rechercher un locataire…"
                value={tenantQuery}
                onChange={(e) => setTenantQuery(e.target.value)}
              />
              {tenantQuery && (tenantsData?.items.length ?? 0) > 0 ? (
                <ul className="absolute z-10 mt-1 w-full divide-y divide-border rounded-md border border-border bg-popover shadow-md">
                  {tenantsData?.items.map((tenant) => (
                    <li key={tenant.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => selectTenant(tenant.id, tenant.displayName)}
                      >
                        {tenant.displayName}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyTitle="Aucune exécution"
        emptyDescription="Lancez un scan depuis l'écran Paliers pour générer un historique."
        pageInfo={data?.pageInfo}
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
        hasPreviousPage={previousCursors.length > 0}
        onRowSelect={handleRowSelect}
        getRowLabel={(run) =>
          `Voir le détail de la relance ${run.ruleName} — ${run.tenant.displayName}`
        }
        getRowClassName={(run) =>
          run.id === selectedRunId
            ? 'relative bg-muted/60 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent'
            : undefined
        }
      />
    </div>
  );
}
