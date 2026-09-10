/** Base URL de l'API, utilisée uniquement côté serveur (route handlers). */
export const API_INTERNAL_URL =
  process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1';
