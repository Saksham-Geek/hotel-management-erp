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
  createRestaurantTableSchema,
  updateRestaurantTableSchema,
  createMenuCategorySchema,
  createMenuItemSchema,
  createRestaurantOutletSchema,
  updateAggregatorOrderStatusSchema,
  toggleMenuItemStockSchema,
  closeShiftSchema,
  simulateAggregatorOrderSchema,
  type CreateKotOrderInput,
  type UpdateKotStatusInput,
  type ChargeKotToRoomInput,
  type PunchKotRoundInput,
  type MergeTablesInput,
  type TransferTableInput,
  type AdjustKotBillInput,
  type SplitKotBillInput,
  type SettleKotSplitInput,
  type CreateRestaurantTableInput,
  type UpdateRestaurantTableInput,
  type CreateMenuCategoryInput,
  type CreateMenuItemInput,
  type CreateRestaurantOutletInput,
  type UpdateAggregatorOrderStatusInput,
  type ToggleMenuItemStockInput,
  type CloseShiftInput,
  type SimulateAggregatorOrderInput,
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
         where property_id = $1
         order by (case when outlet_type = 'dine_in' then 0 else 1 end), name asc`,
        [user.propertyId]
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
         where t.property_id = $1 and ($2::uuid is null or t.outlet_id = $2::uuid)
         order by t.section asc, t.table_number asc`,
        [user.propertyId, outletId || null]
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
         where property_id = $1 and is_active = true
         order by sort_order asc, name asc`,
        [user.propertyId]
      );

      const itemRes = await c.query(
        `select id, category_id as "categoryId", name, item_code as "itemCode",
                description, price, food_type as "foodType", sac_code as "sacCode",
                gst_rate as "gstRate", is_available as "isAvailable",
                is_out_of_stock as "isOutOfStock",
                kitchen_station as "kitchenStation",
                channel_availability as "channelAvailability"
         from menu_items
         where property_id = $1 and is_available = true
         order by item_code asc`,
        [user.propertyId]
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
                k.aggregator_brand as "aggregatorBrand",
                k.aggregator_order_id as "aggregatorOrderId",
                k.rider_name as "riderName",
                k.rider_phone as "riderPhone",
                k.rider_status as "riderStatus",
                k.preparation_time_minutes as "preparationTimeMinutes",
                k.aggregator_status as "aggregatorStatus",
                k.created_at as "createdAt", k.prepared_at as "preparedAt", k.served_at as "servedAt",
                o.name as "outletName",
                t.table_number as "tableNumber",
                t.section as "tableSection",
                r.number as "roomNumber"
         from kot_orders k
         join restaurant_outlets o on o.id = k.outlet_id
         left join restaurant_tables t on t.id = k.table_id
         left join rooms r on r.id = k.room_id
         where k.property_id = $1 and k.status not in ('settled', 'cancelled')
         order by k.created_at desc
         limit 80`,
        [user.propertyId]
      );

      if (ordersRes.rows.length === 0) return [];

      const orderIds = ordersRes.rows.map((o: any) => o.id);
      const itemsRes = await c.query(
        `select i.id, i.order_id as "orderId", i.menu_item_id as "menuItemId",
                i.item_name as "itemName", i.quantity, i.unit_price as "unitPrice",
                i.gst_rate as "gstRate", i.food_type as "foodType",
                i.special_notes as "specialNotes", i.status,
                coalesce(m.kitchen_station, 'main_kitchen') as "kitchenStation"
         from kot_order_items i
         left join menu_items m on m.id = i.menu_item_id
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

  // -------------------------------------------------------------
  // Table Management Endpoints
  // -------------------------------------------------------------

  @Post('tables')
  @RequirePermission(PERMISSIONS.RESTAURANT_MANAGE)
  async createTable(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = createRestaurantTableSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ issues: parsed.error.flatten() });
    }
    const input: CreateRestaurantTableInput = parsed.data;

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const outletCheck = await c.query(
        `select id, name from restaurant_outlets where id = $1 and property_id = $2`,
        [input.outletId, user.propertyId]
      );
      if (outletCheck.rows.length === 0) {
        throw new NotFoundException('Selected dining outlet not found in this property');
      }

      const dupCheck = await c.query(
        `select id from restaurant_tables where outlet_id = $1 and lower(table_number) = lower($2) and property_id = $3`,
        [input.outletId, input.tableNumber, user.propertyId]
      );
      if (dupCheck.rows.length > 0) {
        throw new BadRequestException(`Table number "${input.tableNumber}" already exists in ${outletCheck.rows[0].name}`);
      }

      const res = await c.query(
        `insert into restaurant_tables (
           tenant_id, property_id, outlet_id, table_number, capacity, section, status
         ) values ($1, $2, $3, $4, $5, $6, 'vacant')
         returning id, outlet_id as "outletId", table_number as "tableNumber", capacity, status, section`,
        [user.tenantId, user.propertyId, input.outletId, input.tableNumber, input.capacity, input.section]
      );

      return {
        success: true,
        table: res.rows[0],
        message: `Table ${input.tableNumber} (${input.section}, ${input.capacity} covers) added successfully to ${outletCheck.rows[0].name}.`,
      };
    });
  }

  @Patch('tables/:id')
  @RequirePermission(PERMISSIONS.RESTAURANT_MANAGE)
  async updateTable(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    const parsed = updateRestaurantTableSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ issues: parsed.error.flatten() });
    }
    const input: UpdateRestaurantTableInput = parsed.data;

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const existing = await c.query(
        `select id, table_number, status, active_kot_id from restaurant_tables where id = $1 and property_id = $2`,
        [id, user.propertyId]
      );
      if (existing.rows.length === 0) throw new NotFoundException('Table not found');

      const res = await c.query(
        `update restaurant_tables
         set table_number = coalesce($1, table_number),
             capacity = coalesce($2, capacity),
             section = coalesce($3, section),
             status = coalesce($4, status),
             updated_at = now()
         where id = $5 and property_id = $6
         returning id, outlet_id as "outletId", table_number as "tableNumber", capacity, status, section`,
        [input.tableNumber ?? null, input.capacity ?? null, input.section ?? null, input.status ?? null, id, user.propertyId]
      );

      return { success: true, table: res.rows[0] };
    });
  }

  @Delete('tables/:id')
  @RequirePermission(PERMISSIONS.RESTAURANT_MANAGE)
  async deleteTable(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const existing = await c.query(
        `select id, table_number, status, active_kot_id from restaurant_tables where id = $1 and property_id = $2`,
        [id, user.propertyId]
      );
      if (existing.rows.length === 0) throw new NotFoundException('Table not found');

      const table = existing.rows[0];
      if (table.active_kot_id || table.status !== 'vacant') {
        throw new BadRequestException(`Cannot remove table ${table.table_number} because it has an active dining session or pending KOT.`);
      }

      await c.query(`delete from restaurant_tables where id = $1 and property_id = $2`, [id, user.propertyId]);

      return {
        success: true,
        message: `Table ${table.table_number} removed successfully.`,
      };
    });
  }

  // -------------------------------------------------------------
  // Menu Category & Item Management
  // -------------------------------------------------------------

  @Post('menu/categories')
  @RequirePermission(PERMISSIONS.RESTAURANT_MANAGE)
  async createCategory(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = createMenuCategorySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ issues: parsed.error.flatten() });
    }
    const input: CreateMenuCategoryInput = parsed.data;

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const res = await c.query(
        `insert into menu_categories (
           tenant_id, property_id, name, sort_order, is_active
         ) values ($1, $2, $3, $4, true)
         returning id, name, sort_order as "sortOrder", is_active as "isActive"`,
        [user.tenantId, user.propertyId, input.name, input.sortOrder]
      );

      return {
        success: true,
        category: res.rows[0],
        message: `Category "${input.name}" created successfully.`,
      };
    });
  }

  @Post('menu/items')
  @RequirePermission(PERMISSIONS.RESTAURANT_MANAGE)
  async createMenuItem(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = createMenuItemSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ issues: parsed.error.flatten() });
    }
    const input: CreateMenuItemInput = parsed.data;

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const catCheck = await c.query(
        `select id, name from menu_categories where id = $1 and property_id = $2`,
        [input.categoryId, user.propertyId]
      );
      if (catCheck.rows.length === 0) throw new NotFoundException('Menu category not found in this property');

      let itemCode = input.itemCode;
      if (!itemCode) {
        const countRes = await c.query(
          `select count(*)::int as count from menu_items where property_id = $1`,
          [user.propertyId]
        );
        itemCode = `DISH-${(countRes.rows[0].count + 1).toString().padStart(3, '0')}`;
      }

      const res = await c.query(
        `insert into menu_items (
           tenant_id, property_id, category_id, name, item_code, description, price, food_type, sac_code, gst_rate, is_available
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
         returning id, category_id as "categoryId", name, item_code as "itemCode",
                   description, price, food_type as "foodType", sac_code as "sacCode",
                   gst_rate as "gstRate", is_available as "isAvailable"`,
        [
          user.tenantId,
          user.propertyId,
          input.categoryId,
          input.name,
          itemCode,
          input.description || null,
          input.price,
          input.foodType,
          input.sacCode || '996331',
          input.gstRate ?? 5.0,
        ]
      );

      return {
        success: true,
        item: res.rows[0],
        message: `Dish "${input.name}" added to menu at ₹${Number(input.price).toFixed(2)}.`,
      };
    });
  }

  // -------------------------------------------------------------
  // Outlet Management
  // -------------------------------------------------------------

  @Post('outlets')
  @RequirePermission(PERMISSIONS.RESTAURANT_MANAGE)
  async createOutlet(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = createRestaurantOutletSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ issues: parsed.error.flatten() });
    }
    const input: CreateRestaurantOutletInput = parsed.data;

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const res = await c.query(
        `insert into restaurant_outlets (
           tenant_id, property_id, name, code, outlet_type, service_charge_percent,
           fssai_number, gstin, is_standalone, contact_phone, address, is_active
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
         returning id, name, code, outlet_type as "outletType", service_charge_percent as "serviceChargePercent",
                   fssai_number as "fssaiNumber", gstin, is_standalone as "isStandalone",
                   contact_phone as "contactPhone", address, is_active as "isActive"`,
        [
          user.tenantId,
          user.propertyId,
          input.name,
          input.code,
          input.outletType,
          input.serviceChargePercent,
          input.fssaiNumber || null,
          input.gstin || null,
          input.isStandalone,
          input.contactPhone || null,
          input.address || null,
        ]
      );

      return {
        success: true,
        outlet: res.rows[0],
        message: `Dining outlet "${input.name}" created successfully.`,
      };
    });
  }

  // -------------------------------------------------------------
  // Live Item 86'ing & Stock Availability
  // -------------------------------------------------------------

  @Patch('menu/items/:id/toggle-stock')
  @RequirePermission(PERMISSIONS.RESTAURANT_MANAGE)
  async toggleItemStock(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = toggleMenuItemStockSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ issues: parsed.error.flatten() });
    }
    const input: ToggleMenuItemStockInput = parsed.data;

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const res = await c.query(
        `update menu_items
         set is_out_of_stock = $1,
             kitchen_station = coalesce($2, kitchen_station),
             updated_at = now()
         where id = $3 and property_id = $4
         returning id, name, is_out_of_stock as "isOutOfStock", kitchen_station as "kitchenStation"`,
        [input.isOutOfStock, input.kitchenStation || null, id, user.propertyId]
      );
      if (res.rows.length === 0) throw new NotFoundException('Menu item not found');

      return {
        success: true,
        item: res.rows[0],
        message: `${res.rows[0].name} marked as ${input.isOutOfStock ? '86 (Out of Stock)' : 'In Stock'}.`,
      };
    });
  }

  // -------------------------------------------------------------
  // Online Delivery Aggregators Hub (Swiggy & Zomato)
  // -------------------------------------------------------------

  @Get('aggregators/orders')
  @RequirePermission(PERMISSIONS.RESTAURANT_VIEW)
  async getAggregatorOrders(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const ordersRes = await c.query(
        `select k.id, k.kot_number as "kotNumber", k.aggregator_brand as "aggregatorBrand",
                k.aggregator_order_id as "aggregatorOrderId", k.aggregator_status as "aggregatorStatus",
                k.preparation_time_minutes as "preparationTimeMinutes",
                k.rider_name as "riderName", k.rider_phone as "riderPhone", k.rider_status as "riderStatus",
                k.guest_name as "customerName", k.customer_phone as "customerPhone",
                k.subtotal, k.tax_amount as "taxAmount", k.total_amount as "totalAmount",
                k.special_instructions as "specialInstructions",
                k.created_at as "createdAt", k.status,
                o.name as "outletName"
         from kot_orders k
         join restaurant_outlets o on o.id = k.outlet_id
         where k.property_id = $1 and k.aggregator_brand in ('swiggy', 'zomato', 'direct_web')
         order by k.created_at desc
         limit 60`,
        [user.propertyId]
      );

      if (ordersRes.rows.length === 0) return [];

      const orderIds = ordersRes.rows.map((o: any) => o.id);
      const itemsRes = await c.query(
        `select i.id, i.order_id as "orderId", i.item_name as "itemName",
                i.quantity, i.unit_price as "unitPrice", i.food_type as "foodType",
                i.special_notes as "specialNotes"
         from kot_order_items i
         where i.order_id = any($1::uuid[])`,
        [orderIds]
      );

      return ordersRes.rows.map((o: any) => ({
        ...o,
        items: itemsRes.rows.filter((it: any) => it.orderId === o.id),
      }));
    });
  }

  @Patch('aggregators/orders/:id/status')
  @RequirePermission(PERMISSIONS.RESTAURANT_ORDER)
  async updateAggregatorOrderStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const parsed = updateAggregatorOrderStatusSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ issues: parsed.error.flatten() });
    }
    const input: UpdateAggregatorOrderStatusInput = parsed.data;

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      let kotStatus = 'pending';
      if (input.aggregatorStatus === 'accepted') kotStatus = 'preparing';
      if (input.aggregatorStatus === 'food_ready') kotStatus = 'ready';
      if (input.aggregatorStatus === 'dispatched') kotStatus = 'served';
      if (input.aggregatorStatus === 'cancelled') kotStatus = 'cancelled';

      const res = await c.query(
        `update kot_orders
         set aggregator_status = $1,
             status = $2,
             preparation_time_minutes = coalesce($3, preparation_time_minutes),
             rider_name = coalesce($4, rider_name),
             rider_phone = coalesce($5, rider_phone),
             rider_status = coalesce($6, rider_status),
             prepared_at = (case when $1 = 'accepted' then now() else prepared_at end),
             served_at = (case when $1 = 'dispatched' then now() else served_at end),
             updated_at = now()
         where id = $7 and property_id = $8
         returning id, kot_number as "kotNumber", aggregator_brand as "aggregatorBrand",
                   aggregator_order_id as "aggregatorOrderId", aggregator_status as "aggregatorStatus",
                   status`,
        [
          input.aggregatorStatus,
          kotStatus,
          input.preparationTimeMinutes ?? null,
          input.riderName ?? null,
          input.riderPhone ?? null,
          input.riderStatus ?? null,
          id,
          user.propertyId,
        ]
      );

      if (res.rows.length === 0) throw new NotFoundException('Aggregator order not found');

      return {
        success: true,
        order: res.rows[0],
        message: `Order ${res.rows[0].aggregatorOrderId || res.rows[0].kotNumber} updated to ${input.aggregatorStatus.toUpperCase()}.`,
      };
    });
  }

  @Post('aggregators/simulate')
  @RequirePermission(PERMISSIONS.RESTAURANT_ORDER)
  async simulateAggregatorOrder(
    @CurrentUser() user: AuthUser,
    @Body() body: unknown
  ) {
    const parsed = simulateAggregatorOrderSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ issues: parsed.error.flatten() });
    }
    const input: SimulateAggregatorOrderInput = parsed.data;

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const countRes = await c.query(
        `select count(*)::int as count from kot_orders where property_id = $1`,
        [user.propertyId]
      );
      const seq = countRes.rows[0].count + 1;
      const kotNumber = `KOT-DEL-${seq.toString().padStart(4, '0')}`;
      const randomId = Math.floor(10000 + Math.random() * 90000);
      const aggregatorOrderId = `${input.brand.toUpperCase()}-${randomId}`;

      let subtotal = 0;
      for (const item of input.items) {
        subtotal += Number(item.unitPrice) * item.quantity;
      }
      const taxAmount = Math.round((subtotal * 0.05) * 100) / 100;
      const totalAmount = subtotal + taxAmount;

      const orderRes = await c.query(
        `insert into kot_orders (
           tenant_id, property_id, outlet_id, kot_number, order_type,
           aggregator_brand, aggregator_order_id, aggregator_status,
           rider_name, rider_phone, rider_status, preparation_time_minutes,
           guest_name, customer_phone, subtotal, tax_amount, total_amount,
           status, payment_status, payment_method, special_instructions
         ) values (
           $1, $2, $3, $4, 'delivery',
           $5, $6, 'incoming',
           'Rahul Sharma (Delivery Captain)', '+91 98200 88712', 'assigning', 20,
           $7, $8, $9, $10, $11,
           'pending', 'paid_direct', $5, $12
         ) returning id, kot_number as "kotNumber", aggregator_order_id as "aggregatorOrderId"`,
        [
          user.tenantId,
          user.propertyId,
          input.outletId,
          kotNumber,
          input.brand,
          aggregatorOrderId,
          input.customerName,
          input.customerPhone,
          subtotal,
          taxAmount,
          totalAmount,
          `Delivery to: ${input.deliveryAddress}`,
        ]
      );

      const orderId = orderRes.rows[0].id;
      for (const item of input.items) {
        await c.query(
          `insert into kot_order_items (
             tenant_id, property_id, order_id, menu_item_id, item_name,
             quantity, unit_price, gst_rate, food_type, special_notes, status
           ) values ($1, $2, $3, $4, $5, $6, $7, 5.00, $8, $9, 'pending')`,
          [
            user.tenantId,
            user.propertyId,
            orderId,
            item.menuItemId || null,
            item.itemName,
            item.quantity,
            item.unitPrice,
            item.foodType,
            item.specialNotes || null,
          ]
        );
      }

      return {
        success: true,
        orderId,
        kotNumber,
        aggregatorOrderId,
        totalAmount,
        message: `Incoming ${input.brand.toUpperCase()} Order ${aggregatorOrderId} (₹${totalAmount}) received! Kitchen alert triggered.`,
      };
    });
  }

  // -------------------------------------------------------------
  // Shift Management & Cashier Day-End Z-Report
  // -------------------------------------------------------------

  @Get('shifts/active')
  @RequirePermission(PERMISSIONS.RESTAURANT_VIEW)
  async getActiveShift(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const res = await c.query(
        `select s.id, s.outlet_id as "outletId", s.shift_name as "shiftName",
                s.opened_by as "openedBy", s.opening_cash as "openingCash",
                s.status, s.opened_at as "openedAt",
                o.name as "outletName"
         from restaurant_shifts s
         join restaurant_outlets o on o.id = s.outlet_id
         where s.property_id = $1 and s.status = 'open'
         order by s.opened_at desc
         limit 1`,
        [user.propertyId]
      );
      return res.rows[0] ?? null;
    });
  }

  @Post('shifts/open')
  @RequirePermission(PERMISSIONS.BILLING_PAYMENT_COLLECT)
  async openShift(
    @CurrentUser() user: AuthUser,
    @Body() body: { outletId: string; shiftName?: string; openingCash?: number }
  ) {
    const openingCash = Number(body?.openingCash) || 0;
    const shiftName = body?.shiftName || 'Day Shift';

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const existing = await c.query(
        `select id from restaurant_shifts where property_id = $1 and outlet_id = $2 and status = 'open'`,
        [user.propertyId, body.outletId]
      );
      if (existing.rows.length > 0) {
        throw new BadRequestException('A cashier shift is already active for this outlet. Close the current shift first.');
      }

      const res = await c.query(
        `insert into restaurant_shifts (
           tenant_id, property_id, outlet_id, shift_name, opened_by, opening_cash, status
         ) values ($1, $2, $3, $4, $5, $6, 'open')
         returning id, shift_name as "shiftName", opening_cash as "openingCash", status, opened_at as "openedAt"`,
        [user.tenantId, user.propertyId, body.outletId, shiftName, user.id, openingCash]
      );

      return {
        success: true,
        shift: res.rows[0],
        message: `Cashier shift "${shiftName}" opened with ₹${openingCash} opening float.`,
      };
    });
  }

  @Post('shifts/close')
  @RequirePermission(PERMISSIONS.BILLING_PAYMENT_COLLECT)
  async closeShift(
    @CurrentUser() user: AuthUser,
    @Body() body: unknown
  ) {
    const parsed = closeShiftSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ issues: parsed.error.flatten() });
    }
    const input: CloseShiftInput = parsed.data;

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const shiftRes = await c.query(
        `select s.id, s.outlet_id, s.opening_cash, s.opened_at, s.shift_name, o.name as outlet_name
         from restaurant_shifts s
         join restaurant_outlets o on o.id = s.outlet_id
         where s.id = $1 and s.property_id = $2 and s.status = 'open'`,
        [input.shiftId, user.propertyId]
      );
      if (shiftRes.rows.length === 0) {
        throw new NotFoundException('Active shift not found or already closed');
      }
      const shift = shiftRes.rows[0];

      // Aggregate all settled orders during this shift window
      const totalsRes = await c.query(
        `select
           count(*)::int as kots_count,
           coalesce(sum(case when payment_method = 'cash' then total_amount else 0 end), 0) as cash_total,
           coalesce(sum(case when payment_method = 'upi' then total_amount else 0 end), 0) as upi_total,
           coalesce(sum(case when payment_method = 'pos_machine' then total_amount else 0 end), 0) as card_total,
           coalesce(sum(case when payment_method = 'swiggy' then total_amount else 0 end), 0) as swiggy_total,
           coalesce(sum(case when payment_method = 'zomato' then total_amount else 0 end), 0) as zomato_total,
           coalesce(sum(case when payment_method = 'room_charge' then total_amount else 0 end), 0) as room_total,
           coalesce(sum(total_amount), 0) as net_sales
         from kot_orders
         where property_id = $1 and outlet_id = $2
           and settled_at >= $3 and status = 'settled'`,
        [user.propertyId, shift.outlet_id, shift.opened_at]
      );

      const t = totalsRes.rows[0];
      const openingCash = Number(shift.opening_cash);
      const cashSales = Number(t.cash_total);
      const expectedCash = openingCash + cashSales;
      const closingCash = Number(input.closingCash);
      const cashVariance = closingCash - expectedCash;

      await c.query(
        `update restaurant_shifts
         set status = 'closed',
             closed_by = $1,
             closed_at = now(),
             closing_cash = $2,
             expected_cash = $3,
             cash_variance = $4,
             total_upi = $5,
             total_card = $6,
             total_swiggy = $7,
             total_zomato = $8,
             total_room_charges = $9,
             total_sales = $10,
             total_kots_count = $11,
             notes = $12
         where id = $13`,
        [
          user.id,
          closingCash,
          expectedCash,
          cashVariance,
          Number(t.upi_total),
          Number(t.card_total),
          Number(t.swiggy_total),
          Number(t.zomato_total),
          Number(t.room_total),
          Number(t.net_sales),
          Number(t.kots_count),
          input.notes || null,
          input.shiftId,
        ]
      );

      return {
        success: true,
        zReport: {
          shiftId: shift.id,
          outletName: shift.outlet_name,
          shiftName: shift.shift_name,
          closedBy: user.id,
          openedAt: shift.opened_at,
          closedAt: new Date().toISOString(),
          openingCash,
          cashSales,
          closingCash,
          expectedCash,
          cashVariance,
          totalUpi: Number(t.upi_total),
          totalCard: Number(t.card_total),
          totalSwiggy: Number(t.swiggy_total),
          totalZomato: Number(t.zomato_total),
          totalRoomCharges: Number(t.room_total),
          totalSales: Number(t.net_sales),
          kotsCount: Number(t.kots_count),
        },
        message: `Shift closed. Z-Report generated with variance of ₹${cashVariance.toFixed(2)}.`,
      };
    });
  }
}
