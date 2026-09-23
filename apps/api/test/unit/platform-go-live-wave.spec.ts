import {
  assertWaveKnown,
  assertWaveSize,
  evaluateGoLiveStatus,
  WaveTooLargeError,
  WaveUnknownError,
  type GoLiveOrgSignal,
} from '../../src/modules/platform/domain/go-live-wave';

/**
 * Tests unitaires purs : éligibilité et statut d'une vague de go-live
 * (docs/api/phase11-contract.md, § 11.F, arbitrages 15 et 18).
 */
describe('assertWaveSize', () => {
  it('laisse passer une vague dans la limite', () => {
    expect(() => assertWaveSize(25, 25)).not.toThrow();
  });

  it('refuse une vague trop large', () => {
    expect(() => assertWaveSize(26, 25)).toThrow(WaveTooLargeError);
  });
});

describe('assertWaveKnown', () => {
  it('accepte une vague déjà connue même sans organisation fournie', () => {
    expect(() => assertWaveKnown('wave-1', 3, 0)).not.toThrow();
  });

  it('accepte une vague inédite dès qu’on lui fournit des organisations', () => {
    expect(() => assertWaveKnown('wave-2', 0, 2)).not.toThrow();
  });

  it('refuse une vague ni connue ni fournie', () => {
    expect(() => assertWaveKnown('wave-3', 0, 0)).toThrow(WaveUnknownError);
  });
});

function baseSignal(overrides: Partial<GoLiveOrgSignal> = {}): GoLiveOrgSignal {
  return {
    flagEnabled: true,
    startsAt: null,
    endsAt: null,
    now: new Date('2026-09-23T10:00:00.000Z'),
    subscriptionStatus: 'ACTIVE',
    denialsLast24h: 0,
    denialThreshold: 20,
    messageFailureRate: null,
    messageFailureThreshold: 0.2,
    onboardingComplete: true,
    ...overrides,
  };
}

describe('evaluateGoLiveStatus', () => {
  it('est PENDING quand le drapeau n’est pas actif', () => {
    const result = evaluateGoLiveStatus(baseSignal({ flagEnabled: false }));
    expect(result).toEqual({ status: 'PENDING', anomalies: [] });
  });

  it('est PENDING avant `startsAt`', () => {
    const result = evaluateGoLiveStatus(
      baseSignal({ startsAt: new Date('2026-10-01T00:00:00.000Z') }),
    );
    expect(result.status).toBe('PENDING');
  });

  it('est PENDING après `endsAt`', () => {
    const result = evaluateGoLiveStatus(
      baseSignal({ endsAt: new Date('2026-09-01T00:00:00.000Z') }),
    );
    expect(result.status).toBe('PENDING');
  });

  it('est MIGRATED quand le drapeau est actif, dans sa fenêtre et sans signal', () => {
    const result = evaluateGoLiveStatus(baseSignal());
    expect(result).toEqual({ status: 'MIGRATED', anomalies: [] });
  });

  it('est ANOMALY sur un abonnement PAST_DUE', () => {
    const result = evaluateGoLiveStatus(baseSignal({ subscriptionStatus: 'PAST_DUE' }));
    expect(result.status).toBe('ANOMALY');
    expect(result.anomalies).toHaveLength(1);
  });

  it('est ANOMALY au-delà du seuil de refus quotidien', () => {
    const result = evaluateGoLiveStatus(baseSignal({ denialsLast24h: 21, denialThreshold: 20 }));
    expect(result.status).toBe('ANOMALY');
  });

  it('est ANOMALY au-delà du taux de messages en échec', () => {
    const result = evaluateGoLiveStatus(
      baseSignal({ messageFailureRate: 0.5, messageFailureThreshold: 0.2 }),
    );
    expect(result.status).toBe('ANOMALY');
  });

  it('cumule plusieurs motifs d’anomalie', () => {
    const result = evaluateGoLiveStatus(
      baseSignal({ subscriptionStatus: 'SUSPENDED', onboardingComplete: false }),
    );
    expect(result.status).toBe('ANOMALY');
    expect(result.anomalies).toHaveLength(2);
  });
});
