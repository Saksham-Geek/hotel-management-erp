import { Module } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller';
import { EntitlementsModule } from '../entitlements/entitlements.module';

@Module({
  imports: [EntitlementsModule],
  controllers: [SuperAdminController],
})
export class SuperAdminModule {}
