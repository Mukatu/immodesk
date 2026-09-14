import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { WebhookStatusBadge } from '@/components/business/webhook-status-badge';
import { WEBHOOK_STATUS_LABELS } from '@/lib/enum-labels';
import type { WebhookStatus } from '@/lib/api/types';

describe('WebhookStatusBadge', () => {
  it('affiche le libellé fr-CG pour chaque statut', () => {
    (Object.keys(WEBHOOK_STATUS_LABELS) as WebhookStatus[]).forEach((status) => {
      const { unmount } = render(<WebhookStatusBadge status={status} />);
      expect(screen.getByText(WEBHOOK_STATUS_LABELS[status])).toBeInTheDocument();
      unmount();
    });
  });

  it("n'affiche aucun indicateur de signature quand signatureValid est absent", () => {
    render(<WebhookStatusBadge status="RECEIVED" />);
    expect(screen.queryByText(/Signature/)).not.toBeInTheDocument();
  });

  it('affiche "Signature valide" en texte quand signatureValid est true', () => {
    render(<WebhookStatusBadge status="PROCESSED" signatureValid />);
    expect(screen.getByText('Signature valide')).toBeInTheDocument();
  });

  it('affiche "Signature invalide" en texte quand signatureValid est false', () => {
    render(<WebhookStatusBadge status="IGNORED" signatureValid={false} />);
    expect(screen.getByText('Signature invalide')).toBeInTheDocument();
  });

  it("n'affiche aucun indicateur de signature quand signatureValid est null", () => {
    render(<WebhookStatusBadge status="RECEIVED" signatureValid={null} />);
    expect(screen.queryByText(/Signature/)).not.toBeInTheDocument();
  });
});
