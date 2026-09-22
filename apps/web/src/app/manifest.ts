import type { MetadataRoute } from 'next';

/*
 * Couleurs reprises de src/styles/tokens.css (thème clair, valeurs par défaut de :root),
 * converties de HSL vers hexadécimal (formule standard HSL → RGB, arrondi au plus proche) :
 *
 * --background: 150 10% 97%  (H=150, S=0.10, L=0.97)
 *   C = (1 - |2L-1|) × S = (1 - 0.94) × 0.10 = 0.006
 *   X = C × (1 - |((H/60) mod 2) - 1|) = 0.006 × (1 - |0.5 - 1|) = 0.003
 *   m = L - C/2 = 0.967 ; H∈[120,180) → (R,G,B) = (0,C,X) + m = (0.967, 0.973, 0.970)
 *   × 255 → (247, 248, 247) → #F7F8F7
 *
 * --primary: 330 81% 60%  (H=330, S=0.81, L=0.60)
 *   C = (1 - |2×0.6-1|) × 0.81 = 0.8 × 0.81 = 0.648
 *   X = C × (1 - |((330/60) mod 2) - 1|) = 0.648 × (1 - |1.5 - 1|) = 0.324
 *   m = L - C/2 = 0.276 ; H∈[300,360) → (R,G,B) = (C,0,X) + m = (0.924, 0.276, 0.600)
 *   × 255 → (236, 70, 153) → #EC4699
 *
 * Le manifeste n'a pas de variante sombre (contrairement aux balises <meta theme-color>
 * de layout.tsx, qui elles utilisent prefers-color-scheme) : on retient donc les valeurs
 * du thème clair, cohérentes avec l'écran de démarrage (splash screen) par défaut.
 */
const BACKGROUND_HEX = '#F7F8F7';
const PRIMARY_HEX = '#EC4699';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Immodesk — Gestion locative',
    short_name: 'Immodesk',
    description:
      'Gestion locative pour bailleurs et agences : baux, loyers, quittances et relances, depuis le téléphone.',
    start_url: '/app',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'fr',
    dir: 'ltr',
    background_color: BACKGROUND_HEX,
    theme_color: PRIMARY_HEX,
    icons: [
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
