import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { DbService } from '../db/db.service';
import { IS_PUBLIC } from './public';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly reflector: Reflector, private readonly db: DbService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()])) return true;
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException({ code: 'NO_TOKEN', message: 'Sign in to continue' });
    try {
      const p = await this.jwt.verifyAsync<{ sub: string; tid: string; pid: string }>(token);
      if (!p.sub || !p.tid || !p.pid) throw new Error('Token is missing its property scope');
      const membership = await this.db.withTenant(p.tid, p.pid, async (c) => (
        await c.query(
          `select pu.role from property_users pu join users u on u.id = pu.user_id and u.tenant_id = pu.tenant_id
           join properties p on p.id = pu.property_id and p.tenant_id = pu.tenant_id
           join tenants t on t.id = pu.tenant_id
           where pu.user_id = $1 and pu.property_id = $2 and u.is_active and p.status = 'active' and t.status = 'active'`,
          [p.sub, p.pid],
        )
      ).rows[0]);
      if (!membership) throw new Error('Property access has been revoked');
      req.user = { id: p.sub, tenantId: p.tid, propertyId: p.pid, role: membership.role };
      return true;
    } catch {
      throw new UnauthorizedException({ code: 'BAD_TOKEN', message: 'Your session has expired. Sign in again' });
    }
  }
}
