'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EnumSelect } from '@/components/business/enum-select';
import { PageHeader } from '@/components/business/page-header';
import { MoneyInput } from '@/components/business/money-input';
import { DocumentUploader } from '@/components/business/document-uploader';
import { useProperties } from '@/lib/api/hooks/use-properties';
import { useCreateExpense, useSubmitExpense, useUpdateExpense } from '@/lib/api/hooks/use-expenses';
import { EXPENSE_BEARER_LABELS, EXPENSE_CATEGORY_LABELS } from '@/lib/enum-labels';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import type { ExpenseBearer, ExpenseCategory } from '@/lib/api/types';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NouvelleDepensePage() {
  const router = useRouter();
  const [propertyId, setPropertyId] = React.useState('');
  const [category, setCategory] = React.useState<ExpenseCategory>('REPAIR');
  const [label, setLabel] = React.useState('');
  const [amount, setAmount] = React.useState<number | null>(null);
  const [expenseDate, setExpenseDate] = React.useState(today());
  const [borneBy, setBorneBy] = React.useState<ExpenseBearer>('LANDLORD');
  const [isRebillable, setIsRebillable] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [createdExpenseId, setCreatedExpenseId] = React.useState<string | null>(null);
  const [hasDocument, setHasDocument] = React.useState(false);

  const { data: properties } = useProperties({ limit: 100 });
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense(createdExpenseId ?? '');
  const submitExpense = useSubmitExpense(createdExpenseId ?? '');

  async function handleCreate() {
    setError(null);
    if (!propertyId || !label.trim() || !amount) {
      setError('Bien, libellé et montant sont requis.');
      return;
    }
    try {
      const expense = await createExpense.mutateAsync({
        propertyId,
        category,
        label: label.trim(),
        amount,
        expenseDate,
        borneBy,
        isRebillable,
        isDeductibleFromRent: !isRebillable,
      });
      setCreatedExpenseId(expense.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  async function handleSubmit() {
    setError(null);
    try {
      await submitExpense.mutateAsync();
      router.push('/app/gerance/depenses');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  if (createdExpenseId) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <PageHeader
          title="Justificatif de la dépense"
          description="Ajoutez la facture ou le reçu du fournisseur."
        />
        <Card>
          <CardContent className="space-y-4 pt-6">
            <DocumentUploader
              relatedEntityType="expense"
              relatedEntityId={createdExpenseId}
              kind="EXPENSE_INVOICE"
              onUploaded={(doc) => {
                setHasDocument(true);
                updateExpense.mutate({ invoiceDocumentId: doc.id });
              }}
            />
            {hasDocument ? (
              <p className="text-sm text-success">Justificatif ajouté.</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Le justificatif est recommandé mais optionnel pour soumettre la dépense.
              </p>
            )}
          </CardContent>
        </Card>
        {error ? (
          <p role="alert" aria-live="polite" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end">
          <Button type="button" onClick={handleSubmit} disabled={submitExpense.isPending}>
            {submitExpense.isPending ? 'Envoi…' : 'Soumettre la dépense'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Nouvelle dépense" description="Bien concerné, catégorie et montant." />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détails de la dépense</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expense-property">Bien</Label>
            <Select value={propertyId || undefined} onValueChange={setPropertyId}>
              <SelectTrigger id="expense-property">
                <SelectValue placeholder="Choisir un bien" />
              </SelectTrigger>
              <SelectContent>
                {(properties?.items ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expense-category">Catégorie</Label>
              <EnumSelect
                id="expense-category"
                value={category}
                onValueChange={setCategory}
                labels={EXPENSE_CATEGORY_LABELS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-date">Date</Label>
              <Input
                id="expense-date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-label">Libellé</Label>
            <Input id="expense-label" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expense-amount">Montant</Label>
              <MoneyInput id="expense-amount" value={amount} onValueChange={setAmount} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-borne-by">Porteur de la dépense</Label>
              <EnumSelect
                id="expense-borne-by"
                value={borneBy}
                onValueChange={setBorneBy}
                labels={EXPENSE_BEARER_LABELS}
              />
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={isRebillable} onChange={(e) => setIsRebillable(e.target.checked)} />
            <span>
              Refacturable au locataire
              <br />
              <span className="text-xs text-muted-foreground">
                Cette dépense partira en ligne de facture et ne figurera pas au relevé de gérance du
                bailleur.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>
      {error ? (
        <p role="alert" aria-live="polite" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="button" onClick={handleCreate} disabled={createExpense.isPending}>
          {createExpense.isPending ? 'Création…' : 'Continuer'}
        </Button>
      </div>
    </div>
  );
}
