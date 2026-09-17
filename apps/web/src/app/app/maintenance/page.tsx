'use client';

import * as React from 'react';
import Link from 'next/link';
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
import { useMaintenanceRequests } from '@/lib/api/hooks/use-maintenance';
import { useProperties } from '@/lib/api/hooks/use-properties';
import { useMembers } from '@/lib/api/hooks/use-members';
import { useAuth } from '@/lib/auth/auth-context';
import { MAINTENANCE_PRIORITY_LABELS, MAINTENANCE_STATUS_LABELS } from '@/lib/enum-labels';
import type { MaintenancePriority, MaintenanceStatus, MaintenanceSummary } from '@/lib/api/types';
import { formatDateFr } from './_components/format-date-fr';
import {
  isMaintenanceOverdue,
  MaintenanceDueIndicator,
} from './_components/maintenance-due-indicator';

const PAGE_SIZE = 20;

export default function MaintenancePage() {
  const { currentOrganizationId } = useAuth();
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
        getRowClassName={(row) =>
          isMaintenanceOverdue(row.slaDueAt, row.status, now) ? 'bg-destructive/5' : undefined
        }
      />
    </div>
  );
}
