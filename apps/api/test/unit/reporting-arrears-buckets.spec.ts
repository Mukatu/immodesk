import { parseIsoDate } from '../../src/modules/leases/domain/calendar';
import {
  bucketForDaysOverdue,
  daysOverdueAt,
} from '../../src/modules/reporting/domain/arrears-buckets';

// Dates ANCRÉES explicitement : jamais `new Date()`, jamais la date du jour.
// Ce piège a déjà rendu l'intégration continue rouge sur ce projet.
const ASOF = parseIsoDate('2026-09-17');

describe('Tranches d’ancienneté des impayés (reporting)', () => {
  it('ne compte aucun retard pour une échéance future ou du jour même', () => {
    expect(daysOverdueAt(parseIsoDate('2026-09-17'), ASOF)).toBe(0);
    expect(daysOverdueAt(parseIsoDate('2026-10-01'), ASOF)).toBe(0);
  });

  it('calcule le nombre de jours de retard depuis la date d’échéance', () => {
    expect(daysOverdueAt(parseIsoDate('2026-09-01'), ASOF)).toBe(16);
    expect(daysOverdueAt(parseIsoDate('2026-06-01'), ASOF)).toBe(108);
  });

  it('range dans la tranche 0-30 aux deux bornes', () => {
    expect(bucketForDaysOverdue(0)).toBe('0-30');
    expect(bucketForDaysOverdue(30)).toBe('0-30');
  });

  it('bascule en 31-60 juste après la borne de 30 jours', () => {
    expect(bucketForDaysOverdue(31)).toBe('31-60');
    expect(bucketForDaysOverdue(60)).toBe('31-60');
  });

  it('bascule en 61-90 juste après la borne de 60 jours', () => {
    expect(bucketForDaysOverdue(61)).toBe('61-90');
    expect(bucketForDaysOverdue(90)).toBe('61-90');
  });

  it('bascule en 90+ strictement au-delà de 90 jours', () => {
    expect(bucketForDaysOverdue(91)).toBe('90+');
    expect(bucketForDaysOverdue(365)).toBe('90+');
  });

  it('compose daysOverdueAt et bucketForDaysOverdue sur une échéance ancienne', () => {
    const dueDate = parseIsoDate('2026-05-01');
    const days = daysOverdueAt(dueDate, ASOF);
    expect(days).toBe(139);
    expect(bucketForDaysOverdue(days)).toBe('90+');
  });
});
