/**
 * Hook de démarrage du serveur Next (stable depuis Next 15). Utilisé uniquement pour
 * activer l'intercepteur MSW côté serveur en e2e (E2E_MOCK=1), afin que les route
 * handlers /api/auth/* qui relaient vers l'API ne dépendent jamais d'un vrai backend.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.E2E_MOCK === '1') {
    const { mockServer } = await import('@/mocks/node-server');
    mockServer.listen({ onUnhandledRequest: 'bypass' });
  }
}
