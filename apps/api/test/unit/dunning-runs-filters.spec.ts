import { buildDunningRunConditions } from '../../src/modules/dunning/application/dunning-runs-query.service';

/**
 * Filtre `tenantId` de `GET /v1/dunning-runs` : écart assumé au contrat écrit
 * (§ Routes), ajouté après coup pour l'écran mobile « relances de ce
 * locataire », qui devait sinon parcourir plusieurs pages côté client.
 *
 * `dunning_runs` porte un index dédié `dunning_runs_tenant_idx
 * ON (organization_id, tenant_id, run_date DESC)` : la requête doit donc
 * toujours filtrer sur ces deux colonnes ensemble pour l'emprunter.
 */
describe('buildDunningRunConditions — filtre tenantId (dunning_runs_tenant_idx)', () => {
  it('filtre uniquement par organisation en l’absence d’autres critères', () => {
    const { conditions, params } = buildDunningRunConditions('org-1', {});
    expect(conditions).toEqual(['dr.organization_id = $1::uuid']);
    expect(params).toEqual(['org-1']);
  });

  it('ajoute la condition tenant_id, alignée avec l’index dédié', () => {
    const { conditions, params } = buildDunningRunConditions('org-1', { tenantId: 'tenant-9' });
    expect(conditions).toEqual(['dr.organization_id = $1::uuid', 'dr.tenant_id = $2::uuid']);
    expect(params).toEqual(['org-1', 'tenant-9']);
  });

  it('combine tenantId avec ruleId, invoiceId, status, from et to sans collision de paramètres', () => {
    const { conditions, params } = buildDunningRunConditions('org-1', {
      ruleId: 'rule-1',
      invoiceId: 'invoice-1',
      tenantId: 'tenant-9',
      status: 'SENT',
      from: '2026-09-01',
      to: '2026-09-30',
    });
    expect(conditions).toEqual([
      'dr.organization_id = $1::uuid',
      'dr.rule_id = $2::uuid',
      'dr.invoice_id = $3::uuid',
      'dr.tenant_id = $4::uuid',
      'dr.status = $5::dunning_step_status',
      'dr.run_date >= $6::date',
      'dr.run_date <= $7::date',
    ]);
    expect(params).toEqual([
      'org-1',
      'rule-1',
      'invoice-1',
      'tenant-9',
      'SENT',
      '2026-09-01',
      '2026-09-30',
    ]);
  });
});
