'use client';

import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';

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
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
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
