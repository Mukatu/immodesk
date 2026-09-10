import { API_INTERNAL_URL } from '@/lib/api/server-config';

/**
 * Proxy générique, actif uniquement en e2e (E2E_MOCK=1) : relaie les appels directs du
 * navigateur vers l'API (NEXT_PUBLIC_API_URL) vers le même process Next côté serveur, afin
 * qu'ils traversent le même intercepteur MSW (msw/node, voir src/instrumentation.ts) que les
 * route handlers /api/auth/* — un seul état mocké partagé, au lieu de deux instances MSW
 * indépendantes (navigateur et serveur) qui ne se voient pas.
 * Jamais utilisé en production : NEXT_PUBLIC_API_URL y pointe directement vers l'API réelle.
 */
async function handleProxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  // Coupe-circuit : cette route ne doit jamais exister en dehors des runs e2e.
  if (process.env.E2E_MOCK !== '1') {
    return new Response(null, { status: 404 });
  }

  const { path } = await context.params;
  const incomingUrl = new URL(request.url);
  const target = `${API_INTERNAL_URL}/${path.join('/')}${incomingUrl.search}`;

  const forwardedHeaders = new Headers();
  const auth = request.headers.get('authorization');
  const orgId = request.headers.get('x-organization-id');
  const contentType = request.headers.get('content-type');
  const idempotencyKey = request.headers.get('idempotency-key');
  if (auth) forwardedHeaders.set('authorization', auth);
  if (orgId) forwardedHeaders.set('x-organization-id', orgId);
  if (contentType) forwardedHeaders.set('content-type', contentType);
  if (idempotencyKey) forwardedHeaders.set('idempotency-key', idempotencyKey);

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const upstream = await fetch(target, {
    method: request.method,
    headers: forwardedHeaders,
    body: hasBody ? await request.text() : undefined,
  });

  const responseBody = upstream.status === 204 ? null : await upstream.arrayBuffer();
  return new Response(responseBody, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}

export {
  handleProxy as GET,
  handleProxy as POST,
  handleProxy as PATCH,
  handleProxy as DELETE,
  handleProxy as PUT,
};
