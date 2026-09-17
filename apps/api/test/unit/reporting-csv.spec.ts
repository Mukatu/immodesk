import {
  csvAmount,
  csvEscape,
  CSV_BOM,
  toCsvDocument,
  toCsvRow,
} from '../../src/modules/reporting/domain/csv';

describe('Sérialisation CSV des exports (reporting)', () => {
  it('laisse un champ simple inchangé', () => {
    expect(csvEscape('Ngoma')).toBe('Ngoma');
    expect(csvEscape(12_000)).toBe('12000');
    expect(csvEscape(null)).toBe('');
    expect(csvEscape(undefined)).toBe('');
  });

  it('échappe un champ contenant le séparateur point-virgule', () => {
    expect(csvEscape('Bail ; renouvelé')).toBe('"Bail ; renouvelé"');
  });

  it('échappe et double les guillemets internes', () => {
    // Nom de locataire avec guillemets ET point-virgule : le piège explicite
    // du cahier des charges (tranche 4).
    expect(csvEscape('Ngoma ; dit "Le Sage"')).toBe('"Ngoma ; dit ""Le Sage"""');
  });

  it('échappe un champ contenant un saut de ligne', () => {
    expect(csvEscape('ligne1\nligne2')).toBe('"ligne1\nligne2"');
  });

  it('assemble une ligne avec le séparateur point-virgule', () => {
    expect(toCsvRow(['a', 1, null, 'b;c'])).toBe('a;1;;"b;c"');
  });

  it('préfixe le document du BOM UTF-8 et termine chaque ligne en CRLF', () => {
    const doc = toCsvDocument(['nom', 'montant'], [['Ngoma', 100_000]]);
    expect(doc.startsWith(CSV_BOM)).toBe(true);
    expect(doc).toBe(`${CSV_BOM}nom;montant\r\nNgoma;100000\r\n`);
  });

  it('formate un montant XAF en entier, sans séparateur de milliers', () => {
    expect(csvAmount(1_250_000)).toBe('1250000');
    expect(csvAmount(1_250_000n)).toBe('1250000');
    expect(csvAmount(12.9)).toBe('12'); // jamais de décimale XAF
  });
});
