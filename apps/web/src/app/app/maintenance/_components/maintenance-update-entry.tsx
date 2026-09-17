import { Camera, Eye, EyeOff } from 'lucide-react';

import { MaintenanceStatusBadge } from '@/components/business/maintenance-status-badge';
import type { MaintenanceUpdate } from '@/lib/api/types';
import { formatDateTimeFr } from './format-date-fr';

export interface MaintenanceUpdateEntryProps {
  update: MaintenanceUpdate;
}

/**
 * Une entrée du fil chronologique d'une demande de maintenance
 * (`maintenance_updates`) : auteur, transition de statut, message, photo
 * éventuelle et visibilité pour le locataire. Purement présentationnel — ne
 * lit jamais la date courante, seulement `update.occurredAt`.
 */
export function MaintenanceUpdateEntry({ update }: MaintenanceUpdateEntryProps) {
  return (
    <li className="space-y-1.5">
      <p className="text-sm text-muted-foreground">{formatDateTimeFr(update.occurredAt)}</p>
      <p className="text-sm font-medium">{update.authorLabel ?? 'Système'}</p>
      {update.newStatus ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {update.previousStatus ? (
            <>
              <MaintenanceStatusBadge status={update.previousStatus} />
              <span aria-hidden="true">→</span>
            </>
          ) : null}
          <MaintenanceStatusBadge status={update.newStatus} />
        </div>
      ) : null}
      {update.message ? <p className="text-sm">{update.message}</p> : null}
      <p className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {update.photoDocumentId ? (
          <span className="inline-flex items-center gap-1">
            <Camera className="size-3.5" aria-hidden="true" />
            Photo jointe
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1">
          {update.isVisibleToTenant ? (
            <>
              <Eye className="size-3.5" aria-hidden="true" />
              Visible au locataire
            </>
          ) : (
            <>
              <EyeOff className="size-3.5" aria-hidden="true" />
              Interne à l&apos;agence
            </>
          )}
        </span>
      </p>
    </li>
  );
}
