'use client';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useInspectionPdf } from '@/lib/api/hooks/use-inspections';
import { inspectionErrorMessage } from './inspection-error-message';

export interface InspectionPdfLinkProps {
  inspectionId: string;
}

/** Lien de téléchargement du rapport PDF, résolu à la demande (URL signée, non stockée). */
export function InspectionPdfLink({ inspectionId }: InspectionPdfLinkProps) {
  const inspectionPdf = useInspectionPdf(inspectionId);

  async function handleClick() {
    const result = await inspectionPdf.refetch();
    if (result.data?.downloadUrl) {
      window.open(result.data.downloadUrl, '_blank', 'noopener,noreferrer');
    } else {
      toast.error(inspectionErrorMessage(result.error));
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={inspectionPdf.isFetching}
    >
      {inspectionPdf.isFetching ? 'Génération…' : 'Télécharger le rapport PDF'}
    </Button>
  );
}
