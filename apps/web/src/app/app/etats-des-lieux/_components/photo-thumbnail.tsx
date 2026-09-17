'use client';

import * as React from 'react';
import { ImageIcon } from 'lucide-react';

import { fetchDocumentDownloadUrl } from '@/lib/api/hooks/use-documents';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export interface PhotoThumbnailProps {
  documentId: string;
  label: string;
}

/**
 * Miniature de photo d'un poste d'état des lieux. Aucune URL directe n'est
 * disponible : l'URL de téléchargement signée est résolue à la demande via
 * `fetchDocumentDownloadUrl`, jamais stockée (même principe que PhotoLink de
 * l'écran de comparaison, dupliqué ici car _components est privé à sa route).
 */
export function PhotoThumbnail({ documentId, label }: PhotoThumbnailProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  async function handleOpen() {
    setError(null);
    setIsLoading(true);
    try {
      const { downloadUrl } = await fetchDocumentDownloadUrl(documentId);
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleOpen}
        disabled={isLoading}
        aria-label={`Voir la photo — ${label}`}
        className="flex size-16 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        <ImageIcon className="size-6" aria-hidden="true" />
      </button>
      {error ? (
        <p role="alert" className="mt-1 max-w-16 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
