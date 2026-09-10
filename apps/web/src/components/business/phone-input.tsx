'use client';

import * as React from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { digitsOnly, formatLocalCongo } from '@/lib/phone';

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** 9 chiffres locaux (sans indicatif), ou chaîne vide. */
  value: string;
  onValueChange: (localDigits: string) => void;
}

/** Saisie d'un numéro congolais : préfixe +242 fixe, formatage "06 xxx xx xx". */
export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onValueChange, className, id, ...props }, ref) => {
    const inputId = id ?? 'phone-input';
    return (
      <div className={cn('flex items-stretch gap-2', className)}>
        <span
          className="flex h-11 select-none items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground"
          aria-hidden="true"
        >
          +242
        </span>
        <Input
          ref={ref}
          id={inputId}
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="06 xxx xx xx"
          value={formatLocalCongo(value)}
          onChange={(event) => {
            const digits = digitsOnly(event.target.value).slice(0, 9);
            onValueChange(digits);
          }}
          {...props}
        />
      </div>
    );
  },
);
PhoneInput.displayName = 'PhoneInput';
