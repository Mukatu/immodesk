import { z } from 'zod';

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((v) =>
    typeof v === 'boolean' ? v : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase()),
  );

const port = z.coerce.number().int().min(1).max(65535);

/**
 * Schéma de configuration de l'API, validé au démarrage (fail-fast).
 * Toute variable absente ou incohérente empêche le boot du processus.
 */
export const configSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: port.default(3000),
    API_GLOBAL_PREFIX: z.string().default('v1'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),

    // --- Base de données -------------------------------------------------
    DATABASE_URL: z.string().url(),
    DATABASE_ADMIN_URL: z.string().url().optional(),

    // --- Redis (cache, limitation de débit) -------------------------------
    REDIS_URL: z.string().url(),

    // --- Stockage objet (S3 / R2 / MinIO) --------------------------------
    S3_ENDPOINT: z.string().url().optional(),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY: z.string().optional(),
    S3_SECRET_KEY: z.string().optional(),
    // MinIO ignore la région, mais le SDK AWS en exige une pour signer.
    S3_REGION: z.string().default('us-east-1'),
    // Validité des URL signées d'envoi. 10 min = valeur du contrat phase 1.
    S3_UPLOAD_URL_TTL_SECONDS: z.coerce.number().int().positive().default(600),

    // --- Purge différée des documents supprimés --------------------------
    DOCUMENTS_PURGE_ENABLED: booleanish.default(true),
    DOCUMENTS_PURGE_INTERVAL_SECONDS: z.coerce.number().int().positive().default(3600),
    // Délai de rétractation avant destruction irréversible de l'objet.
    DOCUMENTS_PURGE_GRACE_HOURS: z.coerce.number().int().nonnegative().default(24),
    DOCUMENTS_PURGE_BATCH_SIZE: z.coerce.number().int().positive().max(500).default(50),

    // --- Files BullMQ (phase 2 : cron des baux, worker PDF) ---------------
    // Préfixe des clés Redis : deux environnements partageant un Redis ne
    // doivent jamais se voler un job.
    QUEUE_PREFIX: z.string().default('immodesk'),
    // Cron quotidien des baux : 02:00 Africa/Brazzaville (contrat phase 2).
    LEASES_CRON_ENABLED: booleanish.default(true),
    LEASES_CRON_PATTERN: z.string().default('0 2 * * *'),
    LEASES_CRON_TIMEZONE: z.string().default('Africa/Brazzaville'),

    // --- Worker PDF (Puppeteer) ------------------------------------------
    PDF_WORKER_ENABLED: booleanish.default(true),
    // Deux rendus simultanés : au delà, Chromium consomme plus de mémoire
    // que le VPS n'en a (risque identifié au plan de phases, § 2.10).
    PDF_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(2),
    PDF_JOB_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
    PDF_JOB_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
    /**
     * Chemin du navigateur de rendu. Indispensable lorsque le Chromium
     * empaqueté n'a pas été téléchargé (politique de build, réseau fermé) :
     * on pointe alors un Chrome ou un Edge déjà installé.
     */
    PUPPETEER_EXECUTABLE_PATH: z
      .string()
      .optional()
      .transform((value) => (value === undefined || value.trim() === '' ? undefined : value)),
    /** Arguments supplémentaires, séparés par des virgules (conteneurs). */
    PUPPETEER_LAUNCH_ARGS: z.string().default('--no-sandbox,--disable-dev-shm-usage'),

    // --- Jetons ----------------------------------------------------------
    JWT_ALGORITHM: z.enum(['HS256', 'RS256']).default('HS256'),
    JWT_ACCESS_SECRET: z.string().min(16).optional(),
    JWT_ACCESS_PRIVATE_KEY: z.string().optional(),
    JWT_ACCESS_PUBLIC_KEY: z.string().optional(),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    JWT_ISSUER: z.string().default('immodesk'),
    JWT_AUDIENCE: z.string().default('immodesk-api'),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    CURSOR_SECRET: z.string().min(16).default('immodesk-cursor-secret-dev'),

    // --- OTP -------------------------------------------------------------
    OTP_PEPPER: z.string().min(8).default('immodesk-otp-pepper-dev'),
    OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
    OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
    OTP_RESEND_AFTER_SECONDS: z.coerce.number().int().positive().default(60),
    OTP_CODE_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
    // Une valeur vide vaut « non défini » : cela permet de neutraliser le
    // code de développement sans supprimer la variable d'environnement.
    OTP_DEV_CODE: z
      .string()
      .optional()
      .transform((value) => (value === undefined || value.trim() === '' ? undefined : value)),

    // --- Limitation de débit ---------------------------------------------
    RATE_LIMIT_OTP_PER_PHONE: z.coerce.number().int().positive().default(3),
    RATE_LIMIT_OTP_PHONE_WINDOW_SECONDS: z.coerce.number().int().positive().default(600),
    RATE_LIMIT_OTP_PER_IP: z.coerce.number().int().positive().default(20),
    RATE_LIMIT_OTP_IP_WINDOW_SECONDS: z.coerce.number().int().positive().default(3600),

    // --- Invitations -----------------------------------------------------
    INVITATION_TTL_DAYS: z.coerce.number().int().positive().default(7),
    INVITATION_BASE_URL: z.string().default('https://app.immodesk.cg/invitations'),

    // --- Messagerie ------------------------------------------------------
    SMS_PROVIDER: z.enum(['fake']).default('fake'),
    WHATSAPP_PROVIDER: z.enum(['fake']).default('fake'),

    // --- Observabilité ---------------------------------------------------
    SENTRY_DSN: z.string().optional(),
    SWAGGER_ENABLED: booleanish.default(true),
  })
  .superRefine((cfg, ctx) => {
    if (cfg.JWT_ALGORITHM === 'HS256' && !cfg.JWT_ACCESS_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_ACCESS_SECRET'],
        message: 'JWT_ACCESS_SECRET est obligatoire lorsque JWT_ALGORITHM vaut HS256.',
      });
    }
    if (
      cfg.JWT_ALGORITHM === 'RS256' &&
      (!cfg.JWT_ACCESS_PRIVATE_KEY || !cfg.JWT_ACCESS_PUBLIC_KEY)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_ACCESS_PRIVATE_KEY'],
        message:
          'JWT_ACCESS_PRIVATE_KEY et JWT_ACCESS_PUBLIC_KEY sont obligatoires lorsque JWT_ALGORITHM vaut RS256.',
      });
    }
    if (cfg.NODE_ENV === 'production' && cfg.OTP_DEV_CODE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['OTP_DEV_CODE'],
        message: 'OTP_DEV_CODE ne doit jamais être défini en production.',
      });
    }
  });

export type AppConfig = z.infer<typeof configSchema>;

export function validateConfig(raw: Record<string, unknown>): AppConfig {
  const parsed = configSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(racine)'} : ${i.message}`)
      .join('\n');
    throw new Error(`Configuration invalide :\n${issues}`);
  }
  return parsed.data;
}
