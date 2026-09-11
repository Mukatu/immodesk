'use client';

export interface StepIndicatorProps {
  step: 1 | 2 | 3;
}

const STEPS: { step: 1 | 2 | 3; label: string }[] = [
  { step: 1, label: 'Lot et locataire' },
  { step: 2, label: 'Conditions financières' },
  { step: 3, label: 'Dépôt et parties' },
];

/** Indicateur d'étapes simple (pas de dépendance Stepper dans le dépôt). */
export function StepIndicator({ step }: StepIndicatorProps) {
  return (
    <ol className="flex items-center gap-2 sm:gap-4" aria-label="Étapes de création du bail">
      {STEPS.map((item, index) => {
        const isActive = item.step === step;
        const isDone = item.step < step;
        return (
          <li key={item.step} className="flex flex-1 items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <span
                aria-current={isActive ? 'step' : undefined}
                className={
                  'flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-medium ' +
                  (isDone
                    ? 'bg-primary text-primary-foreground'
                    : isActive
                      ? 'border-2 border-primary text-primary'
                      : 'border border-border text-muted-foreground')
                }
              >
                {item.step}
              </span>
              <span
                className={
                  'hidden text-sm sm:inline ' +
                  (isActive ? 'font-medium text-foreground' : 'text-muted-foreground')
                }
              >
                {item.label}
              </span>
            </div>
            {index < STEPS.length - 1 ? (
              <div className="h-px flex-1 bg-border" aria-hidden="true" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
