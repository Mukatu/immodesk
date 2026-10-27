import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import { toCsvDocument } from '../../reporting/domain/csv';
import { sqlCellToCsv } from '../domain/sql-row-csv';
import { buildZip } from '../domain/zip-writer';
import {
  guarantorQueries,
  partyQueries,
  userQueries,
  type TableQuery,
} from '../domain/subject-export-queries';
import type { SubjectType } from '../domain/subject';
import { collectKnownAddresses } from './erasure-side-effects.service';

/**
 * Export d'une personne (contrat § « Export ») : « restreint aux lignes
 * concernant [le] tenant/landlord/guarantor/user désigné, et à celles qui le
 * citent — baux, factures, paiements, quittances, relances, messages, canaux
 * de contact, documents ». Liste EXPLICITE (contrairement à l'export
 * d'organisation, générique) : le filtre change de colonne selon la table, ce
 * qu'`information_schema` ne peut pas deviner. La liste elle-même est un
 * domaine pur (`domain/subject-export-queries.ts`) ; cette classe ne fait que
 * la lecture (existence, adresses connues) et l'exécution SQL.
 */
@Injectable()
export class SubjectExportService {
  async build(
    tx: TenantClient,
    organizationId: string,
    subjectType: SubjectType,
    subjectId: string,
  ): Promise<{ zip: Buffer; rowCount: number; tableCount: number }> {
    const queries = await this.queriesFor(tx, organizationId, subjectType, subjectId);
    const entries: { fileName: string; content: Buffer }[] = [];
    const manifestTables: { table: string; rows: number }[] = [];
    let rowCount = 0;

    for (const q of queries) {
      const rows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(q.sql, ...q.params);
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
      const csv = toCsvDocument(
        columns,
        rows.map((row) => columns.map((c) => sqlCellToCsv(row[c]))),
      );
      entries.push({ fileName: `${q.table}.csv`, content: Buffer.from(csv, 'utf8') });
      manifestTables.push({ table: q.table, rows: rows.length });
      rowCount += rows.length;
    }

    const manifest = {
      generatedAt: new Date().toISOString(),
      organizationId,
      subjectType,
      subjectId,
      tables: manifestTables,
    };
    entries.unshift({
      fileName: 'manifest.json',
      content: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'),
    });
    return { zip: buildZip(entries), rowCount, tableCount: queries.length };
  }

  private async queriesFor(
    tx: TenantClient,
    organizationId: string,
    subjectType: SubjectType,
    subjectId: string,
  ): Promise<TableQuery[]> {
    if (subjectType === 'user') {
      await this.assertExists(tx, 'users', subjectType, subjectId);
      return userQueries(organizationId, subjectId);
    }
    if (subjectType === 'guarantor') {
      await this.assertExists(tx, 'guarantors', subjectType, subjectId);
      return guarantorQueries(subjectId);
    }

    const table = subjectType === 'tenant' ? 'tenants' : 'landlords';
    await this.assertExists(tx, table, subjectType, subjectId);
    const extra = subjectType === 'tenant' ? ', whatsapp_phone' : '';
    const partyRow = await tx.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT primary_phone, secondary_phone, email${extra} FROM ${table} WHERE id = $1::uuid`,
      subjectId,
    );
    const addresses = collectKnownAddresses(partyRow[0] ?? {});
    return partyQueries(subjectType, table, subjectId, addresses);
  }

  private async assertExists(
    tx: TenantClient,
    table: string,
    subjectType: SubjectType,
    subjectId: string,
  ): Promise<void> {
    const rows = await tx.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM ${table} WHERE id = $1::uuid`,
      subjectId,
    );
    if (rows.length === 0)
      throw new DomainError('PRIVACY.SUBJECT_NOT_FOUND', { subjectType, subjectId });
  }
}
