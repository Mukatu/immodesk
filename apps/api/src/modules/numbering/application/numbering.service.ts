import { Injectable } from '@nestjs/common';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import {
  SEQUENCE_FORMATS,
  sequencePeriod,
  type SequenceFormat,
  type SequenceKind,
} from '../domain/sequence-kind';

/**
 * Numérotation séquentielle partagée : réservation atomique d'un compteur et
 * rendu du numéro lisible.
 *
 * POURQUOI LA FONCTION SQL, ET NON UN `SELECT ... FOR UPDATE` APPLICATIF —
 * `next_sequence()` est un `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`,
 * donc une seule instruction : PostgreSQL y pose lui-même le verrou de ligne
 * et le relâche au COMMIT. Cent transactions concurrentes obtiennent cent
 * numéros consécutifs, sans trou ni doublon. Une lecture puis une écriture
 * séparées, même sous SERIALIZABLE, coûteraient un aller-retour de plus et
 * exigeraient une boucle de reprise.
 *
 * La méthode prend le client TRANSACTIONNEL de l'appelant : le numéro est
 * réservé dans la même transaction que l'objet numéroté. Si celle-ci est
 * annulée, le compteur l'est aussi — c'est voulu. Un compteur qui avancerait
 * malgré un ROLLBACK créerait un trou dans la série, ce qu'un contrôle
 * fiscal ou un bailleur lit comme une pièce disparue.
 */
@Injectable()
export class NumberingService {
  /**
   * Réserve le numéro suivant et le rend formaté.
   *
   * `at` détermine la période de remise à zéro (année pour un bail, mois
   * pour une quittance). Par défaut : maintenant.
   */
  async nextNumber(
    tx: TenantClient,
    organizationId: string,
    kind: SequenceKind,
    at: Date = new Date(),
    overrides: Partial<SequenceFormat> = {},
  ): Promise<{ value: bigint; period: string; number: string }> {
    const format = { ...SEQUENCE_FORMATS[kind], ...overrides };
    return this.nextNumberFor(tx, organizationId, kind, format, at);
  }

  /**
   * Variante à clé libre : le compteur est identifié par `key` (TEXT en
   * base), ce qui permet une série PAR DÉMARCHEUR — `CASH_RECEIPT:{userId}`
   * — sans multiplier les natures déclarées.
   */
  async nextNumberFor(
    tx: TenantClient,
    organizationId: string,
    key: string,
    format: SequenceFormat,
    at: Date = new Date(),
  ): Promise<{ value: bigint; period: string; number: string }> {
    const kind = key;
    const period = sequencePeriod(format.scope, at);

    const rows = await tx.$queryRawUnsafe<Array<{ value: bigint; number: string }>>(
      `WITH reserved AS (
         SELECT next_sequence($1::uuid, $2::text, $3::text) AS value
       )
       SELECT reserved.value,
              format_sequence_number($4::text, $3::text, reserved.value, $5::smallint) AS number
         FROM reserved`,
      organizationId,
      kind,
      period,
      format.prefix,
      format.padding,
    );

    const row = rows[0];
    if (!row) {
      // Impossible avec `next_sequence`, qui renvoie toujours une ligne :
      // l'absence signalerait une base altérée, pas un cas métier.
      throw new Error(
        `next_sequence n'a renvoyé aucune ligne pour (${organizationId}, ${kind}, ${period}).`,
      );
    }
    return { value: BigInt(row.value), period, number: row.number };
  }

  /**
   * Aligne la ligne `sequences` sur le format déclaré (préfixe et padding).
   *
   * `next_sequence()` ne renseigne ni l'un ni l'autre : la colonne existe
   * pour que l'exploitation puisse lire le format d'un compteur sans ouvrir
   * le code. Appel facultatif, idempotent.
   */
  async describeSequence(
    tx: TenantClient,
    organizationId: string,
    kind: SequenceKind,
    period: string,
  ): Promise<void> {
    const format = SEQUENCE_FORMATS[kind];
    await tx.$executeRawUnsafe(
      `UPDATE sequences
          SET prefix = $4::text, padding = $5::smallint, updated_at = now()
        WHERE organization_id = $1::uuid AND kind = $2::text AND period = $3::text
          AND (prefix IS DISTINCT FROM $4::text OR padding IS DISTINCT FROM $5::smallint)`,
      organizationId,
      kind,
      period,
      format.prefix,
      format.padding,
    );
  }
}
