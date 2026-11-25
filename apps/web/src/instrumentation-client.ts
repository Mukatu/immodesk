import { z } from 'zod';

// Exécuté par Next.js avant tout code applicatif dans le navigateur.
// Zod sonde `new Function` pour accélérer la validation ; la politique CSP du site
// (pas de 'unsafe-eval', infra/deploy/caddy/sites/immodesk.caddy) refuse cette sonde et
// le navigateur la signale comme violation. Mode sans compilation : aucune sonde.
z.config({ jitless: true });
