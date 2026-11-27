import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAX_IMAGE_BYTES, MAX_PDF_BYTES } from '../../src/modules/documents/domain/document-rules';

/**
 * Source de vérité des plafonds d'envoi : document-rules.ts (API). Le proxy et
 * le web en sont des copies : ce test échoue si elles dérivent (docs/10 § 6).
 */
const REPO = join(__dirname, '..', '..', '..', '..');
const read = (relative: string): string => readFileSync(join(REPO, relative), 'utf8');
const MIB = 1024 * 1024;

describe('Plafonds d envoi alignés', () => {
  it('Caddy (stockage) laisse une petite marge au-dessus du plus grand plafond de l API', () => {
    const caddy = read('infra/deploy/caddy/sites/immodesk.caddy');
    const bloc = caddy.slice(caddy.indexOf('{$IMMODESK_S3_HOST}'));
    const match = /max_size (\d+)MiB/.exec(bloc);
    expect(match).not.toBeNull();
    const proxyBytes = Number(match?.[1]) * MIB;
    const apiMax = Math.max(MAX_IMAGE_BYTES, MAX_PDF_BYTES);
    expect(proxyBytes).toBeGreaterThan(apiMax);
    expect(proxyBytes - apiMax).toBeLessThanOrEqual(2 * MIB);
  });

  it('le web reprend les mêmes plafonds (15 Mo image, 25 Mo PDF)', () => {
    const web = read('apps/web/src/components/business/document-uploader.tsx');
    expect(web).toContain(`MAX_IMAGE_SIZE_BYTES = ${MAX_IMAGE_BYTES / MIB} * 1024 * 1024`);
    expect(web).toContain(`MAX_PDF_SIZE_BYTES = ${MAX_PDF_BYTES / MIB} * 1024 * 1024`);
  });
});
