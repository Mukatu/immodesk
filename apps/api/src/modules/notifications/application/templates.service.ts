import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { formatXaf } from '../../../shared/money/amount';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import type {
  OrganizationCreatedEvent,
  OrganizationLifecycleListener,
} from '../../organizations/domain/ports';
import type { DeliveryChannel } from '../domain/delivery-rules';
import { SYSTEM_TEMPLATES } from '../domain/template-catalog';
import { NotificationPipelineService } from './notification-pipeline.service';

export interface NotificationTemplateView {
  id: string;
  code: string;
  channel: string;
  locale: string;
  name: string;
  subject: string | null;
  body: string;
  providerTemplateName: string | null;
  providerTemplateLang: string | null;
  variables: string[];
  isActive: boolean;
  isSystem: boolean;
  approvedAt: string | null;
}

type TemplateRecord = Awaited<
  ReturnType<TenantClient['notification_templates']['findFirstOrThrow']>
>;

function toView(row: TemplateRecord): NotificationTemplateView {
  return {
    id: row.id,
    code: row.code,
    channel: row.channel,
    locale: row.locale,
    name: row.name,
    subject: row.subject,
    body: row.body,
    providerTemplateName: row.provider_template_name,
    providerTemplateLang: row.provider_template_lang,
    variables: Array.isArray(row.variables) ? (row.variables as string[]) : [],
    isActive: row.is_active,
    isSystem: row.is_system,
    approvedAt: row.approved_at ? row.approved_at.toISOString() : null,
  };
}

@Injectable()
export class TemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pipeline: NotificationPipelineService,
    private readonly auditService: AuditService,
    private readonly config: AppConfigService,
  ) {}

  async list(
    organizationId: string,
    userId: string,
  ): Promise<{ items: NotificationTemplateView[] }> {
    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.notification_templates.findMany({ orderBy: [{ code: 'asc' }, { channel: 'asc' }] }),
    );
    return { items: rows.map(toView) };
  }

  async update(
    organizationId: string,
    userId: string,
    id: string,
    patch: {
      body?: string;
      subject?: string | null;
      providerTemplateName?: string | null;
      providerTemplateLang?: string | null;
      isActive?: boolean;
    },
  ): Promise<NotificationTemplateView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await tx.notification_templates.findFirst({ where: { id } });
      if (!before) throw new DomainError('NOTIFICATIONS.TEMPLATE_NOT_FOUND', { id });
      const after = await tx.notification_templates.update({
        where: { id },
        data: {
          ...(patch.body !== undefined ? { body: patch.body } : {}),
          ...(patch.subject !== undefined ? { subject: patch.subject } : {}),
          ...(patch.providerTemplateName !== undefined
            ? { provider_template_name: patch.providerTemplateName }
            : {}),
          ...(patch.providerTemplateLang !== undefined
            ? { provider_template_lang: patch.providerTemplateLang }
            : {}),
          ...(patch.isActive !== undefined ? { is_active: patch.isActive } : {}),
          updated_at: new Date(),
        },
      });
      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.NOTIFICATION_TEMPLATE_UPDATED,
        entityType: 'notification_templates',
        entityId: id,
        previousState: toJsonState(toView(before)),
        newState: toJsonState(toView(after)),
      });
      return toView(after);
    });
  }

  /** Envoi d'essai, sur le canal du modèle, avec des valeurs d'exemple. */
  async test(
    organizationId: string,
    userId: string,
    id: string,
    phone: string,
  ): Promise<{ notificationId: string }> {
    const template = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.notification_templates.findFirst({ where: { id } }),
    );
    if (!template) throw new DomainError('NOTIFICATIONS.TEMPLATE_NOT_FOUND', { id });
    const result = await this.pipeline.enqueue({
      organizationId,
      templateCode: template.code,
      channelOrder: [template.channel as DeliveryChannel],
      recipient: { phone, name: 'Destinataire d’essai' },
      variables: {
        tenantName: 'Locataire d’essai',
        amount: formatXaf(100_000n),
        period: 'septembre 2026',
        receiptNumber: 'QUI-ESSAI-00001',
        invoiceNumber: 'LOY-ESSAI-00001',
        dueDate: '5 octobre 2026',
        link: `${this.config.get('PUBLIC_WEB_BASE_URL')}/verifier/essai`,
        pdfLink: '',
        organizationName: 'Immodesk',
        code: '000000',
        minutes: '5',
      },
      relatedEntity: { type: 'notification_template', id },
      actorUserId: userId,
    });
    return { notificationId: result.notificationId };
  }

  /** Sème les modèles système (idempotent : les modèles déjà présents sont conservés). */
  async seed(tx: TenantClient, organizationId: string): Promise<number> {
    const created = await tx.notification_templates.createMany({
      data: SYSTEM_TEMPLATES.map((t) => ({
        id: newId(),
        organization_id: organizationId,
        code: t.code,
        channel: t.channel,
        locale: 'fr-CG',
        name: t.name,
        body: t.body,
        provider_template_name: t.providerTemplateName,
        provider_template_lang: t.providerTemplateLang,
        variables: t.variables,
        is_active: true,
        is_system: true,
      })),
      skipDuplicates: true,
    });
    return created.count;
  }
}

/** Abonné à la création d'organisation : modèles système semés dans la même transaction. */
@Injectable()
export class TemplateSeeder implements OrganizationLifecycleListener {
  constructor(
    private readonly templates: TemplatesService,
    private readonly auditService: AuditService,
  ) {}

  async onOrganizationCreated(tx: TenantClient, event: OrganizationCreatedEvent): Promise<void> {
    const count = await this.templates.seed(tx, event.organizationId);
    await this.auditService.record(tx, {
      organizationId: event.organizationId,
      actorUserId: event.actorUserId,
      action: 'CREATE',
      operation: AUDIT_OPERATIONS.NOTIFICATION_TEMPLATES_SEEDED,
      entityType: 'notification_templates',
      entityId: event.organizationId,
      newState: toJsonState({ count }),
    });
  }
}
