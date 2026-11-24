import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  HOSPITALITY_PLAN_TIERS,
  switchPlanSchema,
  SwitchPlanInput,
} from '@erp/shared';
import { AuditService } from '../audit/audit.service';
import { CurrentUser, AuthUser } from '../common/current-user';
import { Public } from '../auth/public';
import { Roles } from '../common/roles';
import { ZodPipe } from '../common/zod.pipe';
import { DbService } from '../db/db.service';
import { EntitlementsService } from './entitlements.service';

@Controller('entitlements')
export class EntitlementsController {
  constructor(
    private readonly entitlements: EntitlementsService,
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.entitlements.resolve(user.tenantId, user.propertyId);
  }

  @Get('plans')
  async plans(@CurrentUser() user: AuthUser) {
    const current = await this.entitlements.resolve(user.tenantId, user.propertyId);
    return {
      currentPlan: current.plan,
      tiers: HOSPITALITY_PLAN_TIERS,
    };
  }

  @Post('switch-plan')
  @Roles('owner')
  async switchPlan(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(switchPlanSchema)) body: SwitchPlanInput,
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      // Validate plan exists in database catalogue
      const planRow = (
        await c.query(`select key, name from plans where key = $1`, [body.planKey])
      ).rows[0];

      if (!planRow) {
        throw new BadRequestException({
          code: 'INVALID_PLAN',
          message: `Plan '${body.planKey}' does not exist in catalogue`,
        });
      }

      // Read current plan for audit logging
      const currentSub = (
        await c.query(
          `select plan_key from property_subscriptions where tenant_id = $1 and property_id = $2`,
          [user.tenantId, user.propertyId],
        )
      ).rows[0];

      // Update property subscription
      await c.query(
        `update property_subscriptions
         set plan_key = $3, status = 'active'
         where tenant_id = $1 and property_id = $2`,
        [user.tenantId, user.propertyId, body.planKey],
      );

      // Audit log the tier change
      await this.audit.log(c, {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'subscription.plan_switched',
        entity: 'property_subscription',
        entityId: user.propertyId,
        meta: {
          previousPlan: currentSub?.plan_key ?? null,
          newPlan: body.planKey,
        },
      });

      // Clear cached entitlements
      this.entitlements.invalidate(user.propertyId);

      const resolved = await this.entitlements.resolve(user.tenantId, user.propertyId);
      return {
        success: true,
        message: `Subscription successfully switched to ${planRow.name}`,
        plan: body.planKey,
        entitlements: resolved,
      };
    });
  }

  @Get('subscription-details')
  @Roles('owner')
  async subscriptionDetails(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      // 1. Subscription
      const sub = (
        await c.query(
          `SELECT plan_key AS "planKey", status, trial_ends_at AS "trialEndsAt",
                  current_period_end AS "currentPeriodEnd", created_at AS "createdAt"
           FROM property_subscriptions
           WHERE tenant_id = $1 AND property_id = $2`,
          [user.tenantId, user.propertyId],
        )
      ).rows[0] || { planKey: 'starter', status: 'active', currentPeriodEnd: null };

      // 2. Tenant
      const tenant = (
        await c.query(
          `SELECT name, slug, contact_email AS "contactEmail", contact_phone AS "contactPhone", billing_cycle AS "billingCycle"
           FROM tenants
           WHERE id = $1`,
          [user.tenantId],
        )
      ).rows[0];

      // 3. Platform Subscription Invoices (SaaS Invoices for this hotel)
      const invoices = (
        await c.query(
          `SELECT id, invoice_number AS "invoiceNumber", plan_key AS "planKey", amount, currency,
                  status, billing_period_start AS "billingPeriodStart", billing_period_end AS "billingPeriodEnd",
                  paid_at AS "paidAt", payment_method AS "paymentMethod", created_at AS "createdAt"
           FROM platform_subscription_invoices
           WHERE tenant_id = $1
           ORDER BY created_at DESC
           LIMIT 24`,
          [user.tenantId],
        )
      ).rows;

      // 4. Usage Stats
      const roomsCountRes = await c.query(
        `SELECT count(*)::int AS count FROM rooms WHERE tenant_id = $1 AND property_id = $2`,
        [user.tenantId, user.propertyId],
      );
      const staffCountRes = await c.query(
        `SELECT count(*)::int AS count FROM property_users WHERE tenant_id = $1 AND property_id = $2`,
        [user.tenantId, user.propertyId],
      );

      const planConfig =
        HOSPITALITY_PLAN_TIERS.find((t) => t.key === sub.planKey) ||
        HOSPITALITY_PLAN_TIERS[0];

      return {
        subscription: sub,
        tenant,
        invoices,
        usage: {
          roomsCount: Number(roomsCountRes.rows[0]?.count ?? 0),
          staffCount: Number(staffCountRes.rows[0]?.count ?? 0),
          maxRooms: planConfig.maxRooms,
          maxStaff: planConfig.maxStaff,
        },
        currentTier: planConfig,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_erp_saas_demo',
      };
    });
  }

  @Post('subscription/checkout')
  @Roles('owner')
  async createSubscriptionCheckout(
    @CurrentUser() user: AuthUser,
    @Body() body: { planKey: string; billingCycle?: 'monthly' | 'annual' },
  ) {
    const plan = HOSPITALITY_PLAN_TIERS.find((t) => t.key === body.planKey);
    if (!plan) {
      throw new BadRequestException(`Invalid plan '${body.planKey}'`);
    }

    const billingCycle = body.billingCycle === 'annual' ? 'annual' : 'monthly';
    const baseFee =
      billingCycle === 'annual'
        ? Math.round(plan.monthlyPriceInr * 10) // 2 months free on annual
        : plan.monthlyPriceInr;

    const gstAmount = Math.round(baseFee * 0.18); // 18% IGST for SaaS software
    const totalAmount = baseFee + gstAmount;
    const amountInPaise = totalAmount * 100;

    const dummyOrderId = `order_sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const userRow = (
        await c.query(
          `SELECT email, full_name AS "fullName" FROM users WHERE id = $1`,
          [user.id],
        )
      ).rows[0];

      return {
        orderId: dummyOrderId,
        planKey: plan.key,
        planName: plan.name,
        billingCycle,
        baseFee,
        gstRate: 18,
        gstAmount,
        totalAmount,
        currency: 'INR',
        amountInPaise,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_erp_saas_demo',
        customer: {
          email: userRow?.email || 'owner@hotel.com',
          name: userRow?.fullName || 'Hotel Owner',
        },
      };
    });
  }

  @Post('subscription/verify-payment')
  @Roles('owner')
  async verifyPayment(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      planKey: string;
      billingCycle?: 'monthly' | 'annual';
      razorpayPaymentId?: string;
      razorpayOrderId?: string;
      razorpaySignature?: string;
    },
  ) {
    const plan = HOSPITALITY_PLAN_TIERS.find((t) => t.key === body.planKey);
    if (!plan) throw new BadRequestException(`Invalid plan '${body.planKey}'`);

    const billingCycle = body.billingCycle === 'annual' ? 'annual' : 'monthly';
    const baseFee =
      billingCycle === 'annual'
        ? Math.round(plan.monthlyPriceInr * 10)
        : plan.monthlyPriceInr;
    const totalAmount = Math.round(baseFee * 1.18);

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const now = new Date();
      const periodEnd = new Date(now);
      if (billingCycle === 'annual') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setDate(periodEnd.getDate() + 30);
      }

      // Update property subscription
      await c.query(
        `UPDATE property_subscriptions
         SET plan_key = $3, status = 'active', current_period_end = $4
         WHERE tenant_id = $1 AND property_id = $2`,
        [user.tenantId, user.propertyId, body.planKey, periodEnd.toISOString()],
      );

      // Record SaaS invoice
      const tenantRes = await c.query(`SELECT slug FROM tenants WHERE id = $1`, [user.tenantId]);
      const slug = tenantRes.rows[0]?.slug || 'HOTEL';
      const invNum = `INV-${slug.toUpperCase()}-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;

      await c.query(
        `INSERT INTO platform_subscription_invoices (
           tenant_id, invoice_number, plan_key, amount, currency, status,
           billing_period_start, billing_period_end, paid_at, payment_method, created_at
         )
         VALUES ($1, $2, $3, $4, 'INR', 'paid', $5, $6, $7, $8, $7)`,
        [
          user.tenantId,
          invNum,
          body.planKey,
          totalAmount,
          now.toISOString().slice(0, 10),
          periodEnd.toISOString().slice(0, 10),
          now.toISOString(),
          body.razorpayPaymentId ? `razorpay_${body.razorpayPaymentId}` : 'razorpay_mandate',
        ],
      );

      this.entitlements.invalidate(user.propertyId);

      await this.audit.log(c, {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'subscription.payment_verified',
        entity: 'property_subscription',
        entityId: user.propertyId,
        meta: { plan: body.planKey, amount: totalAmount, invoiceNumber: invNum },
      });

      return {
        success: true,
        message: `Plan upgraded to ${plan.name} with auto-debit active! Period valid until ${periodEnd.toLocaleDateString('en-IN')}.`,
        invoiceNumber: invNum,
        periodEnd: periodEnd.toISOString(),
      };
    });
  }

  @Post('subscription/simulate')
  @Roles('owner')
  async simulateSubscriptionEvent(
    @CurrentUser() user: AuthUser,
    @Body() body: { action: 'charge_success' | 'payment_failed' | 'cancel' | 'reactivate' },
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const current = (
        await c.query(
          `SELECT plan_key FROM property_subscriptions WHERE tenant_id = $1 AND property_id = $2`,
          [user.tenantId, user.propertyId],
        )
      ).rows[0];
      const planKey = current?.plan_key || 'growth';

      const now = new Date();
      if (body.action === 'charge_success') {
        const periodEnd = new Date(now);
        periodEnd.setDate(periodEnd.getDate() + 30);
        await c.query(
          `UPDATE property_subscriptions
           SET status = 'active', current_period_end = $3
           WHERE tenant_id = $1 AND property_id = $2`,
          [user.tenantId, user.propertyId, periodEnd.toISOString()],
        );

        const feeMap: Record<string, number> = { starter: 2359, growth: 7079, enterprise: 23599 };
        const fee = feeMap[planKey] ?? 7079;
        const tenantRes = await c.query(`SELECT slug FROM tenants WHERE id = $1`, [user.tenantId]);
        const slug = tenantRes.rows[0]?.slug || 'HOTEL';
        const invNum = `INV-${slug.toUpperCase()}-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;

        await c.query(
          `INSERT INTO platform_subscription_invoices (
             tenant_id, invoice_number, plan_key, amount, currency, status,
             billing_period_start, billing_period_end, paid_at, payment_method, created_at
           )
           VALUES ($1, $2, $3, $4, 'INR', 'paid', $5, $6, $7, 'razorpay_mandate_auto_debit', $7)`,
          [user.tenantId, invNum, planKey, fee, now.toISOString().slice(0, 10), periodEnd.toISOString().slice(0, 10), now.toISOString()],
        );

        this.entitlements.invalidate(user.propertyId);
        return { success: true, message: `Simulated monthly auto-debit charge success. Invoice ${invNum} generated.` };
      } else if (body.action === 'payment_failed') {
        await c.query(
          `UPDATE property_subscriptions
           SET status = 'past_due'
           WHERE tenant_id = $1 AND property_id = $2`,
          [user.tenantId, user.propertyId],
        );
        this.entitlements.invalidate(user.propertyId);
        return { success: true, message: 'Simulated payment mandate failure: status set to past_due (Grace Period Read-Only mode).' };
      } else if (body.action === 'cancel') {
        await c.query(
          `UPDATE property_subscriptions
           SET status = 'canceled'
           WHERE tenant_id = $1 AND property_id = $2`,
          [user.tenantId, user.propertyId],
        );
        this.entitlements.invalidate(user.propertyId);
        return { success: true, message: 'Simulated subscription cancellation.' };
      } else {
        const periodEnd = new Date(now);
        periodEnd.setDate(periodEnd.getDate() + 30);
        await c.query(
          `UPDATE property_subscriptions
           SET status = 'active', current_period_end = $3
           WHERE tenant_id = $1 AND property_id = $2`,
          [user.tenantId, user.propertyId, periodEnd.toISOString()],
        );
        this.entitlements.invalidate(user.propertyId);
        return { success: true, message: 'Subscription reactivated to Active.' };
      }
    });
  }

  @Post('subscription/webhook')
  @Public()
  async handleRazorpayWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Body() body: any,
  ) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const shasum = crypto.createHmac('sha256', webhookSecret);
      shasum.update(JSON.stringify(body));
      const digest = shasum.digest('hex');
      if (digest !== signature) {
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    const event = body?.event;
    return { ok: true, event };
  }
}
