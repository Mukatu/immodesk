import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';

export const metadata = { title: 'Accès refusé' };

export default function AccesRefusePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-warning/10 text-warning">
        <ShieldAlert className="size-7" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-semibold text-foreground">Accès refusé</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Votre rôle actuel ne permet pas d&apos;accéder à cette page. Contactez le responsable de
        votre organisation si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
      </p>
      <Button asChild>
        <Link href="/app">Retour au tableau de bord</Link>
      </Button>
    </div>
  );
}
