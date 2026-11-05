export interface IncomeReportDto {
  period: string;
  startDate: string;
  endDate: string;
  currency: string;
  summary: {
    grossRevenue: number;
    netRevenue: number;
    totalGst: number;
    totalPayments: number;
    outstandingBalance: number;
    roomsSold: number;
    totalAvailableRooms: number;
    occupancyRate: number;
    adr: number;
    revpar: number;
    trevpar: number;
  };
  departments: {
    rooms: { gross: number; net: number; gst: number; pct: number };
    fnb: { gross: number; net: number; gst: number; pct: number };
    other: { gross: number; net: number; gst: number; pct: number };
  };
  channels: {
    channel: string;
    label: string;
    amount: number;
    bookingsCount: number;
    sharePct: number;
    commissionPaid: number;
  }[];
  tenders: {
    method: string;
    label: string;
    amount: number;
    count: number;
    sharePct: number;
  }[];
  roomTypes: {
    roomType: string;
    amount: number;
    nightsSold: number;
    adr: number;
    sharePct: number;
  }[];
  timeline: {
    key: string;
    label: string;
    date: string;
    gross: number;
    room: number;
    fnb: number;
    other: number;
    net: number;
    gst: number;
    occupancy: number;
    adr: number;
    revpar: number;
    roomsSold: number;
  }[];
  ledgerRows: {
    date: string;
    dayName: string;
    roomsSold: number;
    occupancyRate: number;
    roomRevenue: number;
    fnbRevenue: number;
    taxCollected: number;
    grossRevenue: number;
    netRevenue: number;
    adr: number;
    revpar: number;
  }[];
}
