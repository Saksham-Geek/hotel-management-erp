import { redirect } from 'next/navigation';
import { FEATURES } from '@erp/shared';
import { Banner, PageHeader } from '@/components/ui';
import { api, getMe, requireFeature } from '@/lib/api';
import { ChannelView, type OtaChannelItem, type OtaSyncLog } from './channel-view';

interface ChannelListResponse {
  channels: OtaChannelItem[];
  stats: { otaBookingsCount: number; totalCommissionAmount: number; totalOtaRevenue: number };
}

interface RoomTypeItem {
  id: string;
  name: string;
  baseRate: number;
}

export default async function ChannelManagerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const [me, { error, ok }, ent, channelData, roomTypes, logsData] = await Promise.all([
    getMe(),
    searchParams,
    requireFeature(FEATURES.HOTEL_CHANNEL_MANAGER),
    api<ChannelListResponse>('/hotel/channels').catch(() => ({
      channels: [],
      stats: { otaBookingsCount: 0, totalCommissionAmount: 0, totalOtaRevenue: 0 },
    })),
    api<RoomTypeItem[]>('/hotel/rooms/types').catch(() => []),
    api<{ logs: OtaSyncLog[] }>('/hotel/channels/logs').catch(() => ({ logs: [] })),
  ]);

  if (me.role !== 'owner' && me.role !== 'manager') {
    redirect(
      '/dashboard?error=' +
        encodeURIComponent(
          'Access Restricted: OTA Channel Management is reserved for General Managers and Property Owners.',
        ),
    );
  }

  return (
    <>
      <PageHeader
        title="OTA Channel Manager & Distribution"
        eyebrow="Two-Way Live Sync"
        description="Unified connectivity to MakeMyTrip, Booking.com, Agoda, Expedia, and Airbnb. Synchronize live room inventory, rates (ARI), and instant booking webhooks in one place."
      />
      <Banner error={error} ok={ok} />

      <ChannelView
        channels={channelData.channels}
        stats={channelData.stats}
        logs={logsData.logs}
        roomTypes={roomTypes}
        currency={me.property?.currency ?? 'INR'}
        readOnly={ent.readOnly}
      />
    </>
  );
}
