import { describe, expect, it } from 'vitest';
import { otpRequestSchema, otpVerifySchema } from './auth.js';

describe('otpRequestSchema', () => {
  it('accepte un numéro local valide sans channel', () => {
    const result = otpRequestSchema.safeParse({ phone: '066000001' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe('+242066000001');
    }
  });

  it('accepte un numéro E.164 valide avec un channel explicite', () => {
    const result = otpRequestSchema.safeParse({
      phone: '+242066000001',
      channel: 'WHATSAPP',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe('+242066000001');
      expect(result.data.channel).toBe('WHATSAPP');
    }
  });

  it('rejette un numéro de téléphone invalide', () => {
    const result = otpRequestSchema.safeParse({ phone: '123' });

    expect(result.success).toBe(false);
  });

  it('rejette un channel non supporté', () => {
    const result = otpRequestSchema.safeParse({
      phone: '+242066000001',
      channel: 'EMAIL',
    });

    expect(result.success).toBe(false);
  });
});

describe('otpVerifySchema', () => {
  it('accepte un code à 6 chiffres avec un numéro valide', () => {
    const result = otpVerifySchema.safeParse({
      phone: '+242066000001',
      code: '123456',
      deviceName: 'iPhone de Jean',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe('+242066000001');
      expect(result.data.code).toBe('123456');
    }
  });

  it('rejette un code qui ne contient pas exactement 6 chiffres', () => {
    const result = otpVerifySchema.safeParse({
      phone: '+242066000001',
      code: '12345',
    });

    expect(result.success).toBe(false);
  });

  it('rejette un numéro de téléphone étranger non congolais', () => {
    const result = otpVerifySchema.safeParse({
      phone: '+33612345678',
      code: '123456',
    });

    expect(result.success).toBe(false);
  });
});
