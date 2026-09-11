'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/business/page-header';
import { useAuth } from '@/lib/auth/auth-context';
import {
  useContractTemplate,
  useUpdateContractTemplate,
} from '@/lib/api/hooks/use-contract-template';
import type { ContractTemplate } from '@/lib/api/types';

type ClauseState = ContractTemplate['optionalClauses'][number];

function newClauseKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Date.now().toString();
}

export default function ParametresContratPage() {
  const { currentOrganizationId } = useAuth();
  const { data: template, isLoading } = useContractTemplate(currentOrganizationId);
  const updateTemplate = useUpdateContractTemplate(currentOrganizationId);

  const [headerTitle, setHeaderTitle] = React.useState('');
  const [lessorBlock, setLessorBlock] = React.useState('');
  const [clauses, setClauses] = React.useState<ClauseState[]>([]);
  const [legalMentions, setLegalMentions] = React.useState('');
  const [signatureCity, setSignatureCity] = React.useState('');
  const [showOhadaBlock, setShowOhadaBlock] = React.useState(false);
  const [footerText, setFooterText] = React.useState('');

  React.useEffect(() => {
    if (!template) return;
    setHeaderTitle(template.headerTitle);
    setLessorBlock(template.lessorBlock);
    setClauses(template.optionalClauses);
    setLegalMentions(template.legalMentions);
    setSignatureCity(template.signatureCity);
    setShowOhadaBlock(template.showOhadaBlock);
    setFooterText(template.footerText ?? '');
  }, [template]);

  function addClause() {
    setClauses((prev) => [...prev, { key: newClauseKey(), title: '', body: '', enabled: true }]);
  }

  function updateClause(key: string, patch: Partial<ClauseState>) {
    setClauses((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }

  function removeClause(key: string) {
    setClauses((prev) => prev.filter((c) => c.key !== key));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await updateTemplate.mutateAsync({
        headerTitle,
        lessorBlock,
        optionalClauses: clauses,
        legalMentions,
        signatureCity,
        showOhadaBlock,
        footerText: footerText || null,
      });
      toast.success('Modèle de contrat mis à jour.');
    } catch {
      toast.error('Impossible de mettre à jour le modèle de contrat.');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modèle de contrat"
        description="Personnalisez le contenu généré lors de la création d'un contrat de bail."
      />

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>En-tête et bailleur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="headerTitle">Titre de l&apos;en-tête</Label>
                <Input
                  id="headerTitle"
                  value={headerTitle}
                  onChange={(e) => setHeaderTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lessorBlock">Bloc bailleur</Label>
                <Textarea
                  id="lessorBlock"
                  value={lessorBlock}
                  onChange={(e) => setLessorBlock(e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Clauses optionnelles</CardTitle>
              <CardDescription>
                Activez ou désactivez chaque clause ; elle n&apos;apparaît dans le contrat que si
                elle est cochée.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {clauses.map((clause) => (
                <div key={clause.key} className="space-y-2 rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`clause-enabled-${clause.key}`}
                        checked={clause.enabled}
                        onChange={(e) => updateClause(clause.key, { enabled: e.target.checked })}
                      />
                      <Label htmlFor={`clause-enabled-${clause.key}`} className="font-normal">
                        Activée
                      </Label>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeClause(clause.key)}
                      aria-label="Supprimer la clause"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                  <Input
                    aria-label="Titre de la clause"
                    placeholder="Titre de la clause"
                    value={clause.title}
                    onChange={(e) => updateClause(clause.key, { title: e.target.value })}
                  />
                  <Textarea
                    aria-label="Corps de la clause"
                    placeholder="Texte de la clause"
                    value={clause.body}
                    onChange={(e) => updateClause(clause.key, { body: e.target.value })}
                    rows={3}
                  />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addClause}>
                <Plus className="mr-2 size-4" aria-hidden="true" />
                Ajouter une clause
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mentions et signature</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="legalMentions">Mentions légales</Label>
                <Textarea
                  id="legalMentions"
                  value={legalMentions}
                  onChange={(e) => setLegalMentions(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signatureCity">Ville de signature</Label>
                <Input
                  id="signatureCity"
                  value={signatureCity}
                  onChange={(e) => setSignatureCity(e.target.value)}
                />
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="showOhadaBlock"
                  checked={showOhadaBlock}
                  onChange={(e) => setShowOhadaBlock(e.target.checked)}
                />
                <Label htmlFor="showOhadaBlock" className="flex flex-col gap-0.5 font-normal">
                  <span>Bloc OHADA</span>
                  <span className="text-sm text-muted-foreground">
                    Bail commercial : ajoute les mentions de l&apos;Acte uniforme OHADA.
                  </span>
                </Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerText">Pied de page (optionnel)</Label>
                <Textarea
                  id="footerText"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" disabled={updateTemplate.isPending}>
            {updateTemplate.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      )}
    </div>
  );
}
