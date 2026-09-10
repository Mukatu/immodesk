import type { Metadata } from 'next';
import './globals.css';

import { AppProviders } from '@/lib/query/providers';

export const metadata: Metadata = {
  title: {
    default: 'Immodesk',
    template: '%s · Immodesk',
  },
  description: 'Immodesk — gestion locative pour agences et bailleurs au Congo-Brazzaville.',
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
