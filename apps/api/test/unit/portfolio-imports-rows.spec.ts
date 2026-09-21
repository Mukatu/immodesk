import {
  buildLandlordRow,
  buildLeaseRow,
  buildPropertyRow,
  buildTenantRow,
  buildUnitRow,
  parseImportRows,
  RowRejected,
} from '../../src/modules/portfolio-imports/domain/import-rows';

describe('Import de portefeuille — lecture CSV (domaine pur)', () => {
  it('découpe les lignes, numérote par position réelle et ignore les vides', () => {
    const csv = 'BAILLEUR;L1;Ngoma;;;+242061000001\n\nBIEN;B1;L1;Résidence;12 rue Test;Poto-Poto\n';
    const rows = parseImportRows(Buffer.from(csv, 'utf8'));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ line: 1, type: 'BAILLEUR' });
    // La ligne vide (2) compte dans la numérotation : BIEN est en ligne 3.
    expect(rows[1]).toMatchObject({ line: 3, type: 'BIEN' });
  });

  it('BAILLEUR avec raison sociale : COMPANY, sans nom de famille', () => {
    const parsed = buildLandlordRow(['L1', '', '', 'Congo Immo SARL', '+242061000001']);
    expect(parsed.localRef).toBe('L1');
    expect(parsed.input.partyType).toBe('COMPANY');
    expect(parsed.input.companyName).toBe('Congo Immo SARL');
  });

  it('BAILLEUR sans raison sociale : INDIVIDUAL', () => {
    const parsed = buildLandlordRow(['L1', 'Ngoma', 'Paul', '', '']);
    expect(parsed.input.partyType).toBe('INDIVIDUAL');
    expect(parsed.input.lastName).toBe('Ngoma');
  });

  it('BIEN : référence locale et référence du bailleur obligatoires', () => {
    expect(() => buildPropertyRow(['', 'L1', 'Nom', 'Adresse', 'Quartier'])).toThrow(RowRejected);
    const parsed = buildPropertyRow(['B1', 'L1', 'Résidence', '12 rue Test', 'Poto-Poto']);
    expect(parsed).toMatchObject({
      localRef: 'B1',
      landlordRef: 'L1',
      input: { name: 'Résidence', addressLine: '12 rue Test', district: 'Poto-Poto' },
    });
  });

  it('LOT : montants numériques optionnels, rejette une valeur non numérique', () => {
    const parsed = buildUnitRow(['U1', 'B1', 'A1', '120000', '2']);
    expect(parsed.input).toMatchObject({ code: 'A1', baseRentAmount: 120_000, depositMonths: 2 });
    expect(() => buildUnitRow(['U1', 'B1', 'A1', 'abc'])).toThrow(RowRejected);
  });

  it('LOCATAIRE : téléphone obligatoire — colonne manquante rejetée', () => {
    expect(() => buildTenantRow(['T1', 'Poaty', 'Jean'])).toThrow(RowRejected);
    const parsed = buildTenantRow(['T1', 'Poaty', 'Jean', '+242061000002']);
    expect(parsed.input.primaryPhone).toBe('+242061000002');
  });

  it('BAIL : loyer entier obligatoire — motif précis sur une valeur invalide', () => {
    expect(() => buildLeaseRow(['U1', 'T1', '2026-01-01', ''])).toThrow(/loyer/);
    const parsed = buildLeaseRow(['U1', 'T1', '2026-01-01', '150000']);
    expect(parsed).toMatchObject({
      unitRef: 'U1',
      tenantRef: 'T1',
      input: { startDate: '2026-01-01', rentAmount: 150_000 },
    });
  });
});
