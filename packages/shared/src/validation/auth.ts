import { z } from "zod";
import { phoneSchema } from "./phone-schema.js";

/**
 * Schéma de la requête d'envoi d'un code OTP.
 */
export const otpRequestSchema = z.object({
  phone: phoneSchema,
  channel: z.enum(["SMS", "WHATSAPP"]).optional(),
});
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;

/**
 * Schéma de la requête de vérification d'un code OTP.
 * Le code doit contenir exactement 6 chiffres numériques.
 */
export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, "Le code doit contenir exactement 6 chiffres"),
  deviceName: z.string().optional(),
});
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
