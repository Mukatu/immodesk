'use client';

import * as React from 'react';

import { PageHeader } from '@/components/business/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BankTransferDeclarationsPanel } from './_components/bank-transfer-declarations-panel';
import { MomoDeclarationsPanel } from './_components/momo-declarations-panel';

type DeclarationTab = 'mobile-money' | 'virement';

/**
 * File d'instruction des déclarations de paiement (Mobile Money et virement) :
 * une déclaration ne crée pas de paiement, la validation ici en crée un
 * (contrat phase 4, arbitrage 1).
 */
export default function DeclarationsPaiementPage() {
  const [tab, setTab] = React.useState<DeclarationTab>('mobile-money');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Déclarations de paiement"
        description="Instruisez les déclarations Mobile Money et virement : valider crée le paiement, rejeter n'en crée aucun."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as DeclarationTab)}>
        <TabsList>
          <TabsTrigger value="mobile-money">Mobile Money</TabsTrigger>
          <TabsTrigger value="virement">Virement</TabsTrigger>
        </TabsList>
        <TabsContent value="mobile-money">
          <MomoDeclarationsPanel />
        </TabsContent>
        <TabsContent value="virement">
          <BankTransferDeclarationsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
