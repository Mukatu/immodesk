import type { Metadata, Viewport } from 'next';
import './globals.css';

import { AppProviders } from '@/lib/query/providers';

export const metadata: Metadata = {
  title: {
    default: 'Immodesk',
    template: '%s · Immodesk',
  },
  description: 'Immodesk — gestion locative pour agences et bailleurs au Congo-Brazzaville.',
  appleWebApp: {
    capable: true,
    title: 'Immodesk',
    // 'default' plutôt que 'black-translucent' : le contenu ne doit pas passer sous la
    // barre de statut, le bandeau applicatif (header sticky) gère déjà ses propres zones
    // de sécurité (encoche, coins arrondis) au besoin.
    statusBarStyle: 'default',
  },
};

// themeColor doit être déclaré via `viewport` (et non `metadata`) depuis Next 14+.
// Deux valeurs : le thème a un mode clair et un mode sombre (voir src/styles/tokens.css).
// Clair — --background: 150 10% 97% → #F7F8F7 (calcul détaillé dans manifest.ts).
// Sombre — .dark --background: 150 20% 7% (H=150, S=0.20, L=0.07) :
//   C = (1 - |2×0.07-1|) × 0.20 = (1 - 0.86) × 0.20 = 0.028
//   X = C × (1 - |((150/60) mod 2) - 1|) = 0.028 × 0.5 = 0.014
//   m = L - C/2 = 0.056 ; H∈[120,180) → (R,G,B) = (0,C,X) + m = (0.056, 0.084, 0.070)
//   × 255 → (14, 21, 18) → #0E1512
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F8F7' },
    { media: '(prefers-color-scheme: dark)', color: '#0E1512' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <a href="#contenu-principal" className="skip-link">
          Aller au contenu principal
        </a>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
