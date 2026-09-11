'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/business/empty-state';
import { useContractPreviewHtml } from '@/lib/api/hooks/use-contract-jobs';

export default function ContratPreviewPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: html, isLoading, error } = useContractPreviewHtml(id);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/app/baux/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Retour au bail
        </Link>
        <Button
          type="button"
          variant="outline"
          onClick={() => iframeRef.current?.contentWindow?.print()}
          disabled={!html}
        >
          <Printer className="mr-2 size-4" aria-hidden="true" />
          Imprimer
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-[80vh] w-full" />
      ) : error || !html ? (
        <EmptyState
          title="Impossible de charger l'aperçu du contrat"
          description={error instanceof Error ? error.message : undefined}
        />
      ) : (
        <iframe
          ref={iframeRef}
          srcDoc={html}
          title="Aperçu du contrat"
          className="h-[80vh] w-full rounded-md border border-border bg-white"
        />
      )}
    </div>
  );
}
