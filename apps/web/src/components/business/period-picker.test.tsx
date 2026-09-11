import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PeriodPicker, formatPeriodFr } from '@/components/business/period-picker';

describe('formatPeriodFr', () => {
  it('formate "2026-09" en "Septembre 2026"', () => {
    expect(formatPeriodFr('2026-09')).toBe('Septembre 2026');
  });
});

describe('PeriodPicker', () => {
  it('affiche la période courante', () => {
    render(<PeriodPicker value="2026-09" onValueChange={() => {}} />);
    expect(screen.getByText('Septembre 2026')).toBeInTheDocument();
  });

  it('appelle onValueChange avec le mois précédent puis suivant', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<PeriodPicker value="2026-09" onValueChange={onValueChange} />);

    await user.click(screen.getByRole('button', { name: 'Mois précédent' }));
    expect(onValueChange).toHaveBeenCalledWith('2026-08');

    await user.click(screen.getByRole('button', { name: 'Mois suivant' }));
    expect(onValueChange).toHaveBeenCalledWith('2026-10');
  });

  it('gère le changement d’année', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<PeriodPicker value="2026-01" onValueChange={onValueChange} />);
    await user.click(screen.getByRole('button', { name: 'Mois précédent' }));
    expect(onValueChange).toHaveBeenCalledWith('2025-12');
  });
});
