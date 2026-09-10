'use client';

import { Building2, Check, ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth/auth-context';

/** Sélecteur d'organisation dans l'en-tête, pour les utilisateurs multi-organisations. Persisté. */
export function OrgSwitcher() {
  const { organizations, currentOrganizationId, setCurrentOrganization } = useAuth();

  if (organizations.length === 0) {
    return null;
  }

  const current = organizations.find((m) => m.organization.id === currentOrganizationId);

  if (organizations.length === 1) {
    return (
      <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium">
        <Building2 className="size-4 text-primary" aria-hidden="true" />
        {current?.organization.legalName ?? organizations[0]?.organization.legalName}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="justify-between gap-2"
          aria-label="Changer d’organisation"
        >
          <span className="flex items-center gap-2 truncate">
            <Building2 className="size-4 text-primary" aria-hidden="true" />
            <span className="truncate">
              {current?.organization.legalName ?? 'Choisir une organisation'}
            </span>
          </span>
          <ChevronsUpDown className="size-4 opacity-50" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Organisations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((membership) => (
          <DropdownMenuItem
            key={membership.organization.id}
            onSelect={() => setCurrentOrganization(membership.organization.id)}
            className="flex items-center justify-between gap-2"
          >
            <span className="truncate">{membership.organization.legalName}</span>
            {membership.organization.id === currentOrganizationId ? (
              <Check className="size-4 text-primary" aria-hidden="true" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
