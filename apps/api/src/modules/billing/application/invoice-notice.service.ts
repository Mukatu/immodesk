import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { formatXaf } from '../../../shared/money/amount';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { readOperationalSettings } from '../../../shared/settings/operational-settings';
import { NOTIFICATION_ENQUEUER, type NotificationEnqueuer } from '../../notifications/domain/ports';
import { MESSAGE_TEMPLATE_CODES } from '../../notifications/domain/template-codes';
import { frenchLongDate, periodLabel } from '../domain/period-label';
import { tenantDisplayName } from './invoice-views';

interface NoticeRow {
  id: string;
  invoice_number: string;
  total_amount: bigint;
  period_start: Date;
  period_end: Date;
  due_date: Date;
  tenant_id: string;
  tenant_primary_phone: string;
  tenant_party_type: string;
  tenant_first_name: string | null;
  tenant_last_name: string | null;
  tenant_company_name: string | null;
  organization_name: string;
}

/**
 * Avis d'échéance (`INVOICE_ISSUED`), envoyé APRÈS le COMMIT de l'émission.
 *
 * Un échec de messagerie ne remet jamais en cause la facture : il est
 * journalisé, et le message peut être relancé depuis le journal. Le port est
 * facultatif : sans pipeline de notification branché, l'émission reste
 * possible et silencieuse.
 */
@Injectable()
export class InvoiceNoticeService {
  private readonly logger = new Logger(InvoiceNoticeService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(NOTIFICATION_ENQUEUER)
    private readonly enqueuer: NotificationEnqueuer | null = null,
  ) {}

  async notifyIssued(
    organizationId: string,
    invoiceIds: readonly string[],
    actorUserId: string | null,
  ): Promise<number> {
    if (!this.enqueuer || invoiceIds.length === 0) return 0;

    const rows = await this.prisma.withTenant(organizationId, actorUserId, async (tx) => {
      const settings = await tx.organization_settings.findUnique({
        where: { organization_id: organizationId },
        select: { settings_json: true },
      });
      if (!readOperationalSettings(settings?.settings_json).messaging.sendInvoiceIssued) return [];
      return tx.$queryRawUnsafe<NoticeRow[]>(
        `SELECT ri.id, ri.invoice_number, ri.total_amount, ri.period_start, ri.period_end, ri.due_date,
                t.id AS tenant_id, t.primary_phone AS tenant_primary_phone,
                t.party_type AS tenant_party_type, t.first_name AS tenant_first_name,
                t.last_name AS tenant_last_name, t.company_name AS tenant_company_name,
                coalesce(o.trade_name, o.legal_name) AS organization_name
           FROM rent_invoices ri
           JOIN tenants t ON t.id = ri.tenant_id
           JOIN organizations o ON o.id = ri.organization_id
          WHERE ri.id = ANY($1::uuid[])
            AND ri.status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE')`,
        [...invoiceIds],
      );
    });

    let sent = 0;
    for (const row of rows) {
      try {
        await this.enqueuer.enqueue({
          organizationId,
          templateCode: MESSAGE_TEMPLATE_CODES.INVOICE_ISSUED,
          recipient: {
            phone: row.tenant_primary_phone,
            name: tenantDisplayName(row),
            tenantId: row.tenant_id,
          },
          variables: {
            tenantName: tenantDisplayName(row),
            amount: formatXaf(row.total_amount),
            period: periodLabel(row.period_start, row.period_end),
            receiptNumber: row.invoice_number,
            invoiceNumber: row.invoice_number,
            dueDate: frenchLongDate(row.due_date),
            link: '',
            organizationName: row.organization_name,
          },
          relatedEntity: { type: 'rent_invoice', id: row.id },
          dedupeKey: `INVOICE_ISSUED:${row.id}`,
          actorUserId,
        });
        sent += 1;
      } catch (error) {
        this.logger.warn(`Avis d'échéance non envoyé (${row.id}) : ${(error as Error).message}`);
      }
    }
    return sent;
  }
}
