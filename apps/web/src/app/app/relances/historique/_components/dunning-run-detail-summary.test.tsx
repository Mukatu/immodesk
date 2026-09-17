import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DunningRunDetailSummary } from './dunning-run-detail-summary';
import type { DunningRun } from '@/lib/api/types';

const BASE_RUN: DunningRun = {
  id: 'dunningrun-1',
  ruleId: 'dunningrule-1',
  ruleName: 'Relance avec pénalité',
  stepOrder: 2,
  status: 'SENT',
  runDate: '2026-03-10',
  scheduledAt: '2026-03-10T09:00:00.000Z',
  executedAt: '2026-03-10T09:00:00.000Z',
  daysOverdue: 5,
  balanceAmount: 45_000,
  channel: 'WHATSAPP',
  invoice: { id: 'invoice-1', invoiceNumber: 'LOY-202603-00001' },
  tenant: { id: 'tenant-1', displayName: 'Jean Malonga' },
  notificationId: 'notif-1',
  messageLogId: 'msglog-1',
  messageStatus: 'DELIVERED',
  guarantorNotified: false,
  penaltyApplied: true,
  penaltyAmount: 2_250,
  skipReason: null,
  errorMessage: null,
};

describe('DunningRunDetailSummary', () => {
  it('affiche le statut, le canal et la pénalité appliquée', () => {
    render(<DunningRunDetailSummary run={BASE_RUN} />);
    expect(screen.getByText('Envoyée')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('Remis')).toBeInTheDocument();
  });

  it("affiche le motif d'ignorance quand l'exécution est ignorée", () => {
    render(
      <DunningRunDetailSummary
        run={{ ...BASE_RUN, status: 'SKIPPED', skipReason: 'Solde sous le seuil minimum.' }}
      />,
    );
    expect(screen.getByText('Solde sous le seuil minimum.')).toBeInTheDocument();
  });

  it("indique 'Aucune' pénalité quand aucune n'a été appliquée", () => {
    render(
      <DunningRunDetailSummary run={{ ...BASE_RUN, penaltyApplied: false, penaltyAmount: 0 }} />,
    );
    expect(screen.getByText('Aucune')).toBeInTheDocument();
  });

  it("indique l'escalade au garant quand elle a eu lieu", () => {
    render(<DunningRunDetailSummary run={{ ...BASE_RUN, guarantorNotified: true }} />);
    expect(screen.getByText('Oui')).toBeInTheDocument();
  });
});
