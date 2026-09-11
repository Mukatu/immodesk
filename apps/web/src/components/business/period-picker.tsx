'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PeriodPickerProps {
  /** Période au format "YYYY-MM". */
  value: string;
  onValueChange: (period: string) => void;
  className?: string;
}

const MONTH_LABELS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

export function formatPeriodFr(period: string): string {
  const [yearStr, monthStr] = period.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const monthLabel = MONTH_LABELS_FR[monthIndex];
  if (!monthLabel || Number.isNaN(year)) return period;
  return `${monthLabel} ${year}`;
}

function shiftPeriod(period: string, delta: number): string {
  const [yearStr, monthStr] = period.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const date = new Date(Date.UTC(year, month + delta, 1));
  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${nextYear}-${nextMonth}`;
}

/** Sélecteur de mois (format contrat "YYYY-MM") avec navigation précédent/suivant. */
export function PeriodPicker({ value, onValueChange, className }: PeriodPickerProps) {
  return (
    <div
      className={cn('inline-flex items-center gap-1', className)}
      role="group"
      aria-label="Choix de la période"
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Mois précédent"
        onClick={() => onValueChange(shiftPeriod(value, -1))}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </Button>
      <span className="min-w-36 text-center text-sm font-medium" aria-live="polite">
        {formatPeriodFr(value)}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Mois suivant"
        onClick={() => onValueChange(shiftPeriod(value, 1))}
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

export function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
