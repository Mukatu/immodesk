'use client';

import * as React from 'react';
import Link from 'next/link';
import { Copy, LayoutDashboard } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/business/status-badge';
import { PhoneDisplay } from '@/components/business/phone-display';
import { REFERRAL_PARTNER_STATUS_LABELS } from '@/lib/enum-labels';
import type { ReferralPartner } from '@/lib/api/types';

const PARTNER_STATUS_VARIANT: Record<
  ReferralPartner['status'],
  'success' | 'secondary' | 'warning' | 'outline'
> = {
  PENDING_VERIFICATION: 'secondary',
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  CLOSED: 'outline',
};

async function copyToClipboard(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copié.`);
  } catch {
    toast.error('Copie impossible, sélectionnez le texte manuellement.');
  }
}

/** Affiche le code de parrainage et les supports à partager, une fois l'inscription acceptée. */
export function PartnerShareCard({ partner }: { partner: ReferralPartner }) {
  const [origin, setOrigin] = React.useState('');
  React.useEffect(() => setOrigin(window.location.origin), []);
  const referralLink = origin ? `${origin}/onboarding/organisation?code=${partner.code}` : '';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>Votre code de parrainage</CardTitle>
          <StatusBadge
            status={partner.status}
            labelOverride={REFERRAL_PARTNER_STATUS_LABELS[partner.status]}
            variantOverride={PARTNER_STATUS_VARIANT[partner.status]}
          />
        </div>
        <CardDescription>
          {partner.status === 'PENDING_VERIFICATION'
            ? 'Votre compte est en cours de vérification par la plateforme ; le code fonctionne dès maintenant.'
            : 'Partagez ce code ou ce lien avec vos filleuls à leur inscription.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Input readOnly value={partner.code} className="font-mono text-lg tracking-widest" />
          <Button
            type="button"
            variant="outline"
            onClick={() => copyToClipboard(partner.code, 'Le code')}
          >
            <Copy className="mr-2 size-4" aria-hidden="true" />
            Copier
          </Button>
        </div>
        {referralLink ? (
          <div className="flex items-center gap-2">
            <Input readOnly value={referralLink} className="text-sm" />
            <Button
              type="button"
              variant="outline"
              onClick={() => copyToClipboard(referralLink, 'Le lien')}
            >
              <Copy className="mr-2 size-4" aria-hidden="true" />
              Copier
            </Button>
          </div>
        ) : null}
        <dl className="text-sm text-muted-foreground">
          <div className="flex gap-2">
            <dt className="font-medium text-foreground">Contact Mobile Money :</dt>
            <dd>
              <PhoneDisplay phone={partner.phone} />
            </dd>
          </div>
        </dl>
        <Button asChild>
          <Link href="/partenaire/tableau-de-bord">
            <LayoutDashboard className="mr-2 size-4" aria-hidden="true" />
            Voir mon tableau de bord
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
