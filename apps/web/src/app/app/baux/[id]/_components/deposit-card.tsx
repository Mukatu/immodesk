'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DepositBalance } from '@/components/business/deposit-balance';
import { MoneyXaf } from '@/components/business/money-xaf';
import { DEPOSIT_MOVEMENT_TYPE_LABELS } from '@/lib/enum-labels';
import type { DepositDetail } from '@/lib/api/types';
import { formatDateFr } from './format-date-fr';

export interface DepositCardProps {
  deposit: DepositDetail | null;
}

export function DepositCard({ deposit }: DepositCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dépôt de garantie</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!deposit ? (
          <p className="text-sm text-muted-foreground">
            Le dépôt sera créé à l&apos;activation du bail.
          </p>
        ) : (
          <>
            <DepositBalance deposit={deposit} />
            {deposit.movements.length > 0 ? (
              <div className="overflow-x-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Raison</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deposit.movements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell>
                          {formatDateFr(movement.movementDate ?? movement.createdAt)}
                        </TableCell>
                        <TableCell>{DEPOSIT_MOVEMENT_TYPE_LABELS[movement.movementType]}</TableCell>
                        <TableCell>
                          <MoneyXaf amount={movement.amount} />
                        </TableCell>
                        <TableCell>{movement.reason || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
            <Button asChild variant="link" size="sm" className="h-auto px-0">
              <Link href="/app/depots">Voir dans /app/depots</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
