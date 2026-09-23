/**
 * Liste des tables à extraire pour l'export d'une personne (contrat § « Export »).
 * Domaine PUR : ne touche pas la base, reçoit les adresses déjà connues du
 * tiers (`collectKnownAddresses`, calculées par l'appelant) plutôt que d'aller
 * les chercher — `application/subject-export.service.ts` fait la lecture.
 */
export interface TableQuery {
  table: string;
  sql: string;
  params: unknown[];
}

const q = (subjectId: string, table: string, whereCol: string): TableQuery => ({
  table,
  sql: `SELECT * FROM ${table} WHERE ${whereCol} = $1::uuid`,
  params: [subjectId],
});

export function guarantorQueries(subjectId: string): TableQuery[] {
  return [
    q(subjectId, 'guarantors', 'id'),
    {
      table: 'leases',
      sql: `SELECT l.* FROM leases l JOIN lease_parties lp ON lp.lease_id = l.id WHERE lp.guarantor_id = $1::uuid`,
      params: [subjectId],
    },
    q(subjectId, 'contact_channels', 'owner_id'),
  ];
}

/** `subjectType` limité à `tenant`/`landlord` ici : `guarantor` et `user` ont leur propre fonction. */
export function partyQueries(
  subjectType: 'tenant' | 'landlord',
  table: 'tenants' | 'landlords',
  subjectId: string,
  knownAddresses: readonly string[],
): TableQuery[] {
  const ownerType = subjectType === 'tenant' ? 'TENANT' : 'LANDLORD';
  const messageLogsQuery: TableQuery =
    knownAddresses.length > 0
      ? {
          table: 'message_logs',
          sql: `SELECT * FROM message_logs WHERE to_address = ANY($1::text[])`,
          params: [[...knownAddresses]],
        }
      : { table: 'message_logs', sql: `SELECT * FROM message_logs WHERE false`, params: [] };

  return [
    q(subjectId, table, 'id'),
    {
      table: 'leases',
      sql: `SELECT DISTINCT l.* FROM leases l LEFT JOIN lease_parties lp ON lp.lease_id = l.id WHERE l.${
        subjectType === 'tenant' ? 'primary_tenant_id' : 'landlord_id'
      } = $1::uuid${subjectType === 'tenant' ? ' OR lp.tenant_id = $1::uuid' : ''}`,
      params: [subjectId],
    },
    q(subjectId, 'rent_invoices', `${subjectType}_id`),
    q(subjectId, 'payments', `${subjectType}_id`),
    q(subjectId, 'receipts', `${subjectType}_id`),
    ...(subjectType === 'tenant' ? [q(subjectId, 'dunning_runs', 'tenant_id')] : []),
    messageLogsQuery,
    {
      table: 'notifications',
      sql: `SELECT * FROM notifications WHERE recipient_${subjectType}_id = $1::uuid`,
      params: [subjectId],
    },
    {
      table: 'contact_channels',
      sql: `SELECT * FROM contact_channels WHERE owner_type = $2 AND owner_id = $1::uuid`,
      params: [subjectId, ownerType],
    },
    {
      table: 'documents',
      sql: `SELECT * FROM documents WHERE related_entity_type = $2 AND related_entity_id = $1::uuid`,
      params: [subjectId, subjectType],
    },
  ];
}

/** `subjectType = 'user'` : profil global (hors secrets) et ses rattachements DANS cette organisation seulement. */
export function userQueries(organizationId: string, userId: string): TableQuery[] {
  return [
    {
      table: 'users',
      sql: `SELECT id, phone_e164, email, first_name, last_name, display_name, gender, locale, status, created_at FROM users WHERE id = $1::uuid`,
      params: [userId],
    },
    {
      table: 'tenants',
      sql: `SELECT * FROM tenants WHERE user_id = $1::uuid AND organization_id = $2::uuid`,
      params: [userId, organizationId],
    },
    {
      table: 'landlords',
      sql: `SELECT * FROM landlords WHERE user_id = $1::uuid AND organization_id = $2::uuid`,
      params: [userId, organizationId],
    },
    {
      table: 'organization_members',
      sql: `SELECT * FROM organization_members WHERE user_id = $1::uuid AND organization_id = $2::uuid`,
      params: [userId, organizationId],
    },
  ];
}
