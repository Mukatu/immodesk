'use client';

import * as React from 'react';
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { ChevronRight } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/business/empty-state';
import { cn } from '@/lib/utils';

/** Éléments interactifs déjà présents dans une cellule (lien de la référence, badge cliquable…) :
 * un clic ou une touche sur l'un d'eux ne doit pas aussi ouvrir le panneau contextuel. */
const INTERACTIVE_SELECTOR = 'a, button, [role="button"], input, select, textarea';

export interface CursorPageInfo {
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Pagination par curseur (contrat API : ?limit&cursor → pageInfo.nextCursor/hasNextPage). */
  pageInfo?: CursorPageInfo;
  onNextPage?: () => void;
  onPreviousPage?: () => void;
  hasPreviousPage?: boolean;
  /** Classe CSS additionnelle par ligne (ex. mise en évidence d'une anomalie), jamais seule porteuse d'information. */
  getRowClassName?: (row: TData) => string | undefined;
  /**
   * Ouvre le panneau contextuel de droite (`useContextPanel`) pour la ligne cliquée, ou
   * activée au clavier via le bouton d'affordance en fin de ligne. Optionnel : sans cette
   * prop, les lignes restent telles quelles (aucun changement de comportement pour les
   * usages existants).
   * Les clics sur un élément interactif déjà présent dans la ligne (lien, bouton…) ne
   * déclenchent pas `onRowSelect` — leur propre action garde la priorité.
   *
   * Accessibilité : la ligne (`<tr>`) elle-même n'est pas rendue focusable et ne porte pas
   * de rôle interactif, car des cellules contiennent souvent déjà un élément natif
   * interactif (lien de référence…) — superposer un rôle « button » sur la ligne créerait
   * un contrôle interactif imbriqué dans un autre, mal annoncé par les lecteurs d'écran.
   * L'activation clavier passe donc par un vrai bouton natif, ajouté en fin de ligne
   * (colonne d'affordance), qui déclenche `onRowSelect` et porte un nom accessible
   * (`getRowLabel`). Le clic sur le reste de la ligne reste disponible à la souris.
   */
  onRowSelect?: (row: TData) => void;
  /**
   * Nom accessible du bouton d'activation de chaque ligne (ex. « Voir le détail du bail
   * BAIL-2024-005 »). Recommandé dès que `onRowSelect` est fourni ; à défaut, un intitulé
   * générique est utilisé.
   */
  getRowLabel?: (row: TData) => string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  emptyTitle = 'Aucun résultat',
  emptyDescription,
  pageInfo,
  onNextPage,
  onPreviousPage,
  hasPreviousPage = false,
  getRowClassName,
  onRowSelect,
  getRowLabel,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
                {/* Colonne d'affordance : indique que la ligne ouvre le panneau contextuel. */}
                {onRowSelect ? <TableHead className="w-8" aria-hidden="true" /> : null}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(
                  getRowClassName?.(row.original),
                  onRowSelect && 'group cursor-pointer',
                )}
                onClick={
                  onRowSelect
                    ? (event) => {
                        const target = event.target as HTMLElement;
                        if (target.closest(INTERACTIVE_SELECTOR)) return;
                        onRowSelect(row.original);
                      }
                    : undefined
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
                {onRowSelect ? (
                  <TableCell className="w-8 pl-0">
                    {/* Vrai bouton natif : c'est lui, et non la ligne, qui porte le rôle et
                        le nom accessibles de l'action « voir le détail ». Il est atteint au
                        clavier par la tabulation normale, sans imbriquer un rôle interactif
                        dans un autre (cf. lien de référence déjà présent dans la ligne). */}
                    <button
                      type="button"
                      onClick={() => onRowSelect(row.original)}
                      aria-label={getRowLabel?.(row.original) ?? 'Voir le détail de cette ligne'}
                      className="flex size-8 items-center justify-center rounded-sm text-muted-foreground/0 transition-colors duration-[130ms] group-hover:text-muted-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ChevronRight aria-hidden="true" className="size-4" />
                    </button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {(onNextPage || onPreviousPage) && (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPreviousPage}
            disabled={!hasPreviousPage || !onPreviousPage}
          >
            Précédent
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onNextPage}
            disabled={!pageInfo?.hasNextPage || !onNextPage}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
}
