import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  FEATURES,
  PERMISSIONS,
  createKotOrderSchema,
  updateKotStatusSchema,
  chargeKotToRoomSchema,
  type CreateKotOrderInput,
  type UpdateKotStatusInput,
  type ChargeKotToRoomInput,
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
        `select id, name, code, outlet_type as "outletType", is_active as "isActive"
         from restaurant_outlets
         order by name asc`
      );
      return res.rows;
    });
  }

  @Get('tables')
  @RequirePermission(PERMISSIONS.RESTAURANT_VIEW)
  async getTables(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const res = await c.query(
        `select t.id, t.outlet_id as "outletId", t.table_number as "tableNumber",
                t.capacity, t.status, t.active_kot_id as "activeKotId",
                o.name as "outletName",
                k.kot_number as "activeKotNumber",
                k.total_amount as "activeTotalAmount",
                k.guest_name as "activeGuestName",
                k.created_at as "activeOrderTime"
         from restaurant_tables t
         join restaurant_outlets o on o.id = t.outlet_id
         left join kot_orders k on k.id = t.active_kot_id
         order by t.table_number asc`
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
        `select k.id, k.kot_number as "kotNumber", k.order_type as "orderType",
                k.status, k.payment_status as "paymentStatus",
                k.subtotal, k.tax_amount as "taxAmount", k.total_amount as "totalAmount",
                k.special_instructions as "specialInstructions",
                k.guest_name as "guestName", k.server_name as "serverName",
                k.created_at as "createdAt", k.prepared_at as "preparedAt", k.served_at as "servedAt",
                o.name as "outletName",
                t.table_number as "tableNumber",
                r.number as "roomNumber"
         from kot_orders k
         join restaurant_outlets o on o.id = k.outlet_id
         left join restaurant_tables t on t.id = k.table_id
         left join rooms r on r.id = k.room_id
         where k.status not in ('settled', 'cancelled')
         order by k.created_at desc
         limit 50`
      );

      const itemsRes = await c.query(
        `select i.id, i.order_id as "orderId", i.menu_item_id as "menuItemId",
                i.item_name as "itemName", i.quantity, i.unit_price as "unitPrice",
                i.gst_rate as "gstRate", i.food_type as "foodType",
                i.special_notes as "specialNotes", i.status
         from kot_order_items i
         where i.order_id = any($1::uuid[])`,
        [ordersRes.rows.map((o: any) => o.id)]
      );

      return ordersRes.rows.map((o: any) => ({
        ...o,
        items: itemsRes.rows.filter((i: any) => i.orderId === o.id),
      }));
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
      // Find room id if roomNumber supplied
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

      // Generate next KOT number
      const countRes = await c.query(`select count(*)::int as count from kot_orders`);
      const nextNum = (countRes.rows[0]?.count ?? 0) + 101;
      const kotNumber = `KOT-${nextNum}`;

      // Calculate totals
      let subtotal = 0;
      let taxAmount = 0;
      for (const item of input.items) {
        const lineSubtotal = item.quantity * Number(item.unitPrice);
        const lineTax = (lineSubtotal * (Number(item.gstRate) || 5.0)) / 100;
        subtotal += lineSubtotal;
        taxAmount += lineTax;
      }
      const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

      // Insert KOT order
      const orderRes = await c.query(
        `insert into kot_orders (
           tenant_id, property_id, outlet_id, table_id, reservation_id, room_id,
           kot_number, order_type, status, subtotal, tax_amount, total_amount,
           special_instructions, guest_name, server_name
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11, $12, $13, $14)
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
          input.guestName ?? (input.orderType === 'room_service' ? `Room ${input.roomNumber}` : 'Dine-In Guest'),
          input.serverName ?? 'Floor Captain',
        ]
      );
      const newOrder = orderRes.rows[0];

      // Insert line items
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

      // If attached to a dining table, mark table occupied and link active KOT
      if (input.tableId) {
        await c.query(
          `update restaurant_tables
           set status = 'occupied', active_kot_id = $1, updated_at = now()
           where id = $2`,
          [newOrder.id, input.tableId]
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

      // Also update line items
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
      // 1. Fetch KOT Order
      const kotRes = await c.query(
        `select id, kot_number, subtotal, tax_amount, total_amount, table_id
         from kot_orders
         where id = $1`,
        [id]
      );
      const kot = kotRes.rows[0];
      if (!kot) throw new NotFoundException('KOT Order not found');

      // 2. Fetch reservation folio
      const folioRes = await c.query(
        `select id from reservation_folios
         where reservation_id = $1 and status = 'open' limit 1`,
        [reservationId]
      );
      let folioId = folioRes.rows[0]?.id;
      if (!folioId) {
        // Create an open folio if none exists
        const newFolio = await c.query(
          `insert into reservation_folios (tenant_id, property_id, reservation_id, status)
           values ($1, $2, $3, 'open') returning id`,
          [user.tenantId, user.propertyId, reservationId]
        );
        folioId = newFolio.rows[0].id;
      }

      // 3. Post F&B dining line item to room folio with 5% GST (SAC 996331)
      const description = `F&B Dining: ${kot.kot_number} (Room ${roomNumber})`;
      await c.query(
        `insert into folio_items (
           tenant_id, property_id, folio_id, description, amount, tax_rate, tax_amount, total, sac_code
         ) values ($1, $2, $3, $4, $5, 5.00, $6, $7, '996331')`,
        [user.tenantId, user.propertyId, folioId, description, kot.subtotal, kot.tax_amount, kot.total_amount]
      );

      // 4. Update KOT order as charged to room and settled
      await c.query(
        `update kot_orders
         set status = 'settled', payment_status = 'charged_to_room',
             reservation_id = $1, folio_id = $2, settled_at = now()
         where id = $3`,
        [reservationId, folioId, id]
      );

      // 5. If table attached, free up table to vacant
      if (kot.table_id) {
        await c.query(
          `update restaurant_tables
           set status = 'vacant', active_kot_id = null, updated_at = now()
           where id = $1`,
          [kot.table_id]
        );
      }

      return {
        success: true,
        kotNumber: kot.kot_number,
        folioId,
        chargedAmount: kot.total_amount,
        message: `Successfully charged ₹${Number(kot.total_amount).toLocaleString('en-IN')} to Room ${roomNumber} Folio.`,
      };
    });
  }

  @Post('kots/:id/settle-direct')
  @RequirePermission(PERMISSIONS.BILLING_PAYMENT_COLLECT)
  async settleDirect(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const kotRes = await c.query(
        `select id, kot_number, total_amount, table_id from kot_orders where id = $1`,
        [id]
      );
      const kot = kotRes.rows[0];
      if (!kot) throw new NotFoundException('KOT Order not found');

      await c.query(
        `update kot_orders
         set status = 'settled', payment_status = 'paid_direct', settled_at = now()
         where id = $1`,
        [id]
      );

      if (kot.table_id) {
        await c.query(
          `update restaurant_tables
           set status = 'vacant', active_kot_id = null, updated_at = now()
           where id = $1`,
          [kot.table_id]
        );
      }

      return {
        success: true,
        kotNumber: kot.kot_number,
        settledAmount: kot.total_amount,
      };
    });
  }
}
