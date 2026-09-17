import { averageVacancyDays } from '../../src/modules/reporting/domain/vacancy';

describe('Durée moyenne de vacance (reporting)', () => {
  it('renvoie 0 pour un portefeuille sans lot vacant avec historique', () => {
    expect(averageVacancyDays([])).toBe(0);
  });

  it('moyenne simple, arrondie à l’entier', () => {
    expect(averageVacancyDays([10, 20, 30])).toBe(20);
    // (10 + 15) / 2 = 12,5 → arrondi à 13.
    expect(averageVacancyDays([10, 15])).toBe(13);
  });

  it('ne laisse jamais une durée négative fausser la moyenne à la baisse', () => {
    expect(averageVacancyDays([-5, 15])).toBe(8); // (0 + 15) / 2 = 7,5 → 8
  });

  it('un seul lot vacant renvoie sa propre durée', () => {
    expect(averageVacancyDays([42])).toBe(42);
  });
});
