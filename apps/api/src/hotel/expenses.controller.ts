import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
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
