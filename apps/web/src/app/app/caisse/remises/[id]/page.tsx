'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/business/page-header';
import { EmptyState } from '@/components/business/empty-state';
import { MoneyXaf } from '@/components/business/money-xaf';
import { RemittanceStatusBadge } from '@/components/business/remittance-status-badge';
import { useCashRemittance, useVerifyCashRemittance } from '@/lib/api/hooks/use-cash-remittances';
import { ApiError } from '@/lib/api/client';
import { RejectRemittanceDialog } from './_components/reject-remittance-dialog';
import { DepositRemittanceDialog } from './_components/deposit-remittance-dialog';

interface ItemCheck {
  isVerified: boolean;
  varianceReason: string;
}

export default function RemiseDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: remittance, isLoading, error } = useCashRemittance(id);
  const verifyRemittance = useVerifyCashRemittance(id);

  const [countedAmount, setCountedAmount] = React.useState('');
  const [checks, setChecks] = React.useState<Record<string, ItemCheck>>({});

  React.useEffect(() => {
    if (!remittance) return;
    setCountedAmount(String(remittance.expectedAmount));
    setChecks(
      Object.fromEntries(
        remittance.items.map((item) => [
          item.cashReceiptId,
          { isVerified: true, varianceReason: '' },
        ]),
      ),
    );
  }, [remittance]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState
        title="Remise introuvable"
        description="Cette remise n'existe pas."
        action={
          <Button asChild variant="outline">
            <Link href="/app/caisse/remises">Retour aux remises</Link>
          </Button>
        }
      />
    );
  }

  if (error || !remittance) {
    return <EmptyState title="Impossible de charger cette remise" />;
  }

  const counted = Number(countedAmount || 0);
  const variance = counted - remittance.expectedAmount;

  async function handleVerify() {
    try {
      await verifyRemittance.mutateAsync({
        countedAmount: counted,
        items: Object.entries(checks).map(([cashReceiptId, check]) => ({
          cashReceiptId,
          isVerified: check.isVerified,
          varianceReason: check.varianceReason || undefined,
        })),
      });
      toast.success('Remise vérifiée.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible de vérifier la remise.');
    }
  }

  return (
    <div className="space-y-8">
      <Link
        href="/app/caisse/remises"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Retour aux remises
      </Link>

      <PageHeader
        title={remittance.reference}
        description={remittance.collectorName}
        actions={
          <div className="flex items-center gap-2">
            <RemittanceStatusBadge status={remittance.status} />
            {remittance.status === 'SUBMITTED' ? (
              <>
                <Button type="button" onClick={handleVerify} disabled={verifyRemittance.isPending}>
                  {verifyRemittance.isPending ? 'Validation…' : 'Valider la remise'}
                </Button>
                <RejectRemittanceDialog remittanceId={remittance.id} />
              </>
            ) : null}
            {remittance.status === 'VERIFIED' ? (
              <DepositRemittanceDialog remittanceId={remittance.id} />
            ) : null}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Contrôle du comptage</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Déclaré</p>
            <p className="font-medium">
              <MoneyXaf amount={remittance.declaredAmount} />
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Attendu (somme des reçus)</p>
            <p className="font-medium">
              <MoneyXaf amount={remittance.expectedAmount} />
            </p>
          </div>
          {remittance.status === 'SUBMITTED' ? (
            <div className="space-y-1">
              <Label htmlFor="countedAmount">Montant compté</Label>
              <Input
                id="countedAmount"
                inputMode="numeric"
                value={countedAmount}
                onChange={(e) => setCountedAmount(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          ) : (
            <div>
              <p className="text-xs text-muted-foreground">Compté</p>
              <p className="font-medium">
                <MoneyXaf amount={remittance.countedAmount} />
              </p>
            </div>
          )}
          <div className="sm:col-span-3">
            <p className="text-xs text-muted-foreground">Écart (compté − attendu)</p>
            <p
              className={
                variance === 0 ? 'font-medium text-success' : 'font-medium text-destructive'
              }
            >
              <MoneyXaf
                amount={remittance.status === 'SUBMITTED' ? variance : remittance.varianceAmount}
                colorize
              />
              {variance !== 0 && remittance.status === 'SUBMITTED'
                ? ' — écart à justifier ci-dessous'
                : ''}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reçus de la remise</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reçu</TableHead>
                <TableHead>Montant</TableHead>
                {remittance.status === 'SUBMITTED' ? (
                  <>
                    <TableHead>Vérifié</TableHead>
                    <TableHead>Motif d&apos;écart</TableHead>
                  </>
                ) : (
                  <TableHead>Écart</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {remittance.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.receiptNumber}</TableCell>
                  <TableCell>
                    <MoneyXaf amount={item.amount} />
                  </TableCell>
                  {remittance.status === 'SUBMITTED' ? (
                    <>
                      <TableCell>
                        <Checkbox
                          aria-label={`Reçu ${item.receiptNumber} vérifié`}
                          checked={checks[item.cashReceiptId]?.isVerified ?? true}
                          onChange={(e) =>
                            setChecks((prev) => ({
                              ...prev,
                              [item.cashReceiptId]: {
                                isVerified: e.target.checked,
                                varianceReason: prev[item.cashReceiptId]?.varianceReason ?? '',
                              },
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          aria-label={`Motif d'écart pour ${item.receiptNumber}`}
                          value={checks[item.cashReceiptId]?.varianceReason ?? ''}
                          onChange={(e) =>
                            setChecks((prev) => ({
                              ...prev,
                              [item.cashReceiptId]: {
                                isVerified: prev[item.cashReceiptId]?.isVerified ?? true,
                                varianceReason: e.target.value,
                              },
                            }))
                          }
                          placeholder="Facultatif"
                        />
                      </TableCell>
                    </>
                  ) : (
                    <TableCell>{item.isVerified ? 'OK' : (item.varianceReason ?? '—')}</TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
