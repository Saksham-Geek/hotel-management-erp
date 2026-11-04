import { FEATURES } from '@erp/shared';
import { Banner, PageHeader } from '@/components/ui';
import { api, requireFeature } from '@/lib/api';
import { ComplianceView, type FormCRecord, type PoliceReportData } from './compliance-view';

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const [{ error, ok }, ent] = await Promise.all([
    searchParams,
    requireFeature(FEATURES.HOTEL_COMPLIANCE),
  ]);

  const [policeData, formCList] = await Promise.all([
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
