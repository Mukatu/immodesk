import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/business/empty-state';
import type { InspectionItem } from '@/lib/api/types';
import { InspectionItemCard } from './inspection-item-card';

export interface InspectionRoomGroup {
  roomLabel: string;
  items: InspectionItem[];
}

/**
 * Regroupe les postes d'un état des lieux par pièce, en conservant l'ordre
 * de première apparition (les postes arrivent déjà triés par `position`
 * depuis l'API — voir `itemsFor` du mock).
 */
export function groupInspectionItemsByRoom(items: InspectionItem[]): InspectionRoomGroup[] {
  const order: string[] = [];
  const byRoom = new Map<string, InspectionItem[]>();
  for (const item of items) {
    if (!byRoom.has(item.roomLabel)) {
      byRoom.set(item.roomLabel, []);
      order.push(item.roomLabel);
    }
    byRoom.get(item.roomLabel)?.push(item);
  }
  return order.map((roomLabel) => ({ roomLabel, items: byRoom.get(roomLabel) ?? [] }));
}

export interface InspectionItemsByRoomProps {
  items: InspectionItem[];
  /** Actions par poste (retenue / conversion en maintenance), fournies par le parent. */
  renderActions?: (item: InspectionItem) => React.ReactNode;
}

/** Composant de présentation pur : regroupe et affiche les postes par pièce. */
export function InspectionItemsByRoom({ items, renderActions }: InspectionItemsByRoomProps) {
  const groups = groupInspectionItemsByRoom(items);

  if (groups.length === 0) {
    return (
      <EmptyState
        title="Aucun poste"
        description="Aucun poste n'a encore été saisi pour cet état des lieux."
      />
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <Card key={group.roomLabel}>
          <CardHeader>
            <CardTitle className="text-base">{group.roomLabel}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {group.items.map((item) => (
              <InspectionItemCard key={item.id} item={item} actions={renderActions?.(item)} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
