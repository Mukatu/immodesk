import { DomainError } from '../../src/shared/errors/domain-error';
import { decodeCursor, encodeCursor } from '../../src/shared/pagination/cursor';
import { sortByDependencies } from '../../src/modules/mobile-sync/domain/dependency-sort';
import { classifyDomainError } from '../../src/modules/mobile-sync/domain/error-classification';
import { recomputeBatchCounts } from '../../src/modules/mobile-sync/domain/sync-batch-counts';
import {
  decodeConflictId,
  encodeConflictId,
} from '../../src/modules/mobile-sync/domain/sync-conflict-types';
import { SYNC_INTERNAL_CODES } from '../../src/modules/mobile-sync/domain/sync-types';

const SECRET = 'test-cursor-secret-suffisamment-long';

describe('mobile-sync : tri par dépendances', () => {
  it('ordonne une chaîne de dépendances quel que soit l’ordre d’arrivée', () => {
    const ops = [
      { clientRef: 'c', dependsOn: ['b'], clientCreatedAt: '2026-01-01T00:00:03.000Z' },
      { clientRef: 'a', dependsOn: [], clientCreatedAt: '2026-01-01T00:00:01.000Z' },
      { clientRef: 'b', dependsOn: ['a'], clientCreatedAt: '2026-01-01T00:00:02.000Z' },
    ];
    const { order, skipped } = sortByDependencies(ops);
    expect(order).toEqual(['a', 'b', 'c']);
    expect(skipped.size).toBe(0);
  });

  it('départage par clientCreatedAt croissant entre opérations sans dépendance', () => {
    const ops = [
      { clientRef: 'later', dependsOn: [], clientCreatedAt: '2026-01-01T00:00:05.000Z' },
      { clientRef: 'earlier', dependsOn: [], clientCreatedAt: '2026-01-01T00:00:01.000Z' },
    ];
    const { order } = sortByDependencies(ops);
    expect(order).toEqual(['earlier', 'later']);
  });

  it('marque SYNC.DEPENDENCY_REJECTED une opération dont la dépendance est absente du lot', () => {
    const ops = [
      { clientRef: 'x', dependsOn: ['inconnu'], clientCreatedAt: '2026-01-01T00:00:00.000Z' },
    ];
    const { order, skipped } = sortByDependencies(ops);
    expect(order).toEqual([]);
    expect(skipped.get('x')).toBe(SYNC_INTERNAL_CODES.DEPENDENCY_REJECTED);
  });

  it('propage SYNC.DEPENDENCY_REJECTED en cascade sur les dépendants d’une opération inapplicable', () => {
    const ops = [
      { clientRef: 'root', dependsOn: ['inconnu'], clientCreatedAt: '2026-01-01T00:00:00.000Z' },
      { clientRef: 'child', dependsOn: ['root'], clientCreatedAt: '2026-01-01T00:00:01.000Z' },
    ];
    const { order, skipped } = sortByDependencies(ops);
    expect(order).toEqual([]);
    expect(skipped.get('root')).toBe(SYNC_INTERNAL_CODES.DEPENDENCY_REJECTED);
    expect(skipped.get('child')).toBe(SYNC_INTERNAL_CODES.DEPENDENCY_REJECTED);
  });

  it('détecte un cycle véritable entre deux opérations par ailleurs résolubles', () => {
    const ops = [
      { clientRef: 'a', dependsOn: ['b'], clientCreatedAt: '2026-01-01T00:00:00.000Z' },
      { clientRef: 'b', dependsOn: ['a'], clientCreatedAt: '2026-01-01T00:00:01.000Z' },
    ];
    const { order, skipped } = sortByDependencies(ops);
    expect(order).toEqual([]);
    expect(skipped.get('a')).toBe(SYNC_INTERNAL_CODES.DEPENDENCY_CYCLE);
    expect(skipped.get('b')).toBe(SYNC_INTERNAL_CODES.DEPENDENCY_CYCLE);
  });

  it('résout le reste du lot autour d’un cycle isolé', () => {
    const ops = [
      { clientRef: 'a', dependsOn: ['b'], clientCreatedAt: '2026-01-01T00:00:00.000Z' },
      { clientRef: 'b', dependsOn: ['a'], clientCreatedAt: '2026-01-01T00:00:01.000Z' },
      { clientRef: 'c', dependsOn: [], clientCreatedAt: '2026-01-01T00:00:02.000Z' },
    ];
    const { order, skipped } = sortByDependencies(ops);
    expect(order).toEqual(['c']);
    expect(skipped.size).toBe(2);
  });

  it('ignore une auto-dépendance en la traitant comme inapplicable, sans boucler', () => {
    const ops = [
      { clientRef: 'self', dependsOn: ['self'], clientCreatedAt: '2026-01-01T00:00:00.000Z' },
    ];
    const { skipped } = sortByDependencies(ops);
    expect(skipped.get('self')).toBe(SYNC_INTERNAL_CODES.DEPENDENCY_REJECTED);
  });
});

describe('mobile-sync : classification des erreurs métier', () => {
  it('classe un changement de serveur en CONFLICT, jamais rejouable automatiquement', () => {
    const verdict = classifyDomainError(new DomainError('PAYMENTS.INVOICE_NOT_OPEN'));
    expect(verdict).toEqual({
      outcome: 'CONFLICT',
      code: 'PAYMENTS.INVOICE_NOT_OPEN',
      message: expect.any(String),
      retryable: false,
    });
  });

  it('classe une règle métier définitive en REJECTED', () => {
    const verdict = classifyDomainError(new DomainError('CASH.SIGNATURE_REQUIRED'));
    expect(verdict?.outcome).toBe('REJECTED');
    expect(verdict?.retryable).toBe(false);
  });

  it('renvoie null pour une erreur qui n’est pas une DomainError', () => {
    expect(classifyDomainError(new Error('panne'))).toBeNull();
  });
});

describe('mobile-sync : compteurs et statut du lot', () => {
  it('APPLIED quand toutes les opérations sont appliquées ou dupliquées', () => {
    const counts = recomputeBatchCounts([{ outcome: 'APPLIED' }, { outcome: 'DUPLICATE' }]);
    expect(counts).toEqual({
      appliedCount: 2,
      rejectedCount: 0,
      conflictsCount: 0,
      status: 'APPLIED',
    });
  });

  it('REJECTED quand aucune n’est appliquée', () => {
    const counts = recomputeBatchCounts([{ outcome: 'REJECTED' }, { outcome: 'SKIPPED' }]);
    expect(counts.status).toBe('REJECTED');
    expect(counts.appliedCount).toBe(0);
  });

  it('PARTIALLY_APPLIED quand succès et échecs se mêlent, un conflit non résolu compte à part', () => {
    const counts = recomputeBatchCounts([
      { outcome: 'APPLIED' },
      { outcome: 'REJECTED' },
      { outcome: 'CONFLICT', resolution: null },
    ]);
    expect(counts).toEqual({
      appliedCount: 1,
      rejectedCount: 1,
      conflictsCount: 1,
      status: 'PARTIALLY_APPLIED',
    });
  });

  it('un conflit résolu en APPLY rejoint les appliqués, en DISCARD les rejetés', () => {
    const applied = recomputeBatchCounts([{ outcome: 'CONFLICT', resolution: 'APPLIED' }]);
    expect(applied).toEqual({
      appliedCount: 1,
      rejectedCount: 0,
      conflictsCount: 0,
      status: 'APPLIED',
    });

    const discarded = recomputeBatchCounts([{ outcome: 'CONFLICT', resolution: 'DISCARDED' }]);
    expect(discarded).toEqual({
      appliedCount: 0,
      rejectedCount: 1,
      conflictsCount: 0,
      status: 'REJECTED',
    });
  });
});

describe('mobile-sync : identifiants et curseurs signés', () => {
  it('encode puis décode un identifiant de conflit (batchId + clientRef)', () => {
    const id = encodeConflictId(
      '11111111-1111-1111-1111-111111111111',
      '01HZY000000000000000000000',
    );
    expect(decodeConflictId(id)).toEqual({
      batchId: '11111111-1111-1111-1111-111111111111',
      clientRef: '01HZY000000000000000000000',
    });
  });

  it('refuse un identifiant de conflit illisible avec SYNC.CONFLICT_NOT_FOUND', () => {
    expect(() => decodeConflictId('***')).toThrow(DomainError);
    try {
      decodeConflictId('***');
    } catch (error) {
      expect((error as DomainError).code).toBe('SYNC.CONFLICT_NOT_FOUND');
    }
  });

  it('le curseur de `GET /v1/sync/pull` est signé comme les curseurs de pagination existants', () => {
    const watermark = new Date('2026-03-01T10:00:00.000Z').toISOString();
    const cursor = encodeCursor({ createdAt: watermark, id: 'sync-pull' }, SECRET);
    expect(decodeCursor(cursor, SECRET)).toEqual({ createdAt: watermark, id: 'sync-pull' });
    expect(() => decodeCursor(cursor, 'un-autre-secret-tout-aussi-long')).toThrow(DomainError);
  });
});
