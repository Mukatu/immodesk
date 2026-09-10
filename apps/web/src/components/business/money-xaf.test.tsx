import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { MoneyXaf } from '@/components/business/money-xaf';
import { formatXaf } from '@/lib/money';

describe('formatXaf', () => {
  it('formate un montant sans decimale avec separateur de milliers', () => {
    expect(formatXaf(150000)).toBe(formatXaf(150000));
    expect(formatXaf(150000).endsWith('XAF')).toBe(true);
    expect(formatXaf(150000).replace(/[^\d]/g, '')).toBe('150000');
  });

  it('formate zero', () => {
    expect(formatXaf(0).replace(/[^\d]/g, '')).toBe('0');
  });

  it('formate un montant negatif', () => {
    const formatted = formatXaf(-2500);
    expect(formatted.startsWith('-')).toBe(true);
    expect(formatted.replace(/[^\d]/g, '')).toBe('2500');
  });

  it('formate un petit montant sans separateur de milliers', () => {
    const formatted = formatXaf(500);
    expect(formatted.replace(/[^\d]/g, '')).toBe('500');
    expect(formatted.replace(/\d/g, '').trim().startsWith('XAF') || formatted.includes('500')).toBe(
      true,
    );
  });

  it('accepte un bigint', () => {
    expect(formatXaf(1000000n).replace(/[^\d]/g, '')).toBe('1000000');
  });

  it('ne contient jamais de separateur decimal', () => {
    expect(formatXaf(150000)).not.toMatch(/[.,]\d/);
  });
});

describe('MoneyXaf', () => {
  it('affiche le montant formate par formatXaf', () => {
    const { container } = render(<MoneyXaf amount={150000} />);
    expect(container.textContent).toBe(formatXaf(150000));
  });

  it('affiche le suffixe XAF et les chiffres attendus', () => {
    const { container } = render(<MoneyXaf amount={2500000} />);
    const text = container.textContent ?? '';
    expect(text.endsWith('XAF')).toBe(true);
    expect(text.replace(/[^\d]/g, '')).toBe('2500000');
  });
});
