'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/business/data-table';
import { PageHeader } from '@/components/business/page-header';
import { PriorityBadge } from '@/components/business/priority-badge';
import { MaintenanceStatusBadge } from '@/components/business/maintenance-status-badge';
import { useContextPanel, type ContextPanelTone } from '@/components/layout/context-panel';
import { useMaintenanceRequests } from '@/lib/api/hooks/use-maintenance';
import { useProperties } from '@/lib/api/hooks/use-properties';
import { useMembers } from '@/lib/api/hooks/use-members';
import { useAuth } from '@/lib/auth/auth-context';
import { apiFetch } from '@/lib/api/client';
import { MAINTENANCE_PRIORITY_LABELS, MAINTENANCE_STATUS_LABELS } from '@/lib/enum-labels';
import { cn } from '@/lib/utils';
import type {
  MaintenanceDetail,
  MaintenancePriority,
  MaintenanceStatus,
  MaintenanceSummary,
} from '@/lib/api/types';
import { formatDateFr, formatDateTimeFr } from './_components/format-date-fr';
import {
  isMaintenanceOverdue,
  MaintenanceDueIndicator,
} from './_components/maintenance-due-indicator';

const PAGE_SIZE = 20;

const MAINTENANCE_TONE: Record<MaintenanceStatus, ContextPanelTone> = {
  OPEN: 'warning',
  ACKNOWLEDGED: 'neutral',
  ASSIGNED: 'neutral',
  IN_PROGRESS: 'info',
  ON_HOLD: 'neutral',
  RESOLVED: 'ok',
  CLOSED: 'neutral',
  REJECTED: 'danger',
};

export default function MaintenancePage() {
  const { currentOrganizationId } = useAuth();
  const queryClient = useQueryClient();
  const { open: openContextPanel, isOpen: isContextPanelOpen } = useContextPanel();
  const [selectedRequestId, setSelectedRequestId] = React.useState<string | null>(null);
  // Réf synchrone : évite une fermeture obsolète dans le chargement asynchrone du fil des
  // mises à jour ci-dessous (l'état `selectedRequestId` ne reflète la sélection qu'au rendu
  // suivant, cf. même piège traité sur gerance/mandats).
  const selectedRequestIdRef = React.useRef<string | null>(null);
  const [status, setStatus] = React.useState<MaintenanceStatus | 'ALL'>('ALL');
  const [priority, setPriority] = React.useState<MaintenancePriority | 'ALL'>('ALL');
  const [propertyId, setPropertyId] = React.useState<string>('ALL');
  const [assignedToUserId, setAssignedToUserId] = React.useState<string>('ALL');
  const [overdueOnly, setOverdueOnly] = React.useState(false);
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [previousCursors, setPreviousCursors] = React.useState<string[]>([]);

  const { data: properties } = useProperties({ limit: 100 });
  const { data: members } = useMembers(currentOrganizationId);
  const { data, isLoading } = useMaintenanceRequests({
    status: status === 'ALL' ? undefined : status,
    priority: priority === 'ALL' ? undefined : priority,
    propertyId: propertyId === 'ALL' ? undefined : propertyId,
    assignedToUserId: assignedToUserId === 'ALL' ? undefined : assignedToUserId,
    overdueOnly: overdueOnly || undefined,
    cursor,
    limit: PAGE_SIZE,
  });

  const memberNameByUserId = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const member of members?.items ?? []) map.set(member.user.id, member.user.fullName);
    return map;
  }, [members]);

  React.useEffect(() => {
    if (!isContextPanelOpen) {
      setSelectedRequestId(null);
      selectedRequestIdRef.current = null;
    }
  }, [isContextPanelOpen]);

  function resetPaging() {
    setCursor(undefined);
    setPreviousCursors([]);
  }

  // Mémorisé pour éviter que la mémoïsation des colonnes ne soit recréée à
  // chaque rendu ; suffisant pour une échéance qui se compte en heures ou jours.
  const now = React.useMemo(() => new Date(), []);

  const columns = React.useMemo<ColumnDef<MaintenanceSummary>[]>(
    () => [
      {
        header: 'Référence',
        cell: ({ row }) => (
          <Link
            href={`/app/maintenance/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.reference}
          </Link>
        ),
      },
      {
        header: 'Lot et immeuble',
        cell: ({ row }) => (
          <span className="flex flex-col text-sm">
            <span>{row.original.unit?.code ?? '—'}</span>
            <span className="text-xs text-muted-foreground">{row.original.property.name}</span>
          </span>
        ),
      },
      { header: 'Objet', cell: ({ row }) => row.original.title },
      {
        header: 'Priorité',
        cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
      },
      {
        header: 'Statut',
        cell: ({ row }) => <MaintenanceStatusBadge status={row.original.status} />,
      },
      {
        header: 'Signalée le',
        cell: ({ row }) => formatDateFr(row.original.reportedAt),
      },
      {
        header: 'Échéance cible',
        cell: ({ row }) => (
          <MaintenanceDueIndicator
            slaDueAt={row.original.slaDueAt}
            status={row.original.status}
            now={now}
          />
        ),
      },
      {
        header: 'Personne affectée',
        cell: ({ row }) =>
          row.original.assignedToUserId
            ? (memberNameByUserId.get(row.original.assignedToUserId) ?? '—')
            : 'Non affectée',
      },
    ],
    [memberNameByUserId, now],
  );

  function buildMaintenanceBlocks(
    request: MaintenanceSummary,
    updates: MaintenanceDetail['updates'] | null,
  ) {
    const assignedLabel = request.assignedToUserId
      ? (memberNameByUserId.get(request.assignedToUserId) ?? '—')
      : 'Non affectée';
    const overdue = isMaintenanceOverdue(request.slaDueAt, request.status, now);
    return {
      title: 'Demande de maintenance',
      blocks: [
        {
          type: 'identity' as const,
          title: request.reference,
          subtitle: request.title,
          badge: {
            label: MAINTENANCE_STATUS_LABELS[request.status],
            tone: MAINTENANCE_TONE[request.status],
          },
        },
        {
          type: 'keyvalue' as const,
          title: 'Détails',
          items: [
            { k: 'Lot et immeuble', v: `${request.unit?.code ?? '—'} — ${request.property.name}` },
            { k: 'Priorité', v: MAINTENANCE_PRIORITY_LABELS[request.priority] },
            { k: 'Signalée le', v: formatDateFr(request.reportedAt) },
            {
              k: 'Échéance cible',
              v: request.slaDueAt ? formatDateFr(request.slaDueAt) : 'Non définie',
            },
            { k: 'Personne affectée', v: assignedLabel },
          ],
        },
        ...(overdue
          ? [
              {
                type: 'alert' as const,
                tone: 'warning' as const,
                text: 'L’échéance cible de cette demande est dépassée.',
              },
            ]
          : []),
        ...(updates && updates.length > 0
          ? [
              {
                type: 'activity' as const,
                title: 'Fil des mises à jour',
                items: updates.map((update) => ({
                  what:
                    update.message ??
                    (update.newStatus
                      ? `Statut : ${MAINTENANCE_STATUS_LABELS[update.newStatus]}`
                      : 'Mise à jour'),
                  when: formatDateTimeFr(update.occurredAt),
                })),
              },
            ]
          : []),
        {
          type: 'actions' as const,
          actions: [
            {
              label: 'Voir la fiche de la demande',
              primary: true,
              href: `/app/maintenance/${request.id}`,
            },
            { label: 'Voir le bien', href: `/app/immeubles/${request.property.id}` },
          ],
        },
      ],
    };
  }

  async function loadMaintenanceUpdates(request: MaintenanceSummary) {
    try {
      const detail = await queryClient.fetchQuery({
        queryKey: ['maintenance-requests', request.id],
        queryFn: () => apiFetch<MaintenanceDetail>(`/maintenance-requests/${request.id}`),
      });
      if (selectedRequestIdRef.current === request.id) {
        openContextPanel(buildMaintenanceBlocks(request, detail.updates));
      }
    } catch {
      // Le panneau reste utilisable sans le fil des mises à jour en cas d'échec du chargement.
    }
  }

  function handleRowSelect(request: MaintenanceSummary) {
    selectedRequestIdRef.current = request.id;
    setSelectedRequestId(request.id);
    openContextPanel(buildMaintenanceBlocks(request, null));
    void loadMaintenanceUpdates(request);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        description="Demandes d'intervention : signalement, affectation, suivi jusqu'à la clôture."
        actions={
          <Button asChild>
            <Link href="/app/maintenance/nouveau">
              <PlusCircle className="mr-2 size-4" aria-hidden="true" />
              Nouvelle demande
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="maintenance-status-filter">Statut</Label>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as MaintenanceStatus | 'ALL');
              resetPaging();
            }}
          >
            <SelectTrigger id="maintenance-status-filter" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les statuts</SelectItem>
              {(Object.keys(MAINTENANCE_STATUS_LABELS) as MaintenanceStatus[]).map((value) => (
                <SelectItem key={value} value={value}>
                  {MAINTENANCE_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="maintenance-priority-filter">Priorité</Label>
          <Select
            value={priority}
            onValueChange={(v) => {
              setPriority(v as MaintenancePriority | 'ALL');
              resetPaging();
            }}
          >
            <SelectTrigger id="maintenance-priority-filter" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes les priorités</SelectItem>
              {(Object.keys(MAINTENANCE_PRIORITY_LABELS) as MaintenancePriority[]).map((value) => (
                <SelectItem key={value} value={value}>
                  {MAINTENANCE_PRIORITY_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="maintenance-property-filter">Immeuble</Label>
          <Select
            value={propertyId}
            onValueChange={(v) => {
              setPropertyId(v);
              resetPaging();
            }}
          >
            <SelectTrigger id="maintenance-property-filter" className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les immeubles</SelectItem>
              {(properties?.items ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="maintenance-assignee-filter">Personne affectée</Label>
          <Select
            value={assignedToUserId}
            onValueChange={(v) => {
              setAssignedToUserId(v);
              resetPaging();
            }}
          >
            <SelectTrigger id="maintenance-assignee-filter" className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes les personnes</SelectItem>
              {(members?.items ?? []).map((member) => (
                <SelectItem key={member.id} value={member.user.id}>
                  {member.user.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <label className="flex items-center gap-2 pb-2 text-sm">
          <Checkbox
            checked={overdueOnly}
            onChange={(e) => {
              setOverdueOnly(e.target.checked);
              resetPaging();
            }}
          />
          En retard seulement
        </label>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyTitle="Aucune demande de maintenance"
        emptyDescription="Signalez la première demande d'intervention pour un lot."
        pageInfo={data?.pageInfo}
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
        hasPreviousPage={previousCursors.length > 0}
        onRowSelect={handleRowSelect}
        getRowLabel={(row) => `Voir le détail de la demande ${row.reference}`}
        getRowClassName={(row) =>
          cn(
            isMaintenanceOverdue(row.slaDueAt, row.status, now) && 'bg-destructive/5',
            row.id === selectedRequestId &&
              'relative bg-muted/60 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent',
          )
        }
      />
    </div>
  );
}
