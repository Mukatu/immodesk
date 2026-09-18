'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/business/page-header';
import { DocumentUploader } from '@/components/business/document-uploader';
import { useAuth } from '@/lib/auth/auth-context';
import {
  usePortfolioImportJob,
  useStartPortfolioImport,
} from '@/lib/api/hooks/use-portfolio-imports';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import type { Document } from '@/lib/api/types';
import { ImportReportCard } from './_components/import-report-card';

const CSV_MIME_TYPES = ['text/csv', 'application/vnd.ms-excel', 'text/plain'] as const;
const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;

/**
 * Import de portefeuille (arbitrage n°3 du contrat phase 10) : le fichier est
 * d'abord téléversé comme un document classique (genre OTHER), puis l'import
 * est lancé en citant `documentId`. Aucune table dédiée n'existe : le suivi
 * (`GET /portfolio-imports/{jobId}`) est interrogé par sondage jusqu'à un
 * statut final.
 */
export default function ImportPortefeuillePage() {
  const { currentOrganizationId, currentOrganization } = useAuth();
  const isOwnerOrManager =
    currentOrganization?.role === 'OWNER' || currentOrganization?.role === 'MANAGER';

  const [jobId, setJobId] = React.useState<string | null>(null);
  const [startError, setStartError] = React.useState<string | null>(null);

  const startImport = useStartPortfolioImport();
  const { data: report, isLoading: loadingJob } = usePortfolioImportJob(jobId);

  async function handleUploaded(document: Document) {
    setStartError(null);
    try {
      const accepted = await startImport.mutateAsync({ documentId: document.id });
      setJobId(accepted.jobId);
    } catch (err) {
      setStartError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  if (!isOwnerOrManager) {
    return (
      <div className="space-y-8">
        <PageHeader title="Import de portefeuille" />
        <p className="text-sm text-muted-foreground">
          Réservé aux rôles Gestionnaire et Propriétaire.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Import de portefeuille"
        description="Reprise en masse des bailleurs, biens, lots, locataires et baux depuis un fichier CSV."
      />

      <Card>
        <CardHeader>
          <CardTitle>Format attendu</CardTitle>
          <CardDescription>
            Un seul fichier CSV, encodage UTF-8, séparateur point-virgule, avec dans cet ordre les
            bailleurs, les biens, les lots, les locataires puis les baux — chaque ligne préfixée de
            son type d&apos;entité. Les dépendances croisées se résolvent par des références locales
            au fichier, jamais par des identifiants de base. Une ligne en échec n&apos;interrompt
            jamais l&apos;import : elle est comptée et motivée dans le rapport.
          </CardDescription>
        </CardHeader>
      </Card>

      {!jobId ? (
        <Card>
          <CardHeader>
            <CardTitle>Téléverser le fichier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DocumentUploader
              relatedEntityType="organization"
              relatedEntityId={currentOrganizationId ?? ''}
              kind="OTHER"
              acceptedMimeTypes={CSV_MIME_TYPES}
              maxSizeBytes={MAX_IMPORT_FILE_BYTES}
              onUploaded={(doc) => void handleUploaded(doc)}
            />
            {startImport.isPending ? (
              <p className="text-sm text-muted-foreground">Lancement de l&apos;import…</p>
            ) : null}
            {startError ? (
              <p role="alert" aria-live="polite" className="text-sm font-medium text-destructive">
                {startError}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Suivi de l&apos;import</CardTitle>
            <CardDescription>
              Le rapport se met à jour automatiquement jusqu&apos;à son terme.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingJob && !report ? (
              <Skeleton className="h-32 w-full" />
            ) : report ? (
              <ImportReportCard report={report} onRestart={() => setJobId(null)} />
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Import introuvable.</p>
                <Button type="button" onClick={() => setJobId(null)}>
                  Recommencer
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
