'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { MoneyXaf } from '@/components/business/money-xaf';
import type { MeterReading } from '@/lib/api/types';
import { formatDateFr } from '../../_components/format-date-fr';
import { PhotoLink } from './photo-link';

export interface ReadingRowProps {
  reading: MeterReading;
  /** MANAGER connecté : seul rôle autorisé à confirmer un relevé estimé. */
  canConfirm: boolean;
  isConfirming: boolean;
  onConfirm: () => void;
}

/**
 * Ligne d'historique d'un relevé de compteur. Composant de présentation pur
 * (aucun appel réseau) : la ligne d'une table `<TableBody>` existante.
 *
 * Un relevé estimé (`isEstimated`) n'est jamais utilisé pour facturer tant
 * qu'un MANAGER ne l'a pas confirmé (arbitrage 1 du contrat) : signalé par un
 * badge « Estimé — non confirmé » et, pour un MANAGER, une action de
 * confirmation tant que le relevé n'est pas déjà facturé.
 */
export function ReadingRow({ reading, canConfirm, isConfirming, onConfirm }: ReadingRowProps) {
  const showConfirmAction = canConfirm && reading.isEstimated && !reading.isInvoiced;

  return (
    <TableRow>
      <TableCell>{formatDateFr(reading.readingDate)}</TableCell>
      <TableCell className="tabular-nums">
        {reading.currentIndex}
        {reading.rolloverApplied ? (
          <p className="text-xs text-muted-foreground">Passage par zéro</p>
        ) : null}
      </TableCell>
      <TableCell className="tabular-nums">{reading.consumption}</TableCell>
      <TableCell>
        <MoneyXaf amount={reading.computedAmount} />
      </TableCell>
      <TableCell>
        {reading.isEstimated ? (
          <Badge variant="warning">Estimé — non confirmé</Badge>
        ) : (
          <Badge variant="outline">Relevé</Badge>
        )}
      </TableCell>
      <TableCell>
        {reading.isInvoiced ? (
          <Badge variant="success">Facturé</Badge>
        ) : (
          <Badge variant="secondary">Non facturé</Badge>
        )}
      </TableCell>
      <TableCell>
        {reading.photoDocumentId ? (
          <PhotoLink
            documentId={reading.photoDocumentId}
            label={`relevé du ${formatDateFr(reading.readingDate)}`}
          />
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell>
        {showConfirmAction ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? 'Confirmation…' : 'Confirmer'}
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
