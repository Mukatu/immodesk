import {
  toDunningRunView,
  type DunningRunRow,
} from '../../src/modules/dunning/application/dunning-runs-query.service';

/**
 * Arbitrage 1 du contrat phase 9 : `dunning_runs` ne porte aucune colonne
 * dédiée à l'escalade vers le garant. `guarantorNotified` est donc DÉRIVÉ, à
 * la lecture, de l'indicateur `escalateToLegal` de la règle et de la
 * présence d'un garant actif sur le bail (`has_active_guarantor`, calculé en
 * SQL par une sous-requête `EXISTS` sur `lease_parties`).
 */
function row(overrides: Partial<DunningRunRow> = {}): DunningRunRow {
  return {
    id: 'run-1',
    rule_id: 'rule-1',
    rule_name: 'Relance J+3',
    escalate_to_legal: false,
    invoice_id: 'invoice-1',
    invoice_number: 'LOY-202609-00001',
    lease_id: 'lease-1',
    tenant_id: 'tenant-1',
    first_name: 'Bernadette',
    last_name: 'Loemba',
    company_name: null,
    party_type: 'INDIVIDUAL',
    step_order: 1,
    status: 'SENT',
    run_date: new Date('2026-09-08T00:00:00.000Z'),
    scheduled_at: new Date('2026-09-08T08:00:00.000Z'),
    executed_at: new Date('2026-09-08T08:00:05.000Z'),
    days_overdue: 3,
    balance_amount: 110_000n,
    channel: 'WHATSAPP',
    notification_id: 'notif-1',
    message_log_id: 'log-1',
    message_status: 'DELIVERED',
    penalty_applied: false,
    penalty_amount: 0n,
    skip_reason: null,
    error_message: null,
    has_active_guarantor: false,
    created_at: new Date('2026-09-08T08:00:00.000Z'),
    ...overrides,
  };
}

describe('toDunningRunView — dérivation de guarantorNotified (arbitrage 1)', () => {
  it('faux si la règle n’escalade pas, même avec un garant actif', () => {
    const view = toDunningRunView(row({ escalate_to_legal: false, has_active_guarantor: true }));
    expect(view.guarantorNotified).toBe(false);
  });

  it('faux si la règle escalade mais qu’aucun garant n’est rattaché au bail', () => {
    const view = toDunningRunView(row({ escalate_to_legal: true, has_active_guarantor: false }));
    expect(view.guarantorNotified).toBe(false);
  });

  it('vrai uniquement quand les deux conditions sont réunies', () => {
    const view = toDunningRunView(row({ escalate_to_legal: true, has_active_guarantor: true }));
    expect(view.guarantorNotified).toBe(true);
  });

  it('remise effective lue via message_logs : aucun statut DELIVERED sur dunning_runs lui-même', () => {
    const view = toDunningRunView(row({ status: 'SENT', message_status: 'DELIVERED' }));
    expect(view.status).toBe('SENT');
    expect(view.messageStatus).toBe('DELIVERED');
  });

  it('convertit les montants BigInt en entiers JSON à la frontière de présentation', () => {
    const view = toDunningRunView(row({ balance_amount: 250_000n, penalty_amount: 12_500n }));
    expect(view.balanceAmount).toBe(250_000);
    expect(view.penaltyAmount).toBe(12_500);
  });
});
