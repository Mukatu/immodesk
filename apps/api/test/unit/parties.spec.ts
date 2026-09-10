import { DomainError } from '../../src/shared/errors/domain-error';
import {
  foldSearchText,
  sqlFold,
  sqlSearchClause,
  SQL_ACCENTED_CHARS,
  SQL_PLAIN_CHARS,
  toLikePattern,
} from '../../src/shared/search/search-text';
import {
  assertPartyName,
  displayNameOf,
  normalizeChannelValue,
  normalizeOptionalPhone,
  normalizePartyPhone,
  trimOrNull,
} from '../../src/modules/parties/domain/party-rules';

describe('Normalisation E.164 des téléphones congolais', () => {
  // Les quatre formes de saisie du contrat de phase 1.
  it.each([
    ['066123456', '+242066123456'],
    ['06 612 34 56', '+242066123456'],
    ['00242066123456', '+242066123456'],
    ['+242066123456', '+242066123456'],
  ])('ramène « %s » à %s', (input, expected) => {
    expect(normalizePartyPhone(input)).toBe(expected);
  });

  it('accepte aussi les séparateurs et espaces insécables du copier-coller', () => {
    expect(normalizePartyPhone('06-612-34-56')).toBe('+242066123456');
    expect(normalizePartyPhone('  +242 06 612 34 56  ')).toBe('+242066123456');
    expect(normalizePartyPhone('(066) 123-456')).toBe('+242066123456');
  });

  it('remonte PARTIES.PHONE_INVALID, jamais le code du domaine IAM', () => {
    // Le contrat de phase 1 impose son propre code : un client qui traite
    // IAM.PHONE_INVALID comme « problème de connexion » afficherait un
    // message absurde sur un formulaire de bailleur.
    expect.assertions(3);
    try {
      normalizePartyPhone('pas-un-numero');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).code).toBe('PARTIES.PHONE_INVALID');
      expect((error as DomainError).status).toBe(422);
    }
  });

  it('laisse un numéro international hors Congo intact', () => {
    expect(normalizePartyPhone('+33612345678')).toBe('+33612345678');
  });

  it('traite le vide comme « non renseigné » sur un champ facultatif', () => {
    expect(normalizeOptionalPhone(undefined, 'secondaryPhone')).toBeNull();
    expect(normalizeOptionalPhone('', 'secondaryPhone')).toBeNull();
    expect(normalizeOptionalPhone('   ', 'secondaryPhone')).toBeNull();
    expect(normalizeOptionalPhone('066123456', 'secondaryPhone')).toBe('+242066123456');
  });

  it('normalise la valeur d’un canal selon son type', () => {
    expect(normalizeChannelValue('WHATSAPP', '066123456')).toBe('+242066123456');
    expect(normalizeChannelValue('EMAIL', '  Bernadette.LOEMBA@Example.CG ')).toBe(
      'bernadette.loemba@example.cg',
    );
  });
});

describe('Règles de nom des tiers', () => {
  it('exige lastName pour une personne physique', () => {
    expect(() => assertPartyName({ partyType: 'INDIVIDUAL', firstName: 'Célestin' })).toThrow(
      DomainError,
    );
    try {
      assertPartyName({ partyType: 'INDIVIDUAL', firstName: 'Célestin' });
    } catch (error) {
      expect((error as DomainError).code).toBe('PARTIES.NAME_REQUIRED');
      expect((error as DomainError).details).toMatchObject({ field: 'lastName' });
    }
    expect(() => assertPartyName({ partyType: 'INDIVIDUAL', lastName: 'Nkodia' })).not.toThrow();
  });

  it('exige companyName pour une personne morale', () => {
    expect(() => assertPartyName({ partyType: 'COMPANY', lastName: 'Nkodia' })).toThrow(
      DomainError,
    );
    try {
      assertPartyName({ partyType: 'COMPANY', lastName: 'Nkodia' });
    } catch (error) {
      expect((error as DomainError).details).toMatchObject({ field: 'companyName' });
    }
    expect(() =>
      assertPartyName({ partyType: 'COMPANY', companyName: 'SCI Les Manguiers' }),
    ).not.toThrow();
  });

  it('refuse un nom composé uniquement d’espaces', () => {
    expect(() => assertPartyName({ partyType: 'INDIVIDUAL', lastName: '   ' })).toThrow(
      DomainError,
    );
    expect(() => assertPartyName({ partyType: 'COMPANY', companyName: '\t\n' })).toThrow(
      DomainError,
    );
  });

  it('compose le nom d’affichage selon le type de tiers', () => {
    expect(
      displayNameOf({ partyType: 'INDIVIDUAL', firstName: 'Célestin', lastName: 'Nkodia' }),
    ).toBe('Célestin Nkodia');
    expect(displayNameOf({ partyType: 'INDIVIDUAL', lastName: 'Nkodia' })).toBe('Nkodia');
    expect(
      displayNameOf({
        partyType: 'COMPANY',
        companyName: 'SCI Les Manguiers',
        lastName: 'Ignoré',
      }),
    ).toBe('SCI Les Manguiers');
  });

  it('nettoie les chaînes facultatives', () => {
    expect(trimOrNull('  Moungali  ')).toBe('Moungali');
    expect(trimOrNull('   ')).toBeNull();
    expect(trimOrNull(undefined)).toBeNull();
  });
});

describe('Recherche insensible à la casse et aux accents', () => {
  it('plie accents, casse et espaces', () => {
    expect(foldSearchText('Résidence  MPILA')).toBe('residence mpila');
    expect(foldSearchText('Makélékélé')).toBe('makelekele');
    expect(foldSearchText('Crédit du Congo')).toBe('credit du congo');
  });

  it('déplie les ligatures côté application', () => {
    // `translate()` ne sait pas remplacer un caractère par deux : ce pliage
    // n'existe que côté application, ce que le commentaire du module assume.
    expect(foldSearchText('Sœur')).toBe('soeur');
    expect(foldSearchText('Ex æquo')).toBe('ex aequo');
  });

  it('neutralise les jokers SQL saisis par l’utilisateur', () => {
    // Sans échappement, une recherche sur « % » ramènerait toute la table.
    expect(toLikePattern('%')).toBe('%\\%%');
    expect(toLikePattern('a_b')).toBe('%a\\_b%');
    expect(toLikePattern('Mpila')).toBe('%mpila%');
  });

  it('garde les deux tables de correspondance SQL alignées', () => {
    // Un décalage d'un seul caractère ferait silencieusement correspondre
    // « é » à « d » : `translate` apparie par position.
    expect([...SQL_ACCENTED_CHARS]).toHaveLength([...SQL_PLAIN_CHARS].length);
    expect(new Set(SQL_ACCENTED_CHARS).size).toBe(SQL_ACCENTED_CHARS.length);
  });

  it('engendre un fragment SQL paramétré, jamais interpolé', () => {
    const clause = sqlSearchClause(['t.last_name', 't.company_name'], '$2');
    expect(clause).toContain('$2');
    expect(clause).toContain('ESCAPE');
    expect(clause.startsWith('(')).toBe(true);
    expect(sqlFold('l.city')).toContain('translate(lower(coalesce(l.city');
  });
});
