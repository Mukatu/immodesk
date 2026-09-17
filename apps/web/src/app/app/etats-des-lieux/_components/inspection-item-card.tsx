import { ConditionBadge } from '@/components/business/condition-badge';
import { MoneyXaf } from '@/components/business/money-xaf';
import { EXPENSE_BEARER_LABELS } from '@/lib/enum-labels';
import type { InspectionItem } from '@/lib/api/types';
import { PhotoThumbnail } from './photo-thumbnail';

export interface InspectionItemCardProps {
  item: InspectionItem;
  /** Actions propres au poste (retenue / conversion en maintenance), fournies par le parent. */
  actions?: React.ReactNode;
}

/**
 * Composant de présentation pur pour un poste d'état des lieux : élément,
 * état constaté, quantité, description de la dégradation, montant de
 * réparation, partie qui en supporte le coût, et photos rattachées. Aucun
 * hook de données ici (les actions du poste sont injectées par le parent) :
 * cela permet de le tester sans fournisseur TanStack Query ni MSW.
 */
export function InspectionItemCard({ item, actions }: InspectionItemCardProps) {
  const label = `${item.roomLabel} — ${item.elementLabel}`;

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-foreground">{item.elementLabel}</p>
        <ConditionBadge condition={item.condition} />
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        {typeof item.quantity === 'number' ? (
          <div className="contents">
            <dt className="font-medium text-muted-foreground">Quantité</dt>
            <dd className="text-foreground">{item.quantity}</dd>
          </div>
        ) : null}
        {item.damageDescription ? (
          <div className="contents">
            <dt className="font-medium text-muted-foreground">Dégradation</dt>
            <dd className="text-foreground">{item.damageDescription}</dd>
          </div>
        ) : null}
        {typeof item.repairAmount === 'number' ? (
          <div className="contents">
            <dt className="font-medium text-muted-foreground">Réparation estimée</dt>
            <dd className="text-foreground">
              <MoneyXaf amount={item.repairAmount} />
              {item.chargedTo ? ` — à la charge : ${EXPENSE_BEARER_LABELS[item.chargedTo]}` : ''}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Photos</p>
        {item.photos.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune photo.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {item.photos.map((photo) => (
              <PhotoThumbnail key={photo.id} documentId={photo.documentId} label={label} />
            ))}
          </div>
        )}
      </div>

      {actions ? <div className="flex flex-wrap items-center gap-2 pt-1">{actions}</div> : null}
    </div>
  );
}
