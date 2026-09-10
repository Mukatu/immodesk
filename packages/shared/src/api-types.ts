/**
 * Types TypeScript du contrat d'API "phase 0" d'Immodesk.
 *
 * Ces types décrivent la forme des ressources exposées par l'API
 * (utilisateurs, organisations, adhésions, invitations, paramètres).
 */

import type { OrganizationType } from "./enums/index.js";

export type Role = "OWNER" | "MANAGER" | "COLLECTOR" | "ACCOUNTANT" | "VIEWER";

// `OrganizationType` est défini une seule fois, dans les enums générés depuis
// le schéma SQL (`src/enums/generated.ts`), et déjà réexporté depuis là via
// `src/index.ts` (`export * from "./enums/index.js"`). On le réutilise ici
// (import ci-dessus) pour typer `Organization.type` sans le redéclarer, afin
// d'éviter toute divergence entre le contrat d'API et le schéma de base de
// données, et un conflit d'export dans `src/index.ts`.

export interface User {
  id: string;
  phone: string;
  fullName: string;
  email: string | null;
  locale: "fr-CG";
  timezone: "Africa/Brazzaville";
  createdAt: string;
}

export interface Organization {
  id: string;
  type: OrganizationType;
  legalName: string;
  tradeName: string | null;
  slug: string;
  city: string;
  district: string | null;
  contactPhone: string;
  contactEmail: string | null;
  logoUrl: string | null;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
}

export interface OrganizationMembership {
  organization: Organization;
  role: Role;
  joinedAt: string;
}

export interface OrganizationSettings {
  defaultPaymentDueDay: number;
  timezone: string;
  currency: "XAF";
  defaultGraceDays: number;
  receiptFooterText: string | null;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
}

export interface Member {
  id: string;
  user: Pick<User, "id" | "phone" | "fullName">;
  role: Role;
  status: "ACTIVE" | "SUSPENDED";
  joinedAt: string;
}

export interface Invitation {
  id: string;
  phone: string;
  role: Role;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  expiresAt: string;
  createdAt: string;
}
