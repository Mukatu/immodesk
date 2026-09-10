/**
 * Rendu d'un modèle de message.
 *
 * Deux syntaxes sont acceptées, celle d'Immodesk (`{{nom}}`) et celle des
 * modèles WhatsApp Cloud API (`{{1}}`, `{{2}}`, ...). Une variable absente
 * est remplacée par une chaîne vide plutôt que laissée en clair : un
 * `{{code}}` visible dans un SMS serait un défaut visible par le client.
 */
export function renderTemplate(body: string, variables: Record<string, string>): string {
  const positional = Object.values(variables);
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
    if (/^\d+$/.test(key)) {
      const index = Number.parseInt(key, 10) - 1;
      return positional[index] ?? '';
    }
    return variables[key] ?? '';
  });
}
