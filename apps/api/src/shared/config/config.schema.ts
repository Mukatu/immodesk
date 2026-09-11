import { z } from 'zod';

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((v) =>
    typeof v === 'boolean' ? v : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase()),
  );

const port = z.coerce.number().int().min(1).max(65535);

/** Texte facultatif : une chaîne vide vaut « non défini ». */
const optionalText = z
  .string()
  .optional()
  .transform((value) => (value === undefined || value.trim() === '' ? undefined : value.trim()));

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

    // --- Messagerie (phase 3 : WhatsApp d'abord, SMS en repli) ----------
    SMS_PROVIDER: z.enum(['fake', 'android_gateway']).default('fake'),
    WHATSAPP_PROVIDER: z.enum(['fake', 'meta']).default('fake'),
    WHATSAPP_PHONE_NUMBER_ID: optionalText,
    WHATSAPP_ACCESS_TOKEN: optionalText,
    // Secret d'application Meta : signature `X-Hub-Signature-256` des webhooks.
    WHATSAPP_APP_SECRET: z.string().min(8).default('immodesk-dev-whatsapp-app-secret'),
    // Jeton choisi par l'exploitant, rejoué par Meta lors de la vérification GET.
    WHATSAPP_VERIFY_TOKEN: z.string().min(8).default('immodesk-dev-whatsapp-verify-token'),
    WHATSAPP_API_VERSION: z.string().default('v21.0'),
    WHATSAPP_API_BASE_URL: z.string().url().default('https://graph.facebook.com'),
    SMS_GATEWAY_URL: optionalText,
    SMS_GATEWAY_USERNAME: optionalText,
    SMS_GATEWAY_PASSWORD: optionalText,
    SMS_GATEWAY_WEBHOOK_SECRET: z.string().min(8).default('immodesk-dev-sms-webhook-secret'),
    NOTIFICATIONS_WORKER_ENABLED: booleanish.default(true),
    NOTIFICATIONS_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(4),

    // --- Liens publics (quittances, SMS) ---------------------------------
    // Page de vérification : `{PUBLIC_WEB_BASE_URL}/verifier/{token}` (QR et SMS).
    PUBLIC_WEB_BASE_URL: z.string().url().default('https://app.immodesk.cg'),
    // Racine publique de l'API, pour les liens courts de PDF envoyés par SMS.
    PUBLIC_API_BASE_URL: z.string().url().default('http://localhost:3000'),
    // Validité des liens de PDF joints aux messages : 7 jours, plafond SigV4.
    DOCUMENT_LINK_TTL_SECONDS: z.coerce.number().int().min(60).max(604_800).default(604_800),
    LINK_SIGNING_SECRET: z.string().min(16).default('immodesk-dev-link-signing-secret'),
    RATE_LIMIT_PUBLIC_PER_MINUTE: z.coerce.number().int().positive().default(30),

    // --- Facturation (phase 3) -------------------------------------------
    BILLING_CRON_ENABLED: booleanish.default(true),
    BILLING_CRON_PATTERN: z.string().default('0 3 * * *'),
    BILLING_CRON_TIMEZONE: z.string().default('Africa/Brazzaville'),
    RECEIPT_PDF_FORMAT: z.enum(['A5', 'A4']).default('A5'),

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
    if (
      cfg.WHATSAPP_PROVIDER === 'meta' &&
      (!cfg.WHATSAPP_PHONE_NUMBER_ID || !cfg.WHATSAPP_ACCESS_TOKEN)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['WHATSAPP_PHONE_NUMBER_ID'],
        message:
          'WHATSAPP_PHONE_NUMBER_ID et WHATSAPP_ACCESS_TOKEN sont obligatoires lorsque WHATSAPP_PROVIDER vaut meta.',
      });
    }
    if (
      cfg.SMS_PROVIDER === 'android_gateway' &&
      (!cfg.SMS_GATEWAY_URL || !cfg.SMS_GATEWAY_USERNAME || !cfg.SMS_GATEWAY_PASSWORD)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SMS_GATEWAY_URL'],
        message:
          'SMS_GATEWAY_URL, SMS_GATEWAY_USERNAME et SMS_GATEWAY_PASSWORD sont obligatoires lorsque SMS_PROVIDER vaut android_gateway.',
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
