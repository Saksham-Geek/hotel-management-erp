import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { HOSPITALITY_PLAN_TIERS } from '@erp/shared';
import { AuditService } from '../audit/audit.service';
import { AuthUser, CurrentUser } from '../common/current-user';
import { Roles } from '../common/roles';
import { Public } from '../auth/public';
import { ZodPipe } from '../common/zod.pipe';
import { DbService } from '../db/db.service';

const onboardHotelSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9][a-z0-9-]{1,39}$/, 'Slug must be lower-case alphanumeric with hyphens'),
  contactEmail: z.string().email(),
  contactPhone: z.string().trim().min(5).max(30),
  planKey: z.enum(['starter', 'growth', 'enterprise']).default('growth'),
  ownerName: z.string().trim().min(2).max(120),
  ownerPassword: z.string().min(8).max(100).default('OwnerPass123!'),
  initialFloors: z.number().int().min(1).max(10).default(3),
  roomsPerFloor: z.number().int().min(1).max(20).default(4),
  seedInitialRooms: z.boolean().default(true),
});

const updateTenantStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
  churnReason: z.string().optional(),
});

const updateTenantPlanSchema = z.object({
  planKey: z.enum(['starter', 'growth', 'enterprise']),
});

export interface PlatformTenantDto {
  id: string;
  slug: string;
  name: string;
  status: 'active' | 'suspended';
  contactEmail: string | null;
  contactPhone: string | null;
  churnReason: string | null;
  churnedAt: string | null;
  createdAt: string;
  planKey: string;
  monthlyFee: number;
  subStatus: 'active' | 'trialing' | 'past_due' | 'canceled';
  propertiesCount: number;
  totalRooms: number;
  totalStaff: number;
  lifetimeRevenue: number;
  ownerName?: string;
  ownerEmail?: string;
}

export interface PlatformOverviewDto {
  metrics: {
    mrr: number;
    arr: number;
    lifetimeRevenue: number;
    activeTenantsCount: number;
    activePropertiesCount: number;
    totalRoomsPowered: number;
    churnedCount: number;
    pastDueCount: number;
    churnRate: number;
  };
  tenants: PlatformTenantDto[];
  timeline: {
    month: string;
    label: string;
    totalAmount: number;
    invoicesCount: number;
  }[];
  planTiers: typeof HOSPITALITY_PLAN_TIERS;
}

@Controller('platform')
export class PlatformController {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  /** Verifies that the caller is authorized as SaaS Platform Founder or Cloud Operations Staff */
  private async ensurePlatformAuthorized(c: any, user: AuthUser) {
    const tenantRes = await c.query('SELECT slug FROM tenants WHERE id = $1', [user.tenantId]);
    const userRes = await c.query('SELECT email FROM users WHERE id = $1', [user.id]);
    const slug = tenantRes.rows[0]?.slug;
    const email = userRes.rows[0]?.email;

    const isPlatformHQ = slug === 'platform-hq';
    const isFounderEmail = email === 'founder@antigravity-erp.com' || email === 'ops@antigravity-erp.com';

    if (!isPlatformHQ && !isFounderEmail) {
      throw new ForbiddenException({
        code: 'PLATFORM_ACCESS_DENIED',
        message: 'This dashboard is confidential and restricted exclusively to the SaaS Founder and Cloud Operations staff.',
      });
    }
  }

  @Roles('owner')
  @Get('overview')
  async getOverview(@CurrentUser() user: AuthUser): Promise<PlatformOverviewDto> {
    return this.db.withTenant(user.tenantId, null, async (c) => {
      await this.ensurePlatformAuthorized(c, user);

      // 1. Fetch all tenants (excluding platform-hq internal operations tenant from client metrics)
      const tenantsRes = await c.query(
        `SELECT t.id, t.slug, t.name, t.status, t.contact_email AS "contactEmail",
                t.contact_phone AS "contactPhone", t.churn_reason AS "churnReason",
                t.churned_at AS "churnedAt", t.created_at AS "createdAt"
         FROM tenants t
         WHERE t.slug != 'platform-hq'
         ORDER BY t.created_at DESC`,
      );

      // Plan fee lookup table (INR)
      const feeMap: Record<string, number> = {
        starter: 1999,
        growth: 5999,
        enterprise: 19999,
        basic: 1999,
        plus: 5999,
        premium: 19999,
      };

      // 2. Fetch Latest SaaS Plan & Subscription Amount per tenant from invoices
      const latestInvRes = await c.query(
        `SELECT DISTINCT ON (tenant_id) tenant_id, plan_key, amount, status
         FROM platform_subscription_invoices
         ORDER BY tenant_id, created_at DESC`,
      );
      const planMap = new Map<string, { planKey: string; amount: number; hasPending: boolean }>();
      for (const inv of latestInvRes.rows) {
        planMap.set(inv.tenant_id, {
          planKey: inv.plan_key,
          amount: Number(inv.amount),
          hasPending: inv.status === 'pending',
        });
      }

      // 3. Fetch properties count & accurate room counts per tenant across RLS scopes
      const roomCountsMap = new Map<string, number>();
      const propsCountMap = new Map<string, number>();

      for (const t of tenantsRes.rows) {
        await c.query("select set_config('app.tenant_id', $1, true)", [t.id]);
        const pRows = (await c.query('SELECT id FROM properties')).rows;
        propsCountMap.set(t.id, pRows.length);
        let tRooms = 0;
        for (const p of pRows) {
          await c.query("select set_config('app.property_id', $1, true)", [p.id]);
          const rCount = (await c.query('select count(*)::int as count from rooms')).rows[0]?.count ?? 0;
          tRooms += rCount;
        }
        roomCountsMap.set(t.id, tRooms);
      }
      // Reset session context
      await c.query("select set_config('app.tenant_id', $1, true)", [user.tenantId]);
      await c.query("select set_config('app.property_id', $1, true)", ['']);

      // 3. Fetch staff counts & owner emails per tenant
      const staffRes = await c.query(
        `SELECT u.tenant_id, count(u.id)::int AS total_staff,
                min(case when u.role = 'owner' then u.full_name end) as owner_name,
                min(case when u.role = 'owner' then u.email end) as owner_email
         FROM users u
         GROUP BY u.tenant_id`,
      );
      const staffMap = new Map<string, { totalStaff: number; ownerName?: string; ownerEmail?: string }>();
      for (const row of staffRes.rows) {
        staffMap.set(row.tenant_id, {
          totalStaff: row.total_staff,
          ownerName: row.owner_name,
          ownerEmail: row.owner_email,
        });
      }

      // 4. Fetch lifetime revenue paid per tenant
      const revRes = await c.query(
        `SELECT tenant_id, coalesce(sum(amount), 0)::float8 AS lifetime_rev
         FROM platform_subscription_invoices
         WHERE status = 'paid'
         GROUP BY tenant_id`,
      );
      const revMap = new Map<string, number>();
      for (const row of revRes.rows) {
        revMap.set(row.tenant_id, row.lifetime_rev);
      }

      // Format tenants
      const tenants: PlatformTenantDto[] = tenantsRes.rows.map((t) => {
        const propsCount = propsCountMap.get(t.id) ?? 1;
        const totalRooms = roomCountsMap.get(t.id) ?? 0;
        const staffInfo = staffMap.get(t.id) || { totalStaff: 1 };
        const lifetimeRev = revMap.get(t.id) || 0;
        const planInfo = planMap.get(t.id) || { planKey: 'growth', amount: 5999, hasPending: false };
        const planKey = planInfo.planKey;
        const monthlyFee = feeMap[planKey] ?? planInfo.amount;
        const subStatus =
          t.status === 'suspended' || t.churnedAt
            ? 'canceled'
            : planInfo.hasPending
            ? 'past_due'
            : 'active';

        return {
          id: t.id,
          slug: t.slug,
          name: t.name,
          status: t.status,
          contactEmail: t.contactEmail,
          contactPhone: t.contactPhone,
          churnReason: t.churnReason,
          churnedAt: t.churnedAt,
          createdAt: t.createdAt,
          planKey,
          monthlyFee,
          subStatus,
          propertiesCount: propsCount,
          totalRooms,
          totalStaff: staffInfo.totalStaff,
          lifetimeRevenue: lifetimeRev,
          ownerName: staffInfo.ownerName,
          ownerEmail: staffInfo.ownerEmail,
        };
      });

      // Calculate SaaS KPIs
      const activeTenants = tenants.filter((t) => t.status === 'active' && t.subStatus !== 'canceled');
      const churnedTenants = tenants.filter((t) => t.status === 'suspended' || t.subStatus === 'canceled');
      const pastDueTenants = tenants.filter((t) => t.subStatus === 'past_due');

      const mrr = activeTenants.reduce((sum, t) => sum + t.monthlyFee, 0);
      const arr = mrr * 12;
      const lifetimeRevenue = tenants.reduce((sum, t) => sum + t.lifetimeRevenue, 0);
      const activePropertiesCount = activeTenants.reduce((sum, t) => sum + t.propertiesCount, 0);
      const totalRoomsPowered = activeTenants.reduce((sum, t) => sum + t.totalRooms, 0);

      const totalEverOnboarded = tenants.length;
      const churnRate =
        totalEverOnboarded > 0
          ? Math.round((churnedTenants.length / totalEverOnboarded) * 1000) / 10
          : 0;

      // 5. Monthly Revenue Timeline (Past 12 months)
      const timelineRes = await c.query(
        `SELECT to_char(paid_at, 'YYYY-MM') AS "month",
                to_char(paid_at, 'Mon YYYY') AS "label",
                coalesce(sum(amount), 0)::float8 AS "totalAmount",
                count(*)::int AS "invoicesCount"
         FROM platform_subscription_invoices
         WHERE status = 'paid' AND paid_at IS NOT NULL
         GROUP BY 1, 2
         ORDER BY 1 ASC`,
      );

      return {
        metrics: {
          mrr,
          arr,
          lifetimeRevenue,
          activeTenantsCount: activeTenants.length,
          activePropertiesCount,
          totalRoomsPowered,
          churnedCount: churnedTenants.length,
          pastDueCount: pastDueTenants.length,
          churnRate,
        },
        tenants,
        timeline: timelineRes.rows,
        planTiers: HOSPITALITY_PLAN_TIERS,
      };
    });
  }

  @Public()
  @Post('onboard-hotel')
  async onboardHotel(
    @Body(new ZodPipe(onboardHotelSchema)) body: z.infer<typeof onboardHotelSchema>,
  ) {
    return this.db.withTenant('', null, async (c) => {
      // Check for slug conflict
      const existingSlug = (await c.query('SELECT id FROM tenants WHERE slug = $1', [body.slug])).rows[0];
      if (existingSlug) {
        throw new BadRequestException({
          code: 'SLUG_TAKEN',
          message: `The hotel code '${body.slug}' is already taken. Please pick another.`,
        });
      }

      // 1. Create Tenant
      const tRes = await c.query(
        `INSERT INTO tenants (slug, name, vertical, status, contact_email, contact_phone)
         VALUES ($1, $2, 'hotel', 'active', $3, $4)
         RETURNING id`,
        [body.slug, body.name, body.contactEmail, body.contactPhone],
      );
      const newTenantId = tRes.rows[0].id;

      // Set tenant context for RLS
      await c.query("SELECT set_config('app.tenant_id', $1, true)", [newTenantId]);

      // 2. Create Default Property
      const pRes = await c.query(
        `INSERT INTO properties (tenant_id, name, timezone, currency, is_default, status)
         VALUES ($1, $2, 'Asia/Kolkata', 'INR', true, 'active')
         RETURNING id`,
        [newTenantId, body.name],
      );
      const newPropertyId = pRes.rows[0].id;

      // Set property context
      await c.query("SELECT set_config('app.property_id', $1, true)", [newPropertyId]);

      // 3. Create Subscription
      await c.query(
        `INSERT INTO property_subscriptions (tenant_id, property_id, plan_key, status)
         VALUES ($1, $2, $3, 'active')`,
        [newTenantId, newPropertyId, body.planKey],
      );

      // 4. Create Owner Account
      const pwHash = await hash(body.ownerPassword, 10);
      const uRes = await c.query(
        `INSERT INTO users (tenant_id, email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4, 'owner')
         RETURNING id`,
        [newTenantId, body.contactEmail.toLowerCase().trim(), pwHash, body.ownerName.trim()],
      );
      const newUserId = uRes.rows[0].id;

      await c.query(
        `INSERT INTO property_users (tenant_id, property_id, user_id, role)
         VALUES ($1, $2, $3, 'owner')`,
        [newTenantId, newPropertyId, newUserId],
      );

      // 5. Seed Clean Starter Inventory if requested
      let roomsCreated = 0;
      if (body.seedInitialRooms) {
        const type1 = (
          await c.query(
            `INSERT INTO room_types (tenant_id, property_id, name, base_rate, capacity, description)
             VALUES ($1, $2, 'Standard Deluxe Room', 4500, 2, 'Spacious AC room with king bed & private bath')
             RETURNING id`,
            [newTenantId, newPropertyId],
          )
        ).rows[0].id;

        const type2 = (
          await c.query(
            `INSERT INTO room_types (tenant_id, property_id, name, base_rate, capacity, description)
             VALUES ($1, $2, 'Executive Suite', 7500, 3, 'Living area, king bed and luxury amenities')
             RETURNING id`,
            [newTenantId, newPropertyId],
          )
        ).rows[0].id;

        const types = [type1, type2];
        for (let f = 1; f <= body.initialFloors; f++) {
          for (let r = 1; r <= body.roomsPerFloor; r++) {
            const roomNum = `${f}${r.toString().padStart(2, '0')}`;
            const tId = types[(f + r) % types.length];
            await c.query(
              `INSERT INTO rooms (tenant_id, property_id, room_type_id, number, floor, status)
               VALUES ($1, $2, $3, $4, $5, 'available')`,
              [newTenantId, newPropertyId, tId, roomNum, f],
            );
            roomsCreated++;
          }
        }
      }

      // 6. Record Initial SaaS Subscription Invoice in Platform Ledger
      const feeMap: Record<string, number> = { starter: 1999, growth: 5999, enterprise: 19999 };
      const fee = feeMap[body.planKey] ?? 5999;
      const now = new Date();
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const invNum = `INV-${body.slug.toUpperCase()}-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;

      await c.query(
        `INSERT INTO platform_subscription_invoices (
           tenant_id, invoice_number, plan_key, amount, currency, status,
           billing_period_start, billing_period_end, paid_at, payment_method, created_at
         )
         VALUES ($1, $2, $3, $4, 'INR', 'paid', $5, $6, $7, 'razorpay_mandate', $7)`,
        [newTenantId, invNum, body.planKey, fee, now.toISOString().slice(0, 10), periodEnd.toISOString().slice(0, 10), now.toISOString()],
      );

      await this.audit.log(c, {
        tenantId: newTenantId,
        userId: newUserId,
        action: 'platform.tenant_onboard',
        entity: 'tenant',
        entityId: newTenantId,
        meta: { name: body.name, slug: body.slug, plan: body.planKey, rooms: roomsCreated },
      });

      return {
        success: true,
        message: `Successfully onboarded '${body.name}' with ${roomsCreated} clean rooms. Ready for live check-ins!`,
        tenant: {
          id: newTenantId,
          slug: body.slug,
          name: body.name,
          planKey: body.planKey,
          roomsCreated,
          ownerEmail: body.contactEmail,
        },
      };
    });
  }

  @Roles('owner')
  @Patch('tenants/:id/status')
  async updateTenantStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') tenantId: string,
    @Body(new ZodPipe(updateTenantStatusSchema)) body: z.infer<typeof updateTenantStatusSchema>,
  ) {
    return this.db.withTenant(user.tenantId, null, async (c) => {
      await this.ensurePlatformAuthorized(c, user);

      const churnedAt = body.status === 'suspended' ? new Date().toISOString() : null;
      const res = await c.query(
        `UPDATE tenants
         SET status = $2,
             churn_reason = case when $2 = 'suspended' then coalesce($3, 'Suspended by platform administrator') else null end,
             churned_at = $4
         WHERE id = $1
         RETURNING id, slug, name, status, churn_reason as "churnReason"`,
        [tenantId, body.status, body.churnReason ?? null, churnedAt],
      );

      if (res.rowCount === 0) {
        throw new BadRequestException({ code: 'NOT_FOUND', message: 'Tenant not found' });
      }

      // Also sync property subscriptions status
      const subStatus = body.status === 'active' ? 'active' : 'canceled';
      await c.query(
        `UPDATE property_subscriptions SET status = $2 WHERE tenant_id = $1`,
        [tenantId, subStatus],
      );

      return { success: true, tenant: res.rows[0] };
    });
  }

  @Roles('owner')
  @Patch('tenants/:id/plan')
  async updateTenantPlan(
    @CurrentUser() user: AuthUser,
    @Param('id') tenantId: string,
    @Body(new ZodPipe(updateTenantPlanSchema)) body: z.infer<typeof updateTenantPlanSchema>,
  ) {
    return this.db.withTenant(user.tenantId, null, async (c) => {
      await this.ensurePlatformAuthorized(c, user);

      await c.query(
        `UPDATE property_subscriptions SET plan_key = $2 WHERE tenant_id = $1`,
        [tenantId, body.planKey],
      );

      return { success: true, message: `Successfully updated plan to ${body.planKey}` };
    });
  }
}
