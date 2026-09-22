import { ImageResponse } from 'next/og';

// Icône iOS (ajout à l'écran d'accueil). Même principe que icon.tsx, en 180×180
// (taille attendue par iOS pour apple-touch-icon). iOS applique déjà ses propres
// coins arrondis à l'icône : on garde un radius modéré pour rester cohérent si
// l'image est affichée telle quelle ailleurs (ex. Chrome/Android).
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';
// force-dynamic : voir le commentaire équivalent dans icon.tsx (bug @vercel/og /
// Next 15.1.3 sous Windows lors du prérendu statique de ces routes).
export const dynamic = 'force-dynamic';

const PRIMARY_HEX = '#EC4699';

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: PRIMARY_HEX,
        borderRadius: 38,
      }}
    >
      <span
        style={{
          color: '#ffffff',
          fontSize: 104,
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
