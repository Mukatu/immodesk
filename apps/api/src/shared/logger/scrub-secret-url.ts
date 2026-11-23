/** `/v1/webhooks/mobile-money/openpay/<secret>` -> `.../openpay/[expurgé]`. */
export function scrubSecretUrl(url: string | undefined): string | undefined {
  return url?.replace(/(\/webhooks\/mobile-money\/openpay\/)[^/?#]+/i, '$1[expurgé]');
}

/**
 * Sérialiseur de requête de pino-http : la requête arrive DÉJÀ sérialisée (id, method, url,
 * headers, remoteAddress...) ; `req.socket` n'existe plus à ce stade. Le segment secret de
 * l'URL du callback OpenPay est expurgé.
 */
export function serializeRequest<T extends { url?: string }>(req: T): T {
  return { ...req, url: scrubSecretUrl(req.url) };
}
