# Contrat d'API — Phase 0 (référence partagée API / web / mobile)

Ce fichier fige les routes, en-têtes et formats de la phase 0 avant la génération OpenAPI. Une fois `openapi.json` publié par l'API, il devient la source de vérité et ce fichier est retiré.

## Conventions

- Préfixe : `/v1`. Réponses JSON, dates ISO 8601 UTC, montants en entiers XAF.
- Authentification : `Authorization: Bearer <accessToken>` (JWT, 15 min).
- Contexte d'organisation : en-tête `X-Organization-Id: <uuid>` obligatoire sur toute route d'organisation. L'API vérifie l'appartenance et positionne `app.current_organization_id` (RLS).
- Erreurs : `{ "code": "IAM.OTP_INVALID", "message": "Code incorrect.", "details": {...} }`. Codes stables `DOMAINE.RAISON` ; messages en français (fr-CG). 404 pour toute ressource hors organisation (jamais 403).
- Pagination : `?limit=50&cursor=...` → `{ "items": [...], "pageInfo": { "nextCursor": string|null, "hasNextPage": boolean, "limit": number } }`.
- Idempotence : en-tête optionnel `Idempotency-Key` sur les POST.
- Limitation de débit sur `/v1/auth/otp/request` : 3 demandes / 10 min par numéro, 20 / h par IP → 429 `IAM.RATE_LIMITED`.

## Routes

| Méthode | Route                                               | Auth                       | Corps (entrée)                                                                                                                               | Réponse                                                                                                                                            |
| :------ | :-------------------------------------------------- | :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST    | `/v1/auth/otp/request`                              | public                     | `{ phone: "+242066000001", channel?: "WHATSAPP"                                                                                              | "SMS" }` (défaut WHATSAPP, repli SMS automatique si la remise WhatsApp échoue)\| "WHATSAPP" }`                                                     | `201 { requestId, channel, expiresInSeconds: 300, resendAfterSeconds: 60 }` |
| POST    | `/v1/auth/otp/verify`                               | public                     | `{ phone, code: "123456", deviceName?: string }`                                                                                             | `200 { accessToken, refreshToken, user: User, organizations: OrganizationMembership[] }` ; 401 `IAM.OTP_INVALID` ; 429 `IAM.OTP_LOCKED` (5 échecs) |
| POST    | `/v1/auth/refresh`                                  | public                     | `{ refreshToken }`                                                                                                                           | `200 { accessToken, refreshToken }` ; 401 `IAM.REFRESH_REVOKED` (rejeu → révocation de la famille)                                                 |
| POST    | `/v1/auth/logout`                                   | bearer                     | `{ refreshToken }`                                                                                                                           | `204`                                                                                                                                              |
| GET     | `/v1/me`                                            | bearer                     | —                                                                                                                                            | `200 { user: User, organizations: OrganizationMembership[] }`                                                                                      |
| PATCH   | `/v1/me`                                            | bearer                     | `{ fullName?, email?, locale?, timezone? }`                                                                                                  | `200 User`                                                                                                                                         |
| POST    | `/v1/organizations`                                 | bearer                     | `{ type: "AGENCY" \| "INDEPENDENT_LANDLORD" \| "INDEPENDENT_MANAGER", legalName, tradeName?, city, district?, contactPhone, contactEmail? }` | `201 Organization` (créateur → OWNER)                                                                                                              |
| GET     | `/v1/organizations/{id}`                            | VIEWER                     | —                                                                                                                                            | `200 Organization`                                                                                                                                 |
| PATCH   | `/v1/organizations/{id}`                            | OWNER                      | `{ legalName?, tradeName?, city?, district?, contactPhone?, contactEmail?, logoDocumentId? }`                                                | `200 Organization`                                                                                                                                 |
| GET     | `/v1/organizations/{id}/settings`                   | MANAGER                    | —                                                                                                                                            | `200 OrganizationSettings`                                                                                                                         |
| PATCH   | `/v1/organizations/{id}/settings`                   | OWNER                      | `Partial<OrganizationSettings>`                                                                                                              | `200 OrganizationSettings`                                                                                                                         |
| GET     | `/v1/organizations/{id}/members`                    | MANAGER                    | —                                                                                                                                            | `200 { items: Member[] }`                                                                                                                          |
| PATCH   | `/v1/organizations/{id}/members/{memberId}`         | OWNER                      | `{ role }`                                                                                                                                   | `200 Member` ; 409 `ORG.LAST_OWNER`                                                                                                                |
| DELETE  | `/v1/organizations/{id}/members/{memberId}`         | OWNER                      | —                                                                                                                                            | `204` ; 409 `ORG.LAST_OWNER`                                                                                                                       |
| GET     | `/v1/organizations/{id}/invitations`                | MANAGER                    | —                                                                                                                                            | `200 { items: Invitation[] }`                                                                                                                      |
| POST    | `/v1/organizations/{id}/invitations`                | OWNER                      | `{ phone, role, fullName? }`                                                                                                                 | `201 Invitation` (SMS envoyé avec lien/token)                                                                                                      |
| DELETE  | `/v1/organizations/{id}/invitations/{invitationId}` | OWNER                      | —                                                                                                                                            | `204`                                                                                                                                              |
| GET     | `/v1/invitations/{token}`                           | public                     | —                                                                                                                                            | `200 { organizationName, role, expiresAt }`                                                                                                        |
| POST    | `/v1/invitations/{token}/accept`                    | bearer                     | —                                                                                                                                            | `200 OrganizationMembership`                                                                                                                       |
| GET     | `/v1/feature-flags`                                 | bearer + X-Organization-Id | —                                                                                                                                            | `200 { flags: { [key: string]: boolean } }`                                                                                                        |
| GET     | `/v1/health`                                        | public                     | —                                                                                                                                            | `200 { status: "ok" \| "degraded", checks: { database, redis, storage } }`                                                                         |
| GET     | `/v1/openapi.json`                                  | public                     | —                                                                                                                                            | document OpenAPI 3.1                                                                                                                               |

## Types

```ts
type Role = 'OWNER' | 'MANAGER' | 'COLLECTOR' | 'ACCOUNTANT' | 'VIEWER';
type OrganizationType = 'AGENCY' | 'INDEPENDENT_LANDLORD' | 'INDEPENDENT_MANAGER';

interface User {
  id: string;
  phone: string;
  fullName: string;
  email: string | null;
  locale: 'fr-CG';
  timezone: 'Africa/Brazzaville';
  createdAt: string;
}
interface Organization {
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
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}
interface OrganizationMembership {
  organization: Organization;
  role: Role;
  joinedAt: string;
}
interface OrganizationSettings {
  defaultPaymentDueDay: number;
  timezone: string;
  currency: 'XAF';
  defaultGraceDays: number;
  receiptFooterText: string | null;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
}
interface Member {
  id: string;
  user: Pick<User, 'id' | 'phone' | 'fullName'>;
  role: Role;
  status: 'ACTIVE' | 'SUSPENDED';
  joinedAt: string;
}
interface Invitation {
  id: string;
  phone: string;
  role: Role;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
  createdAt: string;
}
```

## Mode développement

- Fournisseur SMS `FakeSmsProvider` : le code OTP est journalisé dans les logs API et, si `OTP_DEV_CODE` est défini, ce code fixe est toujours accepté. Jamais actif en production.
- Données de démonstration : utilisateur `+242066000001` (OWNER de l'agence « Agence Mpila Immo », Brazzaville) et `+242066000002` (COLLECTOR).
