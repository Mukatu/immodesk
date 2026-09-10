import Link from 'next/link';
import { MapPinOff } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <MapPinOff className="size-7" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-semibold text-foreground">Page introuvable</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        La page que vous cherchez n&apos;existe pas ou a été déplacée.
      </p>
      <Button asChild>
        <Link href="/app">Retour au tableau de bord</Link>
      </Button>
    </div>
  );
}
