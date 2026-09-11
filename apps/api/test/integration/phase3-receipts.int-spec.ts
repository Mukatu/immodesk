import { createHmac } from 'node:crypto';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { v7 as uuidv7 } from 'uuid';
import { FinancialPdfService } from '../../src/modules/pdf/application/financial-pdf.service';
import { PdfBrowserService } from '../../src/modules/pdf/infrastructure/pdf-browser.service';
import { api, startTestApp, stopTestApp, type TestContext } from './helpers';
import {
  addMember,
  createAgency,
  dropOrganization,
  firstOfMonth,
  pollRun,
  seedLeases,
  SIGNATURE_PNG,
  waitFor,
  type Agency,
  type BulkPortfolio,
} from './phase3-fixtures';

const WA_SECRET = 'immodesk-dev-whatsapp-app-secret';
const SMS_SECRET = 'immodesk-dev-sms-webhook-secret';

describe('Phase 3 — quittance, vérification publique, messagerie et webhooks', () => {
  let ctx: TestContext;
  let agency: Agency;
  let portfolio: BulkPortfolio;
  let collector: { accessToken: string; userId: string };
  const invoiceOf = new Map<string, string>();
  const as = () => ({
    accessToken: agency.owner.accessToken,
    organizationId: agency.organizationId,
  });
  const asCollector = () => ({
    accessToken: collector.accessToken,
    organizationId: agency.organizationId,
  });
  const cash = (i: number, amount: number) => ({
    tenantId: portfolio.leases[i].tenantId,
    amount,
    allocations: [{ invoiceId: invoiceOf.get(portfolio.leases[i].tenantId), amount }],
    signatureDataUrl: SIGNATURE_PNG,
    clientRef: `01K${uuidv7().replace(/-/g, '').slice(0, 23).toUpperCase()}`,
  });

  beforeAll(async () => {
    ctx = await startTestApp();
    agency = await createAgency(ctx, 'Quittances');
    await api(ctx, 'PATCH', `/organizations/${agency.organizationId}/settings`, {
      ...as(),
      body: { messaging: { sendInvoiceIssued: false } },
    });
    collector = await addMember(ctx, agency.organizationId, 'COLLECTOR');
    portfolio = await seedLeases(ctx.admin, agency.organizationId, 4, {
      startDate: firstOfMonth(0),
      rentAmount: 150000,
      chargesAmount: 10000,
    });
    const run = await api(ctx, 'POST', '/billing/runs', {
      ...as(),
      body: { periodStart: firstOfMonth(1) },
    });
    await pollRun(ctx, agency, run.body.runId);
    for (const invoice of await ctx.admin.rent_invoices.findMany({
      where: { organization_id: agency.organizationId },
    })) {
      invoiceOf.set(invoice.tenant_id, invoice.id);
    }
  }, 120_000);

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await dropOrganization(ctx.admin, agency.organizationId, [
      agency.owner.userId,
      collector.userId,
    ]);
    await stopTestApp(ctx);
  });

  it('sème les modèles système à la création de l’organisation', async () => {
    const res = await api(ctx, 'GET', '/notification-templates', as());
    const codes = res.body.items
      .filter((t: any) => t.isSystem)
      .map((t: any) => `${t.code}/${t.channel}`);
    for (const code of ['RECEIPT_ISSUED', 'CASH_RECEIPT_ISSUED', 'INVOICE_ISSUED', 'OTP_CODE']) {
      expect(codes).toEqual(expect.arrayContaining([`${code}/WHATSAPP`, `${code}/SMS`]));
    }
  });

  it('Gherkin : paiement partiel puis solde → quittance QUI émise et message tracé', async () => {
    const invoiceId = invoiceOf.get(portfolio.leases[0].tenantId) as string;
    const first = await api(ctx, 'POST', '/cash-receipts', {
      ...asCollector(),
      body: cash(0, 100000),
    });
    expect(first.status).toBe(201);
    expect(first.body.receiptNumber).toMatch(/^CASH-[A-Z0-9]{2,4}-[0-9A-F]{6}-\d{6}$/);
    const partial = await api(ctx, 'GET', `/invoices/${invoiceId}`, as());
    expect(partial.body).toMatchObject({
      status: 'PARTIALLY_PAID',
      paidAmount: 100000,
      receipt: null,
    });

    const second = await api(ctx, 'POST', '/cash-receipts', {
      ...asCollector(),
      body: cash(0, 60000),
    });
    expect(second.status).toBe(201);
    const paid = await api(ctx, 'GET', `/invoices/${invoiceId}`, as());
    expect(paid.body.status).toBe('PAID');
    expect(paid.body.receipt.receiptNumber).toMatch(/^QUI-\d{6}-\d{5}$/);

    const sent = await waitFor(async () => {
      const receipt = await ctx.admin.receipts.findFirst({ where: { invoice_id: invoiceId } });
      return receipt?.status === 'SENT' ? receipt : null;
    }, 90_000);
    const logs = await ctx.admin.message_logs.findMany({
      where: { related_entity_id: sent.id, template_code: 'RECEIPT_ISSUED' },
    });
    expect(logs).toEqual([expect.objectContaining({ channel: 'WHATSAPP', status: 'SENT' })]);
    const detail = await api(ctx, 'GET', `/receipts/${sent.id}`, as());
    expect(detail.body).toMatchObject({
      status: 'SENT',
      sentChannel: 'WHATSAPP',
      totalAmount: 160000,
    });
    expect(detail.body.messageLogs).toHaveLength(1);
  }, 120_000);

  it('vérification publique : jeton valide, jeton altéré 404, aucune donnée personnelle', async () => {
    const receipt = await ctx.admin.receipts.findFirstOrThrow({
      where: { organization_id: agency.organizationId },
    });
    const res = await api(ctx, 'GET', `/public/receipts/verify/${receipt.verification_token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      receiptNumber: receipt.receipt_number,
      totalAmount: 160000,
      status: 'SENT',
    });
    expect(Object.keys(res.body).sort()).toEqual([
      'issueDate',
      'landlordDisplayName',
      'organizationName',
      'period',
      'receiptNumber',
      'status',
      'tenantName',
      'totalAmount',
    ]);
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain(portfolio.leases[0].tenantPhone);
    expect(serialized).not.toContain('avenue de la Paix');
    const token = receipt.verification_token;
    const altered = `${token.slice(0, -1)}${token.endsWith('0') ? '1' : '0'}`;
    expect((await api(ctx, 'GET', `/public/receipts/verify/${altered}`)).status).toBe(404);
    expect((await api(ctx, 'GET', '/public/receipts/verify/pas-un-jeton')).status).toBe(404);
  });

  it('PDF réel de la quittance, QR décodable (sauté sans navigateur)', async () => {
    if (!(await ctx.app.get(PdfBrowserService).available())) {
      console.warn('[phase3-receipts] Aucun navigateur de rendu : test du PDF sauté.');
      return;
    }
    const receipt = await ctx.admin.receipts.findFirstOrThrow({
      where: { organization_id: agency.organizationId },
    });
    expect(receipt.document_id).not.toBeNull();
    const link = await api(ctx, 'GET', `/receipts/${receipt.id}/pdf`, as());
    const pdf = Buffer.from(await (await fetch(link.body.downloadUrl)).arrayBuffer());
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    const dataUrl = await ctx.app.get(FinancialPdfService).qr(receipt.verification_url as string);
    const png = PNG.sync.read(Buffer.from(dataUrl.split(',')[1], 'base64'));
    expect(jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data).toBe(
      receipt.verification_url,
    );
  }, 60_000);

  it('contre-passation complète : facture rouverte, quittance et reçu annulés, origine intacte', async () => {
    const invoiceId = invoiceOf.get(portfolio.leases[1].tenantId) as string;
    const receipt = await api(ctx, 'POST', '/cash-receipts', {
      ...asCollector(),
      body: cash(1, 160000),
    });
    const quittance = await waitFor(() =>
      ctx.admin.receipts.findFirst({ where: { invoice_id: invoiceId } }),
    );
    const original = await ctx.admin.payments.findUniqueOrThrow({
      where: { id: receipt.body.paymentId },
    });
    const res = await api(ctx, 'POST', `/payments/${receipt.body.paymentId}/reverse`, {
      ...as(),
      body: { reason: 'Mauvais locataire' },
    });
    expect(res.status).toBe(200);
    expect(await ctx.admin.payments.findUniqueOrThrow({ where: { id: original.id } })).toEqual(
      original,
    );
    const invoice = await ctx.admin.rent_invoices.findUniqueOrThrow({ where: { id: invoiceId } });
    expect(['ISSUED', 'OVERDUE']).toContain(invoice.status);
    expect(invoice.paid_amount).toBe(0n);
    expect(
      (await ctx.admin.receipts.findUniqueOrThrow({ where: { id: quittance.id } })).status,
    ).toBe('CANCELLED');
    expect(
      (await ctx.admin.cash_receipts.findUniqueOrThrow({ where: { id: receipt.body.id } })).status,
    ).toBe('CANCELLED');
  }, 60_000);

  it('webhooks WhatsApp : vérification GET, signé accepté, non signé 401, idempotent', async () => {
    const challenge = await api(
      ctx,
      'GET',
      '/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=immodesk-dev-whatsapp-verify-token&hub.challenge=4242',
    );
    expect(challenge).toMatchObject({ status: 200, body: 4242 });
    expect(
      (
        await api(
          ctx,
          'GET',
          '/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=faux&hub.challenge=1',
        )
      ).status,
    ).toBe(403);

    const log = await ctx.admin.message_logs.findFirstOrThrow({
      where: { organization_id: agency.organizationId, channel: 'WHATSAPP', status: 'SENT' },
    });
    const body = JSON.stringify({
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [
                  {
                    id: log.provider_message_id,
                    status: 'delivered',
                    timestamp: String(Math.floor(Date.now() / 1000)),
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    const signature = `sha256=${createHmac('sha256', WA_SECRET).update(body).digest('hex')}`;
    const unsigned = await fetch(`${ctx.baseUrl}/webhooks/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    expect(unsigned.status).toBe(401);
    const post = () =>
      fetch(`${ctx.baseUrl}/webhooks/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': signature },
        body,
      });
    expect(await (await post()).json()).toEqual({ received: true, duplicate: false });
    expect(await (await post()).json()).toEqual({ received: true, duplicate: true });
    const updated = await ctx.admin.message_logs.findUniqueOrThrow({ where: { id: log.id } });
    expect(updated.status).toBe('DELIVERED');
    expect(updated.delivered_at).not.toBeNull();
    expect(
      await ctx.admin.webhook_events.count({
        where: { organization_id: agency.organizationId, source: 'WHATSAPP_CLOUD' },
      }),
    ).toBe(1);
  });

  it('échec WhatsApp signalé par webhook → repli SMS ; webhook SMS signé', async () => {
    const log = await ctx.admin.message_logs.findFirstOrThrow({
      where: {
        organization_id: agency.organizationId,
        channel: 'WHATSAPP',
        status: 'SENT',
        template_code: 'CASH_RECEIPT_ISSUED',
      },
    });
    const body = JSON.stringify({
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [
                  {
                    id: log.provider_message_id,
                    status: 'failed',
                    timestamp: '1757570000',
                    errors: [{ code: 131047, title: 'Re-engagement message' }],
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    const res = await fetch(`${ctx.baseUrl}/webhooks/whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': `sha256=${createHmac('sha256', WA_SECRET).update(body).digest('hex')}`,
      },
      body,
    });
    expect(res.status).toBe(200);
    const sms = await waitFor(() =>
      ctx.admin.message_logs.findFirst({
        where: { notification_id: log.notification_id, channel: 'SMS' },
      }),
    );
    expect(sms).toMatchObject({ status: 'SENT', provider: 'fake-sms' });
    expect(sms.content_preview).not.toMatch(/[^\x20-\x7e]/);

    const smsBody = JSON.stringify({
      event: 'sms:delivered',
      id: `evt-${uuidv7()}`,
      payload: { messageId: sms.provider_message_id, deliveredAt: new Date().toISOString() },
    });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const smsSignature = createHmac('sha256', SMS_SECRET)
      .update(Buffer.concat([Buffer.from(smsBody), Buffer.from(timestamp)]))
      .digest('hex');
    const unsigned = await fetch(`${ctx.baseUrl}/webhooks/sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: smsBody,
    });
    expect(unsigned.status).toBe(401);
    const signed = await fetch(`${ctx.baseUrl}/webhooks/sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': smsSignature,
        'X-Timestamp': timestamp,
      },
      body: smsBody,
    });
    expect(signed.status).toBe(200);
    expect((await ctx.admin.message_logs.findUniqueOrThrow({ where: { id: sms.id } })).status).toBe(
      'DELIVERED',
    );
  }, 60_000);

  it('numéro finissant par 99 : WhatsApp puis SMS en échec, notification FAILED ; relance', async () => {
    const lease = portfolio.leases[2];
    await ctx.admin.$executeRawUnsafe(
      `UPDATE tenants SET primary_phone = '+242066123499' WHERE id = $1::uuid`,
      lease.tenantId,
    );
    const res = await api(ctx, 'POST', '/cash-receipts', {
      ...asCollector(),
      body: { ...cash(2, 5000), payerPhone: '+242066123499' },
    });
    expect(res.status).toBe(201);
    const failed = await waitFor(async () => {
      const n = await ctx.admin.notifications.findFirst({
        where: { related_entity_id: res.body.id },
      });
      return n?.status === 'FAILED' ? n : null;
    }, 60_000);
    const logs = await ctx.admin.message_logs.findMany({
      where: { notification_id: failed.id },
      orderBy: { created_at: 'asc' },
    });
    expect(logs.map((l) => [l.channel, l.status])).toEqual([
      ['WHATSAPP', 'FAILED'],
      ['SMS', 'FAILED'],
    ]);

    const list = await api(
      ctx,
      'GET',
      `/message-logs?status=FAILED&relatedEntityId=${res.body.id}`,
      as(),
    );
    expect(list.body.items).toHaveLength(2);
    const retry = await api(ctx, 'POST', `/message-logs/${logs[1].id}/retry`, as());
    expect(retry.status).toBe(202);
    expect(retry.body.notificationId).not.toBe(failed.id);
  }, 90_000);
});
