import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from '../config';

@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly pool = new Pool({ connectionString: env.databaseUrl, max: 10 });

  /** Query tables that are not tenant-scoped (tenants, plan catalogue). */
  query<T extends QueryResultRow = any>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  /**
   * Run work inside a transaction with tenant and property scope set for RLS.
   * `set_config(..., true)` is transaction-local, so the value can never leak to the next
   * request that reuses this pooled connection.
   */
  async withTenant<T>(tenantId: string, propertyId: string | null, fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query("select set_config('app.tenant_id', $1, true)", [tenantId]);
      await client.query("select set_config('app.property_id', $1, true)", [propertyId ?? '']);
      const result = await fn(client);
      await client.query('commit');
      return result;
    } catch (err) {
      await client.query('rollback').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  onModuleDestroy() {
    return this.pool.end();
  }
}
