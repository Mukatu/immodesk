import { ImageResponse } from 'next/og';

// Icône d'application (PWA / onglet navigateur), générée à la compilation.
// Reprend le bloc de marque de app-shell.tsx : carré arrondi au fond rose
// (--primary du thème clair, voir manifest.ts pour le calcul HSL → hex),
// initiale « I » en blanc gras et centrée.

export const size = { width: 192, height: 192 };
export const contentType = 'image/png';
// force-dynamic : contourne un bug connu de @vercel/og (bundlé par Next 15.1.3) sous
// Windows — le chargement de sa police par défaut échoue avec `TypeError: Invalid URL`
// dès que Next tente de générer l'icône au moment du build (prérendu statique). En
// dynamique, la génération est reportée à la première requête, où le bug ne se produit
// pas (environnement de prod Linux). Le contenu est de toute façon statique image par
// image (aucune dépendance à la requête) ; les en-têtes cache-control de ImageResponse
// (immutable, un an) évitent toute régénération répétée côté navigateur.
export const dynamic = 'force-dynamic';

const PRIMARY_HEX = '#EC4699';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: PRIMARY_HEX,
        borderRadius: 40,
      }}
    >
      <span
        style={{
          color: '#ffffff',
          fontSize: 112,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        I
      </span>
    </div>,
    { ...size },
  );
}
