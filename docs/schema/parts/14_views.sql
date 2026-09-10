-- =====================================================================
-- Partie 14 : Vues de pilotage
-- security_invoker = true : le RLS du rôle appelant s'applique aux vues.
-- =====================================================================

CREATE OR REPLACE VIEW v_unpaid_invoices WITH (security_invoker = true) AS
SELECT
    i.organization_id,
    i.id                          AS invoice_id,
    i.invoice_number,
    i.status,
    i.period_start,
    i.period_end,
    i.due_date,
    i.grace_until_date,
    GREATEST(0, (CURRENT_DATE - i.due_date))::INTEGER AS days_overdue,
    i.total_amount,
    i.paid_amount,
    i.balance_amount,
    i.penalty_amount,
    i.currency,
    i.lease_id,
    l.reference                   AS lease_reference,
    i.tenant_id,
    coalesce(t.company_name, concat_ws(' ', t.first_name, t.last_name)) AS tenant_name,
    t.primary_phone               AS tenant_phone,
    i.unit_id,
    u.code                        AS unit_code,
    i.property_id,
    p.name                        AS property_name,
    p.district,
    p.city,
    i.landlord_id,
    l.collector_user_id
FROM rent_invoices i
JOIN leases     l ON l.id = i.lease_id
JOIN tenants    t ON t.id = i.tenant_id
JOIN units      u ON u.id = i.unit_id
JOIN properties p ON p.id = i.property_id
WHERE i.status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE')
  AND i.balance_amount > 0;
COMMENT ON VIEW v_unpaid_invoices IS 'Factures de loyer restant dues, avec ancienneté de la créance et coordonnées du locataire — socle des relances et du tableau des impayés.';

CREATE OR REPLACE VIEW v_tenant_balances WITH (security_invoker = true) AS
SELECT
    t.organization_id,
    t.id                                        AS tenant_id,
    coalesce(t.company_name, concat_ws(' ', t.first_name, t.last_name)) AS tenant_name,
    t.primary_phone,
    coalesce(lz.active_leases_count, 0)                                 AS active_leases_count,
    coalesce(iv.invoiced_amount, 0)::BIGINT                             AS invoiced_amount,
    coalesce(iv.paid_amount, 0)::BIGINT                                 AS paid_amount,
    coalesce(iv.due_amount, 0)::BIGINT                                  AS due_amount,
    coalesce(cd.credit_amount, 0)::BIGINT                               AS credit_amount,
    (coalesce(iv.due_amount, 0) - coalesce(cd.credit_amount, 0))::BIGINT AS net_balance_amount,
    'XAF'::CHAR(3)                                                      AS currency,
    iv.oldest_unpaid_due_date,
    iv.last_unpaid_due_date,
    CASE WHEN iv.oldest_unpaid_due_date IS NOT NULL
         THEN (CURRENT_DATE - iv.oldest_unpaid_due_date)::INTEGER
         ELSE 0 END                                                     AS max_days_overdue
FROM tenants t
LEFT JOIN LATERAL (
    SELECT count(*) FILTER (WHERE l.status = 'ACTIVE') AS active_leases_count
    FROM leases l
    WHERE l.primary_tenant_id = t.id AND l.deleted_at IS NULL
) lz ON true
LEFT JOIN LATERAL (
    SELECT sum(i.total_amount)                            AS invoiced_amount,
           sum(i.paid_amount)                             AS paid_amount,
           sum(i.balance_amount)                          AS due_amount,
           min(i.due_date) FILTER (WHERE i.balance_amount > 0) AS oldest_unpaid_due_date,
           max(i.due_date) FILTER (WHERE i.balance_amount > 0) AS last_unpaid_due_date
    FROM rent_invoices i
    WHERE i.tenant_id = t.id AND i.status <> 'CANCELLED'
) iv ON true
LEFT JOIN LATERAL (
    SELECT sum(tc.remaining_amount) AS credit_amount
    FROM tenant_credits tc
    WHERE tc.tenant_id = t.id AND tc.status IN ('OPEN', 'PARTIALLY_USED')
) cd ON true
WHERE t.deleted_at IS NULL;
COMMENT ON VIEW v_tenant_balances IS 'Solde consolidé par locataire : facturé, encaissé, restant dû et avoirs disponibles.';

CREATE OR REPLACE VIEW v_collector_cash_positions WITH (security_invoker = true) AS
SELECT
    cr.organization_id,
    cr.collector_user_id,
    concat_ws(' ', us.first_name, us.last_name)                          AS collector_name,
    us.phone_e164                                                        AS collector_phone,
    om.collector_zone,
    om.cash_limit_amount,
    count(*) FILTER (WHERE cr.status = 'ISSUED' AND cr.remittance_id IS NULL)          AS open_receipts_count,
    coalesce(sum(cr.amount) FILTER (WHERE cr.status = 'ISSUED' AND cr.remittance_id IS NULL), 0)::BIGINT AS cash_on_hand_amount,
    coalesce(sum(cr.amount) FILTER (WHERE cr.status = 'REMITTED'), 0)::BIGINT          AS remitted_amount,
    coalesce(sum(cr.amount) FILTER (WHERE cr.received_at::date = CURRENT_DATE), 0)::BIGINT AS collected_today_amount,
    'XAF'::CHAR(3)                                                       AS currency,
    max(cr.received_at)                                                  AS last_collection_at,
    orem.id                                                              AS open_remittance_id,
    orem.opened_at                                                       AS open_remittance_opened_at
FROM cash_receipts cr
JOIN users us ON us.id = cr.collector_user_id
LEFT JOIN organization_members om
       ON om.user_id = cr.collector_user_id AND om.organization_id = cr.organization_id
LEFT JOIN cash_remittances orem
       ON orem.organization_id = cr.organization_id
      AND orem.collector_user_id = cr.collector_user_id
      AND orem.status = 'OPEN'
WHERE cr.status <> 'CANCELLED'
GROUP BY cr.organization_id, cr.collector_user_id, us.first_name, us.last_name, us.phone_e164,
         om.collector_zone, om.cash_limit_amount, orem.id, orem.opened_at;
COMMENT ON VIEW v_collector_cash_positions IS 'Encaisse détenue par chaque démarcheur : reçus non reversés, montant du jour et remise ouverte en cours.';

CREATE OR REPLACE VIEW v_owner_monthly_summary WITH (security_invoker = true) AS
SELECT
    i.organization_id,
    i.landlord_id,
    coalesce(ld.company_name, concat_ws(' ', ld.first_name, ld.last_name)) AS landlord_name,
    date_trunc('month', i.period_start)::date                             AS period_month,
    count(DISTINCT i.property_id)                                          AS properties_count,
    count(DISTINCT i.unit_id)                                              AS units_invoiced_count,
    count(DISTINCT i.lease_id)                                             AS leases_count,
    coalesce(sum(i.rent_amount), 0)::BIGINT                                AS rent_invoiced_amount,
    coalesce(sum(i.charges_amount), 0)::BIGINT                             AS charges_invoiced_amount,
    coalesce(sum(i.penalty_amount), 0)::BIGINT                             AS penalty_invoiced_amount,
    coalesce(sum(i.total_amount), 0)::BIGINT                               AS total_invoiced_amount,
    coalesce(sum(i.paid_amount), 0)::BIGINT                                AS total_collected_amount,
    coalesce(sum(i.balance_amount), 0)::BIGINT                             AS total_outstanding_amount,
    CASE WHEN sum(i.total_amount) > 0
         THEN round(sum(i.paid_amount)::numeric * 10000 / sum(i.total_amount))::INTEGER
         ELSE NULL END                                                     AS collection_rate_bps,
    coalesce(cm.commission_amount, 0)::BIGINT                              AS commission_amount,
    coalesce(ex.expenses_amount, 0)::BIGINT                                AS expenses_amount,
    (coalesce(sum(i.paid_amount), 0) - coalesce(cm.commission_amount, 0) - coalesce(ex.expenses_amount, 0))::BIGINT
                                                                           AS estimated_net_payable_amount,
    'XAF'::CHAR(3)                                                         AS currency
FROM rent_invoices i
JOIN landlords ld ON ld.id = i.landlord_id
LEFT JOIN LATERAL (
    SELECT sum(c.total_amount) AS commission_amount
    FROM commissions c
    WHERE c.landlord_id = i.landlord_id
      AND c.status <> 'CANCELLED'
      AND date_trunc('month', c.period_start) = date_trunc('month', i.period_start)
) cm ON true
LEFT JOIN LATERAL (
    SELECT sum(e.total_amount) AS expenses_amount
    FROM expenses e
    WHERE e.landlord_id = i.landlord_id
      AND e.status IN ('PAID', 'APPROVED')
      AND e.is_deductible_from_rent
      AND date_trunc('month', e.expense_date) = date_trunc('month', i.period_start)
) ex ON true
WHERE i.status <> 'CANCELLED'
GROUP BY i.organization_id, i.landlord_id, ld.company_name, ld.first_name, ld.last_name,
         date_trunc('month', i.period_start), cm.commission_amount, ex.expenses_amount;
COMMENT ON VIEW v_owner_monthly_summary IS 'Synthèse mensuelle par bailleur : appelé, encaissé, impayés, honoraires et dépenses, avec net estimé à reverser.';

GRANT SELECT ON v_unpaid_invoices, v_tenant_balances, v_collector_cash_positions, v_owner_monthly_summary
    TO immodesk_app;
