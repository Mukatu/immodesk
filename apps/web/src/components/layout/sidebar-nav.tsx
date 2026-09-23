'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  AlarmClockCheck,
  Banknote,
  BarChart3,
  Building2,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  FileText,
  Gauge,
  Handshake,
  Home,
  Landmark,
  LayoutDashboard,
  MessageSquare,
  Receipt,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
  Users2,
  Wallet,
  Wallet2,
  Wrench,
} from 'lucide-react';

import { cn } from '@/lib/utils';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
  /** Réservé aux administrateurs de la plateforme Immodesk (l'éditeur). */
  platformOnly?: boolean;
}

export interface NavGroup {
  /**
   * Libellé de section affiché au-dessus du groupe (masqué en mode réduit). Absent = pas
   * de titre ; un groupe sans libellé n'est jamais rétractable (cas du seul « Tableau de
   * bord », en tête de liste).
   */
  label?: string;
  items: NavItem[];
}

/**
 * Entrées de la navigation principale, regroupées par thème. Un séparateur est rendu
 * entre chaque groupe. « Paramètres » n'y figure plus : le bouton engrenage de la topbar
 * (voir app-shell.tsx) mène à /app/parametres, dont la mise en page affiche les rubriques
 * en onglets.
 */
export const NAV_GROUPS: NavGroup[] = [
  { items: [{ href: '/app', label: 'Tableau de bord', icon: LayoutDashboard }] },
  {
    label: 'Patrimoine',
    items: [
      { href: '/app/bailleurs', label: 'Bailleurs', icon: Home },
      { href: '/app/immeubles', label: 'Immeubles', icon: Building2 },
      { href: '/app/locataires', label: 'Locataires', icon: Users2 },
      { href: '/app/baux', label: 'Baux', icon: FileText },
      { href: '/app/depots', label: 'Dépôts', icon: Wallet },
      { href: '/app/etats-des-lieux', label: 'États des lieux', icon: ClipboardCheck },
      { href: '/app/compteurs', label: 'Compteurs', icon: Gauge },
      { href: '/app/maintenance', label: 'Maintenance', icon: Wrench },
    ],
  },
  {
    label: 'Finances',
    items: [
      { href: '/app/factures', label: 'Factures', icon: Receipt },
      { href: '/app/paiements', label: 'Paiements', icon: CreditCard },
      { href: '/app/caisse', label: 'Caisse', icon: Banknote },
      { href: '/app/banque/rapprochement', label: 'Banque', icon: Landmark },
      { href: '/app/quittances', label: 'Quittances', icon: FileCheck2 },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { href: '/app/gerance/mandats', label: 'Gérance', icon: Handshake },
      { href: '/app/relances', label: 'Relances', icon: AlarmClockCheck },
      { href: '/app/messages', label: 'Messages', icon: MessageSquare },
    ],
  },
  {
    label: 'Pilotage',
    items: [
      { href: '/app/tableaux-de-bord', label: 'Tableaux de bord', icon: BarChart3 },
      { href: '/app/synchronisation', label: 'Synchronisation', icon: RefreshCw },
    ],
  },
  {
    label: 'Organisation',
    items: [
      { href: '/app/equipe', label: 'Équipe', icon: Users },
      { href: '/app/abonnement', label: 'Abonnement', icon: Wallet2 },
      { href: '/partenaire', label: 'Devenir partenaire', icon: UserPlus },
      // Outil de l'éditeur, pas du client : réservé aux administrateurs de la
      // plateforme (`users.is_platform_admin`), et non au rôle OWNER — que tout
      // client propriétaire de son organisation possède, et qui faisait donc
      // apparaître cette entrée chez chacun d'eux.
      { href: '/app/admin', label: 'Back-office', icon: ShieldCheck, platformOnly: true },
    ],
  },
];

/**
 * Persistance du groupe ouvert (Patrimoine, Finances, …), distincte de
 * `immodesk.sidebar-collapsed` (app-shell.tsx) qui gère le repli global de la sidebar en
 * mode icônes seules. Comportement accordéon : un seul groupe ouvert à la fois, tous fermés
 * par défaut. Valeur : JSON du libellé du groupe ouvert, ou `null` si aucun ne l'est.
 * Remplace l'ancienne clé `immodesk.sidebar-groups-collapsed` (carte des groupes repliés,
 * défaut déplié) : format incompatible, nouvelle clé pour ne pas relire une ancienne valeur.
 */
const SIDEBAR_OPEN_GROUP_KEY = 'immodesk.sidebar-open-group';

function isActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== '/app' && pathname.startsWith(`${href}/`));
}

function readStoredOpenGroup(): string | null {
  try {
    const raw = window.localStorage.getItem(SIDEBAR_OPEN_GROUP_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'string' && NAV_GROUPS.some((group) => group.label === parsed)
      ? parsed
      : null;
  } catch {
    // Stockage indisponible ou valeur corrompue : tous les groupes restent fermés.
    return null;
  }
}

function writeStoredOpenGroup(label: string | null): void {
  try {
    window.localStorage.setItem(SIDEBAR_OPEN_GROUP_KEY, JSON.stringify(label));
  } catch {
    // Pas de persistance possible : le choix reste valable pour la session en cours.
  }
}

export interface SidebarNavListProps {
  isOwner: boolean;
  /**
   * Administrateur de la plateforme Immodesk (l'éditeur), et non de l'organisation
   * cliente. Facultatif et faux par défaut : une entrée réservée à la plateforme
   * reste ainsi masquée tant que l'appelant ne la fournit pas explicitement.
   */
  isPlatformAdmin?: boolean;
  /** Mode réduit (icônes seules) : n'a de sens que pour la sidebar de bureau, jamais en Sheet mobile. */
  collapsed?: boolean;
  onNavigate?: () => void;
  className?: string;
}

/** Liste de navigation partagée entre la sidebar de bureau et le tiroir mobile. */
export function SidebarNavList({
  isOwner,
  isPlatformAdmin = false,
  collapsed = false,
  onNavigate,
  className,
}: SidebarNavListProps) {
  const pathname = usePathname();

  // Fermés par défaut au premier rendu (serveur et client coïncident : aucun groupe
  // ouvert), lu depuis localStorage après montage seulement — même précaution que
  // SIDEBAR_COLLAPSED_KEY dans app-shell.tsx pour éviter un écart d'hydratation.
  const [openGroup, setOpenGroup] = React.useState<string | null>(null);

  React.useEffect(() => {
    setOpenGroup(readStoredOpenGroup());
  }, []);

  const toggleGroup = React.useCallback((label: string) => {
    setOpenGroup((prev) => {
      const next = prev === label ? null : label;
      writeStoredOpenGroup(next);
      return next;
    });
  }, []);

  return (
    <nav aria-label="Navigation principale" className={cn('flex flex-1 flex-col gap-1', className)}>
      {NAV_GROUPS.map((group, groupIndex) => {
        const items = group.items.filter(
          (item) => (!item.ownerOnly || isOwner) && (!item.platformOnly || isPlatformAdmin),
        );
        if (items.length === 0) {
          return null;
        }
        // En mode réduit (icônes seules), aucun en-tête n'est affiché : impossible de
        // replier/déplier, donc on ignore toujours l'état de repli et on montre tout.
        const groupIsCollapsible = Boolean(group.label) && !collapsed;
        const groupIsCollapsed = groupIsCollapsible && group.label !== openGroup;
        const groupHasActiveItem = items.some((item) => isActive(pathname, item.href));
        const panelId = `sidebar-groupe-${groupIndex}`;
        return (
          <div key={group.label ?? `groupe-${groupIndex}`} className="flex flex-col gap-1">
            {groupIndex > 0 ? (
              <div
                role="separator"
                aria-orientation="horizontal"
                className="my-2 border-t border-border"
              />
            ) : null}
            {group.label && !collapsed ? (
              groupIsCollapsible ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label!)}
                  aria-expanded={!groupIsCollapsed}
                  aria-controls={panelId}
                  className="flex w-full items-center justify-between rounded-md px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span>{group.label}</span>
                  <ChevronRight
                    aria-hidden="true"
                    className={cn(
                      'size-3.5 shrink-0 transition-transform duration-150',
                      !groupIsCollapsed && 'rotate-90',
                      // Deuxième usage discret du bleu d'accent : le chevron du groupe qui
                      // contient la page courante reste bleu, même une fois replié — un repère
                      // de position sans dépendre de l'interaction (survol/focus).
                      groupHasActiveItem && 'text-accent',
                    )}
                  />
                </button>
              ) : (
                <p className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
              )
            ) : null}
            {!groupIsCollapsed ? (
              <div id={panelId} className="flex flex-col gap-1">
                {items.map(({ href, label, icon: Icon }) => {
                  const active = isActive(pathname, href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      aria-label={collapsed ? label : undefined}
                      title={collapsed ? label : undefined}
                      className={cn(
                        'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                        collapsed && 'justify-center px-2',
                        active &&
                          // Fond + texte teinte primaire (rose) déjà en place, inchangés.
                          // Liseré gauche en bleu d'accent en plus, seul repère non lié à une
                          // interaction : sans lui le bleu de la marque n'apparaît que sur les
                          // anneaux de focus clavier.
                          "bg-primary/10 text-primary before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-accent before:content-[''] hover:bg-primary/10 hover:text-primary",
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      <span className={cn(collapsed && 'sr-only')}>{label}</span>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
