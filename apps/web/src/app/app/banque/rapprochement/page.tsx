'use client';

import * as React from 'react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/business/data-table';
import { PageHeader } from '@/components/business/page-header';
import { EmptyState } from '@/components/business/empty-state';
import { LineStateBadge } from '@/components/business/line-state-badge';
import { SuggestionCard } from '@/components/business/suggestion-card';
import { MoneyXaf } from '@/components/business/money-xaf';
import { useBankAccounts } from '@/lib/api/hooks/use-bank-accounts';
import {
  useStatementLinesQueue,
  useStatementLineSuggestions,
} from '@/lib/api/hooks/use-bank-statement-lines';
import {
  useConfirmReconciliationMatch,
  useCreateReconciliationMatch,
  useRejectReconciliationMatch,
  useReverseReconciliationMatch,
} from '@/lib/api/hooks/use-reconciliation-matches';
import { usePayments } from '@/lib/api/hooks/use-payments';
import { useBankTransferDeclarations } from '@/lib/api/hooks/use-bank-transfer-declarations';
import { useBankChecks } from '@/lib/api/hooks/use-bank-checks';
import { useCashRemittances } from '@/lib/api/hooks/use-cash-remittances';
import { useTenants } from '@/lib/api/hooks/use-tenants';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import {
  CHECK_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  RECONCILIATION_TARGET_TYPE_LABELS,
  REMITTANCE_STATUS_LABELS,
  TRANSFER_DECLARATION_STATUS_LABELS,
  enumOptions,
} from '@/lib/enum-labels';
import type {
  MatchSuggestion,
  ReconciliationMatch,
  ReconciliationTargetType,
  StatementLine,
} from '@/lib/api/types';

const PAGE_SIZE = 20;

const AGE_FILTERS: { value: string; label: string; olderThanDays?: number }[] = [
  { value: 'ALL', label: 'Toutes' },
  { value: '7', label: 'Plus de 7 jours', olderThanDays: 7 },
  { value: '15', label: 'Plus de 15 jours', olderThanDays: 15 },
  { value: '30', label: 'Plus de 30 jours', olderThanDays: 30 },
];

function formatDateFr(iso: string): string {
  const date = new Date(iso);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/** "35 jours — non rapprochée depuis plus d'un mois" au-delà de 30 jours, sinon "{n} jours". */
function ageLabel(days: number): string {
  if (days > 30) return `${days} jours — non rapprochée depuis plus d'un mois`;
  return `${days} jours`;
}

/** Retrouve le `ReconciliationMatch` PROPOSED correspondant à une suggestion, pour confirmer/rejeter. */
function findProposedMatch(
  line: StatementLine,
  suggestion: MatchSuggestion,
): ReconciliationMatch | undefined {
  return line.matches.find(
    (m) =>
      m.status === 'PROPOSED' &&
      m.targetType === suggestion.targetType &&
      m.targetId === suggestion.targetId,
  );
}

interface TargetResultRow {
  id: string;
  label: string;
  amount: number;
  date: string;
  statusLabel: string;
}

interface ReconciliationTreatmentPanelProps {
  line: StatementLine;
}

/** Panneau de traitement d'une ligne sélectionnée : suggestions, annulation, recherche manuelle. */
function ReconciliationTreatmentPanel({ line }: ReconciliationTreatmentPanelProps) {
  const suggestionsQuery = useStatementLineSuggestions(line.id);
  const confirmMatch = useConfirmReconciliationMatch();
  const rejectMatch = useRejectReconciliationMatch();
  const reverseMatch = useReverseReconciliationMatch();
  const createMatch = useCreateReconciliationMatch();

  const [confirmingMatchId, setConfirmingMatchId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const [rejectingMatchId, setRejectingMatchId] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState('');
  const [rejectError, setRejectError] = React.useState<string | null>(null);

  const [reverseOpen, setReverseOpen] = React.useState(false);
  const [reverseReason, setReverseReason] = React.useState('');
  const [reverseError, setReverseError] = React.useState<string | null>(null);

  const [targetType, setTargetType] = React.useState<ReconciliationTargetType | ''>('');
  const [tenantQuery, setTenantQuery] = React.useState('');
  const [tenantId, setTenantId] = React.useState<string | null>(null);
  const [tenantLabel, setTenantLabel] = React.useState('');
  const [selectedTarget, setSelectedTarget] = React.useState<TargetResultRow | null>(null);
  const [manualError, setManualError] = React.useState<string | null>(null);

  const tenantsQuery = useTenants({ q: tenantQuery || undefined, limit: 8 });
  const paymentsQuery = usePayments({ tenantId: tenantId ?? undefined, limit: 20 });
  const declarationsQuery = useBankTransferDeclarations({ limit: 50 });
  const checksQuery = useBankChecks({
    tenantId: tenantId ?? undefined,
    status: 'DEPOSITED',
    limit: 20,
  });
  const remittancesQuery = useCashRemittances({ limit: 50 });

  const activeConfirmedMatch = line.matches.find((m) => m.status === 'CONFIRMED');

  async function handleConfirm(matchId: string) {
    setConfirmingMatchId(matchId);
    setActionError(null);
    try {
      await confirmMatch.mutateAsync(matchId);
      toast.success('Rapprochement confirmé.');
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : genericErrorMessage);
    } finally {
      setConfirmingMatchId(null);
    }
  }

  function handleRejectRequest(matchId: string) {
    setRejectingMatchId(matchId);
    setRejectReason('');
    setRejectError(null);
  }

  async function handleRejectConfirm() {
    if (!rejectingMatchId) return;
    if (!rejectReason.trim()) {
      setRejectError('Le motif est requis.');
      return;
    }
    setRejectError(null);
    try {
      await rejectMatch.mutateAsync({
        id: rejectingMatchId,
        body: { reason: rejectReason.trim() },
      });
      toast.success('Suggestion rejetée.');
      setRejectingMatchId(null);
    } catch (err) {
      setRejectError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  async function handleReverseConfirm() {
    if (!activeConfirmedMatch) return;
    if (!reverseReason.trim()) {
      setReverseError('Le motif est requis.');
      return;
    }
    setReverseError(null);
    try {
      await reverseMatch.mutateAsync({
        id: activeConfirmedMatch.id,
        body: { reason: reverseReason.trim() },
      });
      toast.success('Rapprochement annulé.');
      setReverseOpen(false);
    } catch (err) {
      setReverseError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  async function handleManualMatch() {
    if (!targetType || !selectedTarget) return;
    setManualError(null);
    try {
      await createMatch.mutateAsync({
        statementLineId: line.id,
        targetType,
        targetId: selectedTarget.id,
        matchedAmount: line.amount,
      });
      toast.success('Rapprochement manuel enregistré.');
      setTargetType('');
      setTenantId(null);
      setTenantLabel('');
      setTenantQuery('');
      setSelectedTarget(null);
    } catch (err) {
      setManualError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  function handleTargetTypeChange(next: ReconciliationTargetType) {
    setTargetType(next);
    setTenantId(null);
    setTenantLabel('');
    setTenantQuery('');
    setSelectedTarget(null);
    setManualError(null);
  }

  let results: TargetResultRow[] = [];
  if (targetType === 'PAYMENT' && tenantId) {
    results = (paymentsQuery.data?.items ?? []).map((p) => ({
      id: p.id,
      label: p.reference,
      amount: p.amount,
      date: p.paymentDate,
      statusLabel: PAYMENT_STATUS_LABELS[p.status],
    }));
  } else if (targetType === 'DECLARATION' && tenantId) {
    results = (declarationsQuery.data?.items ?? [])
      .filter((d) => d.tenant?.id === tenantId)
      .map((d) => ({
        id: d.id,
        label: d.transferReference ?? d.payerName,
        amount: d.declaredAmount,
        date: d.transferDate,
        statusLabel: TRANSFER_DECLARATION_STATUS_LABELS[d.status],
      }));
  } else if (targetType === 'CHECK' && tenantId) {
    results = (checksQuery.data?.items ?? []).map((c) => ({
      id: c.id,
      label: c.checkNumber,
      amount: c.amount,
      date: c.issueDate,
      statusLabel: CHECK_STATUS_LABELS[c.status],
    }));
  } else if (targetType === 'REMITTANCE') {
    results = (remittancesQuery.data?.items ?? []).map((r) => ({
      id: r.id,
      label: r.reference,
      amount: r.declaredAmount,
      date: r.openedAt,
      statusLabel: REMITTANCE_STATUS_LABELS[r.status],
    }));
  }

  const needsTenantSearch =
    targetType === 'PAYMENT' || targetType === 'DECLARATION' || targetType === 'CHECK';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Suggestions de rapprochement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {actionError ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {actionError}
            </p>
          ) : null}
          {suggestionsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement des suggestions…</p>
          ) : (suggestionsQuery.data?.items.length ?? 0) === 0 ? (
            <EmptyState
              title="Aucune suggestion"
              description="Aucune correspondance automatique n'a été trouvée pour cette ligne."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {suggestionsQuery.data!.items.map((suggestion, index) => {
                const match = findProposedMatch(line, suggestion);
                return (
                  <SuggestionCard
                    key={`${suggestion.targetType}-${suggestion.targetId}-${index}`}
                    suggestion={suggestion}
                    onConfirm={match ? () => handleConfirm(match.id) : undefined}
                    onReject={match ? () => handleRejectRequest(match.id) : undefined}
                    isConfirming={Boolean(match) && confirmingMatchId === match?.id}
                    isRejecting={Boolean(match) && rejectingMatchId === match?.id}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {activeConfirmedMatch && line.state === 'MATCHED' ? (
        <Card>
          <CardHeader>
            <CardTitle>Rapprochement confirmé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Cette ligne est rapprochée. Vous pouvez annuler ce rapprochement si nécessaire.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReverseOpen(true);
                setReverseReason('');
                setReverseError(null);
              }}
            >
              Annuler ce rapprochement
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Recherche manuelle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manual-target-type">Type de cible</Label>
            <Select
              value={targetType || undefined}
              onValueChange={(v) => handleTargetTypeChange(v as ReconciliationTargetType)}
            >
              <SelectTrigger id="manual-target-type" className="sm:w-72">
                <SelectValue placeholder="Choisir un type" />
              </SelectTrigger>
              <SelectContent>
                {enumOptions(RECONCILIATION_TARGET_TYPE_LABELS).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {targetType && needsTenantSearch ? (
            <div className="space-y-2">
              <Label htmlFor="manual-tenant-search">Locataire</Label>
              {tenantId ? (
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="font-medium">{tenantLabel}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTenantId(null);
                      setTenantLabel('');
                      setSelectedTarget(null);
                    }}
                  >
                    Changer
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    id="manual-tenant-search"
                    placeholder="Rechercher un locataire…"
                    value={tenantQuery}
                    onChange={(e) => setTenantQuery(e.target.value)}
                  />
                  {tenantQuery && (tenantsQuery.data?.items.length ?? 0) > 0 ? (
                    <ul className="divide-y divide-border rounded-md border border-border">
                      {tenantsQuery.data?.items.map((tenant) => (
                        <li key={tenant.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              setTenantId(tenant.id);
                              setTenantLabel(tenant.displayName);
                              setTenantQuery('');
                            }}
                          >
                            {tenant.displayName}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          {targetType && (!needsTenantSearch || tenantId) ? (
            results.length === 0 ? (
              <EmptyState
                title="Aucun résultat"
                description="Aucune correspondance possible trouvée pour ces critères."
              />
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {results.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <div className="space-y-0.5">
                      <p className="font-medium">{r.label}</p>
                      <p className="text-muted-foreground">
                        <MoneyXaf amount={r.amount} /> — {formatDateFr(r.date)} — {r.statusLabel}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={selectedTarget?.id === r.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedTarget(r)}
                    >
                      Choisir
                    </Button>
                  </li>
                ))}
              </ul>
            )
          ) : null}

          {selectedTarget ? (
            <div className="rounded-md border border-border bg-muted/50 p-3 text-sm">
              <p>
                Cible choisie : <span className="font-medium">{selectedTarget.label}</span>
              </p>
              <p className="text-muted-foreground">
                Montant rapproché : <MoneyXaf amount={line.amount} /> (montant de la ligne)
              </p>
            </div>
          ) : null}

          {manualError ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {manualError}
            </p>
          ) : null}

          <Button
            type="button"
            onClick={handleManualMatch}
            disabled={!selectedTarget || createMatch.isPending}
          >
            {createMatch.isPending ? 'Rapprochement…' : 'Rapprocher manuellement'}
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(rejectingMatchId)}
        onOpenChange={(next) => {
          if (!next) {
            setRejectingMatchId(null);
            setRejectReason('');
            setRejectError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter cette suggestion</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Motif du rejet</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          {rejectError ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {rejectError}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectMatch.isPending}
            >
              {rejectMatch.isPending ? 'Rejet…' : 'Confirmer le rejet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reverseOpen}
        onOpenChange={(next) => {
          setReverseOpen(next);
          if (!next) {
            setReverseReason('');
            setReverseError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler ce rapprochement</DialogTitle>
          </DialogHeader>
          <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Cette annulation rouvrira la facture réglée par ce rapprochement si un paiement avait
            été confirmé.
          </p>
          <div className="space-y-2">
            <Label htmlFor="reverse-reason">Motif de l&apos;annulation</Label>
            <Textarea
              id="reverse-reason"
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
            />
          </div>
          {reverseError ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {reverseError}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              onClick={handleReverseConfirm}
              disabled={reverseMatch.isPending}
            >
              {reverseMatch.isPending ? 'Annulation…' : "Confirmer l'annulation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RapprochementBancairePage() {
  const [bankAccountId, setBankAccountId] = React.useState<string>('');
  const [ageFilter, setAgeFilter] = React.useState<string>('ALL');
  const [minAmountInput, setMinAmountInput] = React.useState('');
  const [maxAmountInput, setMaxAmountInput] = React.useState('');
  const [selectedLineId, setSelectedLineId] = React.useState<string | null>(null);

  const accounts = useBankAccounts();

  const olderThanDays = AGE_FILTERS.find((f) => f.value === ageFilter)?.olderThanDays;
  const minAmountValue = minAmountInput ? Number(minAmountInput) : undefined;
  const maxAmountValue = maxAmountInput ? Number(maxAmountInput) : undefined;

  const queue = useStatementLinesQueue({
    bankAccountId: bankAccountId || undefined,
    olderThanDays,
    minAmount: Number.isFinite(minAmountValue) ? minAmountValue : undefined,
    maxAmount: Number.isFinite(maxAmountValue) ? maxAmountValue : undefined,
    limit: PAGE_SIZE,
  });

  const selectedLine = queue.data?.items.find((item) => item.id === selectedLineId) ?? null;

  const columns = React.useMemo<ColumnDef<StatementLine>[]>(
    () => [
      {
        header: "Date d'opération",
        cell: ({ row }) => formatDateFr(row.original.operationDate),
      },
      { header: 'Libellé', cell: ({ row }) => row.original.label },
      { header: 'Montant', cell: ({ row }) => <MoneyXaf amount={row.original.amount} /> },
      { header: 'État', cell: ({ row }) => <LineStateBadge state={row.original.state} /> },
      { header: 'Ancienneté', cell: ({ row }) => ageLabel(row.original.ageDays) },
      {
        header: '',
        id: 'actions',
        cell: ({ row }) => (
          <Button
            type="button"
            size="sm"
            variant={selectedLineId === row.original.id ? 'default' : 'outline'}
            onClick={() => setSelectedLineId(row.original.id)}
          >
            Traiter
          </Button>
        ),
      },
    ],
    [selectedLineId],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapprochement bancaire"
        description="Rapprochez les lignes de relevé avec les paiements, déclarations, chèques et remises de caisse."
      />

      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="filter-account">Compte bancaire</Label>
            <Select value={bankAccountId || undefined} onValueChange={setBankAccountId}>
              <SelectTrigger id="filter-account">
                <SelectValue placeholder="Tous les comptes" />
              </SelectTrigger>
              <SelectContent>
                {(accounts.data?.items ?? []).map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-age">Ancienneté</Label>
            <Select value={ageFilter} onValueChange={setAgeFilter}>
              <SelectTrigger id="filter-age">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGE_FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-min">Montant minimum</Label>
            <Input
              id="filter-min"
              type="number"
              value={minAmountInput}
              onChange={(e) => setMinAmountInput(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-max">Montant maximum</Label>
            <Input
              id="filter-max"
              type="number"
              value={maxAmountInput}
              onChange={(e) => setMaxAmountInput(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={queue.data?.items ?? []}
        isLoading={queue.isLoading}
        emptyTitle="Aucune ligne à traiter"
        emptyDescription="Toutes les lignes correspondant aux filtres sont rapprochées."
        getRowClassName={(row) => (row.ageDays > 30 ? 'bg-warning/10' : undefined)}
      />

      {selectedLine ? (
        <ReconciliationTreatmentPanel key={selectedLine.id} line={selectedLine} />
      ) : null}
    </div>
  );
}
