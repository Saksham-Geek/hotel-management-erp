import { Global, Injectable, Module } from '@nestjs/common';
import type { PoolClient } from 'pg';

@Injectable()
export class AuditService {
  /** Writes inside the caller's transaction, so the audit row commits or rolls back with the change. */
  async log(
    c: PoolClient,
    e: { tenantId: string; userId?: string; action: string; entity: string; entityId?: string; meta?: object },
  ) {
    await c.query(
      `insert into audit_log (tenant_id, user_id, action, entity, entity_id, meta) values ($1,$2,$3,$4,$5,$6)`,
      [e.tenantId, e.userId ?? null, e.action, e.entity, e.entityId ?? null, JSON.stringify(e.meta ?? {})],
    );
  }
}

@Global()
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
