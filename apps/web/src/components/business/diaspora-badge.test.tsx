import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DiasporaBadge } from '@/components/business/diaspora-badge';

describe('DiasporaBadge', () => {
  it('affiche le badge « Diaspora » quand le bailleur est hors du Congo', () => {
    render(<DiasporaBadge isDiaspora />);
    expect(screen.getByText('Diaspora')).toBeInTheDocument();
  });

  it("n'affiche rien pour un bailleur au Congo", () => {
    const { container } = render(<DiasporaBadge isDiaspora={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
