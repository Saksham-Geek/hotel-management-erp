import { Module } from '@nestjs/common';
import { CustomFieldsService } from '../custom-fields/custom-fields.service';
import { DashboardController } from './dashboard.controller';
import { GuestsController } from './guests.controller';
import { GuestDocumentsController } from './guest-documents.controller';
import { ReservationsController } from './reservations.controller';
import { RoomsController } from './rooms.controller';

@Module({
  controllers: [RoomsController, GuestsController, GuestDocumentsController, ReservationsController, DashboardController],
  providers: [CustomFieldsService],
})
export class HotelModule {}
