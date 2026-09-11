'use client';

import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContractJobStatus } from '@/components/business/contract-job-status';
import { DocumentUploader } from '@/components/business/document-uploader';
import { useGenerateContract } from '@/lib/api/hooks/use-contract-jobs';
import { useCreateLeaseDocument } from '@/lib/api/hooks/use-lease-documents';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import type { Document, LeaseDocument } from '@/lib/api/types';

export interface ContractCardProps {
  leaseId: string;
  documents: LeaseDocument[];
}

export function ContractCard({ leaseId, documents }: ContractCardProps) {
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const generateContract = useGenerateContract(leaseId);
  const createLeaseDocument = useCreateLeaseDocument(leaseId);

  async function handleGenerate() {
    setError(null);
    try {
      const result = await generateContract.mutateAsync({});
      setJobId(result.jobId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  async function handleUploaded(doc: Document) {
    try {
      await createLeaseDocument.mutateAsync({
        documentId: doc.id,
        kind: 'CONTRACT',
        title: doc.fileName,
        isSigned: true,
        signedAt: new Date().toISOString(),
      });
      toast.success('Contrat signé rattaché au bail.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contrat</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={handleGenerate} disabled={generateContract.isPending}>
            {generateContract.isPending ? 'Génération…' : 'Générer le contrat'}
          </Button>
          <Button asChild variant="outline">
            <Link href={`/app/baux/${leaseId}/contrat`} target="_blank">
              Prévisualiser le contrat
            </Link>
          </Button>
          {jobId ? <ContractJobStatus leaseId={leaseId} jobId={jobId} /> : null}
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        {documents.length > 0 ? (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{doc.title}</span>
                  <span className="text-xs text-muted-foreground">Version {doc.version}</span>
                </div>
                <Badge variant={doc.isSigned ? 'success' : 'secondary'}>
                  {doc.isSigned ? 'Signé' : 'Généré'}
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="space-y-2">
          <p className="text-sm font-medium">Téléverser le contrat signé</p>
          <DocumentUploader
            relatedEntityType="lease"
            relatedEntityId={leaseId}
            kind="LEASE_CONTRACT"
            onUploaded={handleUploaded}
          />
        </div>
      </CardContent>
    </Card>
  );
}
