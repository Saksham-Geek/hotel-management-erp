import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from '../config';
import { getTelemetryContext, recordDbTiming } from '../common/telemetry-context';

function parseSqlOperation(sql: string): string {
  if (!sql) return 'SQL Query';
  const clean = sql.replace(/\s+/g, ' ').trim();
  const verbMatch = clean.match(/^(SELECT|INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|TRUNCATE)/i);
  const verb = verbMatch ? verbMatch[1].toUpperCase() : 'QUERY';

  if (verb === 'SELECT') {
    const fromMatch = clean.match(/FROM\s+([a-zA-Z0-9_,\s]+?)(?:\s+(?:WHERE|JOIN|INNER|LEFT|RIGHT|CROSS|GROUP|ORDER|LIMIT|$))/i);
    const mainTable = fromMatch
      ? fromMatch[1]
          .split(',')[0]
          .trim()
          .split(' ')[0]
          .replace(/["']/g, '')
      : '';
    const joinMatches = [...clean.matchAll(/(?:JOIN)\s+([a-zA-Z0-9_]+)/gi)].map((m) => m[1]);
    const tableList = Array.from(new Set([mainTable, ...joinMatches].filter(Boolean))).join(', ');
    return `SELECT ${tableList || 'records'}`;
  }
  if (verb === 'INSERT') {
    const tableMatch = clean.match(/INTO\s+([a-zA-Z0-9_]+)/i);
    return `INSERT INTO ${tableMatch ? tableMatch[1] : 'record'}`;
  }
  if (verb === 'UPDATE') {
    const tableMatch = clean.match(/UPDATE\s+([a-zA-Z0-9_]+)/i);
    return `UPDATE ${tableMatch ? tableMatch[1] : 'record'}`;
  }
  if (verb === 'DELETE') {
    const tableMatch = clean.match(/FROM\s+([a-zA-Z0-9_]+)/i);
    return `DELETE FROM ${tableMatch ? tableMatch[1] : 'record'}`;
  }
  return `${verb} statement`;
}

function instrumentClient(client: PoolClient, logger: Logger): PoolClient {
  const originalQuery = client.query.bind(client);

  const instrumentedQuery = function (queryTextOrConfig: any, ...args: any[]): any {
    const text = typeof queryTextOrConfig === 'string' ? queryTextOrConfig : queryTextOrConfig?.text || '';
    const isInternal = /^\s*(begin|commit|rollback|select\s+set_config)/i.test(text);

    const start = performance.now();
    const result = (originalQuery as any)(queryTextOrConfig, ...args);

    if (result && typeof result.then === 'function') {
      return result.then((res: any) => {
        const duration = performance.now() - start;
        if (!isInternal) {
          recordDbTiming(duration);
          const op = parseSqlOperation(text);
          const ctx = getTelemetryContext();
          const prefix = ctx ? `[${ctx.desc.page}] - [${ctx.desc.feature}]` : '[Database Engine]';
          logger.log(`[DB] ${prefix} - ${op} (done in ${Math.round(duration)}ms)`);
        }
        return res;
      });
    }

    return result;
  };

  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === 'query') {
        return instrumentedQuery;
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly logger = new Logger('DbService');
  private readonly pool = new Pool({
    connectionString: env.databaseUrl,
    max: Number(process.env.DATABASE_POOL_MAX ?? 25),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  constructor() {
    this.pool.on('error', (err) => {
      this.logger.error('Unexpected error on idle PostgreSQL client', err.stack);
    });
  }

  /** Query tables that are not tenant-scoped (tenants, plan catalogue). */
  async query<T extends QueryResultRow = any>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
    const start = performance.now();
    const res = await this.pool.query<T>(text, params);
    const duration = performance.now() - start;
    const isInternal = /^\s*(begin|commit|rollback|select\s+set_config)/i.test(text);

    if (!isInternal) {
      recordDbTiming(duration);
      const op = parseSqlOperation(text);
      const ctx = getTelemetryContext();
      const prefix = ctx ? `[${ctx.desc.page}] - [${ctx.desc.feature}]` : '[Database Engine]';
      this.logger.log(`[DB] ${prefix} - ${op} (done in ${Math.round(duration)}ms)`);
    }

    return res;
  }

  /**
   * Run work inside a transaction with tenant and property scope set for RLS.
   * `set_config(..., true)` is transaction-local, so the value can never leak to the next
   * request that reuses this pooled connection.
   */
  async withTenant<T>(tenantId: string, propertyId: string | null, fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const rawClient = await this.pool.connect();
    const client = instrumentClient(rawClient, this.logger);

    try {
      await rawClient.query('begin');
      await rawClient.query(
        "select set_config('app.tenant_id', $1, true), set_config('app.property_id', $2, true)",
        [tenantId, propertyId ?? '']
      );
      const result = await fn(client);
      await rawClient.query('commit');
      return result;
    } catch (err) {
      await rawClient.query('rollback').catch(() => undefined);
      throw err;
    } finally {
      rawClient.release();
    }
  }

  onModuleDestroy() {
    return this.pool.end();
  }
}
