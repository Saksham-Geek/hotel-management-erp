import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  ForbiddenException,
} from '@nestjs/common';
import {
  CollectFolioPaymentInput,
  CreateCorporateAccountInput,
  FEATURES,
  IssueTaxInvoiceInput,
  PERMISSIONS,
  PostFolioChargeInput,
  UpdateUpiSettingsInput,
  collectFolioPaymentSchema,
  createCorporateAccountSchema,
  issueTaxInvoiceSchema,
  postFolioChargeSchema,
  updateUpiSettingsSchema,
} from '@erp/shared';
import { AuditService } from '../audit/audit.service';
import { AuthUser, CurrentUser } from '../common/current-user';
import { RequirePermission } from '../common/permission-guard';
import { ZodPipe } from '../common/zod.pipe';
import { DbService } from '../db/db.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { RequireFeature } from '../entitlements/require-feature';
import { calculateGstTax } from './tax-calculator';
import { createHash } from 'node:crypto';

@Controller('hotel')
@RequireFeature(FEATURES.HOTEL_BILLING)
export class BillingController {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
    private readonly entitlements: EntitlementsService,
  ) {}

  @Get('folios/reservation/:reservationId')
  @RequirePermission(PERMISSIONS.BILLING_READ)
  async getReservationFolio(
    @CurrentUser() user: AuthUser,
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const reservation = (
        await c.query(
          `SELECT r.id, r.status, r.total_amount AS "totalAmount", r.check_in AS "checkIn", r.check_out AS "checkOut",
                  ro.number AS "roomNumber", p.full_name AS "guestName", p.phone AS "guestPhone", p.email AS "guestEmail"
           FROM reservations r
           JOIN rooms ro ON ro.id = r.room_id
           JOIN guests g ON g.id = r.guest_id
           JOIN parties p ON p.id = g.party_id
           WHERE r.id = $1`,
          [reservationId],
        )
      ).rows[0];

      if (!reservation) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Reservation not found' });
      }

      const folio = (
        await c.query(
          `SELECT id, status, currency, subtotal::float8, tax_total::float8 AS "taxTotal",
                  discount_total::float8 AS "discountTotal", total::float8, created_at AS "createdAt"
           FROM reservation_folios
           WHERE reservation_id = $1`,
          [reservationId],
        )
      ).rows[0];

      if (!folio) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Folio not found for this reservation' });
      }

      const items = (
        await c.query(
          `SELECT id, description, quantity::float8, unit_price::float8 AS "unitPrice",
                  tax_rate::float8 AS "taxRate", line_total::float8 AS "lineTotal",
                  tax_category_code AS "taxCategoryCode", hsn_sac AS "hsnSac",
                  cgst_amount::float8 AS "cgstAmount", sgst_amount::float8 AS "sgstAmount",
                  igst_amount::float8 AS "igstAmount", is_interstate AS "isInterstate",
                  created_at AS "createdAt"
           FROM folio_items
           WHERE folio_id = $1
           ORDER BY created_at ASC`,
          [folio.id],
        )
      ).rows;

      const payments = (
        await c.query(
          `SELECT fp.id, fp.amount::float8, fp.method, fp.reference, fp.status, fp.pan_number AS "panNumber",
                  fp.notes, fp.created_at AS "createdAt",
                  p.full_name AS "payerName", ca.company_name AS "corporateCompanyName"
           FROM folio_payments fp
           LEFT JOIN guests g ON g.id = fp.payer_guest_id
           LEFT JOIN parties p ON p.id = g.party_id
           LEFT JOIN corporate_accounts ca ON ca.id = fp.corporate_account_id
           WHERE fp.folio_id = $1
           ORDER BY fp.created_at ASC`,
          [folio.id],
        )
      ).rows;

      const invoices = (
        await c.query(
          `SELECT id, invoice_number AS "invoiceNumber", financial_year AS "financialYear",
                  invoice_type AS "invoiceType", grand_total::float8 AS "grandTotal",
                  irn_status AS "irnStatus", irn_hash AS "irnHash", signed_qr_code AS "signedQrCode",
                  issued_at AS "issuedAt"
           FROM tax_invoices
           WHERE folio_id = $1
           ORDER BY issued_at DESC`,
          [folio.id],
        )
      ).rows;

      const property = (
        await c.query(
          `SELECT name, upi_id AS "upiId", upi_merchant_name AS "upiMerchantName"
           FROM properties WHERE id = $1`,
          [user.propertyId],
        )
      ).rows[0];

      const paidTotal = payments
        .filter((p) => p.status === 'captured')
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const balanceDue = Math.max(0, Math.round((Number(folio.total) - paidTotal) * 100) / 100);

      return {
        reservation,
        folio: {
          ...folio,
          items,
          payments,
          invoices,
          paidTotal,
          balanceDue,
        },
        property: {
          name: property?.name ?? 'Hotel',
          upiId: property?.upiId ?? null,
          upiMerchantName: property?.upiMerchantName ?? property?.name ?? 'Hotel',
        },
      };
    });
  }

  @Get('upi-settings')
  @RequirePermission(PERMISSIONS.BILLING_READ)
  async getUpiSettings(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const property = (
        await c.query(
          `SELECT id, name, upi_id AS "upiId", upi_merchant_name AS "upiMerchantName"
           FROM properties WHERE id = $1`,
          [user.propertyId],
        )
      ).rows[0];

      if (!property) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Property not found' });
      }

      return {
        propertyId: property.id,
        propertyName: property.name,
        upiId: property.upiId ?? '',
        upiMerchantName: property.upiMerchantName || property.name,
        isOwner: user.role === 'owner',
      };
    });
  }

  @Patch('upi-settings')
  @RequirePermission(PERMISSIONS.PROPERTY_BANKING_MANAGE)
  async updateUpiSettings(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(updateUpiSettingsSchema)) body: UpdateUpiSettingsInput,
  ) {
    // Hard role enforcement: ONLY the hotel owner can modify the receiver UPI ID.
    // Managers, receptionists, frontdesk, housekeeping are strictly prohibited.
    if (user.role !== 'owner') {
      throw new ForbiddenException({
        code: 'OWNER_ONLY_BANKING',
        message: 'Only the property owner has the authority to configure or change the receiver UPI ID. Managers, receptionists, and front desk staff are strictly restricted to prevent unauthorized diversion of funds.',
      });
    }

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const existing = (
        await c.query(
          `SELECT id, name, upi_id AS "upiId", upi_merchant_name AS "upiMerchantName"
           FROM properties WHERE id = $1`,
          [user.propertyId],
        )
      ).rows[0];

      if (!existing) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Property not found' });
      }

      const cleanUpi = body.upiId.toLowerCase().trim();
      const merchantName = body.upiMerchantName?.trim() || existing.name;

      await c.query(
        `UPDATE properties
         SET upi_id = $1, upi_merchant_name = $2
         WHERE id = $3 AND tenant_id = $4`,
        [cleanUpi, merchantName, user.propertyId, user.tenantId],
      );

      await this.audit.log(c, {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'property.upi_receiver.update',
        entity: 'property',
        entityId: user.propertyId ?? '',
        meta: {
          previousUpiId: existing.upiId,
          newUpiId: cleanUpi,
          merchantName,
        },
      });

      return {
        propertyId: existing.id,
        propertyName: existing.name,
        upiId: cleanUpi,
        upiMerchantName: merchantName,
        message: `Receiver UPI ID updated to ${cleanUpi}. All guest QR cashiering will now settle directly into this account.`,
      };
    });
  }

  @Post('folios/:folioId/charges')
  @RequirePermission(PERMISSIONS.BILLING_CHARGE_POST)
  async postCharge(
    @CurrentUser() user: AuthUser,
    @Param('folioId', ParseUUIDPipe) folioId: string,
    @Body(new ZodPipe(postFolioChargeSchema)) b: PostFolioChargeInput,
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const folio = (
        await c.query(`SELECT id, reservation_id, status FROM reservation_folios WHERE id = $1 FOR UPDATE`, [folioId])
      ).rows[0];

      if (!folio) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Folio not found' });
      if (folio.status === 'void') {
        throw new BadRequestException({ code: 'FOLIO_VOID', message: 'Cannot add charges to a void folio' });
      }

      const tax = calculateGstTax(b.category, b.unitPrice, b.quantity, b.isInterstate);

      const item = (
        await c.query(
          `INSERT INTO folio_items (
             tenant_id, folio_id, description, quantity, unit_price, tax_rate, line_total,
             tax_category_code, hsn_sac, cgst_amount, sgst_amount, igst_amount, is_interstate
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           RETURNING id, description, quantity::float8, unit_price::float8 AS "unitPrice", line_total::float8 AS "lineTotal"`,
          [
            user.tenantId,
            folioId,
            b.description,
            b.quantity,
            b.unitPrice,
            tax.cgstRate + tax.sgstRate + tax.igstRate,
            tax.lineTotal,
            tax.categoryCode,
            tax.hsnSac,
            tax.cgstAmount,
            tax.sgstAmount,
            tax.igstAmount,
            b.isInterstate,
          ],
        )
      ).rows[0];

      // Update folio summary totals
      const totals = (
        await c.query(
          `SELECT coalesce(sum(quantity * unit_price), 0)::numeric(12,2) AS subtotal,
                  coalesce(sum(cgst_amount + sgst_amount + igst_amount), 0)::numeric(12,2) AS tax_total,
                  coalesce(sum(line_total), 0)::numeric(12,2) AS total
           FROM folio_items WHERE folio_id = $1`,
          [folioId],
        )
      ).rows[0];

      await c.query(
        `UPDATE reservation_folios
         SET subtotal = $2, tax_total = $3, total = $4, updated_at = now()
         WHERE id = $1`,
        [folioId, totals.subtotal, totals.tax_total, totals.total],
      );

      await this.audit.log(c, {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'folio.charge.post',
        entity: 'folio',
        entityId: folioId,
        meta: { description: b.description, lineTotal: tax.lineTotal, category: b.category },
      });

      return item;
    });
  }

  @Post('folios/:folioId/payments')
  @RequirePermission(PERMISSIONS.BILLING_PAYMENT_COLLECT)
  async collectPayment(
    @CurrentUser() user: AuthUser,
    @Param('folioId', ParseUUIDPipe) folioId: string,
    @Body(new ZodPipe(collectFolioPaymentSchema)) b: CollectFolioPaymentInput,
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const folio = (
        await c.query(`SELECT id, reservation_id, total, status FROM reservation_folios WHERE id = $1 FOR UPDATE`, [
          folioId,
        ])
      ).rows[0];

      if (!folio) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Folio not found' });
      if (folio.status === 'void') {
        throw new BadRequestException({ code: 'FOLIO_VOID', message: 'Cannot record payment on a void folio' });
      }

      // Check Section 269ST & Rule 114B
      if (b.method === 'cash') {
        if (b.amount >= 200_000) {
          throw new BadRequestException({
            code: 'CASH_LIMIT_EXCEEDED',
            message: 'Under Section 269ST, single cash payments of ₹2,00,000 or more are prohibited by Indian law.',
          });
        }
        if (b.amount > 50_000 && !b.panNumber) {
          throw new BadRequestException({
            code: 'PAN_REQUIRED',
            message: 'Under Rule 114B of the Income Tax Act, cash payments exceeding ₹50,000 require a valid PAN card.',
          });
        }
      }

      if (b.method === 'corporate_ledger') {
        const ent = await this.entitlements.resolve(user.tenantId, user.propertyId);
        if (!ent.features[FEATURES.HOTEL_CORPORATE_LEDGER]) {
          throw new ForbiddenException({
            code: 'FEATURE_NOT_IN_PLAN',
            feature: FEATURES.HOTEL_CORPORATE_LEDGER,
            message: 'Direct billing to Corporate City Ledger requires the Enterprise Chain Edition. Upgrade your plan to use this feature.',
          });
        }

        const corp = (
          await c.query(
            `SELECT id, company_name, credit_limit, current_balance FROM corporate_accounts WHERE id = $1`,
            [b.corporateAccountId],
          )
        ).rows[0];
        if (!corp) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Corporate company account not found' });

        const newBalance = Number(corp.current_balance) + Number(b.amount);
        if (corp.credit_limit > 0 && newBalance > Number(corp.credit_limit)) {
          throw new BadRequestException({
            code: 'CREDIT_LIMIT_EXCEEDED',
            message: `Payment exceeds corporate credit limit (Limit: ₹${corp.credit_limit}, Current: ₹${corp.current_balance}).`,
          });
        }

        await c.query(`UPDATE corporate_accounts SET current_balance = current_balance + $2 WHERE id = $1`, [
          b.corporateAccountId,
          b.amount,
        ]);
      }

      const payment = (
        await c.query(
          `INSERT INTO folio_payments (
             tenant_id, folio_id, amount, method, reference, payer_guest_id, corporate_account_id,
             pan_number, notes, status, received_by
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'captured', $10)
           RETURNING id, amount::float8, method, reference, status, pan_number AS "panNumber", created_at AS "createdAt"`,
          [
            user.tenantId,
            folioId,
            b.amount,
            b.method,
            b.reference ?? null,
            b.payerGuestId ?? null,
            b.corporateAccountId ?? null,
            b.panNumber ?? null,
            b.notes ?? null,
            user.id,
          ],
        )
      ).rows[0];

      // Update folio status
      const paidResult = (
        await c.query(`SELECT coalesce(sum(amount), 0)::float8 AS paid FROM folio_payments WHERE folio_id = $1 AND status = 'captured'`, [
          folioId,
        ])
      ).rows[0];
      const paid = Number(paidResult.paid);
      const total = Number(folio.total);

      const nextStatus = paid >= total ? 'paid' : paid > 0 ? 'part_paid' : folio.status;
      await c.query(`UPDATE reservation_folios SET status = $2, updated_at = now() WHERE id = $1`, [
        folioId,
        nextStatus,
      ]);

      await this.audit.log(c, {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'folio.payment.collect',
        entity: 'folio',
        entityId: folioId,
        meta: { amount: b.amount, method: b.method, nextStatus },
      });

      return payment;
    });
  }

  @Post('folios/:folioId/invoice')
  @RequirePermission(PERMISSIONS.BILLING_INVOICE_ISSUE)
  async issueInvoice(
    @CurrentUser() user: AuthUser,
    @Param('folioId', ParseUUIDPipe) folioId: string,
    @Body(new ZodPipe(issueTaxInvoiceSchema)) b: IssueTaxInvoiceInput,
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const folio = (
        await c.query(
          `SELECT f.id, f.reservation_id, f.subtotal, f.tax_total, f.total,
                  r.guest_id, p.full_name AS "guestName"
           FROM reservation_folios f
           JOIN reservations r ON r.id = f.reservation_id
           JOIN guests g ON g.id = r.guest_id
           JOIN parties p ON p.id = g.party_id
           WHERE f.id = $1 FOR UPDATE`,
          [folioId],
        )
      ).rows[0];

      if (!folio) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Folio not found' });
      if (folio.status === 'void') {
        throw new BadRequestException({ code: 'FOLIO_VOID', message: 'Cannot issue an invoice for a void folio' });
      }
      if (Number(folio.total) <= 0) {
        throw new BadRequestException({ code: 'EMPTY_FOLIO', message: 'Cannot issue a tax invoice for an empty folio' });
      }

      const existingInv = (
        await c.query(
          `SELECT id, invoice_number AS "invoiceNumber" FROM tax_invoices WHERE tenant_id = $1 AND property_id = $2 AND folio_id = $3 AND invoice_type IN ('B2C', 'B2B')`,
          [user.tenantId, user.propertyId, folioId],
        )
      ).rows[0];
      if (existingInv) {
        throw new BadRequestException({
          code: 'INVOICE_ALREADY_EXISTS',
          message: `Tax Invoice ${existingInv.invoiceNumber} has already been issued for this folio.`,
        });
      }

      // Determine current Indian Financial Year (April 1 to March 31)
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // 1 to 12
      const startYear = currentMonth >= 4 ? currentYear : currentYear - 1;
      const fyCode = `${String(startYear).slice(2)}${String(startYear + 1).slice(2)}`; // e.g. '2627'
      const fyFull = `${startYear}-${startYear + 1}`;

      // Generate next 16-character consecutive invoice number per property
      const seqRow = (
        await c.query(
          `SELECT count(*)::int AS count FROM tax_invoices WHERE tenant_id = $1 AND property_id = $2 AND financial_year = $3`,
          [user.tenantId, user.propertyId, fyFull],
        )
      ).rows[0];
      const seq = String(Number(seqRow.count) + 1).padStart(6, '0');
      const invoiceNumber = `GA/${fyCode}/${seq}`; // exactly 14-16 chars

      // Sum tax breakdowns from folio items
      const taxes = (
        await c.query(
          `SELECT coalesce(sum(cgst_amount), 0)::numeric(12,2) AS cgst,
                  coalesce(sum(sgst_amount), 0)::numeric(12,2) AS sgst,
                  coalesce(sum(igst_amount), 0)::numeric(12,2) AS igst
           FROM folio_items WHERE folio_id = $1`,
          [folioId],
        )
      ).rows[0];

      // Generate E-Invoice mock IRN (64 hex characters) and signed QR code string
      const irnPayload = `${invoiceNumber}:${folio.total}:${b.guestGstin ?? 'B2C'}:${now.toISOString()}`;
      const irnHash = createHash('sha256').update(irnPayload).digest('hex');
      const signedQrCode = `IRN:${irnHash.slice(0, 16)}|GSTIN:27AAAAA0000A1Z5|INV:${invoiceNumber}|VAL:${folio.total}`;

      const invoice = (
        await c.query(
          `INSERT INTO tax_invoices (
             tenant_id, folio_id, reservation_id, invoice_number, financial_year, invoice_type,
             hotel_gstin, guest_gstin, guest_company_name, guest_name, place_of_supply_state_code,
             is_interstate, total_taxable_amount, cgst_amount, sgst_amount, igst_amount, grand_total,
             irn_hash, signed_qr_code, irn_status, issued_by
           )
           VALUES ($1, $2, $3, $4, $5, $6, '27AAAAA0000A1Z5', $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'generated', $19)
           RETURNING id, invoice_number AS "invoiceNumber", financial_year AS "financialYear", invoice_type AS "invoiceType",
                     grand_total::float8 AS "grandTotal", irn_hash AS "irnHash", signed_qr_code AS "signedQrCode", issued_at AS "issuedAt"`,
          [
            user.tenantId,
            folioId,
            folio.reservation_id,
            invoiceNumber,
            fyFull,
            b.invoiceType,
            b.guestGstin ?? null,
            b.guestCompanyName ?? null,
            folio.guestName ?? 'Guest',
            b.placeOfSupplyStateCode,
            b.isInterstate,
            folio.subtotal,
            taxes.cgst,
            taxes.sgst,
            taxes.igst,
            folio.total,
            irnHash,
            signedQrCode,
            user.id,
          ],
        )
      ).rows[0];

      await c.query(`UPDATE reservation_folios SET status = 'issued', updated_at = now() WHERE id = $1`, [folioId]);

      await this.audit.log(c, {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'folio.invoice.issue',
        entity: 'tax_invoice',
        entityId: invoice.id,
        meta: { invoiceNumber, grandTotal: invoice.grandTotal, irnHash },
      });

      return invoice;
    });
  }

  @Get('invoices/:invoiceId')
  @RequirePermission(PERMISSIONS.BILLING_READ)
  async getInvoice(
    @CurrentUser() user: AuthUser,
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const inv = (
        await c.query(
          `SELECT i.id, i.invoice_number AS "invoiceNumber", i.financial_year AS "financialYear",
                  i.invoice_type AS "invoiceType", i.hotel_gstin AS "hotelGstin", i.guest_gstin AS "guestGstin",
                  i.guest_company_name AS "guestCompanyName", i.guest_name AS "guestName",
                  i.place_of_supply_state_code AS "placeOfSupplyStateCode", i.is_interstate AS "isInterstate",
                  i.total_taxable_amount::float8 AS "totalTaxableAmount",
                  i.cgst_amount::float8 AS "cgstAmount", i.sgst_amount::float8 AS "sgstAmount",
                  i.igst_amount::float8 AS "igstAmount", i.grand_total::float8 AS "grandTotal",
                  i.irn_hash AS "irnHash", i.signed_qr_code AS "signedQrCode", i.irn_status AS "irnStatus",
                  i.issued_at AS "issuedAt",
                  prop.name AS "propertyName", prop.currency
           FROM tax_invoices i
           JOIN properties prop ON prop.id = i.property_id
           WHERE i.id = $1`,
          [invoiceId],
        )
      ).rows[0];

      if (!inv) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Invoice not found' });

      const items = (
        await c.query(
          `SELECT fi.description, fi.quantity::float8, fi.unit_price::float8 AS "unitPrice",
                  fi.line_total::float8 AS "lineTotal", fi.hsn_sac AS "hsnSac",
                  fi.cgst_amount::float8 AS "cgstAmount", fi.sgst_amount::float8 AS "sgstAmount",
                  fi.igst_amount::float8 AS "igstAmount"
           FROM folio_items fi
           JOIN tax_invoices ti ON ti.folio_id = fi.folio_id
           WHERE ti.id = $1
           ORDER BY fi.created_at ASC`,
          [invoiceId],
        )
      ).rows;

      return { ...inv, items };
    });
  }

  // --- Corporate Accounts ---
  @Get('corporate-accounts')
  @RequireFeature(FEATURES.HOTEL_CORPORATE_LEDGER)
  @RequirePermission(PERMISSIONS.CORPORATE_ACCOUNT_MANAGE)
  async listCorporateAccounts(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      return (
        await c.query(
          `SELECT id, company_name AS "companyName", gstin, pan_number AS "panNumber",
                  contact_person AS "contactPerson", contact_email AS "contactEmail", contact_phone AS "contactPhone",
                  credit_limit::float8 AS "creditLimit", current_balance::float8 AS "currentBalance",
                  credit_period_days AS "creditPeriodDays", is_active AS "isActive"
           FROM corporate_accounts
           WHERE tenant_id = $1 AND property_id = $2 AND is_active
           ORDER BY company_name ASC`,
          [user.tenantId, user.propertyId],
        )
      ).rows;
    });
  }

  @Post('corporate-accounts')
  @RequireFeature(FEATURES.HOTEL_CORPORATE_LEDGER)
  @RequirePermission(PERMISSIONS.CORPORATE_ACCOUNT_MANAGE)
  async createCorporateAccount(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(createCorporateAccountSchema)) b: CreateCorporateAccountInput,
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const row = (
        await c.query(
          `INSERT INTO corporate_accounts (
             tenant_id, property_id, company_name, gstin, pan_number, contact_person, contact_email,
             contact_phone, credit_limit, credit_period_days, billing_address
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id, company_name AS "companyName", gstin, pan_number AS "panNumber",
                     credit_limit::float8 AS "creditLimit", current_balance::float8 AS "currentBalance"`,
          [
            user.tenantId,
            user.propertyId,
            b.companyName,
            b.gstin ?? null,
            b.panNumber ?? null,
            b.contactPerson ?? null,
            b.contactEmail ?? null,
            b.contactPhone ?? null,
            b.creditLimit,
            b.creditPeriodDays,
            JSON.stringify(b.billingAddress),
          ],
        )
      ).rows[0];

      await this.audit.log(c, {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'corporate_account.create',
        entity: 'corporate_account',
        entityId: row.id,
        meta: { companyName: b.companyName },
      });

      return row;
    });
  }
}
