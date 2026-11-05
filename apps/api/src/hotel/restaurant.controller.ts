import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  FEATURES,
  PERMISSIONS,
  createKotOrderSchema,
  updateKotStatusSchema,
  chargeKotToRoomSchema,
  punchKotRoundSchema,
  mergeTablesSchema,
  transferTableSchema,
  adjustKotBillSchema,
  splitKotBillSchema,
  settleKotSplitSchema,
  type CreateKotOrderInput,
  type UpdateKotStatusInput,
  type ChargeKotToRoomInput,
  type PunchKotRoundInput,
  type MergeTablesInput,
  type TransferTableInput,
  type AdjustKotBillInput,
  type SplitKotBillInput,
  type SettleKotSplitInput,
} from '@erp/shared';
import { AuthUser, CurrentUser } from '../common/current-user';
import { RequirePermission } from '../common/permission-guard';
import { RequireFeature } from '../entitlements/require-feature';
import { DbService } from '../db/db.service';

@Controller('hotel/restaurant')
@RequireFeature(FEATURES.HOTEL_RESTAURANT_POS)
export class RestaurantController {
  constructor(private readonly db: DbService) {}

  @Get('outlets')
  @RequirePermission(PERMISSIONS.RESTAURANT_VIEW)
  async getOutlets(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const res = await c.query(
        `select id, name, code, outlet_type as "outletType", is_active as "isActive",
                fssai_number as "fssaiNumber", gstin,
                service_charge_percent as "serviceChargePercent",
                is_standalone as "isStandalone",
                contact_phone as "contactPhone",
                address
         from restaurant_outlets
         order by name asc`
      );
      return res.rows;
    });
  }

  @Get('tables')
  @RequirePermission(PERMISSIONS.RESTAURANT_VIEW)
  async getTables(@CurrentUser() user: AuthUser, @Query('outletId') outletId?: string) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const res = await c.query(
        `select t.id, t.outlet_id as "outletId", t.table_number as "tableNumber",
                t.capacity, t.status, t.section, t.is_merged as "isMerged",
                t.merged_with_table_id as "mergedWithTableId",
                t.active_kot_id as "activeKotId",
                o.name as "outletName",
                k.kot_number as "activeKotNumber",
                k.round_number as "activeRoundNumber",
                k.total_amount as "activeTotalAmount",
                k.guest_name as "activeGuestName",
                k.created_at as "activeOrderTime"
         from restaurant_tables t
         join restaurant_outlets o on o.id = t.outlet_id
         left join kot_orders k on k.id = t.active_kot_id
         where ($1::uuid is null or t.outlet_id = $1::uuid)
         order by t.section asc, t.table_number asc`,
        [outletId || null]
      );
      return res.rows;
    });
  }

  @Get('menu')
  @RequirePermission(PERMISSIONS.RESTAURANT_VIEW)
  async getMenu(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const catRes = await c.query(
        `select id, name, sort_order as "sortOrder", is_active as "isActive"
         from menu_categories
         where is_active = true
         order by sort_order asc, name asc`
      );

      const itemRes = await c.query(
        `select id, category_id as "categoryId", name, item_code as "itemCode",
                description, price, food_type as "foodType", sac_code as "sacCode",
                gst_rate as "gstRate", is_available as "isAvailable"
         from menu_items
         where is_available = true
         order by item_code asc`
      );

      return catRes.rows.map((cat: any) => ({
        ...cat,
        items: itemRes.rows.filter((it: any) => it.categoryId === cat.id),
      }));
    });
  }

  @Get('kots')
  @RequirePermission(PERMISSIONS.RESTAURANT_VIEW)
  async getKots(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const ordersRes = await c.query(
        `select k.id, k.kot_number as "kotNumber", k.round_number as "roundNumber",
                k.order_type as "orderType", k.status, k.payment_status as "paymentStatus",
                k.subtotal, k.tax_amount as "taxAmount", k.total_amount as "totalAmount",
                k.discount_type as "discountType", k.discount_value as "discountValue",
                k.discount_amount as "discountAmount", k.service_charge_amount as "serviceChargeAmount",
                k.special_instructions as "specialInstructions",
                k.guest_name as "guestName", k.customer_phone as "customerPhone",
                k.server_name as "serverName",
                k.created_at as "createdAt", k.prepared_at as "preparedAt", k.served_at as "servedAt",
                o.name as "outletName",
                t.table_number as "tableNumber",
                t.section as "tableSection",
                r.number as "roomNumber"
         from kot_orders k
         join restaurant_outlets o on o.id = k.outlet_id
         left join restaurant_tables t on t.id = k.table_id
         left join rooms r on r.id = k.room_id
         where k.status not in ('settled', 'cancelled')
         order by k.created_at desc
         limit 60`
      );

      if (ordersRes.rows.length === 0) return [];

      const orderIds = ordersRes.rows.map((o: any) => o.id);
      const itemsRes = await c.query(
        `select i.id, i.order_id as "orderId", i.menu_item_id as "menuItemId",
                i.item_name as "itemName", i.quantity, i.unit_price as "unitPrice",
                i.gst_rate as "gstRate", i.food_type as "foodType",
                i.special_notes as "specialNotes", i.status
         from kot_order_items i
         where i.order_id = any($1::uuid[])`,
        [orderIds]
      );

      const splitsRes = await c.query(
        `select s.id, s.order_id as "orderId", s.split_number as "splitNumber",
                s.amount, s.payment_method as "paymentMethod", s.is_settled as "isSettled",
                s.room_number as "roomNumber", s.payment_reference as "paymentReference"
         from kot_order_splits s
         where s.order_id = any($1::uuid[])
         order by s.split_number asc`,
        [orderIds]
      );

      return ordersRes.rows.map((o: any) => ({
        ...o,
        items: itemsRes.rows.filter((i: any) => i.orderId === o.id),
        splits: splitsRes.rows.filter((s: any) => s.orderId === o.id),
      }));
    });
  }

  @Get('customers/lookup')
  @RequirePermission(PERMISSIONS.RESTAURANT_VIEW)
  async lookupCustomer(@CurrentUser() user: AuthUser, @Query('phone') phone: string) {
    if (!phone) return null;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const res = await c.query(
        `select id, name, phone, email, dietary_preference as "dietaryPreference",
                visit_count as "visitCount", total_spend as "totalSpend", notes
         from restaurant_customers
         where phone = $1 or phone like '%' || $1
         limit 1`,
        [cleanPhone]
      );
      return res.rows[0] ?? null;
    });
  }

  @Post('kots')
  @RequirePermission(PERMISSIONS.RESTAURANT_ORDER)
  async createKot(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = createKotOrderSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ issues: parsed.error.flatten() });
    }
    const input: CreateKotOrderInput = parsed.data;

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      let roomId: string | null = null;
      let reservationId: string | null = input.reservationId ?? null;
      if (input.roomNumber) {
        const roomRes = await c.query(
          `select r.id, res.id as active_res_id, g.name as guest_name
           from rooms r
           left join reservations res on res.room_id = r.id and res.status in ('confirmed', 'checked_in')
           left join guests g on g.id = res.guest_id
           where r.number = $1 limit 1`,
          [input.roomNumber]
        );
        if (roomRes.rows[0]) {
          roomId = roomRes.rows[0].id;
          if (!reservationId && roomRes.rows[0].active_res_id) {
            reservationId = roomRes.rows[0].active_res_id;
            if (!input.guestName) input.guestName = roomRes.rows[0].guest_name;
          }
        }
      }

      const countRes = await c.query(`select count(*)::int as count from kot_orders`);
      const nextNum = (countRes.rows[0]?.count ?? 0) + 101;
      const kotNumber = `KOT-${nextNum}`;

      let subtotal = 0;
      let taxAmount = 0;
      for (const item of input.items) {
        const lineSubtotal = item.quantity * Number(item.unitPrice);
        const lineTax = (lineSubtotal * (Number(item.gstRate) || 5.0)) / 100;
        subtotal += lineSubtotal;
        taxAmount += lineTax;
      }
      const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

      const orderRes = await c.query(
        `insert into kot_orders (
           tenant_id, property_id, outlet_id, table_id, reservation_id, room_id,
           kot_number, round_number, order_type, status, subtotal, tax_amount, total_amount,
           special_instructions, guest_name, customer_phone, server_name
         ) values ($1, $2, $3, $4, $5, $6, $7, 1, $8, 'pending', $9, $10, $11, $12, $13, $14, $15)
         returning id, kot_number as "kotNumber", created_at as "createdAt"`,
        [
          user.tenantId,
          user.propertyId,
          input.outletId,
          input.tableId ?? null,
          reservationId,
          roomId,
          kotNumber,
          input.orderType,
          subtotal,
          taxAmount,
          totalAmount,
          input.specialInstructions ?? null,
          input.guestName ?? (input.orderType === 'room_service' ? `Room ${input.roomNumber}` : 'Walk-in Guest'),
          input.customerPhone ?? null,
          input.serverName ?? 'Floor Captain',
        ]
      );
      const newOrder = orderRes.rows[0];

      for (const item of input.items) {
        await c.query(
          `insert into kot_order_items (
             order_id, menu_item_id, item_name, quantity, unit_price, gst_rate, food_type, special_notes, status
           ) values ($1, $2, $3, $4, $5, $6, $7, $8, 'queued')`,
          [
            newOrder.id,
            item.menuItemId,
            item.itemName,
            item.quantity,
            item.unitPrice,
            item.gstRate ?? 5.0,
            item.foodType,
            item.specialNotes ?? null,
          ]
        );
      }

      if (input.tableId) {
        await c.query(
          `update restaurant_tables
           set status = 'occupied', active_kot_id = $1, updated_at = now()
           where id = $2`,
          [newOrder.id, input.tableId]
        );
      }

      if (input.customerPhone && input.guestName) {
        const cleanPhone = input.customerPhone.replace(/[^0-9]/g, '');
        await c.query(
          `insert into restaurant_customers (
             tenant_id, property_id, name, phone, visit_count, total_spend
           ) values ($1, $2, $3, $4, 1, $5)
           on conflict (property_id, phone)
           do update set
             visit_count = restaurant_customers.visit_count + 1,
             total_spend = restaurant_customers.total_spend + $5,
             updated_at = now()`,
          [user.tenantId, user.propertyId, input.guestName, cleanPhone, totalAmount]
        );
      }

      return {
        id: newOrder.id,
        kotNumber: newOrder.kotNumber,
        subtotal,
        taxAmount,
        totalAmount,
        createdAt: newOrder.createdAt,
      };
    });
  }

  @Post('kots/:id/round')
  @RequirePermission(PERMISSIONS.RESTAURANT_ORDER)
  async punchKotRound(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    const parsed = punchKotRoundSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ issues: parsed.error.flatten() });
    const input: PunchKotRoundInput = parsed.data;

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const kotRes = await c.query(
        `select id, kot_number, round_number, subtotal, tax_amount, total_amount, table_id
         from kot_orders where id = $1`,
        [id]
      );
      const kot = kotRes.rows[0];
      if (!kot) throw new NotFoundException('KOT Order not found');

      const nextRound = (kot.round_number || 1) + 1;
      let roundSubtotal = 0;
      let roundTax = 0;

      for (const item of input.items) {
        const lineSubtotal = item.quantity * Number(item.unitPrice);
        const lineTax = (lineSubtotal * (Number(item.gstRate) || 5.0)) / 100;
        roundSubtotal += lineSubtotal;
        roundTax += lineTax;

        await c.query(
          `insert into kot_order_items (
             order_id, menu_item_id, item_name, quantity, unit_price, gst_rate, food_type, special_notes, status
           ) values ($1, $2, $3, $4, $5, $6, $7, $8, 'queued')`,
          [
            id,
            item.menuItemId,
            item.itemName,
            item.quantity,
            item.unitPrice,
            item.gstRate ?? 5.0,
            item.foodType,
            item.specialNotes ? `[Round ${nextRound}] ${item.specialNotes}` : `[Round ${nextRound}]`,
          ]
        );
      }

      const newSubtotal = Number(kot.subtotal) + roundSubtotal;
      const newTax = Number(kot.tax_amount) + roundTax;
      const newTotal = Math.round((newSubtotal + newTax) * 100) / 100;

      await c.query(
        `update kot_orders
         set round_number = $1, subtotal = $2, tax_amount = $3, total_amount = $4,
             status = 'pending', updated_at = now()
         where id = $5`,
        [nextRound, newSubtotal, newTax, newTotal, id]
      );

      return {
        id,
        kotNumber: `${kot.kot_number}-R${nextRound}`,
        roundNumber: nextRound,
        newTotalAmount: newTotal,
        addedItemsCount: input.items.length,
      };
    });
  }

  @Post('tables/transfer')
  @RequirePermission(PERMISSIONS.RESTAURANT_ORDER)
  async transferTable(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = transferTableSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ issues: parsed.error.flatten() });
    const { fromTableId, toTableId } = parsed.data;

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const fromRes = await c.query(
        `select id, table_number, active_kot_id, status from restaurant_tables where id = $1`,
        [fromTableId]
      );
      const toRes = await c.query(
        `select id, table_number, active_kot_id, status from restaurant_tables where id = $1`,
        [toTableId]
      );

      const fromTable = fromRes.rows[0];
      const toTable = toRes.rows[0];

      if (!fromTable || !toTable) throw new NotFoundException('Table not found');
      if (!fromTable.active_kot_id) throw new BadRequestException('Source table has no active order to shift.');
      if (toTable.status === 'occupied' && toTable.active_kot_id) {
        throw new BadRequestException(`Destination Table ${toTable.table_number} is already occupied. Use Merge instead.`);
      }

      const activeKotId = fromTable.active_kot_id;

      await c.query(
        `update kot_orders set table_id = $1 where id = $2`,
        [toTableId, activeKotId]
      );

      await c.query(
        `update restaurant_tables
         set status = 'vacant', active_kot_id = null, is_merged = false, merged_with_table_id = null
         where id = $1`,
        [fromTableId]
      );

      await c.query(
        `update restaurant_tables
         set status = 'occupied', active_kot_id = $1
         where id = $2`,
        [activeKotId, toTableId]
      );

      return {
        success: true,
        message: `Successfully shifted order from Table ${fromTable.table_number} to Table ${toTable.table_number}.`,
        activeKotId,
        destinationTableNumber: toTable.table_number,
      };
    });
  }

  @Post('tables/merge')
  @RequirePermission(PERMISSIONS.RESTAURANT_ORDER)
  async mergeTables(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = mergeTablesSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ issues: parsed.error.flatten() });
    const { sourceTableId, targetTableId } = parsed.data;

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const srcRes = await c.query(
        `select id, table_number, active_kot_id from restaurant_tables where id = $1`,
        [sourceTableId]
      );
      const tgtRes = await c.query(
        `select id, table_number, active_kot_id from restaurant_tables where id = $1`,
        [targetTableId]
      );

      const src = srcRes.rows[0];
      const tgt = tgtRes.rows[0];
      if (!src || !tgt) throw new NotFoundException('Table not found');

      const primaryKotId = tgt.active_kot_id || src.active_kot_id;
      if (!primaryKotId) {
        throw new BadRequestException('At least one of the tables must have an active order to merge.');
      }

      if (src.active_kot_id && tgt.active_kot_id && src.active_kot_id !== tgt.active_kot_id) {
        await c.query(
          `update kot_order_items set order_id = $1 where order_id = $2`,
          [tgt.active_kot_id, src.active_kot_id]
        );

        const totalsRes = await c.query(
          `select coalesce(sum(quantity * unit_price), 0) as subtotal,
                  coalesce(sum((quantity * unit_price * gst_rate) / 100), 0) as tax
           from kot_order_items where order_id = $1`,
          [tgt.active_kot_id]
        );
        const subtotal = Number(totalsRes.rows[0].subtotal);
        const tax = Number(totalsRes.rows[0].tax);
        const total = Math.round((subtotal + tax) * 100) / 100;

        await c.query(
          `update kot_orders set subtotal = $1, tax_amount = $2, total_amount = $3 where id = $4`,
          [subtotal, tax, total, tgt.active_kot_id]
        );

        await c.query(
          `update kot_orders set status = 'cancelled', special_instructions = 'Merged into Table ' || $1 where id = $2`,
          [tgt.table_number, src.active_kot_id]
        );
      }

      await c.query(
        `update restaurant_tables
         set status = 'occupied', active_kot_id = $1, is_merged = true, merged_with_table_id = $2
         where id = $3`,
        [primaryKotId, targetTableId, sourceTableId]
      );

      await c.query(
        `update restaurant_tables
         set status = 'occupied', active_kot_id = $1
         where id = $2`,
        [primaryKotId, targetTableId]
      );

      return {
        success: true,
        message: `Merged Table ${src.table_number} with Table ${tgt.table_number}. Active bill consolidated.`,
        consolidatedTable: tgt.table_number,
      };
    });
  }

  @Patch('kots/:id/bill-adjust')
  @RequirePermission(PERMISSIONS.RESTAURANT_ORDER)
  async adjustBill(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    const parsed = adjustKotBillSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ issues: parsed.error.flatten() });
    const input: AdjustKotBillInput = parsed.data;

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const kotRes = await c.query(
        `select id, subtotal, tax_amount from kot_orders where id = $1`,
        [id]
      );
      const kot = kotRes.rows[0];
      if (!kot) throw new NotFoundException('KOT Order not found');

      const subtotal = Number(kot.subtotal);
      const tax = Number(kot.tax_amount);

      let discountAmount = 0;
      if (input.discountType === 'percent') {
        discountAmount = Math.round(((subtotal * input.discountValue) / 100) * 100) / 100;
      } else if (input.discountType === 'flat') {
        discountAmount = Math.min(input.discountValue, subtotal);
      }

      let serviceChargeAmount = 0;
      if (input.applyServiceCharge) {
        serviceChargeAmount = Math.round(((subtotal * input.serviceChargePercent) / 100) * 100) / 100;
      }

      const netTotal = Math.max(0, Math.round((subtotal + tax + serviceChargeAmount - discountAmount) * 100) / 100);

      await c.query(
        `update kot_orders
         set discount_type = $1, discount_value = $2, discount_amount = $3,
             service_charge_amount = $4, total_amount = $5,
             customer_name = coalesce($6, customer_name),
             customer_phone = coalesce($7, customer_phone),
             updated_at = now()
         where id = $8`,
        [
          input.discountType,
          input.discountValue,
          discountAmount,
          serviceChargeAmount,
          netTotal,
          input.customerName || null,
          input.customerPhone || null,
          id,
        ]
      );

      return {
        id,
        subtotal,
        taxAmount: tax,
        discountAmount,
        serviceChargeAmount,
        netTotal,
      };
    });
  }

  @Post('kots/:id/split')
  @RequirePermission(PERMISSIONS.RESTAURANT_ORDER)
  async setupSplit(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    const parsed = splitKotBillSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ issues: parsed.error.flatten() });
    const input: SplitKotBillInput = parsed.data;

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const kotRes = await c.query(`select id, total_amount from kot_orders where id = $1`, [id]);
      const kot = kotRes.rows[0];
      if (!kot) throw new NotFoundException('KOT Order not found');

      const total = Number(kot.total_amount);
      await c.query(`delete from kot_order_splits where order_id = $1`, [id]);

      const splits: any[] = [];
      if (input.splitType === 'equal') {
        const count = input.splitsCount || 2;
        const equalPart = Math.floor((total / count) * 100) / 100;
        let runningSum = 0;

        for (let i = 1; i <= count; i++) {
          const amount = i === count ? Math.round((total - runningSum) * 100) / 100 : equalPart;
          runningSum += amount;

          const res = await c.query(
            `insert into kot_order_splits (
               tenant_id, property_id, order_id, split_number, amount, payment_method, is_settled
             ) values ($1, $2, $3, $4, $5, 'cash', false)
             returning id, split_number as "splitNumber", amount, payment_method as "paymentMethod", is_settled as "isSettled"`,
            [user.tenantId, user.propertyId, id, i, amount]
          );
          splits.push(res.rows[0]);
        }
      } else if (input.splitType === 'custom' && input.splits) {
        for (const s of input.splits) {
          const res = await c.query(
            `insert into kot_order_splits (
               tenant_id, property_id, order_id, split_number, amount, payment_method,
               reservation_id, room_number, is_settled
             ) values ($1, $2, $3, $4, $5, $6, $7, $8, false)
             returning id, split_number as "splitNumber", amount, payment_method as "paymentMethod", is_settled as "isSettled"`,
            [
              user.tenantId,
              user.propertyId,
              id,
              s.splitNumber,
              s.amount,
              s.paymentMethod,
              s.reservationId || null,
              s.roomNumber || null,
            ]
          );
          splits.push(res.rows[0]);
        }
      }

      await c.query(`update kot_orders set is_split = true, payment_method = 'split' where id = $1`, [id]);

      return {
        orderId: id,
        totalAmount: total,
        splits,
      };
    });
  }

  @Post('kots/:id/splits/:splitId/settle')
  @RequirePermission(PERMISSIONS.BILLING_PAYMENT_COLLECT)
  async settleSplit(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('splitId') splitId: string,
    @Body() body: unknown
  ) {
    const parsed = settleKotSplitSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ issues: parsed.error.flatten() });
    const input: SettleKotSplitInput = parsed.data;

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const splitRes = await c.query(
        `select s.id, s.amount, s.split_number, k.kot_number, k.table_id
         from kot_order_splits s
         join kot_orders k on k.id = s.order_id
         where s.id = $1 and s.order_id = $2`,
        [splitId, id]
      );
      const split = splitRes.rows[0];
      if (!split) throw new NotFoundException('Split bill not found');

      if (input.paymentMethod === 'room_charge' && input.reservationId) {
        const folioRes = await c.query(
          `select id from reservation_folios where reservation_id = $1 and status = 'open' limit 1`,
          [input.reservationId]
        );
        let folioId = folioRes.rows[0]?.id;
        if (!folioId) {
          const newFolio = await c.query(
            `insert into reservation_folios (tenant_id, property_id, reservation_id, status)
             values ($1, $2, $3, 'open') returning id`,
            [user.tenantId, user.propertyId, input.reservationId]
          );
          folioId = newFolio.rows[0].id;
        }

        const netBase = Math.round((Number(split.amount) / 1.05) * 100) / 100;
        const tax = Math.round((Number(split.amount) - netBase) * 100) / 100;

        await c.query(
          `insert into folio_items (
             tenant_id, property_id, folio_id, description, amount, tax_rate, tax_amount, total, sac_code
           ) values ($1, $2, $3, $4, $5, 5.00, $6, $7, '996331')`,
          [
            user.tenantId,
            user.propertyId,
            folioId,
            `Restaurant Split #${split.split_number} (${split.kot_number}) - Room ${input.roomNumber || 'Guest'}`,
            netBase,
            tax,
            split.amount,
          ]
        );
      }

      await c.query(
        `update kot_order_splits
         set is_settled = true, payment_method = $1, payment_reference = $2,
             reservation_id = $3, room_number = $4, settled_at = now()
         where id = $5`,
        [
          input.paymentMethod,
          input.paymentReference || null,
          input.reservationId || null,
          input.roomNumber || null,
          splitId,
        ]
      );

      const remainingRes = await c.query(
        `select count(*)::int as remaining from kot_order_splits where order_id = $1 and is_settled = false`,
        [id]
      );
      const allDone = (remainingRes.rows[0]?.remaining ?? 0) === 0;

      if (allDone) {
        await c.query(
          `update kot_orders set status = 'settled', payment_status = 'paid_direct', settled_at = now() where id = $1`,
          [id]
        );
        if (split.table_id) {
          await c.query(
            `update restaurant_tables
             set status = 'vacant', active_kot_id = null, is_merged = false, merged_with_table_id = null
             where id = $1 or merged_with_table_id = $1`,
            [split.table_id]
          );
        }
      }

      return {
        splitId,
        isSettled: true,
        allSplitsSettled: allDone,
        message: allDone
          ? 'All splits settled! Order complete and table vacated.'
          : `Split #${split.split_number} settled successfully.`,
      };
    });
  }

  @Patch('kots/:id/status')
  @RequirePermission(PERMISSIONS.RESTAURANT_ORDER)
  async updateKotStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    const parsed = updateKotStatusSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ issues: parsed.error.flatten() });
    const { status } = parsed.data;

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      let timeUpdate = '';
      if (status === 'preparing') timeUpdate = ', prepared_at = coalesce(prepared_at, now())';
      if (status === 'ready' || status === 'served') timeUpdate = ', served_at = coalesce(served_at, now())';

      const res = await c.query(
        `update kot_orders
         set status = $1 ${timeUpdate}
         where id = $2
         returning id, kot_number as "kotNumber", status`,
        [status, id]
      );
      if (!res.rows[0]) throw new NotFoundException('KOT Order not found');

      const itemStatus = status === 'ready' ? 'ready' : status === 'served' ? 'served' : status === 'preparing' ? 'cooking' : 'queued';
      await c.query(`update kot_order_items set status = $1 where order_id = $2`, [itemStatus, id]);

      return res.rows[0];
    });
  }

  @Post('kots/:id/charge-to-room')
  @RequirePermission(PERMISSIONS.BILLING_CHARGE_POST)
  async chargeToRoom(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    const parsed = chargeKotToRoomSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ issues: parsed.error.flatten() });
    const { reservationId, roomNumber } = parsed.data;

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const kotRes = await c.query(
        `select id, kot_number, subtotal, tax_amount, total_amount, table_id
         from kot_orders
         where id = $1`,
        [id]
      );
      const kot = kotRes.rows[0];
      if (!kot) throw new NotFoundException('KOT Order not found');

      const folioRes = await c.query(
        `select id from reservation_folios
         where reservation_id = $1 and status = 'open' limit 1`,
        [reservationId]
      );
      let folioId = folioRes.rows[0]?.id;
      if (!folioId) {
        const newFolio = await c.query(
          `insert into reservation_folios (tenant_id, property_id, reservation_id, status)
           values ($1, $2, $3, 'open') returning id`,
          [user.tenantId, user.propertyId, reservationId]
        );
        folioId = newFolio.rows[0].id;
      }

      const description = `F&B Dining: ${kot.kot_number} (Room ${roomNumber})`;
      await c.query(
        `insert into folio_items (
           tenant_id, property_id, folio_id, description, amount, tax_rate, tax_amount, total, sac_code
         ) values ($1, $2, $3, $4, $5, 5.00, $6, $7, '996331')`,
        [user.tenantId, user.propertyId, folioId, description, kot.subtotal, kot.tax_amount, kot.total_amount]
      );

      await c.query(
        `update kot_orders
         set status = 'settled', payment_status = 'charged_to_room',
             payment_method = 'room_charge',
             reservation_id = $1, folio_id = $2, settled_at = now()
         where id = $3`,
        [reservationId, folioId, id]
      );

      if (kot.table_id) {
        await c.query(
          `update restaurant_tables
           set status = 'vacant', active_kot_id = null, is_merged = false, merged_with_table_id = null, updated_at = now()
           where id = $1 or merged_with_table_id = $1`,
          [kot.table_id]
        );
      }

      return {
        success: true,
        kotNumber: kot.kot_number,
        folioId,
        chargedAmount: kot.total_amount,
        message: `Successfully charged ₹${Number(kot.total_amount).toLocaleString('en-IN')} to Room ${roomNumber} Folio under SAC 996331.`,
      };
    });
  }

  @Post('kots/:id/settle-direct')
  @RequirePermission(PERMISSIONS.BILLING_PAYMENT_COLLECT)
  async settleDirect(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { paymentMethod?: string; customerPhone?: string; customerName?: string }
  ) {
    const paymentMethod = body?.paymentMethod || 'cash';
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const kotRes = await c.query(
        `select id, kot_number, total_amount, table_id, customer_phone, guest_name from kot_orders where id = $1`,
        [id]
      );
      const kot = kotRes.rows[0];
      if (!kot) throw new NotFoundException('KOT Order not found');

      await c.query(
        `update kot_orders
         set status = 'settled', payment_status = 'paid_direct', payment_method = $1, settled_at = now(),
             customer_phone = coalesce($2, customer_phone),
             guest_name = coalesce($3, guest_name)
         where id = $4`,
        [paymentMethod, body?.customerPhone || null, body?.customerName || null, id]
      );

      if (kot.table_id) {
        await c.query(
          `update restaurant_tables
           set status = 'vacant', active_kot_id = null, is_merged = false, merged_with_table_id = null, updated_at = now()
           where id = $1 or merged_with_table_id = $1`,
          [kot.table_id]
        );
      }

      const phone = body?.customerPhone || kot.customer_phone;
      const name = body?.customerName || kot.guest_name;
      if (phone && name) {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        await c.query(
          `insert into restaurant_customers (
             tenant_id, property_id, name, phone, visit_count, total_spend
           ) values ($1, $2, $3, $4, 1, $5)
           on conflict (property_id, phone)
           do update set
             visit_count = restaurant_customers.visit_count + 1,
             total_spend = restaurant_customers.total_spend + $5,
             updated_at = now()`,
          [user.tenantId, user.propertyId, name, cleanPhone, kot.total_amount]
        );
      }

      return {
        success: true,
        kotNumber: kot.kot_number,
        settledAmount: kot.total_amount,
        paymentMethod,
      };
    });
  }
}
