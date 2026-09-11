'use client';

import * as React from 'react';
import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { PhoneDisplay } from '@/components/business/phone-display';
import { useTenants } from '@/lib/api/hooks/use-tenants';
import type { Tenant } from '@/lib/api/types';

const SEARCH_DEBOUNCE_MS = 300;

export interface TenantPickerProps {
  onSelect: (tenant: Tenant) => void;
  excludeIds?: string[];
  placeholder?: string;
}

/**
 * Recherche + sélection d'un locataire existant. Ce n'est pas une énumération
 * fixe (EnumSelect ne convient pas) : on utilise un champ de recherche texte
 * relançant useTenants({ q }) et une liste de résultats cliquables.
 */
export function TenantPicker({ onSelect, excludeIds = [], placeholder }: TenantPickerProps) {
  const [searchInput, setSearchInput] = React.useState('');
  const [q, setQ] = React.useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => setQ(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = useTenants({ q: q || undefined, limit: 20 });
  const results = (data?.items ?? []).filter((tenant) => !excludeIds.includes(tenant.id));

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder={placeholder ?? 'Rechercher un locataire par nom ou numéro'}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>
      {q ? (
        <div className="max-h-56 overflow-y-auto rounded-md border border-border">
          {isLoading ? (
            <p className="p-3 text-sm text-muted-foreground">Recherche…</p>
          ) : results.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">Aucun locataire trouvé.</p>
          ) : (
            <ul>
              {results.map((tenant) => (
                <li key={tenant.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(tenant);
                      setSearchInput('');
                      setQ('');
                    }}
                    className="flex w-full flex-col items-start gap-0.5 border-b border-border px-3 py-2 text-left last:border-0 hover:bg-muted"
                  >
                    <span className="text-sm font-medium">{tenant.displayName}</span>
                    <PhoneDisplay phone={tenant.primaryPhone} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
