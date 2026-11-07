import { redirect } from 'next/navigation';
import { FEATURES } from '@erp/shared';
import { Banner, PageHeader } from '@/components/ui';
import { api, getMe, requireFeature } from '@/lib/api';
import { ComplianceView, type FormCRecord, type PoliceReportData } from './compliance-view';

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; date?: string; tab?: string }>;
}) {
  const { error, ok, date, tab } = await searchParams;
  const targetDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10);

  const [me, ent, policeData, formCList] = await Promise.all([
    getMe(),
    requireFeature(FEATURES.HOTEL_COMPLIANCE),
    api<PoliceReportData>(`/hotel/compliance/police-report?date=${targetDate}`).catch(() => ({
      property: { name: 'Hotel Property', timezone: 'Asia/Kolkata', currency: 'INR' },
      reportDate: targetDate,
      generatedAt: new Date().toISOString(),
      isHistorical: targetDate !== new Date().toISOString().slice(0, 10),
      summary: { totalInHouse: 0, arrivalsToday: 0, departuresToday: 0 },
      inHouse: [],
      arrivals: [],
      departures: [],
    })),
    api<FormCRecord[]>('/hotel/compliance/form-c').catch(() => []),
  ]);

  if (me.role === 'housekeeping') {
    redirect(
      '/housekeeping?error=' +
        encodeURIComponent(
          'Access Restricted: Statutory BoI Form C is restricted to Front Desk and Management.',
        ),
    );
  }

  return (
    <>
      <PageHeader
        title="Statutory &amp; BoI Compliance"
        eyebrow="Indian Legal Mandates"
        description="Foreign national Form C registration (BoI) and daily local police station midnight beat book reporting."
      />
      <Banner error={error} ok={ok} />

      <ComplianceView
        policeData={policeData}
        formCList={formCList}
        readOnly={ent.readOnly}
        selectedDate={targetDate}
        initialTab={tab === 'formC' ? 'formC' : 'police'}
      />
    </>
  );
}
