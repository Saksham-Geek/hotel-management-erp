import { Module } from '@nestjs/common';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { CustomFieldsService } from '../custom-fields/custom-fields.service';
import { BillingController } from './billing.controller';
import { ChannelManagerController } from './channel-manager.controller';
import { ComplianceController } from './compliance.controller';
import { DashboardController } from './dashboard.controller';
import { GuestsController } from './guests.controller';
import { GuestDocumentsController } from './guest-documents.controller';
import { NightAuditController } from './night-audit.controller';
import { ReservationsController } from './reservations.controller';
import { RoomsController } from './rooms.controller';
import { TapeChartController } from './tape-chart.controller';
import { MarketingController } from './marketing.controller';

@Module({
  imports: [EntitlementsModule],
  controllers: [
    RoomsController,
    GuestsController,
    GuestDocumentsController,
    ReservationsController,
    DashboardController,
    BillingController,
    NightAuditController,
    ComplianceController,
    TapeChartController,
    ChannelManagerController,
    MarketingController,
  ],
  providers: [CustomFieldsService],
})
export class HotelModule {}
