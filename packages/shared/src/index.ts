/**
 * Point d'entrée public du package `@immodesk/shared`.
 *
 * Réexporte : enums générés depuis le schéma SQL, utilitaires monétaires
 * (XAF), utilitaires téléphoniques (Congo-Brazzaville), schémas de
 * validation zod du contrat d'API, et types TypeScript du contrat d'API.
 */

export * from "./enums/index.js";
export * from "./money.js";
export * from "./phone.js";
export * from "./validation/index.js";
export * from "./api-types.js";
