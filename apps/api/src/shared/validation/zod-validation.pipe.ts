import { Injectable, type PipeTransform } from '@nestjs/common';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { DomainError } from '../errors/domain-error';

/**
 * Valide et convertit une entrée avec un schéma zod.
 * Toute `ZodError` devient `VALIDATION.INVALID_PAYLOAD` (422) avec le détail
 * par champ, conformément à l'enveloppe d'erreur du contrat.
 */
@Injectable()
export class ZodValidationPipe<T extends ZodTypeAny> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new DomainError('VALIDATION.INVALID_PAYLOAD', {
          fields: error.issues.map((issue) => ({
            path: issue.path.join('.') || '(racine)',
            message: issue.message,
          })),
        });
      }
      throw error;
    }
  }
}

/** Fabrique concise : `@Body(zodBody(createOrganizationSchema))`. */
export function zodBody<T extends ZodTypeAny>(schema: T): ZodValidationPipe<T> {
  return new ZodValidationPipe(schema);
}
