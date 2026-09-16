import { DomainError } from '../../src/shared/errors/domain-error';
import {
  assertNotLocked,
  compareConditions,
  conditionLevel,
  isPhotoRequired,
} from '../../src/modules/inspections/domain/inspection-rules';
import {
  assertTransition,
  computeSlaDueAt,
  isTerminal,
} from '../../src/modules/maintenance/domain/maintenance-rules';

describe('Verrouillage d’un état des lieux signé (contrat, arbitrage 3)', () => {
  it('refuse toute modification une fois SIGNED', () => {
    expect(() => assertNotLocked('SIGNED')).toThrow(DomainError);
    try {
      assertNotLocked('SIGNED');
    } catch (error) {
      expect((error as DomainError).code).toBe('INSPECTIONS.LOCKED');
    }
  });

  it('reste verrouillé après contestation ou annulation', () => {
    expect(() => assertNotLocked('DISPUTED')).toThrow(DomainError);
    expect(() => assertNotLocked('CANCELLED')).toThrow(DomainError);
  });

  it('autorise la modification tant que le constat n’est pas signé', () => {
    expect(() => assertNotLocked('DRAFT')).not.toThrow();
    expect(() => assertNotLocked('IN_PROGRESS')).not.toThrow();
    expect(() => assertNotLocked('PENDING_SIGNATURE')).not.toThrow();
  });
});

describe('Photo obligatoire dès un état dégradé (contrat, arbitrage 6)', () => {
  it('aucune photo exigée sur un poste en bon état', () => {
    expect(isPhotoRequired('NEW', 'POOR')).toBe(false);
    expect(isPhotoRequired('GOOD', 'POOR')).toBe(false);
    expect(isPhotoRequired('FAIR', 'POOR')).toBe(false);
  });

  it('devient obligatoire à partir du seuil paramétré', () => {
    expect(isPhotoRequired('POOR', 'POOR')).toBe(true);
    expect(isPhotoRequired('DAMAGED', 'POOR')).toBe(true);
    expect(isPhotoRequired('MISSING', 'POOR')).toBe(true);
    expect(isPhotoRequired('POOR', 'DAMAGED')).toBe(false);
    expect(isPhotoRequired('DAMAGED', 'DAMAGED')).toBe(true);
  });
});

describe('Comparaison entrée/sortie', () => {
  it('classe un écart comme dégradé et compte les niveaux', () => {
    expect(conditionLevel('GOOD')).toBeLessThan(conditionLevel('DAMAGED'));
    const { degradationLevels, status } = compareConditions('GOOD', 'DAMAGED');
    expect(status).toBe('DEGRADED');
    expect(degradationLevels).toBe(conditionLevel('DAMAGED') - conditionLevel('GOOD'));
  });

  it('signale un poste présent seulement à l’entrée comme disparu', () => {
    expect(compareConditions('GOOD', null).status).toBe('MISSING');
  });

  it('signale un poste présent seulement à la sortie comme ajouté', () => {
    expect(compareConditions(null, 'GOOD').status).toBe('ADDED');
  });

  it('un état inchangé ou amélioré n’est jamais dégradé', () => {
    expect(compareConditions('GOOD', 'GOOD').status).toBe('UNCHANGED');
    expect(compareConditions('DAMAGED', 'GOOD').status).toBe('IMPROVED');
  });
});

describe('Machine à états de la maintenance (huit statuts)', () => {
  it('suit le cycle nominal signalement → clôture', () => {
    expect(() => assertTransition('OPEN', 'ACKNOWLEDGED')).not.toThrow();
    expect(() => assertTransition('ACKNOWLEDGED', 'ASSIGNED')).not.toThrow();
    expect(() => assertTransition('ASSIGNED', 'IN_PROGRESS')).not.toThrow();
    expect(() => assertTransition('IN_PROGRESS', 'RESOLVED')).not.toThrow();
    expect(() => assertTransition('RESOLVED', 'CLOSED')).not.toThrow();
  });

  it('refuse de sauter directement de OPEN à RESOLVED', () => {
    expect(() => assertTransition('OPEN', 'RESOLVED')).toThrow(DomainError);
  });

  it('refuse toute transition depuis un statut terminal', () => {
    expect(() => assertTransition('CLOSED', 'IN_PROGRESS')).toThrow(DomainError);
    expect(() => assertTransition('REJECTED', 'OPEN')).toThrow(DomainError);
    expect(isTerminal('CLOSED')).toBe(true);
    expect(isTerminal('REJECTED')).toBe(true);
    expect(isTerminal('OPEN')).toBe(false);
  });

  it('autorise le refus depuis tout statut non terminal', () => {
    expect(() => assertTransition('OPEN', 'REJECTED')).not.toThrow();
    expect(() => assertTransition('ASSIGNED', 'REJECTED')).not.toThrow();
  });

  it('autorise la mise en suspens puis la reprise', () => {
    expect(() => assertTransition('IN_PROGRESS', 'ON_HOLD')).not.toThrow();
    expect(() => assertTransition('ON_HOLD', 'IN_PROGRESS')).not.toThrow();
  });

  it('délai cible : heures pour URGENT/HIGH, jours ouvrés pour NORMAL', () => {
    const reportedAt = new Date('2026-09-15T08:00:00.000Z'); // mardi
    const slaHours = { URGENT: 4, HIGH: 24, NORMAL: 120, LOW: 360 };
    expect(computeSlaDueAt('URGENT', reportedAt, slaHours).getTime() - reportedAt.getTime()).toBe(
      4 * 3_600_000,
    );
    expect(computeSlaDueAt('HIGH', reportedAt, slaHours).getTime() - reportedAt.getTime()).toBe(
      24 * 3_600_000,
    );
    // 5 jours ouvrés depuis mardi 15/09 → mardi 22/09 (saute le week-end).
    const normalDue = computeSlaDueAt('NORMAL', reportedAt, slaHours);
    expect(normalDue.toISOString().slice(0, 10)).toBe('2026-09-22');
  });
});
