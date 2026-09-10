import { z } from "zod";
import { isValidCongoMobile, normalizePhoneCongo } from "../phone.js";

/**
 * Schéma zod réutilisable pour un numéro de téléphone mobile congolais.
 *
 * Accepte une chaîne dans n'importe quelle forme locale courante
 * (ex: "066000001", "+242066000001"), la normalise au format E.164
 * via `normalizePhoneCongo`, puis vérifie sa validité via
 * `isValidCongoMobile`. La sortie du schéma est toujours la chaîne
 * E.164 normalisée (ex: "+242066000001").
 */
export const phoneSchema = z.string().transform((val, ctx) => {
  try {
    const normalized = normalizePhoneCongo(val);
    if (!isValidCongoMobile(normalized)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Numéro de téléphone invalide : attendu un mobile congolais valide " +
          '(+242 suivi de "06" ou "05" puis 7 chiffres).',
      });
      return z.NEVER;
    }
    return normalized;
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Numéro de téléphone invalide : attendu un mobile congolais valide " +
        '(+242 suivi de "06" ou "05" puis 7 chiffres).',
    });
    return z.NEVER;
  }
});
