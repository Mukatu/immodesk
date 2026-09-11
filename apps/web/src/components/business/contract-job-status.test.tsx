import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ContractJobStatus } from '@/components/business/contract-job-status';

const { useContractJobMock } = vi.hoisted(() => ({
  useContractJobMock: vi.fn(),
}));

vi.mock('@/lib/api/hooks/use-contract-jobs', () => ({
  useContractJob: useContractJobMock,
}));

describe('ContractJobStatus', () => {
  it('fait progresser le libellé affiché au fil des statuts QUEUED -> RUNNING -> DONE', () => {
    useContractJobMock.mockReturnValue({ data: { jobId: 'job-1', status: 'QUEUED' } });
    const { rerender } = render(<ContractJobStatus leaseId="lease-1" jobId="job-1" />);
    expect(screen.getByText('En file')).toBeInTheDocument();

    useContractJobMock.mockReturnValue({ data: { jobId: 'job-1', status: 'RUNNING' } });
    rerender(<ContractJobStatus leaseId="lease-1" jobId="job-1" />);
    expect(screen.getByText('Génération en cours')).toBeInTheDocument();

    useContractJobMock.mockReturnValue({
      data: { jobId: 'job-1', status: 'DONE', leaseDocumentId: 'doc-1' },
    });
    rerender(<ContractJobStatus leaseId="lease-1" jobId="job-1" />);
    expect(screen.getByText('Contrat généré')).toBeInTheDocument();
  });

  it("affiche le message d'echec avec le detail de l'erreur", () => {
    useContractJobMock.mockReturnValue({
      data: { jobId: 'job-1', status: 'FAILED', error: 'gabarit invalide' },
    });
    render(<ContractJobStatus leaseId="lease-1" jobId="job-1" />);
    expect(screen.getByText('Échec : gabarit invalide')).toBeInTheDocument();
  });

  it("affiche un etat neutre tant qu'aucune donnee n'est disponible", () => {
    useContractJobMock.mockReturnValue({ data: undefined });
    render(<ContractJobStatus leaseId="lease-1" jobId={null} />);
    expect(screen.getByText('En attente')).toBeInTheDocument();
  });
});
