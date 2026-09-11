import Redis from 'ioredis';

/**
 * Connexion Redis dédiée à BullMQ.
 *
 * POURQUOI PAS LE CLIENT PARTAGÉ `REDIS_CLIENT` — BullMQ exige
 * `maxRetriesPerRequest: null` : ses workers restent bloqués sur un `BRPOP`
 * de plusieurs secondes, qu'ioredis considérerait sinon comme une requête
 * en échec et abandonnerait. Le client partagé, lui, sert la limitation de
 * débit et doit au contraire échouer vite pour ne pas retarder une réponse
 * HTTP. Les deux besoins sont opposés : deux connexions, donc.
 *
 * `enableReadyCheck: false` évite un `INFO` au démarrage que certains Redis
 * gérés refusent.
 */
export function createBullConnection(redisUrl: string): Redis {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
    retryStrategy: (times) => Math.min(times * 200, 2000),
  });
}
