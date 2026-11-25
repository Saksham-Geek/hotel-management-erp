import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { FEATURES, PERMISSIONS } from '@erp/shared';
import { AuthUser, CurrentUser } from '../common/current-user';
import { RequirePermission } from '../common/permission-guard';
import { DbService } from '../db/db.service';
import { RequireFeature } from '../entitlements/require-feature';

@Controller('hotel/accounting')
@RequireFeature(FEATURES.HOTEL_BILLING)
export class AccountingController {
  constructor(private readonly db: DbService) {}

  // -------------------------------------------------------------
  // Chart of Accounts CRUD
  // -------------------------------------------------------------
  @Get('chart-of-accounts')
  @RequirePermission(PERMISSIONS.BILLING_READ)
  async getChartOfAccounts(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const rows = (
        await c.query(
          `SELECT id, account_code AS "accountCode", account_name AS "accountName",
                  account_type AS "accountType", sub_category AS "subCategory",
                  is_system AS "isSystem", is_active AS "isActive",
                  current_balance::float8 AS "currentBalance", created_at AS "createdAt"
           FROM chart_of_accounts
           WHERE property_id = $1
           ORDER BY account_code ASC`,
          [user.propertyId],
        )
      ).rows;
      return rows;
    });
  }

  @Post('chart-of-accounts')
  @RequirePermission(PERMISSIONS.BILLING_CHARGE_POST)
  async createAccount(
    @CurrentUser() user: AuthUser,
    @Body() body: { accountCode: string; accountName: string; accountType: string; subCategory?: string },
  ) {
    if (!body.accountCode || !body.accountName || !body.accountType) {
      throw new BadRequestException('Account code, name, and type are required');
    }
    const validTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
    if (!validTypes.includes(body.accountType.toUpperCase())) {
      throw new BadRequestException(`Account type must be one of: ${validTypes.join(', ')}`);
    }

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const existing = (
        await c.query(`SELECT id FROM chart_of_accounts WHERE property_id = $1 AND account_code = $2`, [
          user.propertyId,
          body.accountCode.trim(),
        ])
      ).rows[0];
      if (existing) {
        throw new BadRequestException(`Account code ${body.accountCode} already exists`);
      }

      const row = (
        await c.query(
          `INSERT INTO chart_of_accounts (tenant_id, property_id, account_code, account_name, account_type, sub_category, is_system)
           VALUES ($1, $2, $3, $4, $5, $6, false)
           RETURNING id, account_code AS "accountCode", account_name AS "accountName",
                     account_type AS "accountType", sub_category AS "subCategory",
                     is_system AS "isSystem", current_balance::float8 AS "currentBalance"`,
          [
            user.tenantId,
            user.propertyId,
            body.accountCode.trim(),
            body.accountName.trim(),
            body.accountType.toUpperCase(),
            body.subCategory?.trim() || null,
          ],
        )
      ).rows[0];
      return row;
    });
  }

  @Patch('chart-of-accounts/:id')
  @RequirePermission(PERMISSIONS.BILLING_CHARGE_POST)
  async updateAccount(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { accountName?: string; subCategory?: string; isActive?: boolean },
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const cur = (
        await c.query(`SELECT id, is_system FROM chart_of_accounts WHERE id = $1 AND property_id = $2`, [
          id,
          user.propertyId,
        ])
      ).rows[0];
      if (!cur) throw new NotFoundException('Account not found');

      const updated = (
        await c.query(
          `UPDATE chart_of_accounts
           SET account_name = coalesce($3, account_name),
               sub_category = coalesce($4, sub_category),
               is_active = coalesce($5, is_active)
           WHERE id = $1 AND property_id = $2
           RETURNING id, account_code AS "accountCode", account_name AS "accountName",
                     account_type AS "accountType", sub_category AS "subCategory",
                     is_active AS "isActive", current_balance::float8 AS "currentBalance"`,
          [id, user.propertyId, body.accountName?.trim() || null, body.subCategory?.trim() || null, body.isActive],
        )
      ).rows[0];
      return updated;
    });
  }

  @Delete('chart-of-accounts/:id')
  @RequirePermission(PERMISSIONS.BILLING_CHARGE_POST)
  async deleteAccount(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const cur = (
        await c.query(
          `SELECT id, is_system, current_balance FROM chart_of_accounts WHERE id = $1 AND property_id = $2`,
          [id, user.propertyId],
        )
      ).rows[0];
      if (!cur) throw new NotFoundException('Account not found');
      if (cur.is_system) {
        throw new BadRequestException('Standard system accounts cannot be deleted');
      }
      if (Math.abs(parseFloat(cur.current_balance)) > 0.01) {
        throw new BadRequestException('Cannot delete an account with a non-zero ledger balance');
      }

      await c.query(`DELETE FROM chart_of_accounts WHERE id = $1 AND property_id = $2`, [id, user.propertyId]);
      return { success: true, message: 'Account deleted' };
    });
  }

  // -------------------------------------------------------------
  // Journal Entries & Double-Entry Ledger
  // -------------------------------------------------------------
  @Get('journal-entries')
  @RequirePermission(PERMISSIONS.BILLING_READ)
  async getJournalEntries(@CurrentUser() user: AuthUser, @Query('limit') limitStr?: string) {
    const limit = Math.min(100, Math.max(10, parseInt(limitStr || '30', 10)));
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const entries = (
        await c.query(
          `SELECT id, voucher_number AS "voucherNumber", voucher_date::text AS "voucherDate",
                  source_module AS "sourceModule", source_reference_id AS "sourceReferenceId",
                  narration, total_debit::float8 AS "totalDebit", total_credit::float8 AS "totalCredit",
                  created_by AS "createdBy", created_at AS "createdAt"
           FROM journal_entries
           WHERE property_id = $1
           ORDER BY created_at DESC
           LIMIT $2`,
          [user.propertyId, limit],
        )
      ).rows;

      if (entries.length === 0) return [];

      const entryIds = entries.map((e) => e.id);
      const lines = (
        await c.query(
          `SELECT l.journal_entry_id AS "journalEntryId", l.id,
                  l.account_id AS "accountId", a.account_code AS "accountCode",
                  a.account_name AS "accountName", a.account_type AS "accountType",
                  l.debit_amount::float8 AS "debitAmount", l.credit_amount::float8 AS "creditAmount",
                  l.line_narration AS "lineNarration"
           FROM journal_lines l
           JOIN chart_of_accounts a ON a.id = l.account_id
           WHERE l.journal_entry_id = ANY($1::uuid[])
           ORDER BY l.debit_amount DESC, l.credit_amount DESC`,
          [entryIds],
        )
      ).rows;

      const linesByEntry = new Map<string, any[]>();
      for (const line of lines) {
        if (!linesByEntry.has(line.journalEntryId)) linesByEntry.set(line.journalEntryId, []);
        linesByEntry.get(line.journalEntryId)!.push(line);
      }

      return entries.map((e) => ({
        ...e,
        lines: linesByEntry.get(e.id) || [],
      }));
    });
  }

  @Post('journal-entries')
  @RequirePermission(PERMISSIONS.BILLING_CHARGE_POST)
  async postManualJournal(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      voucherDate?: string;
      narration: string;
      lines: Array<{ accountId: string; debitAmount: number; creditAmount: number; lineNarration?: string }>;
    },
  ) {
    if (!body.narration || !Array.isArray(body.lines) || body.lines.length < 2) {
      throw new BadRequestException('A valid journal entry requires a narration and at least 2 lines (debit & credit)');
    }

    let totalDebit = 0;
    let totalCredit = 0;
    for (const l of body.lines) {
      totalDebit += l.debitAmount || 0;
      totalCredit += l.creditAmount || 0;
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01 || totalDebit <= 0) {
      throw new BadRequestException(`Debit (${totalDebit.toFixed(2)}) must exactly equal Credit (${totalCredit.toFixed(2)})`);
    }

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const voucherNum = `JV-${Date.now().toString().slice(-6)}`;
      const entry = (
        await c.query(
          `INSERT INTO journal_entries (
             tenant_id, property_id, voucher_number, voucher_date, source_module,
             narration, total_debit, total_credit, created_by
           )
           VALUES ($1, $2, $3, coalesce($4::date, current_date), 'MANUAL_JOURNAL', $5, $6, $7, $8)
           RETURNING id, voucher_number AS "voucherNumber"`,
          [
            user.tenantId,
            user.propertyId,
            voucherNum,
            body.voucherDate || null,
            body.narration.trim(),
            totalDebit,
            totalCredit,
            user.id,
          ],
        )
      ).rows[0];

      for (const l of body.lines) {
        await c.query(
          `INSERT INTO journal_lines (tenant_id, property_id, journal_entry_id, account_id, debit_amount, credit_amount, line_narration)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [user.tenantId, user.propertyId, entry.id, l.accountId, l.debitAmount || 0, l.creditAmount || 0, l.lineNarration || null],
        );

        // Update account balances: Assets/Expenses increase with Debit, decrease with Credit.
        // Liabilities/Equity/Revenue increase with Credit, decrease with Debit.
        await c.query(
          `UPDATE chart_of_accounts
           SET current_balance = current_balance + (
             CASE WHEN account_type IN ('ASSET', 'EXPENSE') THEN ($3 - $4)
                  ELSE ($4 - $3)
             END
           )
           WHERE id = $1 AND property_id = $2`,
          [l.accountId, user.propertyId, l.debitAmount || 0, l.creditAmount || 0],
        );
      }

      return { success: true, voucherNumber: entry.voucherNumber, totalDebit };
    });
  }

  // -------------------------------------------------------------
  // Financial Statements: Live Trial Balance, P&L, Balance Sheet
  // -------------------------------------------------------------
  @Get('financial-statements')
  @RequirePermission(PERMISSIONS.BILLING_READ)
  async getFinancialStatements(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const accounts = (
        await c.query(
          `SELECT id, account_code AS "accountCode", account_name AS "accountName",
                  account_type AS "accountType", sub_category AS "subCategory",
                  current_balance::float8 AS "currentBalance"
           FROM chart_of_accounts
           WHERE property_id = $1 AND is_active = true
           ORDER BY account_code ASC`,
          [user.propertyId],
        )
      ).rows;

      const assets = accounts.filter((a) => a.accountType === 'ASSET');
      const liabilities = accounts.filter((a) => a.accountType === 'LIABILITY');
      const equity = accounts.filter((a) => a.accountType === 'EQUITY');
      const revenue = accounts.filter((a) => a.accountType === 'REVENUE');
      const expenses = accounts.filter((a) => a.accountType === 'EXPENSE');

      const totalAssets = assets.reduce((s, a) => s + a.currentBalance, 0);
      const totalLiabilities = liabilities.reduce((s, a) => s + a.currentBalance, 0);
      const totalEquity = equity.reduce((s, a) => s + a.currentBalance, 0);
      const totalRevenue = revenue.reduce((s, a) => s + a.currentBalance, 0);
      const totalExpenses = expenses.reduce((s, a) => s + a.currentBalance, 0);
      const netProfitOrLoss = totalRevenue - totalExpenses;

      // Trial balance items
      const trialBalance = accounts.map((a) => {
        const isDebitNormal = a.accountType === 'ASSET' || a.accountType === 'EXPENSE';
        return {
          accountCode: a.accountCode,
          accountName: a.accountName,
          accountType: a.accountType,
          debit: isDebitNormal ? (a.currentBalance >= 0 ? a.currentBalance : 0) : (a.currentBalance < 0 ? Math.abs(a.currentBalance) : 0),
          credit: !isDebitNormal ? (a.currentBalance >= 0 ? a.currentBalance : 0) : (a.currentBalance < 0 ? Math.abs(a.currentBalance) : 0),
        };
      });

      const totalTrialDebit = trialBalance.reduce((s, t) => s + t.debit, 0);
      const totalTrialCredit = trialBalance.reduce((s, t) => s + t.credit, 0);

      return {
        trialBalance: {
          items: trialBalance,
          totalDebit: totalTrialDebit,
          totalCredit: totalTrialCredit,
          isBalanced: Math.abs(totalTrialDebit - totalTrialCredit) < 0.05,
        },
        profitAndLoss: {
          revenueItems: revenue,
          expenseItems: expenses,
          totalRevenue,
          totalExpenses,
          netProfitOrLoss,
          profitMarginPercent: totalRevenue > 0 ? (netProfitOrLoss / totalRevenue) * 100 : 0,
        },
        balanceSheet: {
          assetItems: assets,
          liabilityItems: liabilities,
          equityItems: equity,
          totalAssets,
          totalLiabilities,
          totalEquity: totalEquity + netProfitOrLoss, // Retained earnings included
          isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity + netProfitOrLoss)) < 0.05,
        },
      };
    });
  }

  // -------------------------------------------------------------
  // Multi-Folio Corporate Routing Rules
  // -------------------------------------------------------------
  @Get('routings/:reservationId')
  @RequirePermission(PERMISSIONS.BILLING_READ)
  async getReservationRoutings(
    @CurrentUser() user: AuthUser,
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const rows = (
        await c.query(
          `SELECT id, target_folio_type AS "targetFolioType", charge_category AS "chargeCategory",
                  company_name AS "companyName", company_gstin AS "companyGstin",
                  billing_notes AS "billingNotes", created_at AS "createdAt"
           FROM reservation_folio_routings
           WHERE reservation_id = $1 AND property_id = $2
           ORDER BY created_at ASC`,
          [reservationId, user.propertyId],
        )
      ).rows;
      return rows;
    });
  }

  @Post('routings/:reservationId')
  @RequirePermission(PERMISSIONS.BILLING_CHARGE_POST)
  async createReservationRouting(
    @CurrentUser() user: AuthUser,
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @Body()
    body: {
      targetFolioType: string;
      chargeCategory: string;
      companyName?: string;
      companyGstin?: string;
      billingNotes?: string;
    },
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const row = (
        await c.query(
          `INSERT INTO reservation_folio_routings (
             tenant_id, property_id, reservation_id, target_folio_type,
             charge_category, company_name, company_gstin, billing_notes
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id, target_folio_type AS "targetFolioType", charge_category AS "chargeCategory",
                     company_name AS "companyName", company_gstin AS "companyGstin",
                     billing_notes AS "billingNotes"`,
          [
            user.tenantId,
            user.propertyId,
            reservationId,
            body.targetFolioType || 'MASTER_COMPANY',
            body.chargeCategory || 'ROOM_TARIFF',
            body.companyName?.trim() || null,
            body.companyGstin?.trim() || null,
            body.billingNotes?.trim() || null,
          ],
        )
      ).rows[0];
      return row;
    });
  }

  @Delete('routings/:id')
  @RequirePermission(PERMISSIONS.BILLING_CHARGE_POST)
  async deleteReservationRouting(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      await c.query(`DELETE FROM reservation_folio_routings WHERE id = $1 AND property_id = $2`, [id, user.propertyId]);
      return { success: true };
    });
  }
}
