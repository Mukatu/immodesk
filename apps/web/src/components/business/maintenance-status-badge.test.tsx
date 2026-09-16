import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { MaintenanceStatusBadge } from '@/components/business/maintenance-status-badge';
import type { MaintenanceStatus } from '@/lib/api/types';

describe('MaintenanceStatusBadge', () => {
  it('affiche "Signalée" pour le statut OPEN', () => {
    render(<MaintenanceStatusBadge status="OPEN" />);
    expect(screen.getByText('Signalée')).toBeInTheDocument();
  });

  it('affiche "Prise en compte" pour le statut ACKNOWLEDGED', () => {
    render(<MaintenanceStatusBadge status="ACKNOWLEDGED" />);
    expect(screen.getByText('Prise en compte')).toBeInTheDocument();
  });

  it('affiche "Affectée" pour le statut ASSIGNED', () => {
    render(<MaintenanceStatusBadge status="ASSIGNED" />);
    expect(screen.getByText('Affectée')).toBeInTheDocument();
  });

  it('affiche "En intervention" pour le statut IN_PROGRESS', () => {
    render(<MaintenanceStatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText('En intervention')).toBeInTheDocument();
  });

  it('affiche "En suspens" pour le statut ON_HOLD', () => {
    render(<MaintenanceStatusBadge status="ON_HOLD" />);
    expect(screen.getByText('En suspens')).toBeInTheDocument();
  });

  it('affiche "Résolue" pour le statut RESOLVED', () => {
    render(<MaintenanceStatusBadge status="RESOLVED" />);
    expect(screen.getByText('Résolue')).toBeInTheDocument();
  });

  it('affiche "Clôturée" pour le statut CLOSED', () => {
    render(<MaintenanceStatusBadge status="CLOSED" />);
    expect(screen.getByText('Clôturée')).toBeInTheDocument();
  });

  it('affiche "Refusée" pour le statut REJECTED', () => {
    render(<MaintenanceStatusBadge status="REJECTED" />);
    expect(screen.getByText('Refusée')).toBeInTheDocument();
  });

  it('accepte un statut typé MaintenanceStatus sans conversion', () => {
    const status: MaintenanceStatus = 'OPEN';
    render(<MaintenanceStatusBadge status={status} />);
    expect(screen.getByText('Signalée')).toBeInTheDocument();
  });
});
