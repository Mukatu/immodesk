'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/business/page-header';
import { EnumSelect } from '@/components/business/enum-select';
import { useLeases } from '@/lib/api/hooks/use-leases';
import { useCreateInvoice } from '@/lib/api/hooks/use-invoices';
import { INVOICE_LINE_TYPE_LABELS } from '@/lib/enum-labels';
import type { InvoiceLineInput, InvoiceLineType } from '@/lib/api/types';

interface DraftLine extends InvoiceLineInput {
  key: string;
}

function emptyLine(): DraftLine {
  return { key: crypto.randomUUID(), lineType: 'RENT', label: '', unitPriceAmount: 0 };
}

export default function NouvelleFacturePage() {
  const router = useRouter();
  const [leaseId, setLeaseId] = React.useState('');
  const [periodStart, setPeriodStart] = React.useState('');
  const [periodEnd, setPeriodEnd] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [issueNow, setIssueNow] = React.useState(false);
  const [lines, setLines] = React.useState<DraftLine[]>([emptyLine()]);
  const [error, setError] = React.useState<string | null>(null);

  const { data: leasesData } = useLeases({ status: 'ACTIVE', limit: 100 });
  const createInvoice = useCreateInvoice();

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((line) => line.key !== key) : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!leaseId || !periodStart || !periodEnd) {
      setError('Bail, début et fin de période sont requis.');
      return;
    }
    if (lines.some((line) => !line.label || line.unitPriceAmount <= 0)) {
      setError('Chaque ligne doit avoir un libellé et un montant positif.');
      return;
    }
    try {
      const invoice = await createInvoice.mutateAsync({
        leaseId,
        periodStart,
        periodEnd,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
        issue: issueNow,
        lines: lines.map(({ key: _key, ...rest }) => rest),
      });
      toast.success('Facture créée.');
      router.push(`/app/factures/${invoice.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de créer la facture.');
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader title="Nouvelle facture" description="Créez une facture manuelle pour un bail." />
      <Card>
        <CardContent className="space-y-6 pt-6">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="space-y-2">
              <Label htmlFor="leaseId">Bail</Label>
              <select
                id="leaseId"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={leaseId}
                onChange={(e) => setLeaseId(e.target.value)}
              >
                <option value="">Sélectionner un bail</option>
                {(leasesData?.items ?? []).map((lease) => (
                  <option key={lease.id} value={lease.id}>
                    {lease.tenant.displayName} — {lease.property.name} ({lease.unit.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="periodStart">Début de période</Label>
                <Input
                  id="periodStart"
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodEnd">Fin de période</Label>
                <Input
                  id="periodEnd"
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Échéance</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Lignes</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setLines((prev) => [...prev, emptyLine()])}
                >
                  <Plus className="mr-1 size-4" aria-hidden="true" />
                  Ajouter une ligne
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.key}>
                      <TableCell>
                        <EnumSelect<InvoiceLineType>
                          value={line.lineType}
                          onValueChange={(v) => updateLine(line.key, { lineType: v })}
                          labels={INVOICE_LINE_TYPE_LABELS}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          aria-label="Libellé de la ligne"
                          value={line.label}
                          onChange={(e) => updateLine(line.key, { label: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          aria-label="Montant de la ligne"
                          type="number"
                          min={0}
                          value={line.unitPriceAmount}
                          onChange={(e) =>
                            updateLine(line.key, { unitPriceAmount: Number(e.target.value) })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Retirer la ligne"
                          onClick={() => removeLine(line.key)}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={issueNow} onChange={(e) => setIssueNow(e.target.checked)} />
              Émettre immédiatement
            </label>

            {error ? (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Annuler
              </Button>
              <Button type="submit" disabled={createInvoice.isPending}>
                {createInvoice.isPending ? 'Création…' : 'Créer la facture'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
