import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { DomainError, type ErrorDetails } from './domain-error';
import { ERROR_CATALOG, type ErrorCode } from './error-codes';

interface ErrorEnvelope {
  code: string;
  message: string;
  details: ErrorDetails;
}

/**
 * Convertit toute exception en enveloppe stable `{ code, message, details }`.
 * Format figé par docs/api/phase0-contract.md.
 */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string | undefined) ?? undefined;

    const { status, body } = this.render(exception, requestId);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status} ${body.code}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.debug?.(`${request.method} ${request.url} -> ${status} ${body.code}`);
    }

    response.status(status).json(body);
  }

  private render(
    exception: unknown,
    requestId?: string,
  ): { status: number; body: ErrorEnvelope } {
    const withRequestId = (details: ErrorDetails): ErrorDetails =>
      requestId ? { ...details, requestId } : details;

    if (exception instanceof DomainError) {
      return {
        status: exception.status,
        body: {
          code: exception.code,
          message: exception.message,
          details: withRequestId(exception.details ?? {}),
        },
      };
    }

    if (exception instanceof ThrottlerException) {
      const code: ErrorCode = 'IAM.RATE_LIMITED';
      return {
        status: HttpStatus.TOO_MANY_REQUESTS,
        body: {
          code,
          message: ERROR_CATALOG[code].message,
          details: withRequestId({}),
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      // Une DomainError sérialisée peut remonter au travers d'une HttpException.
      if (typeof payload === 'object' && payload !== null && 'code' in payload) {
        const p = payload as Partial<ErrorEnvelope>;
        return {
          status,
          body: {
            code: String(p.code),
            message: String(p.message ?? exception.message),
            details: withRequestId((p.details as ErrorDetails) ?? {}),
          },
        };
      }
      return {
        status,
        body: {
          code: this.codeForHttpStatus(status),
          message: this.messageFromHttpException(payload, exception.message),
          details: withRequestId(this.detailsFromHttpException(payload)),
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        code: 'PLATFORM.INTERNAL_ERROR',
        message: ERROR_CATALOG['PLATFORM.INTERNAL_ERROR'].message,
        details: withRequestId({}),
      },
    };
  }

  private codeForHttpStatus(status: number): string {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return 'IAM.UNAUTHENTICATED';
      case HttpStatus.FORBIDDEN:
        return 'IAM.FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'PLATFORM.NOT_FOUND';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'IAM.RATE_LIMITED';
      case HttpStatus.BAD_REQUEST:
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'VALIDATION.INVALID_PAYLOAD';
      default:
        return status >= 500 ? 'PLATFORM.INTERNAL_ERROR' : 'VALIDATION.INVALID_PAYLOAD';
    }
  }

  private messageFromHttpException(payload: unknown, fallback: string): string {
    if (typeof payload === 'string') return payload;
    if (typeof payload === 'object' && payload !== null && 'message' in payload) {
      const m = (payload as { message: unknown }).message;
      if (Array.isArray(m)) return 'Requête invalide.';
      if (typeof m === 'string') return m;
    }
    return fallback;
  }

  private detailsFromHttpException(payload: unknown): ErrorDetails {
    if (typeof payload === 'object' && payload !== null && 'message' in payload) {
      const m = (payload as { message: unknown }).message;
      if (Array.isArray(m)) return { fields: m };
    }
    return {};
  }
}
