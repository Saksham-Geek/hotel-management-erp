import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AllExceptionsFilter } from './common/pg-exception.filter';
import { RolesGuard } from './common/roles';
import { DbModule } from './db/db.module';
import { EntitlementsModule } from './entitlements/entitlements.module';
import { FeatureGuard } from './entitlements/require-feature';
import { HotelModule } from './hotel/hotel.module';
import { UsersModule } from './users/users.module';
import { PropertiesModule } from './properties/properties.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    DbModule,
    AuditModule,
    AuthModule,
    EntitlementsModule,
    UsersModule,
    PropertiesModule,
    HotelModule,
  ],
  providers: [
    // Order matters: rate limit -> who are you -> is it in your plan -> is your role allowed.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: FeatureGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
