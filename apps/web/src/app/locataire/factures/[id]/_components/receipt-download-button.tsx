'use client';

import * as React from 'react';
import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTenantReceipt } from '@/lib/api/hooks/use-tenant-portal';
import { genericErrorMessage } from '@/lib/api/tenant-client';

export interface ReceiptDownloadButtonProps {
  receiptId: string;
}

/**
 * Télécharge la quittance PDF (`GET /tenant/receipts/{id}`) : lien à durée de
 * vie limitée résolu à la demande, jamais stocké (même principe que
 * `ProofLink`, components/business/proof-link.tsx, et `InspectionPdfLink`).
 */
export function ReceiptDownloadButton({ receiptId }: ReceiptDownloadButtonProps) {
  const { refetch, isFetching } = useTenantReceipt(receiptId);
  const [error, setError] = React.useState<string | null>(null);

  async function handleDownload() {
    setError(null);
    const result = await refetch();
    if (result.data?.downloadUrl) {
      window.open(result.data.downloadUrl, '_blank', 'noopener,noreferrer');
    } else {
      setError(genericErrorMessage);
    }
  }

  return (
    <div>
      <Button type="button" variant="outline" onClick={handleDownload} disabled={isFetching}>
        <Download className="size-4" aria-hidden="true" />
        {isFetching ? 'Préparation…' : 'Télécharger la quittance'}
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
