import { describe, expect, it, vi } from 'vitest';

import { singleFlightRefresh } from '@/lib/auth/refresh-singleflight';

describe('singleFlightRefresh', () => {
  it('mutualise les appels concurrents sur la même clé', async () => {
    const run = vi.fn(async () => 'ok');
    const results = await Promise.all([
      singleFlightRefresh('a', run),
      singleFlightRefresh('a', run),
      singleFlightRefresh('a', run),
    ]);
    expect(results).toEqual(['ok', 'ok', 'ok']);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('ne mélange pas les clés et oublie le résultat après le délai', async () => {
    vi.useFakeTimers();
    const run = vi.fn(async () => 'ok');
    await singleFlightRefresh('b', run);
    await singleFlightRefresh('c', run);
    expect(run).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(11_000);
    await singleFlightRefresh('b', run);
    expect(run).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it('oublie immédiatement un échec technique', async () => {
    const run = vi.fn().mockRejectedValueOnce(new Error('réseau')).mockResolvedValue('ok');
    await expect(singleFlightRefresh('d', run)).rejects.toThrow('réseau');
    await expect(singleFlightRefresh('d', run)).resolves.toBe('ok');
  });
});
