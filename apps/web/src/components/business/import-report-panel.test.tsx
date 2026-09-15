import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ImportReportPanel } from '@/components/business/import-report-panel';
import type { ImportReport } from '@/lib/api/types';

function makeReport(overrides: Partial<ImportReport> = {}): ImportReport {
  return {
    statementId: 'stmt-1',
    linesAccepted: 42,
    linesIgnored: 3,
    linesInError: [],
    autoMatched: 30,
    suggested: 8,
    ...overrides,
  };
}

describe('ImportReportPanel', () => {
  it('affiche les compteurs de lignes', () => {
    render(<ImportReportPanel report={makeReport()} />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('affiche "Aucune erreur" quand il n\'y a pas de ligne en erreur', () => {
    render(<ImportReportPanel report={makeReport({ linesInError: [] })} />);
    expect(screen.getByText('Aucune erreur')).toBeInTheDocument();
  });

  it('liste les lignes en erreur avec numéro et motif quand présentes', () => {
    render(
      <ImportReportPanel
        report={makeReport({
          linesInError: [
            { lineNumber: 12, reason: 'Montant illisible' },
            { lineNumber: 27, reason: 'Date invalide' },
          ],
        })}
      />,
    );
    expect(screen.queryByText('Aucune erreur')).not.toBeInTheDocument();
    expect(screen.getByText('Ligne 12')).toBeInTheDocument();
    expect(screen.getByText('Montant illisible')).toBeInTheDocument();
    expect(screen.getByText('Ligne 27')).toBeInTheDocument();
    expect(screen.getByText('Date invalide')).toBeInTheDocument();
  });
});
