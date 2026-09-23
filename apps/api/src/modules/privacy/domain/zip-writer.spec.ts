import { buildZip, crc32 } from './zip-writer';

describe('buildZip', () => {
  it('produit une archive avec la signature locale, la centrale et la fin', () => {
    const zip = buildZip([
      { fileName: 'manifest.json', content: Buffer.from('{"ok":true}', 'utf8') },
      { fileName: 'tenants.csv', content: Buffer.from('id;nom\r\n1;Test\r\n', 'utf8') },
    ]);
    // Signature locale du premier fichier.
    expect(zip.readUInt32LE(0)).toBe(0x04034b50);
    // La fin de l'archive porte la signature de fin de répertoire central.
    expect(zip.readUInt32LE(zip.byteLength - 22)).toBe(0x06054b50);
    // Deux entrées déclarées dans l'enregistrement de fin.
    expect(zip.readUInt16LE(zip.byteLength - 22 + 10)).toBe(2);
  });

  it('rend une archive vide valide (zéro entrée)', () => {
    const zip = buildZip([]);
    expect(zip.byteLength).toBe(22);
    expect(zip.readUInt32LE(0)).toBe(0x06054b50);
  });

  it('conserve exactement le contenu de chaque fichier (taille compressée = taille non compressée, méthode STORE)', () => {
    const content = Buffer.from('a'.repeat(500), 'utf8');
    const zip = buildZip([{ fileName: 'big.csv', content }]);
    // Taille non compressée à l'offset 22 du header local (après signature, version, flags, méthode, heure, date, crc).
    expect(zip.readUInt32LE(18)).toBe(500);
    expect(zip.readUInt32LE(22)).toBe(500);
  });
});

describe('crc32', () => {
  it('rend 0 pour un buffer vide', () => {
    expect(crc32(Buffer.alloc(0))).toBe(0);
  });

  it('est déterministe et différent pour des contenus différents', () => {
    const a = crc32(Buffer.from('immodesk', 'utf8'));
    const b = crc32(Buffer.from('immodesk', 'utf8'));
    const c = crc32(Buffer.from('Immodesk', 'utf8'));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('correspond à la valeur CRC-32 connue de "123456789"', () => {
    // Vecteur de test standard du polynôme CRC-32 (IEEE 802.3) : 0xCBF43926.
    expect(crc32(Buffer.from('123456789', 'ascii'))).toBe(0xcbf43926);
  });
});
