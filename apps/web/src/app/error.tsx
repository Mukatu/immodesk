'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-7" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-semibold text-foreground">Une erreur est survenue</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Quelque chose s&apos;est mal passé de notre côté. Vous pouvez réessayer, l&apos;équipe
        Immodesk a été informée.
      </p>
      <Button type="button" onClick={reset}>
        Réessayer
      </Button>
    </div>
  );
}
