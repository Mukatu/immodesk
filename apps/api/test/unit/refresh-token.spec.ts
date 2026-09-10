import {
  decideRotation,
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiresAt,
  type RefreshTokenSnapshot,
} from '../../src/modules/identity/domain/refresh-token';

const NOW = new Date('2026-03-05T09:00:00.000Z');

function snapshot(overrides: Partial<RefreshTokenSnapshot> = {}): RefreshTokenSnapshot {
  return {
    id: 'token-1',
    userId: 'user-1',
    familyId: 'family-1',
    expiresAt: new Date(NOW.getTime() + 86_400_000),
    revokedAt: null,
    ...overrides,
  };
}

describe('Génération et hachage du refresh token', () => {
  it('produit une valeur opaque différente à chaque appel', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateRefreshToken()));
    expect(tokens.size).toBe(100);
  });

  it('ne stocke que le condensat, jamais le jeton', () => {
    const token = generateRefreshToken();
    const hash = hashRefreshToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(token);
  });

  it('est déterministe : le même jeton donne le même condensat', () => {
    const token = generateRefreshToken();
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
  });

  it('expire trente jours après émission', () => {
    const expiresAt = refreshExpiresAt(NOW, 30);
    expect(expiresAt.getTime() - NOW.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

describe('Rotation du refresh token', () => {
  it('fait tourner un jeton valide dans la même famille', () => {
    expect(decideRotation(snapshot(), NOW)).toEqual({ outcome: 'ROTATE', familyId: 'family-1' });
  });

  it('rejette un jeton inconnu', () => {
    expect(decideRotation(null, NOW)).toEqual({ outcome: 'NOT_FOUND' });
  });

  it('rejette un jeton expiré', () => {
    const verdict = decideRotation(snapshot({ expiresAt: new Date(NOW.getTime() - 1) }), NOW);
    expect(verdict).toEqual({ outcome: 'EXPIRED', familyId: 'family-1' });
  });

  it("détecte le rejeu d'un jeton révoqué et désigne la famille à révoquer", () => {
    const verdict = decideRotation(snapshot({ revokedAt: NOW }), NOW);
    expect(verdict).toEqual({ outcome: 'REUSE_DETECTED', familyId: 'family-1' });
  });

  it('traite la révocation en priorité sur l’expiration', () => {
    // Un jeton à la fois révoqué et expiré est d'abord un vol présumé :
    // c'est la révocation de famille qui doit primer.
    const verdict = decideRotation(
      snapshot({ revokedAt: NOW, expiresAt: new Date(NOW.getTime() - 1) }),
      NOW,
    );
    expect(verdict.outcome).toBe('REUSE_DETECTED');
  });
});
