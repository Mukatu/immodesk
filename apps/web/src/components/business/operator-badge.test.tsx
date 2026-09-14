import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { OperatorBadge } from '@/components/business/operator-badge';

describe('OperatorBadge', () => {
  it.each(['+242066123456', '242066123456', '066123456'])(
    'détecte MTN Mobile Money pour le préfixe 06 (%s)',
    (msisdn) => {
      render(<OperatorBadge msisdn={msisdn} />);
      expect(screen.getByText('MTN Mobile Money')).toBeInTheDocument();
    },
  );

  it.each(['+242055123456', '242055123456', '055123456'])(
    'détecte Airtel Money pour le préfixe 05 (%s)',
    (msisdn) => {
      render(<OperatorBadge msisdn={msisdn} />);
      expect(screen.getByText('Airtel Money')).toBeInTheDocument();
    },
  );

  it('affiche "Opérateur inconnu" pour un préfixe non reconnu', () => {
    render(<OperatorBadge msisdn="+242077123456" />);
    expect(screen.getByText('Opérateur inconnu')).toBeInTheDocument();
  });

  it('affiche "Opérateur inconnu" pour un numéro invalide', () => {
    render(<OperatorBadge msisdn="abc" />);
    expect(screen.getByText('Opérateur inconnu')).toBeInTheDocument();
  });
});
