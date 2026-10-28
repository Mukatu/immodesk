import { randomBytes } from 'node:crypto';

/**
 * Isole les files BullMQ de cette exécution : sans préfixe propre, deux
 * exécutions simultanées (autre terminal, autre agent, CI locale) partageaient
 * les files `immodesk:*` de Redis et leurs workers se volaient mutuellement
 * des travaux. Workers et producteurs lisent le même `QUEUE_PREFIX` (variable
 * héritée par les processus de test). Un préfixe déjà fourni par
 * l'environnement est respecté ; l'index de base Redis se règle via REDIS_URL.
 */
export default function globalSetup(): void {
  if (!process.env.QUEUE_PREFIX) {
    process.env.QUEUE_PREFIX = `immodesk-test-${randomBytes(4).toString('hex')}`;
    process.env.QUEUE_PREFIX_GENERATED = '1';
  }
}
