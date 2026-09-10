import { DomainError } from '../../src/shared/errors/domain-error';
import { ERROR_CATALOG, type ErrorCode } from '../../src/shared/errors/error-codes';
import { isUuid, newId, newOpaqueToken, uuidVersionOf } from '../../src/shared/ids/uuid';
import {
  AmountError,
  formatXaf,
  serializeAmount,
  THOUSANDS_SEPARATOR,
  toAmount,
} from '../../src/shared/money/amount';
import {
  clampLimit,
  decodeCursor,
  encodeCursor,
  MAX_PAGE_LIMIT,
} from '../../src/shared/pagination/cursor';
import { maskPhone, normalizePhoneE164 } from '../../src/shared/phone/e164';
import { renderTemplate } from '../../src/modules/notifications/domain/template-renderer';
import { changedFields, toJsonState } from '../../src/modules/audit/domain/audit-entry';
import { resolveUniqueSlug, slugify } from '../../src/modules/organizations/domain/slug';

describe('Identifiants UUID v7', () => {
  it('génère des UUID de version 7, croissants dans le temps', () => {
    const a = newId();
    const b = newId();
    expect(isUuid(a)).toBe(true);
    expect(uuidVersionOf(a)).toBe(7);
    // Les UUID v7 sont ordonnables lexicographiquement (préfixe temporel).
    expect(a <= b).toBe(true);
  });

  it('génère des jetons opaques base64url distincts', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => newOpaqueToken(32)));
    expect(tokens.size).toBe(50);
    expect(newOpaqueToken(32)).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('Normalisation E.164 (+242)', () => {
  it.each([
    ['+242066000001', '+242066000001'],
    ['242066000001', '+242066000001'],
    ['00242066000001', '+242066000001'],
    ['066000001', '+242066000001'],
    ['06 600 00 01', '+242066000001'],
    ['06-600-00-01', '+242066000001'],
    ['  +242 06 600 00 01  ', '+242066000001'],
  ])('normalise « %s » en %s', (input, expected) => {
    expect(normalizePhoneE164(input)).toBe(expected);
  });

  it('rejette une saisie non numérique', () => {
    expect(() => normalizePhoneE164('abc')).toThrow(DomainError);
    expect(() => normalizePhoneE164('')).toThrow(DomainError);
  });

  it('accepte un numéro international hors Congo', () => {
    expect(normalizePhoneE164('+33612345678')).toBe('+33612345678');
  });

  it('masque le numéro dans les journaux', () => {
    const masked = maskPhone('+242066000001');
    expect(masked.startsWith('+242066')).toBe(true);
    expect(masked).not.toBe('+242066000001');
  });
});

describe('Montants XAF en BigInt', () => {
  it('accepte les entiers sous toutes leurs formes', () => {
    expect(toAmount(120_000)).toBe(120000n);
    expect(toAmount('120000')).toBe(120000n);
    expect(toAmount(120000n)).toBe(120000n);
  });

  it('refuse toute décimale : le franc CFA n’a pas de sous-unité', () => {
    expect(() => toAmount(1200.5)).toThrow(AmountError);
    expect(() => toAmount('1200.50')).toThrow(AmountError);
    expect(() => toAmount('1 200')).toThrow(AmountError);
  });

  it('sérialise en chaîne, jamais en flottant', () => {
    expect(serializeAmount(9_007_199_254_740_993n)).toBe('9007199254740993');
  });

  it('formate en français avec séparateur de milliers', () => {
    const SEP = THOUSANDS_SEPARATOR;
    expect(formatXaf(120000n)).toBe(['120', '000', 'FCFA'].join(SEP));
    expect(formatXaf(0n)).toBe(`0${SEP}FCFA`);
    expect(formatXaf(-5000n)).toBe(['-5', '000', 'FCFA'].join(SEP));
  });
});

describe('Pagination par curseur', () => {
  const SECRET = 'secret-de-test-suffisamment-long';

  it('fait un aller-retour fidèle', () => {
    const payload = { createdAt: '2026-03-05T09:00:00.000Z', id: newId() };
    expect(decodeCursor(encodeCursor(payload, SECRET), SECRET)).toEqual(payload);
  });

  it('refuse un curseur forgé (signature HMAC invalide)', () => {
    const cursor = encodeCursor({ createdAt: '2026-03-05T09:00:00.000Z', id: newId() }, SECRET);
    expect(() => decodeCursor(cursor, 'un-autre-secret-de-test-long')).toThrow(DomainError);
    expect(() => decodeCursor(`${cursor}x`, SECRET)).toThrow(DomainError);
    expect(() => decodeCursor('nimportequoi', SECRET)).toThrow(DomainError);
  });

  it('plafonne la taille de page', () => {
    expect(clampLimit(undefined)).toBe(50);
    expect(clampLimit(10)).toBe(10);
    expect(clampLimit(5000)).toBe(MAX_PAGE_LIMIT);
    expect(clampLimit(0)).toBe(1);
  });
});

describe('Catalogue des erreurs', () => {
  it('associe à chaque code un statut HTTP et un message français', () => {
    for (const [code, entry] of Object.entries(ERROR_CATALOG)) {
      expect(entry.status).toBeGreaterThanOrEqual(400);
      expect(entry.status).toBeLessThan(600);
      expect(entry.message.length).toBeGreaterThan(3);
      expect(code).toMatch(/^[A-Z]+\.[A-Z_]+$/);
    }
  });

  it('fige les statuts des codes du contrat de la phase 0', () => {
    const contract: Array<[ErrorCode, number]> = [
      ['IAM.OTP_INVALID', 401],
      ['IAM.OTP_LOCKED', 429],
      ['IAM.REFRESH_REVOKED', 401],
      ['IAM.RATE_LIMITED', 429],
      ['ORG.LAST_OWNER', 409],
    ];
    for (const [code, status] of contract) {
      expect(ERROR_CATALOG[code].status).toBe(status);
    }
  });

  it('sérialise une DomainError dans l’enveloppe { code, message, details }', () => {
    const error = new DomainError('IAM.OTP_INVALID', { remainingAttempts: 3 });
    expect(error.toJSON()).toEqual({
      code: 'IAM.OTP_INVALID',
      message: 'Code incorrect.',
      details: { remainingAttempts: 3 },
    });
  });
});

describe('Slug d’organisation', () => {
  it('translittère et met en forme', () => {
    expect(slugify('Agence Mpila Immo')).toBe('agence-mpila-immo');
    expect(slugify('Société Générale Immobilière')).toBe('societe-generale-immobiliere');
    expect(slugify('   ')).toBe('organisation');
  });

  it('décline un slug déjà pris', async () => {
    const taken = new Set(['agence-mpila-immo', 'agence-mpila-immo-2']);
    const slug = await resolveUniqueSlug('Agence Mpila Immo', async (c) => taken.has(c));
    expect(slug).toBe('agence-mpila-immo-3');
  });
});

describe('Rendu des modèles de message', () => {
  it('remplace les variables nommées et positionnelles', () => {
    expect(
      renderTemplate('Code {{code}} valable {{minutes}} min', { code: '123456', minutes: '5' }),
    ).toBe('Code 123456 valable 5 min');
    expect(renderTemplate('Bonjour {{1}}, code {{2}}', { nom: 'Jean', code: '123456' })).toBe(
      'Bonjour Jean, code 123456',
    );
  });

  it('n’expose jamais un gabarit non résolu au destinataire', () => {
    expect(renderTemplate('Code {{inconnu}}.', {})).toBe('Code .');
  });
});

describe('Journal d’audit', () => {
  it('calcule les champs modifiés', () => {
    expect(changedFields({ role: 'VIEWER', name: 'a' }, { role: 'MANAGER', name: 'a' })).toEqual([
      'role',
    ]);
    expect(changedFields(null, { role: 'OWNER' })).toEqual(['role']);
  });

  it('sérialise BigInt et Date sans perte pour JSONB', () => {
    const state = toJsonState({ amount: 120000n, at: new Date('2026-03-05T09:00:00.000Z') });
    expect(state).toEqual({ amount: '120000', at: '2026-03-05T09:00:00.000Z' });
  });
});
