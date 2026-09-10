import { describe, expect, it } from 'vitest';
import { createOrganizationSchema, inviteSchema, updateSettingsSchema } from './organizations.js';

describe('createOrganizationSchema', () => {
  it('accepte une organisation valide avec un numéro local', () => {
    const result = createOrganizationSchema.safeParse({
      type: 'AGENCY',
      legalName: 'Agence Immobilière du Congo SARL',
      city: 'Brazzaville',
      contactPhone: '066000001',
      contactEmail: 'contact@agence.cg',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contactPhone).toBe('+242066000001');
    }
  });

  it('rejette une organisation avec un numéro de contact invalide', () => {
    const result = createOrganizationSchema.safeParse({
      type: 'INDEPENDENT_LANDLORD',
      legalName: 'Jean Mabiala',
      city: 'Pointe-Noire',
      contactPhone: '+33612345678',
    });

    expect(result.success).toBe(false);
  });

  it('rejette une organisation sans legalName', () => {
    const result = createOrganizationSchema.safeParse({
      type: 'AGENCY',
      legalName: '',
      city: 'Brazzaville',
      contactPhone: '+242066000001',
    });

    expect(result.success).toBe(false);
  });
});

describe('updateSettingsSchema', () => {
  it('accepte une mise à jour partielle valide', () => {
    const result = updateSettingsSchema.safeParse({
      defaultPaymentDueDay: 5,
      whatsappEnabled: true,
    });

    expect(result.success).toBe(true);
  });

  it('accepte un objet vide (tous les champs sont optionnels)', () => {
    const result = updateSettingsSchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it('rejette une devise différente de XAF', () => {
    const result = updateSettingsSchema.safeParse({
      currency: 'EUR',
    });

    expect(result.success).toBe(false);
  });

  it('rejette un defaultPaymentDueDay hors des bornes 1-31', () => {
    const result = updateSettingsSchema.safeParse({
      defaultPaymentDueDay: 32,
    });

    expect(result.success).toBe(false);
  });
});

describe('inviteSchema', () => {
  it('accepte une invitation valide avec un numéro E.164', () => {
    const result = inviteSchema.safeParse({
      phone: '+242066000001',
      role: 'COLLECTOR',
      fullName: 'Aline Nkounkou',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe('+242066000001');
    }
  });

  it('rejette une invitation avec un rôle inconnu', () => {
    const result = inviteSchema.safeParse({
      phone: '+242066000001',
      role: 'ADMIN',
    });

    expect(result.success).toBe(false);
  });

  it('rejette une invitation avec un numéro de téléphone invalide', () => {
    const result = inviteSchema.safeParse({
      phone: '123',
      role: 'VIEWER',
    });

    expect(result.success).toBe(false);
  });
});
