import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';

export const OPENAPI_TITLE = 'Immodesk API';
export const OPENAPI_VERSION = '0.1.0';

/**
 * Construit le document OpenAPI 3.1 décrivant le contrat de la phase 0.
 * Utilisé à la fois par le serveur (`GET /v1/openapi.json`, `/v1/docs`) et
 * par le script d'export `openapi:export`.
 */
export function buildOpenApiDocument(app: INestApplication, globalPrefix: string): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle(OPENAPI_TITLE)
    .setDescription(
      [
        'API de la plateforme Immodesk (gestion immobilière, Congo-Brazzaville).',
        '',
        '**Conventions**',
        `- Préfixe : \`/${globalPrefix}\`. Dates ISO 8601 UTC, montants entiers XAF (BigInt sérialisé en chaîne).`,
        '- Authentification : `Authorization: Bearer <accessToken>` (JWT, 15 minutes).',
        "- Contexte d'organisation : en-tête `X-Organization-Id` obligatoire sur toute route d'organisation.",
        '- Erreurs : `{ code, message, details }`, codes stables `DOMAINE.RAISON`, messages en français (fr-CG).',
        '- Toute ressource appartenant à une autre organisation répond **404**, jamais 403.',
        '- Pagination par curseur : `?limit=50&cursor=...` → `{ items, pageInfo }`.',
        '- Idempotence : en-tête facultatif `Idempotency-Key` sur les POST.',
      ].join('\n'),
    )
    .setVersion(OPENAPI_VERSION)
    .setOpenAPIVersion('3.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: "Jeton d'accès (15 min).",
      },
      'bearer',
    )
    .addGlobalParameters({
      name: 'X-Organization-Id',
      in: 'header',
      required: false,
      description:
        "Organisation courante. Obligatoire sur les routes d'organisation ; ignoré ailleurs.",
      schema: { type: 'string', format: 'uuid' },
    })
    .addTag('Authentification', 'Connexion par téléphone et code OTP, sessions.')
    .addTag('Profil', "Profil de l'utilisateur connecté et ses organisations.")
    .addTag('Organisations', 'Tenant SaaS : paramétrage, membres, drapeaux.')
    .addTag('Invitations', 'Invitation de collaborateurs et acceptation.')
    .addTag('Bailleurs', 'Propriétaires des biens, personnes physiques ou morales.')
    .addTag('Locataires', 'Locataires, leur dossier et leurs pièces justificatives.')
    .addTag('Garants', 'Cautions rattachées à un locataire.')
    .addTag('Canaux de contact', 'Téléphones, WhatsApp et e-mails par tiers, avec consentement.')
    .addTag('Patrimoine', 'Immeubles, localisation congolaise et taux d’occupation.')
    .addTag('Lots', 'Lots louables : caractéristiques, loyer de référence, statut.')
    .addTag('Comptes bancaires', 'Comptes de règlement : banques locales et Mobile Money.')
    .addTag('Documents', 'Stockage objet, URL signées, rattachement polymorphe.')
    .addTag('Plateforme', 'Santé, contrat OpenAPI.')
    .addServer(`http://localhost:3000/${globalPrefix}`, 'Développement local')
    .build();

  return SwaggerModule.createDocument(app, config, { deepScanRoutes: true });
}
