import {
  appendIncidentUpdate,
  assertNoOpenIncident,
  declareIncident,
  IncidentAlreadyOpenError,
  IncidentNotFoundError,
  requireOpenIncident,
  resolveIncident,
} from '../../src/modules/platform/domain/incident';

/**
 * Tests unitaires purs : transitions d'un incident de plateforme
 * (docs/api/phase11-contract.md, § 11.F, arbitrage 14 — un seul incident
 * courant à la fois).
 */
describe('assertNoOpenIncident', () => {
  it('laisse déclarer un premier incident (aucun courant)', () => {
    expect(() => assertNoOpenIncident(null)).not.toThrow();
  });

  it('laisse déclarer un incident après résolution du précédent', () => {
    const resolved = declareIncident({
      reference: 'INC-1',
      title: 'Panne',
      severity: 'MAJOR',
      startedAt: new Date('2026-09-01T00:00:00.000Z'),
    });
    resolved.resolvedAt = new Date('2026-09-01T01:00:00.000Z').toISOString();
    expect(() => assertNoOpenIncident(resolved)).not.toThrow();
  });

  it('refuse un second incident tant que le courant est ouvert', () => {
    const open = declareIncident({
      reference: 'INC-1',
      title: 'Panne',
      severity: 'MAJOR',
      startedAt: new Date(),
    });
    expect(() => assertNoOpenIncident(open)).toThrow(IncidentAlreadyOpenError);
  });
});

describe('requireOpenIncident', () => {
  it('lève si aucun incident courant', () => {
    expect(() => requireOpenIncident(null)).toThrow(IncidentNotFoundError);
  });

  it('lève si le seul incident connu est déjà résolu', () => {
    const incident = declareIncident({
      reference: 'INC-1',
      title: 'Panne',
      severity: 'MINOR',
      startedAt: new Date(),
    });
    const resolved = resolveIncident(incident, new Date());
    expect(() => requireOpenIncident(resolved)).toThrow(IncidentNotFoundError);
  });
});

describe('appendIncidentUpdate / resolveIncident', () => {
  it('ajoute une mise à jour à un incident ouvert', () => {
    const incident = declareIncident({
      reference: 'INC-1',
      title: 'Panne base de données',
      severity: 'CRITICAL',
      startedAt: new Date('2026-09-01T00:00:00.000Z'),
    });
    const updated = appendIncidentUpdate(
      incident,
      'Investigation en cours.',
      new Date('2026-09-01T00:10:00.000Z'),
    );
    expect(updated.updates).toHaveLength(1);
    expect(updated.updates[0]).toEqual({
      at: '2026-09-01T00:10:00.000Z',
      message: 'Investigation en cours.',
    });
    expect(updated.resolvedAt).toBeNull();
  });

  it('résout un incident ouvert et fige la suite des mises à jour', () => {
    const incident = declareIncident({
      reference: 'INC-1',
      title: 'Panne',
      severity: 'MAJOR',
      startedAt: new Date('2026-09-01T00:00:00.000Z'),
    });
    const resolved = resolveIncident(incident, new Date('2026-09-01T02:00:00.000Z'));
    expect(resolved.resolvedAt).toBe('2026-09-01T02:00:00.000Z');
  });

  it('refuse de mettre à jour ou de résoudre un incident déjà résolu', () => {
    const incident = declareIncident({
      reference: 'INC-1',
      title: 'Panne',
      severity: 'MAJOR',
      startedAt: new Date(),
    });
    const resolved = resolveIncident(incident, new Date());
    expect(() => appendIncidentUpdate(resolved, 'trop tard', new Date())).toThrow(
      IncidentNotFoundError,
    );
    expect(() => resolveIncident(resolved, new Date())).toThrow(IncidentNotFoundError);
  });
});
