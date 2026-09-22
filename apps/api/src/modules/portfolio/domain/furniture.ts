import { DomainError } from '../../../shared/errors/domain-error';

/**
 * Meubles reconnus pour l'inventaire `furniture` d'un bien (DDL,
 * docs/schema/schema.sql, partie 03b). La liste est fermée côté
 * application : `furniture` est un JSONB sans contrainte de forme en
 * base, un code hors liste est donc presque toujours une faute de saisie
 * plutôt qu'un meuble réel, d'où le rejet strict.
 */
export const FURNITURE_ITEMS = [
  'BED',
  'MATTRESS',
  'WARDROBE',
  'TABLE',
  'CHAIRS',
  'SOFA',
  'FRIDGE',
  'STOVE',
  'AIR_CONDITIONER',
  'FAN',
  'TELEVISION',
  'WASHING_MACHINE',
  'WATER_HEATER',
  'MICROWAVE',
  'CURTAINS',
  'KITCHEN_UTENSILS',
] as const;
export type FurnitureItemCode = (typeof FURNITURE_ITEMS)[number];

export interface FurnitureItemInput {
  item: string;
  quantity?: number;
}

const FURNITURE_ITEM_SET: ReadonlySet<string> = new Set(FURNITURE_ITEMS);

/**
 * Normalise l'inventaire `furniture` d'un bien selon la règle métier :
 * un bien non meublé n'a jamais de mobilier déclaré.
 *
 * `isFurnished` faux vide silencieusement la liste, y compris si
 * l'appelant en a fourni une — un client qui bascule `isFurnished` à
 * `false` sans avoir vidé son formulaire de mobilier ne doit pas être
 * bloqué, juste corrigé.
 *
 * `isFurnished` vrai valide chaque entrée : le code doit appartenir à
 * `FURNITURE_ITEMS`, et `quantity`, si fournie, doit être un entier d'au
 * moins 1.
 */
export function normalizeFurniture(
  isFurnished: boolean,
  items: FurnitureItemInput[] | undefined,
): FurnitureItemInput[] {
  if (!isFurnished) return [];
  if (!Array.isArray(items)) {
    throw new DomainError('PORTFOLIO.FURNITURE_ITEM_INVALID', { furniture: items });
  }

  return items.map((entry) => {
    const item = entry?.item;
    if (typeof item !== 'string' || !FURNITURE_ITEM_SET.has(item)) {
      throw new DomainError('PORTFOLIO.FURNITURE_ITEM_INVALID', { item });
    }
    if (entry.quantity === undefined) {
      return { item: item as FurnitureItemCode };
    }
    const quantity = entry.quantity;
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new DomainError('PORTFOLIO.FURNITURE_ITEM_INVALID', { item, quantity });
    }
    return { item: item as FurnitureItemCode, quantity };
  });
}
