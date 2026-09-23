import {
  buildAnonymizationPatch,
  isAlreadyAnonymized,
  toCamel,
  type ReservedValues,
} from './erasure-rules';
import type { PartyAnonymizationRow } from './subject';

const RESERVED: ReservedValues = { name: 'Tiers anonymisé', phone: '+242000000000' };

function row(overrides: Partial<PartyAnonymizationRow> = {}): PartyAnonymizationRow {
  return {
    id: '018f5b3c-1111-7000-8000-000000000001',
    party_type: 'INDIVIDUAL',
    primary_phone: '+242061234567',
    first_name: 'Jean',
    last_name: 'Moukala',
    company_name: null,
    ...overrides,
  };
}

describe('buildAnonymizationPatch — tenants', () => {
  it('réserve last_name et vide first_name/company_name pour une personne physique', () => {
    const result = buildAnonymizationPatch('tenants', row(), RESERVED);
    expect(result.alreadyAnonymized).toBe(false);
    expect(result.patch.last_name).toBe(RESERVED.name);
    expect(result.patch.first_name).toBeNull();
    expect(result.patch.company_name).toBeNull();
    expect(result.patch.primary_phone).toBe(RESERVED.phone);
    expect(result.patch.gender).toBe('UNSPECIFIED');
  });

  it('réserve company_name et vide first_name/last_name pour une personne morale', () => {
    const result = buildAnonymizationPatch(
      'tenants',
      row({ party_type: 'COMPANY', company_name: 'SARL Bantu', last_name: null }),
      RESERVED,
    );
    expect(result.patch.company_name).toBe(RESERVED.name);
    expect(result.patch.last_name).toBeNull();
    expect(result.patch.first_name).toBeNull();
  });

  it('vide tous les champs propres à tenants (whatsapp_phone, birth_place, emergency_contact_*, client_ref)', () => {
    const result = buildAnonymizationPatch('tenants', row(), RESERVED);
    for (const column of [
      'whatsapp_phone',
      'birth_place',
      'emergency_contact_name',
      'emergency_contact_phone',
      'client_ref',
      'profession',
      'employer_name',
      'monthly_income',
      'secondary_phone',
      'birth_date',
      'nationality',
      'id_document_expiry',
      'rccm_number',
      'niu_number',
      'user_id',
      'email',
      'address_line',
      'district',
      'notes',
      'id_document_type',
      'id_document_number',
      'id_document_id',
    ]) {
      expect(result.patch[column]).toBeNull();
    }
  });

  it('ne touche jamais city, country_code, party_type, currency ni les colonnes absentes de tenants', () => {
    const result = buildAnonymizationPatch('tenants', row(), RESERVED);
    for (const untouched of [
      'city',
      'country_code',
      'party_type',
      'currency',
      'relationship',
      'guarantee_amount',
      'payout_method',
      'is_self',
      'tenant_id',
    ]) {
      expect(Object.prototype.hasOwnProperty.call(result.patch, untouched)).toBe(false);
    }
  });
});

describe('buildAnonymizationPatch — landlords', () => {
  it("n'écrit aucun champ absent de landlords (whatsapp_phone, profession, employer_name, monthly_income, emergency_contact_*, client_ref, relationship)", () => {
    const result = buildAnonymizationPatch('landlords', row(), RESERVED);
    for (const absent of [
      'whatsapp_phone',
      'birth_place',
      'profession',
      'employer_name',
      'monthly_income',
      'emergency_contact_name',
      'emergency_contact_phone',
      'client_ref',
      'relationship',
    ]) {
      expect(Object.prototype.hasOwnProperty.call(result.patch, absent)).toBe(false);
    }
  });

  it('vide user_id (arbitrage 9 : la ligne users elle-même reste intacte)', () => {
    const result = buildAnonymizationPatch('landlords', row(), RESERVED);
    expect(result.patch.user_id).toBeNull();
  });

  it('vide secondary_phone, birth_date, nationality, id_document_expiry, rccm_number, niu_number', () => {
    const result = buildAnonymizationPatch('landlords', row(), RESERVED);
    for (const column of [
      'secondary_phone',
      'birth_date',
      'nationality',
      'id_document_expiry',
      'rccm_number',
      'niu_number',
    ]) {
      expect(result.patch[column]).toBeNull();
    }
  });
});

describe('buildAnonymizationPatch — guarantors', () => {
  it("n'écrit ni user_id, ni secondary_phone/whatsapp_phone/birth_date/birth_place/nationality, ni id_document_expiry/rccm_number/niu_number, ni emergency_contact_*/client_ref", () => {
    const result = buildAnonymizationPatch('guarantors', row(), RESERVED);
    for (const absent of [
      'user_id',
      'secondary_phone',
      'whatsapp_phone',
      'birth_date',
      'birth_place',
      'nationality',
      'id_document_expiry',
      'rccm_number',
      'niu_number',
      'emergency_contact_name',
      'emergency_contact_phone',
      'client_ref',
    ]) {
      expect(Object.prototype.hasOwnProperty.call(result.patch, absent)).toBe(false);
    }
  });

  it('vide relationship, seul champ propre au garant', () => {
    const result = buildAnonymizationPatch('guarantors', row(), RESERVED);
    expect(result.patch.relationship).toBeNull();
  });

  it('vide profession, employer_name, monthly_income (partagés avec tenants)', () => {
    const result = buildAnonymizationPatch('guarantors', row(), RESERVED);
    expect(result.patch.profession).toBeNull();
    expect(result.patch.employer_name).toBeNull();
    expect(result.patch.monthly_income).toBeNull();
  });

  it('écrit tout de même le nom réservé, sans que guarantors_name_chk ne l’exige (arbitrage 8)', () => {
    const result = buildAnonymizationPatch('guarantors', row(), RESERVED);
    expect(result.patch.last_name).toBe(RESERVED.name);
  });
});

describe('idempotence (contrat § Effacement : jamais anonymisé deux fois)', () => {
  it('détecte un tiers déjà anonymisé au téléphone réservé', () => {
    const already = row({ primary_phone: RESERVED.phone });
    expect(isAlreadyAnonymized(already, RESERVED)).toBe(true);
    const result = buildAnonymizationPatch('tenants', already, RESERVED);
    expect(result.alreadyAnonymized).toBe(true);
    expect(result.patch).toEqual({});
    expect(result.fields).toEqual([]);
  });

  it("un tiers non anonymisé n'est jamais faussement détecté", () => {
    expect(isAlreadyAnonymized(row(), RESERVED)).toBe(false);
  });
});

describe('toCamel', () => {
  it('convertit les colonnes snake_case en camelCase', () => {
    expect(toCamel('id_document_number')).toBe('idDocumentNumber');
    expect(toCamel('primary_phone')).toBe('primaryPhone');
    expect(toCamel('email')).toBe('email');
  });
});
