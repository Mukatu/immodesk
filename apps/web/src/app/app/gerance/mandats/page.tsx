'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { FilePlus2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/business/data-table';
import { PageHeader } from '@/components/business/page-header';
import { MandateStatusBadge } from '@/components/business/mandate-status-badge';
import { DiasporaBadge } from '@/components/business/diaspora-badge';
import { useContextPanel, type ContextPanelTone } from '@/components/layout/context-panel';
import { useMandates } from '@/lib/api/hooks/use-mandates';
import { apiFetch } from '@/lib/api/client';
import { MANDATE_STATUS_LABELS } from '@/lib/enum-labels';
import type {
  MandateStatus,
  MandateSummary,
  OwnerStatementSummary,
  Paginated,
} from '@/lib/api/types';

const PAGE_SIZE = 20;

const MANDATE_TONE: Record<MandateStatus, ContextPanelTone> = {
  DRAFT: 'neutral',
  ACTIVE: 'ok',
  SUSPENDED: 'warning',
  TERMINATED: 'danger',
  EXPIRED: 'neutral',
};

const STATUS_FILTERS: { value: MandateStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tous' },
  { value: 'DRAFT', label: 'Brouillons' },
  { value: 'ACTIVE', label: 'Actifs' },
  { value: 'SUSPENDED', label: 'Suspendus' },
  { value: 'TERMINATED', label: 'Résiliés' },
];

export default function MandatsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { open: openContextPanel, isOpen: isContextPanelOpen } = useContextPanel();
  const [selectedMandateId, setSelectedMandateId] = React.useState<string | null>(null);
  // Réf synchrone (indépendante du rendu) pour éviter une fermeture obsolète dans le
  // chargement asynchrone des relevés ci-dessous : `selectedMandateId` (état) ne reflète
  // la nouvelle sélection qu'au rendu suivant.
  const selectedMandateIdRef = React.useRef<string | null>(null);
  const [filter, setFilter] = React.useState<MandateStatus | 'ALL'>('ALL');
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [previousCursors, setPreviousCursors] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!isContextPanelOpen) {
      setSelectedMandateId(null);
      selectedMandateIdRef.current = null;
    }
  }, [isContextPanelOpen]);

  function handleFilterChange(next: MandateStatus | 'ALL') {
    setFilter(next);
    setCursor(undefined);
    setPreviousCursors([]);
  }

  const { data, isLoading } = useMandates({
    status: filter === 'ALL' ? undefined : filter,
    cursor,
    limit: PAGE_SIZE,
  });

  const columns = React.useMemo<ColumnDef<MandateSummary>[]>(
    () => [
      {
        header: 'Référence',
        cell: ({ row }) => (
          <Link
            href={`/app/gerance/mandats/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.reference}
          </Link>
        ),
      },
      {
        header: 'Bailleur',
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            {row.original.landlord.displayName}
            <DiasporaBadge isDiaspora={row.original.landlord.isDiaspora} />
          </span>
        ),
      },
      { header: 'Biens', cell: ({ row }) => row.original.propertiesCount },
      {
        header: 'Commission',
        cell: ({ row }) =>
          row.original.commissionRateBps !== null
            ? `${(row.original.commissionRateBps / 100).toLocaleString('fr-FR')} %`
            : '—',
      },
      { header: 'Début', cell: ({ row }) => row.original.startDate },
      {
        header: 'Statut',
        cell: ({ row }) => <MandateStatusBadge status={row.original.status} />,
      },
    ],
    [],
  );

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

  function buildMandateBlocks(mandate: MandateSummary, statements: OwnerStatementSummary[]) {
    return {
      title: 'Mandat de gestion',
      blocks: [
        {
          type: 'identity' as const,
          title: mandate.reference,
          subtitle: mandate.landlord.displayName,
          badge: {
            label: MANDATE_STATUS_LABELS[mandate.status],
            tone: MANDATE_TONE[mandate.status],
          },
        },
        {
          type: 'keyvalue' as const,
          title: 'Détails',
          items: [
            { k: 'Bailleur', v: mandate.landlord.displayName },
            { k: 'Biens rattachés', v: mandate.propertiesCount },
            {
              k: 'Taux de commission',
              v:
                mandate.commissionRateBps !== null
                  ? `${(mandate.commissionRateBps / 100).toLocaleString('fr-FR')} %`
                  : '—',
            },
            { k: 'Début', v: new Date(mandate.startDate).toLocaleDateString('fr-CG') },
            {
              k: 'Fin',
              v: mandate.endDate
                ? new Date(mandate.endDate).toLocaleDateString('fr-CG')
                : 'Durée indéterminée',
            },
          ],
        },
        ...(statements.length > 0
          ? [
              {
                type: 'related' as const,
                title: 'Relevés de gérance du mandat',
                items: statements.map((statement) => ({
                  label: `${statement.statementNumber} — ${statement.periodStart.slice(0, 7)}`,
                  onSelect: () => router.push(`/app/gerance/releves/${statement.id}`),
                })),
              },
            ]
          : []),
        {
          type: 'actions' as const,
          actions: [
            {
              label: 'Voir la fiche du mandat',
              primary: true,
              href: `/app/gerance/mandats/${mandate.id}`,
            },
            { label: 'Voir le bailleur', href: `/app/bailleurs/${mandate.landlord.id}` },
          ],
        },
      ],
    };
  }

  async function loadMandateStatements(mandate: MandateSummary) {
    try {
      const result = await queryClient.fetchQuery({
        queryKey: ['owner-statements', { mandateId: mandate.id, limit: 5 }],
        queryFn: () =>
          apiFetch<Paginated<OwnerStatementSummary>>(
            `/owner-statements?mandateId=${mandate.id}&limit=5`,
          ),
      });
      if (selectedMandateIdRef.current === mandate.id) {
        openContextPanel(buildMandateBlocks(mandate, result.items));
      }
    } catch {
      // Le panneau reste utilisable sans le bloc « relevés » en cas d'échec du chargement.
    }
  }

  function handleRowSelect(mandate: MandateSummary) {
    selectedMandateIdRef.current = mandate.id;
    setSelectedMandateId(mandate.id);
    openContextPanel(buildMandateBlocks(mandate, []));
    void loadMandateStatements(mandate);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mandats de gestion"
        description="Bailleurs sous mandat, biens rattachés et cycle de vie du mandat."
        actions={
          <Button asChild>
            <Link href="/app/gerance/mandats/nouveau">
              <FilePlus2 className="mr-2 size-4" aria-hidden="true" />
              Nouveau mandat
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtres de statut">
        {STATUS_FILTERS.map((item) => (
          <Button
            key={item.value}
            type="button"
            size="sm"
            variant={filter === item.value ? 'default' : 'outline'}
            onClick={() => handleFilterChange(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyTitle="Aucun mandat"
        emptyDescription="Créez votre premier mandat de gestion pour un bailleur."
        pageInfo={data?.pageInfo}
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
        hasPreviousPage={previousCursors.length > 0}
        onRowSelect={handleRowSelect}
        getRowLabel={(mandate) => `Voir le détail du mandat ${mandate.reference}`}
        getRowClassName={(mandate) =>
          mandate.id === selectedMandateId
            ? 'relative bg-muted/60 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent'
            : undefined
        }
      />
    </div>
  );
}
