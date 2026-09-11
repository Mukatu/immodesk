'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/business/empty-state';
import { PhoneDisplay } from '@/components/business/phone-display';
import { useCreateLeaseParty } from '@/lib/api/hooks/use-lease-parties';
import { useTenant, useTenants } from '@/lib/api/hooks/use-tenants';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { LEASE_PARTY_ROLE_LABELS } from '@/lib/enum-labels';
import type { LeaseParty } from '@/lib/api/types';

type AdditionalRole = 'CO_TENANT' | 'GUARANTOR' | 'OCCUPANT';

const ROLE_LABELS: Record<AdditionalRole, string> = {
  CO_TENANT: LEASE_PARTY_ROLE_LABELS.CO_TENANT,
  GUARANTOR: LEASE_PARTY_ROLE_LABELS.GUARANTOR,
  OCCUPANT: LEASE_PARTY_ROLE_LABELS.OCCUPANT,
};

export interface AddPartyDialogProps {
  leaseId: string;
  primaryTenantId: string;
  existingParties: LeaseParty[];
}

/** Ajout d'une partie (colocataire, occupant ou garant) à un bail existant. */
export function AddPartyDialog({ leaseId, primaryTenantId, existingParties }: AddPartyDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [role, setRole] = React.useState<AdditionalRole>('CO_TENANT');
  const [tenantSearchInput, setTenantSearchInput] = React.useState('');
  const [tenantSearch, setTenantSearch] = React.useState('');
  const [selectedTenantId, setSelectedTenantId] = React.useState('');
  const [selectedTenantName, setSelectedTenantName] = React.useState('');
  const [selectedGuarantorId, setSelectedGuarantorId] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setTenantSearch(tenantSearchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [tenantSearchInput]);

  const existingTenantIds = existingParties
    .map((p) => p.tenantId)
    .filter((id): id is string => Boolean(id))
    .concat(primaryTenantId);
  const existingGuarantorIds = existingParties
    .map((p) => p.guarantorId)
    .filter((id): id is string => Boolean(id));

  const { data: tenantResults, isLoading: searchingTenants } = useTenants({
    q: tenantSearch || undefined,
    limit: 20,
  });
  const { data: primaryTenant, isLoading: loadingGuarantors } = useTenant(
    role === 'GUARANTOR' ? primaryTenantId : null,
  );
  const availableGuarantors = (primaryTenant?.guarantors ?? []).filter(
    (g) => !existingGuarantorIds.includes(g.id),
  );

  const createParty = useCreateLeaseParty(leaseId);

  function resetAndClose() {
    setOpen(false);
    setRole('CO_TENANT');
    setSelectedTenantId('');
    setSelectedTenantName('');
    setSelectedGuarantorId('');
    setTenantSearchInput('');
    setTenantSearch('');
    setError(null);
  }

  async function handleConfirm() {
    setError(null);
    if (role === 'GUARANTOR') {
      if (!selectedGuarantorId) {
        setError('Sélectionnez un garant.');
        return;
      }
    } else if (!selectedTenantId) {
      setError('Sélectionnez un locataire.');
      return;
    }
    try {
      await createParty.mutateAsync(
        role === 'GUARANTOR'
          ? { role: 'GUARANTOR', guarantorId: selectedGuarantorId }
          : { role, tenantId: selectedTenantId },
      );
      toast.success('Partie ajoutée au bail.');
      resetAndClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  const tenantResultsList = (tenantResults?.items ?? []).filter(
    (t) => !existingTenantIds.includes(t.id),
  );

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : resetAndClose())}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Ajouter une partie
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une partie au bail</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="partyRole">Rôle</Label>
            <Select
              value={role}
              onValueChange={(value) => {
                setRole(value as AdditionalRole);
                setSelectedTenantId('');
                setSelectedTenantName('');
                setSelectedGuarantorId('');
              }}
            >
              <SelectTrigger id="partyRole">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_LABELS) as AdditionalRole[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {ROLE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {role === 'GUARANTOR' ? (
            loadingGuarantors ? (
              <p className="text-sm text-muted-foreground">Chargement des garants…</p>
            ) : availableGuarantors.length === 0 ? (
              <EmptyState
                title="Aucun garant disponible"
                description="Ajoutez un garant depuis la fiche du locataire principal."
              />
            ) : (
              <div className="space-y-2">
                <Label htmlFor="guarantorId">Garant</Label>
                <Select value={selectedGuarantorId} onValueChange={setSelectedGuarantorId}>
                  <SelectTrigger id="guarantorId">
                    <SelectValue placeholder="Sélectionnez un garant" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGuarantors.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          ) : selectedTenantId ? (
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <span className="text-sm font-medium">{selectedTenantName}</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedTenantId('');
                  setSelectedTenantName('');
                }}
                className="text-sm text-muted-foreground underline hover:text-foreground"
              >
                Changer
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="tenantSearch">Locataire</Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="tenantSearch"
                  type="search"
                  placeholder="Rechercher un nom ou un numéro"
                  value={tenantSearchInput}
                  onChange={(e) => setTenantSearchInput(e.target.value)}
                  className="pl-9"
                />
              </div>
              {tenantSearch ? (
                <div className="max-h-48 overflow-y-auto rounded-md border border-border">
                  {searchingTenants ? (
                    <p className="p-3 text-sm text-muted-foreground">Recherche…</p>
                  ) : tenantResultsList.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">Aucun locataire trouvé.</p>
                  ) : (
                    <ul>
                      {tenantResultsList.map((t) => (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTenantId(t.id);
                              setSelectedTenantName(t.displayName);
                            }}
                            className="flex w-full flex-col items-start gap-0.5 border-b border-border px-3 py-2 text-left last:border-0 hover:bg-muted"
                          >
                            <span className="text-sm font-medium">{t.displayName}</span>
                            <PhoneDisplay phone={t.primaryPhone} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={handleConfirm} disabled={createParty.isPending}>
            {createParty.isPending ? 'Ajout…' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
