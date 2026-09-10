import { z } from 'zod';
import { phoneSchema } from './phone-schema.js';

/**
 * Schéma de création d'une organisation.
 */
export const createOrganizationSchema = z.object({
  type: z.enum(['AGENCY', 'INDEPENDENT_LANDLORD', 'INDEPENDENT_MANAGER']),
  legalName: z.string().min(1),
  tradeName: z.string().optional(),
  city: z.string().min(1),
  district: z.string().optional(),
  contactPhone: phoneSchema,
  contactEmail: z.string().email().optional(),
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

/**
 * Schéma de mise à jour des paramètres d'une organisation.
 * Tous les champs sont optionnels (mise à jour partielle).
 */
export const updateSettingsSchema = z
  .object({
    defaultPaymentDueDay: z.number().int().min(1).max(31),
    timezone: z.string().min(1),
    currency: z.literal('XAF'),
    defaultGraceDays: z.number().int().min(0),
    receiptFooterText: z.string().nullable(),
    whatsappEnabled: z.boolean(),
    smsEnabled: z.boolean(),
  })
  .partial();
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

/**
 * Schéma d'invitation d'un membre dans une organisation.
 */
export const inviteSchema = z.object({
  phone: phoneSchema,
  role: z.enum(['OWNER', 'MANAGER', 'COLLECTOR', 'ACCOUNTANT', 'VIEWER']),
  fullName: z.string().optional(),
});
export type InviteInput = z.infer<typeof inviteSchema>;
