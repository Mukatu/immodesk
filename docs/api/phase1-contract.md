# Contrat d'API — Phase 1 (tiers et patrimoine)

Complète `phase0-contract.md` (mêmes conventions : préfixe `/v1`, `Authorization: Bearer`, `X-Organization-Id` obligatoire, erreurs plates `{ code, message, details }`, 404 pour toute ressource hors organisation, pagination par curseur `{ items, pageInfo }`, montants en entiers XAF). Les noms de champs JSON sont en camelCase et correspondent aux colonnes snake_case du DDL (`docs/schema/schema.sql`). Ce fichier est remplacé par `openapi.json` dès que l'API l'exporte.

## Énumérations (valeurs exactes du DDL)

- `PartyType` : INDIVIDUAL, COMPANY. `Gender` : MALE, FEMALE, UNSPECIFIED.
- `IdDocumentType` : CNI, PASSPORT, RESIDENCE_PERMIT, DRIVING_LICENSE, VOTER_CARD, RCCM, NIU, OTHER.
- `PropertyType` : HOUSE, VILLA, APARTMENT_BUILDING, COMPOUND, COMMERCIAL_BUILDING, MIXED_USE, LAND, WAREHOUSE, OTHER.
- `UnitType` : STUDIO, ROOM, APARTMENT, HOUSE, SHOP, OFFICE, WAREHOUSE, PARKING, LAND_PLOT, OTHER.
- `UnitStatus` : AVAILABLE, RESERVED, OCCUPIED, UNDER_MAINTENANCE, UNAVAILABLE.
- `ContactOwnerType` : LANDLORD, TENANT, GUARANTOR, MEMBER, SUPPLIER. `ContactChannelType` : PHONE, MOBILE, WHATSAPP, EMAIL, FAX.
- `BankAccountHolderType` : ORGANIZATION, LANDLORD, TENANT. `MomoProvider` : MTN_MOMO, AIRTEL_MONEY, CINETPAY, PAWAPAY, OTHER. `PaymentMethod` : CASH, MOBILE_MONEY, BANK_TRANSFER, BANK_CHECK.
- `DocumentKind` : ID_DOCUMENT, LEASE_CONTRACT, MANDATE, RECEIPT_PDF, INVOICE_PDF, CASH_RECEIPT_PDF, TRANSFER_PROOF, CHECK_IMAGE, BANK_STATEMENT, INSPECTION_REPORT, INSPECTION_PHOTO, MAINTENANCE_PHOTO, SIGNATURE, OWNER_STATEMENT_PDF, EXPENSE_INVOICE, PROPERTY_PHOTO, OTHER.

## Règles transverses

- Téléphones : acceptés sous toute forme congolaise (`066123456`, `06 612 34 56`, `00242066123456`, `+242066123456`), normalisés en E.164 `+242…` avant validation ; erreur `PARTIES.PHONE_INVALID`.
- Personne physique : `lastName` obligatoire ; personne morale : `companyName` obligatoire (`PARTIES.NAME_REQUIRED`).
- Doublon de téléphone principal d'un locataire dans la même organisation : avertissement, pas blocage. La création renvoie 409 `PARTIES.PHONE_ALREADY_USED` avec `details.existingTenantId` sauf si le corps contient `confirmDuplicatePhone: true`.
- Suppression logique uniquement (`deletedAt`), jamais physique. Un lot rattaché à un bail actif ne peut pas être supprimé : 409 `PORTFOLIO.UNIT_HAS_ACTIVE_LEASE` (en phase 1, aucun bail n'existe : la règle est codée et testée sur une insertion directe en base).
- Bailleur « self » : à la création d'une organisation `INDEPENDENT_LANDLORD` ou `INDEPENDENT_MANAGER`, un `landlord` avec `isSelf: true` est créé automatiquement (nom et téléphone de l'organisation). Il ne peut pas être supprimé : 409 `PARTIES.SELF_LANDLORD_PROTECTED`.
- Recherche : paramètre `q` (nom, raison sociale, téléphone normalisé, code de lot) insensible à la casse et aux accents.
- Toute création, modification et suppression logique écrit dans `audit_logs`.

## Routes

| Méthode | Route                                                     | Rôle       | Entrée                                                                                                                  | Sortie                                                                                                                                                                                    |
| :------ | :-------------------------------------------------------- | :--------- | :---------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST    | `/v1/landlords`                                           | MANAGER    | `LandlordInput`                                                                                                         | `201 Landlord`                                                                                                                                                                            |
| GET     | `/v1/landlords?q=&city=&limit=&cursor=`                   | VIEWER     | —                                                                                                                       | `200 { items: Landlord[], pageInfo }`                                                                                                                                                     |
| GET     | `/v1/landlords/{id}`                                      | VIEWER     | —                                                                                                                       | `200 LandlordDetail` (bailleur + `properties: PropertySummary[]` + `bankAccounts: BankAccount[]`)                                                                                         |
| PATCH   | `/v1/landlords/{id}`                                      | MANAGER    | `Partial<LandlordInput>`                                                                                                | `200 Landlord`                                                                                                                                                                            |
| DELETE  | `/v1/landlords/{id}`                                      | OWNER      | —                                                                                                                       | `204` ; 409 `PARTIES.SELF_LANDLORD_PROTECTED` ; 409 `PARTIES.LANDLORD_HAS_PROPERTIES`                                                                                                     |
| POST    | `/v1/tenants`                                             | MANAGER    | `TenantInput & { confirmDuplicatePhone?: boolean }`                                                                     | `201 Tenant` ; 409 `PARTIES.PHONE_ALREADY_USED`                                                                                                                                           |
| GET     | `/v1/tenants?q=&limit=&cursor=`                           | VIEWER     | —                                                                                                                       | `200 { items: Tenant[], pageInfo }`                                                                                                                                                       |
| GET     | `/v1/tenants/{id}`                                        | VIEWER     | —                                                                                                                       | `200 TenantDetail` (locataire + `guarantors: Guarantor[]` + `contactChannels: ContactChannel[]` + `documents: Document[]`)                                                                |
| PATCH   | `/v1/tenants/{id}`                                        | MANAGER    | `Partial<TenantInput>`                                                                                                  | `200 Tenant`                                                                                                                                                                              |
| DELETE  | `/v1/tenants/{id}`                                        | OWNER      | —                                                                                                                       | `204`                                                                                                                                                                                     |
| POST    | `/v1/tenants/{id}/guarantors`                             | MANAGER    | `GuarantorInput`                                                                                                        | `201 Guarantor`                                                                                                                                                                           |
| PATCH   | `/v1/guarantors/{id}`                                     | MANAGER    | `Partial<GuarantorInput>`                                                                                               | `200 Guarantor`                                                                                                                                                                           |
| DELETE  | `/v1/guarantors/{id}`                                     | MANAGER    | —                                                                                                                       | `204`                                                                                                                                                                                     |
| GET     | `/v1/parties/{ownerType}/{ownerId}/contact-channels`      | VIEWER     | `ownerType` ∈ landlords, tenants, guarantors                                                                            | `200 { items: ContactChannel[] }`                                                                                                                                                         |
| POST    | `/v1/parties/{ownerType}/{ownerId}/contact-channels`      | MANAGER    | `ContactChannelInput`                                                                                                   | `201 ContactChannel` ; 409 `PARTIES.CHANNEL_DUPLICATE`                                                                                                                                    |
| PATCH   | `/v1/contact-channels/{id}`                               | MANAGER    | `{ label?, isPrimary?, optIn? }` (un seul `isPrimary` par type et par tiers)                                            | `200 ContactChannel`                                                                                                                                                                      |
| DELETE  | `/v1/contact-channels/{id}`                               | MANAGER    | —                                                                                                                       | `204`                                                                                                                                                                                     |
| POST    | `/v1/properties`                                          | MANAGER    | `PropertyInput`                                                                                                         | `201 Property`                                                                                                                                                                            |
| GET     | `/v1/properties?q=&landlordId=&city=&limit=&cursor=`      | VIEWER     | —                                                                                                                       | `200 { items: PropertySummary[], pageInfo }`                                                                                                                                              |
| GET     | `/v1/properties/{id}`                                     | VIEWER     | —                                                                                                                       | `200 PropertyDetail` (immeuble + `landlord: LandlordSummary` + `units: Unit[]` + `occupancy`)                                                                                             |
| PATCH   | `/v1/properties/{id}`                                     | MANAGER    | `Partial<PropertyInput>`                                                                                                | `200 Property`                                                                                                                                                                            |
| DELETE  | `/v1/properties/{id}`                                     | OWNER      | —                                                                                                                       | `204` ; 409 `PORTFOLIO.PROPERTY_HAS_UNITS` si des lots non supprimés existent                                                                                                             |
| POST    | `/v1/properties/{id}/units`                               | MANAGER    | `UnitInput`                                                                                                             | `201 Unit` ; 409 `PORTFOLIO.UNIT_CODE_TAKEN`                                                                                                                                              |
| POST    | `/v1/properties/{id}/units/bulk`                          | MANAGER    | `BulkUnitsInput`                                                                                                        | `201 { created: Unit[] }` (transaction unique, tout ou rien)                                                                                                                              |
| GET     | `/v1/units?propertyId=&status=&q=&limit=&cursor=`         | VIEWER     | —                                                                                                                       | `200 { items: Unit[], pageInfo }`                                                                                                                                                         |
| GET     | `/v1/units/{id}`                                          | VIEWER     | —                                                                                                                       | `200 UnitDetail` (lot + `property: PropertySummary` + `documents: Document[]`)                                                                                                            |
| PATCH   | `/v1/units/{id}`                                          | MANAGER    | `Partial<UnitInput>`                                                                                                    | `200 Unit`                                                                                                                                                                                |
| DELETE  | `/v1/units/{id}`                                          | MANAGER    | —                                                                                                                       | `204` ; 409 `PORTFOLIO.UNIT_HAS_ACTIVE_LEASE`                                                                                                                                             |
| POST    | `/v1/bank-accounts`                                       | ACCOUNTANT | `BankAccountInput`                                                                                                      | `201 BankAccount` ; 409 `BANKING.ACCOUNT_DUPLICATE`                                                                                                                                       |
| GET     | `/v1/bank-accounts?holderType=&landlordId=`               | ACCOUNTANT | —                                                                                                                       | `200 { items: BankAccount[] }`                                                                                                                                                            |
| PATCH   | `/v1/bank-accounts/{id}`                                  | ACCOUNTANT | `Partial<BankAccountInput>`                                                                                             | `200 BankAccount`                                                                                                                                                                         |
| DELETE  | `/v1/bank-accounts/{id}`                                  | ACCOUNTANT | —                                                                                                                       | `204` (désactivation `isActive: false`, jamais de suppression physique)                                                                                                                   |
| POST    | `/v1/documents/upload-url`                                | MANAGER    | `{ fileName, mimeType, sizeBytes, kind, relatedEntityType?, relatedEntityId? }`                                         | `201 { uploadUrl, objectKey, expiresAt, maxSizeBytes }` ; 413 `DOCUMENTS.FILE_TOO_LARGE` (limite 15 Mo images, 25 Mo PDF) ; 415 `DOCUMENTS.MIME_NOT_ALLOWED` (jpeg, png, webp, heic, pdf) |
| POST    | `/v1/documents`                                           | MANAGER    | `{ objectKey, fileName, mimeType, sizeBytes, kind, relatedEntityType?, relatedEntityId?, checksumSha256?, clientRef? }` | `201 Document` (vérifie que l'objet existe dans le stockage)                                                                                                                              |
| GET     | `/v1/documents?relatedEntityType=&relatedEntityId=&kind=` | VIEWER     | —                                                                                                                       | `200 { items: Document[] }`                                                                                                                                                               |
| GET     | `/v1/documents/{id}/download-url`                         | VIEWER     | —                                                                                                                       | `200 { downloadUrl, expiresAt }` (URL signée 10 minutes)                                                                                                                                  |
| DELETE  | `/v1/documents/{id}`                                      | MANAGER    | —                                                                                                                       | `204` (suppression logique, objet purgé par tâche différée)                                                                                                                               |

`relatedEntityType` prend les valeurs : `landlord`, `tenant`, `guarantor`, `property`, `unit`, `organization`.

## Types

```ts
interface LandlordInput {
  partyType: PartyType;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  gender?: Gender;
  birthDate?: string;
  nationality?: string;
  idDocumentType?: IdDocumentType;
  idDocumentNumber?: string;
  idDocumentExpiry?: string;
  idDocumentId?: string;
  rccmNumber?: string;
  niuNumber?: string;
  primaryPhone: string;
  secondaryPhone?: string;
  email?: string;
  addressLine?: string;
  district?: string;
  city?: string;
  countryCode?: string;
  defaultBankAccountId?: string;
  payoutMethod?: PaymentMethod;
  notes?: string;
}
interface Landlord
  extends
    Required<
      Pick<LandlordInput, 'partyType' | 'primaryPhone' | 'city' | 'countryCode' | 'payoutMethod'>
    >,
    Omit<LandlordInput, 'partyType' | 'primaryPhone' | 'city' | 'countryCode' | 'payoutMethod'> {
  id: string;
  isSelf: boolean;
  displayName: string;
  propertiesCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
interface LandlordSummary {
  id: string;
  displayName: string;
  primaryPhone: string;
  isSelf: boolean;
}

interface TenantInput {
  partyType: PartyType;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  gender?: Gender;
  birthDate?: string;
  birthPlace?: string;
  nationality?: string;
  idDocumentType?: IdDocumentType;
  idDocumentNumber?: string;
  idDocumentExpiry?: string;
  idDocumentId?: string;
  rccmNumber?: string;
  niuNumber?: string;
  profession?: string;
  employerName?: string;
  monthlyIncome?: number;
  primaryPhone: string;
  secondaryPhone?: string;
  whatsappPhone?: string;
  email?: string;
  addressLine?: string;
  district?: string;
  city?: string;
  countryCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  clientRef?: string;
  notes?: string;
}
interface Tenant extends TenantInput {
  id: string;
  displayName: string;
  currency: 'XAF';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface GuarantorInput {
  partyType: PartyType;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  relationship?: string;
  idDocumentType?: IdDocumentType;
  idDocumentNumber?: string;
  idDocumentId?: string;
  profession?: string;
  employerName?: string;
  monthlyIncome?: number;
  guaranteeAmount?: number;
  primaryPhone: string;
  email?: string;
  addressLine?: string;
  district?: string;
  city?: string;
  countryCode?: string;
  notes?: string;
}
interface Guarantor extends GuarantorInput {
  id: string;
  tenantId: string;
  displayName: string;
  currency: 'XAF';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface ContactChannelInput {
  channelType: ContactChannelType;
  value: string;
  label?: string;
  isPrimary?: boolean;
  optIn?: boolean;
}
interface ContactChannel extends ContactChannelInput {
  id: string;
  ownerType: ContactOwnerType;
  ownerId: string;
  isVerified: boolean;
  verifiedAt: string | null;
  optOutAt: string | null;
  createdAt: string;
}

interface PropertyInput {
  landlordId: string;
  code?: string;
  name: string;
  propertyType?: PropertyType;
  addressLine: string;
  district: string;
  arrondissement?: string;
  landmark?: string;
  city?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  landTitleReference?: string;
  parcelNumber?: string;
  builtYear?: number;
  totalAreaSqm?: number;
  floorsCount?: number;
  hasWater?: boolean;
  hasElectricity?: boolean;
  hasBorehole?: boolean;
  caretakerName?: string;
  caretakerPhone?: string;
  coverDocumentId?: string;
  notes?: string;
}
interface Occupancy {
  unitsCount: number;
  occupiedCount: number;
  availableCount: number;
  occupancyRateBps: number;
}
interface Property extends PropertyInput {
  id: string;
  unitsCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
interface PropertySummary {
  id: string;
  code: string | null;
  name: string;
  propertyType: PropertyType;
  district: string;
  city: string;
  landlord: LandlordSummary;
  occupancy: Occupancy;
  coverDocumentId: string | null;
}

interface UnitInput {
  code: string;
  label?: string;
  unitType?: UnitType;
  status?: UnitStatus;
  floorNumber?: number;
  roomsCount?: number;
  bedroomsCount?: number;
  bathroomsCount?: number;
  areaSqm?: number;
  isFurnished?: boolean;
  hasPrivateMeter?: boolean;
  baseRentAmount: number;
  baseChargesAmount?: number;
  depositMonths?: number;
  amenities?: Record<string, boolean | string | number>;
  notes?: string;
}
interface Unit extends UnitInput {
  id: string;
  propertyId: string;
  currency: 'XAF';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
interface BulkUnitsInput {
  prefix: string; // "A"
  from: number;
  to: number; // 1..12 → A1..A12 (to − from + 1 ≤ 200)
  padding?: number; // 2 → A01..A12
  template: Omit<UnitInput, 'code' | 'label'>;
}

interface BankAccountInput {
  holderType: BankAccountHolderType;
  landlordId?: string;
  tenantId?: string;
  label: string;
  bankCode: string;
  bankName: string;
  branchName?: string;
  accountHolderName: string;
  accountNumber?: string;
  ribKey?: string;
  iban?: string;
  swiftBic?: string;
  momoProvider?: MomoProvider;
  momoMsisdn?: string;
  isDefault?: boolean;
}
interface BankAccount extends BankAccountInput {
  id: string;
  currency: 'XAF';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Document {
  id: string;
  kind: DocumentKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  widthPx: number | null;
  heightPx: number | null;
  pagesCount: number | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  uploadedByUserId: string | null;
  uploadedAt: string;
  retentionUntil: string | null;
  deletedAt: string | null;
}
```

## Banques de référence (liste de codes pour les sélecteurs)

| bankCode     | bankName                                                    |
| :----------- | :---------------------------------------------------------- |
| BGFI         | BGFIBank Congo                                              |
| LCB          | LCB Bank                                                    |
| ECOBANK      | Ecobank Congo                                               |
| UBA          | UBA Congo                                                   |
| BSCA         | BSCA Bank                                                   |
| CDCO         | Crédit du Congo                                             |
| SGC          | Société Générale Congo                                      |
| BCI          | Banque Commerciale Internationale                           |
| MTN_MOMO     | MTN Mobile Money (compte Mobile Money, `momoMsisdn` requis) |
| AIRTEL_MONEY | Airtel Money (compte Mobile Money, `momoMsisdn` requis)     |
