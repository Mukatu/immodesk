import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DunningTriggerReport } from './dunning-trigger-report';

describe('DunningTriggerReport', () => {
  it('affiche les quatre compteurs du compte-rendu', () => {
    render(<DunningTriggerReport scanned={12} created={3} skipped={7} failed={2} dryRun={false} />);
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('mentionne la simulation quand dryRun vaut true', () => {
    render(<DunningTriggerReport scanned={5} created={1} skipped={0} failed={0} dryRun />);
    expect(screen.getByText(/aucune relance n.a été envoyée/i)).toBeInTheDocument();
  });

  it('ne mentionne pas la simulation en exécution réelle', () => {
    render(<DunningTriggerReport scanned={5} created={1} skipped={0} failed={0} dryRun={false} />);
    expect(screen.queryByText(/aucune relance n.a été envoyée/i)).not.toBeInTheDocument();
  });
});
