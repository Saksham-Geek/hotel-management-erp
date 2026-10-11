import { Module } from '@nestjs/common';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { CustomFieldsController } from '../custom-fields/custom-fields.controller';
import { UsersController } from './users.controller';

@Module({ imports: [EntitlementsModule], controllers: [UsersController, CustomFieldsController] })
export class UsersModule {}
