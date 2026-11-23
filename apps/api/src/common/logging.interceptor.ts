import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { describeApiRoute, formatTelemetryLog } from '@erp/shared';
import { telemetryStorage, TelemetryRequestContext } from './telemetry-context';
import type { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Telemetry');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const rawPath = req.path || req.url || '/';
    const method = req.method || 'GET';

    // Ignore health check probes from cluttering the logs
    if (rawPath === '/health' || rawPath === '/favicon.ico') {
      return next.handle();
    }

    const desc = describeApiRoute(rawPath, method);
    const store: TelemetryRequestContext = {
      desc,
      startTime: performance.now(),
      dbTimeMs: 0,
      dbQueryCount: 0,
    };

    return new Observable((subscriber) => {
      telemetryStorage.run(store, () => {
        next
          .handle()
          .pipe(
            finalize(() => {
              const totalMs = performance.now() - store.startTime;
              const roundedTotal = Math.round(totalMs);
              const roundedDb = Math.round(store.dbTimeMs);

              // Set response headers for DevTools Network inspection and client telemetry
              try {
                if (!res.headersSent) {
                  res.setHeader(
                    'Server-Timing',
                    `total;desc="Total Request Time";dur=${roundedTotal}, db;desc="Database Queries";dur=${roundedDb}`,
                  );
                  res.setHeader('X-Telemetry-Page', desc.page);
                  res.setHeader('X-Telemetry-Feature', desc.feature);
                  res.setHeader('X-Telemetry-Operation', desc.operation);
                  res.setHeader('X-Execution-Time', `${roundedTotal}ms`);
                  if (store.dbQueryCount > 0) {
                    res.setHeader('X-Db-Time', `${roundedDb}ms`);
                    res.setHeader('X-Db-Queries', `${store.dbQueryCount}`);
                  }
                }
              } catch {
                // Header set safe ignore
              }

              // Output clean, descriptive log line in standard format
              const formattedLog = formatTelemetryLog(desc, roundedTotal, store.dbTimeMs);
              const querySuffix =
                store.dbQueryCount > 0
                  ? ` [${store.dbQueryCount} DB ${store.dbQueryCount === 1 ? 'query' : 'queries'}]`
                  : '';
              const status = res.statusCode || 200;
              const statusTag = status >= 400 ? ` [HTTP ${status}]` : '';

              this.logger.log(`${formattedLog}${querySuffix}${statusTag}`);
            }),
          )
          .subscribe(subscriber);
      });
    });
  }
}
