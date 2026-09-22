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
 * Valeurs de développement des secrets. Publiques par construction (dépôt,
 * `.env.example`) : en production, la validation refuse qu'elles subsistent.
 */
export const DEV_SECRET_DEFAULTS = {
  CURSOR_SECRET: 'immodesk-cursor-secret-dev',
  OTP_PEPPER: 'immodesk-otp-pepper-dev',
  WHATSAPP_APP_SECRET: 'immodesk-dev-whatsapp-app-secret',
  WHATSAPP_VERIFY_TOKEN: 'immodesk-dev-whatsapp-verify-token',
  SMS_GATEWAY_WEBHOOK_SECRET: 'immodesk-dev-sms-webhook-secret',
  LINK_SIGNING_SECRET: 'immodesk-dev-link-signing-secret',
  MOMO_SIMULATOR_SECRET: 'immodesk-dev-momo-simulator-secret',
} as const;

const PRODUCTION_SECRET_KEYS = Object.keys(DEV_SECRET_DEFAULTS) as Array<
  keyof typeof DEV_SECRET_DEFAULTS
>;

/** Liste d'origines séparées par des virgules ; vide = non défini. */
const originList = z
  .string()
  .optional()
  .transform((value) => {
    const list = (value ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
    return list.length > 0 ? list : undefined;
  });

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
    // Origines autorisées par CORS (`https://app.immodesk.cg,https://portail.immodesk.cg`).
    // Absente : toute origine est reflétée — acceptable sur un poste de
    // développement, refusé au démarrage en production (cf. superRefine).
    CORS_ALLOWED_ORIGINS: originList,

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
    CURSOR_SECRET: z.string().min(16).default(DEV_SECRET_DEFAULTS.CURSOR_SECRET),

    // --- OTP -------------------------------------------------------------
    OTP_PEPPER: z.string().min(8).default(DEV_SECRET_DEFAULTS.OTP_PEPPER),
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
    WHATSAPP_APP_SECRET: z.string().min(8).default(DEV_SECRET_DEFAULTS.WHATSAPP_APP_SECRET),
    // Jeton choisi par l'exploitant, rejoué par Meta lors de la vérification GET.
    WHATSAPP_VERIFY_TOKEN: z.string().min(8).default(DEV_SECRET_DEFAULTS.WHATSAPP_VERIFY_TOKEN),
    WHATSAPP_API_VERSION: z.string().default('v21.0'),
    WHATSAPP_API_BASE_URL: z.string().url().default('https://graph.facebook.com'),
    SMS_GATEWAY_URL: optionalText,
    SMS_GATEWAY_USERNAME: optionalText,
    SMS_GATEWAY_PASSWORD: optionalText,
    SMS_GATEWAY_WEBHOOK_SECRET: z
      .string()
      .min(8)
      .default(DEV_SECRET_DEFAULTS.SMS_GATEWAY_WEBHOOK_SECRET),
    NOTIFICATIONS_WORKER_ENABLED: booleanish.default(true),
    NOTIFICATIONS_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(4),

    // --- Liens publics (quittances, SMS) ---------------------------------
    // Page de vérification : `{PUBLIC_WEB_BASE_URL}/verifier/{token}` (QR et SMS).
    PUBLIC_WEB_BASE_URL: z.string().url().default('https://app.immodesk.cg'),
    // Racine publique de l'API, pour les liens courts de PDF envoyés par SMS.
    PUBLIC_API_BASE_URL: z.string().url().default('http://localhost:3000'),
    // Validité des liens de PDF joints aux messages : 7 jours, plafond SigV4.
    DOCUMENT_LINK_TTL_SECONDS: z.coerce.number().int().min(60).max(604_800).default(604_800),
    LINK_SIGNING_SECRET: z.string().min(16).default(DEV_SECRET_DEFAULTS.LINK_SIGNING_SECRET),
    RATE_LIMIT_PUBLIC_PER_MINUTE: z.coerce.number().int().positive().default(30),

    // --- Facturation (phase 3) -------------------------------------------
    BILLING_CRON_ENABLED: booleanish.default(true),
    BILLING_CRON_PATTERN: z.string().default('0 3 * * *'),
    BILLING_CRON_TIMEZONE: z.string().default('Africa/Brazzaville'),
    RECEIPT_PDF_FORMAT: z.enum(['A5', 'A4']).default('A5'),

    // --- Mobile Money (phase 4) -------------------------------------------
    // `MOMO_PROVIDER_DEFAULT` sélectionne l'implémentation quand l'organisation
    // n'a pas encore choisi (`paymentMethods.mobileMoneyAggregator.provider`
    // fait foi sinon). Le simulateur est le seul actif hors production tant
    // que le contrat CinetPay n'est pas signé (arbitrage 6 du contrat phase 4).
    MOMO_PROVIDER_DEFAULT: z.enum(['SIMULATOR', 'CINETPAY']).default('SIMULATOR'),
    MOMO_SIMULATOR_DELAY_MS: z.coerce.number().int().nonnegative().default(1500),
    MOMO_SIMULATOR_SECRET: z.string().min(8).default(DEV_SECRET_DEFAULTS.MOMO_SIMULATOR_SECRET),
    // URL publique par laquelle le simulateur (et CinetPay) rappellent l'API.
    MOMO_WEBHOOK_BASE_URL: z.string().url().default('http://localhost:3000'),
    CINETPAY_API_KEY: optionalText,
    CINETPAY_SITE_ID: optionalText,
    CINETPAY_SECRET_KEY: optionalText,
    CINETPAY_BASE_URL: z.string().url().default('https://api-checkout.cinetpay.com'),

    // --- Synchronisation mobile par lots (phase 5) ------------------------
    // Limite dure appliquée par le serveur à `POST /v1/sync/batches`.
    SYNC_MAX_OPERATIONS_PER_BATCH: z.coerce.number().int().positive().max(1000).default(100),
    SYNC_MAX_BODY_BYTES: z.coerce.number().int().positive().default(1_048_576),

    // --- Configuration mobile (`GET /v1/mobile/config`, phase 5) ---------
    // Valeurs par défaut appliquées par l'application sans être recompilée.
    MOBILE_MAX_PHOTO_BYTES: z.coerce.number().int().positive().default(1_500_000),
    MOBILE_PHOTO_MAX_DIMENSION: z.coerce.number().int().positive().default(1600),
    MOBILE_PHOTO_QUALITY: z.coerce.number().int().min(1).max(100).default(80),
    MOBILE_MAX_SIGNATURE_BYTES: z.coerce.number().int().positive().default(200_000),
    MOBILE_RETENTION_HOURS: z.coerce.number().int().positive().default(72),
    MOBILE_SYNC_INTERVAL_SECONDS: z.coerce.number().int().positive().default(300),
    // Conseillé au mobile (taille de lot RECOMMANDÉE), distinct du plafond
    // dur `SYNC_MAX_OPERATIONS_PER_BATCH` que le serveur applique réellement.
    MOBILE_MAX_OPERATIONS_PER_BATCH: z.coerce.number().int().positive().default(50),
    MOBILE_OFFLINE_WRITES_ENABLED: booleanish.default(true),

    // --- Rapprochement bancaire (phase 6) --------------------------------
    RECONCILIATION_SUGGESTION_THRESHOLD: z.coerce.number().int().min(50).max(95).default(75),
    RECONCILIATION_DATE_WINDOW_DAYS: z.coerce.number().int().positive().default(15),
    BANK_STATEMENT_MAX_BYTES: z.coerce.number().int().positive().default(10_485_760),
    CHECK_CLEARING_ALERT_DAYS: z.coerce.number().int().positive().default(15),
    CHECK_ALERT_CRON_ENABLED: booleanish.default(false),
    CHECK_ALERT_CRON_PATTERN: z.string().default('0 7 * * *'),
    CHECK_ALERT_CRON_TIMEZONE: z.string().default('Africa/Brazzaville'),

    // --- Gestion d'agence : mandats, relevés, reversements (phase 7) -----
    AGENCY_STATEMENT_DEFAULT_PAYOUT_DAY: z.coerce.number().int().min(1).max(28).default(10),
    AGENCY_DEFAULT_COMMISSION_RATE_BPS: z.coerce.number().int().min(0).max(10_000).default(1000),
    AGENCY_COMMISSION_VAT_RATE_BPS: z.coerce.number().int().min(0).max(10_000).default(1800),
    AGENCY_MONTHLY_CRON_ENABLED: booleanish.default(true),
    AGENCY_MONTHLY_CRON_PATTERN: z.string().default('0 4 * * *'),
    AGENCY_MONTHLY_CRON_TIMEZONE: z.string().default('Africa/Brazzaville'),
    // Lien d'activation du portail bailleur envoyé par WhatsApp.
    PORTAL_BASE_URL: z.string().url().default('https://portail.immodesk.cg'),

    // --- États des lieux, compteurs, charges, maintenance (phase 8) ------
    UTILITY_RUN_DAY_OF_MONTH: z.coerce.number().int().min(1).max(28).default(3),
    MAINTENANCE_SLA_URGENT_HOURS: z.coerce.number().int().positive().default(4),
    MAINTENANCE_SLA_HIGH_HOURS: z.coerce.number().int().positive().default(24),
    MAINTENANCE_SLA_NORMAL_DAYS: z.coerce.number().int().positive().default(5),
    MAINTENANCE_SLA_LOW_DAYS: z.coerce.number().int().positive().default(15),
    INSPECTION_SIGNATURE_GRACE_DAYS: z.coerce.number().int().positive().default(15),

    // --- Relances, pénalités, tableaux de bord, exports (phase 9) --------
    DUNNING_CRON_ENABLED: booleanish.default(true),
    DUNNING_MAX_RUNS_PER_HOUR: z.coerce.number().int().positive().default(500),
    EXPORT_SYNC_ROW_LIMIT: z.coerce.number().int().positive().default(10_000),
    EXPORT_LINK_TTL_SECONDS: z.coerce.number().int().positive().default(3600),

    // --- Abonnement SaaS (phase 10, docs/api/phase10-contract.md) --------
    SUBSCRIPTION_CRON_ENABLED: booleanish.default(true),
    // Jour du mois qui ancre la première échéance d'un abonnement MENSUEL
    // (`subscriptions.next_billing_date`). Les abonnements TRIMESTRIELS et
    // ANNUELS gardent le même jour du mois, à l'échéance de leur intervalle.
    SUBSCRIPTION_BILLING_DAY_OF_MONTH: z.coerce.number().int().min(1).max(28).default(1),
    // Valeur par défaut de `subscriptions.grace_days` à la souscription :
    // ACTIVE → PAST_DUE → SUSPENDED après ce délai (contrat, § « Cycle de vie »).
    SUBSCRIPTION_DEFAULT_GRACE_DAYS: z.coerce.number().int().positive().default(7),

    // --- Onboarding guidé, import de portefeuille (phase 10) -------------
    PORTFOLIO_IMPORT_MAX_ROWS: z.coerce.number().int().positive().default(5000),

    // --- Apport d'affaires / parrainage (phase 10) ------------------------
    REFERRAL_DEFAULT_PROGRAM_CODE: z.string().default('IMD-STD'),

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
    if (
      cfg.MOMO_PROVIDER_DEFAULT === 'CINETPAY' &&
      (!cfg.CINETPAY_API_KEY || !cfg.CINETPAY_SITE_ID || !cfg.CINETPAY_SECRET_KEY)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CINETPAY_API_KEY'],
        message:
          'CINETPAY_API_KEY, CINETPAY_SITE_ID et CINETPAY_SECRET_KEY sont obligatoires lorsque MOMO_PROVIDER_DEFAULT vaut CINETPAY.',
      });
    }
    // Sans liste explicite, `bootstrap.ts` reflète toute origine avec les
    // cookies (`credentials: true`) : surface CSRF et exfiltration par une
    // page tierce. Acceptable en développement, jamais en production.
    if (cfg.NODE_ENV === 'production' && !cfg.CORS_ALLOWED_ORIGINS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CORS_ALLOWED_ORIGINS'],
        message:
          'CORS_ALLOWED_ORIGINS est obligatoire en production : lister les origines autorisées, séparées par des virgules (ex. https://app.immodesk.cg,https://portail.immodesk.cg), faute de quoi toute origine serait acceptée avec les cookies.',
      });
    }
    if (cfg.NODE_ENV === 'production' && cfg.OTP_DEV_CODE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['OTP_DEV_CODE'],
        message: 'OTP_DEV_CODE ne doit jamais être défini en production.',
      });
    }
    // Les valeurs par défaut des secrets ne servent qu'au poste de
    // développement : elles sont publiques (dépôt, `.env.example`). En
    // production, chacune doit avoir été remplacée, sinon curseurs, liens
    // signés, OTP et webhooks sont forgeables par quiconque lit le code.
    if (cfg.NODE_ENV === 'production') {
      for (const name of PRODUCTION_SECRET_KEYS) {
        if (cfg[name] === DEV_SECRET_DEFAULTS[name]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [name],
            message: `${name} garde sa valeur de développement : à remplacer en production.`,
          });
        }
      }
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
