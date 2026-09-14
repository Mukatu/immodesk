'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OperatorBadge } from '@/components/business/operator-badge';
import type { PaymentInstructions } from '@/lib/api/types';

export interface PaymentInstructionsCardProps {
  instructions: PaymentInstructions;
  className?: string;
}

/**
 * Encart des instructions de paiement d'une facture ou d'un bail : référence de
 * virement copiable, comptes bancaires de réception, numéros Mobile Money avec
 * opérateur déduit. Une sous-section sans donnée (aucun compte, aucun numéro)
 * n'est pas affichée.
 */
export function PaymentInstructionsCard({ instructions, className }: PaymentInstructionsCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!instructions.transferReference) return;
    try {
      await navigator.clipboard.writeText(instructions.transferReference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers indisponible (navigateur ou contexte non sécurisé) : on ignore.
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Instructions de paiement</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {instructions.transferReference ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/50 p-3">
            <div>
              <p className="text-sm text-muted-foreground">Référence de virement</p>
              <p className="font-medium tabular-nums">{instructions.transferReference}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              {copied ? 'Copié' : 'Copier'}
            </Button>
          </div>
        ) : null}

        {instructions.bankAccounts.length > 0 ? (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Comptes bancaires</h3>
            <ul className="flex flex-col gap-2">
              {instructions.bankAccounts.map((account) => (
                <li key={account.id} className="rounded-md border border-border p-3 text-sm">
                  <p className="font-medium">{account.bankName}</p>
                  <p>{account.accountHolderName}</p>
                  {account.accountNumber ? (
                    <p className="tabular-nums">N° {account.accountNumber}</p>
                  ) : null}
                  {account.iban ? <p className="tabular-nums">IBAN {account.iban}</p> : null}
                  {account.ribKey ? <p className="tabular-nums">Clé RIB {account.ribKey}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {instructions.mobileMoneyNumbers.length > 0 ? (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Numéros Mobile Money</h3>
            <ul className="flex flex-col gap-2">
              {instructions.mobileMoneyNumbers.map((momo) => (
                <li
                  key={momo.bankAccountId}
                  className="flex items-center justify-between gap-2 rounded-md border border-border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium tabular-nums">{momo.msisdn}</p>
                    <p className="text-muted-foreground">{momo.holderName}</p>
                  </div>
                  <OperatorBadge msisdn={momo.msisdn} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
