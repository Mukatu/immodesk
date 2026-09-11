import { Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { useContractJob } from '@/lib/api/hooks/use-contract-jobs';

export interface ContractJobStatusProps {
  leaseId: string;
  jobId: string | null;
}

/** Statut du job asynchrone de génération de contrat, avec polling (voir useContractJob). */
export function ContractJobStatus({ leaseId, jobId }: ContractJobStatusProps) {
  const { data } = useContractJob(leaseId, jobId);

  return (
    <div aria-live="polite">
      {!data ? (
        <Badge variant="outline">En attente</Badge>
      ) : data.status === 'QUEUED' ? (
        <Badge variant="secondary">En file</Badge>
      ) : data.status === 'RUNNING' ? (
        <Badge variant="warning" className="inline-flex items-center gap-1.5">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          Génération en cours
        </Badge>
      ) : data.status === 'DONE' ? (
        <Badge variant="success">Contrat généré</Badge>
      ) : (
        <Badge variant="destructive">{`Échec : ${data.error ?? 'erreur inconnue'}`}</Badge>
      )}
    </div>
  );
}
