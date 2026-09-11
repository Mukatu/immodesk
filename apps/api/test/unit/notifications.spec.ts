import { createHmac } from 'node:crypto';
import {
  channelSequence,
  isAccepted,
  needsWebhookFallback,
  nextMessageStatus,
  orderedParameters,
  smsSegments,
  toGsm7,
} from '../../src/modules/notifications/domain/delivery-rules';
import {
  SYSTEM_TEMPLATES,
  systemTemplate,
} from '../../src/modules/notifications/domain/template-catalog';
import { renderTemplate } from '../../src/modules/notifications/domain/template-renderer';
import {
  parseGatewayEvents,
  parseMetaStatuses,
  verifyGatewaySignature,
  verifyMetaSignature,
} from '../../src/modules/notifications/domain/webhook-parsing';
import { isSimulatedFailure } from '../../src/modules/notifications/infrastructure/fake-sms.provider';

describe('Choix du canal et repli WhatsApp → SMS', () => {
  it('essaie les canaux dans l’ordre, sans doublon, en reprenant au canal demandé', () => {
    expect(channelSequence(['WHATSAPP', 'SMS'])).toEqual(['WHATSAPP', 'SMS']);
    expect(channelSequence(['SMS', 'SMS', 'EMAIL'])).toEqual(['SMS']);
    expect(channelSequence([])).toEqual(['WHATSAPP', 'SMS']);
    expect(channelSequence(['WHATSAPP', 'SMS'], 'SMS')).toEqual(['SMS']);
    expect(channelSequence(['WHATSAPP'], 'SMS')).toEqual(['SMS']);
    expect(isAccepted('QUEUED')).toBe(true);
    expect(isAccepted('FAILED')).toBe(false);
  });

  it('bascule sur le SMS après un échec WhatsApp signalé par webhook, jamais en doublon', () => {
    const base = {
      eventStatus: 'FAILED',
      channel: 'WHATSAPP',
      order: ['WHATSAPP', 'SMS'],
      smsAlreadyAttempted: false,
    };
    expect(needsWebhookFallback(base)).toBe(true);
    expect(needsWebhookFallback({ ...base, smsAlreadyAttempted: true })).toBe(false);
    expect(needsWebhookFallback({ ...base, eventStatus: 'DELIVERED' })).toBe(false);
    expect(needsWebhookFallback({ ...base, order: ['WHATSAPP'] })).toBe(false);
    expect(needsWebhookFallback({ ...base, channel: 'SMS' })).toBe(false);
  });

  it('ignore les statuts hors ordre et ne rétrograde jamais un message délivré', () => {
    expect(nextMessageStatus('SENT', 'DELIVERED')).toBe('DELIVERED');
    expect(nextMessageStatus('READ', 'DELIVERED')).toBeNull();
    expect(nextMessageStatus('DELIVERED', 'FAILED')).toBeNull();
    expect(nextMessageStatus('SENT', 'FAILED')).toBe('FAILED');
    expect(nextMessageStatus('FAILED', 'DELIVERED')).toBe('DELIVERED');
  });

  it('simule l’échec des numéros finissant par 99', () => {
    expect(isSimulatedFailure('+242066000099')).toBe(true);
    expect(isSimulatedFailure('+242066000098')).toBe(false);
  });
});

describe('Modèles et SMS', () => {
  it('sème les quatre codes en WHATSAPP et en SMS', () => {
    const codes = ['RECEIPT_ISSUED', 'CASH_RECEIPT_ISSUED', 'INVOICE_ISSUED', 'OTP_CODE'];
    for (const code of codes) {
      expect(systemTemplate(code, 'WHATSAPP')?.providerTemplateName).toBeTruthy();
      expect(systemTemplate(code, 'SMS')).not.toBeNull();
    }
    expect(SYSTEM_TEMPLATES).toHaveLength(8);
  });

  it('translittère en GSM-7 et tient la quittance en deux segments', () => {
    const sms = systemTemplate('RECEIPT_ISSUED', 'SMS')!;
    const text = toGsm7(
      renderTemplate(sms.body, {
        receiptNumber: 'QUI-202609-00001',
        period: 'septembre 2026',
        amount: '160 000 FCFA',
        pdfLink:
          'https://api.immodesk.cg/v1/public/d/AZrVkJ3cR8e0bQp1mN2x4w-ZrVkJ3cR8e0bQp1mN2x4wAAAAAA.aBcDeFgHiJkLmNoP',
        link: 'https://app.immodesk.cg/verifier/3f9a1c0b7e2d4f6a8b9c0d1e2f3a4b5c',
      }),
    );
    expect(text).toContain('160 000 FCFA');
    expect(text).not.toMatch(/[^\x20-\x7e]/);
    expect(smsSegments(text)).toBeLessThanOrEqual(2);
    expect(toGsm7('Réglé à échéance — « merci »')).toBe('Regle a echeance - " merci "');
    expect(orderedParameters({ a: '1', c: '3' }, ['a', 'b', 'c'])).toEqual(['1', '', '3']);
  });
});

describe('Webhooks : signatures et normalisation', () => {
  const body = Buffer.from(
    JSON.stringify({
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [
                  { id: 'wamid.X', status: 'delivered', timestamp: '1757570000' },
                  {
                    id: 'wamid.Y',
                    status: 'failed',
                    timestamp: '1757570001',
                    errors: [{ code: 131026, title: 'Undeliverable' }],
                  },
                ],
              },
            },
          ],
        },
      ],
    }),
  );

  it('vérifie X-Hub-Signature-256 et refuse une signature absente ou altérée', () => {
    const signature = `sha256=${createHmac('sha256', 'secret-app').update(body).digest('hex')}`;
    expect(verifyMetaSignature(body, signature, 'secret-app')).toBe(true);
    expect(verifyMetaSignature(body, signature.replace(/.$/, '0'), 'secret-app')).toBe(false);
    expect(verifyMetaSignature(body, undefined, 'secret-app')).toBe(false);
    const events = parseMetaStatuses(JSON.parse(body.toString()));
    expect(events.map((e) => [e.providerMessageId, e.status, e.errorCode])).toEqual([
      ['wamid.X', 'DELIVERED', null],
      ['wamid.Y', 'FAILED', '131026'],
    ]);
  });

  it('vérifie la signature horodatée de la passerelle Android', () => {
    const raw = Buffer.from(
      JSON.stringify({
        event: 'sms:delivered',
        payload: { messageId: 'm-1', deliveredAt: '2026-09-11T10:00:00Z' },
      }),
    );
    const now = new Date('2026-09-11T10:00:30Z');
    const timestamp = String(Math.floor(now.getTime() / 1000));
    const signature = createHmac('sha256', 'cle')
      .update(Buffer.concat([raw, Buffer.from(timestamp)]))
      .digest('hex');
    expect(verifyGatewaySignature(raw, { signature, timestamp }, 'cle', now)).toBe(true);
    expect(
      verifyGatewaySignature(
        raw,
        { signature, timestamp: String(Number(timestamp) - 600) },
        'cle',
        now,
      ),
    ).toBe(false);
    expect(verifyGatewaySignature(raw, { secret: 'cle' }, 'cle', now)).toBe(true);
    expect(verifyGatewaySignature(raw, {}, 'cle', now)).toBe(false);
    expect(parseGatewayEvents(JSON.parse(raw.toString()))[0]).toMatchObject({
      providerMessageId: 'm-1',
      status: 'DELIVERED',
    });
  });
});
