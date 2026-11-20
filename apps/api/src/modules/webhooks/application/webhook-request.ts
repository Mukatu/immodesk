export type HeaderMap = Record<string, string | string[] | undefined>;

export function headerValue(headers: HeaderMap, name: string): string | null {
  const value = headers[name];
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

/** Corps JSON, ou `{}` s'il est vide, illisible ou n'est pas un objet (`null`, tableau, scalaire). */
export function parseJson(raw: Buffer): unknown {
  try {
    const parsed: unknown = raw.length > 0 ? JSON.parse(raw.toString('utf8')) : {};
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
