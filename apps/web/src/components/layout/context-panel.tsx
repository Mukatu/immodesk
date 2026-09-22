'use client';

/**
 * Panneau contextuel de droite — pièce centrale du design system (voir
 * docs/DESIGN_SYSTEM.md §6). Variante retenue : overlay non modal convoqué au clic sur
 * une ligne de tableau (cf. `data-table.tsx`, prop `onRowSelect`). Monté une seule fois
 * dans `AppShell` ; chaque écran alimente le panneau via `useContextPanel().open(...)`.
 *
 * Non modal (`<Sheet modal={false}>`, sans voile) : la liste en arrière-plan reste
 * cliquable et défilable pendant que le panneau est ouvert — on peut cliquer une autre
 * ligne pour changer le contenu sans d'abord fermer le panneau. En contrepartie, un clic
 * en dehors du panneau ne le ferme pas (`onPointerDownOutside`/`onInteractOutside`
 * neutralisés ci-dessous) : seuls Échap et le bouton ✕ le ferment.
 *
 * Focus clavier : le mode non modal désactive le piégeage du focus dans Radix (c'est
 * voulu, cf. ci-dessus), mais désactive aussi sa restauration automatique du focus à la
 * fermeture — celle-ci ne fonctionne que via `<Dialog.Trigger>`, qu'on n'utilise pas ici
 * (le panneau est piloté par `useContextPanel().open()`, appelé depuis n'importe quel
 * écran). On restaure donc le focus nous-mêmes : `triggerRef` mémorise l'élément actif au
 * moment de l'appel à `open()`, et `onCloseAutoFocus` lui redonne le focus à la fermeture
 * (Échap, bouton ✕, ou fermeture programmatique). Échap ferme déjà le panneau nativement
 * (comportement par défaut de Radix Dialog, indépendant de `modal`).
 */

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, HelpCircle } from 'lucide-react';

import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export type ContextPanelTone = 'ok' | 'info' | 'warning' | 'danger' | 'neutral';

const TONE_BADGE_VARIANT: Record<ContextPanelTone, NonNullable<BadgeProps['variant']>> = {
  ok: 'success',
  info: 'default',
  warning: 'warning',
  danger: 'destructive',
  neutral: 'outline',
};

export interface ContextIdentityBlock {
  type: 'identity';
  title: string;
  subtitle?: string;
  initials?: string;
  icon?: React.ReactNode;
  badge?: { label: string; tone?: ContextPanelTone };
}

export interface ContextKeyValueBlock {
  type: 'keyvalue';
  title?: string;
  items: { k: string; v: React.ReactNode }[];
}

export interface ContextMetricBlock {
  type: 'metric';
  title?: string;
  value: React.ReactNode;
  label?: string;
}

export interface ContextActivityBlock {
  type: 'activity';
  title?: string;
  items: { what: string; when?: string }[];
}

export interface ContextRelatedBlock {
  type: 'related';
  title?: string;
  items: { label: string; onSelect: () => void }[];
}

export interface ContextAlertBlock {
  type: 'alert';
  text: string;
  tone: 'danger' | 'warning';
}

export interface ContextActionsBlock {
  type: 'actions';
  actions: {
    label: string;
    primary?: boolean;
    /** Ne referme pas le panneau après exécution (défaut : le panneau se ferme). */
    keepOpen?: boolean;
    href?: string;
    onSelect?: () => void;
  }[];
}

export interface ContextHelpBlock {
  type: 'help';
  text: string;
}

export type ContextBlock =
  | ContextIdentityBlock
  | ContextKeyValueBlock
  | ContextMetricBlock
  | ContextActivityBlock
  | ContextRelatedBlock
  | ContextAlertBlock
  | ContextActionsBlock
  | ContextHelpBlock;

export interface ContextPanelContent {
  /** Titre affiché dans l'en-tête du tiroir (visible + lu par les lecteurs d'écran). */
  title: string;
  blocks: ContextBlock[];
}

interface ContextPanelApi {
  /** Ouvre le panneau, ou remplace son contenu s'il est déjà ouvert (enrichissement). */
  open: (content: ContextPanelContent) => void;
  close: () => void;
  isOpen: boolean;
}

const ContextPanelCtx = React.createContext<ContextPanelApi | null>(null);

/** À appeler depuis un écran pour piloter le panneau contextuel de droite. */
export function useContextPanel(): ContextPanelApi {
  const ctx = React.useContext(ContextPanelCtx);
  if (!ctx) {
    throw new Error('useContextPanel doit être utilisé sous <ContextPanelProvider>.');
  }
  return ctx;
}

/** Monté une seule fois autour du contenu de l'app (voir `AppShell`). */
export function ContextPanelProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = React.useState<ContextPanelContent | null>(null);
  const pathname = usePathname();
  const previousPathname = React.useRef(pathname);
  // Élément qui avait le focus juste avant l'ouverture (ou le dernier réenrichissement) du
  // panneau — voir le commentaire de tête sur la restauration manuelle du focus.
  const lastTriggerRef = React.useRef<HTMLElement | null>(null);

  // Pas de panneau fantôme d'un autre écran au changement de page.
  React.useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      setContent(null);
    }
  }, [pathname]);

  const api = React.useMemo<ContextPanelApi>(
    () => ({
      open: (next) => {
        lastTriggerRef.current = document.activeElement as HTMLElement | null;
        setContent(next);
      },
      close: () => setContent(null),
      isOpen: content !== null,
    }),
    [content],
  );

  const handleCloseAutoFocus = React.useCallback((event: Event) => {
    event.preventDefault();
    lastTriggerRef.current?.focus();
  }, []);

  return (
    <ContextPanelCtx.Provider value={api}>
      {children}
      <Sheet
        open={content !== null}
        onOpenChange={(open) => {
          if (!open) setContent(null);
        }}
        modal={false}
      >
        <SheetContent
          side="right"
          overlay={false}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          onCloseAutoFocus={handleCloseAutoFocus}
          className="flex w-full flex-col gap-4 sm:max-w-sm"
        >
          <SheetHeader>
            <SheetTitle>{content?.title}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
            {content?.blocks.map((block, index) => (
              <ContextBlockView key={index} block={block} onAction={api.close} />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </ContextPanelCtx.Provider>
  );
}

function BlockCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3">
      {title ? (
        <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
      ) : null}
      {children}
    </div>
  );
}

function ContextBlockView({ block, onAction }: { block: ContextBlock; onAction: () => void }) {
  switch (block.type) {
    case 'identity':
      return (
        <div className="flex items-center gap-3 pb-1">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary"
          >
            {block.icon ?? block.initials ?? block.title.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-foreground">{block.title}</p>
            {block.subtitle ? (
              <p className="truncate text-sm text-muted-foreground">{block.subtitle}</p>
            ) : null}
          </div>
          {block.badge ? (
            <Badge variant={TONE_BADGE_VARIANT[block.badge.tone ?? 'neutral']}>
              {block.badge.label}
            </Badge>
          ) : null}
        </div>
      );
    case 'keyvalue':
      return (
        <BlockCard title={block.title}>
          <dl className="divide-y divide-border">
            {block.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                <dt className="text-muted-foreground">{item.k}</dt>
                <dd className="truncate text-right font-medium tabular-nums text-foreground">
                  {item.v}
                </dd>
              </div>
            ))}
          </dl>
        </BlockCard>
      );
    case 'metric':
      return (
        <BlockCard title={block.title}>
          <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {block.value}
          </p>
          {block.label ? <p className="mt-1 text-sm text-muted-foreground">{block.label}</p> : null}
        </BlockCard>
      );
    case 'activity':
      return (
        <BlockCard title={block.title}>
          <ol className="flex flex-col gap-3">
            {block.items.map((item, i) => (
              <li key={i} className="flex gap-2.5">
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                />
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{item.what}</p>
                  {item.when ? <p className="text-xs text-muted-foreground">{item.when}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </BlockCard>
      );
    case 'related':
      return (
        <BlockCard title={block.title}>
          <div className="flex flex-col gap-1">
            {block.items.map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={item.onSelect}
                className="rounded-sm px-2 py-1.5 text-left text-sm font-medium text-primary transition-colors duration-[130ms] hover:bg-background"
              >
                {item.label}
              </button>
            ))}
          </div>
        </BlockCard>
      );
    case 'alert':
      return (
        <div
          role="alert"
          className={cn(
            'flex items-start gap-2 rounded-md border p-3 text-sm',
            block.tone === 'danger'
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-warning/30 bg-warning/10 text-warning',
          )}
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{block.text}</p>
        </div>
      );
    case 'help':
      return (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <HelpCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="leading-relaxed">{block.text}</p>
        </div>
      );
    case 'actions':
      return (
        <div className="mt-auto flex flex-col gap-2 pt-1">
          {block.actions.map((action, i) => {
            const handleSelect = () => {
              action.onSelect?.();
              if (!action.keepOpen) onAction();
            };
            if (action.href) {
              return (
                <Button
                  key={i}
                  asChild
                  variant={action.primary ? 'default' : 'outline'}
                  className="w-full"
                  onClick={handleSelect}
                >
                  <Link href={action.href}>{action.label}</Link>
                </Button>
              );
            }
            return (
              <Button
                key={i}
                type="button"
                variant={action.primary ? 'default' : 'outline'}
                className="w-full"
                onClick={handleSelect}
              >
                {action.label}
              </Button>
            );
          })}
        </div>
      );
    default:
      return null;
  }
}
