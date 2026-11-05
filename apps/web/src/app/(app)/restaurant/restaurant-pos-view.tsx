'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
}: {
  outlets: OutletDto[];
  tables: TableDto[];
  categories: MenuCategoryDto[];
  kots: KotOrderDto[];
  checkedInRooms: CheckedInRoomDto[];
}) {
  const router = useRouter();

  // Operating Mode: Hotel Integrated vs Standalone Restaurant
  const [operatingMode, setOperatingMode] = useState<'hotel' | 'standalone'>('hotel');

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'tables' | 'pos' | 'waiter' | 'kds'>('tables');

  // Active Outlet Selection: prefer dine_in outlets or first outlet that has tables
  const preferredOutlet =
    outlets.find((o) => tables.some((t) => t.outletId === o.id)) ||
    outlets.find((o) => o.outletType === 'dine_in') ||
    outlets[0];
  const [selectedOutletId, setSelectedOutletId] = useState(preferredOutlet?.id || outlets[0]?.id || '');
  const activeOutlet = outlets.find((o) => o.id === selectedOutletId) || preferredOutlet || outlets[0];

  // Table Section Filter
  const allSections = Array.from(new Set(tables.map((t) => t.section || 'Main AC Hall')));
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

  // Filtered Menu Items
  const allItems = categories.flatMap((c) => c.items);
  const filteredItems = allItems.filter((it) => {
    if (selectedCategory !== 'all' && it.categoryId !== selectedCategory) return false;
    if (dietaryFilter === 'veg' && it.foodType !== 'veg') return false;
    if (dietaryFilter === 'non_veg' && it.foodType !== 'non_veg') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return it.name.toLowerCase().includes(q) || it.itemCode.toLowerCase().includes(q);
    }
    return true;
  });

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

  // Menu Management Handlers
  async function handleAddDish(e: React.FormEvent) {
    e.preventDefault();
    if (!newDishName.trim() || !newDishPrice) {
      setFeedbackMsg({ type: 'err', text: 'Please provide dish name and price' });
      return;
    }
    const catId = newDishCategoryId || categories[0]?.id;
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
      sortOrder: categories.length + 1,
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
          <select
            value={selectedOutletId}
            onChange={(e) => setSelectedOutletId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-xs focus:border-slate-950 focus:outline-none cursor-pointer"
          >
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} {o.isStandalone ? '(Standalone Bistro)' : ''}
              </option>
            ))}
          </select>
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
      {/* NAVIGATION TABS (Tables, POS Counter, Waiter Mode, KDS)        */}
      {/* ============================================================== */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('tables')}
          className={`pb-3 transition-colors cursor-pointer flex items-center gap-1.5 ${
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
          className={`pb-3 transition-colors cursor-pointer flex items-center gap-1.5 ${
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
          onClick={() => setActiveTab('waiter')}
          className={`pb-3 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'waiter'
              ? 'border-b-2 border-slate-950 text-slate-950'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>📱 Captain Waiter Handheld</span>
          <span className="rounded-full bg-sky-100 text-sky-800 px-2 py-0.5 text-[10px] font-black uppercase">
            Mobile POS
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('kds')}
          className={`pb-3 transition-colors cursor-pointer flex items-center gap-1.5 ${
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
            </div>

            {/* Quick Actions: Add Table & How Aura Dine Works SOP */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsSopGuideModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
              >
                <span>ℹ️ How Aura Dine Works</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewTableOutletId(selectedOutletId);
                  setIsAddTableModalOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
              >
                <span>+ Add Table</span>
              </button>
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
      {(activeTab === 'pos' || activeTab === 'waiter') && (
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

              {/* Menu Setup Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setNewDishCategoryId(categories[0]?.id || '');
                    setIsAddDishModalOpen(true);
                  }}
                  className="rounded-xl bg-slate-950 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <span>+ Add Dish</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddCategoryModalOpen(true)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <span>+ Category</span>
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
              {categories.map((c) => (
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
              <button
                type="button"
                onClick={() => setIsAddCategoryModalOpen(true)}
                className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                + New Category
              </button>
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
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addToCart(item)}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:border-amber-400 hover:shadow-sm cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs ${
                          item.foodType === 'veg' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {item.foodType === 'veg' ? '🟢' : '🔴'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{item.itemCode}</span>
                    </div>
                    <p className="mt-1 font-bold text-xs sm:text-sm text-slate-950 group-hover:text-amber-800 line-clamp-1">
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
                    <span className="rounded-lg bg-amber-500/10 text-amber-800 px-2 py-0.5 text-xs font-bold group-hover:bg-amber-500 group-hover:text-white transition-colors">
                      + Add
                    </span>
                  </div>
                </button>
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
                  <label className="text-[11px] font-bold text-slate-500">Select Table:</label>
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-xs"
                  >
                    {filteredTables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tableNumber} ({t.section}) - {t.capacity} Covers [{t.status}]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {orderType === 'room_service' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-500">Select Checked-In Room:</label>
                  <select
                    value={selectedRoomNumber}
                    onChange={(e) => setSelectedRoomNumber(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-xs"
                  >
                    {checkedInRooms.map((r) => (
                      <option key={r.id} value={r.number}>
                        Room {r.number} — {r.guestName}
                      </option>
                    ))}
                  </select>
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
      {/* TAB 3: KITCHEN DISPLAY SYSTEM (KDS)                            */}
      {/* ============================================================== */}
      {activeTab === 'kds' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-black text-slate-950">
              Kitchen Display System (KDS) Active Orders
            </h2>
            <span className="text-xs text-slate-500 font-bold">
              Auto-updating live queue
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {kots.map((kot) => (
              <div
                key={kot.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <span className="font-mono text-base font-black text-slate-950">
                      {kot.kotNumber}
                    </span>
                    <p className="text-[11px] text-slate-500 font-bold">
                      {kot.orderType === 'dine_in'
                        ? `Table ${kot.tableNumber || ''} (${kot.tableSection || 'Hall'})`
                        : `In-Room: Room ${kot.roomNumber || ''}`}
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

                {/* Items */}
                <div className="space-y-1.5 text-xs">
                  {kot.items.map((i, idx) => (
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
                    <div className="flex gap-2">
                      <select
                        value={selectedRoomNumber}
                        onChange={(e) => setSelectedRoomNumber(e.target.value)}
                        className="flex-1 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-slate-900"
                      >
                        {checkedInRooms.map((r) => (
                          <option key={r.id} value={r.number}>
                            Room {r.number} — {r.guestName}
                          </option>
                        ))}
                      </select>
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
                <label className="text-xs font-bold text-slate-700">Dining Outlet</label>
                <select
                  value={newTableOutletId || selectedOutletId}
                  onChange={(e) => setNewTableOutletId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-xs focus:border-slate-950 focus:outline-none"
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} {o.isStandalone ? '(Standalone)' : ''}
                    </option>
                  ))}
                </select>
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
                <label className="text-xs font-bold text-slate-700">Menu Category</label>
                <div className="flex gap-2 mt-1">
                  <select
                    value={newDishCategoryId || categories[0]?.id || ''}
                    onChange={(e) => setNewDishCategoryId(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-xs focus:border-slate-950 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddDishModalOpen(false);
                      setIsAddCategoryModalOpen(true);
                    }}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
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
