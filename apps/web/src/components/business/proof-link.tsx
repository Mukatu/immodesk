'use client';

import * as React from 'react';
import { FileSearch } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { fetchDocumentDownloadUrl } from '@/lib/api/hooks/use-documents';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export interface ProofLinkProps {
  documentId: string | null;
  className?: string;
}

/**
 * Lien simple ouvrant la preuve (capture Mobile Money ou justificatif de
 * virement) dans un nouvel onglet — pas de viewer intégré, même pattern que
 * `DocumentList` (components/business/document-uploader.tsx) : on résout
 * l'URL de téléchargement signée à la demande plutôt que de la stocker.
 */
export function ProofLink({ documentId, className }: ProofLinkProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  if (!documentId) {
    return <p className="text-sm text-muted-foreground">Aucune preuve jointe.</p>;
  }

  async function handleOpen() {
    setError(null);
    setIsLoading(true);
    try {
      const { downloadUrl } = await fetchDocumentDownloadUrl(documentId as string);
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button type="button" variant="outline" onClick={handleOpen} disabled={isLoading}>
        <FileSearch className="size-4" aria-hidden="true" />
        {isLoading ? 'Ouverture…' : 'Voir la preuve'}
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
