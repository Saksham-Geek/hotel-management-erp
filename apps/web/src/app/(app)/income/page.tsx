import { redirect } from 'next/navigation';
import { api, getMe } from '@/lib/api';
import { IncomeDashboardView } from './income-dashboard-view';
import type { IncomeReportDto } from '@/app/(app)/income/types';

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [me, sp] = await Promise.all([getMe(), searchParams]);

  // Strict Role-Based Access Control: Strictly restricted to Property Owners
  if (me.role !== 'owner') {
    redirect(
      '/dashboard?error=' +
        encodeURIComponent(
          'Access Restricted: Owner Income & Revenue Analytics is strictly confidential and reserved for Property Owners & Directors.',
        ),
    );
  }

  const period = typeof sp.period === 'string' ? sp.period : 'monthly';
  const startDate = typeof sp.startDate === 'string' ? sp.startDate : '';
  const endDate = typeof sp.endDate === 'string' ? sp.endDate : '';
  const date = typeof sp.date === 'string' ? sp.date : '';

  const queryParams = new URLSearchParams();
  queryParams.set('period', period);
  if (startDate) queryParams.set('startDate', startDate);
  if (endDate) queryParams.set('endDate', endDate);
  if (date) queryParams.set('date', date);

  let initialData: IncomeReportDto;
  try {
    initialData = await api<IncomeReportDto>(`/hotel/income?${queryParams.toString()}`);
  } catch {
    initialData = {
      period: 'monthly',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      currency: 'INR',
      summary: {
        grossRevenue: 0,
        netRevenue: 0,
        totalGst: 0,
        totalPayments: 0,
        outstandingBalance: 0,
        roomsSold: 0,
        totalAvailableRooms: 18,
        occupancyRate: 0,
        adr: 0,
        revpar: 0,
        trevpar: 0,
      },
      departments: {
        rooms: { gross: 0, net: 0, gst: 0, pct: 70 },
        fnb: { gross: 0, net: 0, gst: 0, pct: 24 },
        other: { gross: 0, net: 0, gst: 0, pct: 6 },
      },
      channels: [],
      tenders: [],
      roomTypes: [],
      timeline: [],
      ledgerRows: [],
    };
  }

  return (
    <IncomeDashboardView
      initialData={initialData}
      propertyName={me.property?.name ?? 'Grand Azure Hotel'}
      role={me.role}
    />
  );
}
