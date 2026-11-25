import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PERMISSIONS } from '@erp/shared';
import { AuthUser, CurrentUser } from '../common/current-user';
import { DbService } from '../db/db.service';
import { RequirePermission } from '../common/permission-guard';

@Controller('hotel/expenses')
export class ExpensesController {
  constructor(private readonly db: DbService) {}

  @Get()
  @RequirePermission(PERMISSIONS.EXPENSES_VIEW)
  async getExpenses(
    @CurrentUser() user: AuthUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('category') category?: string,
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      let query = `
        select id, voucher_number as "voucherNumber", category,
               amount::float8 as amount, payment_mode as "paymentMode",
               paid_to as "paidTo", invoice_ref as "invoiceRef",
               receipt_url as "receiptUrl", notes, logged_by as "loggedBy",
               expense_date as "expenseDate", created_at as "createdAt"
        from hotel_expenses
        where property_id = $1
      `;
      const params: any[] = [user.propertyId];

      if (startDate) {
        params.push(startDate);
        query += ` and expense_date >= $${params.length}`;
      }
      if (endDate) {
        params.push(endDate);
        query += ` and expense_date <= $${params.length}`;
      }
      if (category && category !== 'ALL') {
        params.push(category);
        query += ` and category = $${params.length}`;
      }

      query += ` order by expense_date desc, created_at desc limit 200`;

      const res = await c.query(query, params);
      return res.rows;
    });
  }

  @Get('cash-summary')
  @RequirePermission(PERMISSIONS.EXPENSES_VIEW)
  async getCashSummary(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      // 1. Total cash collected from room folios and restaurant POS today
      const cashInRes = await c.query(
        `select coalesce(sum(amount), 0)::float8 as "totalCashIn"
         from folio_payments
         where tenant_id = $1 and method = 'cash'
           and created_at::date = current_date`,
        [user.tenantId],
      );
      const totalCashIn = cashInRes.rows[0]?.totalCashIn ?? 0;

      // 2. Total petty cash payouts from front desk drawer today
      const cashOutRes = await c.query(
        `select coalesce(sum(amount), 0)::float8 as "totalCashOut",
                count(id)::int as "voucherCount"
         from hotel_expenses
         where property_id = $1 and payment_mode = 'CASH_DRAWER'
           and expense_date = current_date`,
        [user.propertyId],
      );
      const totalCashOut = cashOutRes.rows[0]?.totalCashOut ?? 0;
      const voucherCount = cashOutRes.rows[0]?.voucherCount ?? 0;

      // 3. Category breakdown for current month
      const monthBreakdown = await c.query(
        `select category,
                coalesce(sum(amount), 0)::float8 as total,
                count(id)::int as count
         from hotel_expenses
         where property_id = $1
           and date_trunc('month', expense_date) = date_trunc('month', current_date)
         group by category
         order by total desc`,
        [user.propertyId],
      );

      const netDrawerCash = totalCashIn - totalCashOut;

      return {
        today: {
          totalCashIn,
          totalCashOut,
          netDrawerCash,
          voucherCount,
        },
        categoryBreakdownMonth: monthBreakdown.rows,
      };
    });
  }

  // =========================================================================
  // EXPENSE CATEGORIES (CRUD)
  // =========================================================================
  @Get('categories')
  @RequirePermission(PERMISSIONS.EXPENSES_VIEW)
  async getCategories(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const res = await c.query(
        `select id, code, name, icon, badge_color as "badgeColor",
                description, is_system as "isSystem", created_at as "createdAt"
         from expense_categories
         where property_id = $1
         order by is_system desc, name asc`,
        [user.propertyId],
      );
      return res.rows;
    });
  }

  @Post('categories')
  @RequirePermission(PERMISSIONS.EXPENSES_MANAGE)
  async createCategory(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      name: string;
      code?: string;
      icon?: string;
      badgeColor?: string;
      description?: string;
    },
  ) {
    if (!body?.name?.trim()) throw new BadRequestException('Category name is required.');
    const code = (body.code || body.name.toUpperCase().replace(/[^A-Z0-9]/g, '_')).trim();

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const res = await c.query(
        `insert into expense_categories (
           tenant_id, property_id, code, name, icon, badge_color, description, is_system
         ) values ($1, $2, $3, $4, $5, $6, $7, false)
         on conflict (property_id, code)
         do update set name = excluded.name, icon = excluded.icon, description = excluded.description
         returning id, code, name, icon, badge_color as "badgeColor",
                   description, is_system as "isSystem"`,
        [
          user.tenantId,
          user.propertyId,
          code,
          body.name.trim(),
          body.icon || '📦',
          body.badgeColor || 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
          body.description?.trim() || null,
        ],
      );
      return { success: true, category: res.rows[0], message: `Category "${body.name}" created.` };
    });
  }

  @Delete('categories/:id')
  @RequirePermission(PERMISSIONS.EXPENSES_MANAGE)
  async deleteCategory(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const res = await c.query(
        `delete from expense_categories
         where id = $1 and property_id = $2 and is_system = false
         returning name`,
        [id, user.propertyId],
      );
      if (!res.rowCount) {
        throw new BadRequestException('Cannot delete default system category or category not found.');
      }
      return { success: true, message: `Category "${res.rows[0].name}" deleted.` };
    });
  }

  // =========================================================================
  // APPROVED HOTEL VENDORS (CRUD)
  // =========================================================================
  @Get('vendors')
  @RequirePermission(PERMISSIONS.EXPENSES_VIEW)
  async getVendors(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const res = await c.query(
        `select id, name, category, contact_person as "contactPerson",
                phone, email, gstin, pan_number as "panNumber", address,
                payment_terms as "paymentTerms", is_active as "isActive",
                created_at as "createdAt"
         from hotel_vendors
         where property_id = $1
         order by is_active desc, name asc`,
        [user.propertyId],
      );
      return res.rows;
    });
  }

  @Post('vendors')
  @RequirePermission(PERMISSIONS.EXPENSES_MANAGE)
  async createVendor(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      name: string;
      category?: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
      gstin?: string;
      panNumber?: string;
      address?: string;
      paymentTerms?: string;
    },
  ) {
    if (!body?.name?.trim()) throw new BadRequestException('Vendor legal or trade name is required.');

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const res = await c.query(
        `insert into hotel_vendors (
           tenant_id, property_id, name, category, contact_person, phone,
           email, gstin, pan_number, address, payment_terms
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         on conflict (property_id, name)
         do update set
           category = excluded.category,
           contact_person = excluded.contact_person,
           phone = excluded.phone,
           email = excluded.email,
           gstin = excluded.gstin,
           pan_number = excluded.pan_number,
           address = excluded.address,
           payment_terms = excluded.payment_terms,
           is_active = true
         returning id, name, category, contact_person as "contactPerson",
                   phone, email, gstin, pan_number as "panNumber", address,
                   payment_terms as "paymentTerms", is_active as "isActive"`,
        [
          user.tenantId,
          user.propertyId,
          body.name.trim(),
          body.category?.trim() || 'General Supplier',
          body.contactPerson?.trim() || null,
          body.phone?.trim() || null,
          body.email?.trim() || null,
          body.gstin?.trim()?.toUpperCase() || null,
          body.panNumber?.trim()?.toUpperCase() || null,
          body.address?.trim() || null,
          body.paymentTerms?.trim() || 'Cash on Delivery',
        ],
      );
      return { success: true, vendor: res.rows[0], message: `Vendor "${body.name}" registered.` };
    });
  }

  @Patch('vendors/:id')
  @RequirePermission(PERMISSIONS.EXPENSES_MANAGE)
  async updateVendor(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      category?: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
      gstin?: string;
      panNumber?: string;
      address?: string;
      paymentTerms?: string;
      isActive?: boolean;
    },
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const updates: string[] = [];
      const params: any[] = [id, user.propertyId];

      if (body.name) {
        params.push(body.name.trim());
        updates.push(`name = $${params.length}`);
      }
      if (body.category) {
        params.push(body.category.trim());
        updates.push(`category = $${params.length}`);
      }
      if (body.contactPerson !== undefined) {
        params.push(body.contactPerson?.trim() || null);
        updates.push(`contact_person = $${params.length}`);
      }
      if (body.phone !== undefined) {
        params.push(body.phone?.trim() || null);
        updates.push(`phone = $${params.length}`);
      }
      if (body.email !== undefined) {
        params.push(body.email?.trim() || null);
        updates.push(`email = $${params.length}`);
      }
      if (body.gstin !== undefined) {
        params.push(body.gstin?.trim()?.toUpperCase() || null);
        updates.push(`gstin = $${params.length}`);
      }
      if (body.paymentTerms) {
        params.push(body.paymentTerms.trim());
        updates.push(`payment_terms = $${params.length}`);
      }
      if (body.isActive !== undefined) {
        params.push(body.isActive);
        updates.push(`is_active = $${params.length}`);
      }

      if (!updates.length) throw new BadRequestException('No fields to update.');

      const res = await c.query(
        `update hotel_vendors set ${updates.join(', ')} where id = $1 and property_id = $2 returning id, name, is_active as "isActive"`,
        params,
      );
      if (!res.rowCount) throw new NotFoundException('Vendor not found.');
      return { success: true, vendor: res.rows[0] };
    });
  }

  @Delete('vendors/:id')
  @RequirePermission(PERMISSIONS.EXPENSES_MANAGE)
  async deleteVendor(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const res = await c.query(
        `update hotel_vendors set is_active = false where id = $1 and property_id = $2 returning name`,
        [id, user.propertyId],
      );
      if (!res.rowCount) throw new NotFoundException('Vendor not found.');
      return { success: true, message: `Vendor "${res.rows[0].name}" deactivated.` };
    });
  }

  // =========================================================================
  // COMMON EXPENSE ITEMS / STANDARD RECURRING EXPENSES (CRUD)
  // =========================================================================
  @Get('common-items')
  @RequirePermission(PERMISSIONS.EXPENSES_VIEW)
  async getCommonExpenseItems(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const res = await c.query(
        `select id, name, category_code as "categoryCode",
                default_amount::float8 as "defaultAmount",
                default_vendor_name as "defaultVendorName",
                default_payment_mode as "defaultPaymentMode",
                description, is_active as "isActive", created_at as "createdAt"
         from common_expense_items
         where property_id = $1 and is_active = true
         order by name asc`,
        [user.propertyId],
      );
      return res.rows;
    });
  }

  @Post('common-items')
  @RequirePermission(PERMISSIONS.EXPENSES_MANAGE)
  async createCommonExpenseItem(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      name: string;
      categoryCode: string;
      defaultAmount?: number;
      defaultVendorName?: string;
      defaultPaymentMode?: string;
      description?: string;
    },
  ) {
    if (!body?.name?.trim()) throw new BadRequestException('Expense item name is required.');
    if (!body?.categoryCode?.trim()) throw new BadRequestException('Category code is required.');

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const res = await c.query(
        `insert into common_expense_items (
           tenant_id, property_id, name, category_code, default_amount,
           default_vendor_name, default_payment_mode, description, is_active
         ) values ($1, $2, $3, $4, coalesce($5, 0), $6, coalesce($7, 'CASH_DRAWER'), $8, true)
         on conflict (property_id, name)
         do update set
           category_code = excluded.category_code,
           default_amount = excluded.default_amount,
           default_vendor_name = excluded.default_vendor_name,
           default_payment_mode = excluded.default_payment_mode,
           description = excluded.description,
           is_active = true
         returning id, name, category_code as "categoryCode",
                   default_amount::float8 as "defaultAmount",
                   default_vendor_name as "defaultVendorName",
                   default_payment_mode as "defaultPaymentMode",
                   description, is_active as "isActive"`,
        [
          user.tenantId,
          user.propertyId,
          body.name.trim(),
          body.categoryCode.trim(),
          body.defaultAmount ?? 0,
          body.defaultVendorName?.trim() || null,
          body.defaultPaymentMode?.trim() || 'CASH_DRAWER',
          body.description?.trim() || null,
        ],
      );
      return {
        success: true,
        item: res.rows[0],
        message: `Common expense item "${res.rows[0].name}" registered.`,
      };
    });
  }

  @Delete('common-items/:id')
  @RequirePermission(PERMISSIONS.EXPENSES_MANAGE)
  async deleteCommonExpenseItem(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const res = await c.query(
        `update common_expense_items set is_active = false where id = $1 and property_id = $2 returning name`,
        [id, user.propertyId],
      );
      if (!res.rowCount) throw new NotFoundException('Expense item not found.');
      return { success: true, message: `Common expense "${res.rows[0].name}" removed.` };
    });
  }

  // =========================================================================
  // DIGITAL CONCIERGE SETTINGS
  // =========================================================================
  @Get('concierge-settings')
  @RequirePermission(PERMISSIONS.EXPENSES_VIEW)
  async getConciergeSettings(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const res = await c.query(
        `select wifi_ssid as "wifiSsid", wifi_password as "wifiPassword",
                reception_phone as "receptionPhone", reception_whatsapp as "receptionWhatsapp",
                breakfast_timing as "breakfastTiming", pool_timing as "poolTiming",
                gym_timing as "gymTiming", google_review_url as "googleReviewUrl"
         from concierge_settings
         where property_id = $1`,
        [user.propertyId],
      );
      if (!res.rowCount) {
        return {
          wifiSsid: 'GrandAzure_Guest_5G',
          wifiPassword: 'Welcome2026!',
          receptionPhone: '+91 98765 43210',
          receptionWhatsapp: '+91 98765 43210',
          breakfastTiming: '7:00 AM - 10:30 AM (Coral Cafe)',
          poolTiming: '6:00 AM - 8:00 PM',
          gymTiming: '24 Hours (Keycard Access)',
          googleReviewUrl: 'https://maps.google.com',
        };
      }
      return res.rows[0];
    });
  }

  @Post('concierge-settings')
  @RequirePermission(PERMISSIONS.EXPENSES_MANAGE)
  async updateConciergeSettings(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      wifiSsid: string;
      wifiPassword: string;
      receptionPhone: string;
      receptionWhatsapp: string;
      breakfastTiming?: string;
      poolTiming?: string;
      gymTiming?: string;
      googleReviewUrl?: string;
    },
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const res = await c.query(
        `insert into concierge_settings (
           tenant_id, property_id, wifi_ssid, wifi_password, reception_phone,
           reception_whatsapp, breakfast_timing, pool_timing, gym_timing, google_review_url, updated_at
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
         on conflict (property_id)
         do update set
           wifi_ssid = excluded.wifi_ssid,
           wifi_password = excluded.wifi_password,
           reception_phone = excluded.reception_phone,
           reception_whatsapp = excluded.reception_whatsapp,
           breakfast_timing = excluded.breakfast_timing,
           pool_timing = excluded.pool_timing,
           gym_timing = excluded.gym_timing,
           google_review_url = excluded.google_review_url,
           updated_at = now()
         returning wifi_ssid as "wifiSsid", wifi_password as "wifiPassword",
                   reception_phone as "receptionPhone", reception_whatsapp as "receptionWhatsapp",
                   breakfast_timing as "breakfastTiming", pool_timing as "poolTiming",
                   gym_timing as "gymTiming", google_review_url as "googleReviewUrl"`,
        [
          user.tenantId,
          user.propertyId,
          body.wifiSsid || 'GrandAzure_Guest_5G',
          body.wifiPassword || 'Welcome2026!',
          body.receptionPhone || '+91 98765 43210',
          body.receptionWhatsapp || '+91 98765 43210',
          body.breakfastTiming || '7:00 AM - 10:30 AM (Coral Cafe)',
          body.poolTiming || '6:00 AM - 8:00 PM',
          body.gymTiming || '24 Hours (Keycard Access)',
          body.googleReviewUrl || 'https://maps.google.com',
        ],
      );
      return { success: true, settings: res.rows[0], message: 'In-Room Digital Concierge configuration saved.' };
    });
  }

  // =========================================================================
  // EXPENSE VOUCHERS
  // =========================================================================
  @Post()
  @RequirePermission(PERMISSIONS.EXPENSES_MANAGE)
  async createExpense(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      category: string;
      amount: number;
      paymentMode?: string;
      paidTo: string;
      invoiceRef?: string;
      notes?: string;
      receiptUrl?: string;
      expenseDate?: string;
    },
  ) {
    if (!body?.category) throw new BadRequestException('Expense category is required.');
    const amount = Number(body?.amount);
    if (!amount || amount <= 0) throw new BadRequestException('Expense amount must be greater than zero.');
    if (!body?.paidTo?.trim()) throw new BadRequestException('Paid To / Vendor name is required.');

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      // Auto-generate voucher number: EXP-YYYYMM-XXXX
      const countRes = await c.query(
        `select count(id) from hotel_expenses where property_id = $1 and expense_date = coalesce($2::date, current_date)`,
        [user.propertyId, body.expenseDate || null],
      );
      const seq = Number(countRes.rows[0]?.count || 0) + 1;
      const dateStr = (body.expenseDate || new Date().toISOString().slice(0, 10)).replace(/-/g, '').slice(0, 6);
      const voucherNumber = `EXP-${dateStr}-${String(seq).padStart(3, '0')}`;

      const res = await c.query(
        `insert into hotel_expenses (
           tenant_id, property_id, voucher_number, category, amount,
           payment_mode, paid_to, invoice_ref, receipt_url, notes,
           logged_by, expense_date
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, coalesce($12::date, current_date))
         returning id, voucher_number as "voucherNumber", category, amount::float8 as amount,
                   payment_mode as "paymentMode", paid_to as "paidTo", invoice_ref as "invoiceRef",
                   receipt_url as "receiptUrl", notes, logged_by as "loggedBy",
                   expense_date as "expenseDate", created_at as "createdAt"`,
        [
          user.tenantId,
          user.propertyId,
          voucherNumber,
          body.category,
          amount,
          body.paymentMode || 'CASH_DRAWER',
          body.paidTo.trim(),
          body.invoiceRef?.trim() || null,
          body.receiptUrl || null,
          body.notes?.trim() || null,
          `Staff (${user.role})`,
          body.expenseDate || null,
        ],
      );

      return {
        success: true,
        voucher: res.rows[0],
        message: `Expense voucher ${voucherNumber} logged successfully.`,
      };
    });
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.EXPENSES_MANAGE)
  async deleteExpense(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const res = await c.query(
        `delete from hotel_expenses where id = $1 and property_id = $2 returning voucher_number`,
        [id, user.propertyId],
      );
      if (!res.rowCount) throw new NotFoundException('Expense voucher not found.');
      return { success: true, message: `Voucher ${res.rows[0].voucher_number} cancelled.` };
    });
  }
}
