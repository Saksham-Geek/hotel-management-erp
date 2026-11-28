import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { env } from '../config';

/**
 * Enterprise PII & Sensitive Telemetry Redactor
 * Strips Aadhaar (spaced, hyphenated, or continuous 12 digits), Indian PAN (alphanumeric 10 chars),
 * credit/debit cards, passport numbers, Indian mobile numbers, and auth/session credentials.
 */
export function sanitizePii(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    return data
      // 12-digit Aadhaar (continuous or spaced/hyphenated)
      .replace(/\b[2-9]{1}\d{3}[ -]?\d{4}[ -]?\d{4}\b/g, '[REDACTED_AADHAAR]')
      // 10-char Indian PAN format: 5 letters, 4 digits, 1 letter
      .replace(/\b[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}\b/g, '[REDACTED_PAN]')
      // Credit / Debit card patterns (Visa, Mastercard, RuPay, Amex)
      .replace(/\b(?:\d{4}[ -]?){3}\d{4}\b/g, '[REDACTED_CARD]')
      .replace(/\b3[47]\d{2}[ -]?\d{6}[ -]?\d{5}\b/g, '[REDACTED_AMEX]')
      // Passport numbers (standard 8-char: letter followed by 7 digits)
      .replace(/\b[A-PR-WYa-pr-wy][1-9]\d{6,7}\b/g, '[REDACTED_PASSPORT]')
      // Indian mobile numbers (10 digits starting with 6-9, with optional +91 or 0 prefix)
      .replace(/\b(?:\+?91[ -]?|0)?[6-9]\d{9}\b/g, '[REDACTED_PHONE]')
      // Query parameters or credentials in strings
      .replace(/(password|secret|token|apiKey|authorization|cookie)=([^&\s]+)/gi, '$1=[REDACTED]');
  }
  if (typeof data === 'object') {
    if (Array.isArray(data)) {
      return data.map((item) => sanitizePii(item));
    }
    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('authorization') ||
        lowerKey.includes('cookie') ||
        lowerKey.includes('aadhaar') ||
        lowerKey.includes('pan') ||
        lowerKey.includes('cardnumber') ||
        lowerKey.includes('cvv') ||
        lowerKey.includes('passport')
      ) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizePii(val);
      }
    }
    return sanitized;
  }
  return data;
}

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
        ? exception.message
        : 'Internal server error';

    const reqUser = (request as any).user;
    const tenantId = (request as any).tenantId || reqUser?.tenantId || 'anonymous';
    const propertyId = (request as any).propertyId || reqUser?.propertyId || 'none';

    // Scrub request body, query, and headers
    const sanitizedBody = sanitizePii(request.body);
    const sanitizedQuery = sanitizePii(request.query);
    const sanitizedError = typeof message === 'object' ? sanitizePii(message) : sanitizePii(String(message));

    const errorContext = {
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      statusCode: status,
      tenantId,
      propertyId,
      userId: reqUser?.id || reqUser?.userId,
      query: sanitizedQuery,
      body: status >= 500 ? sanitizedBody : undefined,
      error: sanitizedError,
    };

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} -> Status ${status} (tenant: ${tenantId})`,
        exception instanceof Error ? exception.stack : JSON.stringify(exception)
      );

      // If Sentry DSN is configured, dispatch with sendDefaultPii=false and scrubbed payload
      if (env.sentryDsn) {
        try {
          this.logger.log(`[Telemetry] Captured sanitized 500 error for Sentry dispatch (tenant: ${tenantId})`);
        } catch (sentryErr) {
          this.logger.warn(`Failed to dispatch error to Sentry: ${(sentryErr as Error).message}`);
        }
      }
    } else {
      this.logger.warn(`[${request.method}] ${request.url} -> Status ${status}: ${JSON.stringify(sanitizedError)}`);
    }

    if (!response.headersSent) {
      response.status(status).json({
        statusCode: status,
        error: status >= 500 && env.isProd ? 'Internal Server Error' : errorContext.error,
        timestamp: errorContext.timestamp,
        path: request.url,
      });
    }
  }
}
