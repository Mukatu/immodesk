import {
  generateApiKeySecret,
  hashApiKeySecret,
} from '../../src/modules/security/domain/api-key-secret';

describe('api-key-secret', () => {
  it('génère un secret préfixé et un préfixe public de 8 caractères', () => {
    const { secret, prefix } = generateApiKeySecret();
    expect(secret.startsWith('imk_')).toBe(true);
    expect(prefix).toHaveLength(8);
    expect(secret).toContain(prefix);
  });

  it('génère un secret différent à chaque appel (haute entropie)', () => {
    const a = generateApiKeySecret();
    const b = generateApiKeySecret();
    expect(a.secret).not.toBe(b.secret);
    expect(a.prefix).not.toBe(b.prefix);
  });

  it('hache le secret de façon déterministe', () => {
    const { secret } = generateApiKeySecret();
    expect(hashApiKeySecret(secret)).toBe(hashApiKeySecret(secret));
  });

  it('deux secrets distincts produisent des condensats distincts', () => {
    const a = generateApiKeySecret();
    const b = generateApiKeySecret();
    expect(hashApiKeySecret(a.secret)).not.toBe(hashApiKeySecret(b.secret));
  });

  it('ne stocke jamais le secret en clair : le condensat ne le contient pas', () => {
    const { secret } = generateApiKeySecret();
    const hash = hashApiKeySecret(secret);
    expect(hash).not.toContain(secret);
    // SHA-256 hex : 64 caractères.
    expect(hash).toHaveLength(64);
  });
});
