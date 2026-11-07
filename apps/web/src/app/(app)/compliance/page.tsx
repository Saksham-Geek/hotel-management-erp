import { redirect } from 'next/navigation';
import { FEATURES } from '@erp/shared';
import { Banner, PageHeader } from '@/components/ui';
import { api, getMe, requireFeature } from '@/lib/api';
import { ComplianceView, type FormCRecord, type PoliceReportData } from './compliance-view';

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const [me, { error, ok }, ent, policeData, formCList] = await Promise.all([
    getMe(),
    searchParams,
    requireFeature(FEATURES.HOTEL_COMPLIANCE),
    api<PoliceReportData>('/hotel/compliance/police-report').catch(() => ({
      property: { name: 'Hotel Property', timezone: 'Asia/Kolkata', currency: 'INR' },
      reportDate: new Date().toISOString().slice(0, 10),
      generatedAt: new Date().toISOString(),
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

      <ComplianceView policeData={policeData} formCList={formCList} readOnly={ent.readOnly} />
    </>
  );
}
