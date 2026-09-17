import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { ReadingRow } from '@/app/app/compteurs/[id]/_components/reading-row';
import type { MeterReading } from '@/lib/api/types';

const { fetchDocumentDownloadUrlMock } = vi.hoisted(() => ({
  fetchDocumentDownloadUrlMock: vi.fn(),
}));

vi.mock('@/lib/api/hooks/use-documents', () => ({
  fetchDocumentDownloadUrl: fetchDocumentDownloadUrlMock,
}));

/** Toutes les dates sont fixées explicitement : jamais `new Date()` sans argument. */
function makeReading(overrides: Partial<MeterReading> = {}): MeterReading {
  return {
    id: 'reading-1',
    meterId: 'meter-1',
    unitId: 'unit-1',
    leaseId: 'lease-1',
    readingDate: '2026-03-15',
    currentIndex: 1250,
    previousIndex: 1100,
    consumption: 150,
    rolloverApplied: false,
    isEstimated: false,
    clientRef: 'client-ref-1',
    tariffId: 'tariff-1',
    unitPriceAmount: 500,
    computedAmount: 75_000,
    isInvoiced: false,
    invoiceLineId: null,
    recordedByUserId: 'user-1',
    ...overrides,
  };
}

interface RenderRowOptions {
  reading?: Partial<MeterReading>;
  canConfirm?: boolean;
  isConfirming?: boolean;
  onConfirm?: () => void;
}

function renderRow(options: RenderRowOptions = {}) {
  return render(
    <table>
      <tbody>
        <ReadingRow
          reading={makeReading(options.reading)}
          canConfirm={options.canConfirm ?? false}
          isConfirming={options.isConfirming ?? false}
          onConfirm={options.onConfirm ?? vi.fn()}
        />
      </tbody>
    </table>,
  );
}

describe('ReadingRow', () => {
  it('affiche la date au format fr-CG, l’index et la consommation', () => {
    renderRow();
    expect(screen.getByText('15/03/2026')).toBeInTheDocument();
    expect(screen.getByText('1250')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('signale un relevé estimé non confirmé', () => {
    renderRow({ reading: { isEstimated: true } });
    expect(screen.getByText('Estimé — non confirmé')).toBeInTheDocument();
  });

  it('affiche le badge Facturé quand le relevé est déjà facturé', () => {
    renderRow({ reading: { isInvoiced: true } });
    expect(screen.getByText('Facturé')).toBeInTheDocument();
  });

  it('propose la confirmation à un MANAGER pour un relevé estimé non facturé', () => {
    const onConfirm = vi.fn();
    renderRow({ reading: { isEstimated: true }, canConfirm: true, onConfirm });
    const button = screen.getByRole('button', { name: 'Confirmer' });
    fireEvent.click(button);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('masque la confirmation si le relevé est déjà facturé', () => {
    renderRow({ reading: { isEstimated: true, isInvoiced: true }, canConfirm: true });
    expect(screen.queryByRole('button', { name: 'Confirmer' })).not.toBeInTheDocument();
  });

  it('masque la confirmation pour un rôle non MANAGER', () => {
    renderRow({ reading: { isEstimated: true }, canConfirm: false });
    expect(screen.queryByRole('button', { name: 'Confirmer' })).not.toBeInTheDocument();
  });

  it('signale le passage par zéro du compteur', () => {
    renderRow({ reading: { rolloverApplied: true } });
    expect(screen.getByText('Passage par zéro')).toBeInTheDocument();
  });
});
