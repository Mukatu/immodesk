import { isAllowedPdfResource } from '../../src/modules/pdf/infrastructure/pdf-browser.service';

/** Rendu PDF sans réseau : seules les ressources incorporées au HTML passent. */
describe('isAllowedPdfResource', () => {
  it.each(['data:image/png;base64,iVBORw0KGgo=', 'DATA:image/svg+xml,<svg/>', 'about:blank'])(
    'autorise %s',
    (url) => {
      expect(isAllowedPdfResource(url)).toBe(true);
    },
  );

  it.each([
    'http://immodesk-minio:9000/immodesk/org/x.jpg',
    'https://exemple.org/pixel.gif',
    'file:///etc/passwd',
    'http://169.254.169.254/latest/meta-data/',
    'ws://immodesk-api:3000',
    'javascript:alert(1)',
    'pas-une-url',
  ])('refuse %s', (url) => {
    expect(isAllowedPdfResource(url)).toBe(false);
  });
});
