import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hashSync } from 'bcryptjs';
import type { MeDto } from '@erp/shared';
import { DbService } from '../db/db.service';

// Compared against when the account is unknown, so response time does not reveal whether it exists.
const DUMMY_HASH = hashSync('not-a-real-password', 10);

@Injectable()
export class AuthService {
  constructor(private readonly db: DbService, private readonly jwt: JwtService) {}

  async login(tenantSlug: string, email: string, password: string) {
    const fail = () => new UnauthorizedException({ code: 'BAD_CREDENTIALS', message: 'Check the hotel code, email and password' });

    const tenant = (await this.db.query(`select id, status from tenants where slug = $1`, [tenantSlug.toLowerCase()])).rows[0];
    if (!tenant || tenant.status !== 'active') {
      await compare(password, DUMMY_HASH);
      throw fail();
    }

    const member = await this.db.withTenant(tenant.id, null, async (c) => (
      await c.query(
        `select u.id, u.password_hash, pu.role, p.id as property_id
         from users u
         join property_users pu on pu.tenant_id = u.tenant_id and pu.user_id = u.id
         join properties p on p.tenant_id = pu.tenant_id and p.id = pu.property_id
         where u.email = $1 and u.is_active and p.status = 'active'
         order by p.is_default desc, p.created_at asc limit 1`,
        [email.toLowerCase()],
      )
    ).rows[0]);

    const ok = await compare(password, member?.password_hash ?? DUMMY_HASH);
    if (!member || !ok) throw fail();
    return { token: await this.issueToken(member.id, tenant.id, member.property_id) };
  }

  async selectProperty(userId: string, tenantId: string, propertyId: string) {
    const member = await this.db.withTenant(tenantId, propertyId, async (c) => (
      await c.query(
        `select pu.role from property_users pu
         join users u on u.tenant_id = pu.tenant_id and u.id = pu.user_id
         join properties p on p.tenant_id = pu.tenant_id and p.id = pu.property_id
         where pu.user_id = $1 and pu.property_id = $2 and u.is_active and p.status = 'active'`,
        [userId, propertyId],
      )
    ).rows[0]);
    if (!member) throw new UnauthorizedException({ code: 'PROPERTY_ACCESS_DENIED', message: 'You do not have access to that property' });
    return { token: await this.issueToken(userId, tenantId, propertyId) };
  }

  async me(userId: string, tenantId: string, propertyId: string): Promise<MeDto> {
    return this.db.withTenant(tenantId, propertyId, async (c) => {
      const row = (await c.query(
        `select u.id, u.email, u.full_name, pu.role, t.id as tid, t.slug, t.name, t.vertical, t.currency,
                p.id as property_id, p.name as property_name, p.timezone as property_timezone, p.currency as property_currency
         from users u
         join tenants t on t.id = u.tenant_id
         join property_users pu on pu.tenant_id = u.tenant_id and pu.user_id = u.id and pu.property_id = $2
         join properties p on p.tenant_id = pu.tenant_id and p.id = pu.property_id
         where u.id = $1 and u.is_active`,
        [userId, propertyId],
      )).rows[0];
      if (!row) throw new UnauthorizedException({ code: 'BAD_TOKEN', message: 'Your session has expired. Sign in again' });

      const properties = (await c.query(
        `select p.id, p.name, pu.role
         from property_users pu join properties p on p.tenant_id = pu.tenant_id and p.id = pu.property_id
         where pu.user_id = $1 and p.status = 'active' order by p.is_default desc, p.name`,
        [userId],
      )).rows;

      return {
        id: row.id, email: row.email, fullName: row.full_name, role: row.role,
        tenant: { id: row.tid, slug: row.slug, name: row.name, vertical: row.vertical, currency: row.currency },
        property: { id: row.property_id, name: row.property_name, timezone: row.property_timezone, currency: row.property_currency },
        properties,
      };
    });
  }

  private issueToken(userId: string, tenantId: string, propertyId: string) {
    return this.jwt.signAsync({ sub: userId, tid: tenantId, pid: propertyId });
  }
}
