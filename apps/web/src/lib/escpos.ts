// ESC/POS Command Generator for 80mm (48 col) & 58mm (32 col) Thermal Printers
import { formatDeterministicDateTime, formatDeterministicDate } from './dates';

export interface KotPrintInput {
  kotNumber: string;
  roundNumber?: number;
  orderType: string;
  outletName: string;
  tableNumber?: string | null;
  roomNumber?: string | null;
  guestName?: string | null;
  serverName?: string | null;
  specialInstructions?: string | null;
  createdAt: string;
  items: {
    itemName: string;
    quantity: number;
    foodType?: string;
    specialNotes?: string | null;
  }[];
}

export interface BillPrintInput {
  invoiceNumber: string;
  outletName: string;
  address?: string | null;
  contactPhone?: string | null;
  fssaiNumber?: string | null;
  gstin?: string | null;
  tableNumber?: string | null;
  roomNumber?: string | null;
  orderType: string;
  customerName?: string | null;
  customerPhone?: string | null;
  serverName?: string | null;
  createdAt: string;
  items: {
    itemName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  subtotal: number;
  discountAmount?: number;
  serviceChargeAmount?: number;
  cgstAmount: number;
  sgstAmount: number;
  netTotal: number;
  paymentMethod: string;
  upiId?: string | null;
}

// Low-level ESC/POS byte constants
const ESC = 0x1b;
const GS = 0x1d;

export const ESC_POS_COMMANDS = {
  INIT: [ESC, 0x40], // ESC @
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_SIZE_ON: [GS, 0x21, 0x11], // 2x width & 2x height
  DOUBLE_HEIGHT_ON: [GS, 0x21, 0x01],
  DOUBLE_WIDTH_ON: [GS, 0x21, 0x10],
  NORMAL_SIZE: [GS, 0x21, 0x00],
  INVERT_ON: [GS, 0x42, 0x01],
  INVERT_OFF: [GS, 0x42, 0x00],
  FEED_LINE: [0x0a],
  FEED_AND_CUT: [GS, 0x56, 0x42, 0x03], // GS V 'B' 3
  DRAWER_KICK_OR_BUZZER: [ESC, 0x70, 0x00, 0x19, 0xfa], // 50ms pulse on pin 2
};

export class EscPosBuilder {
  private buffer: number[] = [];
  private readonly widthCols: number;

  constructor(width: '80mm' | '58mm' = '80mm') {
    this.widthCols = width === '58mm' ? 32 : 48;
    this.buffer.push(...ESC_POS_COMMANDS.INIT);
  }

  raw(bytes: number[]): this {
    this.buffer.push(...bytes);
    return this;
  }

  text(str: string): this {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i]);
    }
    return this;
  }

  line(str = ''): this {
    this.text(str);
    this.buffer.push(0x0a);
    return this;
  }

  alignLeft(): this {
    this.buffer.push(...ESC_POS_COMMANDS.ALIGN_LEFT);
    return this;
  }

  alignCenter(): this {
    this.buffer.push(...ESC_POS_COMMANDS.ALIGN_CENTER);
    return this;
  }

  alignRight(): this {
    this.buffer.push(...ESC_POS_COMMANDS.ALIGN_RIGHT);
    return this;
  }

  bold(enable = true): this {
    this.buffer.push(...(enable ? ESC_POS_COMMANDS.BOLD_ON : ESC_POS_COMMANDS.BOLD_OFF));
    return this;
  }

  doubleSize(): this {
    this.buffer.push(...ESC_POS_COMMANDS.DOUBLE_SIZE_ON);
    return this;
  }

  normalSize(): this {
    this.buffer.push(...ESC_POS_COMMANDS.NORMAL_SIZE);
    return this;
  }

  divider(char = '-'): this {
    this.alignLeft();
    this.line(char.repeat(this.widthCols));
    return this;
  }

  doubleDivider(): this {
    return this.divider('=');
  }

  // Two columns justified (Left string and Right string)
  row2Col(left: string, right: string): this {
    const spaceCount = this.widthCols - left.length - right.length;
    if (spaceCount > 0) {
      this.line(left + ' '.repeat(spaceCount) + right);
    } else {
      this.line(left);
      this.alignRight().line(right).alignLeft();
    }
    return this;
  }

  // Monospace 3-column table: Item (remaining width), Qty (4 chars), Price/Amt (8 chars)
  rowTable3Col(col1: string, col2: string, col3: string): this {
    const qtyWidth = 5;
    const priceWidth = 9;
    const itemWidth = this.widthCols - qtyWidth - priceWidth;

    const c1 = col1.length > itemWidth ? col1.substring(0, itemWidth - 1) + '.' : col1.padEnd(itemWidth, ' ');
    const c2 = col2.padStart(qtyWidth, ' ');
    const c3 = col3.padStart(priceWidth, ' ');

    this.line(c1 + c2 + c3);
    return this;
  }

  // Monospace 4-column table for Bill: Item, Qty, Rate, Total
  rowTable4Col(item: string, qty: string, rate: string, total: string): this {
    if (this.widthCols === 32) {
      // 58mm compact
      return this.rowTable3Col(item, qty, total);
    }
    const qtyW = 5;
    const rateW = 8;
    const totalW = 9;
    const itemW = this.widthCols - qtyW - rateW - totalW;

    const cItem = item.length > itemW ? item.substring(0, itemW - 1) + '.' : item.padEnd(itemW, ' ');
    const cQty = qty.padStart(qtyW, ' ');
    const cRate = rate.padStart(rateW, ' ');
    const cTotal = total.padStart(totalW, ' ');

    this.line(cItem + cQty + cRate + cTotal);
    return this;
  }

  cut(): this {
    this.buffer.push(0x0a, 0x0a, 0x0a); // feed lines
    this.buffer.push(...ESC_POS_COMMANDS.FEED_AND_CUT);
    return this;
  }

  buzzer(): this {
    this.buffer.push(...ESC_POS_COMMANDS.DRAWER_KICK_OR_BUZZER);
    return this;
  }

  build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Generate binary ESC/POS stream for Kitchen Order Ticket (KOT)
 */
export function generateKotEscPos(data: KotPrintInput, width: '80mm' | '58mm' = '80mm'): Uint8Array {
  const p = new EscPosBuilder(width);

  // KOT Header
  p.alignCenter().bold().doubleSize().line(data.outletName.toUpperCase());
  p.normalSize().bold().line('*** KITCHEN ORDER TICKET ***');
  p.doubleSize().line(data.kotNumber);
  p.normalSize().bold(false).line(formatDeterministicDateTime(data.createdAt));
  p.divider('=');

  // Table / Room info
  p.alignLeft().bold();
  if (data.tableNumber) {
    p.doubleSize().line(`TABLE: ${data.tableNumber}`).normalSize();
  } else if (data.roomNumber) {
    p.doubleSize().line(`ROOM: ${data.roomNumber}`).normalSize();
  }
  p.row2Col(`TYPE: ${data.orderType.toUpperCase()}`, data.serverName ? `STEWARD: ${data.serverName}` : '');
  p.divider('-');

  // Item List Header
  p.bold();
  p.rowTable3Col('ITEM', 'QTY', 'STATION');
  p.bold(false).divider('-');

  // Items
  for (const item of data.items) {
    p.bold();
    p.rowTable3Col(item.itemName, `x${item.quantity}`, item.foodType === 'non_veg' ? '[NV]' : '[V]');
    p.bold(false);
    if (item.specialNotes) {
      p.line(`  * Note: ${item.specialNotes}`);
    }
  }

  p.divider('=');
  if (data.specialInstructions) {
    p.bold().line(`CHEF NOTE: ${data.specialInstructions}`).bold(false);
    p.divider('-');
  }

  // End of KOT, Buzzer and Cut
  p.alignCenter().line('--- END OF ORDER ---');
  p.buzzer();
  p.cut();

  return p.build();
}

/**
 * Generate binary ESC/POS stream for Customer Tax Invoice / Bill
 */
export function generateBillEscPos(data: BillPrintInput, width: '80mm' | '58mm' = '80mm'): Uint8Array {
  const p = new EscPosBuilder(width);

  // Bill Header
  p.alignCenter().bold().doubleSize().line(data.outletName.toUpperCase());
  p.normalSize().bold(false);
  if (data.address) p.line(data.address);
  if (data.contactPhone) p.line(`Phone: ${data.contactPhone}`);
  if (data.gstin) p.bold().line(`GSTIN: ${data.gstin}`).bold(false);
  if (data.fssaiNumber) p.line(`FSSAI Lic No: ${data.fssaiNumber}`);

  p.divider('=');
  p.bold().line('TAX INVOICE');
  p.bold(false);
  p.row2Col(`Bill No: ${data.invoiceNumber}`, formatDeterministicDate(data.createdAt));
  p.row2Col(
    data.tableNumber ? `Table: ${data.tableNumber}` : data.roomNumber ? `Room: ${data.roomNumber}` : `Type: ${data.orderType}`,
    data.serverName ? `Steward: ${data.serverName}` : ''
  );
  if (data.customerName) {
    p.row2Col(`Guest: ${data.customerName}`, data.customerPhone || '');
  }
  p.divider('-');

  // Items Table Header
  p.bold();
  if (width === '80mm') {
    p.rowTable4Col('ITEM', 'QTY', 'RATE', 'AMOUNT');
  } else {
    p.rowTable3Col('ITEM', 'QTY', 'AMOUNT');
  }
  p.bold(false).divider('-');

  // Items
  for (const item of data.items) {
    if (width === '80mm') {
      p.rowTable4Col(
        item.itemName,
        String(item.quantity),
        item.unitPrice.toFixed(2),
        item.totalPrice.toFixed(2)
      );
    } else {
      p.rowTable3Col(item.itemName, String(item.quantity), item.totalPrice.toFixed(2));
    }
  }

  p.divider('-');

  // Financials
  p.alignRight();
  p.row2Col('Sub Total:', `INR ${data.subtotal.toFixed(2)}`);
  if (data.discountAmount && data.discountAmount > 0) {
    p.row2Col('Discount:', `-INR ${data.discountAmount.toFixed(2)}`);
  }
  if (data.serviceChargeAmount && data.serviceChargeAmount > 0) {
    p.row2Col('Service Charge:', `INR ${data.serviceChargeAmount.toFixed(2)}`);
  }
  p.row2Col('CGST (2.5%):', `INR ${data.cgstAmount.toFixed(2)}`);
  p.row2Col('SGST (2.5%):', `INR ${data.sgstAmount.toFixed(2)}`);
  p.divider('=');

  p.bold().doubleSize();
  p.row2Col('NET TOTAL:', `INR ${data.netTotal.toFixed(2)}`);
  p.normalSize().bold(false);
  p.row2Col('Payment Mode:', data.paymentMethod.toUpperCase());
  p.divider('-');

  // Footer & UPI QR Note
  p.alignCenter();
  if (data.upiId) {
    p.bold().line(`Pay instantly via UPI: ${data.upiId}`).bold(false);
  }
  p.line('Thank you for dining with us!');
  p.line('Please visit again.');
  p.line('--- Powered by Antigravity ERP ---');

  p.cut();
  return p.build();
}
