import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PhoneInput } from '@/components/business/phone-input';
import { formatE164Congo, formatLocalCongo, toE164Congo } from '@/lib/phone';

describe('toE164Congo', () => {
  it('normalise un numéro local à 9 chiffres', () => {
    expect(toE164Congo('066000001')).toBe('+242066000001');
  });

  it('normalise un numéro avec indicatif 242', () => {
    expect(toE164Congo('242066000001')).toBe('+242066000001');
  });

  it('normalise un numéro avec indicatif international 00242', () => {
    expect(toE164Congo('00242066000001')).toBe('+242066000001');
  });

  it('rejette un numéro trop court', () => {
    expect(toE164Congo('123')).toBeNull();
  });
});

describe('formatLocalCongo / formatE164Congo', () => {
  it('groupe les chiffres en 2-3-2-2', () => {
    expect(formatLocalCongo('066000001')).toBe('06 600 00 01');
  });

  it('affiche le préfixe +242', () => {
    expect(formatE164Congo('+242066000001')).toBe('+242 06 600 00 01');
  });
});

describe('PhoneInput', () => {
  it('affiche le préfixe +242 et formate la saisie', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    function Wrapper() {
      const [value, setValue] = React.useState('');
      return (
        <PhoneInput
          value={value}
          onValueChange={(next) => {
            setValue(next);
            handleChange(next);
          }}
        />
      );
    }

    render(<Wrapper />);

    expect(screen.getByText('+242')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('06 xxx xx xx');
    await user.type(input, '066000001');

    expect(handleChange).toHaveBeenLastCalledWith('066000001');
    expect(input).toHaveValue('06 600 00 01');
  });
});
