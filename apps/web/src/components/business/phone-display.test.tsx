import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PhoneDisplay } from '@/components/business/phone-display';

describe('PhoneDisplay', () => {
  it('affiche le numéro formaté avec un lien tel:', () => {
    render(<PhoneDisplay phone="+242066123456" />);

    const link = screen.getByRole('link', { name: '+242 06 612 34 56' });
    expect(link).toHaveAttribute('href', 'tel:+242066123456');
  });

  it('affiche un lien WhatsApp vers wa.me sans le signe +', () => {
    render(<PhoneDisplay phone="+242066123456" whatsapp />);

    const waLink = screen.getByRole('link', { name: 'Contacter sur WhatsApp' });
    expect(waLink).toHaveAttribute('href', 'https://wa.me/242066123456');
  });

  it('ne rend rien si le numéro est absent', () => {
    const { container } = render(<PhoneDisplay phone="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
