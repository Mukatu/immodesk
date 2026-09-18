'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Circle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/business/page-header';
import { useAuth } from '@/lib/auth/auth-context';
import { useOnboardingWizardState } from '@/lib/api/hooks/use-onboarding-wizard';
import { cn } from '@/lib/utils';
import { StepFirstProperty } from './_components/step-first-property';
import { StepFirstLease } from './_components/step-first-lease';
import { StepFirstInvite } from './_components/step-first-invite';

type StepKey = 'property' | 'lease' | 'invite';

const STEPS: { key: StepKey; label: string }[] = [
  { key: 'property', label: 'Premier bien' },
  { key: 'lease', label: 'Premier bail' },
  { key: 'invite', label: 'Première invitation' },
];

/**
 * `useSearchParams()` exige un bailout CSR encadré par `Suspense` (Next 15,
 * sinon `next build` échoue sur cette page) : le contenu réel vit dans ce
 * composant interne, le défaut ci-dessous ne fait que l'envelopper.
 */
function OnboardingEtapesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/app';
  const { currentOrganizationId } = useAuth();
  const { data: state, isLoading } = useOnboardingWizardState(currentOrganizationId);
  const [skipped, setSkipped] = React.useState<Set<StepKey>>(new Set());

  const doneMap: Record<StepKey, boolean> = {
    property: Boolean(state?.firstPropertyDone),
    lease: Boolean(state?.firstLeaseDone),
    invite: Boolean(state?.inviteDone),
  };

  const currentStep = STEPS.find((step) => !doneMap[step.key] && !skipped.has(step.key));

  if (!currentOrganizationId || isLoading) {
    return (
      <main id="contenu-principal" className="mx-auto max-w-2xl px-4 py-10">
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  return (
    <main id="contenu-principal" className="mx-auto max-w-2xl px-4 py-10">
      <PageHeader
        title="Finalisez votre démarrage"
        description="Trois étapes facultatives pour prendre en main Immodesk. Vous pouvez les passer et les reprendre plus tard."
      />

      <ol
        className="my-6 flex items-center gap-2 text-xs text-muted-foreground"
        aria-label="Étapes"
      >
        {STEPS.map((step) => {
          const done = doneMap[step.key] || skipped.has(step.key);
          return (
            <li
              key={step.key}
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1',
                currentStep?.key === step.key
                  ? 'border-primary text-primary font-medium'
                  : 'border-border',
              )}
            >
              {done ? (
                <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" />
              ) : (
                <Circle className="size-3.5" aria-hidden="true" />
              )}
              {step.label}
            </li>
          );
        })}
      </ol>

      {currentStep ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{currentStep.label}</CardTitle>
          </CardHeader>
          <CardContent>
            {currentStep.key === 'property' ? (
              <StepFirstProperty
                organizationId={currentOrganizationId}
                onDone={() => {}}
                onSkip={() => setSkipped((prev) => new Set(prev).add('property'))}
              />
            ) : null}
            {currentStep.key === 'lease' ? (
              <StepFirstLease
                organizationId={currentOrganizationId}
                onDone={() => {}}
                onSkip={() => setSkipped((prev) => new Set(prev).add('lease'))}
              />
            ) : null}
            {currentStep.key === 'invite' ? (
              <StepFirstInvite
                organizationId={currentOrganizationId}
                onDone={() => {}}
                onSkip={() => setSkipped((prev) => new Set(prev).add('invite'))}
              />
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">Vous êtes prêt à utiliser Immodesk.</p>
          <Button type="button" onClick={() => router.push(redirectTo)}>
            Aller au tableau de bord
          </Button>
        </div>
      )}
    </main>
  );
}

export default function OnboardingEtapesPage() {
  return (
    <Suspense
      fallback={
        <main id="contenu-principal" className="mx-auto max-w-2xl px-4 py-10">
          <Skeleton className="h-64 w-full" />
        </main>
      }
    >
      <OnboardingEtapesContent />
    </Suspense>
  );
}
