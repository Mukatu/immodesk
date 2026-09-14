'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Onglets accessibles (rôles ARIA tablist/tab/tabpanel), sans dépendance
 * Radix supplémentaire — `@radix-ui/react-tabs` n'est pas installé dans ce
 * projet et les autres primitives `components/ui/*` n'en dépendent pas non
 * plus. API calquée sur shadcn/ui (`Tabs`, `TabsList`, `TabsTrigger`,
 * `TabsContent`) pour rester cohérent avec le reste du dossier.
 */
interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
  idPrefix: string;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error(`${component} doit être utilisé dans <Tabs>.`);
  return ctx;
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (value: string) => void;
}

/** Racine contrôlée : `value`/`onValueChange` gérés par l'écran appelant. */
export function Tabs({ value, onValueChange, className, children, ...props }: TabsProps) {
  const idPrefix = React.useId();
  return (
    <TabsContext.Provider value={{ value, setValue: onValueChange, idPrefix }}>
      <div className={cn('flex flex-col gap-4', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex h-11 w-fit items-center gap-1 rounded-md bg-muted p-1 text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabsTrigger({ value, className, children, ...props }: TabsTriggerProps) {
  const ctx = useTabsContext('TabsTrigger');
  const selected = ctx.value === value;
  return (
    <button
      type="button"
      role="tab"
      id={`${ctx.idPrefix}-tab-${value}`}
      aria-selected={selected}
      aria-controls={`${ctx.idPrefix}-panel-${value}`}
      tabIndex={selected ? 0 : -1}
      onClick={() => ctx.setValue(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected
          ? 'bg-background text-foreground shadow-sm'
          : 'hover:bg-background/50 hover:text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({ value, className, ...props }: TabsContentProps) {
  const ctx = useTabsContext('TabsContent');
  if (ctx.value !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${ctx.idPrefix}-panel-${value}`}
      aria-labelledby={`${ctx.idPrefix}-tab-${value}`}
      tabIndex={0}
      className={cn('focus-visible:outline-none', className)}
      {...props}
    />
  );
}
