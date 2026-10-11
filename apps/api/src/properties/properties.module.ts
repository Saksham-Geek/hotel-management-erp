import { Module } from '@nestjs/common';
import { PropertiesController } from './properties.controller';
import { EntitlementsModule } from '../entitlements/entitlements.module';

@Module({ imports: [EntitlementsModule], controllers: [PropertiesController] })
export class PropertiesModule {}
