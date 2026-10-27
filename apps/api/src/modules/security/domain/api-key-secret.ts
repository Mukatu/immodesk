import { createHash } from 'node:crypto';
import { newOpaqueToken } from '../../../shared/ids/uuid';

const SECRET_LABEL = 'imk';
const PUBLIC_PREFIX_LENGTH = 8;

export interface GeneratedApiKeySecret {
  /** Chaîne complète rendue au client — une seule fois (création ou rotation). */
  secret: string;
  /** Fragment public, stocké et affiché (`api_keys.key_prefix`). */
  prefix: string;
}

/**
 * Génère un secret de clé d'API opaque et son préfixe public.
 *
 * DÉCISION (le contrat évoque Argon2id « déjà utilisé pour les OTP » — en
 * réalité `identity/domain/otp.ts` hache les codes OTP en SHA-256 poivré, et
 * `user_credentials.password_hash` déclare `argon2id` sans qu'aucun mot de
 * passe ne soit encore émis nulle part dans le dépôt). Argon2id ralentit
 * volontairement le hachage pour résister à une attaque hors ligne sur un
 * secret à FAIBLE entropie choisi par un humain (mot de passe, code PIN) :
 * il n'apporte rien ici. Un secret de clé d'API est un jeton opaque de 32
 * octets (256 bits) généré côté serveur — même famille que les refresh
 * tokens (`identity/domain/refresh-token.ts`) — dont l'entropie rend un
 * condensat SHA-256 simple déjà insensible à toute attaque par force brute
 * ou par table arc-en-ciel : ajouter un coût Argon2id ne ferait que
 * ralentir chaque vérification de requête machine-to-machine sans gain de
 * sécurité mesurable. Le secret en clair n'est de toute façon jamais stocké,
 * seul son condensat l'est (`api_keys.key_hash`, colonne UNIQUE).
 */
export function generateApiKeySecret(): GeneratedApiKeySecret {
  const token = newOpaqueToken(32);
  const prefix = token.slice(0, PUBLIC_PREFIX_LENGTH);
  return { secret: `${SECRET_LABEL}_${token}`, prefix };
}

export function hashApiKeySecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}
