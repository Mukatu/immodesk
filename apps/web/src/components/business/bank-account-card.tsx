import type { BankAccount } from '@/lib/api/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { bankNameForCode } from '@/lib/bank-reference';
import { PhoneDisplay } from '@/components/business/phone-display';

export interface BankAccountCardProps {
  account: BankAccount;
}

/** Masque un numéro de compte : ne conserve visibles que les 4 derniers chiffres. */
function maskAccountNumber(accountNumber: string): string {
  const last4 = accountNumber.slice(-4);
  return `•••• ${last4}`;
}

/** Carte de présentation d'un compte bancaire ou Mobile Money (référentiel BankAccount). */
export function BankAccountCard({ account }: BankAccountCardProps) {
  const bankLabel = bankNameForCode(account.bankCode);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">{account.label}</CardTitle>
        <div className="flex items-center gap-2">
          {account.isDefault ? <Badge variant="secondary">Compte par défaut</Badge> : null}
          {!account.isActive ? <Badge variant="outline">Inactif</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="font-medium text-foreground">{bankLabel}</p>
        <p className="text-muted-foreground">{account.accountHolderName}</p>
        {account.accountNumber ? (
          <p className="tabular-nums text-foreground">{maskAccountNumber(account.accountNumber)}</p>
        ) : null}
        {account.iban ? (
          <p className="tabular-nums text-muted-foreground">IBAN : {account.iban}</p>
        ) : null}
        {account.ribKey ? (
          <p className="tabular-nums text-muted-foreground">Clé RIB : {account.ribKey}</p>
        ) : null}
        {account.momoProvider && account.momoMsisdn ? (
          <PhoneDisplay phone={account.momoMsisdn} whatsapp />
        ) : null}
      </CardContent>
    </Card>
  );
}
