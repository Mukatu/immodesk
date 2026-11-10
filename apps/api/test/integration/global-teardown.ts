import Redis from 'ioredis';

/** Supprime les clés BullMQ du préfixe généré par `global-setup.ts`. */
export default async function globalTeardown(): Promise<void> {
  const prefix = process.env.QUEUE_PREFIX;
  if (!prefix || process.env.QUEUE_PREFIX_GENERATED !== '1') return;
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6390', {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  });
  try {
    await redis.connect();
    let cursor = '0';
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', `${prefix}:*`, 'COUNT', 500);
      cursor = next;
      if (keys.length) await redis.del(...keys);
    } while (cursor !== '0');
  } catch {
    // Nettoyage au mieux : des clés résiduelles sont inoffensives (préfixe unique).
  } finally {
    redis.disconnect();
  }
}
