import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoneyXaf } from '@/components/business/money-xaf';
import { TARIFF_BASIS_LABELS } from '@/lib/enum-labels';
import type { TariffBasis, UtilityTariff } from '@/lib/api/types';
import { formatValidityPeriod } from './format-date-fr';

/** Bases forfaitaires : le montant pertinent est `flatAmount`, pas `unitPriceAmount`. */
const FLAT_BASES: TariffBasis[] = ['FLAT_MONTHLY', 'PER_OCCUPANT'];

/** Le "prix unitaire" affiché dépend de la base : forfait pour les bases forfaitaires. */
export function tariffPrimaryAmount(
  tariff: Pick<UtilityTariff, 'basis' | 'unitPriceAmount' | 'flatAmount'>,
): { label: string; amount: number } {
  const basis = tariff.basis ?? 'PER_UNIT_CONSUMED';
  if (FLAT_BASES.includes(basis)) {
    return { label: 'Forfait', amount: tariff.flatAmount ?? 0 };
  }
  return { label: 'Prix unitaire', amount: tariff.unitPriceAmount ?? 0 };
}

export interface TariffRowProps {
  tariff: UtilityTariff;
  /** Réservé au rôle OWNER : sans droit, la ligne est en lecture seule, sans action. */
  isOwner: boolean;
  onEdit?: () => void;
  onToggleActive?: () => void;
  isTogglingActive?: boolean;
}

/** Une ligne de grille tarifaire : base, montant principal, abonnement, minimum, validité. */
export function TariffRow({
  tariff,
  isOwner,
  onEdit,
  onToggleActive,
  isTogglingActive = false,
}: TariffRowProps) {
  const basis = tariff.basis ?? 'PER_UNIT_CONSUMED';
  const primary = tariffPrimaryAmount(tariff);

  return (
    <div
      role="row"
      className="flex flex-wrap items-center gap-4 rounded-md border border-border p-3"
    >
      <div role="cell" className="min-w-[10rem] flex-1 space-y-0.5">
        <p className="font-medium">{tariff.label}</p>
        <p className="text-xs text-muted-foreground">{TARIFF_BASIS_LABELS[basis]}</p>
      </div>

      <div role="cell" className="w-28 text-right">
        <p className="text-xs text-muted-foreground">{primary.label}</p>
        <MoneyXaf amount={primary.amount} />
      </div>

      <div role="cell" className="w-28 text-right">
        <p className="text-xs text-muted-foreground">Abonnement fixe</p>
        <MoneyXaf amount={tariff.standingChargeAmount ?? 0} />
      </div>

      <div role="cell" className="w-28 text-right">
        <p className="text-xs text-muted-foreground">Minimum de facturation</p>
        <MoneyXaf amount={tariff.minimumAmount ?? 0} />
      </div>

      <div role="cell" className="w-48 text-sm">
        <p className="text-xs text-muted-foreground">Période de validité</p>
        {formatValidityPeriod(tariff.effectiveFrom, tariff.effectiveTo)}
      </div>

      <div role="cell">
        <Badge variant={tariff.isActive ? 'success' : 'outline'}>
          {tariff.isActive ? 'Actif' : 'Inactif'}
        </Badge>
      </div>

      {isOwner ? (
        <div role="cell" className="ml-auto flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            Modifier
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggleActive}
            disabled={isTogglingActive}
          >
            {tariff.isActive ? 'Désactiver' : 'Activer'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
