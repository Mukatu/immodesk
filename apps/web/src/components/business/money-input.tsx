'use client';

import * as React from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatXafInputValue, parseXafInput } from '@/lib/money';

export interface MoneyInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> {
  /** Montant entier en XAF, ou null si vide. */
  value: number | null;
  onValueChange: (value: number | null) => void;
}

/** Saisie d'un montant entier XAF : n'accepte que des chiffres, formate au fil de la frappe. */
export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onValueChange, className, ...props }, ref) => {
    return (
      <div className="relative">
        <Input
          ref={ref}
          inputMode="numeric"
          autoComplete="off"
          className={cn('pr-14 text-right tabular-nums', className)}
          value={formatXafInputValue(value)}
          onChange={(event) => {
            const parsed = parseXafInput(event.target.value);
            onValueChange(parsed);
          }}
          {...props}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
          XAF
        </span>
      </div>
    );
  },
);
MoneyInput.displayName = 'MoneyInput';
