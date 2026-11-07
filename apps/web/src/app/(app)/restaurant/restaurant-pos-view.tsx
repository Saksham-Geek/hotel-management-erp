'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CustomDropdown } from '@/components/dropdown';
import { KotPrintModal, type KotPrintData } from './kot-print-modal';
import { BillPrintModal, type BillPrintData } from './bill-print-modal';
import {
  createKotOrderAction,
  updateKotStatusAction,
  chargeKotToRoomAction,
  settleKotDirectAction,
  punchKotRoundAction,
  mergeTablesAction,
  transferTableAction,
  adjustKotBillAction,
  splitKotBillAction,
  settleKotSplitAction,
  lookupCustomerAction,
  createRestaurantTableAction,
  updateRestaurantTableAction,
  deleteRestaurantTableAction,
  createMenuCategoryAction,
  createMenuItemAction,
  toggleMenuItemStockAction,
  updateAggregatorOrderStatusAction,
  simulateAggregatorOrderAction,
  updateOutletAggregatorConfigAction,
  openShiftAction,
  closeShiftAction,
} from './actions';

export interface OutletDto {
  id: string;
  name: string;
  code: string;
  outletType: string;
  isActive: boolean;
  fssaiNumber?: string | null;
  gstin?: string | null;
  serviceChargePercent?: number | string | null;
  isStandalone?: boolean;
  contactPhone?: string | null;
  address?: string | null;
  swiggyRid?: string | null;
  swiggyApiKey?: string | null;
  swiggyAutoAccept?: boolean;
  swiggyDefaultPrepMinutes?: number;
  zomatoResId?: string | null;
  zomatoApiKey?: string | null;
  zomatoAutoAccept?: boolean;
  zomatoDefaultPrepMinutes?: number;
  aggregatorWebhookToken?: string | null;
}

export interface TableDto {
  id: string;
  outletId: string;
  tableNumber: string;
  capacity: number;
  status: 'vacant' | 'occupied' | 'billed';
  section: string;
  isMerged?: boolean;
  mergedWithTableId?: string | null;
  activeKotId?: string | null;
  outletName: string;
  activeKotNumber?: string | null;
  activeRoundNumber?: number | null;
  activeTotalAmount?: number | null;
  activeGuestName?: string | null;
  activeOrderTime?: string | null;
}

export interface MenuItemDto {
  id: string;
  categoryId: string;
  name: string;
  itemCode: string;
  description: string | null;
  price: string | number;
  foodType: 'veg' | 'non_veg' | 'egg';
  sacCode: string;
  gstRate: string | number;
  isAvailable: boolean;
  isOutOfStock?: boolean;
  kitchenStation?: 'tandoor' | 'main_kitchen' | 'bar' | 'pantry' | 'bakery';
  channelAvailability?: 'all' | 'dine_in_only' | 'delivery_only';
}

export interface MenuCategoryDto {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItemDto[];
}

export interface KotOrderDto {
  id: string;
  kotNumber: string;
  roundNumber?: number;
  orderType: 'dine_in' | 'room_service' | 'takeaway' | 'delivery' | 'aggregator';
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'settled' | 'cancelled';
  paymentStatus: 'unpaid' | 'charged_to_room' | 'paid_direct';
  subtotal: string | number;
  taxAmount: string | number;
  totalAmount: string | number;
  discountType?: 'none' | 'percent' | 'flat';
  discountValue?: number;
  discountAmount?: number;
  serviceChargeAmount?: number;
  specialInstructions: string | null;
  guestName: string | null;
  customerPhone?: string | null;
  serverName: string | null;
  aggregatorBrand?: 'swiggy' | 'zomato' | 'direct_web' | 'none';
  aggregatorOrderId?: string | null;
  riderName?: string | null;
  riderPhone?: string | null;
  riderStatus?: 'assigning' | 'at_restaurant' | 'picked_up' | 'delivered' | null;
  preparationTimeMinutes?: number | null;
  aggregatorStatus?: 'incoming' | 'accepted' | 'food_ready' | 'dispatched' | 'cancelled' | 'none';
  createdAt: string;
  outletName: string;
  tableNumber: string | null;
  tableSection?: string | null;
  roomNumber: string | null;
  items: {
    id: string;
    itemName: string;
    quantity: number;
    unitPrice: string | number;
    gstRate: string | number;
    foodType: string;
    specialNotes: string | null;
    status: string;
    kitchenStation?: string;
  }[];
  splits?: {
    id: string;
    splitNumber: number;
    amount: number;
    paymentMethod: string;
    isSettled: boolean;
    roomNumber?: string;
    paymentReference?: string;
  }[];
}

export interface ShiftDto {
  id: string;
  outletId: string;
  shiftName: string;
  openedBy: string;
  openingCash: number | string;
  status: 'open' | 'closed';
  openedAt: string;
  outletName?: string;
}

export interface CheckedInRoomDto {
  id: string;
  number: string;
  guestName: string;
  reservationId: string;
}

export function RestaurantPosView({
  outlets,
  tables,
  categories,
  kots,
  checkedInRooms,
  initialShift,
}: {
  outlets: OutletDto[];
  tables: TableDto[];
  categories: MenuCategoryDto[];
  kots: KotOrderDto[];
  checkedInRooms: CheckedInRoomDto[];
  initialShift?: ShiftDto | null;
}) {
  const router = useRouter();

  // Operating Mode: Hotel Integrated vs Standalone Restaurant
  const [operatingMode, setOperatingMode] = useState<'hotel' | 'standalone'>('hotel');

  // Navigation Tabs: Floor Plan, Touch POS, Swiggy/Zomato Aggregators, Kitchen KDS, Cashier Shifts, Settings
  const [activeTab, setActiveTab] = useState<'tables' | 'pos' | 'aggregators' | 'kds' | 'shifts' | 'settings'>('tables');
  const [settingsSubTab, setSettingsSubTab] = useState<'tables' | 'menu' | 'aggregators' | 'hardware' | 'sop'>('tables');

  // Aggregator Orders
  const aggregatorOrders = kots.filter((k) => k.aggregatorBrand && k.aggregatorBrand !== 'none');
  const incomingAggregatorsCount = aggregatorOrders.filter((k) => k.aggregatorStatus === 'incoming').length;

  // Kitchen KDS Station Filter
  const [kdsStation, setKdsStation] = useState<'all' | 'tandoor' | 'main_kitchen' | 'bar' | 'pantry'>('all');

  // Shift & Cashier Z-Report State
  const [currentShift, setCurrentShift] = useState<ShiftDto | null>(initialShift || null);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [shiftOpeningCashInput, setShiftOpeningCashInput] = useState('2000');
  const [shiftClosingCashInput, setShiftClosingCashInput] = useState('');
  const [shiftClosingNotes, setShiftClosingNotes] = useState('');
  const [zReportData, setZReportData] = useState<any | null>(null);

  // New Dish Station State
  const [newDishStation, setNewDishStation] = useState<'tandoor' | 'main_kitchen' | 'bar' | 'pantry' | 'bakery'>('main_kitchen');

  // Active Outlet Selection: prefer dine_in outlets or first outlet that has tables
  const preferredOutlet =
    outlets.find((o) => tables.some((t) => t.outletId === o.id)) ||
    outlets.find((o) => o.outletType === 'dine_in') ||
    outlets[0];
  const [selectedOutletId, setSelectedOutletId] = useState(preferredOutlet?.id || outlets[0]?.id || '');
  const activeOutlet = outlets.find((o) => o.id === selectedOutletId) || preferredOutlet || outlets[0];

  // Table Section Filter & Custom Floor Zones
  const [isManageZonesModalOpen, setIsManageZonesModalOpen] = useState(false);
  const [newZoneNameInput, setNewZoneNameInput] = useState('');
  const [zoneToDelete, setZoneToDelete] = useState<string | null>(null);
  const [zoneReassignTarget, setZoneReassignTarget] = useState<string>('Main AC Hall');
  const [zoneToRename, setZoneToRename] = useState<string | null>(null);
  const [zoneRenameInput, setZoneRenameInput] = useState('');

  const [customZones, setCustomZones] = useState<string[]>([]);
  const [removedZones, setRemovedZones] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const czKey = `aura_dine_custom_zones_${activeOutlet?.id || 'default'}`;
      const rzKey = `aura_dine_removed_zones_${activeOutlet?.id || 'default'}`;
      const cz = localStorage.getItem(czKey);
      if (cz) setCustomZones(JSON.parse(cz));
      const rz = localStorage.getItem(rzKey);
      if (rz) setRemovedZones(JSON.parse(rz));
    } catch {
      // Ignore parse errors
    }
  }, [activeOutlet?.id]);

  const allSections = useMemo(() => {
    const fromTables = tables.map((t) => t.section || 'Main AC Hall');
    const combined = Array.from(new Set([...fromTables, ...customZones]));
    const filtered = combined.filter((s) => !removedZones.includes(s));
    return filtered.length > 0 ? filtered : ['Main AC Hall'];
  }, [tables, customZones, removedZones]);

  const [selectedSection, setSelectedSection] = useState<string>('all');

  // Table & Menu Management Modal States
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [newTableSection, setNewTableSection] = useState('Main AC Hall');
  const [newTableOutletId, setNewTableOutletId] = useState('');
  const [customSectionInput, setCustomSectionInput] = useState('');

  const [isEditTableModalOpen, setIsEditTableModalOpen] = useState(false);
  const [tableToEdit, setTableToEdit] = useState<TableDto | null>(null);
  const [editTableNumber, setEditTableNumber] = useState('');
  const [editTableCapacity, setEditTableCapacity] = useState(4);
  const [editTableSection, setEditTableSection] = useState('Main AC Hall');

  const [tableToDelete, setTableToDelete] = useState<TableDto | null>(null);

  const [isAddDishModalOpen, setIsAddDishModalOpen] = useState(false);
  const [newDishCategoryId, setNewDishCategoryId] = useState('');
  const [newDishName, setNewDishName] = useState('');
  const [newDishCode, setNewDishCode] = useState('');
  const [newDishPrice, setNewDishPrice] = useState('');
  const [newDishFoodType, setNewDishFoodType] = useState<'veg' | 'non_veg' | 'egg'>('veg');
  const [newDishDescription, setNewDishDescription] = useState('');

  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [isSopGuideModalOpen, setIsSopGuideModalOpen] = useState(false);

  // Aggregator API & Webhook Configuration Modal State
  const [isAggregatorSettingsModalOpen, setIsAggregatorSettingsModalOpen] = useState(false);
  const [swiggyRidInput, setSwiggyRidInput] = useState(activeOutlet?.swiggyRid || '');
  const [swiggyApiKeyInput, setSwiggyApiKeyInput] = useState(activeOutlet?.swiggyApiKey || '');
  const [swiggyAutoAcceptInput, setSwiggyAutoAcceptInput] = useState(activeOutlet?.swiggyAutoAccept ?? false);
  const [swiggyPrepMinsInput, setSwiggyPrepMinsInput] = useState(activeOutlet?.swiggyDefaultPrepMinutes || 20);

  const [zomatoResIdInput, setZomatoResIdInput] = useState(activeOutlet?.zomatoResId || '');
  const [zomatoApiKeyInput, setZomatoApiKeyInput] = useState(activeOutlet?.zomatoApiKey || '');
  const [zomatoAutoAcceptInput, setZomatoAutoAcceptInput] = useState(activeOutlet?.zomatoAutoAccept ?? false);
  const [zomatoPrepMinsInput, setZomatoPrepMinsInput] = useState(activeOutlet?.zomatoDefaultPrepMinutes || 20);
  const [copiedWebhook, setCopiedWebhook] = useState<'swiggy' | 'zomato' | null>(null);

  // Incoming Online Order Accept / Reject Pop-up Modal State
  const [reviewingIncomingOrder, setReviewingIncomingOrder] = useState<KotOrderDto | null>(null);
  const [selectedAcceptPrepTime, setSelectedAcceptPrepTime] = useState<number>(20);
  const [isRejectReasonOpen, setIsRejectReasonOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('Item 86 Out of Stock');
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'incoming' | 'preparing' | 'ready' | 'dispatched'>('all');

  // Menu Navigation & Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non_veg'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart / Order State
  const [orderType, setOrderType] = useState<'dine_in' | 'room_service' | 'takeaway' | 'delivery' | 'aggregator'>('dine_in');
  const [selectedTableId, setSelectedTableId] = useState<string>(tables[0]?.id || '');
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>(checkedInRooms[0]?.number || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [guestName, setGuestName] = useState('');
  const [customerCrmProfile, setCustomerCrmProfile] = useState<{
    visitCount: number;
    dietaryPreference: string;
    notes?: string;
  } | null>(null);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [cart, setCart] = useState<
    {
      menuItemId: string;
      itemName: string;
      quantity: number;
      unitPrice: number;
      gstRate: number;
      foodType: 'veg' | 'non_veg' | 'egg';
      specialNotes: string;
    }[]
  >([]);

  // Modals State
  const [printKotSlip, setPrintKotSlip] = useState<KotPrintData | null>(null);
  const [printCustomerBill, setPrintCustomerBill] = useState<BillPrintData | null>(null);
  const [settlingKot, setSettlingKot] = useState<KotOrderDto | null>(null);
  const [mergingTable, setMergingTable] = useState<TableDto | null>(null);
  const [shiftingTable, setShiftingTable] = useState<TableDto | null>(null);
  const [roundAddingKot, setRoundAddingKot] = useState<KotOrderDto | null>(null);

  // Settlement Form State
  const [settleMethod, setSettleMethod] = useState<'cash' | 'upi' | 'pos_machine' | 'room_charge' | 'aggregator'>('cash');
  const [splitMode, setSplitMode] = useState(false);
  const [splitCount, setSplitCount] = useState(2);
  const [billDiscountType, setBillDiscountType] = useState<'none' | 'percent' | 'flat'>('none');
  const [billDiscountValue, setBillDiscountValue] = useState(0);
  const [applyServiceCharge, setApplyServiceCharge] = useState(false);
  const [upiTimerSeconds, setUpiTimerSeconds] = useState(600);

  // Action Pending & Feedback States
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Filtered Tables
  const filteredTables = tables.filter((t) => {
    if (t.outletId !== selectedOutletId) return false;
    if (selectedSection !== 'all' && t.section !== selectedSection) return false;
    return true;
  });

  // Deduplicate categories and items to prevent duplicate pills and ghost cards
  const uniqueCategories = useMemo(() => {
    const catMap = new Map<string, MenuCategoryDto>();
    for (const c of categories) {
      const key = c.name.trim().toLowerCase();
      if (!catMap.has(key)) {
        catMap.set(key, { ...c, items: [...(c.items || [])] });
      } else {
        const existing = catMap.get(key)!;
        const existingItemIds = new Set(existing.items.map((it) => it.id));
        for (const it of c.items || []) {
          if (!existingItemIds.has(it.id)) {
            existing.items.push(it);
            existingItemIds.add(it.id);
          }
        }
      }
    }
    return Array.from(catMap.values());
  }, [categories]);

  const allItems = useMemo(() => {
    const itemMap = new Map<string, MenuItemDto>();
    for (const c of uniqueCategories) {
      for (const it of c.items) {
        if (!itemMap.has(it.id)) {
          itemMap.set(it.id, it);
        }
      }
    }
    return Array.from(itemMap.values());
  }, [uniqueCategories]);

  const filteredItems = useMemo(() => {
    return allItems.filter((it) => {
      if (selectedCategory !== 'all') {
        const selectedCat = uniqueCategories.find(
          (c) => c.id === selectedCategory || c.name.toLowerCase() === selectedCategory.toLowerCase()
        );
        if (selectedCat && !selectedCat.items.some((item) => item.id === it.id)) return false;
      }
      if (dietaryFilter === 'veg' && it.foodType !== 'veg') return false;
      if (dietaryFilter === 'non_veg' && it.foodType !== 'non_veg') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return it.name.toLowerCase().includes(q) || it.itemCode.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allItems, selectedCategory, dietaryFilter, searchQuery, uniqueCategories]);

  // Cart Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const cgstAmount = Math.round(((subtotal * 0.025) * 100)) / 100;
  const sgstAmount = Math.round(((subtotal * 0.025) * 100)) / 100;
  const totalTax = Math.round((cgstAmount + sgstAmount) * 100) / 100; // SAC 996331 5% F&B GST
  const grandTotal = Math.round((subtotal + totalTax) * 100) / 100;

  // Cart Helpers
  function addToCart(item: MenuItemDto) {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          itemName: item.name,
          quantity: 1,
          unitPrice: Number(item.price),
          gstRate: Number(item.gstRate) || 5.0,
          foodType: item.foodType,
          specialNotes: '',
        },
      ];
    });
  }

  function updateQuantity(menuItemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.menuItemId === menuItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as typeof cart
    );
  }

  function appendQuickNote(menuItemId: string, tag: string) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.menuItemId === menuItemId) {
          const current = item.specialNotes ? `${item.specialNotes}, ${tag}` : tag;
          return { ...item, specialNotes: current };
        }
        return item;
      })
    );
  }

  // Fast Phone CRM Lookup
  async function handlePhoneLookup(phone: string) {
    setCustomerPhone(phone);
    if (phone.length >= 10) {
      const res = await lookupCustomerAction(phone);
      if (res.ok && res.data) {
        setGuestName(res.data.name);
        setCustomerCrmProfile({
          visitCount: res.data.visitCount,
          dietaryPreference: res.data.dietaryPreference,
          notes: res.data.notes,
        });
      } else {
        setCustomerCrmProfile(null);
      }
    } else {
      setCustomerCrmProfile(null);
    }
  }

  // Dispatch New KOT
  async function handleDispatchKot() {
    if (cart.length === 0) return;
    setSubmitting(true);
    setFeedbackMsg(null);

    const activeRoom = checkedInRooms.find((r) => r.number === selectedRoomNumber);
    const activeTable = tables.find((t) => t.id === selectedTableId);

    const res = await createKotOrderAction({
      outletId: selectedOutletId,
      tableId: orderType === 'dine_in' ? selectedTableId : undefined,
      reservationId: orderType === 'room_service' ? activeRoom?.reservationId : undefined,
      roomNumber: orderType === 'room_service' ? selectedRoomNumber : undefined,
      orderType,
      guestName:
        guestName ||
        (orderType === 'room_service'
          ? activeRoom?.guestName || `Room ${selectedRoomNumber}`
          : `Table ${activeTable?.tableNumber || 'Dine-In'}`),
      customerPhone: customerPhone || undefined,
      specialInstructions,
      items: cart,
    });

    setSubmitting(false);

    if (res.ok) {
      setFeedbackMsg({
        type: 'ok',
        text: `Kitchen Order Ticket ${res.data.kotNumber} fired to kitchen and printer!`,
      });
      setPrintKotSlip({
        kotNumber: res.data.kotNumber,
        orderType: orderType as any,
        outletName: activeOutlet?.name || 'Restaurant',
        tableNumber: orderType === 'dine_in' ? activeTable?.tableNumber : undefined,
        roomNumber: orderType === 'room_service' ? selectedRoomNumber : undefined,
        guestName: guestName || (orderType === 'room_service' ? activeRoom?.guestName : undefined),
        createdAt: new Date().toISOString(),
        specialInstructions,
        items: cart.map((i) => ({
          itemName: i.itemName,
          quantity: i.quantity,
          foodType: i.foodType,
          specialNotes: i.specialNotes,
        })),
      });
      setCart([]);
      setSpecialInstructions('');
      if (activeTab === 'pos') setActiveTab('tables');
    } else {
      setFeedbackMsg({ type: 'err', text: res.error || 'Failed to dispatch KOT' });
    }
  }

  // Punch Subsequent Round KOT
  async function handlePunchRound() {
    if (!roundAddingKot || cart.length === 0) return;
    setSubmitting(true);
    setFeedbackMsg(null);

    const res = await punchKotRoundAction(roundAddingKot.id, {
      items: cart,
      specialInstructions,
    });

    setSubmitting(false);
    if (res.ok) {
      setFeedbackMsg({
        type: 'ok',
        text: `Round #${res.data.roundNumber} fired to kitchen (${res.data.kotNumber})! Total bill updated to ₹${res.data.newTotalAmount}.`,
      });
      setPrintKotSlip({
        kotNumber: res.data.kotNumber,
        orderType: roundAddingKot.orderType as any,
        outletName: roundAddingKot.outletName,
        tableNumber: roundAddingKot.tableNumber,
        roomNumber: roundAddingKot.roomNumber,
        guestName: roundAddingKot.guestName,
        createdAt: new Date().toISOString(),
        specialInstructions: `[Round ${res.data.roundNumber}] ${specialInstructions || ''}`,
        items: cart.map((i) => ({
          itemName: i.itemName,
          quantity: i.quantity,
          foodType: i.foodType,
          specialNotes: i.specialNotes,
        })),
      });
      setCart([]);
      setRoundAddingKot(null);
    } else {
      setFeedbackMsg({ type: 'err', text: res.error || 'Failed to punch round KOT' });
    }
  }

  // Table Shift / Transfer
  async function handleExecuteTableTransfer(destinationTableId: string) {
    if (!shiftingTable) return;
    setSubmitting(true);
    const res = await transferTableAction({
      fromTableId: shiftingTable.id,
      toTableId: destinationTableId,
    });
    setSubmitting(false);
    if (res.ok) {
      setFeedbackMsg({ type: 'ok', text: res.data.message });
      setShiftingTable(null);
    } else {
      setFeedbackMsg({ type: 'err', text: res.error || 'Failed to shift table' });
    }
  }

  // Table Merge
  async function handleExecuteTableMerge(targetTableId: string) {
    if (!mergingTable) return;
    setSubmitting(true);
    const res = await mergeTablesAction({
      sourceTableId: mergingTable.id,
      targetTableId: targetTableId,
    });
    setSubmitting(false);
    if (res.ok) {
      setFeedbackMsg({ type: 'ok', text: res.data.message });
      setMergingTable(null);
    } else {
      setFeedbackMsg({ type: 'err', text: res.error || 'Failed to merge tables' });
    }
  }

  // Settle Bill (Charge to Room)
  async function handleChargeToRoom(kotId: string, roomNum: string, resId: string) {
    setSubmitting(true);
    const res = await chargeKotToRoomAction(kotId, {
      roomNumber: roomNum,
      reservationId: resId,
      guestName,
    });
    setSubmitting(false);
    if (res.ok) {
      setFeedbackMsg({ type: 'ok', text: res.data.message });
      setSettlingKot(null);
    } else {
      setFeedbackMsg({ type: 'err', text: res.error || 'Failed to charge to room' });
    }
  }

  // Settle Bill (Direct Cashiering)
  async function handleDirectSettlement(kotId: string) {
    setSubmitting(true);
    const res = await settleKotDirectAction(kotId, settleMethod, customerPhone, guestName);
    setSubmitting(false);
    if (res.ok) {
      setFeedbackMsg({
        type: 'ok',
        text: `KOT ${res.data.kotNumber} settled directly via ${settleMethod.toUpperCase()} (₹${res.data.settledAmount}). Table vacated.`,
      });
      // Launch Customer Tax Receipt
      if (settlingKot) {
        const netBase = Number(settlingKot.subtotal);
        const cgst = Math.round((netBase * 0.025) * 100) / 100;
        const sgst = Math.round((netBase * 0.025) * 100) / 100;
        setPrintCustomerBill({
          invoiceNumber: `INV-${settlingKot.kotNumber}`,
          outletName: settlingKot.outletName,
          address: activeOutlet?.address || 'Lobby Level Dining',
          contactPhone: activeOutlet?.contactPhone || '+91 98200 12345',
          fssaiNumber: activeOutlet?.fssaiNumber || '10022011000452',
          gstin: activeOutlet?.gstin || '27AABCU9603R1ZM',
          tableNumber: settlingKot.tableNumber,
          roomNumber: settlingKot.roomNumber,
          orderType: settlingKot.orderType,
          customerName: guestName || settlingKot.guestName,
          customerPhone: customerPhone || settlingKot.customerPhone,
          serverName: settlingKot.serverName,
          createdAt: new Date().toISOString(),
          items: settlingKot.items.map((i) => ({
            itemName: i.itemName,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
            totalPrice: i.quantity * Number(i.unitPrice),
          })),
          subtotal: netBase,
          discountAmount: settlingKot.discountAmount || 0,
          serviceChargeAmount: settlingKot.serviceChargeAmount || 0,
          cgstAmount: cgst,
          sgstAmount: sgst,
          netTotal: Number(settlingKot.totalAmount),
          paymentMethod: settleMethod,
        });
      }
      setSettlingKot(null);
    } else {
      setFeedbackMsg({ type: 'err', text: res.error || 'Failed to settle bill' });
    }
  }

  // Setup Equal Split
  async function handleSetupSplit(kotId: string) {
    setSubmitting(true);
    const res = await splitKotBillAction(kotId, {
      splitType: 'equal',
      splitsCount: splitCount,
    });
    setSubmitting(false);
    if (res.ok) {
      setFeedbackMsg({
        type: 'ok',
        text: `Bill split into ${splitCount} equal shares of ₹${res.data.splits[0]?.amount} each!`,
      });
      setSettlingKot(null);
    } else {
      setFeedbackMsg({ type: 'err', text: res.error || 'Failed to split bill' });
    }
  }

  // Table Management Handlers
  async function handleCreateTable(e: React.FormEvent) {
    e.preventDefault();
    if (!newTableNumber.trim()) {
      setFeedbackMsg({ type: 'err', text: 'Please enter a valid table number (e.g. T-11)' });
      return;
    }
    const section = customSectionInput.trim() ? customSectionInput.trim() : newTableSection;
    setSubmitting(true);
    const res = await createRestaurantTableAction({
      outletId: newTableOutletId || selectedOutletId,
      tableNumber: newTableNumber.trim(),
      capacity: Number(newTableCapacity) || 4,
      section: section || 'Main AC Hall',
    });
    setSubmitting(false);
    if (res.ok) {
      setFeedbackMsg({ type: 'ok', text: res.data.message });
      setIsAddTableModalOpen(false);
      setNewTableNumber('');
      setCustomSectionInput('');
      router.refresh();
    } else {
      setFeedbackMsg({ type: 'err', text: res.error || 'Failed to create table' });
    }
  }

  async function handleUpdateTable(e: React.FormEvent) {
    e.preventDefault();
    if (!tableToEdit) return;
    setSubmitting(true);
    const res = await updateRestaurantTableAction(tableToEdit.id, {
      tableNumber: editTableNumber.trim(),
      capacity: Number(editTableCapacity),
      section: editTableSection.trim(),
    });
    setSubmitting(false);
    if (res.ok) {
      setFeedbackMsg({ type: 'ok', text: `Table ${editTableNumber} updated successfully.` });
      setIsEditTableModalOpen(false);
      setTableToEdit(null);
      router.refresh();
    } else {
      setFeedbackMsg({ type: 'err', text: res.error || 'Failed to update table' });
    }
  }

  async function handleDeleteTable() {
    if (!tableToDelete) return;
    setSubmitting(true);
    const res = await deleteRestaurantTableAction(tableToDelete.id);
    setSubmitting(false);
    if (res.ok) {
      setFeedbackMsg({ type: 'ok', text: res.data.message });
      setTableToDelete(null);
      router.refresh();
    } else {
      setFeedbackMsg({ type: 'err', text: res.error || 'Failed to delete table' });
    }
  }

  // Floor Zones Management Handlers
  function handleAddFloorZone(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newZoneNameInput.trim();
    if (!trimmed) return;
    if (allSections.includes(trimmed)) {
      setFeedbackMsg({ type: 'err', text: `Floor zone "${trimmed}" already exists.` });
      return;
    }
    const updatedCustom = Array.from(new Set([...customZones, trimmed]));
    const updatedRemoved = removedZones.filter((z) => z !== trimmed);
    setCustomZones(updatedCustom);
    setRemovedZones(updatedRemoved);
    setNewZoneNameInput('');
    try {
      const czKey = `aura_dine_custom_zones_${activeOutlet?.id || 'default'}`;
      const rzKey = `aura_dine_removed_zones_${activeOutlet?.id || 'default'}`;
      localStorage.setItem(czKey, JSON.stringify(updatedCustom));
      localStorage.setItem(rzKey, JSON.stringify(updatedRemoved));
    } catch {}
    setFeedbackMsg({ type: 'ok', text: `Floor Zone "${trimmed}" added successfully.` });
  }

  async function handleDeleteFloorZone(zoneName: string, reassignTo: string) {
    setSubmitting(true);
    const affectedTables = tables.filter((t) => t.section === zoneName);
    for (const t of affectedTables) {
      await updateRestaurantTableAction(t.id, {
        tableNumber: t.tableNumber,
        capacity: t.capacity,
        section: reassignTo,
      });
    }
    const updatedCustom = customZones.filter((z) => z !== zoneName);
    const updatedRemoved = Array.from(new Set([...removedZones, zoneName]));
    setCustomZones(updatedCustom);
    setRemovedZones(updatedRemoved);
    try {
      const czKey = `aura_dine_custom_zones_${activeOutlet?.id || 'default'}`;
      const rzKey = `aura_dine_removed_zones_${activeOutlet?.id || 'default'}`;
      localStorage.setItem(czKey, JSON.stringify(updatedCustom));
      localStorage.setItem(rzKey, JSON.stringify(updatedRemoved));
    } catch {}
    setSubmitting(false);
    setZoneToDelete(null);
    if (selectedSection === zoneName) setSelectedSection('all');
    setFeedbackMsg({
      type: 'ok',
      text: affectedTables.length > 0
        ? `Floor zone "${zoneName}" removed and ${affectedTables.length} table(s) moved to "${reassignTo}".`
        : `Floor zone "${zoneName}" removed successfully.`,
    });
    router.refresh();
  }

  async function handleRenameFloorZone(oldName: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) {
      setZoneToRename(null);
      return;
    }
    setSubmitting(true);
    const affectedTables = tables.filter((t) => t.section === oldName);
    for (const t of affectedTables) {
      await updateRestaurantTableAction(t.id, {
        tableNumber: t.tableNumber,
        capacity: t.capacity,
        section: trimmed,
      });
    }
    const updatedCustom = customZones.map((z) => (z === oldName ? trimmed : z));
    if (!updatedCustom.includes(trimmed)) updatedCustom.push(trimmed);
    const updatedRemoved = removedZones.filter((z) => z !== trimmed);
    setCustomZones(updatedCustom);
    setRemovedZones(updatedRemoved);
    try {
      const czKey = `aura_dine_custom_zones_${activeOutlet?.id || 'default'}`;
      const rzKey = `aura_dine_removed_zones_${activeOutlet?.id || 'default'}`;
      localStorage.setItem(czKey, JSON.stringify(updatedCustom));
      localStorage.setItem(rzKey, JSON.stringify(updatedRemoved));
    } catch {}
    setSubmitting(false);
    setZoneToRename(null);
    setZoneRenameInput('');
    if (selectedSection === oldName) setSelectedSection(trimmed);
    setFeedbackMsg({ type: 'ok', text: `Floor zone renamed to "${trimmed}".` });
    router.refresh();
  }

  // Menu Management Handlers
  async function handleAddDish(e: React.FormEvent) {
    e.preventDefault();
    if (!newDishName.trim() || !newDishPrice) {
      setFeedbackMsg({ type: 'err', text: 'Please provide dish name and price' });
      return;
    }
    const catId = newDishCategoryId || uniqueCategories[0]?.id;
    if (!catId) {
      setFeedbackMsg({ type: 'err', text: 'Please create a menu category first before adding dishes' });
      return;
    }
    setSubmitting(true);
    const res = await createMenuItemAction({
      categoryId: catId,
      name: newDishName.trim(),
      itemCode: newDishCode.trim() || undefined,
      price: Number(newDishPrice),
      foodType: newDishFoodType,
      description: newDishDescription.trim() || undefined,
      sacCode: '996331',
      gstRate: 5.0,
    });
    setSubmitting(false);
    if (res.ok) {
      setFeedbackMsg({ type: 'ok', text: res.data.message });
      setIsAddDishModalOpen(false);
      setNewDishName('');
      setNewDishPrice('');
      setNewDishCode('');
      setNewDishDescription('');
      router.refresh();
    } else {
      setFeedbackMsg({ type: 'err', text: res.error || 'Failed to add dish' });
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setFeedbackMsg({ type: 'err', text: 'Please enter category name' });
      return;
    }
    setSubmitting(true);
    const res = await createMenuCategoryAction({
      name: newCategoryName.trim(),
      sortOrder: uniqueCategories.length + 1,
    });
    setSubmitting(false);
    if (res.ok) {
      setFeedbackMsg({ type: 'ok', text: res.data.message });
      setIsAddCategoryModalOpen(false);
      setNewCategoryName('');
      router.refresh();
    } else {
      setFeedbackMsg({ type: 'err', text: res.error || 'Failed to create category' });
    }
  }

  // Item 86 / Stock Availability Toggle
  async function handleToggleItemStock(itemId: string, currentStockState?: boolean) {
    const nextOutOfStock = !currentStockState;
    setSubmitting(true);
    const res = await toggleMenuItemStockAction(itemId, { isOutOfStock: nextOutOfStock });
    setSubmitting(false);
    if (res.ok) {
      setFeedbackMsg({ type: 'ok', text: res.data.message });
      router.refresh();
    } else {
      setFeedbackMsg({ type: 'err', text: res.error || 'Failed to update item stock' });
    }
  }

  // Aggregator Order Status Update
  async function handleUpdateAggregatorStatus(
    orderId: string,
    status: 'accepted' | 'food_ready' | 'dispatched' | 'cancelled',
    prepMinutes = 20
  ) {
    setSubmitting(true);
    const res = await updateAggregatorOrderStatusAction(orderId, {
      aggregatorStatus: status,
      preparationTimeMinutes: prepMinutes,
      riderStatus: status === 'dispatched' ? 'picked_up' : status === 'food_ready' ? 'at_restaurant' : 'assigning',
    });
    setSubmitting(false);
    if (res.ok) {
      setFeedbackMsg({ type: 'ok', text: res.data.message });
      router.refresh();
    } else {
      setFeedbackMsg({ type: 'err', text: res.error || 'Failed to update delivery order' });
    }
  }

  // Audio Notification Chime for Incoming Online Delivery Orders
  function playOrderAlertChime() {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Melodic double-chime (D5 -> A5)
      const osc1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      osc1.frequency.setValueAtTime(587.33, now);
      g1.gain.setValueAtTime(0.35, now);
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc1.connect(g1);
      g1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.28);

      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.frequency.setValueAtTime(880.0, now + 0.16);
      g2.gain.setValueAtTime(0.4, now + 0.16);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(g2);
      g2.connect(ctx.destination);
      osc2.start(now + 0.16);
      osc2.stop(now + 0.55);
    } catch {
      // Browser audio context permission fallback
    }
  }

  // Simulate Incoming Delivery Order (Swiggy / Zomato)
  async function handleSimulateDeliveryOrder(brand: 'swiggy' | 'zomato') {
    const dishes = allItems;
    const sampleDish1 = dishes[0] || {
      id: undefined,
      name: 'Paneer Butter Masala',
      price: 280,
      foodType: 'veg' as const,
    };
    const sampleDish2 = dishes[1] || dishes[0] || {
      id: undefined,
      name: 'Butter Naan (2 pcs)',
      price: 90,
      foodType: 'veg' as const,
    };

    const targetOutletId = selectedOutletId || activeOutlet?.id || outlets[0]?.id;
    if (!targetOutletId) {
      setFeedbackMsg({ type: 'err', text: 'Please configure a dining outlet first.' });
      return;
    }

    setSubmitting(true);
    const res = await simulateAggregatorOrderAction({
      outletId: targetOutletId,
      brand,
      customerName: brand === 'swiggy' ? 'Rohan Deshmukh' : 'Priya Kashyap',
      customerPhone: brand === 'swiggy' ? '9820011445' : '9820033889',
      deliveryAddress: brand === 'swiggy' ? 'Tower 4, Apt 1102, Hiranandani Estate' : 'Villa 14, Silver Beach Enclave, Juhu',
      items: [
        {
          menuItemId: sampleDish1.id,
          itemName: sampleDish1.name,
          quantity: 2,
          unitPrice: Number(sampleDish1.price),
          foodType: sampleDish1.foodType,
          specialNotes: 'Less spicy, contact-less delivery',
        },
        {
          menuItemId: sampleDish2.id,
          itemName: sampleDish2.name,
          quantity: 1,
          unitPrice: Number(sampleDish2.price),
          foodType: sampleDish2.foodType,
          specialNotes: 'Pack extra napkins',
        },
      ],
    });
    setSubmitting(false);
    if (res.ok) {
      setFeedbackMsg({ type: 'ok', text: res.data.message });
      setActiveTab('aggregators');
      playOrderAlertChime();
      const mockOrder: KotOrderDto = {
        id: res.data.orderId,
        kotNumber: res.data.kotNumber,
        orderType: 'delivery',
        status: 'pending',
        paymentStatus: 'paid_direct',
        subtotal: res.data.totalAmount,
        taxAmount: Math.round(Number(res.data.totalAmount) * 0.05 * 100) / 100,
        totalAmount: res.data.totalAmount,
        specialInstructions: `Delivery to: ${brand === 'swiggy' ? 'Tower 4, Apt 1102, Hiranandani Estate' : 'Villa 14, Silver Beach Enclave, Juhu'}`,
        guestName: brand === 'swiggy' ? 'Rohan Deshmukh' : 'Priya Kashyap',
        customerPhone: brand === 'swiggy' ? '9820011445' : '9820033889',
        serverName: 'Online Ingestion Engine',
        aggregatorBrand: brand,
        aggregatorOrderId: res.data.aggregatorOrderId,
        riderName: 'Rahul Sharma (Delivery Captain)',
        riderPhone: '+91 98200 88712',
        riderStatus: 'assigning',
        preparationTimeMinutes: 20,
        aggregatorStatus: 'incoming',
        createdAt: new Date().toISOString(),
        outletName: activeOutlet?.name || 'Grand Azure Dining',
        tableNumber: null,
        roomNumber: null,
        items: [
          {
            id: 'sim-1',
            itemName: sampleDish1.name,
            quantity: 2,
            unitPrice: Number(sampleDish1.price),
            gstRate: 5.0,
            foodType: sampleDish1.foodType,
            specialNotes: 'Less spicy, contact-less delivery',
            status: 'queued',
          },
          {
            id: 'sim-2',
            itemName: sampleDish2.name,
            quantity: 1,
            unitPrice: Number(sampleDish2.price),
            gstRate: 5.0,
            foodType: sampleDish2.foodType,
            specialNotes: 'Pack extra napkins',
            status: 'queued',
          },
        ],
      };
      setSelectedAcceptPrepTime(20);
      setIsRejectReasonOpen(false);
      setReviewingIncomingOrder(mockOrder);
      router.refresh();
    } else {
      setFeedbackMsg({ type: 'err', text: res.error || 'Failed to simulate delivery order' });
    }
  }

  // Save Aggregator API Credentials & Auto-Accept Rules
  async function handleSaveAggregatorSettings(e: React.FormEvent) {
    e.preventDefault();
    const targetOutletId = selectedOutletId || activeOutlet?.id || outlets[0]?.id;
    if (!targetOutletId) return;

    setSubmitting(true);
    const res = await updateOutletAggregatorConfigAction(targetOutletId, {
      swiggyRid: swiggyRidInput || null,
      swiggyApiKey: swiggyApiKeyInput || null,
      swiggyAutoAccept: swiggyAutoAcceptInput,
      swiggyDefaultPrepMinutes: Number(swiggyPrepMinsInput) || 20,
      zomatoResId: zomatoResIdInput || null,
      zomatoApiKey: zomatoApiKeyInput || null,
      zomatoAutoAccept: zomatoAutoAcceptInput,
      zomatoDefaultPrepMinutes: Number(zomatoPrepMinsInput) || 20,
    });
    setSubmitting(false);
    if (res.ok) {
      setFeedbackMsg({ type: 'ok', text: 'Live aggregator configuration saved successfully!' });
      setIsAggregatorSettingsModalOpen(false);
      router.refresh();
    } else {
      setFeedbackMsg({ type: 'err', text: res.error || 'Failed to save aggregator settings.' });
    }
  }

  // Open Shift
  async function handleOpenShift(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await openShiftAction(
      selectedOutletId,
      'Dinner Service Shift',
      Number(shiftOpeningCashInput) || 0
    );
    setSubmitting(false);
    if (res.ok) {
      setFeedbackMsg({ type: 'ok', text: res.data.message });
      setCurrentShift(res.data.shift);
      setIsOpenShiftModalOpen(false);
      router.refresh();
    } else {
      setFeedbackMsg({ type: 'err', text: res.error || 'Failed to open shift' });
    }
  }

  // Close Shift & Print Z-Report
  async function handleCloseShift(e: React.FormEvent) {
    e.preventDefault();
    if (!currentShift) return;
    setSubmitting(true);
    const res = await closeShiftAction({
      shiftId: currentShift.id,
      closingCash: Number(shiftClosingCashInput) || 0,
      notes: shiftClosingNotes.trim() || undefined,
    });
    setSubmitting(false);
    if (res.ok) {
      setFeedbackMsg({ type: 'ok', text: res.data.message });
      setZReportData(res.data.zReport);
      setCurrentShift(null);
      setIsCloseShiftModalOpen(false);
      router.refresh();
    } else {
      setFeedbackMsg({ type: 'err', text: res.error || 'Failed to close shift' });
    }
  }

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* AURA DINE DUAL MODE HEADER                                    */}
      {/* ============================================================== */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/10 text-amber-700 font-bold text-lg">
              🍽️
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl sm:text-2xl font-black text-slate-950">
                  Restaurant POS &amp; KOT Engine
                </h1>
                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider">
                  Aura Dine
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {operatingMode === 'hotel'
                  ? 'Connected Hotel Mode · Direct folio charging to room, SAC 996331 5% F&B GST'
                  : 'Standalone Restaurant Mode · Direct diner CRM, Swiggy/Zomato, and cash/card POS'}
              </p>
            </div>
          </div>
        </div>

        {/* Operating Mode Switcher & Outlet Pill */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Hotel vs Standalone Toggle */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setOperatingMode('hotel')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                operatingMode === 'hotel'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              🏨 Hotel Integrated
            </button>
            <button
              type="button"
              onClick={() => setOperatingMode('standalone')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                operatingMode === 'standalone'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              🍽️ Standalone POS
            </button>
          </div>

          {/* Outlet Selector Dropdown */}
          <div className="w-52">
            <CustomDropdown
              value={selectedOutletId}
              onChange={(val) => setSelectedOutletId(val)}
              size="sm"
              options={outlets.map((o) => ({
                value: o.id,
                label: o.name,
                badge: o.isStandalone ? 'Bistro' : 'Hotel',
              }))}
              aria-label="Select Restaurant Outlet"
            />
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div
          className={`flex items-center justify-between rounded-2xl p-4 text-xs font-bold shadow-xs ${
            feedbackMsg.type === 'ok'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-xs font-extrabold hover:opacity-75 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* NAVIGATION TABS (Tables, POS Counter, Aggregators, KDS, Shift) */}
      {/* ============================================================== */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-bold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('tables')}
          className={`pb-3 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'tables'
              ? 'border-b-2 border-slate-950 text-slate-950'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>🪑 Floor Plan Tables</span>
          <span className="rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-xs font-bold">
            {filteredTables.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pos')}
          className={`pb-3 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'pos'
              ? 'border-b-2 border-slate-950 text-slate-950'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>🖥️ Touch POS Counter</span>
          {cart.length > 0 && (
            <span className="rounded-full bg-amber-500 text-white px-2 py-0.5 text-xs font-bold">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('aggregators')}
          className={`pb-3 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'aggregators'
              ? 'border-b-2 border-slate-950 text-slate-950'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>🛵 Online Delivery Hub</span>
          {incomingAggregatorsCount > 0 ? (
            <span className="rounded-full bg-rose-600 text-white px-2 py-0.5 text-xs font-black animate-pulse">
              {incomingAggregatorsCount} New
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-xs font-bold">
              {aggregatorOrders.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('kds')}
          className={`pb-3 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'kds'
              ? 'border-b-2 border-slate-950 text-slate-950'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>👨‍🍳 Kitchen KDS</span>
          <span className="rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-xs font-bold">
            {kots.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('shifts')}
          className={`pb-3 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'shifts'
              ? 'border-b-2 border-slate-950 text-slate-950'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>📊 Cashier Shifts &amp; Z-Report</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
              currentShift ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {currentShift ? 'Open' : 'Closed'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`pb-3 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeTab === 'settings'
              ? 'border-b-2 border-indigo-600 text-indigo-950 font-black'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>⚙️ Settings &amp; Hardware</span>
          <span className="rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-xs font-bold border border-indigo-200">
            Setup
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: TABLE FLOOR PLAN (With Sections, Merge & Shift)         */}
      {/* ============================================================== */}
      {activeTab === 'tables' && (
        <div className="space-y-6">
          {/* Header Row: Floor Zones & Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Section Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 mr-1">Floor Zones:</span>
              <button
                type="button"
                onClick={() => setSelectedSection('all')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  selectedSection === 'all'
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                All Sections
              </button>
              {allSections.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setSelectedSection(sec)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    selectedSection === sec
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {sec}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsManageZonesModalOpen(true)}
                className="rounded-xl px-2.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                title="Add or remove custom floor zones"
              >
                <span>⚙️</span>
                <span>Manage Floor Zones</span>
              </button>
            </div>

            {/* Clean Floor Status & Settings shortcut */}
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                <span>{filteredTables.filter((t) => t.status === 'vacant').length} Vacant</span>
                <span className="text-slate-300">•</span>
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500"></span>
                <span>{filteredTables.filter((t) => t.status === 'occupied').length} Occupied</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSettingsSubTab('tables');
                  setActiveTab('settings');
                }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
              >
                <span>⚙️ Manage Floor Plan</span>
              </button>
              <Link
                href="/settings?tab=restaurant"
                className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition-colors shadow-xs cursor-pointer"
              >
                <span>⚙️ Manage in Settings Hub &rarr;</span>
              </Link>
            </div>
          </div>

          {/* Empty State vs Tables Grid */}
          {filteredTables.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-2xl mb-4">
                🪑
              </div>
              <h3 className="font-display text-lg font-black text-slate-950">
                No Tables Found for {activeOutlet?.name || 'this Outlet'}
              </h3>
              <p className="mt-1 max-w-md text-xs text-slate-500 font-medium">
                Set up your dining tables (e.g. T-01, T-02, Terrace-1) with covers and floor zones to seat guests, punch KOTs, and manage live restaurant orders.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setNewTableOutletId(selectedOutletId);
                    setIsAddTableModalOpen(true);
                  }}
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  + Add First Dining Table
                </button>
                <button
                  type="button"
                  onClick={() => setIsSopGuideModalOpen(true)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  📖 View Aura Dine Operations SOP
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredTables.map((table) => {
                const isOccupied = table.status === 'occupied';
                const activeKot = kots.find((k) => k.id === table.activeKotId);

                return (
                  <div
                    key={table.id}
                    className={`relative flex flex-col justify-between rounded-2xl border p-4 transition-all shadow-xs ${
                      isOccupied
                        ? 'border-amber-300 bg-amber-50/40 hover:border-amber-400'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {/* Top Bar: Table Number & Status Pill */}
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-display text-lg font-black text-slate-950">
                          {table.tableNumber}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            isOccupied
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {isOccupied ? 'Occupied' : 'Vacant'}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span>{table.capacity} Covers</span>
                        <span className="text-[10px] font-bold text-slate-400">{table.section}</span>
                      </div>

                      {table.isMerged && (
                        <span className="mt-1.5 inline-block rounded-md bg-purple-100 text-purple-800 px-1.5 py-0.5 text-[9.5px] font-extrabold">
                          🔗 Merged Table
                        </span>
                      )}

                      {/* Occupied Table Details */}
                      {isOccupied && (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-white p-2.5 space-y-1 text-xs">
                          <div className="flex justify-between font-bold text-slate-950">
                            <span>{table.activeKotNumber || 'KOT'}</span>
                            <span>₹{Number(table.activeTotalAmount || 0).toFixed(0)}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 truncate">
                            {table.activeGuestName || 'Dine-In Guest'}
                          </p>
                          {table.activeRoundNumber && table.activeRoundNumber > 1 && (
                            <span className="inline-block rounded bg-amber-100 text-amber-900 px-1.5 py-0.2 text-[9px] font-bold">
                              Round {table.activeRoundNumber}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1.5">
                      {isOccupied ? (
                        <>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (activeKot) {
                                  setRoundAddingKot(activeKot);
                                  setActiveTab('pos');
                                }
                              }}
                              className="rounded-lg bg-amber-600 px-2 py-1.5 text-[11px] font-bold text-white hover:bg-amber-700 transition-colors cursor-pointer text-center"
                            >
                              + Round
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (activeKot) setSettlingKot(activeKot);
                              }}
                              className="rounded-lg bg-slate-950 px-2 py-1.5 text-[11px] font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer text-center"
                            >
                              Settle &amp; Bill
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-600 font-bold">
                            <button
                              type="button"
                              onClick={() => setShiftingTable(table)}
                              className="rounded bg-slate-100 py-1 hover:bg-slate-200 transition-colors cursor-pointer text-center"
                            >
                              Shift ➔
                            </button>
                            <button
                              type="button"
                              onClick={() => setMergingTable(table)}
                              className="rounded bg-slate-100 py-1 hover:bg-slate-200 transition-colors cursor-pointer text-center"
                            >
                              Merge 🔗
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTableId(table.id);
                              setOrderType('dine_in');
                              setActiveTab('pos');
                            }}
                            className="flex-1 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors cursor-pointer text-center"
                          >
                            + New Order
                          </button>
                          <button
                            type="button"
                            title="Edit Table"
                            onClick={() => {
                              setTableToEdit(table);
                              setEditTableNumber(table.tableNumber);
                              setEditTableCapacity(table.capacity);
                              setEditTableSection(table.section);
                              setIsEditTableModalOpen(true);
                            }}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-950 transition-colors cursor-pointer text-xs"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            title="Delete Vacant Table"
                            onClick={() => setTableToDelete(table)}
                            className="rounded-lg border border-slate-200 p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer text-xs"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: TOUCH POS COUNTER (Aura Dine Touch Screen)              */}
      {/* ============================================================== */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Menu Catalog Section (8 cols) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            
            {/* Round KOT Indicator Banner */}
            {roundAddingKot && (
              <div className="flex items-center justify-between rounded-2xl bg-amber-100 border border-amber-300 p-3 text-xs font-bold text-amber-950">
                <span>
                  Adding Round #{(roundAddingKot.roundNumber || 1) + 1} to {roundAddingKot.kotNumber} (Table {roundAddingKot.tableNumber})
                </span>
                <button
                  type="button"
                  onClick={() => setRoundAddingKot(null)}
                  className="rounded-lg bg-amber-200 px-2 py-0.5 text-[11px] hover:bg-amber-300 cursor-pointer"
                >
                  Cancel Round
                </button>
              </div>
            )}

            {/* Search Bar, Dietary Filter Pills & Menu Setup Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="flex flex-1 flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search dish (e.g. Paneer Tikka, Naan, Biryani)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-slate-950 focus:outline-none"
                  />
                </div>

                <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDietaryFilter('all')}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold cursor-pointer transition-all ${
                      dietaryFilter === 'all'
                        ? 'bg-white text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setDietaryFilter('veg')}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
                      dietaryFilter === 'veg'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-emerald-700 hover:text-emerald-950'
                    }`}
                  >
                    <span>🟢</span> Veg
                  </button>
                  <button
                    type="button"
                    onClick={() => setDietaryFilter('non_veg')}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
                      dietaryFilter === 'non_veg'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-rose-700 hover:text-rose-950'
                    }`}
                  >
                    <span>🔴</span> Non-Veg
                  </button>
                </div>
              </div>

              {/* Menu Setup Shortcut */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSettingsSubTab('menu');
                    setActiveTab('settings');
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <span>⚙️ Menu Catalog</span>
                </button>
              </div>
            </div>

            {/* Category Navigation Pills */}
            <div className="flex flex-wrap gap-2 items-center">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                All Categories ({allItems.length})
              </button>
              {uniqueCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    selectedCategory === c.id
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {c.name} ({c.items.length})
                </button>
              ))}
            </div>

            {/* Dishes Grid or Empty State */}
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-2xl mb-3">
                  🍲
                </div>
                <h3 className="font-display text-base font-black text-slate-950">
                  No Menu Dishes Found
                </h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm">
                  {searchQuery ? `No dish matched "${searchQuery}".` : 'Add your first starter, main course, bread, or dessert dish to start punching orders.'}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewDishCategoryId(categories[0]?.id || '');
                      setIsAddDishModalOpen(true);
                    }}
                    className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    + Add New Dish
                  </button>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all ${
                    item.isOutOfStock
                      ? 'border-rose-200 bg-rose-50/30 opacity-70'
                      : 'border-slate-200 bg-white hover:border-amber-400 hover:shadow-xs'
                  }`}
                >
                  <div
                    onClick={() => {
                      if (!item.isOutOfStock) addToCart(item);
                    }}
                    className={item.isOutOfStock ? 'cursor-not-allowed' : 'cursor-pointer'}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs ${
                            item.foodType === 'veg' ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {item.foodType === 'veg' ? '🟢' : '🔴'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{item.itemCode}</span>
                      </div>
                      {item.kitchenStation && (
                        <span className="rounded bg-slate-100 text-slate-600 px-1.5 py-0.2 text-[9px] font-bold">
                          {item.kitchenStation === 'tandoor' && '🔥 Tandoor'}
                          {item.kitchenStation === 'main_kitchen' && '🍳 Curry'}
                          {item.kitchenStation === 'bar' && '🍸 Bar'}
                          {item.kitchenStation === 'pantry' && '🥗 Pantry'}
                          {item.kitchenStation === 'bakery' && '🥖 Bakery'}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-bold text-xs sm:text-sm text-slate-950 line-clamp-1">
                      {item.name}
                    </p>
                    {item.description && (
                      <p className="mt-0.5 text-[10.5px] text-slate-500 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 font-display text-sm font-black text-slate-950">
                    <span>₹{Number(item.price).toFixed(0)}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        title={item.isOutOfStock ? 'Mark In Stock' : 'Mark 86 (Out of Stock)'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleItemStock(item.id, item.isOutOfStock);
                        }}
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-black cursor-pointer transition-colors ${
                          item.isOutOfStock
                            ? 'bg-rose-600 text-white hover:bg-rose-700'
                            : 'bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-700'
                        }`}
                      >
                        {item.isOutOfStock ? '🔴 86' : '🟢 Stock'}
                      </button>
                      {!item.isOutOfStock ? (
                        <button
                          type="button"
                          onClick={() => addToCart(item)}
                          className="rounded-lg bg-amber-500/10 text-amber-800 px-2 py-0.5 text-xs font-bold hover:bg-amber-500 hover:text-white transition-colors cursor-pointer"
                        >
                          + Add
                        </button>
                      ) : (
                        <span className="text-[10px] text-rose-600 font-bold">Sold Out</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>

          {/* Cart & Order Dispatch Drawer (4-5 cols) */}
          <div className="lg:col-span-5 xl:col-span-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 sticky top-6">
            
            {/* Order Destination Selector */}
            <div className="space-y-2">
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setOrderType('dine_in')}
                  className={`flex-1 rounded-lg py-1.5 text-center cursor-pointer ${
                    orderType === 'dine_in' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Dine-In
                </button>
                {operatingMode === 'hotel' && (
                  <button
                    type="button"
                    onClick={() => setOrderType('room_service')}
                    className={`flex-1 rounded-lg py-1.5 text-center cursor-pointer ${
                      orderType === 'room_service' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Room Service
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOrderType('takeaway')}
                  className={`flex-1 rounded-lg py-1.5 text-center cursor-pointer ${
                    orderType === 'takeaway' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Takeaway
                </button>
              </div>

              {orderType === 'dine_in' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1 block">Select Table:</label>
                  <CustomDropdown
                    value={selectedTableId}
                    onChange={(val) => setSelectedTableId(val)}
                    size="sm"
                    options={filteredTables.map((t) => ({
                      value: t.id,
                      label: `${t.tableNumber} (${t.section}) - ${t.capacity} Covers`,
                      badge: t.status,
                      badgeColor: t.status === 'vacant' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
                    }))}
                    aria-label="Select Table"
                  />
                </div>
              )}

              {orderType === 'room_service' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1 block">Select Checked-In Room:</label>
                  <CustomDropdown
                    value={selectedRoomNumber}
                    onChange={(val) => setSelectedRoomNumber(val)}
                    size="sm"
                    options={checkedInRooms.map((r) => ({
                      value: r.number,
                      label: `Room ${r.number} — ${r.guestName}`,
                      badge: `Rm ${r.number}`,
                    }))}
                    aria-label="Select Checked-In Room"
                  />
                </div>
              )}
            </div>

            {/* Standalone CRM Phone Lookup */}
            <div className="space-y-1.5 border-t border-slate-100 pt-3">
              <label className="text-[11px] font-bold text-slate-500">Customer Phone &amp; CRM:</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="Mobile (e.g. 9820011223)"
                  value={customerPhone}
                  onChange={(e) => handlePhoneLookup(e.target.value)}
                  className="w-1/2 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-mono font-medium focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Guest / Diner Name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-1/2 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium focus:outline-none"
                />
              </div>

              {customerCrmProfile && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-900 space-y-0.5">
                  <div className="flex justify-between font-bold">
                    <span>Returning Diner: {customerCrmProfile.visitCount} visits</span>
                    <span className="uppercase">{customerCrmProfile.dietaryPreference}</span>
                  </div>
                  {customerCrmProfile.notes && <p className="text-[10px] text-slate-600">{customerCrmProfile.notes}</p>}
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="border-t border-slate-100 pt-3 space-y-2.5 max-h-64 overflow-y-auto">
              <div className="flex justify-between text-xs font-black text-slate-900">
                <span>Ordered Items</span>
                <span>{cart.length} items</span>
              </div>

              {cart.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400 font-medium">
                  Tap dishes to add to this KOT
                </p>
              ) : (
                cart.map((item) => (
                  <div key={item.menuItemId} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs">{item.foodType === 'veg' ? '🟢' : '🔴'}</span>
                        <span className="text-xs font-bold text-slate-900 truncate">{item.itemName}</span>
                      </div>
                      <span className="font-mono text-xs font-black text-slate-950">
                        ₹{item.quantity * item.unitPrice}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.menuItemId, -1)}
                          className="h-6 w-6 rounded-lg bg-white border border-slate-200 font-bold hover:bg-slate-100 cursor-pointer text-center"
                        >
                          -
                        </button>
                        <span className="font-bold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.menuItemId, 1)}
                          className="h-6 w-6 rounded-lg bg-white border border-slate-200 font-bold hover:bg-slate-100 cursor-pointer text-center"
                        >
                          +
                        </button>
                      </div>

                      {/* Quick Kitchen Notes */}
                      <div className="flex gap-1 text-[9px] font-bold">
                        <button
                          type="button"
                          onClick={() => appendQuickNote(item.menuItemId, 'Less Spicy')}
                          className="rounded bg-white px-1.5 py-0.5 border border-slate-200 hover:bg-slate-100 cursor-pointer"
                        >
                          Mild
                        </button>
                        <button
                          type="button"
                          onClick={() => appendQuickNote(item.menuItemId, 'Spicy')}
                          className="rounded bg-white px-1.5 py-0.5 border border-slate-200 hover:bg-slate-100 cursor-pointer"
                        >
                          Spicy
                        </button>
                        <button
                          type="button"
                          onClick={() => appendQuickNote(item.menuItemId, 'No Onion Garlic')}
                          className="rounded bg-white px-1.5 py-0.5 border border-slate-200 hover:bg-slate-100 cursor-pointer"
                        >
                          Jain
                        </button>
                      </div>
                    </div>

                    {item.specialNotes && (
                      <p className="text-[10px] text-amber-800 font-medium italic">
                        Note: {item.specialNotes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Bill Summary */}
            <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 text-[11px]">
                <span>F&amp;B GST (5% SAC 996331):</span>
                <span>₹{totalTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-950 border-t border-slate-100 pt-1.5">
                <span>Grand Total:</span>
                <span>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Dispatch Action */}
            {roundAddingKot ? (
              <button
                type="button"
                disabled={cart.length === 0 || submitting}
                onClick={handlePunchRound}
                className="w-full rounded-2xl bg-amber-600 py-3 text-xs font-bold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50 cursor-pointer transition-all"
              >
                {submitting ? 'Punching Round...' : `🔥 Punch Round #${(roundAddingKot.roundNumber || 1) + 1} to Kitchen`}
              </button>
            ) : (
              <button
                type="button"
                disabled={cart.length === 0 || submitting}
                onClick={handleDispatchKot}
                className="w-full rounded-2xl bg-emerald-700 py-3 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50 cursor-pointer transition-all"
              >
                {submitting ? 'Dispatching KOT...' : '🔥 Fire KOT to Kitchen & Print'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: ONLINE DELIVERY AGGREGATORS HUB (SWIGGY & ZOMATO)       */}
      {/* ============================================================== */}
      {activeTab === 'aggregators' && (
        <div className="space-y-6">
          {/* Header Row: Live Counters & Demo Simulation Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-orange-500/10 text-orange-600 font-bold text-xl">
                🛵
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base sm:text-lg font-black text-slate-950">
                    Online Delivery Hub
                  </h2>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-black uppercase">
                    Swiggy &amp; Zomato Connected
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Centralized order ingestion, prep timers, rider OTP tracking, and multi-channel item 86&apos;ing
                </p>
              </div>
            </div>

            {/* Live API Connect & Demonstration Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSettingsSubTab('aggregators');
                  setActiveTab('settings');
                }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
              >
                <span>⚙️ Aggregator API &amp; Webhooks</span>
              </button>
              <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
              <span className="text-[11px] font-bold text-slate-400 mr-1">Demo Sandbox:</span>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSimulateDeliveryOrder('swiggy')}
                className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-orange-700 shadow-xs transition-colors cursor-pointer"
              >
                <span>⚡ Simulate Swiggy Order</span>
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSimulateDeliveryOrder('zomato')}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-xs transition-colors cursor-pointer"
              >
                <span>⚡ Simulate Zomato Order</span>
              </button>
            </div>
          </div>

          {/* Urgent Incoming Orders Notification Banner */}
          {incomingAggregatorsCount > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 p-5 text-white shadow-lg animate-pulse">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-2xl font-bold">
                  🔔
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white text-orange-700 px-2.5 py-0.5 text-[10px] font-black uppercase">
                      Action Required
                    </span>
                    <h3 className="font-display text-base sm:text-lg font-black">
                      {incomingAggregatorsCount} New Online Order{incomingAggregatorsCount > 1 ? 's' : ''} Awaiting Acceptance!
                    </h3>
                  </div>
                  <p className="text-xs text-white/90 font-medium mt-0.5">
                    Click to review dishes, customer notes, and select preparation time before order auto-rejects.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const firstIncoming = aggregatorOrders.find((o) => o.aggregatorStatus === 'incoming');
                  if (firstIncoming) {
                    setSelectedAcceptPrepTime(firstIncoming.preparationTimeMinutes || 20);
                    setIsRejectReasonOpen(false);
                    setReviewingIncomingOrder(firstIncoming);
                    playOrderAlertChime();
                  }
                }}
                className="rounded-2xl bg-white px-5 py-3 text-xs font-black text-slate-950 hover:bg-slate-100 shadow-md transition-all cursor-pointer whitespace-nowrap flex items-center gap-2"
              >
                <span>🔔</span>
                <span>Review &amp; Accept Order (Pop-up) ➔</span>
              </button>
            </div>
          )}

          {/* Delivery Queue Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => setDeliveryFilter('all')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                deliveryFilter === 'all'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Deliveries ({aggregatorOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setDeliveryFilter('incoming')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                deliveryFilter === 'incoming'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>🔔 Awaiting Decision</span>
              {incomingAggregatorsCount > 0 && (
                <span className="rounded-full bg-orange-100 text-orange-700 px-1.5 py-0.2 text-[10px] font-black">
                  {incomingAggregatorsCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setDeliveryFilter('preparing')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                deliveryFilter === 'preparing'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>🔥 In Kitchen / Cooking</span>
              <span className="text-[10px] opacity-80">
                ({aggregatorOrders.filter((o) => o.aggregatorStatus === 'accepted').length})
              </span>
            </button>
            <button
              type="button"
              onClick={() => setDeliveryFilter('ready')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                deliveryFilter === 'ready'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>📦 Food Ready &amp; Packed</span>
              <span className="text-[10px] opacity-80">
                ({aggregatorOrders.filter((o) => o.aggregatorStatus === 'food_ready').length})
              </span>
            </button>
            <button
              type="button"
              onClick={() => setDeliveryFilter('dispatched')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                deliveryFilter === 'dispatched'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>🛵 Dispatched / On the Way</span>
              <span className="text-[10px] opacity-80">
                ({aggregatorOrders.filter((o) => o.aggregatorStatus === 'dispatched').length})
              </span>
            </button>
          </div>

          {/* Delivery Orders List */}
          {aggregatorOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-50 text-2xl mb-4">
                🛵
              </div>
              <h3 className="font-display text-base font-black text-slate-950">
                No Active Delivery Orders
              </h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                Incoming orders from Swiggy, Zomato, or direct web will appear here with live rider statuses and prep timers.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setSettingsSubTab('aggregators');
                    setActiveTab('settings');
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>⚙️ Connect Live Swiggy &amp; Zomato</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateDeliveryOrder('swiggy')}
                  className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700 shadow-xs cursor-pointer"
                >
                  Receive Test Swiggy Order
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateDeliveryOrder('zomato')}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-xs cursor-pointer"
                >
                  Receive Test Zomato Order
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {aggregatorOrders
                .filter((ord) => {
                  if (deliveryFilter === 'incoming') return ord.aggregatorStatus === 'incoming';
                  if (deliveryFilter === 'preparing') return ord.aggregatorStatus === 'accepted';
                  if (deliveryFilter === 'ready') return ord.aggregatorStatus === 'food_ready';
                  if (deliveryFilter === 'dispatched') return ord.aggregatorStatus === 'dispatched';
                  return true;
                })
                .map((ord) => {
                const isSwiggy = ord.aggregatorBrand === 'swiggy';
                const isZomato = ord.aggregatorBrand === 'zomato';
                const isIncoming = ord.aggregatorStatus === 'incoming';
                const isAccepted = ord.aggregatorStatus === 'accepted';
                const isFoodReady = ord.aggregatorStatus === 'food_ready';
                const isDispatched = ord.aggregatorStatus === 'dispatched';

                return (
                  <div
                    key={ord.id}
                    className={`rounded-3xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                      isIncoming
                        ? isSwiggy
                          ? 'border-orange-300 bg-orange-50/40 ring-2 ring-orange-400'
                          : 'border-rose-300 bg-rose-50/40 ring-2 ring-rose-400'
                        : isAccepted
                        ? 'border-amber-300 bg-amber-50/20 ring-1 ring-amber-300'
                        : isFoodReady
                        ? 'border-purple-300 bg-purple-50/20'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div>
                      {/* Top Bar: Brand, Order ID, and Status */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase text-white ${
                              isSwiggy ? 'bg-orange-600' : isZomato ? 'bg-rose-600' : 'bg-slate-900'
                            }`}
                          >
                            {ord.aggregatorBrand?.toUpperCase()}
                          </span>
                          <span className="font-mono text-xs font-black text-slate-950">
                            {ord.aggregatorOrderId || ord.kotNumber}
                          </span>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            isIncoming
                              ? 'bg-amber-100 text-amber-900 animate-pulse'
                              : isAccepted
                              ? 'bg-amber-100 text-amber-900'
                              : isFoodReady
                              ? 'bg-purple-100 text-purple-900'
                              : isDispatched
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-blue-100 text-blue-900'
                          }`}
                        >
                          {isIncoming ? 'Awaiting Accept' : isAccepted ? 'In Kitchen' : isFoodReady ? 'Food Ready' : isDispatched ? 'Dispatched' : ord.aggregatorStatus}
                        </span>
                      </div>

                      {/* Customer & Address Details */}
                      <div className="mt-3 text-xs space-y-1">
                        <div className="flex justify-between font-bold text-slate-950">
                          <span>{ord.guestName || 'Delivery Diner'}</span>
                          <span className="text-emerald-700 font-black">₹{Number(ord.totalAmount).toFixed(0)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">📞 {ord.customerPhone}</p>
                        {ord.specialInstructions && (
                          <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl italic border border-slate-100">
                            📍 {ord.specialInstructions}
                          </p>
                        )}
                      </div>

                      {/* Rider Tracking Card (Visible for Accepted/Ready/Dispatched) */}
                      {!isIncoming && (
                        <div className="mt-3 rounded-2xl bg-slate-50 p-3 border border-slate-200/60 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                            <span>🛵 Assigned Rider:</span>
                            <span className="font-black text-slate-950">{ord.riderName || 'Assigning...'}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                            <span>Contact: {ord.riderPhone || 'In App'}</span>
                            <span className="rounded bg-slate-200/80 px-1.5 py-0.2 font-bold uppercase text-[9px] text-slate-700">
                              {ord.riderStatus || 'Searching'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Items List */}
                      <div className="mt-3 space-y-1.5 text-xs border-t border-slate-100 pt-2.5">
                        {ord.items.map((i, idx) => (
                          <div key={idx} className="flex justify-between font-medium">
                            <span>
                              {i.foodType === 'veg' ? '🟢' : '🔴'} {i.quantity}x {i.itemName}
                            </span>
                            <span className="text-slate-500 font-mono">
                              ₹{(Number(i.unitPrice) * i.quantity).toFixed(0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Operational Action Buttons (Lifecycle Box) */}
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      {/* Case 1: Incoming -> Trigger Pop-up Modal to Accept/Reject */}
                      {isIncoming && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between rounded-xl bg-orange-100/70 p-2 text-[11px] font-bold text-orange-950">
                            <span>⏱️ Needs Response</span>
                            <span className="text-[10px] uppercase font-black bg-white px-2 py-0.5 rounded-lg border border-orange-200">Pending</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAcceptPrepTime(ord.preparationTimeMinutes || 20);
                              setIsRejectReasonOpen(false);
                              setReviewingIncomingOrder(ord);
                              playOrderAlertChime();
                            }}
                            className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-rose-600 py-3 text-xs font-black text-white shadow-md hover:from-orange-600 hover:to-rose-700 cursor-pointer animate-pulse flex items-center justify-center gap-2"
                          >
                            <span>🔔</span>
                            <span>Review &amp; Accept / Reject Order (Open Pop-up)</span>
                          </button>
                        </div>
                      )}

                      {/* Case 2: Accepted -> This Box Kind (Active in Kitchen) */}
                      {isAccepted && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between rounded-xl bg-amber-50 p-2.5 border border-amber-200 text-xs font-bold text-amber-950">
                            <span className="flex items-center gap-1.5">
                              <span className="animate-spin">🍳</span>
                              <span>Cooking in Kitchen</span>
                            </span>
                            <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded-lg border border-amber-300 font-black text-amber-900">
                              ETA: {ord.preparationTimeMinutes || 20} Mins
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => handleUpdateAggregatorStatus(ord.id, 'food_ready')}
                            className="w-full rounded-2xl bg-purple-700 py-2.5 text-xs font-bold text-white hover:bg-purple-800 shadow-xs cursor-pointer text-center flex items-center justify-center gap-1.5"
                          >
                            <span>📦</span>
                            <span>Food Ready &amp; Packed (Alert Delivery Rider)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const items = ord.items.map((i) => ({
                                itemName: i.itemName,
                                quantity: i.quantity,
                                specialNotes: i.specialNotes,
                                foodType: i.foodType,
                              }));
                              setPrintKotSlip({
                                kotNumber: ord.kotNumber,
                                roundNumber: ord.roundNumber || 1,
                                orderType: ord.orderType,
                                outletName: activeOutlet?.name || 'Aura Dine',
                                tableNumber: ord.tableNumber || undefined,
                                roomNumber: ord.roomNumber || undefined,
                                serverName: ord.serverName || 'Delivery Hub',
                                guestName: `${ord.aggregatorBrand?.toUpperCase()} #${ord.aggregatorOrderId || ''} - ${ord.guestName || 'Diner'}`,
                                createdAt: ord.createdAt,
                                specialInstructions: ord.specialInstructions,
                                items,
                              });
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer text-center flex items-center justify-center gap-1.5"
                          >
                            <span>🖨️</span>
                            <span>Print Kitchen KOT Slip</span>
                          </button>
                        </div>
                      )}

                      {/* Case 3: Food Ready -> Waiting for Pickup */}
                      {isFoodReady && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between rounded-xl bg-purple-50 p-2.5 border border-purple-200 text-xs font-bold text-purple-950">
                            <span className="flex items-center gap-1.5">
                              <span>📦</span>
                              <span>Food Packed &amp; Ready</span>
                            </span>
                            <span className="text-[10px] bg-white px-2 py-0.5 rounded-lg border border-purple-300 font-bold text-purple-900 uppercase">
                              Waiting for Rider
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => handleUpdateAggregatorStatus(ord.id, 'dispatched')}
                            className="w-full rounded-2xl bg-slate-950 py-2.5 text-xs font-bold text-white hover:bg-slate-800 shadow-xs cursor-pointer text-center flex items-center justify-center gap-1.5"
                          >
                            <span>🛵</span>
                            <span>Hand to Rider &amp; Dispatch</span>
                          </button>
                        </div>
                      )}

                      {/* Case 4: Dispatched -> En Route */}
                      {isDispatched && (
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-800 bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
                          <span className="flex items-center gap-1.5">
                            <span>✅</span>
                            <span>Dispatched with Rider</span>
                          </span>
                          <span className="text-[10px] uppercase bg-emerald-100 px-2 py-0.5 rounded-lg font-black">
                            On the Way
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: KITCHEN DISPLAY SYSTEM (KDS) WITH STATION ROUTING       */}
      {/* ============================================================== */}
      {activeTab === 'kds' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-black text-slate-950">
                Kitchen Display System (KDS)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Live multi-station ticket queue with kitchen routing
              </p>
            </div>

            {/* Station Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 mr-1">Kitchen Station:</span>
              {[
                { id: 'all', label: 'All Stations' },
                { id: 'tandoor', label: '🔥 Tandoor' },
                { id: 'main_kitchen', label: '🍳 Main Curry' },
                { id: 'bar', label: '🍸 Bar' },
                { id: 'pantry', label: '🥗 Pantry' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setKdsStation(st.id as any)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold cursor-pointer transition-all ${
                    kdsStation === st.id
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {kots
              .filter((k) => {
                if (kdsStation === 'all') return true;
                return k.items.some((i) => (i.kitchenStation || 'main_kitchen') === kdsStation);
              })
              .map((kot) => (
                <div
                  key={kot.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-black text-slate-950">
                          {kot.kotNumber}
                        </span>
                        {kot.aggregatorBrand && kot.aggregatorBrand !== 'none' && (
                          <span
                            className={`rounded px-1.5 py-0.2 text-[9px] font-black uppercase text-white ${
                              kot.aggregatorBrand === 'swiggy' ? 'bg-orange-600' : 'bg-rose-600'
                            }`}
                          >
                            {kot.aggregatorBrand}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-bold">
                        {kot.orderType === 'dine_in'
                          ? `Table ${kot.tableNumber || ''} (${kot.tableSection || 'Hall'})`
                          : kot.orderType === 'delivery'
                          ? `Delivery: ${kot.guestName || 'Online Order'}`
                          : `Room Service: ${kot.roomNumber || ''}`}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        kot.status === 'ready'
                          ? 'bg-emerald-100 text-emerald-900'
                          : kot.status === 'preparing'
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {kot.status}
                    </span>
                  </div>

                  {/* Items Filtered by Station */}
                  <div className="space-y-1.5 text-xs">
                    {kot.items
                      .filter((i) => {
                        if (kdsStation === 'all') return true;
                        return (i.kitchenStation || 'main_kitchen') === kdsStation;
                      })
                      .map((i, idx) => (
                        <div key={idx} className="flex justify-between font-medium">
                          <span>
                            {i.foodType === 'veg' ? '🟢' : '🔴'} {i.quantity}x {i.itemName}
                          </span>
                          {i.specialNotes && (
                            <span className="text-[10px] text-amber-800 italic truncate max-w-[120px]">
                              {i.specialNotes}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>

                  {/* KDS Status Actions */}
                  <div className="pt-2 border-t border-slate-100 flex gap-2">
                    {kot.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => updateKotStatusAction(kot.id, 'preparing')}
                        className="flex-1 rounded-xl bg-blue-600 py-1.5 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer"
                      >
                        Start Cooking 🍳
                      </button>
                    )}
                    {kot.status === 'preparing' && (
                      <button
                        type="button"
                        onClick={() => updateKotStatusAction(kot.id, 'ready')}
                        className="flex-1 rounded-xl bg-emerald-600 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer"
                      >
                        Mark Ready 🔔
                      </button>
                    )}
                    {kot.status === 'ready' && (
                      <button
                        type="button"
                        onClick={() => updateKotStatusAction(kot.id, 'served')}
                        className="flex-1 rounded-xl bg-slate-950 py-1.5 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
                      >
                        Mark Served 🍽️
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: CASHIER SHIFTS & DAY-END Z-REPORT                       */}
      {/* ============================================================== */}
      {activeTab === 'shifts' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-700 font-bold text-xl">
                📊
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-black text-slate-950">
                    Cashier Shift &amp; Day-End Z-Report
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                      currentShift ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {currentShift ? 'Active Shift' : 'Drawer Closed'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Shift opening float, multi-tender sales reconciliation, cash variance audit, and official Z-Report
                </p>
              </div>
            </div>

            {currentShift ? (
              <button
                type="button"
                onClick={() => setIsCloseShiftModalOpen(true)}
                className="rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 shadow-xs cursor-pointer"
              >
                Close Shift &amp; Print Z-Report ➔
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsOpenShiftModalOpen(true)}
                className="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 shadow-xs cursor-pointer"
              >
                + Open New Cashier Shift
              </button>
            )}
          </div>

          {currentShift ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500">Active Shift:</span>
                <p className="font-display text-base font-black text-slate-950">{currentShift.shiftName}</p>
                <p className="text-[10px] text-slate-400">Opened by: {currentShift.openedBy}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500">Opening Cash Float:</span>
                <p className="font-display text-base font-black text-emerald-700">
                  ₹{Number(currentShift.openingCash).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-slate-400">Drawer starting cash balance</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500">Shift Started At:</span>
                <p className="font-mono text-xs font-bold text-slate-800">
                  {new Date(currentShift.openedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-[10px] text-slate-400">{new Date(currentShift.openedAt).toLocaleDateString('en-IN')}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500">Cashier Actions:</span>
                <button
                  type="button"
                  onClick={() => setIsCloseShiftModalOpen(true)}
                  className="w-full rounded-lg bg-slate-100 hover:bg-slate-200 py-1.5 text-xs font-bold text-slate-800 cursor-pointer text-center"
                >
                  End Shift Reconciliation
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-xs text-slate-500 font-medium">
              Click <strong className="text-slate-900 font-bold">&quot;+ Open New Cashier Shift&quot;</strong> to declare starting drawer cash float and begin shift session tracking.
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 6: F&B SETTINGS & HARDWARE CONTROL CENTER                  */}
      {/* ============================================================== */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-700 font-bold text-2xl border border-indigo-100">
                ⚙️
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-black text-slate-950">
                    Aura Dine Control &amp; Configuration Center
                  </h2>
                  <span className="rounded-full bg-indigo-100 text-indigo-800 px-2.5 py-0.5 text-[10px] font-black uppercase">
                    Admin Hub
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Centralized setup for floor plans, menu catalog, Swiggy &amp; Zomato API keys, thermal printers, and SOPs
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setActiveTab('tables')}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
              >
                ← Return to Tables
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pos')}
                className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 shadow-xs cursor-pointer"
              >
                Open POS Counter →
              </button>
            </div>
          </div>

          {/* Sub-Tabs Navigation */}
          <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200 gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setSettingsSubTab('tables')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                settingsSubTab === 'tables'
                  ? 'bg-white text-slate-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <span>🪑 Floor &amp; Tables Master</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                {filteredTables.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSettingsSubTab('menu')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                settingsSubTab === 'menu'
                  ? 'bg-white text-slate-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <span>📋 Menu Catalog &amp; GST</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                {allItems.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSettingsSubTab('aggregators')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                settingsSubTab === 'aggregators'
                  ? 'bg-white text-slate-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <span>🛵 Swiggy &amp; Zomato API</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                Live
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSettingsSubTab('hardware')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                settingsSubTab === 'hardware'
                  ? 'bg-white text-slate-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <span>🖨️ POS Terminals &amp; Printers</span>
            </button>
            <button
              type="button"
              onClick={() => setSettingsSubTab('sop')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                settingsSubTab === 'sop'
                  ? 'bg-white text-slate-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <span>📖 SOP &amp; User Manual</span>
            </button>
          </div>

          {/* SUB-PANEL 1: FLOOR & TABLES MASTER */}
          {settingsSubTab === 'tables' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div>
                  <h3 className="font-display text-base font-black text-slate-950">
                    Dining Room Tables Inventory
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Manage table numbers, guest capacities, and floor zones for {activeOutlet?.name || 'this Outlet'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewTableOutletId(selectedOutletId);
                    setIsAddTableModalOpen(true);
                  }}
                  className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <span>+ Add Dining Table</span>
                </button>
              </div>

              {filteredTables.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                  <p className="text-sm font-bold text-slate-700">No tables configured for this outlet yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setNewTableOutletId(selectedOutletId);
                      setIsAddTableModalOpen(true);
                    }}
                    className="mt-3 rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
                  >
                    + Create First Table
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-100 bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Table Identifier</th>
                        <th className="px-4 py-3">Floor Zone / Section</th>
                        <th className="px-4 py-3">Seating Capacity</th>
                        <th className="px-4 py-3">Live Status</th>
                        <th className="px-4 py-3">Active Order</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {filteredTables.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-950">
                            Table {t.tableNumber}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                              {t.section}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            👥 {t.capacity} Covers
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                                t.status === 'occupied'
                                  ? 'bg-amber-100 text-amber-800'
                                  : t.status === 'billed'
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-700">
                            {t.activeTotalAmount ? `₹${Number(t.activeTotalAmount).toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                setTableToEdit(t);
                                setEditTableNumber(t.tableNumber);
                                setEditTableCapacity(t.capacity);
                                setEditTableSection(t.section);
                                setIsEditTableModalOpen(true);
                              }}
                              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setTableToDelete(t)}
                              className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50 cursor-pointer"
                            >
                              🗑️ Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SUB-PANEL 2: MENU CATALOG & GST */}
          {settingsSubTab === 'menu' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div>
                  <h3 className="font-display text-base font-black text-slate-950">
                    Menu Dishes &amp; Indian GST 5% Master (SAC 996331)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Catalog dishes, prices, dietary classification, kitchen routing stations, and live stock 86&apos;ing
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setNewDishCategoryId(uniqueCategories[0]?.id || '');
                      setIsAddDishModalOpen(true);
                    }}
                    className="rounded-xl bg-slate-950 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <span>+ Add New Dish</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddCategoryModalOpen(true)}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <span>+ Add Category</span>
                  </button>
                </div>
              </div>

              {/* Unique Categories Filter */}
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  All Categories ({allItems.length})
                </button>
                {uniqueCategories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategory(c.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      selectedCategory === c.id
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {c.name} ({c.items.length})
                  </button>
                ))}
              </div>

              {/* Menu Items Master Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Dish Particulars</th>
                      <th className="px-4 py-3">Dietary</th>
                      <th className="px-4 py-3">Base Tariff</th>
                      <th className="px-4 py-3">GST Slab</th>
                      <th className="px-4 py-3">Kitchen Station</th>
                      <th className="px-4 py-3 text-right">Live Stock Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {filteredItems.map((it) => (
                      <tr key={it.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {it.itemCode}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-950">{it.name}</p>
                          {it.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1">{it.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              it.foodType === 'veg'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {it.foodType === 'veg' ? '🟢 Veg' : '🔴 Non-Veg'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-950">
                          ₹{Number(it.price).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                          SAC 996331 (5%)
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                            {it.kitchenStation ? it.kitchenStation.replace('_', ' ') : 'Main Kitchen'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleItemStock(it.id, it.isOutOfStock)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                              it.isOutOfStock
                                ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                                : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            }`}
                          >
                            {it.isOutOfStock ? '⚠️ 86 (Out of Stock)' : '✓ In Stock'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-PANEL 3: SWIGGY & ZOMATO API & WEBHOOKS */}
          {settingsSubTab === 'aggregators' && (
            <div className="space-y-6">
              <form onSubmit={handleSaveAggregatorSettings} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Swiggy Integration Card */}
                  <div className="rounded-3xl border border-orange-200 bg-orange-50/30 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-orange-600 text-white font-black text-lg">
                          S
                        </span>
                        <div>
                          <h4 className="font-display text-base font-black text-orange-950">
                            Swiggy Direct Merchant API
                          </h4>
                          <p className="text-xs text-orange-800/80 font-medium">
                            UrbanPiper &amp; Swiggy Partner POS Ingestion
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-orange-800">
                        {swiggyRidInput ? 'Active' : 'Unlinked'}
                      </span>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="text-xs font-bold text-slate-700">Swiggy Restaurant ID (RID)</label>
                        <input
                          type="text"
                          placeholder="e.g. SWIGGY-DEL-10492"
                          value={swiggyRidInput}
                          onChange={(e) => setSwiggyRidInput(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-950 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700">Swiggy Merchant Secret API Key</label>
                        <input
                          type="password"
                          placeholder="swiggy_live_sec_..."
                          value={swiggyApiKeyInput}
                          onChange={(e) => setSwiggyApiKeyInput(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-slate-950 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="text-xs font-bold text-slate-700 mb-1 block">Default Kitchen Prep Time</label>
                          <CustomDropdown
                            value={String(swiggyPrepMinsInput)}
                            onChange={(val) => setSwiggyPrepMinsInput(Number(val))}
                            size="sm"
                            options={[
                              { value: '15', label: '15 Minutes' },
                              { value: '20', label: '20 Minutes' },
                              { value: '25', label: '25 Minutes' },
                              { value: '30', label: '30 Minutes' },
                              { value: '40', label: '40 Minutes' },
                            ]}
                            aria-label="Swiggy Default Kitchen Prep Time"
                          />
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className="flex items-center gap-2 cursor-pointer pb-2">
                            <input
                              type="checkbox"
                              checked={swiggyAutoAcceptInput}
                              onChange={(e) => setSwiggyAutoAcceptInput(e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                            />
                            <span className="text-xs font-bold text-slate-800">Auto-Accept Orders</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Zomato Integration Card */}
                  <div className="rounded-3xl border border-rose-200 bg-rose-50/30 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-600 text-white font-black text-lg">
                          Z
                        </span>
                        <div>
                          <h4 className="font-display text-base font-black text-rose-950">
                            Zomato Merchant API
                          </h4>
                          <p className="text-xs text-rose-800/80 font-medium">
                            Zomato Order Ingestion &amp; Live Rider Tracking
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-rose-800">
                        {zomatoResIdInput ? 'Active' : 'Unlinked'}
                      </span>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="text-xs font-bold text-slate-700">Zomato Restaurant ID (ResID)</label>
                        <input
                          type="text"
                          placeholder="e.g. ZOMATO-MUM-8821"
                          value={zomatoResIdInput}
                          onChange={(e) => setZomatoResIdInput(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-950 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700">Zomato Merchant API Key</label>
                        <input
                          type="password"
                          placeholder="zomato_live_key_..."
                          value={zomatoApiKeyInput}
                          onChange={(e) => setZomatoApiKeyInput(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-slate-950 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="text-xs font-bold text-slate-700 mb-1 block">Default Kitchen Prep Time</label>
                          <CustomDropdown
                            value={String(zomatoPrepMinsInput)}
                            onChange={(val) => setZomatoPrepMinsInput(Number(val))}
                            size="sm"
                            options={[
                              { value: '15', label: '15 Minutes' },
                              { value: '20', label: '20 Minutes' },
                              { value: '25', label: '25 Minutes' },
                              { value: '30', label: '30 Minutes' },
                              { value: '40', label: '40 Minutes' },
                            ]}
                            aria-label="Zomato Default Kitchen Prep Time"
                          />
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className="flex items-center gap-2 cursor-pointer pb-2">
                            <input
                              type="checkbox"
                              checked={zomatoAutoAcceptInput}
                              onChange={(e) => setZomatoAutoAcceptInput(e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                            />
                            <span className="text-xs font-bold text-slate-800">Auto-Accept Orders</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Webhook Gateway Info & Save Button */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-700">
                      Live Inbound Webhook Endpoint:
                    </span>
                    <p className="font-mono text-xs font-bold text-indigo-700 bg-slate-50 p-2 rounded-xl border border-slate-200 select-all">
                      POST /hotel/restaurant/webhooks/aggregators
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Configure this URL in your Swiggy Partner and Zomato Merchant developer dashboards to stream real-time orders directly into Aura Dine.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-xl bg-slate-950 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                    >
                      {submitting ? 'Saving...' : '💾 Save Aggregator Credentials'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* SUB-PANEL 4: POS HARDWARE & PRINTERS */}
          {settingsSubTab === 'hardware' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-50 text-indigo-700 font-bold text-xl">
                  🖨️
                </span>
                <div>
                  <h4 className="font-display text-base font-black text-slate-950">
                    80mm ESC/POS Thermal Printers
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Industry standard 80mm thermal receipts with auto-cutter for KOTs and guest bills
                  </p>
                </div>
                <div className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-100">
                  <div className="flex justify-between py-1">
                    <span className="font-medium">Paper Width:</span>
                    <span className="font-bold">80mm (576 dots/line)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="font-medium">Command Emulation:</span>
                    <span className="font-bold">ESC/POS Standard</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="font-medium">Interface Bridges:</span>
                    <span className="font-bold">USB Web Serial / LAN IP</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-50 text-amber-700 font-bold text-xl">
                  👨‍🍳
                </span>
                <div>
                  <h4 className="font-display text-base font-black text-slate-950">
                    Kitchen Station KOT Routing
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Split ticket items automatically to corresponding kitchen department printers
                  </p>
                </div>
                <div className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-100">
                  <div className="flex justify-between py-1">
                    <span className="font-medium">Tandoor &amp; Starters:</span>
                    <span className="font-bold text-amber-800">Station Printer 1</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="font-medium">Main Curry &amp; Gravies:</span>
                    <span className="font-bold text-indigo-800">Station Printer 2</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="font-medium">Bar &amp; Beverages:</span>
                    <span className="font-bold text-teal-800">Station Printer 3</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-xl">
                  💳
                </span>
                <div>
                  <h4 className="font-display text-base font-black text-slate-950">
                    EDC Card Machines &amp; Cash Drawer
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Pine Labs, Paytm, Innoviti POS EDC integration &amp; RJ11 24V drawer kick
                  </p>
                </div>
                <div className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-100">
                  <div className="flex justify-between py-1">
                    <span className="font-medium">EDC Card Settlement:</span>
                    <span className="font-bold text-emerald-700">Direct Swipe / Tap</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="font-medium">Cash Drawer Pulse:</span>
                    <span className="font-bold">RJ11 Kick on Bill Settle</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="font-medium">Dynamic UPI QR:</span>
                    <span className="font-bold text-emerald-700">Scan-to-Pay Countdown</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-PANEL 5: SOP & USER MANUAL */}
          {settingsSubTab === 'sop' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="font-display text-lg font-black text-slate-950">
                  Aura Dine F&amp;B Operating System Standard Operating Procedures
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Comprehensive reference for captains, cashiers, chefs, and hospitality managers
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700">
                <div className="rounded-2xl bg-slate-50 p-5 space-y-2 border border-slate-200">
                  <span className="font-black text-slate-950 uppercase tracking-wider text-[11px]">
                    1. Table Seating &amp; Multi-Round KOTs
                  </span>
                  <p className="leading-relaxed">
                    Select a table on the Floor Plan to open the Touch POS. Punch items for Round 1. Once dispatched, the table turns amber with an elapsed timer. To add subsequent items as the party orders more, click &quot;+ Add Round KOT&quot; — Aura Dine automatically stamps Round #2, Round #3 and routes items to the kitchen without overwriting previous dishes.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5 space-y-2 border border-slate-200">
                  <span className="font-black text-slate-950 uppercase tracking-wider text-[11px]">
                    2. Charge to Room 302 (Hotel Integrated Mode)
                  </span>
                  <p className="leading-relaxed">
                    When in-house hotel guests dine, select &quot;Charge to Room Folio&quot; during settlement. Enter the room number or select from the live in-house guest list. Aura Dine posts the exact food &amp; beverage balance to the resident&apos;s hotel cashiering folio under SAC 996331 at 5% GST, consolidating their checkout invoice seamlessly.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5 space-y-2 border border-slate-200">
                  <span className="font-black text-slate-950 uppercase tracking-wider text-[11px]">
                    3. Table Merging &amp; Shifting
                  </span>
                  <p className="leading-relaxed">
                    For large parties occupying multiple tables (e.g. Table 4 and Table 5), use &quot;Merge Tables&quot; to combine the bills under a master table. If guests wish to move from indoor to outdoor patio seating, click &quot;Shift Table&quot; to transfer the running order and timers to the target table instantly.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5 space-y-2 border border-slate-200">
                  <span className="font-black text-slate-950 uppercase tracking-wider text-[11px]">
                    4. Equal 2-to-5 Way Split Billing
                  </span>
                  <p className="leading-relaxed">
                    When diners wish to split the check, open &quot;Settle &amp; Bill&quot; and toggle &quot;Split Bill&quot;. Select 2, 3, 4, or 5 equal splits. Aura Dine generates separate split fractions (e.g. Split 1 of 3: ₹450), allowing each guest to pay individually via Cash, Card EDC, or dynamic UPI QR.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5 space-y-2 border border-slate-200">
                  <span className="font-black text-slate-950 uppercase tracking-wider text-[11px]">
                    5. Swiggy &amp; Zomato Aggregator Delivery Hub
                  </span>
                  <p className="leading-relaxed">
                    Online delivery orders stream in real-time. Upon order arrival, a dual-tone alert chime sounds and an Accept/Reject pop-up opens with customer details and items. Select prep time (15m to 40m) to accept, which automatically dispatches the KOT to the kitchen and sets a live cooking countdown. Once ready, print the kitchen slip and hand off to the rider using the delivery OTP.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5 space-y-2 border border-slate-200">
                  <span className="font-black text-slate-950 uppercase tracking-wider text-[11px]">
                    6. Cashier Drawer Float &amp; Day-End Z-Report
                  </span>
                  <p className="leading-relaxed">
                    At shift start, the cashier declares their opening drawer float (e.g. ₹2,000). At shift close, the cashier counts physical cash in the drawer. Aura Dine calculates variance (Over / Short), audits all Cash, Card, UPI, and Room Folio collections, and prints an 80mm ESC/POS Day-End Z-Report.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: AURA DINE SETTLE & BILL MODAL (Single & Split Bill)   */}
      {/* ============================================================== */}
      {settlingKot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="relative flex w-full max-w-lg flex-col rounded-3xl bg-white p-6 shadow-2xl text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-display text-lg font-black text-slate-950">
                  Aura Dine Bill Settlement &amp; Payment
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {settlingKot.kotNumber} · Table {settlingKot.tableNumber || 'Takeaway'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettlingKot(null)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Split Bill Toggle */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSplitMode(false)}
                className={`flex-1 rounded-lg py-1.5 cursor-pointer ${
                  !splitMode ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600'
                }`}
              >
                Single Tender Settlement
              </button>
              <button
                type="button"
                onClick={() => setSplitMode(true)}
                className={`flex-1 rounded-lg py-1.5 cursor-pointer ${
                  splitMode ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                Split Bill Engine (2-5 Ways)
              </button>
            </div>

            {/* Bill Summary */}
            <div className="rounded-2xl bg-slate-50 p-4 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{Number(settlingKot.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>CGST (2.5% SAC 996331):</span>
                <span>₹{(Number(settlingKot.subtotal) * 0.025).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>SGST (2.5% SAC 996331):</span>
                <span>₹{(Number(settlingKot.subtotal) * 0.025).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-black text-slate-950 border-t border-slate-200 pt-1.5">
                <span>Total Amount:</span>
                <span>₹{Number(settlingKot.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Split Mode Form */}
            {splitMode ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Split into Equal Parts:</label>
                  <div className="flex gap-2 mt-1">
                    {[2, 3, 4, 5].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setSplitCount(cnt)}
                        className={`flex-1 rounded-xl py-2 text-xs font-bold border cursor-pointer ${
                          splitCount === cnt
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {cnt} Ways (₹{(Number(settlingKot.totalAmount) / cnt).toFixed(0)})
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSetupSplit(settlingKot.id)}
                  className="w-full rounded-2xl bg-amber-600 py-3 text-xs font-bold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Creating Splits...' : `Confirm ${splitCount}-Way Split Bill`}
                </button>
              </div>
            ) : (
              /* Single Tender Settlement Options */
              <div className="space-y-4">
                {operatingMode === 'hotel' && checkedInRooms.length > 0 && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
                    <p className="text-xs font-bold text-emerald-950">
                      Option A: 1-Click &quot;Charge to Room Folio&quot;
                    </p>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1">
                        <CustomDropdown
                          value={selectedRoomNumber}
                          onChange={(val) => setSelectedRoomNumber(val)}
                          size="sm"
                          options={checkedInRooms.map((r) => ({
                            value: r.number,
                            label: `Room ${r.number} — ${r.guestName}`,
                            badge: `Rm ${r.number}`,
                          }))}
                          aria-label="Select room for folio charge"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => {
                          const activeRoom = checkedInRooms.find((r) => r.number === selectedRoomNumber);
                          if (activeRoom) {
                            handleChargeToRoom(settlingKot.id, activeRoom.number, activeRoom.reservationId);
                          }
                        }}
                        className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
                      >
                        {submitting ? 'Posting...' : 'Charge to Folio'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Direct Tender (Cash / UPI / POS Machine) */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-700">
                    Option B: Direct Cashiering Settlement
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSettleMethod('cash')}
                      className={`rounded-xl py-2 text-xs font-bold border cursor-pointer ${
                        settleMethod === 'cash'
                          ? 'bg-slate-950 text-white border-slate-950'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      💵 Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettleMethod('upi')}
                      className={`rounded-xl py-2 text-xs font-bold border cursor-pointer ${
                        settleMethod === 'upi'
                          ? 'bg-slate-950 text-white border-slate-950'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      📱 Scan UPI QR
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettleMethod('pos_machine')}
                      className={`rounded-xl py-2 text-xs font-bold border cursor-pointer ${
                        settleMethod === 'pos_machine'
                          ? 'bg-slate-950 text-white border-slate-950'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      💳 EDC POS Card
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleDirectSettlement(settlingKot.id)}
                    className="w-full mt-2 rounded-2xl bg-slate-950 py-3 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? 'Settling...' : `Settle Bill (₹${settlingKot.totalAmount}) & Vacate Table`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: TABLE SHIFT / TRANSFER                                */}
      {/* ============================================================== */}
      {shiftingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="relative flex w-full max-w-md flex-col rounded-3xl bg-white p-6 shadow-2xl text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-display text-base font-black text-slate-950">
                  Shift Table Order (Transfer)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Transfer active order from Table {shiftingTable.tableNumber} to a vacant table
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShiftingTable(null)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Choose Vacant Destination Table:</label>
              <div className="grid grid-cols-3 gap-2">
                {filteredTables
                  .filter((t) => t.status === 'vacant' && t.id !== shiftingTable.id)
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      disabled={submitting}
                      onClick={() => handleExecuteTableTransfer(t.id)}
                      className="rounded-xl border border-slate-200 p-2.5 text-center hover:border-slate-950 hover:bg-slate-50 cursor-pointer font-bold text-xs"
                    >
                      {t.tableNumber} ({t.capacity}c)
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: TABLE MERGE                                           */}
      {/* ============================================================== */}
      {mergingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="relative flex w-full max-w-md flex-col rounded-3xl bg-white p-6 shadow-2xl text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-display text-base font-black text-slate-950">
                  Merge Tables for Large Gathering
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Combine Table {mergingTable.tableNumber} with another table into a single master bill
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMergingTable(null)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Select Adjacent Table to Merge:</label>
              <div className="grid grid-cols-3 gap-2">
                {filteredTables
                  .filter((t) => t.id !== mergingTable.id)
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      disabled={submitting}
                      onClick={() => handleExecuteTableMerge(t.id)}
                      className="rounded-xl border border-slate-200 p-2.5 text-center hover:border-purple-600 hover:bg-purple-50 cursor-pointer font-bold text-xs"
                    >
                      {t.tableNumber} [{t.status}]
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: ADD TABLE MODAL                                       */}
      {/* ============================================================== */}
      {isAddTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="relative flex w-full max-w-md flex-col rounded-3xl bg-white p-6 shadow-2xl text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-display text-base font-black text-slate-950">
                  Add Dining Table
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Configure a new table for floor plan seating and KOT orders
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTableModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTable} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Dining Outlet</label>
                <CustomDropdown
                  value={newTableOutletId || selectedOutletId}
                  onChange={(val) => setNewTableOutletId(val)}
                  size="sm"
                  options={outlets.map((o) => ({
                    value: o.id,
                    label: `${o.name} ${o.isStandalone ? '(Standalone)' : ''}`,
                  }))}
                  aria-label="Dining Outlet"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Table Number / ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. T-11, T-12, Bar-01"
                    value={newTableNumber}
                    onChange={(e) => setNewTableNumber(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-950 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Covers / Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={newTableCapacity}
                    onChange={(e) => setNewTableCapacity(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-950 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Floor Zone / Section</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {['Main AC Hall', 'Open Terrace', 'Poolside Deck', 'Bar & Lounge', 'Private Dining Room'].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        setNewTableSection(sec);
                        setCustomSectionInput('');
                      }}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold cursor-pointer transition-all ${
                        newTableSection === sec && !customSectionInput
                          ? 'bg-slate-950 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {sec}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Or enter custom zone name (e.g. Mezzanine Floor)"
                  value={customSectionInput}
                  onChange={(e) => setCustomSectionInput(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-slate-950 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddTableModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-slate-950 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {submitting ? 'Creating Table...' : '+ Create Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: EDIT TABLE MODAL                                      */}
      {/* ============================================================== */}
      {isEditTableModalOpen && tableToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="relative flex w-full max-w-md flex-col rounded-3xl bg-white p-6 shadow-2xl text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-display text-base font-black text-slate-950">
                  Edit Table {tableToEdit.tableNumber}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Update table identifier, covers, or assigned floor zone
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditTableModalOpen(false);
                  setTableToEdit(null);
                }}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateTable} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Table Number</label>
                  <input
                    type="text"
                    required
                    value={editTableNumber}
                    onChange={(e) => setEditTableNumber(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-950 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Capacity / Covers</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={editTableCapacity}
                    onChange={(e) => setEditTableCapacity(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-950 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Floor Zone / Section</label>
                <input
                  type="text"
                  required
                  value={editTableSection}
                  onChange={(e) => setEditTableSection(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-950 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditTableModalOpen(false);
                    setTableToEdit(null);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-slate-950 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: DELETE TABLE CONFIRMATION                             */}
      {/* ============================================================== */}
      {tableToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="relative flex w-full max-w-sm flex-col rounded-3xl bg-white p-6 shadow-2xl text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <h3 className="font-display text-base font-black text-slate-950">
                  Remove Table {tableToDelete.tableNumber}?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTableToDelete(null)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-950">{tableToDelete.tableNumber}</span> ({tableToDelete.section}, {tableToDelete.capacity} covers)? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTableToDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteTable}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {submitting ? 'Deleting...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 7: ADD DISH TO MENU                                      */}
      {/* ============================================================== */}
      {isAddDishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="relative flex w-full max-w-md flex-col rounded-3xl bg-white p-6 shadow-2xl text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-display text-base font-black text-slate-950">
                  Add New Menu Item
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Add a dish to your digital menu master with SAC 996331 &amp; 5% GST
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDishModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDish} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Menu Category</label>
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <CustomDropdown
                      value={newDishCategoryId || uniqueCategories[0]?.id || ''}
                      onChange={(val) => setNewDishCategoryId(val)}
                      size="sm"
                      options={uniqueCategories.map((c) => ({
                        value: c.id,
                        label: c.name,
                      }))}
                      aria-label="Menu Category"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddDishModalOpen(false);
                      setIsAddCategoryModalOpen(true);
                    }}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
                  >
                    + New
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Dish Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paneer Lababdar, Murgh Makhani, Butter Naan"
                  value={newDishName}
                  onChange={(e) => setNewDishName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-950 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Price (₹ INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="340.00"
                    value={newDishPrice}
                    onChange={(e) => setNewDishPrice(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-950 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Item Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. APP-05"
                    value={newDishCode}
                    onChange={(e) => setNewDishCode(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-slate-950 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Dietary Classification</label>
                <div className="mt-1.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewDishFoodType('veg')}
                    className={`flex-1 rounded-xl p-2 text-xs font-bold cursor-pointer transition-all border ${
                      newDishFoodType === 'veg'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    🟢 Veg
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewDishFoodType('non_veg')}
                    className={`flex-1 rounded-xl p-2 text-xs font-bold cursor-pointer transition-all border ${
                      newDishFoodType === 'non_veg'
                        ? 'border-rose-500 bg-rose-50 text-rose-900'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    🔴 Non-Veg
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewDishFoodType('egg')}
                    className={`flex-1 rounded-xl p-2 text-xs font-bold cursor-pointer transition-all border ${
                      newDishFoodType === 'egg'
                        ? 'border-amber-500 bg-amber-50 text-amber-900'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    🟡 Egg
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Kitchen Station Routing</label>
                <CustomDropdown
                  value={newDishStation}
                  onChange={(val) => setNewDishStation(val as any)}
                  size="sm"
                  options={[
                    { value: 'main_kitchen', label: '🍳 Main Curry & Gravy Station' },
                    { value: 'tandoor', label: '🔥 Tandoor & Clay Oven Station' },
                    { value: 'bar', label: '🍸 Bar Counter & Beverages' },
                    { value: 'pantry', label: '🥗 Pantry, Salads & Desserts' },
                    { value: 'bakery', label: '🥖 Bakery & Breads' },
                  ]}
                  aria-label="Kitchen Station Routing"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Cottage cheese cooked in rich creamy tomato and melon seed gravy"
                  value={newDishDescription}
                  onChange={(e) => setNewDishDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-slate-950 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 text-[11px] font-bold text-slate-600">
                <span>Tax Compliance: SAC 996331</span>
                <span>GST: 5% (2.5% CGST + 2.5% SGST)</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddDishModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-slate-950 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {submitting ? 'Adding Dish...' : '+ Add Dish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 8: ADD MENU CATEGORY                                     */}
      {/* ============================================================== */}
      {isAddCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="relative flex w-full max-w-sm flex-col rounded-3xl bg-white p-6 shadow-2xl text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-display text-base font-black text-slate-950">
                  New Menu Category
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Organize dishes into menu sections
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sizzlers & Grills, Mocktails, Soups"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-950 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-slate-950 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {submitting ? 'Creating...' : '+ Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 9: AURA DINE WORKFLOW & SOP GUIDE                        */}
      {/* ============================================================== */}
      {isSopGuideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="relative flex w-full max-w-3xl max-h-[90vh] overflow-y-auto flex-col rounded-3xl bg-white p-6 sm:p-8 shadow-2xl text-slate-900 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500/10 text-amber-700 font-bold text-xl">
                  🍽️
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg sm:text-xl font-black text-slate-950">
                      Aura Dine F&amp;B Operations Guide
                    </h3>
                    <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-black uppercase">
                      Enterprise SOP
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Standard operating procedures for table layout, KOT punching, KDS, and cashiering
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSopGuideModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <div className="flex items-center gap-2 font-black text-slate-950 text-sm">
                  <span>1. 🪑 Floor Plan &amp; Table Setup</span>
                </div>
                <p className="text-slate-600 leading-relaxed font-medium">
                  Create physical tables with seating covers and floor zones (<span className="font-bold text-slate-900">Main AC Hall, Open Terrace, Bar, Poolside</span>). Table cards update live: Emerald for Vacant, Amber for Occupied with active bill and timer, Blue for Billed, Purple for Merged.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <div className="flex items-center gap-2 font-black text-slate-950 text-sm">
                  <span>2. 📝 KOT Punching &amp; Multi-Rounds</span>
                </div>
                <p className="text-slate-600 leading-relaxed font-medium">
                  Select a table or room, filter dishes by Veg/Non-Veg, add special cooking notes (<span className="font-bold text-slate-900">&quot;Jain, less spicy&quot;</span>), and fire to kitchen. Guests can order in multiple rounds (Round 1 starters, Round 2 mains) without losing bill continuity.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <div className="flex items-center gap-2 font-black text-slate-950 text-sm">
                  <span>3. 👨‍🍳 Kitchen Display System (KDS)</span>
                </div>
                <p className="text-slate-600 leading-relaxed font-medium">
                  Chefs view tickets in real-time categorized by table and round. Kitchen staff click <span className="font-bold text-slate-900">&quot;Start Cooking&quot;</span> ➔ <span className="font-bold text-slate-900">&quot;Ready to Serve&quot;</span> to notify floor captains immediately.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <div className="flex items-center gap-2 font-black text-slate-950 text-sm">
                  <span>4. 🔗 Table Merging &amp; Shifting</span>
                </div>
                <p className="text-slate-600 leading-relaxed font-medium">
                  For large banquets or big parties, click <span className="font-bold text-slate-900">&quot;Merge&quot;</span> to combine adjacent tables into one unified check. If guests change seats, click <span className="font-bold text-slate-900">&quot;Shift ➔&quot;</span> to transfer the active order cleanly.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <div className="flex items-center gap-2 font-black text-slate-950 text-sm">
                  <span>5. 🏨 Hotel Room Folio Transfer</span>
                </div>
                <p className="text-slate-600 leading-relaxed font-medium">
                  In Connected Hotel Mode, click <span className="font-bold text-slate-900">&quot;Charge to Room&quot;</span>. The system automatically verifies active in-house reservations and transfers the bill to Room Folio under SAC 996331 at 5% GST with zero double-entry.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <div className="flex items-center gap-2 font-black text-slate-950 text-sm">
                  <span>6. 💳 Split Billing &amp; 80mm ESC/POS</span>
                </div>
                <p className="text-slate-600 leading-relaxed font-medium">
                  Split checks 2 to 5 ways equally or by custom tender. Collect payments via Cash, Dynamic UPI QR with countdown timer, or POS EDC Card Machine. Print 80mm thermal kitchen slips and GST customer receipts with FSSAI &amp; GSTIN compliance.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsSopGuideModalOpen(false)}
                className="rounded-xl bg-slate-950 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer shadow-xs"
              >
                Got It, Return to POS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 10: OPEN CASHIER SHIFT FLOAT                             */}
      {/* ============================================================== */}
      {isOpenShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="relative flex w-full max-w-sm flex-col rounded-3xl bg-white p-6 shadow-2xl text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-display text-base font-black text-slate-950">
                  Open Cashier Shift
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Declare starting drawer cash float balance
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpenShiftModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOpenShift} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Starting Cash Float (₹ INR)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={shiftOpeningCashInput}
                  onChange={(e) => setShiftOpeningCashInput(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-900 focus:border-slate-950 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpenShiftModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-slate-950 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {submitting ? 'Opening...' : 'Confirm Open Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 11: CLOSE SHIFT RECONCILIATION                           */}
      {/* ============================================================== */}
      {isCloseShiftModalOpen && currentShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="relative flex w-full max-w-md flex-col rounded-3xl bg-white p-6 shadow-2xl text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-display text-base font-black text-slate-950">
                  End Shift Reconciliation
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Count physical cash in drawer to generate Day-End Z-Report
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCloseShiftModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCloseShift} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Physical Counted Cash in Drawer (₹ INR)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="e.g. 14500.00"
                  value={shiftClosingCashInput}
                  onChange={(e) => setShiftClosingCashInput(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-base font-black text-slate-900 focus:border-slate-950 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Reconciliation Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. All checks settled cleanly. ₹100 tip paid out to steward."
                  value={shiftClosingNotes}
                  onChange={(e) => setShiftClosingNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:border-slate-950 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCloseShiftModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-slate-950 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {submitting ? 'Auditing Shift...' : 'Close Shift & Print Z-Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 12: DAY-END Z-REPORT (80MM THERMAL SLIP AUDIT)           */}
      {/* ============================================================== */}
      {zReportData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="relative flex w-full max-w-md max-h-[90vh] overflow-y-auto flex-col rounded-3xl bg-white p-6 shadow-2xl text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧾</span>
                <div>
                  <h3 className="font-display text-base font-black text-slate-950">
                    Official Day-End Z-Report
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Shift Reconciliation Audit #{zReportData.shiftId?.slice(0, 8)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setZReportData(null)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 80mm ESC/POS Thermal Paper Preview */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs space-y-2.5">
              <div className="text-center border-b border-dashed border-slate-300 pb-2">
                <p className="font-black text-sm uppercase">{zReportData.outletName}</p>
                <p className="text-[10px] text-slate-500 font-bold">DAILY SALES &amp; TENDER RECONCILIATION</p>
                <p className="text-[10px] text-slate-400">Shift: {zReportData.shiftName}</p>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Shift Opened:</span>
                  <span>{new Date(zReportData.openedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shift Closed:</span>
                  <span>{new Date(zReportData.closedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Tickets (KOTs):</span>
                  <span className="font-bold">{zReportData.kotsCount}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Opening Float:</span>
                  <span>₹{zReportData.openingCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash Sales:</span>
                  <span>₹{zReportData.cashSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Expected Drawer Cash:</span>
                  <span>₹{zReportData.expectedCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Physical Counted Cash:</span>
                  <span>₹{zReportData.closingCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black border-t border-slate-200 pt-1">
                  <span>Cash Variance:</span>
                  <span className={zReportData.cashVariance === 0 ? 'text-emerald-700' : 'text-rose-700'}>
                    ₹{zReportData.cashVariance.toFixed(2)} {zReportData.cashVariance === 0 ? '(Exact)' : '(Variance)'}
                  </span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>UPI / QR Sales:</span>
                  <span>₹{zReportData.totalUpi.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Card POS Machine:</span>
                  <span>₹{zReportData.totalCard.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Swiggy Deliveries:</span>
                  <span>₹{zReportData.totalSwiggy.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Zomato Deliveries:</span>
                  <span>₹{zReportData.totalZomato.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Room Folio Transfers:</span>
                  <span>₹{zReportData.totalRoomCharges.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-300 pt-1 font-black text-xs text-slate-950">
                  <span>TOTAL SHIFT SALES:</span>
                  <span>₹{zReportData.totalSales.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setZReportData(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close Audit
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl bg-slate-950 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>🖨️ Print 80mm Z-Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 13: LIVE SWIGGY & ZOMATO AGGREGATOR CREDENTIALS & WEBHOOKS*/}
      {/* ============================================================== */}
      {isAggregatorSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="relative flex w-full max-w-2xl max-h-[92vh] overflow-y-auto flex-col rounded-3xl bg-white p-6 shadow-2xl text-slate-900 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-orange-100 text-orange-600 text-xl font-bold">
                  🛵
                </span>
                <div>
                  <h3 className="font-display text-base font-black text-slate-950">
                    Swiggy &amp; Zomato Integration Portal
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Configure live API keys, Webhooks, and Auto-Accept rules for {activeOutlet?.name || 'Selected Outlet'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAggregatorSettingsModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* How Live Integration Works in India Callout */}
            <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-xs text-sky-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sky-900">
                <span>ℹ️</span>
                <span>How Real-Life Swiggy &amp; Zomato Integrations Work:</span>
              </div>
              <ol className="list-decimal pl-4 space-y-1.5 text-sky-900/90 leading-relaxed">
                <li>
                  <strong>Get Restaurant Identifiers:</strong> Obtain your <strong>Swiggy Restaurant ID (RID)</strong> and <strong>Zomato Restaurant ID (ResID)</strong> from your merchant contracts or Key Account Manager (KAM).
                </li>
                <li>
                  <strong>Webhook Registration:</strong> Provide the Webhook Ingestion URLs below to your Swiggy / Zomato onboarding engineer. Every new order placed by diners in your area will automatically push into Aura Dine.
                </li>
                <li>
                  <strong>Two-Way Kitchen Sync:</strong> When you accept an order or click <em>Food Ready</em> in Aura Dine, an automated status update signals the delivery rider app that the packet is packed and ready for pickup.
                </li>
                <li>
                  <strong>Item 86 Auto-Delisting:</strong> Toggling <em>Item 86</em> in the POS counter instantly instructs Swiggy &amp; Zomato to mark the dish out-of-stock across customer apps.
                </li>
              </ol>
            </div>

            {/* Webhook URLs to Copy */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span>🔗</span>
                <span>Your Live Webhook Endpoints (Copy &amp; Paste in Merchant Portals)</span>
              </h4>

              {/* Swiggy Webhook URL */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-orange-600 font-bold">
                    <span>🟠</span> Swiggy Ingestion Webhook URL:
                  </span>
                  {copiedWebhook === 'swiggy' && (
                    <span className="text-emerald-600 font-bold text-[10px]">✓ Copied to clipboard!</span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/hotel/restaurant/aggregators/webhook/swiggy/${activeOutlet?.id || ''}`}
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-700 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/api/hotel/restaurant/aggregators/webhook/swiggy/${activeOutlet?.id || ''}`;
                      navigator.clipboard.writeText(url);
                      setCopiedWebhook('swiggy');
                      setTimeout(() => setCopiedWebhook(null), 2500);
                    }}
                    className="rounded-xl bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-700 shadow-xs cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Zomato Webhook URL */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-rose-600 font-bold">
                    <span>🔴</span> Zomato Ingestion Webhook URL:
                  </span>
                  {copiedWebhook === 'zomato' && (
                    <span className="text-emerald-600 font-bold text-[10px]">✓ Copied to clipboard!</span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/hotel/restaurant/aggregators/webhook/zomato/${activeOutlet?.id || ''}`}
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-700 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/api/hotel/restaurant/aggregators/webhook/zomato/${activeOutlet?.id || ''}`;
                      navigator.clipboard.writeText(url);
                      setCopiedWebhook('zomato');
                      setTimeout(() => setCopiedWebhook(null), 2500);
                    }}
                    className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 shadow-xs cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            {/* Credential Inputs Form */}
            <form onSubmit={handleSaveAggregatorSettings} className="space-y-5">
              {/* Swiggy Credentials Section */}
              <div className="rounded-2xl border border-orange-200 bg-orange-50/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-lg bg-orange-500 text-white font-bold text-xs">
                      S
                    </span>
                    <h4 className="font-bold text-sm text-slate-900">Swiggy Merchant Credentials</h4>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={swiggyAutoAcceptInput}
                      onChange={(e) => setSwiggyAutoAcceptInput(e.target.checked)}
                      className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <span>Auto-Accept Incoming Orders</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Swiggy Restaurant ID (RID)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 104928"
                      value={swiggyRidInput}
                      onChange={(e) => setSwiggyRidInput(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Swiggy Partner API Key / Secret
                    </label>
                    <input
                      type="password"
                      placeholder="swiggy_live_key_..."
                      value={swiggyApiKeyInput}
                      onChange={(e) => setSwiggyApiKeyInput(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Default Prep Timer
                    </label>
                    <CustomDropdown
                      value={String(swiggyPrepMinsInput)}
                      onChange={(val) => setSwiggyPrepMinsInput(Number(val))}
                      size="sm"
                      options={[
                        { value: '15', label: '15 Minutes' },
                        { value: '20', label: '20 Minutes (Standard)' },
                        { value: '25', label: '25 Minutes' },
                        { value: '30', label: '30 Minutes' },
                        { value: '40', label: '40 Minutes' },
                      ]}
                      aria-label="Swiggy Default Prep Timer"
                    />
                  </div>
                </div>
              </div>

              {/* Zomato Credentials Section */}
              <div className="rounded-2xl border border-rose-200 bg-rose-50/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-lg bg-rose-600 text-white font-bold text-xs">
                      Z
                    </span>
                    <h4 className="font-bold text-sm text-slate-900">Zomato Merchant Credentials</h4>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={zomatoAutoAcceptInput}
                      onChange={(e) => setZomatoAutoAcceptInput(e.target.checked)}
                      className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <span>Auto-Accept Incoming Orders</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Zomato Restaurant ID (ResID)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 18492041"
                      value={zomatoResIdInput}
                      onChange={(e) => setZomatoResIdInput(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Zomato Partner Token / Secret
                    </label>
                    <input
                      type="password"
                      placeholder="zom_live_tok_..."
                      value={zomatoApiKeyInput}
                      onChange={(e) => setZomatoApiKeyInput(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Default Prep Timer
                    </label>
                    <CustomDropdown
                      value={String(zomatoPrepMinsInput)}
                      onChange={(val) => setZomatoPrepMinsInput(Number(val))}
                      size="sm"
                      options={[
                        { value: '15', label: '15 Minutes' },
                        { value: '20', label: '20 Minutes (Standard)' },
                        { value: '25', label: '25 Minutes' },
                        { value: '30', label: '30 Minutes' },
                        { value: '40', label: '40 Minutes' },
                      ]}
                      aria-label="Zomato Default Prep Timer"
                    />
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAggregatorSettingsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-slate-950 px-6 py-2 text-xs font-bold text-white hover:bg-slate-800 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving Configuration...' : 'Save Aggregator Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 14: INCOMING ONLINE ORDER ACCEPT / REJECT POP-UP MODAL    */}
      {/* ============================================================== */}
      {reviewingIncomingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in-50">
          <div className="relative flex w-full max-w-xl max-h-[92vh] overflow-y-auto flex-col rounded-3xl bg-white shadow-2xl text-slate-900 overflow-hidden">
            {/* Header Banner */}
            <div
              className={`p-5 text-white flex items-center justify-between ${
                reviewingIncomingOrder.aggregatorBrand === 'swiggy'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600'
                  : reviewingIncomingOrder.aggregatorBrand === 'zomato'
                  ? 'bg-gradient-to-r from-rose-600 to-red-600'
                  : 'bg-slate-950'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-2xl font-bold">
                  🛵
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                      {reviewingIncomingOrder.aggregatorBrand?.toUpperCase() || 'ONLINE'} DELIVERY
                    </span>
                    <span className="font-mono text-sm font-black">
                      #{reviewingIncomingOrder.aggregatorOrderId || reviewingIncomingOrder.kotNumber}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-black">
                    New Incoming Order Alert
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewingIncomingOrder(null)}
                className="grid h-8 w-8 place-items-center rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Customer & Address Details */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">👤</span>
                    <span className="font-black text-sm text-slate-950">
                      {reviewingIncomingOrder.guestName || 'Delivery Diner'}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-600">
                    📞 {reviewingIncomingOrder.customerPhone || 'In-App'}
                  </span>
                </div>
                {reviewingIncomingOrder.specialInstructions && (
                  <div className="text-[11px] text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/80">
                    📍 <strong>Delivery Address &amp; Instructions:</strong> {reviewingIncomingOrder.specialInstructions}
                  </div>
                )}
              </div>

              {/* Ordered Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600">
                    Ordered Dishes ({reviewingIncomingOrder.items.length})
                  </h4>
                  <span className="text-[11px] text-slate-500 font-bold">Qty × Price</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto pr-1">
                  {reviewingIncomingOrder.items.map((item, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span>{item.foodType === 'veg' ? '🟢' : '🔴'}</span>
                        <span className="font-bold text-slate-950">{item.itemName}</span>
                        {item.specialNotes && (
                          <span className="text-[10px] text-slate-500 italic">({item.specialNotes})</span>
                        )}
                      </div>
                      <div className="font-mono font-bold text-slate-900">
                        {item.quantity} × ₹{Number(item.unitPrice).toFixed(0)} = ₹{(item.quantity * Number(item.unitPrice)).toFixed(0)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotal, GST & Grand Total */}
                <div className="rounded-2xl bg-slate-100 p-3 text-xs space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>₹{Number(reviewingIncomingOrder.subtotal || reviewingIncomingOrder.totalAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>F&amp;B GST (5% SAC 996331):</span>
                    <span>₹{Number(reviewingIncomingOrder.taxAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-slate-950 border-t border-slate-300 pt-1.5 mt-1">
                    <span>Grand Total:</span>
                    <span className="text-emerald-700">₹{Number(reviewingIncomingOrder.totalAmount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Rejection Reasons Drawer or Standard Action Form */}
              {isRejectReasonOpen ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                      <span>⚠️</span> Select Rejection Reason for {reviewingIncomingOrder.aggregatorBrand?.toUpperCase()}:
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsRejectReasonOpen(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                    >
                      Back
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      'Item 86 Out of Stock',
                      'Kitchen Overloaded (Peak Rush)',
                      'Restaurant Closing Soon',
                      'Delivery Address Unserviceable',
                    ].map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => {
                          handleUpdateAggregatorStatus(reviewingIncomingOrder.id, 'cancelled', 0);
                          setReviewingIncomingOrder(null);
                          setIsRejectReasonOpen(false);
                        }}
                        className="rounded-xl border border-rose-300 bg-white p-2.5 text-left font-bold text-rose-800 hover:bg-rose-100 hover:border-rose-400 transition-colors shadow-xs cursor-pointer"
                      >
                        ❌ {reason}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  {/* Preparation Time Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>⏱️</span> Select Kitchen Prep Time:
                      </span>
                      <span className="font-mono text-[11px] text-emerald-700 font-bold">
                        ETA: {selectedAcceptPrepTime} Minutes
                      </span>
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[15, 20, 25, 30, 45].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setSelectedAcceptPrepTime(mins)}
                          className={`rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                            selectedAcceptPrepTime === mins
                              ? 'bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-500 ring-offset-1'
                              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Main Action Buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsRejectReasonOpen(true)}
                      className="rounded-2xl border border-rose-300 bg-white px-4 py-3 text-xs font-bold text-rose-700 hover:bg-rose-50 shadow-xs cursor-pointer whitespace-nowrap"
                    >
                      Reject Order
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        handleUpdateAggregatorStatus(reviewingIncomingOrder.id, 'accepted', selectedAcceptPrepTime);
                        setReviewingIncomingOrder(null);
                      }}
                      className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 py-3 text-xs font-black text-white hover:from-emerald-700 hover:to-teal-800 shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>✅</span>
                      <span>Accept Order ({selectedAcceptPrepTime}m Prep) &amp; Fire KOT</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manage Floor Zones Modal */}
      {isManageZonesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                  🏛️
                </span>
                <div>
                  <h3 className="font-display text-base font-black text-slate-950">
                    Floor Zones &amp; Dining Sections
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Configure custom zones tailored to your hotel&apos;s physical floor plan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsManageZonesModalOpen(false);
                  setZoneToDelete(null);
                  setZoneToRename(null);
                }}
                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Add New Zone Card */}
              <form onSubmit={handleAddFloorZone} className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
                <label className="block text-xs font-bold text-indigo-950">
                  Add New Floor Zone
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={newZoneNameInput}
                    onChange={(e) => setNewZoneNameInput(e.target.value)}
                    placeholder="e.g. Rooftop Sky Lounge, Poolside Deck, Lawn Gazebo"
                    className="flex-1 rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-2xs"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    + Add Zone
                  </button>
                </div>
              </form>

              {/* Active Zones List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Active Floor Zones ({allSections.length})
                  </h4>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {tables.length} Total Tables Assigned
                  </span>
                </div>

                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                  {allSections.map((sec) => {
                    const tablesInZone = tables.filter((t) => t.section === sec);
                    const isDeleting = zoneToDelete === sec;
                    const isRenaming = zoneToRename === sec;
                    const otherSections = allSections.filter((s) => s !== sec);

                    return (
                      <div key={sec} className="p-4 transition-colors hover:bg-slate-50/50">
                        {isRenaming ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={zoneRenameInput}
                              onChange={(e) => setZoneRenameInput(e.target.value)}
                              className="flex-1 rounded-xl border border-indigo-300 px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              autoFocus
                            />
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => handleRenameFloorZone(sec, zoneRenameInput)}
                              className="rounded-xl bg-indigo-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-indigo-700 cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setZoneToRename(null)}
                              className="rounded-xl border border-slate-200 text-slate-600 px-3 py-1.5 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : isDeleting ? (
                          <div className="space-y-3 rounded-xl bg-rose-50 border border-rose-200 p-3.5">
                            <p className="text-xs font-bold text-rose-950">
                              Remove Floor Zone &ldquo;{sec}&rdquo;?
                            </p>
                            {tablesInZone.length > 0 ? (
                              <div className="space-y-2">
                                <p className="text-xs text-rose-800">
                                  This zone has <strong className="font-bold">{tablesInZone.length} table(s)</strong> ({tablesInZone.map((t) => t.tableNumber).join(', ')}). Select a destination zone to reassign them:
                                </p>
                                <CustomDropdown
                                  value={zoneReassignTarget}
                                  onChange={(val) => setZoneReassignTarget(val)}
                                  size="sm"
                                  options={otherSections.map((s) => ({ value: s, label: s }))}
                                  aria-label="Reassign tables to"
                                />
                                <div className="flex items-center gap-2 pt-1">
                                  <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => handleDeleteFloorZone(sec, zoneReassignTarget)}
                                    className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 text-xs font-bold transition-all cursor-pointer"
                                  >
                                    Reassign &amp; Delete Zone
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setZoneToDelete(null)}
                                    className="rounded-xl border border-slate-300 bg-white text-slate-700 px-3 py-1.5 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={submitting}
                                  onClick={() => handleDeleteFloorZone(sec, 'Main AC Hall')}
                                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 text-xs font-bold transition-all cursor-pointer"
                                >
                                  Confirm Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setZoneToDelete(null)}
                                  className="rounded-xl border border-slate-300 bg-white text-slate-700 px-3 py-1.5 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="font-display text-sm font-bold text-slate-900">
                                {sec}
                              </span>
                              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                                tablesInZone.length > 0
                                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {tablesInZone.length} table{tablesInZone.length === 1 ? '' : 's'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setZoneToRename(sec);
                                  setZoneRenameInput(sec);
                                }}
                                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                              >
                                ✏️ Rename
                              </button>
                              {allSections.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setZoneToDelete(sec);
                                    const fallback = otherSections[0] || 'Main AC Hall';
                                    setZoneReassignTarget(fallback);
                                  }}
                                  className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                                >
                                  🗑️ Remove
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-6 py-3.5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsManageZonesModalOpen(false);
                  setZoneToDelete(null);
                  setZoneToRename(null);
                }}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal KOT Slip Modal */}
      {printKotSlip && (
        <KotPrintModal
          data={printKotSlip}
          onClose={() => setPrintKotSlip(null)}
        />
      )}

      {/* Customer Tax Bill Modal */}
      {printCustomerBill && (
        <BillPrintModal
          data={printCustomerBill}
          onClose={() => setPrintCustomerBill(null)}
        />
      )}
    </div>
  );
}
