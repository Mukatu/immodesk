'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { PageHeader } from '@/components/business/page-header';
import { DataTable } from '@/components/business/data-table';
import { MoneyXaf } from '@/components/business/money-xaf';
import { CheckStatusBadge } from '@/components/business/check-status-badge';
import { EnumSelect } from '@/components/business/enum-select';
import { Input } from '@/components/ui/input';
import { useBankChecks } from '@/lib/api/hooks/use-bank-checks';
import { CHECK_STATUS_LABELS } from '@/lib/enum-labels';
import { formatXaf } from '@/lib/money';
import {
  useContextPanel,
  type ContextBlock,
  type ContextPanelTone,
} from '@/components/layout/context-panel';
import type { BankCheck, CheckStatus } from '@/lib/api/types';
import { CreateCheckDialog } from './_components/create-check-dialog';
import { CheckRowActions } from './_components/check-row-actions';

const PAGE_SIZE = 20;
const LATE_DEPOSIT_THRESHOLD_DAYS = 15;

const CHECK_TONE: Record<CheckStatus, ContextPanelTone> = {
  RECEIVED: 'info',
  DEPOSITED: 'warning',
  CLEARED: 'ok',
  BOUNCED: 'danger',
  CANCELLED: 'neutral',
  RETURNED: 'neutral',
};

/** Formatage de date fr-CG local, sans dépendre de la locale de l'environnement. */
function formatDateFr(iso: string): string {
  const date = new Date(iso);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export default function ChequesPage() {
  const { open: openContextPanel, isOpen: isContextPanelOpen } = useContextPanel();
  const [selectedCheckId, setSelectedCheckId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<CheckStatus | ''>('');
  const [dueBefore, setDueBefore] = React.useState('');
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [previousCursors, setPreviousCursors] = React.useState<string[]>([]);

  // Cf. apps/web/src/app/app/baux/page.tsx (modèle) : la ligne dont le panneau
  // contextuel affiche le détail reste visuellement repérable tant qu'il reste ouvert.
  React.useEffect(() => {
    if (!isContextPanelOpen) setSelectedCheckId(null);
  }, [isContextPanelOpen]);

  function handleRowSelect(check: BankCheck) {
    setSelectedCheckId(check.id);
    const alertBlocks: ContextBlock[] = [];
    if (check.status === 'BOUNCED') {
      alertBlocks.push({
        type: 'alert',
        tone: 'danger',
        text: check.bounceReason
          ? `Chèque rejeté (impayé) : ${check.bounceReason}`
          : 'Chèque rejeté (impayé).',
      });
    } else if (check.status === 'DEPOSITED' && check.ageDays > LATE_DEPOSIT_THRESHOLD_DAYS) {
      alertBlocks.push({
        type: 'alert',
        tone: 'warning',
        text: `Déposé depuis ${check.ageDays} jours — au-delà du délai habituel de compensation (${LATE_DEPOSIT_THRESHOLD_DAYS} j).`,
      });
    }

    openContextPanel({
      title: 'Chèque',
      blocks: [
        {
          type: 'identity',
          title: `Chèque n° ${check.checkNumber}`,
          subtitle: `${check.drawerName} — ${check.drawerBankName}`,
          badge: { label: CHECK_STATUS_LABELS[check.status], tone: CHECK_TONE[check.status] },
        },
        {
          type: 'keyvalue',
          title: 'Détails',
          items: [
            { k: 'Montant', v: formatXaf(check.amount) },
            { k: "Date d'émission", v: formatDateFr(check.issueDate) },
            {
              k: 'Date de dépôt',
              v: check.depositDate ? formatDateFr(check.depositDate) : '—',
            },
            {
              k: 'Ancienneté du dépôt',
              v: check.status === 'DEPOSITED' ? `${check.ageDays} j` : '—',
            },
            { k: 'N° de compte du tireur', v: check.drawerAccountNumber ?? '—' },
          ],
        },
        ...alertBlocks,
        {
          type: 'actions',
          actions: [
            {
              label: 'Voir la fiche du locataire',
              primary: true,
              href: `/app/locataires/${check.tenantId}`,
            },
            ...(check.invoiceId
              ? [{ label: 'Voir la facture', href: `/app/factures/${check.invoiceId}` }]
              : []),
          ],
        },
      ],
    });
  }

  const { data, isLoading } = useBankChecks({
    status: status || undefined,
    dueBefore: dueBefore || undefined,
    cursor,
    limit: PAGE_SIZE,
  });

  const checks = data?.items ?? [];

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

  const columns = React.useMemo<ColumnDef<BankCheck>[]>(
    () => [
      { header: 'N° de chèque', cell: ({ row }) => row.original.checkNumber },
      { header: 'Tireur', cell: ({ row }) => row.original.drawerName },
      { header: 'Banque', cell: ({ row }) => row.original.drawerBankName },
      { header: 'Montant', cell: ({ row }) => <MoneyXaf amount={row.original.amount} /> },
      { header: 'Statut', cell: ({ row }) => <CheckStatusBadge status={row.original.status} /> },
      {
        header: 'Date de dépôt',
        cell: ({ row }) => row.original.depositDate ?? '—',
      },
      {
        header: 'Ancienneté',
        cell: ({ row }) => {
          const check = row.original;
          if (check.status !== 'DEPOSITED') return '—';
          const isLate = check.ageDays > LATE_DEPOSIT_THRESHOLD_DAYS;
          return isLate
            ? `${check.ageDays} j — au-delà du délai habituel de compensation`
            : `${check.ageDays} j`;
        },
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => <CheckRowActions check={row.original} />,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chèques"
        description="Suivez le cycle de vie des chèques reçus, du dépôt à la compensation."
        actions={<CreateCheckDialog />}
      />

      <div
        role="note"
        className="rounded-md border border-warning/40 bg-warning/10 p-4 text-sm text-foreground"
      >
        <p className="font-medium">En cas de rejet d’un chèque</p>
        <p className="mt-1 text-muted-foreground">
          La facture réglée par ce chèque est automatiquement rouverte. Des frais de rejet peuvent
          s’appliquer, mais uniquement sur la facture suivante du locataire — jamais sur la facture
          d’origine.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-52 space-y-1">
          <label
            htmlFor="check-status-filter"
            className="text-xs font-medium text-muted-foreground"
          >
            Statut
          </label>
          <EnumSelect<CheckStatus>
            id="check-status-filter"
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              resetPagination();
            }}
            labels={CHECK_STATUS_LABELS}
            placeholder="Tous les statuts"
          />
        </div>

        <div className="w-40 space-y-1">
          <label
            htmlFor="check-due-before-filter"
            className="text-xs font-medium text-muted-foreground"
          >
            Échéance de dépôt avant
          </label>
          <Input
            id="check-due-before-filter"
            type="date"
            value={dueBefore}
            onChange={(e) => {
              setDueBefore(e.target.value);
              resetPagination();
            }}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={checks}
        isLoading={isLoading}
        emptyTitle="Aucun chèque"
        emptyDescription="Les chèques reçus des locataires apparaissent ici une fois enregistrés."
        pageInfo={data?.pageInfo}
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
        hasPreviousPage={previousCursors.length > 0}
        onRowSelect={handleRowSelect}
        getRowLabel={(check) => `Voir le détail du chèque n° ${check.checkNumber}`}
        getRowClassName={(check) => {
          if (check.id === selectedCheckId) {
            return 'relative bg-muted/60 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent';
          }
          if (check.status === 'DEPOSITED' && check.ageDays > LATE_DEPOSIT_THRESHOLD_DAYS) {
            return 'bg-warning/10';
          }
          return undefined;
        }}
      />
    </div>
  );
}
