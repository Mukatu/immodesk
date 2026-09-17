import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { MaintenanceUpdateEntry } from './maintenance-update-entry';
import { MAINTENANCE_STATUS_LABELS } from '@/lib/enum-labels';
import type { MaintenanceUpdate } from '@/lib/api/types';

// Date ancrée explicitement, jamais lue depuis l'horloge du test. Pas de
// suffixe "Z" : interprétée en heure locale, comme `new Date(iso).getHours()`
// dans `formatDateTimeFr`, pour rester indépendante du fuseau de la machine
// d'exécution des tests.
const OCCURRED_AT = '2026-02-01T08:30:00';

const BASE_UPDATE: MaintenanceUpdate = {
  id: 'upd-1',
  requestId: 'mnt-1',
  authorUserId: 'user-1',
  authorLabel: 'Jean Malonga',
  previousStatus: 'ASSIGNED',
  newStatus: 'IN_PROGRESS',
  message: 'Intervention démarrée sur place.',
  isVisibleToTenant: true,
  occurredAt: OCCURRED_AT,
};

describe('MaintenanceUpdateEntry', () => {
  it('affiche l’auteur, la transition de statut et le message', () => {
    render(<MaintenanceUpdateEntry update={BASE_UPDATE} />);
    expect(screen.getByText('Jean Malonga')).toBeInTheDocument();
    expect(screen.getByText(MAINTENANCE_STATUS_LABELS.ASSIGNED)).toBeInTheDocument();
    expect(screen.getByText(MAINTENANCE_STATUS_LABELS.IN_PROGRESS)).toBeInTheDocument();
    expect(screen.getByText('Intervention démarrée sur place.')).toBeInTheDocument();
    expect(screen.getByText('01/02/2026 08:30')).toBeInTheDocument();
  });

  it('signale la visibilité locataire quand isVisibleToTenant est vrai', () => {
    render(<MaintenanceUpdateEntry update={BASE_UPDATE} />);
    expect(screen.getByText('Visible au locataire')).toBeInTheDocument();
  });

  it('signale une mise à jour interne quand isVisibleToTenant est faux', () => {
    render(<MaintenanceUpdateEntry update={{ ...BASE_UPDATE, isVisibleToTenant: false }} />);
    expect(screen.getByText("Interne à l'agence")).toBeInTheDocument();
  });

  it('affiche l’indicateur de photo uniquement si une photo est jointe', () => {
    const { rerender } = render(
      <MaintenanceUpdateEntry update={{ ...BASE_UPDATE, photoDocumentId: undefined }} />,
    );
    expect(screen.queryByText('Photo jointe')).not.toBeInTheDocument();

    rerender(<MaintenanceUpdateEntry update={{ ...BASE_UPDATE, photoDocumentId: 'doc-1' }} />);
    expect(screen.getByText('Photo jointe')).toBeInTheDocument();
  });

  it('utilise « Système » quand aucun auteur n’est renseigné', () => {
    render(<MaintenanceUpdateEntry update={{ ...BASE_UPDATE, authorLabel: null }} />);
    expect(screen.getByText('Système')).toBeInTheDocument();
  });
});
