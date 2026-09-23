import { Injectable } from '@nestjs/common';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import { toCsvDocument } from '../../reporting/domain/csv';
import { sqlCellToCsv } from '../domain/sql-row-csv';
import { buildZip } from '../domain/zip-writer';

interface ColumnRow {
  table_name: string;
  column_name: string;
}

interface ManifestTable {
  table: string;
  columns: string[];
  rows: number;
}

/**
 * Export de réversibilité d'une organisation (contrat § « Export ») :
 * « tout ce que porte son `organization_id` ». Plutôt que d'énumérer à la
 * main la soixantaine de tables du schéma — au risque d'en oublier une à
 * chaque phase future —, la liste est lue dans `information_schema` : toute
 * table portant une colonne `organization_id` y est incluse automatiquement.
 */
@Injectable()
export class OrgExportService {
  /** Rend l'archive ZIP (CSV par table + `manifest.json`) et le nombre de lignes total. */
  async build(
    tx: TenantClient,
    organizationId: string,
  ): Promise<{ zip: Buffer; rowCount: number; tableCount: number }> {
    const tables = await this.listOrganizationScopedTables(tx);
    const entries: { fileName: string; content: Buffer }[] = [];
    const manifestTables: ManifestTable[] = [];
    let rowCount = 0;

    for (const table of tables) {
      const columns = await this.columnsOf(tx, table);
      const rows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT ${columns.map((c) => `"${c}"`).join(', ')} FROM "${table}" WHERE organization_id = $1::uuid`,
        organizationId,
      );
      const csv = toCsvDocument(
        columns,
        rows.map((row) => columns.map((c) => sqlCellToCsv(row[c]))),
      );
      entries.push({ fileName: `${table}.csv`, content: Buffer.from(csv, 'utf8') });
      manifestTables.push({ table, columns, rows: rows.length });
      rowCount += rows.length;
    }

    const manifest = {
      generatedAt: new Date().toISOString(),
      organizationId,
      format: 'CSV UTF-8 avec BOM, séparateur point-virgule (contrat phase 9/11)',
      tables: manifestTables,
    };
    entries.unshift({
      fileName: 'manifest.json',
      content: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'),
    });

    return { zip: buildZip(entries), rowCount, tableCount: tables.length };
  }

  private async listOrganizationScopedTables(tx: TenantClient): Promise<string[]> {
    const rows = await tx.$queryRawUnsafe<ColumnRow[]>(
      `SELECT table_name, column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name = 'organization_id'
        ORDER BY table_name`,
    );
    return rows.map((r) => r.table_name);
  }

  private async columnsOf(tx: TenantClient, table: string): Promise<string[]> {
    const rows = await tx.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position`,
      table,
    );
    return rows.map((r) => r.column_name);
  }
}
