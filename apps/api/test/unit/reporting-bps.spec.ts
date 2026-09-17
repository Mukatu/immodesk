import { shareBps, toBps } from '../../src/modules/reporting/domain/bps';

describe('Taux en points de base (reporting)', () => {
  it('calcule un taux exact quand la division tombe juste', () => {
    expect(toBps(5_000n, 10_000n)).toBe(5_000);
    expect(toBps(10_000n, 10_000n)).toBe(10_000);
    expect(toBps(0n, 10_000n)).toBe(0);
  });

  it('arrondit au plus proche plutôt que de tronquer', () => {
    // 1/3 = 3333,33... bps → arrondi à 3333.
    expect(toBps(1n, 3n)).toBe(3_333);
    // 2/3 = 6666,66... bps → arrondi à 6667.
    expect(toBps(2n, 3n)).toBe(6_667);
  });

  it('renvoie 0 sur un dénominateur nul ou négatif, sans exception', () => {
    expect(toBps(100n, 0n)).toBe(0);
    expect(toBps(100n, -1n)).toBe(0);
  });

  it('shareBps est un alias direct de toBps', () => {
    expect(shareBps(3_000n, 12_000n)).toBe(toBps(3_000n, 12_000n));
  });
});
